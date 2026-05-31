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

import { POINTS_BY_POSITION } from "./economyService";
const POINTS_SCALE = POINTS_BY_POSITION; // [16, 13, 11, 9, 7, 6, 5, 4, 3, 2, 2, 1]

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
        pilotUpdates.push({ ref: pilotEntry.ref, data: pilot });
      }

      // 3. Apply
      // SIEMPRE actualizamos los documentos de pilotos en todos los splits (puntos, rating, victorias, etc.)
      for (const up of pilotUpdates) {
        transaction.update(up.ref, up.data);
      }

      // Solo actualizamos presupuesto y puntos constructores de equipos a partir de Split 2
      if (splitId !== "split_1") {
        for (const tid in teamStats) {
          const s = teamStats[tid];
          const participationBonus = 4;
          const pointsBonus = s.puntosCarrera * 0.1;
          const poleBonus = s.poles * 2;
          const fastestLapBonus = s.fastestLaps * 1;
          const cleanBonus = s.isCleanGlobal ? 3 : 0;
          const money = participationBonus + pointsBonus + poleBonus + fastestLapBonus + cleanBonus;

          s.data.presupuesto = (s.data.presupuesto || 0) + money;
          s.data.puntos_constructores = (s.data.puntos_constructores || 0) + s.puntosCarrera;
          transaction.update(s.ref, s.data);
        }
      }

      transaction.update(circuitoRef, { completado: true, resultados: results });
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `splits/${splitId}/circuitos/${circuitoId}`);
  }
}

/**
 * Recalcula y persiste los puntos de todos los pilotos del Split 1
 * a partir de los resultados ya guardados en los circuitos completados.
 * 
 * Esta función se diseñó para ejecutarse UNA SOLA VEZ de forma automática
 * al montar el AdminDashboard, únicamente si detecta que los pilotos del
 * Split 1 tienen puntos_piloto === 0 pero existen circuitos completados.
 * 
 * No modifica presupuestos ni puntos constructores de equipos.
 */
export async function recalcSplit1PilotPoints(): Promise<{ migrated: boolean; message: string }> {
  try {
    const splitId = "split_1";

    // 1. Obtener todos los circuitos completados del Split 1
    const circuitosSnap = await getDocs(collection(db, `splits/${splitId}/circuitos`));
    const completedCircuitos = circuitosSnap.docs
      .map(d => ({ id: d.id, ...d.data() } as any))
      .filter(c => c.completado && Array.isArray(c.resultados) && c.resultados.length > 0);

    if (completedCircuitos.length === 0) {
      return { migrated: false, message: "No hay circuitos completados en Split 1." };
    }

    // 2. Obtener todos los equipos y pilotos del Split 1
    const teamsSnap = await getDocs(collection(db, `splits/${splitId}/equipos`));
    const equiposData: Record<string, { ref: any, data: any, pilotos: Record<string, { ref: any, data: any }> }> = {};

    for (const eDoc of teamsSnap.docs) {
      const pSnap = await getDocs(collection(db, `splits/${splitId}/equipos/${eDoc.id}/pilotos`));
      const pMap: Record<string, any> = {};
      pSnap.docs.forEach(pDoc => {
        pMap[pDoc.id] = { ref: pDoc.ref, data: pDoc.data() };
      });
      equiposData[eDoc.id] = { ref: eDoc.ref, data: eDoc.data(), pilotos: pMap };
    }

    // 3. Comprobar si ya tienen puntos (para no re-ejecutar innecesariamente)
    const allPilots = Object.values(equiposData).flatMap(eq => Object.values(eq.pilotos));
    const alreadyHasPoints = allPilots.some((p: any) => (p.data.puntos_piloto || 0) > 0);

    if (alreadyHasPoints) {
      return { migrated: false, message: "Los pilotos del Split 1 ya tienen puntos. Migración omitida." };
    }

    // 4. Acumular stats desde todos los resultados históricos
    const pilotAccum: Record<string, {
      ref: any,
      puntos_piloto: number,
      victorias: number,
      podios: number,
      poles: number,
      dnfs: number,
      carreras_limpias: number,
      rating_piloto: number,
    }> = {};

    // Inicializar acumuladores con datos actuales de cada piloto
    for (const tid in equiposData) {
      for (const pid in equiposData[tid].pilotos) {
        const pData = equiposData[tid].pilotos[pid].data;
        pilotAccum[pid] = {
          ref: equiposData[tid].pilotos[pid].ref,
          puntos_piloto: 0,
          victorias: 0,
          podios: 0,
          poles: 0,
          dnfs: 0,
          carreras_limpias: 0,
          rating_piloto: pData.rating_piloto || 70,
        };
      }
    }

    // Recorrer cada carrera completada y acumular
    for (const circuito of completedCircuitos) {
      for (const res of circuito.resultados as RaceResult[]) {
        const acc = pilotAccum[res.pilotoId];
        if (!acc) continue; // piloto no encontrado en rosters actuales

        const points =
          (res.racePos >= 1 && res.racePos <= 12 ? POINTS_SCALE[res.racePos - 1] : 0) +
          (res.qualyPos === 1 ? 2 : 0);

        acc.puntos_piloto += points;
        if (res.racePos === 1) acc.victorias += 1;
        if (res.racePos >= 1 && res.racePos <= 3) acc.podios += 1;
        if (res.qualyPos === 1) acc.poles += 1;
        if (res.racePos > 12 || res.isDnfOwnError) acc.dnfs += 1;
        if (res.isClean) acc.carreras_limpias += 1;

        // Rating delta
        let rd = 0;
        if (res.qualyPos === 1) rd += 5;
        if (res.racePos === 1) rd += 5;
        if (res.isDnfOwnError) rd -= 3;
        if (res.isClean) rd += 2;
        acc.rating_piloto = Math.max(0, Math.min(99, acc.rating_piloto + rd));
      }
    }

    // 5. Persistir en Firestore (fuera de transaction para mayor flexibilidad en migración)
    const writePromises: Promise<any>[] = [];
    for (const pid in pilotAccum) {
      const acc = pilotAccum[pid];
      writePromises.push(
        updateDoc(acc.ref, {
          puntos_piloto: acc.puntos_piloto,
          victorias: acc.victorias,
          podios: acc.podios,
          poles: acc.poles,
          dnfs: acc.dnfs,
          carreras_limpias: acc.carreras_limpias,
          rating_piloto: acc.rating_piloto,
        })
      );
    }

    await Promise.all(writePromises);

    return {
      migrated: true,
      message: `Migración completada: ${Object.keys(pilotAccum).length} pilotos actualizados desde ${completedCircuitos.length} carreras del Split 1.`,
    };
  } catch (error: any) {
    return { migrated: false, message: `Error en migración: ${error.message}` };
  }
}

/**
 * Hereda el rating_piloto final del split anterior (prevSplitId) a los documentos
 * del split actual (currentSplitId), SOLO para pilotos cuyo rating en el split actual
 * siga siendo 70 (el valor por defecto, señal de que no se heredó correctamente).
 *
 * Útil para corregir splits ya inicializados antes del fix de handleSyncSplitRosters.
 * Se ejecuta automáticamente al montar AdminDashboard si detecta el problema.
 */
export async function inheritRatingsFromPrevSplit(
  prevSplitId: string,
  currentSplitId: string
): Promise<{ fixed: number; message: string }> {
  try {
    // 1. Leer todos los equipos y pilotos del split anterior (fuente de verdad)
    const prevTeamsSnap = await getDocs(collection(db, `splits/${prevSplitId}/equipos`));

    // Construir mapa pilotoId → rating_piloto del split anterior
    const prevRatingMap: Record<string, number> = {};
    for (const teamDoc of prevTeamsSnap.docs) {
      const pilotsSnap = await getDocs(
        collection(db, `splits/${prevSplitId}/equipos/${teamDoc.id}/pilotos`)
      );
      for (const pDoc of pilotsSnap.docs) {
        const data = pDoc.data();
        const rating = data.rating_piloto;
        // Solo registrar si tiene un rating real (mayor que 70 o explícitamente guardado)
        if (typeof rating === "number") {
          prevRatingMap[pDoc.id] = rating;
        }
      }
    }

    if (Object.keys(prevRatingMap).length === 0) {
      return { fixed: 0, message: `No se encontraron pilotos en ${prevSplitId}.` };
    }

    // 2. Leer todos los pilotos del split actual
    const currentTeamsSnap = await getDocs(collection(db, `splits/${currentSplitId}/equipos`));

    const writePromises: Promise<any>[] = [];
    let fixedCount = 0;

    for (const teamDoc of currentTeamsSnap.docs) {
      const pilotsSnap = await getDocs(
        collection(db, `splits/${currentSplitId}/equipos/${teamDoc.id}/pilotos`)
      );
      for (const pDoc of pilotsSnap.docs) {
        const currentData = pDoc.data();
        const currentRating = currentData.rating_piloto ?? 70;
        const prevRating = prevRatingMap[pDoc.id];

        // Solo corregir si el rating actual es exactamente 70 (defecto)
        // y el split anterior tiene un rating diferente para este piloto
        if (currentRating === 70 && prevRating !== undefined && prevRating !== 70) {
          writePromises.push(
            updateDoc(pDoc.ref, { rating_piloto: prevRating })
          );
          fixedCount++;
        }
      }
    }

    if (writePromises.length === 0) {
      return {
        fixed: 0,
        message: `Todos los pilotos de ${currentSplitId} ya tienen rating heredado. Nada que corregir.`,
      };
    }

    await Promise.all(writePromises);

    return {
      fixed: fixedCount,
      message: `Ratings heredados: ${fixedCount} pilotos de ${currentSplitId} actualizados con el rating final de ${prevSplitId}.`,
    };
  } catch (error: any) {
    return { fixed: 0, message: `Error al heredar ratings: ${error.message}` };
  }
}

