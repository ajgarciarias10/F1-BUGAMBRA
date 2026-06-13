import {
  doc, collection, getDocs, getDoc, runTransaction, writeBatch,
} from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "./firebase";
import { POINTS_BY_POSITION } from "./economyService";
import type { RaceResult, RosterEntry } from "../types";

const POINTS_SCALE = POINTS_BY_POSITION;

// ─── DELTA DE RATING POR CARRERA ─────────────────────────────────────────────
// Carrera + qualy con peso similar + bonos. Rango: -5 (DNF + mala qualy) a +19 (perfecto).

const RACE_POS_DELTA: Record<number, number> = {
  1: 6, 2: 5, 3: 4, 4: 3, 5: 2, 6: 1, 7: 1, 8: 0, 9: 0, 10: -1, 11: -1, 12: -2,
};

function calcRatingDelta(res: RaceResult): number {
  let rd = 0;

  // Posición en carrera
  if (res.isDnfOwnError) {
    rd -= 4;
  } else {
    rd += RACE_POS_DELTA[res.racePos] ?? -2; // P13+: -2
  }

  // Posición en qualy (peso similar a carrera para valorar clasificaciones)
  if (res.qualyPos === 1)      rd += 4;
  else if (res.qualyPos === 2) rd += 3;
  else if (res.qualyPos === 3) rd += 2;
  else if (res.qualyPos <= 6)  rd += 1;
  else if (res.qualyPos <= 9)  rd += 0;
  else                         rd -= 1; // P10+ o qualy fallido

  // Bonificaciones
  if (res.isClean)        rd += 2;
  if (res.fastestLap)     rd += 2;
  if (res.isMvp)          rd += 3;
  if (res.isDotd)         rd += 1;
  if (res.overtakesBoost) rd += 1;

  return rd;
}

// ─── PROCESAR CARRERA ─────────────────────────────────────────────────────────

export type { RaceResult };

export async function processRace(
  splitId: string,
  circuitoId: string,
  results: RaceResult[]
) {
  try {
    // Leer equipos y sus pilotos anidados para construir índices
    const [equiposSnap, splitDoc] = await Promise.all([
      getDocs(collection(db, `splits/${splitId}/equipos`)),
      getDoc(doc(db, "splits", splitId)),
    ]);

    const usaEconomia = (splitDoc.data()?.orden ?? 1) > 1;

    const pilotEquipoMap: Record<string, string> = {}; // pilotoId → equipoId
    const pilotDocRefs: Record<string, any> = {};       // pilotoId → ref nested

    for (const equipoDoc of equiposSnap.docs) {
      const pilotosSnap = await getDocs(
        collection(db, `splits/${splitId}/equipos/${equipoDoc.id}/pilotos`)
      );
      for (const pd of pilotosSnap.docs) {
        pilotEquipoMap[pd.id] = equipoDoc.id;
        pilotDocRefs[pd.id] = pd.ref;
      }
    }

    const equipoRefMap: Record<string, any> = {};
    equiposSnap.docs.forEach(d => { equipoRefMap[d.id] = d.ref; });

    const circuitoRef = doc(db, `splits/${splitId}/circuitos`, circuitoId);

    await runTransaction(db, async (tx) => {
      // ── Lecturas ────────────────────────────────────────────────────────────

      const circuitDoc = await tx.get(circuitoRef);
      if (circuitDoc.data()?.acta_cerrada) {
        throw new Error("El acta de esta carrera está CERRADA y no puede modificarse.");
      }

      const prevResults: RaceResult[] = circuitDoc.data()?.resultados ?? [];
      const isCorrection = prevResults.length > 0;

      const pilotDocEntries = Object.entries(pilotDocRefs);
      const [pilotTxDocs, equipoTxDocs] = await Promise.all([
        Promise.all(pilotDocEntries.map(([, ref]) => tx.get(ref))),
        Promise.all(equiposSnap.docs.map(d => tx.get(d.ref))),
      ]);

      const rosterData: Record<string, RosterEntry> = {};
      pilotDocEntries.forEach(([id], i) => {
        rosterData[id] = pilotTxDocs[i].data() as RosterEntry;
      });

      const equipoData: Record<string, { presupuesto: number; puntos_constructores: number }> = {};
      equiposSnap.docs.forEach((d, i) => {
        equipoData[d.id] = equipoTxDocs[i].data() as any ?? { presupuesto: 100, puntos_constructores: 0 };
      });

      // Contribución anterior de esta carrera por piloto (para restarla en correcciones)
      type StatDelta = { pts: number; victorias: number; podios: number; poles: number; dnfs: number; limpias: number; rd: number };
      const oldDelta: Record<string, StatDelta> = {};
      if (isCorrection) {
        for (const res of prevResults) {
          const pts =
            (res.racePos >= 1 && res.racePos <= 12 ? POINTS_SCALE[res.racePos - 1] : 0) +
            (res.qualyPos === 1 ? 2 : 0);
          oldDelta[res.pilotoId] = {
            pts,
            victorias: res.racePos === 1 ? 1 : 0,
            podios:    res.racePos >= 1 && res.racePos <= 3 ? 1 : 0,
            poles:     res.qualyPos === 1 ? 1 : 0,
            dnfs:      res.racePos > 12 || res.isDnfOwnError ? 1 : 0,
            limpias:   res.isClean ? 1 : 0,
            rd:        calcRatingDelta(res),
          };
        }
      }

      // ── Cálculos ────────────────────────────────────────────────────────────

      const rosterUpdates: Record<string, Partial<RosterEntry>> = {};
      const newRatings: Record<string, number> = {};
      const teamStats: Record<string, { pts: number; poles: number; fl: number; clean: boolean }> = {};

      for (const res of results) {
        const roster = rosterData[res.pilotoId];
        if (!roster) continue;

        const equipoId = pilotEquipoMap[res.pilotoId];
        if (!equipoId) continue;
        if (!teamStats[equipoId]) {
          teamStats[equipoId] = { pts: 0, poles: 0, fl: 0, clean: true };
        }

        const pts =
          (res.racePos >= 1 && res.racePos <= 12 ? POINTS_SCALE[res.racePos - 1] : 0) +
          (res.qualyPos === 1 ? 2 : 0);

        const old = oldDelta[res.pilotoId] ?? { pts: 0, victorias: 0, podios: 0, poles: 0, dnfs: 0, limpias: 0, rd: 0 };
        const prev = rosterUpdates[res.pilotoId] ?? { ...roster };
        rosterUpdates[res.pilotoId] = {
          ...prev,
          puntos_piloto:    Math.max(0, (prev.puntos_piloto    ?? 0) - old.pts       + pts),
          victorias:        Math.max(0, (prev.victorias        ?? 0) - old.victorias + (res.racePos === 1 ? 1 : 0)),
          podios:           Math.max(0, (prev.podios           ?? 0) - old.podios    + (res.racePos <= 3 && res.racePos >= 1 ? 1 : 0)),
          poles:            Math.max(0, (prev.poles            ?? 0) - old.poles     + (res.qualyPos === 1 ? 1 : 0)),
          dnfs:             Math.max(0, (prev.dnfs             ?? 0) - old.dnfs      + (res.racePos > 12 || res.isDnfOwnError ? 1 : 0)),
          carreras_limpias: Math.max(0, (prev.carreras_limpias ?? 0) - old.limpias   + (res.isClean ? 1 : 0)),
        };

        const rd = calcRatingDelta(res);
        const currentRating = rosterData[res.pilotoId]?.rating_piloto ?? 50;
        const baseRating = Math.max(50, Math.min(99, currentRating - old.rd));
        newRatings[res.pilotoId] = Math.max(50, Math.min(99, baseRating + rd));

        teamStats[equipoId].pts += pts;
        if (res.qualyPos === 1) teamStats[equipoId].poles++;
        if (res.fastestLap)     teamStats[equipoId].fl++;
        if (!res.isClean)       teamStats[equipoId].clean = false;
      }

      // ── Escrituras ──────────────────────────────────────────────────────────

      // Stats de pilotos en el doc anidado del split
      for (const [pilotoId, updates] of Object.entries(rosterUpdates)) {
        if (pilotDocRefs[pilotoId]) {
          tx.update(pilotDocRefs[pilotoId], {
            puntos_piloto:    updates.puntos_piloto    ?? 0,
            victorias:        updates.victorias        ?? 0,
            podios:           updates.podios           ?? 0,
            poles:            updates.poles            ?? 0,
            dnfs:             updates.dnfs             ?? 0,
            carreras_limpias: updates.carreras_limpias ?? 0,
          });
        }
      }

      // Rating en el doc anidado del split y en el doc global pilotos/
      for (const [pilotoId, rating] of Object.entries(newRatings)) {
        if (pilotDocRefs[pilotoId]) {
          tx.update(pilotDocRefs[pilotoId], { rating_piloto: rating });
          tx.update(doc(db, "pilotos", pilotoId), { rating_piloto: rating });
        }
      }

      // Puntos constructores siempre; bonus de presupuesto solo con economía activa
      for (const [teamId, stats] of Object.entries(teamStats)) {
        if (!equipoRefMap[teamId]) continue;
        const current = equipoData[teamId];
        const updates: Record<string, number> = {
          puntos_constructores: (current.puntos_constructores ?? 0) + stats.pts,
        };
        if (usaEconomia) {
          updates.presupuesto = (current.presupuesto ?? 100) +
            4 + stats.pts * 0.1 + stats.poles * 2 + stats.fl + (stats.clean ? 3 : 0);
        }
        tx.update(equipoRefMap[teamId], updates);
      }

      tx.update(circuitoRef, { completado: true, resultados: results });
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `splits/${splitId}/circuitos/${circuitoId}`);
  }
}

// ─── RECALCULAR PUNTOS DE UN SPLIT ───────────────────────────────────────────
// Sobreescribe stats y rating leyendo los resultados guardados desde cero.
// Rating arranca en 0; cada carrera acumula deltas (pole +5, victoria +5, limpia +2, DNF propio -3).

export async function recalcSplitPoints(
  splitId: string
): Promise<{ ok: number; notFound: string[]; message: string }> {
  try {
    const circSnap = await getDocs(collection(db, `splits/${splitId}/circuitos`));
    const completed = circSnap.docs
      .map(d => ({ id: d.id, ...d.data() as any }))
      .filter(c => c.completado && Array.isArray(c.resultados) && c.resultados.length > 0)
      .sort((a, b) => {
        if (a.numero_carrera && b.numero_carrera) return a.numero_carrera - b.numero_carrera;
        return a.id.localeCompare(b.id);
      });

    // Construir índice de pilotos desde docs anidados (siempre, incluso sin circuitos)
    const equiposSnap = await getDocs(collection(db, `splits/${splitId}/equipos`));

    const pilotDocRefs: Record<string, any> = {};
    const pilotTeamMap: Record<string, string> = {};
    const pilotAccum: Record<string, {
      puntos_piloto: number; victorias: number; podios: number;
      poles: number; dnfs: number; carreras_limpias: number; rating: number;
    }> = {};

    for (const equipoDoc of equiposSnap.docs) {
      const pilotosSnap = await getDocs(
        collection(db, `splits/${splitId}/equipos/${equipoDoc.id}/pilotos`)
      );
      for (const pd of pilotosSnap.docs) {
        pilotDocRefs[pd.id] = pd.ref;
        pilotTeamMap[pd.id] = equipoDoc.id;
        pilotAccum[pd.id] = {
          puntos_piloto: 0, victorias: 0, podios: 0,
          poles: 0, dnfs: 0, carreras_limpias: 0,
          rating: 50,
        };
      }
    }

    const equipoRefMap: Record<string, any> = {};
    equiposSnap.docs.forEach(d => { equipoRefMap[d.id] = d.ref; });

    if (completed.length === 0) {
      // Sin carreras completadas: escribir rating inicial 50 a todos los pilotos del roster
      const batch = writeBatch(db);
      let ok = 0;
      for (const [pid, acc] of Object.entries(pilotAccum)) {
        if (pilotDocRefs[pid]) {
          batch.update(pilotDocRefs[pid], { rating_piloto: acc.rating });
          batch.update(doc(db, "pilotos", pid), { rating_piloto: acc.rating });
          ok++;
        }
      }
      await batch.commit();
      return { ok, notFound: [], message: `Sin circuitos completados en ${splitId}. Ratings inicializados a 50.` };
    }

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

        acc.rating = Math.max(50, Math.min(99, acc.rating + calcRatingDelta(res)));
      }
    }

    // Puntos constructores por equipo
    const teamPts: Record<string, number> = {};
    for (const [pid, acc] of Object.entries(pilotAccum)) {
      const teamId = pilotTeamMap[pid];
      if (teamId) teamPts[teamId] = (teamPts[teamId] ?? 0) + acc.puntos_piloto;
    }

    // Escribir en batch
    const batch = writeBatch(db);
    let ok = 0;

    for (const [pid, acc] of Object.entries(pilotAccum)) {
      if (pilotDocRefs[pid]) {
        batch.update(pilotDocRefs[pid], {
          puntos_piloto:    acc.puntos_piloto,
          victorias:        acc.victorias,
          podios:           acc.podios,
          poles:            acc.poles,
          dnfs:             acc.dnfs,
          carreras_limpias: acc.carreras_limpias,
          rating_piloto:    acc.rating,
        });
        batch.update(doc(db, "pilotos", pid), { rating_piloto: acc.rating });
        ok++;
      }
    }

    for (const [teamId, pts] of Object.entries(teamPts)) {
      if (equipoRefMap[teamId]) {
        batch.update(equipoRefMap[teamId], { puntos_constructores: pts });
      }
    }

    await batch.commit();

    const msg = `Recálculo ${splitId}: ${ok} pilotos actualizados.${notFound.length ? ` No encontrados: ${notFound.join(", ")}` : ""}`;
    return { ok, notFound, message: msg };
  } catch (error: any) {
    return { ok: 0, notFound: [], message: `Error recalculando ${splitId}: ${error.message}` };
  }
}
