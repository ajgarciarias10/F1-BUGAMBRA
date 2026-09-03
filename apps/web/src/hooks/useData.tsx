import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { collection, collectionGroup, onSnapshot, getDocs } from "firebase/firestore";
import { db } from "../services/firebase";
import type { Usuario, Piloto, SplitView, Circuito, Equipo, PilotInRoster, RosterEntry } from "../types";
import { computePilotOVR } from "../utils/splitResolver";

const normalizeRaceResults = (results: any[]) => {
  if (results.every(result => result.racePos != null && result.qualyPos != null)) return results;
  const points = results.map(result => Number(result.puntos ?? 0));
  const poleCandidates = points.some(value => value > 16)
    ? points.map((value, index) => ({ value, index })).filter(item => item.value > 16)
    : [...points.map((value, index) => ({ value, index })), { value: 0, index: -1 }];
  const assignments = poleCandidates.flatMap(pole => {
    const used = new Set<number>();
    const rows = points.map((value, index) => {
      if (value === 0) return { position: 99, pole: false };
      const base = value - (index === pole.index ? 2 : 0);
      const position = [16, 13, 11, 9, 8, 7, 6, 5, 4, 3, 2, 1].indexOf(base) + 1;
      if (position === 0 || used.has(position)) return null;
      used.add(position);
      return { position, pole: index === pole.index };
    });
    return rows.every(Boolean) ? [{ rows: rows as Array<{ position: number; pole: boolean }>, poleIndex: pole.index }] : [];
  });
  const selected = assignments.sort((a, b) =>
    Number((b.poleIndex >= 0 && points[b.poleIndex] > 16)) - Number((a.poleIndex >= 0 && points[a.poleIndex] > 16)) ||
    b.poleIndex - a.poleIndex
  ).at(0);
  if (!selected) return results;
  const bestPosition = Math.min(...selected.rows.map(row => row.position));
  return results.map((result, index) => ({
    ...result,
    racePos: result.racePos ?? selected.rows[index].position,
    qualyPos: result.qualyPos ?? (selected.rows[index].pole ? 1 : 99),
    isDotd: result.isDotd ?? (selected.rows[index].position === bestPosition),
  }));
};

// ─── USUARIOS ─────────────────────────────────────────────────────────────────

function useUsuariosSource() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "usuarios"), (snap) => {
      setUsuarios(snap.docs.map(d => ({ uid: d.id, ...d.data() }) as Usuario));
    }, (err) => {
      console.warn("useUsuarios snapshot error:", err);
    });
    return unsub;
  }, []);

  return { usuarios };
}

// ─── PILOTOS GLOBALES ─────────────────────────────────────────────────────────

export function usePilotos() {
  const [pilotos, setPilotos] = useState<Piloto[]>([]);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "pilotos"), (snap) => {
      setPilotos(snap.docs.map(d => ({ id: d.id, ...d.data() }) as Piloto));
    }, (err) => {
      console.warn("usePilotos snapshot error:", err);
    });
    return unsub;
  }, []);

  return { pilotos };
}

// ─── SPLITS (con circuitos, equipos y roster enriquecido) ────────────────────

function useSplitsSource() {
  const [splits, setSplits] = useState<SplitView[]>([]);
  const [loading, setLoading] = useState(true);
  const [listenersReady, setListenersReady] = useState(false);
  const [trigger, setTrigger] = useState(0);
  const hasLoaded = useRef(false);

  // Los listeners se conectan después del recorrido inicial. Su snapshot inicial ya está
  // cubierto por fetchAll y los cambios consecutivos se agrupan en una sola recarga.
  useEffect(() => {
    if (!listenersReady) return;
    let debounce: ReturnType<typeof setTimeout> | undefined;
    const bump = () => {
      if (debounce) clearTimeout(debounce);
      debounce = setTimeout(() => setTrigger(t => t + 1), 300);
    };
    const errHandler = (err: Error) => console.warn("useSplits listener error:", err);
    const listen = (target: Parameters<typeof onSnapshot>[0]) => {
      let initial = true;
      return onSnapshot(target as any, () => {
        if (initial) { initial = false; return; }
        bump();
      }, errHandler);
    };

    const unsubs = [
      listen(collection(db, "splits")),
      listen(collectionGroup(db, "equipos")),
      listen(collectionGroup(db, "pilotos")),
      listen(collectionGroup(db, "roster")),
      listen(collectionGroup(db, "circuitos")),
    ];
    return () => {
      if (debounce) clearTimeout(debounce);
      unsubs.forEach(u => u());
    };
  }, [listenersReady]);

  useEffect(() => {
    let active = true;

    async function fetchAll() {
      try {
        const [splitsSnap, pilotosSnap] = await Promise.all([
          getDocs(collection(db, "splits")),
          getDocs(collection(db, "pilotos")).catch(() => null),
        ]);
        const pilotMap: Record<string, Piloto> = {};
        if (pilotosSnap) {
          pilotosSnap.docs.forEach(d => {
            pilotMap[d.id] = { id: d.id, ...d.data() } as Piloto;
          });
        }

        const sortedDocs = [...splitsSnap.docs].sort((a, b) => {
          const aOrden = a.data().orden ?? 999;
          const bOrden = b.data().orden ?? 999;
          if (aOrden !== bOrden) return aOrden - bOrden;
          return a.id.localeCompare(b.id);
        });

        const loadSplit = async (splitDoc: typeof sortedDocs[number]): Promise<SplitView> => {
          const sid = splitDoc.id;

          const [circSnap, equipSnap, flatRosterSnap] = await Promise.all([
            getDocs(collection(db, `splits/${sid}/circuitos`)),
            getDocs(collection(db, `splits/${sid}/equipos`)),
            getDocs(collection(db, `splits/${sid}/roster`)),
          ]);

          const circuitos: Circuito[] = circSnap.docs.map(d => {
            const data = d.data();
            return {
              id: d.id,
              completado: false,
              acta_cerrada: false,
              economia_procesada: false,
              ...data,
              resultados: sid === "origins" ? (data.resultados || []) : normalizeRaceResults((data.resultados || []) as any[]),
            };
          }) as Circuito[];

          // `agente_libre` es el cajón donde viven los pilotos sin escudería, no una
          // escudería: no compite, no tiene presupuesto y no debe aparecer en ninguna
          // lista de equipos. Que un piloto esté libre se sabe por su `equipoId`.
          const equipos: Equipo[] = equipSnap.docs
            .filter(d => d.id !== "agente_libre")
            .map(d => ({
              id: d.id,
              nombre: d.id,
              presupuesto: 100,
              puntos_constructores: 0,
              ...d.data(),
            })) as Equipo[];

          // Leer pilotos desde splits/{sid}/equipos/{equipoId}/pilotos
          const teamRosters = await Promise.all(equipSnap.docs.map(async equipoDoc => {
            try {
              const pilotosSnap = await getDocs(
                collection(db, `splits/${sid}/equipos/${equipoDoc.id}/pilotos`)
              );
              return pilotosSnap.docs.map(pd => ({ equipoDoc, pd }));
            } catch {
              return [];
            }
          }));

          const rosterByPilot = new Map<string, PilotInRoster>();
          for (const teamRoster of teamRosters) {
            for (const { equipoDoc, pd } of teamRoster) {
                const entry = pd.data() as RosterEntry;
                const piloto = pilotMap[pd.id];
                const normalizedEntry: PilotInRoster = {
                  ...entry,
                  pilotoId: pd.id,
                  // The Firestore path is authoritative if a stale copied field disagrees.
                  equipoId: equipoDoc.id,
                  nombre: piloto?.nombre ?? (entry as any).nombre ?? pd.id,
                  foto_url: piloto?.foto_url ?? (entry as any).foto_url,
                  rating_piloto: Number(entry.rating_piloto) > 0
                    ? Number(entry.rating_piloto)
                    : Number(piloto?.rating_piloto) > 0
                      ? Number(piloto?.rating_piloto)
                      : computePilotOVR(entry as any),
                };
                const existing = rosterByPilot.get(pd.id);
                const existingEnded = existing?.participa_hasta != null;
                const candidateEnded = normalizedEntry.participa_hasta != null;
                if (!existing || (existingEnded && !candidateEnded)) {
                  rosterByPilot.set(pd.id, normalizedEntry);
                }
            }
          }

          // Individual seasons (such as Origins) store participants directly
          // below the split because no team exists.
          for (const pd of flatRosterSnap.docs) {
            if (rosterByPilot.has(pd.id)) continue;
            const entry = pd.data() as RosterEntry;
            const piloto = pilotMap[pd.id];
            rosterByPilot.set(pd.id, {
              ...entry,
              pilotoId: pd.id,
              equipoId: entry.equipoId || "individual",
              nombre: piloto?.nombre ?? (entry as any).nombre ?? pd.id,
              foto_url: piloto?.foto_url ?? (entry as any).foto_url,
              rating_piloto: Number(entry.rating_piloto) > 0
                    ? Number(entry.rating_piloto)
                    : Number(piloto?.rating_piloto) > 0
                      ? Number(piloto?.rating_piloto)
                      : computePilotOVR(entry as any),
            });
          }

          const roster = [...rosterByPilot.values()];

          return {
            id: sid,
            nombre: splitDoc.data().nombre ?? sid,
            orden: splitDoc.data().orden ?? 0,
            fichajes_abiertos: splitDoc.data().fichajes_abiertos ?? false,
            activo: splitDoc.data().activo ?? false,
            completado: splitDoc.data().completado ?? false,
            temporada_iniciada: splitDoc.data().temporada_iniciada ?? false,
            tipo: splitDoc.data().tipo ?? "equipos",
            duos: splitDoc.data().duos ?? [],
            rivalries: splitDoc.data().rivalries,
            video_intro: splitDoc.data().video_intro ?? undefined,
            circuitos,
            equipos,
            roster,
            isStarted: circuitos.some(c => c.completado),
          };
        };

        if (sortedDocs.length === 0) {
          if (active) {
            hasLoaded.current = true;
            setSplits([]);
            setLoading(false);
            setListenersReady(true);
          }
          return;
        }

        const activeDoc = sortedDocs.find(d => d.data().activo)
          || sortedDocs.find(d => d.id === "split_3")
          || sortedDocs.find(d => d.data().orden === 3)
          || sortedDocs[sortedDocs.length - 1];
        const initialLoad = !hasLoaded.current;
        const activeSplit = await loadSplit(activeDoc);
        if (active && initialLoad) {
          hasLoaded.current = true;
          setSplits([activeSplit]);
          setLoading(false);
        }

        const otherResults = await Promise.allSettled(
          sortedDocs.filter(d => d.id !== activeDoc.id).map(loadSplit)
        );
        const loadedById = new Map<string, SplitView>([[activeSplit.id, activeSplit]]);
        otherResults.forEach(result => {
          if (result.status === "fulfilled") loadedById.set(result.value.id, result.value);
        });
        const result = sortedDocs.flatMap(d => {
          const split = loadedById.get(d.id);
          return split ? [split] : [];
        });
        if (active) {
          hasLoaded.current = true;
          setSplits(result);
          setLoading(false);
          setListenersReady(true);
        }
      } catch (err) {
        console.error("useSplits fetchAll error:", err);
        if (active) {
          setLoading(false);
          setListenersReady(true);
        }
      }
    }

    fetchAll();
    return () => { active = false; };
  }, [trigger]);

  return { splits, loading };
}

interface DataContextValue {
  splits: SplitView[];
  loadingSplits: boolean;
  usuarios: Usuario[];
}

const DataContext = createContext<DataContextValue | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const { splits, loading: loadingSplits } = useSplitsSource();
  const { usuarios } = useUsuariosSource();
  return (
    <DataContext.Provider value={{ splits, loadingSplits, usuarios }}>
      {children}
    </DataContext.Provider>
  );
}

export function useSplits() {
  const data = useContext(DataContext);
  if (!data) throw new Error("useSplits debe usarse dentro de DataProvider");
  return { splits: data.splits, loading: data.loadingSplits };
}

export function useUsuarios() {
  const data = useContext(DataContext);
  if (!data) throw new Error("useUsuarios debe usarse dentro de DataProvider");
  return { usuarios: data.usuarios };
}
