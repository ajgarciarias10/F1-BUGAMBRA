import { doc, runTransaction, getDoc, collection, getDocs, query, where, updateDoc } from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "./firebase";
import { buildActiveStatusGroups } from "../utils/rivalrySummary";

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

      // Build a quick map of results by pilotoId for rivalry calculations
      const resultMap: Record<string, RaceResult> = {};
      results.forEach(r => { resultMap[r.pilotoId] = r; });

      const splitPayload = {
        id: splitId,
        equipos: Object.entries(equiposData).map(([teamId, team]) => ({
          id: teamId,
          nombre: team.data?.nombre,
          pilotos: Object.entries(team.pilotos || {}).map(([pid, pilot]) => ({ id: pid, ...pilot.data }))
        }))
      };

      const activeStatusGroups = buildActiveStatusGroups(splitId, splitPayload, results);

      // Compute rivalry payouts per team for this single event (qualy + race)
      const rivalryPayouts: Record<string, number> = {};
      for (const key in activeStatusGroups) {
        const group = activeStatusGroups[key];
        const size = group.length;
        if (size === 1) {
          // Solo pilot that raced: fixed 1.5M for this race
          const m = group[0];
          rivalryPayouts[m.teamId] = (rivalryPayouts[m.teamId] || 0) + 1.5;
        } else {
          // Sort by qualifying and race positions among group members
          const qualySorted = [...group].sort((a, b) => {
            const qa = resultMap[a.pilotoId]?.qualyPos ?? 999;
            const qb = resultMap[b.pilotoId]?.qualyPos ?? 999;
            return qa - qb;
          });
          const raceSorted = [...group].sort((a, b) => {
            const ra = resultMap[a.pilotoId]?.racePos ?? 999;
            const rb = resultMap[b.pilotoId]?.racePos ?? 999;
            return ra - rb;
          });

          if (size >= 3) {
            // Qualy: 1M, 0.5M, 0M
            const qPayouts = [1, 0.5, 0];
            for (let i = 0; i < 3; i++) {
              const member = qualySorted[i];
              if (!member) break;
              rivalryPayouts[member.teamId] = (rivalryPayouts[member.teamId] || 0) + qPayouts[i];
            }
            // Race: 2M, 1M, 0M
            const rPayouts = [2, 1, 0];
            for (let i = 0; i < 3; i++) {
              const member = raceSorted[i];
              if (!member) break;
              rivalryPayouts[member.teamId] = (rivalryPayouts[member.teamId] || 0) + rPayouts[i];
            }
          } else if (size === 2) {
            // Two-person rivalry: Qualy winner +1M, Race winner +2M
            const qWinner = qualySorted[0];
            if (qWinner) rivalryPayouts[qWinner.teamId] = (rivalryPayouts[qWinner.teamId] || 0) + 1;
            const rWinner = raceSorted[0];
            if (rWinner) rivalryPayouts[rWinner.teamId] = (rivalryPayouts[rWinner.teamId] || 0) + 2;
          }
        }
      }

      const rivalrySummary = {
        pagosPorEquipo: rivalryPayouts,
        grupos: Object.entries(activeStatusGroups).map(([statusKey, group]) => ({
          status: statusKey,
          size: group.length,
          pilotos: group.map(m => ({
            pilotoId: m.pilotoId,
            nombre: m.data?.nombre || m.pilotoId,
            equipoId: m.teamId
          }))
        }))
      };

      // Build rival info map for each pilot who raced: list of rivals and their weaknesses
      const rivalInfoMap: Record<string, Array<{ pilotoId: string; nombre: string; equipoId: string; debilidades: string[] }>> = {};
      for (const key in activeStatusGroups) {
        const group = activeStatusGroups[key];
        for (const member of group) {
          const rivals = group.filter(m => m.pilotoId !== member.pilotoId);
          rivalInfoMap[member.pilotoId] = rivalInfoMap[member.pilotoId] || [];
          for (const r of rivals) {
            const rResult = resultMap[r.pilotoId];
            const debilidades: string[] = [];
            if (rResult) {
              if ((rResult.qualyPos ?? 999) <= 3 && (rResult.racePos ?? 999) > (rResult.qualyPos ?? 999)) debilidades.push('baja_consistencia_en_carrera');
              if (rResult.isDnfOwnError) debilidades.push('propenso_a_dnf_por_error');
              if (!rResult.isClean) debilidades.push('propenso_a_sanciones');
              if (!rResult.overtakesBoost) debilidades.push('poca_capacidad_adelantar');
              if ((rResult.racePos ?? 999) > 12) debilidades.push('posicion_baja_o_retiro');
            }

            rivalInfoMap[member.pilotoId].push({
              pilotoId: r.pilotoId,
              nombre: r.data?.nombre || r.pilotoId,
              equipoId: r.teamId,
              debilidades
            });
          }
        }
      }

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
        const points = (res.racePos >= 1 && res.racePos <= 12 ? POINTS_SCALE[res.racePos - 1] : 0) + (res.qualyPos === 1 ? 2 : 0);
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
        // Attach rival list and weaknesses for UI display
        pilot.rivalidades = rivalInfoMap[res.pilotoId] || [];
        pilotUpdates.push({ ref: pilotEntry.ref, data: pilot });
      }

      // 3. Apply
      if (splitId !== "split_1") {
        for (const up of pilotUpdates) transaction.update(up.ref, up.data);
        for (const tid in teamStats) {
          const s = teamStats[tid];
          const participationBonus = 4;
          const pointsBonus = s.puntosCarrera * 0.1;
          const poleBonus = s.poles * 2;
          const fastestLapBonus = s.fastestLaps * 1;
          const cleanBonus = s.isCleanGlobal ? 3 : 0;
          const money = participationBonus + pointsBonus + poleBonus + fastestLapBonus + cleanBonus;
          const rivalry = rivalryPayouts[tid] || 0;

          s.data.presupuesto = (s.data.presupuesto || 0) + money + rivalry;
          s.data.puntos_constructores = (s.data.puntos_constructores || 0) + s.puntosCarrera;
          transaction.update(s.ref, s.data);
        }
      }

      transaction.update(circuitoRef, {
        completado: true,
        resultados: results,
        resumen_pagos_rivalidad: rivalrySummary
      });
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `splits/${splitId}/circuitos/${circuitoId}`);
  }
}
