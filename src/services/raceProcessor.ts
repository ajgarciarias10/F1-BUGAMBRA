import { doc, runTransaction, getDoc, collection, getDocs, query, where, updateDoc } from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "./firebase";

export interface RaceResult {
  pilotoId: string;
  qualyPos: number; // 1-12
  racePos: number; // 1-12, or 99 object if DNF
  isDnfOwnError: boolean;
  isClean: boolean; // no sanciones
  overtakesBoost: boolean; // Adelantamientos (+2)
  isDotd: boolean; // Piloto del día
  isMvp: boolean; // MVP
  fastestLap: boolean;
}

const POINTS_SCALE = [16, 13, 11, 9, 8, 7, 6, 5, 4, 3, 2, 1];

export async function processRace(splitId: string, circuitoId: string, results: RaceResult[]) {
  try {
    await runTransaction(db, async (transaction) => {
      const circuitoRef = doc(db, `splits/${splitId}/circuitos`, circuitoId);
      const circuitDoc = await transaction.get(circuitoRef);
      const circuitData = circuitDoc.data();
      
      if (circuitData?.acta_cerrada) {
        throw new Error("El acta de esta carrera está CERRADA y no puede modificarse.");
      }

      // Fetch ALL teams and ALL pilots in this split to find participants
      const teamsSnap = await getDocs(collection(db, `splits/${splitId}/equipos`));
      const equiposData: Record<string, { ref: any, data: any, pilotos: Record<string, { ref: any, data: any }> }> = {};

      for (const eDoc of teamsSnap.docs) {
        const pSnap = await getDocs(collection(db, `splits/${splitId}/equipos/${eDoc.id}/pilotos`));
        const pMap: Record<string, any> = {};
        pSnap.docs.forEach(pDoc => {
          pMap[pDoc.id] = { ref: pDoc.ref, data: pDoc.data() };
        });

        equiposData[eDoc.id] = {
          ref: eDoc.ref,
          data: eDoc.data(),
          pilotos: pMap
        };
      }

      // 2. Calculate Stats
      const pilotUpdates: { ref: any, data: any }[] = [];
      const teamStats: Record<string, { 
        ref: any, 
        data: any, 
        puntosCarrera: number, 
        poles: number, 
        fastestLaps: number,
        isCleanGlobal: boolean
      }> = {};

      for (const res of results) {
        let teamId = "";
        let pilotEntry: any = null;

        for (const tid in equiposData) {
          if (equiposData[tid].pilotos[res.pilotoId]) {
            teamId = tid;
            pilotEntry = equiposData[tid].pilotos[res.pilotoId];
            break;
          }
        }

        if (!pilotEntry) continue; // Skip if pilot not in this split's rosters

        const pilot = pilotEntry.data;
        if (!teamStats[teamId]) {
          teamStats[teamId] = {
            ref: equiposData[teamId].ref,
            data: equiposData[teamId].data,
            puntosCarrera: 0,
            poles: 0,
            fastestLaps: 0,
            isCleanGlobal: true
          };
        }
        const team = teamStats[teamId];

        // Points
        const points = res.racePos >= 1 && res.racePos <= 12 ? POINTS_SCALE[res.racePos - 1] : 0;
        pilot.puntos_piloto = (pilot.puntos_piloto || 0) + points;
        team.puntosCarrera += points;

        // Stats
        if (res.racePos === 1) pilot.victorias = (pilot.victorias || 0) + 1;
        if (res.racePos >= 1 && res.racePos <= 3) pilot.podios = (pilot.podios || 0) + 1;
        if (res.qualyPos === 1) { 
          pilot.poles = (pilot.poles || 0) + 1;
          team.poles += 1;
        }
        if (res.racePos > 12 || res.isDnfOwnError) pilot.dnfs = (pilot.dnfs || 0) + 1;
        if (res.isClean) pilot.carreras_limpias = (pilot.carreras_limpias || 0) + 1;
        else team.isCleanGlobal = false;

        if (res.fastestLap) team.fastestLaps += 1;

        // Rating
        let rd = 0;
        if (res.qualyPos === 1) rd += 5;
        if (res.racePos === 1) rd += 5;
        if (res.isDnfOwnError) rd -= 3;
        if (res.isClean) rd += 2;
        
        pilot.rating_piloto = Math.max(0, Math.min(99, (pilot.rating_piloto || 70) + rd));
        pilotUpdates.push({ ref: pilotEntry.ref, data: pilot });
      }

      // 3. Apply
      for (const up of pilotUpdates) transaction.update(up.ref, up.data);
      for (const tid in teamStats) {
        const s = teamStats[tid];
        const money = 4 + (s.puntosCarrera * 0.1) + (s.poles * 2);
        s.data.presupuesto = (s.data.presupuesto || 0) + money;
        s.data.puntos_constructores = (s.data.puntos_constructores || 0) + s.puntosCarrera;
        transaction.update(s.ref, s.data);
      }

      transaction.update(circuitoRef, { completado: true, resultados: results });
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `splits/${splitId}/circuitos/${circuitoId}`);
  }
}
