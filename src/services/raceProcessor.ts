import {
  doc, collection, getDocs, runTransaction, writeBatch,
} from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "./firebase";
import { POINTS_BY_POSITION } from "./economyService";
import type { RaceResult, RosterEntry } from "../types";

const POINTS_SCALE = POINTS_BY_POSITION;

// ─── PROCESAR CARRERA ─────────────────────────────────────────────────────────

export type { RaceResult };

export async function processRace(
  splitId: string,
  circuitoId: string,
  results: RaceResult[]
) {
  try {
    // Pre-fetch roster, equipos y circuito (para obtener refs antes de la transacción)
    const [rosterSnap, equiposSnap] = await Promise.all([
      getDocs(collection(db, `splits/${splitId}/roster`)),
      getDocs(collection(db, `splits/${splitId}/equipos`)),
    ]);

    const circuitoRef = doc(db, `splits/${splitId}/circuitos`, circuitoId);

    // Refs indexadas
    const rosterRefMap: Record<string, { ref: any }> = {};
    rosterSnap.docs.forEach(d => { rosterRefMap[d.id] = { ref: d.ref }; });

    const equipoRefMap: Record<string, any> = {};
    equiposSnap.docs.forEach(d => { equipoRefMap[d.id] = d.ref; });

    // Refs de pilotos globales (para actualizar rating)
    const pilotIds = [...new Set(results.map(r => r.pilotoId))];
    const pilotRefMap: Record<string, any> = {};
    pilotIds.forEach(id => { pilotRefMap[id] = doc(db, "pilotos", id); });

    await runTransaction(db, async (tx) => {
      // ── Lecturas ────────────────────────────────────────────────────────────

      const circuitDoc = await tx.get(circuitoRef);
      if (circuitDoc.data()?.acta_cerrada) {
        throw new Error("El acta de esta carrera está CERRADA y no puede modificarse.");
      }

      // Leer roster y ratings de pilotos en paralelo dentro de la transacción
      const rosterDocs = await Promise.all(rosterSnap.docs.map(d => tx.get(d.ref)));
      const pilotDocs  = await Promise.all(pilotIds.map(id => tx.get(pilotRefMap[id])));
      const equipoDocs = await Promise.all(equiposSnap.docs.map(d => tx.get(d.ref)));

      const rosterData: Record<string, RosterEntry> = {};
      rosterSnap.docs.forEach((d, i) => {
        rosterData[d.id] = rosterDocs[i].data() as RosterEntry;
      });

      const pilotRating: Record<string, number> = {};
      pilotIds.forEach((id, i) => {
        pilotRating[id] = (pilotDocs[i].data() as any)?.rating_piloto ?? 70;
      });

      const equipoData: Record<string, { presupuesto: number; puntos_constructores: number }> = {};
      equiposSnap.docs.forEach((d, i) => {
        equipoData[d.id] = equipoDocs[i].data() as any ?? { presupuesto: 100, puntos_constructores: 0 };
      });

      // ── Cálculos ────────────────────────────────────────────────────────────

      const rosterUpdates: Record<string, Partial<RosterEntry>> = {};
      const newRatings: Record<string, number> = {};
      const teamStats: Record<string, { pts: number; poles: number; fl: number; clean: boolean }> = {};

      for (const res of results) {
        const roster = rosterData[res.pilotoId];
        if (!roster) continue;

        const { equipoId } = roster;
        if (!teamStats[equipoId]) {
          teamStats[equipoId] = { pts: 0, poles: 0, fl: 0, clean: true };
        }

        const pts =
          (res.racePos >= 1 && res.racePos <= 12 ? POINTS_SCALE[res.racePos - 1] : 0) +
          (res.qualyPos === 1 ? 2 : 0);

        // Acumular stats en roster
        const prev = rosterUpdates[res.pilotoId] ?? { ...roster };
        rosterUpdates[res.pilotoId] = {
          ...prev,
          puntos_piloto:    (prev.puntos_piloto    ?? 0) + pts,
          victorias:        (prev.victorias        ?? 0) + (res.racePos === 1 ? 1 : 0),
          podios:           (prev.podios           ?? 0) + (res.racePos <= 3 && res.racePos >= 1 ? 1 : 0),
          poles:            (prev.poles            ?? 0) + (res.qualyPos === 1 ? 1 : 0),
          dnfs:             (prev.dnfs             ?? 0) + (res.racePos > 12 || res.isDnfOwnError ? 1 : 0),
          carreras_limpias: (prev.carreras_limpias ?? 0) + (res.isClean ? 1 : 0),
        };

        // Delta de rating global del piloto
        let rd = 0;
        if (res.qualyPos === 1)    rd += 5;
        if (res.racePos === 1)     rd += 5;
        if (res.isDnfOwnError)     rd -= 3;
        if (res.isClean)           rd += 2;
        newRatings[res.pilotoId] = Math.max(0, Math.min(99, (pilotRating[res.pilotoId] ?? 70) + rd));

        // Acumular stats de equipo
        teamStats[equipoId].pts += pts;
        if (res.qualyPos === 1) teamStats[equipoId].poles++;
        if (res.fastestLap)     teamStats[equipoId].fl++;
        if (!res.isClean)       teamStats[equipoId].clean = false;
      }

      // ── Escrituras ──────────────────────────────────────────────────────────

      // Stats de pilotos en el roster del split (solo campos numéricos acumulables)
      for (const [pilotoId, updates] of Object.entries(rosterUpdates)) {
        if (rosterRefMap[pilotoId]) {
          tx.update(rosterRefMap[pilotoId].ref, {
            puntos_piloto:    updates.puntos_piloto    ?? 0,
            victorias:        updates.victorias        ?? 0,
            podios:           updates.podios           ?? 0,
            poles:            updates.poles            ?? 0,
            dnfs:             updates.dnfs             ?? 0,
            carreras_limpias: updates.carreras_limpias ?? 0,
          });
        }
      }

      // Rating global de cada piloto
      for (const [pilotoId, rating] of Object.entries(newRatings)) {
        tx.update(pilotRefMap[pilotoId], { rating_piloto: rating });
      }

      // Presupuesto y puntos constructores de equipos (solo split_2 en adelante)
      if (splitId !== "split_1") {
        for (const [teamId, stats] of Object.entries(teamStats)) {
          if (!equipoRefMap[teamId]) continue;
          const current = equipoData[teamId];
          const bonus = 4 + stats.pts * 0.1 + stats.poles * 2 + stats.fl + (stats.clean ? 3 : 0);
          tx.update(equipoRefMap[teamId], {
            presupuesto:         (current.presupuesto        ?? 100) + bonus,
            puntos_constructores: (current.puntos_constructores ?? 0) + stats.pts,
          });
        }
      }

      // Circuito: marcar como completado
      tx.update(circuitoRef, { completado: true, resultados: results });
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `splits/${splitId}/circuitos/${circuitoId}`);
  }
}

// ─── RECALCULAR PUNTOS DE UN SPLIT ───────────────────────────────────────────
// Sobreescribe stats de roster y rating global leyendo los resultados guardados.
// Usar cuando los acumulados están incorrectos.

export async function recalcSplitPoints(
  splitId: string
): Promise<{ ok: number; notFound: string[]; message: string }> {
  try {
    // Leer circuitos completados, ordenados por numero_carrera
    const circSnap = await getDocs(collection(db, `splits/${splitId}/circuitos`));
    const completed = circSnap.docs
      .map(d => ({ id: d.id, ...d.data() as any }))
      .filter(c => c.completado && Array.isArray(c.resultados) && c.resultados.length > 0)
      .sort((a, b) => {
        if (a.numero_carrera && b.numero_carrera) return a.numero_carrera - b.numero_carrera;
        return a.id.localeCompare(b.id);
      });

    if (completed.length === 0) {
      return { ok: 0, notFound: [], message: `Sin circuitos completados en ${splitId}.` };
    }

    // Leer roster y pilotos globales
    const [rosterSnap, pilotosSnap] = await Promise.all([
      getDocs(collection(db, `splits/${splitId}/roster`)),
      getDocs(collection(db, "pilotos")),
    ]);

    const rosterRefMap: Record<string, any> = {};
    rosterSnap.docs.forEach(d => { rosterRefMap[d.id] = d.ref; });

    const pilotRefMap: Record<string, any> = {};
    pilotosSnap.docs.forEach(d => { pilotRefMap[d.id] = d.ref; });

    // Acumuladores por piloto
    const pilotAccum: Record<string, {
      puntos_piloto: number; victorias: number; podios: number;
      poles: number; dnfs: number; carreras_limpias: number; rating: number;
    }> = {};

    for (const pid of rosterSnap.docs.map(d => d.id)) {
      pilotAccum[pid] = {
        puntos_piloto: 0, victorias: 0, podios: 0,
        poles: 0, dnfs: 0, carreras_limpias: 0, rating: 70,
      };
    }

    // Leer ratings base de pilotos globales
    pilotosSnap.docs.forEach(d => {
      if (pilotAccum[d.id]) {
        pilotAccum[d.id].rating = d.data().rating_piloto ?? 70;
      }
    });

    const notFound: string[] = [];

    for (const circ of completed) {
      for (const res of circ.resultados as RaceResult[]) {
        const acc = pilotAccum[res.pilotoId];
        if (!acc) {
          if (!notFound.includes(res.pilotoId)) notFound.push(res.pilotoId);
          continue;
        }

        const pts =
          (res.racePos >= 1 && res.racePos <= 12 ? POINTS_SCALE[res.racePos - 1] : 0) +
          (res.qualyPos === 1 ? 2 : 0);

        acc.puntos_piloto += pts;
        if (res.racePos === 1)  acc.victorias++;
        if (res.racePos <= 3 && res.racePos >= 1) acc.podios++;
        if (res.qualyPos === 1) acc.poles++;
        if (res.racePos > 12 || res.isDnfOwnError) acc.dnfs++;
        if (res.isClean) acc.carreras_limpias++;

        let rd = 0;
        if (res.qualyPos === 1) rd += 5;
        if (res.racePos === 1)  rd += 5;
        if (res.isDnfOwnError)  rd -= 3;
        if (res.isClean)        rd += 2;
        acc.rating = Math.max(0, Math.min(99, acc.rating + rd));
      }
    }

    // Escribir en batch (roster stats + rating global)
    const batch = writeBatch(db);
    let ok = 0;

    for (const [pid, acc] of Object.entries(pilotAccum)) {
      if (rosterRefMap[pid]) {
        batch.update(rosterRefMap[pid], {
          puntos_piloto:    acc.puntos_piloto,
          victorias:        acc.victorias,
          podios:           acc.podios,
          poles:            acc.poles,
          dnfs:             acc.dnfs,
          carreras_limpias: acc.carreras_limpias,
        });
      }
      if (pilotRefMap[pid]) {
        batch.update(pilotRefMap[pid], { rating_piloto: acc.rating });
      }
      ok++;
    }

    await batch.commit();

    const msg = `Recálculo ${splitId}: ${ok} pilotos actualizados.${notFound.length ? ` No encontrados: ${notFound.join(", ")}` : ""}`;
    return { ok, notFound, message: msg };
  } catch (error: any) {
    return { ok: 0, notFound: [], message: `Error recalculando ${splitId}: ${error.message}` };
  }
}
