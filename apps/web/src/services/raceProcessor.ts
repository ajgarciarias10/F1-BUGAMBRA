import {
  doc, collection, getDocs, getDoc, runTransaction, writeBatch, updateDoc, serverTimestamp,
} from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "./firebase";
import { auth } from "./auth";
import { revertirEconomiaCarrera } from "./economyService";
import { economyRules, pointsForRaceResult } from "../utils/economyRules";
import { evolucionOVRSplit, mediaPuntosCarrera, OVR_DEBUT } from "../utils/splitResolver";
import { raceRatingFailureMessage, RaceRatingRecalculationError } from "../utils/racePostProcessing";
import { buildHistoricalRaceCorrectionPlan } from "../utils/historicalRaceCorrectionPlan";
import { getPilotDayCandidates, pilotDayCloseError, pilotDayOpenError, pilotDayVoteError } from "../utils/pilotDayVoting";
import type { RaceResult, RosterEntry } from "../types";


// ─── PROCESAR CARRERA ─────────────────────────────────────────────────────────

export type { RaceResult };

export async function processRace(
  splitId: string,
  circuitoId: string,
  results: RaceResult[]
) {
  try {
    // The correction must not leave already liquidated later races based on stale results.
    // Read their current values in the same transaction that replaces the target result.
    const calendarSnap = await getDocs(collection(db, `splits/${splitId}/circuitos`));
    const calendarRefs = calendarSnap.docs.map(snapshot => snapshot.ref);

    // Leer equipos y sus pilotos anidados para construir índices
    const equiposSnap = await getDocs(collection(db, `splits/${splitId}/equipos`));

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
    const splitRef = doc(db, "splits", splitId);
    const auditRef = doc(collection(db, "admin_audit"));

    await runTransaction(db, async (tx) => {
      // ── Lecturas ────────────────────────────────────────────────────────────

      const [circuitDoc, splitDoc, calendarDocs] = await Promise.all([
        tx.get(circuitoRef),
        tx.get(splitRef),
        Promise.all(calendarRefs.map(ref => tx.get(ref))),
      ]);
      if (!splitDoc.exists()) throw new Error("El split ya no existe.");
      const scoringRules = economyRules(splitDoc.data()?.economia_config);
      const correctionPlan = buildHistoricalRaceCorrectionPlan(
        calendarDocs.filter(snapshot => snapshot.exists()).map(snapshot => ({
          id: snapshot.id,
          numero_carrera: Number(snapshot.data()?.numero_carrera ?? Number.MAX_SAFE_INTEGER),
          economia_procesada: snapshot.data()?.economia_procesada === true,
          nombre: snapshot.data()?.nombre,
        })),
        circuitoId,
      );
      if (correctionPlan?.laterProcessedNewestFirst.length) {
        const laterNames = correctionPlan.laterProcessedNewestFirst
          .map(race => race.nombre || race.id)
          .join(", ");
        throw new Error(`No se pueden guardar estos resultados mientras haya economías posteriores procesadas (${laterNames}). Revierte esas carreras de más nueva a más antigua y vuelve a intentarlo.`);
      }
      if (circuitDoc.data()?.acta_cerrada) {
        throw new Error("El acta de esta carrera está CERRADA y no puede modificarse.");
      }
      if (circuitDoc.data()?.economia_procesada) {
        throw new Error("La economía de esta carrera ya fue aplicada. Debes revertirla antes de corregir resultados.");
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

      const raceSequence = Number(circuitDoc.data()?.numero_carrera ?? 1);
      const submittedPilots = new Set<string>();
      for (const result of results) {
        if (submittedPilots.has(result.pilotoId)) {
          throw new Error(`El piloto ${result.pilotoId} aparece más de una vez en los resultados.`);
        }
        submittedPilots.add(result.pilotoId);
        const roster = rosterData[result.pilotoId];
        if (!roster) throw new Error(`El piloto ${result.pilotoId} no pertenece al roster del split.`);
        const startsAt = Number(roster.participa_desde ?? 1);
        const endsAt = roster.participa_hasta == null ? null : Number(roster.participa_hasta);
        if (raceSequence < startsAt || (endsAt != null && raceSequence > endsAt)) {
          throw new Error(`El piloto ${result.pilotoId} no participa en la carrera ${raceSequence}.`);
        }
      }

      const previousResultsByPilot = new Map(prevResults.map(result => [result.pilotoId, result]));
      const performanceScore = (result: RaceResult) => pointsForRaceResult(result, scoringRules);
      const bestPerformance = [...results].sort((a, b) => {
        const validRacePositions = a.racePos >= 1 && a.racePos <= 12 && b.racePos >= 1 && b.racePos <= 12;
        return validRacePositions
          ? a.racePos - b.racePos || performanceScore(b) - performanceScore(a)
          : performanceScore(b) - performanceScore(a);
      })[0];
      const enrichedResults: RaceResult[] = results.map(result => ({
        ...result,
        puntos: performanceScore(result),
        isDotd: result.pilotoId === bestPerformance?.pilotoId,
        // A correction must not move historical constructor points after a transfer.
        equipoId: previousResultsByPilot.get(result.pilotoId)?.equipoId ?? pilotEquipoMap[result.pilotoId],
      }));

      const equipoData: Record<string, { puntos_constructores: number }> = {};
      equiposSnap.docs.forEach((d, i) => {
        const teamData = equipoTxDocs[i].data();
        if (!equipoTxDocs[i].exists() || !teamData) {
          throw new Error(`La escudería ${d.id} ya no existe. No se guardaron los resultados.`);
        }
        equipoData[d.id] = {
          puntos_constructores: Number.isFinite(Number(teamData.puntos_constructores))
            ? Number(teamData.puntos_constructores)
            : 0,
        };
      });

      for (const result of enrichedResults) {
        if (!result.equipoId || !equipoData[result.equipoId]) {
          throw new Error(`No se encontró la escudería de ${result.pilotoId}. No se guardaron los resultados.`);
        }
      }

      // Contribución anterior de esta carrera por piloto (para restarla en correcciones)
      type StatDelta = { pts: number; victorias: number; podios: number; poles: number; dnfs: number; limpias: number };
      const oldDelta: Record<string, StatDelta> = {};
      if (isCorrection) {
        for (const res of prevResults) {
          const pts = performanceScore(res);
          oldDelta[res.pilotoId] = {
            pts,
            victorias: res.racePos === 1 ? 1 : 0,
            podios:    res.racePos >= 1 && res.racePos <= 3 ? 1 : 0,
            poles:     res.qualyPos === 1 ? 1 : 0,
            dnfs:      res.isDnf === true ? 1 : 0,
            limpias:   res.isClean ? 1 : 0,
          };
        }
      }

      // ── Cálculos ────────────────────────────────────────────────────────────

      const rosterUpdates: Record<string, Partial<RosterEntry>> = {};
      const oldTeamPoints: Record<string, number> = {};
      const newTeamPoints: Record<string, number> = {};
      const resultsByPilot = new Map(enrichedResults.map(result => [result.pilotoId, result]));

      for (const previous of prevResults) {
        const teamId = previous.equipoId ?? pilotEquipoMap[previous.pilotoId];
        const pts = performanceScore(previous);
        if (teamId) oldTeamPoints[teamId] = (oldTeamPoints[teamId] ?? 0) + pts;
      }

      for (const pilotoId of new Set([...Object.keys(oldDelta), ...resultsByPilot.keys()])) {
        const res = resultsByPilot.get(pilotoId);
        const roster = rosterData[pilotoId];
        if (!roster) continue;

        const pts = res ? performanceScore(res) : 0;

        const old = oldDelta[pilotoId] ?? { pts: 0, victorias: 0, podios: 0, poles: 0, dnfs: 0, limpias: 0, rd: 0 };
        const prev = rosterUpdates[pilotoId] ?? { ...roster };
        rosterUpdates[pilotoId] = {
          ...prev,
          puntos_piloto:    Math.max(0, (prev.puntos_piloto    ?? 0) - old.pts       + pts),
          victorias:        Math.max(0, (prev.victorias        ?? 0) - old.victorias + (res?.racePos === 1 ? 1 : 0)),
          podios:           Math.max(0, (prev.podios           ?? 0) - old.podios    + (res && res.racePos <= 3 && res.racePos >= 1 ? 1 : 0)),
          poles:            Math.max(0, (prev.poles            ?? 0) - old.poles     + (res?.qualyPos === 1 ? 1 : 0)),
          dnfs:             Math.max(0, (prev.dnfs             ?? 0) - old.dnfs      + (res?.isDnf === true ? 1 : 0)),
          carreras_limpias: Math.max(0, (prev.carreras_limpias ?? 0) - old.limpias   + (res?.isClean ? 1 : 0)),
        };

        if (res?.equipoId) newTeamPoints[res.equipoId] = (newTeamPoints[res.equipoId] ?? 0) + pts;
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

      // La economía se aplica por separado al cerrar el acta; aquí solo se corrigen puntos.
      const changedTeamIds = [...new Set([...Object.keys(oldTeamPoints), ...Object.keys(newTeamPoints)])]
        .filter(teamId => equipoRefMap[teamId]);
      for (const teamId of changedTeamIds) {
        const current = equipoData[teamId];
        tx.update(equipoRefMap[teamId], {
          puntos_constructores: Math.max(0, (current.puntos_constructores ?? 0) - (oldTeamPoints[teamId] ?? 0) + (newTeamPoints[teamId] ?? 0)),
        });
      }

      tx.update(circuitoRef, { completado: true, resultados: enrichedResults });
      const pilotStats = ["puntos_piloto", "victorias", "podios", "poles", "dnfs", "carreras_limpias"] as const;
      const changedPilots = Object.entries(rosterUpdates).map(([pilotoId, after]) => ({
        pilotoId,
        before: Object.fromEntries(pilotStats.map(field => [field, rosterData[pilotoId][field] ?? 0])),
        after: Object.fromEntries(pilotStats.map(field => [field, after[field] ?? 0])),
      }));
      const changedTeams = changedTeamIds.map(equipoId => ({
        equipoId,
        before: Number(equipoData[equipoId]?.puntos_constructores ?? 0),
        after: Math.max(0,
          Number(equipoData[equipoId]?.puntos_constructores ?? 0)
          - (oldTeamPoints[equipoId] ?? 0)
          + (newTeamPoints[equipoId] ?? 0)),
      }));
      tx.set(auditRef, {
        action: isCorrection ? "race_results_corrected" : "race_results_saved",
        summary: `${isCorrection ? "Corrección" : "Guardado"} de resultados: ${circuitDoc.data()?.nombre || circuitoId}`,
        splitId,
        circuitoId,
        target: circuitoRef.path,
        actorUid: auth.currentUser?.uid ?? null,
        createdAt: serverTimestamp(),
        before: {
          resultados: prevResults,
          pilotos: changedPilots.map(({ pilotoId, before }) => ({ pilotoId, stats: before })),
          constructores: changedTeams.map(({ equipoId, before }) => ({ equipoId, puntos: before })),
        },
        after: {
          resultados: enrichedResults,
          pilotos: changedPilots.map(({ pilotoId, after }) => ({ pilotoId, stats: after })),
          constructores: changedTeams.map(({ equipoId, after }) => ({ equipoId, puntos: after })),
        },
      });
    });

    // El OVR se replega desde rating_base con el bloque entero, así que tiene que
    // esperar a que la carrera esté escrita. Si falla, los puntos ya están salvados:
    // el rating se puede rehacer luego desde el panel.
    const ratingResult = await recalcSplitRatings(splitId);
    const ratingFailure = raceRatingFailureMessage(splitId, ratingResult.message);
    if (ratingFailure) throw new RaceRatingRecalculationError(ratingFailure);
  } catch (error) {
    if (error instanceof RaceRatingRecalculationError) throw error;
    handleFirestoreError(error, OperationType.UPDATE, `splits/${splitId}/circuitos/${circuitoId}`);
  }
}

// ─── PILOTO DEL DÍA ───────────────────────────────────────────────────────────
// Vota cualquier cuenta de la liga, un voto por persona. El recuento se guarda como un
// mapa uid → pilotoId (no arrays por candidato): cambiar de voto es sobreescribir la
// propia entrada, y el dedupe es automático porque solo puede haber una por uid.

export async function votarPilotoDelDia(
  splitId: string,
  circuitoId: string,
  uid: string,
  pilotoId: string,
): Promise<{ ok: boolean; message: string }> {
  try {
    const registeredUid = auth.currentUser?.uid;
    if (!registeredUid || registeredUid !== uid) return { ok: false, message: "Debes votar con tu cuenta registrada." };
    const circuitoRef = doc(db, `splits/${splitId}/circuitos`, circuitoId);
    const snap = await getDoc(circuitoRef);
    if (!snap.exists()) return { ok: false, message: "Circuito no encontrado." };
    const data = snap.data() as any;
    const validationError = pilotDayVoteError({ registeredUid, requestedUid: uid, completed: data.completado, open: data.piloto_dia_abierta, closed: data.piloto_dia_cerrado, candidates: data.piloto_dia_candidatos || getPilotDayCandidates(data.resultados), pilotId: pilotoId });
    if (validationError) return { ok: false, message: validationError };

    await updateDoc(circuitoRef, { [`piloto_dia_votantes.${uid}`]: pilotoId });
    return { ok: true, message: "Voto registrado." };
  } catch (error: any) {
    return { ok: false, message: `Error al votar: ${error.message}` };
  }
}

/** Abre una votación histórica y deja una auditoría inmutable de quién y cuándo la abrió. */
export async function abrirVotacionPilotoDelDia(
  splitId: string,
  circuitoId: string,
): Promise<{ ok: boolean; message: string }> {
  try {
    const actorUid = auth.currentUser?.uid;
    if (!actorUid) return { ok: false, message: "Inicia sesión como administrador." };
    const circuitoRef = doc(db, `splits/${splitId}/circuitos`, circuitoId);
    const auditRef = doc(collection(circuitoRef, "votacion_audit"));
    await runTransaction(db, async transaction => {
      const snap = await transaction.get(circuitoRef);
      if (!snap.exists()) throw new Error("Circuito no encontrado.");
      const data = snap.data();
      const candidatos = getPilotDayCandidates(data.resultados);
      const validationError = pilotDayOpenError({ completed: data.completado, closed: data.piloto_dia_cerrado, open: data.piloto_dia_abierta, candidates: candidatos });
      if (validationError) throw new Error(validationError);
      transaction.update(circuitoRef, {
        piloto_dia_abierta: true,
        piloto_dia_abierta_por: actorUid,
        piloto_dia_abierta_en: serverTimestamp(),
        piloto_dia_candidatos: candidatos,
      });
      transaction.set(auditRef, {
        accion: "abierta",
        actorUid,
        estadoAnterior: data.piloto_dia_abierta === true,
        estadoNuevo: true,
        fecha: serverTimestamp(),
      });
    });
    return { ok: true, message: "Votación abierta para las cuentas registradas." };
  } catch (error: any) {
    return { ok: false, message: error.message || "No se pudo abrir la votación." };
  }
}

// Recuento y cierre a cargo del admin. Propone el más votado (con la primera posición del
// desempate por id) pero deja fijar el ganador a mano, por si hace falta corregirlo.
export async function cerrarVotacionPilotoDelDia(
  splitId: string,
  circuitoId: string,
  pilotoIdGanador: string,
): Promise<{ ok: boolean; message: string }> {
  try {
    const actorUid = auth.currentUser?.uid;
    if (!actorUid) return { ok: false, message: "Inicia sesión como administrador." };
    const circuitoRef = doc(db, `splits/${splitId}/circuitos`, circuitoId);
    const auditRef = doc(collection(circuitoRef, "votacion_audit"));
    await runTransaction(db, async transaction => {
      const snap = await transaction.get(circuitoRef);
      if (!snap.exists()) throw new Error("Circuito no encontrado.");
      const data = snap.data();
      const validationError = pilotDayCloseError({ open: data.piloto_dia_abierta, closed: data.piloto_dia_cerrado, candidates: data.piloto_dia_candidatos || getPilotDayCandidates(data.resultados), winnerId: pilotoIdGanador });
      if (validationError) throw new Error(validationError);
      transaction.update(circuitoRef, {
        piloto_dia_abierta: false,
        piloto_dia_cerrado: true,
        piloto_dia_ganador: pilotoIdGanador,
        piloto_dia_cerrada_por: actorUid,
        piloto_dia_cerrada_en: serverTimestamp(),
      });
      transaction.set(auditRef, {
        accion: "cerrada",
        actorUid,
        estadoAnterior: { abierta: true, cerrada: false },
        estadoNuevo: { abierta: false, cerrada: true, ganadorPilotoId: pilotoIdGanador },
        fecha: serverTimestamp(),
      });
    });
    return { ok: true, message: "Piloto del día fijado. El bonus se aplicará en la siguiente carrera." };
  } catch (error: any) {
    return { ok: false, message: `Error al cerrar la votación: ${error.message}` };
  }
}

// ─── RECALCULAR EL OVR ───────────────────────────────────────────────────────
// El overall es la carrera entera de un piloto, no la foto de un bloque. Empieza en 70 el
// día que debuta —que para unos es Origins y para otros un split posterior— y a partir de
// ahí cada carrera le suma su delta. El rating con el que cierra un split es la base del
// siguiente en el que aparezca, aunque se haya saltado alguno por medio.
//
// Siempre se replega desde el debut en vez de acumular sobre el valor guardado: corregir
// un acta vieja no deja el overall arrastrando el error y repetir el cálculo da lo mismo.

type FichaPiloto = { id: string; refs: any[]; data: any };

// Un piloto puede tener doc anidado bajo su equipo y doc plano en el roster del split (los
// importadores escriben los dos). Se escriben ambos para que no se desincronicen, y las
// temporadas individuales como Origins, que no tienen equipos, solo traen el plano.
async function leerPilotosDeSplit(splitId: string): Promise<FichaPiloto[]> {
  const porPiloto = new Map<string, FichaPiloto>();

  const anota = (id: string, ref: any, data: any) => {
    const ficha = porPiloto.get(id);
    if (ficha) { ficha.refs.push(ref); ficha.data = { ...data, ...ficha.data }; }
    else porPiloto.set(id, { id, refs: [ref], data });
  };

  const equiposSnap = await getDocs(collection(db, `splits/${splitId}/equipos`));
  for (const equipoDoc of equiposSnap.docs) {
    const pilotosSnap = await getDocs(collection(db, `splits/${splitId}/equipos/${equipoDoc.id}/pilotos`));
    pilotosSnap.docs.forEach(pd => anota(pd.id, pd.ref, pd.data()));
  }

  try {
    const flatSnap = await getDocs(collection(db, `splits/${splitId}/roster`));
    flatSnap.docs.forEach(pd => anota(pd.id, pd.ref, pd.data()));
  } catch {
    // Un split sin roster plano es lo normal en los de equipos.
  }

  return [...porPiloto.values()];
}

const puntosDelResultado = (res: RaceResult, scoringRules: ReturnType<typeof economyRules>) =>
  pointsForRaceResult(res, scoringRules);

// Las carreras del split con la media de puntos de cada una, que es la referencia contra la
// que se mide a cada piloto. Origins solo guarda puntos por carrera: sin posición ni pole no
// hay bonus que aplicar, y el delta sale del ritmo, que es lo que la hoja registra.
async function leerBloque(splitId: string) {
  const splitSnap = await getDoc(doc(db, "splits", splitId));
  const scoringRules = economyRules(splitSnap.data()?.economia_config);
  const circSnap = await getDocs(collection(db, `splits/${splitId}/circuitos`));
  return circSnap.docs
    .map(d => ({ id: d.id, ...(d.data() as any) }))
    .filter(c => c.completado && Array.isArray(c.resultados) && c.resultados.length > 0)
    .sort((a, b) => {
      if (a.numero_carrera && b.numero_carrera) return a.numero_carrera - b.numero_carrera;
      return a.id.localeCompare(b.id);
    })
    .map(circuito => {
      const resultados: RaceResult[] = circuito.resultados;
      return {
        id: circuito.id,
        nombre: circuito.nombre || circuito.id,
        scoringRules,
        media: mediaPuntosCarrera(resultados.map(res => ({ puntos: puntosDelResultado(res, scoringRules) }))),
        porPiloto: new Map(resultados.map(res => [res.pilotoId, res])),
        // Piloto del día ya cerrado en este circuito: su bonus se aplica en el SIGUIENTE.
        pilotoDiaGanador: circuito.piloto_dia_cerrado ? (circuito.piloto_dia_ganador ?? null) : null,
      };
    });
}

// El bonus del piloto del día es +2 de OVR de un solo uso: se aplica en la primera carrera
// después de ganarlo y no vuelve a contar, aunque se recalcule el split entero desde cero.
const BONUS_PILOTO_DEL_DIA = 2;

function evolucionDePiloto(pilotId: string, base: number, bloque: Awaited<ReturnType<typeof leerBloque>>) {
  return evolucionOVRSplit(base, bloque.map((circuito, indice) => {
    const res = circuito.porPiloto.get(pilotId);
    const anterior = indice > 0 ? bloque[indice - 1] : null;
    return {
      id: circuito.id,
      nombre: circuito.nombre,
      media: circuito.media,
      // Sin resultado el piloto no corrió esa carrera: el rating se arrastra intacto.
      resultado: res
        ? { puntos: puntosDelResultado(res, circuito.scoringRules), racePos: res.racePos, qualyPos: res.qualyPos, dnf: res.isDnf === true }
        : null,
      bonusOVR: anterior?.pilotoDiaGanador === pilotId ? BONUS_PILOTO_DEL_DIA : 0,
    };
  }));
}

function actualizacionDeRating(base: number, evolucion: ReturnType<typeof evolucionDePiloto>): Record<string, unknown> {
  return {
    rating_base:      Math.round(base * 100) / 100,
    rating_exacto:    Math.round(evolucion.ratingFinal * 100) / 100,
    rating_piloto:    Math.round(evolucion.ratingFinal),
    historial_rating: Object.fromEntries(evolucion.puntos.map(p => [p.circuitoId, {
      carrera: p.carrera, rating: Math.round(p.rating), rating_exacto: p.rating, delta: p.delta,
    }])),
  };
}

export async function recalcSplitRatings(
  splitId: string
): Promise<{ pilotos: number; message: string }> {
  try {
    const pilotos = await leerPilotosDeSplit(splitId);
    if (pilotos.length === 0) {
      return { pilotos: 0, message: `Sin pilotos en ${splitId}: no hay OVR que recalcular.` };
    }
    const bloque = await leerBloque(splitId);

    const batch = writeBatch(db);
    for (const piloto of pilotos) {
      // `rating_base` es el OVR con el que el piloto llegó al bloque, y no se toca: lo fija
      // el constructor de splits al heredarlo del anterior. Aquí solo se replega el bloque
      // desde él, así que repetir el cálculo da siempre lo mismo.
      const base = Number(piloto.data.rating_base) > 0
        ? Number(piloto.data.rating_base)
        : Number(piloto.data.rating_piloto) > 0 ? Number(piloto.data.rating_piloto) : OVR_DEBUT;

      const update = actualizacionDeRating(base, evolucionDePiloto(piloto.id, base, bloque));
      piloto.refs.forEach(ref => batch.update(ref, update));
    }

    await batch.commit();
    return {
      pilotos: pilotos.length,
      message: `OVR de ${splitId} recalculado: ${pilotos.length} pilotos sobre ${bloque.length} carrera(s).`,
    };
  } catch (error: any) {
    return { pilotos: 0, message: `Error recalculando OVR de ${splitId}: ${error.message}` };
  }
}

// ─── RECALCULAR PUNTOS DE UN SPLIT ───────────────────────────────────────────
// Sobreescribe stats y rating leyendo los resultados guardados desde cero.
// El rating arranca en rating_base y cada carrera acumula su delta de rendimiento.

export async function recalcSplitPoints(
  splitId: string
): Promise<{ ok: number; notFound: string[]; message: string }> {
  try {
    const splitSnap = await getDoc(doc(db, "splits", splitId));
    if (!splitSnap.exists()) throw new Error("El split ya no existe.");
    const scoringRules = economyRules(splitSnap.data()?.economia_config);
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
      poles: number; dnfs: number; carreras_limpias: number;
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
        };
      }
    }

    const equipoRefMap: Record<string, any> = {};
    equiposSnap.docs.forEach(d => { equipoRefMap[d.id] = d.ref; });

    // Sin carreras completadas, pilotAccum ya está a cero para todos: seguimos igual y el
    // batch de abajo escribe ese reset. Salir aquí antes se saltaba justo esa escritura, así
    // que deshacer la única carrera de un split dejaba los puntos viejos sin tocar.
    const notFound: string[] = [];
    const teamPts: Record<string, number> = {};

    for (const circ of completed) {
      for (const res of circ.resultados as RaceResult[]) {
        const pts = pointsForRaceResult(res, scoringRules);
        const teamId = res.equipoId ?? pilotTeamMap[res.pilotoId];
        if (teamId) teamPts[teamId] = (teamPts[teamId] ?? 0) + pts;

        const acc = pilotAccum[res.pilotoId];
        if (!acc) {
          if (!notFound.includes(res.pilotoId)) notFound.push(res.pilotoId);
          continue;
        }

        acc.puntos_piloto += pts;
        if (res.racePos === 1)  acc.victorias++;
        if (res.racePos <= 3 && res.racePos >= 1) acc.podios++;
        if (res.qualyPos === 1) acc.poles++;
        if (res.isDnf === true) acc.dnfs++;
        if (res.isClean) acc.carreras_limpias++;
      }
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
        });
        ok++;
      }
    }

    for (const [teamId, equipoRef] of Object.entries(equipoRefMap)) {
      batch.update(equipoRef, { puntos_constructores: teamPts[teamId] ?? 0 });
    }

    await batch.commit();

    // Las stats y el OVR salen de los mismos resultados: se rehacen juntos.
    const ratings = await recalcSplitRatings(splitId);

    const msg = `Recálculo ${splitId}: ${ok} pilotos actualizados. ${ratings.message}${notFound.length ? ` No encontrados: ${notFound.join(", ")}` : ""}`;
    return { ok, notFound, message: msg };
  } catch (error: any) {
    return { ok: 0, notFound: [], message: `Error recalculando ${splitId}: ${error.message}` };
  }
}

// ─── DESHACER UNA CARRERA POR COMPLETO ───────────────────────────────────────
// Para probar una carrera y poder tirarla atrás entera: economía (si se procesó), puntos,
// rating y el estado del acta. No hace falta rehacer a mano la resta de puntos/rating —
// basta con vaciar los resultados de este circuito y recalcSplitPoints los rehace desde
// cero a partir de lo que queda, exactamente igual que si esta carrera no se hubiera
// disputado.
export async function revertirCarreraCompleta(
  splitId: string,
  circuitoId: string,
): Promise<{ ok: boolean; message: string }> {
  try {
    const circuitoRef = doc(db, `splits/${splitId}/circuitos`, circuitoId);
    const snap = await getDoc(circuitoRef);
    if (!snap.exists()) return { ok: false, message: "Circuito no encontrado." };
    const data = snap.data() as any;

    const pasos: string[] = [];

    if (data.economia_procesada) {
      const economia = await revertirEconomiaCarrera(splitId, circuitoId);
      if (!economia.ok) return economia;
      pasos.push(economia.message);
    }

    await updateDoc(circuitoRef, { resultados: [], completado: false, acta_cerrada: false });
    pasos.push("Resultados y acta reiniciados.");

    const recalculo = await recalcSplitPoints(splitId);
    pasos.push(recalculo.message);

    return { ok: true, message: pasos.join(" ") };
  } catch (error: any) {
    return { ok: false, message: `Error al deshacer la carrera: ${error.message}` };
  }
}
