import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { collection, collectionGroup, onSnapshot } from "firebase/firestore";
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

// El escudo se sube una vez por escudería y se guarda en su equipo de ese split, así que un
// bloque recién abierto se queda sin fotos hasta que alguien las vuelva a subir. Heredamos el
// del split más reciente que sí lo tenga: los ids de escudería se mantienen entre splits.
function heredarEscudos(splits: SplitView[]): SplitView[] {
  const escudos = new Map<string, string>();
  for (const split of splits) {
    for (const equipo of split.equipos) {
      if (equipo.logo_url) escudos.set(equipo.id, equipo.logo_url);
    }
  }
  if (escudos.size === 0) return splits;

  return splits.map(split => ({
    ...split,
    equipos: split.equipos.map(equipo =>
      equipo.logo_url ? equipo : { ...equipo, logo_url: escudos.get(equipo.id) }
    ),
  }));
}

// ─── SPLITS (con circuitos, equipos y roster enriquecido) ────────────────────
//
// Los documentos crudos viven en el estado, uno por colección, y el SplitView que consumen
// los componentes se deriva de ellos con un useMemo. No hay ningún fetchAll: los cinco
// listeners de abajo son la única fuente de datos, y cada uno solo parchea, con
// snapshot.docChanges(), el documento que de verdad cambió — Firestore ya avisa de qué
// cambió, así que no hace falta releer la colección entera en cada escritura.

type MapaUno = Map<string, Map<string, any>>;              // sid → (id → data)
type MapaDos = Map<string, Map<string, Map<string, any>>>; // sid → eid → (pilotoId → data)

interface RawState {
  splits: Map<string, any>;
  equipos: MapaUno;
  circuitos: MapaUno;
  rosterFlat: MapaUno;
  pilotosPorEquipo: MapaDos;
  pilotosGlobales: Map<string, any>;
}

const rawVacio = (): RawState => ({
  splits: new Map(),
  equipos: new Map(),
  circuitos: new Map(),
  rosterFlat: new Map(),
  pilotosPorEquipo: new Map(),
  pilotosGlobales: new Map(),
});

function conUno(mapa: MapaUno, sid: string, id: string, data: any | null): MapaUno {
  const next = new Map(mapa);
  const inner = new Map(next.get(sid) ?? []);
  if (data === null) inner.delete(id); else inner.set(id, data);
  if (inner.size === 0) next.delete(sid); else next.set(sid, inner);
  return next;
}

function conDos(mapa: MapaDos, sid: string, eid: string, pid: string, data: any | null): MapaDos {
  const next = new Map(mapa);
  const nivelSplit = new Map(next.get(sid) ?? []);
  const nivelEquipo = new Map(nivelSplit.get(eid) ?? []);
  if (data === null) nivelEquipo.delete(pid); else nivelEquipo.set(pid, data);
  if (nivelEquipo.size === 0) nivelSplit.delete(eid); else nivelSplit.set(eid, nivelEquipo);
  if (nivelSplit.size === 0) next.delete(sid); else next.set(sid, nivelSplit);
  return next;
}

function enriquecerFicha(pilotoId: string, equipoId: string, entry: RosterEntry, piloto: any): PilotInRoster {
  return {
    ...entry,
    pilotoId,
    equipoId,
    nombre: piloto?.nombre ?? (entry as any).nombre ?? pilotoId,
    foto_url: piloto?.foto_url ?? (entry as any).foto_url,
    rating_piloto: Number(entry.rating_piloto) > 0
      ? Number(entry.rating_piloto)
      : Number(piloto?.rating_piloto) > 0
        ? Number(piloto?.rating_piloto)
        : computePilotOVR(entry as any),
  };
}

function derivarSplit(sid: string, splitData: any, raw: RawState): SplitView {
  const circuitosMap = raw.circuitos.get(sid) ?? new Map();
  const circuitos: Circuito[] = [...circuitosMap.entries()].map(([id, data]) => ({
    id,
    completado: false,
    acta_cerrada: false,
    economia_procesada: false,
    ...data,
    resultados: sid === "origins" ? (data.resultados || []) : normalizeRaceResults((data.resultados || []) as any[]),
  })) as Circuito[];

  // `agente_libre` es el cajón donde viven los pilotos sin escudería, no una escudería: no
  // compite, no tiene presupuesto y no debe aparecer en ninguna lista de equipos.
  const equiposMap = raw.equipos.get(sid) ?? new Map();
  const equipos: Equipo[] = [...equiposMap.entries()]
    .filter(([id]) => id !== "agente_libre")
    .map(([id, data]) => ({ id, nombre: id, presupuesto: 100, puntos_constructores: 0, ...data })) as Equipo[];

  const rosterByPilot = new Map<string, PilotInRoster>();
  const pilotosPorEquipoDelSplit = raw.pilotosPorEquipo.get(sid) ?? new Map();
  for (const [equipoId, pilotosDelEquipo] of pilotosPorEquipoDelSplit) {
    for (const [pilotoId, entry] of pilotosDelEquipo) {
      const normalizedEntry = enriquecerFicha(pilotoId, equipoId, entry as RosterEntry, raw.pilotosGlobales.get(pilotoId));
      const existing = rosterByPilot.get(pilotoId);
      const existingEnded = existing?.participa_hasta != null;
      const candidateEnded = normalizedEntry.participa_hasta != null;
      if (!existing || (existingEnded && !candidateEnded)) {
        rosterByPilot.set(pilotoId, normalizedEntry);
      }
    }
  }

  // Las temporadas individuales (como Origins) guardan a sus participantes directamente bajo
  // el split, porque no tienen equipos.
  const rosterFlatMap = raw.rosterFlat.get(sid) ?? new Map();
  for (const [pilotoId, entry] of rosterFlatMap) {
    if (rosterByPilot.has(pilotoId)) continue;
    const equipoId = (entry as RosterEntry).equipoId || "individual";
    rosterByPilot.set(pilotoId, enriquecerFicha(pilotoId, equipoId, entry as RosterEntry, raw.pilotosGlobales.get(pilotoId)));
  }

  const roster = [...rosterByPilot.values()];

  return {
    id: sid,
    nombre: splitData.nombre ?? sid,
    orden: splitData.orden ?? 0,
    fichajes_abiertos: splitData.fichajes_abiertos ?? false,
    activo: splitData.activo ?? false,
    completado: splitData.completado ?? false,
    temporada_iniciada: splitData.temporada_iniciada ?? false,
    tipo: splitData.tipo ?? "equipos",
    duos: splitData.duos ?? [],
    rivalries: splitData.rivalries,
    rivalidades_manual: splitData.rivalidades_manual,
    // "" significa "sin intro"; null o ausente significa "nunca se editó".
    video_intro: splitData.video_intro === null ? undefined : splitData.video_intro,
    circuitos,
    equipos,
    roster,
    isStarted: circuitos.some(c => c.completado),
  };
}

function useSplitsSource() {
  const [raw, setRaw] = useState<RawState>(rawVacio);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelado = false;
    const listos = new Set<string>();
    const marcarListo = (clave: string) => {
      listos.add(clave);
      if (listos.size === 5) setLoading(false);
    };

    // Un listener que falla también "termina". Si no, basta con que Firestore
    // rechace una sola consulta (permisos, red) para que la pantalla se quede
    // en "Cargando temporada" eternamente, sin decir nunca qué ha pasado.
    const marcarFallido = (clave: string) => (err: unknown) => {
      console.warn(`useSplits (${clave}) error:`, err);
      if (!cancelado) marcarListo(clave);
    };

    const unsubSplits = onSnapshot(collection(db, "splits"), snap => {
      if (cancelado) return;
      setRaw(prev => {
        const splits = new Map(prev.splits);
        snap.docChanges().forEach(change => {
          if (change.type === "removed") splits.delete(change.doc.id);
          else splits.set(change.doc.id, change.doc.data());
        });
        return { ...prev, splits };
      });
      marcarListo("splits");
    }, marcarFallido("splits"));

    const unsubEquipos = onSnapshot(collectionGroup(db, "equipos"), snap => {
      if (cancelado) return;
      setRaw(prev => {
        let equipos = prev.equipos;
        snap.docChanges().forEach(change => {
          const sid = change.doc.ref.parent.parent?.id;
          if (!sid) return;
          equipos = conUno(equipos, sid, change.doc.id, change.type === "removed" ? null : change.doc.data());
        });
        return { ...prev, equipos };
      });
      marcarListo("equipos");
    }, marcarFallido("equipos"));

    const unsubCircuitos = onSnapshot(collectionGroup(db, "circuitos"), snap => {
      if (cancelado) return;
      setRaw(prev => {
        let circuitos = prev.circuitos;
        snap.docChanges().forEach(change => {
          const sid = change.doc.ref.parent.parent?.id;
          if (!sid) return;
          circuitos = conUno(circuitos, sid, change.doc.id, change.type === "removed" ? null : change.doc.data());
        });
        return { ...prev, circuitos };
      });
      marcarListo("circuitos");
    }, marcarFallido("circuitos"));

    const unsubRoster = onSnapshot(collectionGroup(db, "roster"), snap => {
      if (cancelado) return;
      setRaw(prev => {
        let rosterFlat = prev.rosterFlat;
        snap.docChanges().forEach(change => {
          const sid = change.doc.ref.parent.parent?.id;
          if (!sid) return;
          rosterFlat = conUno(rosterFlat, sid, change.doc.id, change.type === "removed" ? null : change.doc.data());
        });
        return { ...prev, rosterFlat };
      });
      marcarListo("roster");
    }, marcarFallido("roster"));

    // collectionGroup("pilotos") engancha a la vez el catálogo global (pilotos/{id}, en raíz)
    // y las fichas de roster (splits/{}/equipos/{}/pilotos/{id}): hay que separarlas por la
    // ruta del documento o se mezclan pilotos globales con fichas de equipo.
    const unsubPilotos = onSnapshot(collectionGroup(db, "pilotos"), snap => {
      if (cancelado) return;
      setRaw(prev => {
        let pilotosPorEquipo = prev.pilotosPorEquipo;
        let pilotosGlobales = prev.pilotosGlobales;
        let globalesTocado = false;
        snap.docChanges().forEach(change => {
          const equipoRef = change.doc.ref.parent.parent; // null si es del catálogo raíz
          if (equipoRef === null) {
            if (!globalesTocado) { pilotosGlobales = new Map(pilotosGlobales); globalesTocado = true; }
            if (change.type === "removed") pilotosGlobales.delete(change.doc.id);
            else pilotosGlobales.set(change.doc.id, { id: change.doc.id, ...change.doc.data() });
            return;
          }
          const sid = equipoRef.parent.parent?.id;
          if (!sid) return;
          pilotosPorEquipo = conDos(pilotosPorEquipo, sid, equipoRef.id, change.doc.id, change.type === "removed" ? null : change.doc.data());
        });
        return { ...prev, pilotosPorEquipo, pilotosGlobales };
      });
      marcarListo("pilotos");
    }, marcarFallido("pilotos"));

    return () => {
      cancelado = true;
      unsubSplits(); unsubEquipos(); unsubCircuitos(); unsubRoster(); unsubPilotos();
    };
  }, []);

  const splits = useMemo(() => {
    const entradas = [...raw.splits.entries()].sort(([aid, a], [bid, b]) => {
      const aOrden = a.orden ?? 999, bOrden = b.orden ?? 999;
      if (aOrden !== bOrden) return aOrden - bOrden;
      return aid.localeCompare(bid);
    });
    return heredarEscudos(entradas.map(([sid, data]) => derivarSplit(sid, data, raw)));
  }, [raw]);

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
