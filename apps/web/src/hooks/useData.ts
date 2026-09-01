import { useEffect, useState } from "react";
import { collection, collectionGroup, onSnapshot, getDocs } from "firebase/firestore";
import { db } from "../services/firebase";
import type { Usuario, Piloto, SplitView, Circuito, Equipo, PilotInRoster, RosterEntry } from "../types";

// ─── USUARIOS ─────────────────────────────────────────────────────────────────

export function useUsuarios() {
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

export function useSplits() {
  const [splits, setSplits] = useState<SplitView[]>([]);
  const [loading, setLoading] = useState(true);
  const [trigger, setTrigger] = useState(0);

  // Listeners: cualquier cambio en splits, equipos, roster o circuitos
  // dispara un re-fetch completo del árbol
  useEffect(() => {
    const bump = () => setTrigger(t => t + 1);
    const errHandler = (err: Error) => console.warn("useSplits listener error:", err);

    const unsubs = [
      onSnapshot(collection(db, "splits"), bump, errHandler),
      onSnapshot(collectionGroup(db, "equipos"), bump, errHandler),
      onSnapshot(collectionGroup(db, "pilotos"), bump, errHandler),
      onSnapshot(collectionGroup(db, "roster"), bump, errHandler),
      onSnapshot(collectionGroup(db, "circuitos"), bump, errHandler),
    ];
    return () => unsubs.forEach(u => u());
  }, []);

  useEffect(() => {
    let active = true;

    async function fetchAll() {
      try {
        const splitsSnap = await getDocs(collection(db, "splits"));

        // Intentar leer pilotos globales; si falla por permisos se usa mapa vacío
        const pilotMap: Record<string, Piloto> = {};
        try {
          const pilotosSnap = await getDocs(collection(db, "pilotos"));
          pilotosSnap.docs.forEach(d => {
            pilotMap[d.id] = { id: d.id, ...d.data() } as Piloto;
          });
        } catch {
          // Sin reglas públicas aún: nombres se obtendrán del modelo antiguo
        }

        const sortedDocs = [...splitsSnap.docs].sort((a, b) => {
          const aOrden = a.data().orden ?? 999;
          const bOrden = b.data().orden ?? 999;
          if (aOrden !== bOrden) return aOrden - bOrden;
          return a.id.localeCompare(b.id);
        });

        const result: SplitView[] = [];

        for (const splitDoc of sortedDocs) {
          const sid = splitDoc.id;

          const [circSnap, equipSnap, flatRosterSnap] = await Promise.all([
            getDocs(collection(db, `splits/${sid}/circuitos`)),
            getDocs(collection(db, `splits/${sid}/equipos`)),
            getDocs(collection(db, `splits/${sid}/roster`)),
          ]);

          const circuitos: Circuito[] = circSnap.docs.map(d => ({
            id: d.id,
            completado: false,
            acta_cerrada: false,
            economia_procesada: false,
            resultados: [],
            ...d.data(),
          })) as Circuito[];

          const equipos: Equipo[] = equipSnap.docs.map(d => ({
            id: d.id,
            nombre: d.id,
            presupuesto: 100,
            puntos_constructores: 0,
            ...d.data(),
          })) as Equipo[];

          // Leer pilotos desde splits/{sid}/equipos/{equipoId}/pilotos
          const roster: PilotInRoster[] = [];
          for (const equipoDoc of equipSnap.docs) {
            try {
              const pilotosSnap = await getDocs(
                collection(db, `splits/${sid}/equipos/${equipoDoc.id}/pilotos`)
              );
              for (const pd of pilotosSnap.docs) {
                const entry = pd.data() as RosterEntry;
                const piloto = pilotMap[pd.id];
                roster.push({
                  ...entry,
                  pilotoId: pd.id,
                  nombre: piloto?.nombre ?? (entry as any).nombre ?? pd.id,
                  foto_url: piloto?.foto_url ?? (entry as any).foto_url,
                });
              }
            } catch {
              // Equipo individual inaccesible, continuar
            }
          }

          // Individual seasons (such as Origins) store participants directly
          // below the split because no team exists.
          for (const pd of flatRosterSnap.docs) {
            if (roster.some(entry => entry.pilotoId === pd.id)) continue;
            const entry = pd.data() as RosterEntry;
            const piloto = pilotMap[pd.id];
            roster.push({
              ...entry,
              pilotoId: pd.id,
              equipoId: entry.equipoId || "individual",
              nombre: piloto?.nombre ?? (entry as any).nombre ?? pd.id,
              foto_url: piloto?.foto_url ?? (entry as any).foto_url,
            });
          }

          result.push({
            id: sid,
            nombre: splitDoc.data().nombre ?? sid,
            orden: splitDoc.data().orden ?? 0,
            fichajes_abiertos: splitDoc.data().fichajes_abiertos ?? false,
            activo: splitDoc.data().activo ?? false,
            completado: splitDoc.data().completado ?? false,
            tipo: splitDoc.data().tipo ?? "equipos",
            duos: splitDoc.data().duos ?? [],
            rivalries: splitDoc.data().rivalries,
            video_intro: splitDoc.data().video_intro ?? undefined,
            circuitos,
            equipos,
            roster,
            isStarted: circuitos.some(c => c.completado),
          });
        }

        if (active) {
          setSplits(result);
          setLoading(false);
        }
      } catch (err) {
        console.error("useSplits fetchAll error:", err);
        if (active) setLoading(false);
      }
    }

    fetchAll();
    return () => { active = false; };
  }, [trigger]);

  return { splits, loading };
}
