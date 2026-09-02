import {
  doc, collection, getDocs, runTransaction, writeBatch,
} from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "./firebase";
import { POINTS_BY_POSITION } from "./economyService";
import { evolucionOVRSplit, mediaPuntosCarrera, OVR_DEBUT } from "../utils/splitResolver";
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

    await runTransaction(db, async (tx) => {
      // ── Lecturas ────────────────────────────────────────────────────────────

      const circuitDoc = await tx.get(circuitoRef);
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
      const performanceScore = (result: RaceResult) => result.puntos != null
        ? Number(result.puntos)
        : (result.racePos >= 1 && result.racePos <= 12 ? POINTS_SCALE[result.racePos - 1] : 0) + (result.qualyPos === 1 ? 2 : 0);
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

      const equipoData: Record<string, { presupuesto: number; puntos_constructores: number }> = {};
      equiposSnap.docs.forEach((d, i) => {
        equipoData[d.id] = equipoTxDocs[i].data() as any ?? { presupuesto: 100, puntos_constructores: 0 };
      });

      // Contribución anterior de esta carrera por piloto (para restarla en correcciones)
      type StatDelta = { pts: number; victorias: number; podios: number; poles: number; dnfs: number; limpias: number };
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
        const pts =
          (previous.racePos >= 1 && previous.racePos <= 12 ? POINTS_SCALE[previous.racePos - 1] : 0) +
          (previous.qualyPos === 1 ? 2 : 0);
        if (teamId) oldTeamPoints[teamId] = (oldTeamPoints[teamId] ?? 0) + pts;
      }

      for (const pilotoId of new Set([...Object.keys(oldDelta), ...resultsByPilot.keys()])) {
        const res = resultsByPilot.get(pilotoId);
        const roster = rosterData[pilotoId];
        if (!roster) continue;

        const pts = res ?
          (res.racePos >= 1 && res.racePos <= 12 ? POINTS_SCALE[res.racePos - 1] : 0) +
          (res.qualyPos === 1 ? 2 : 0) : 0;

        const old = oldDelta[pilotoId] ?? { pts: 0, victorias: 0, podios: 0, poles: 0, dnfs: 0, limpias: 0, rd: 0 };
        const prev = rosterUpdates[pilotoId] ?? { ...roster };
        rosterUpdates[pilotoId] = {
          ...prev,
          puntos_piloto:    Math.max(0, (prev.puntos_piloto    ?? 0) - old.pts       + pts),
          victorias:        Math.max(0, (prev.victorias        ?? 0) - old.victorias + (res?.racePos === 1 ? 1 : 0)),
          podios:           Math.max(0, (prev.podios           ?? 0) - old.podios    + (res && res.racePos <= 3 && res.racePos >= 1 ? 1 : 0)),
          poles:            Math.max(0, (prev.poles            ?? 0) - old.poles     + (res?.qualyPos === 1 ? 1 : 0)),
          dnfs:             Math.max(0, (prev.dnfs             ?? 0) - old.dnfs      + (res && (res.racePos > 12 || res.isDnfOwnError) ? 1 : 0)),
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
      for (const teamId of new Set([...Object.keys(oldTeamPoints), ...Object.keys(newTeamPoints)])) {
        if (!equipoRefMap[teamId]) continue;
        const current = equipoData[teamId];
        tx.update(equipoRefMap[teamId], {
          puntos_constructores: Math.max(0, (current.puntos_constructores ?? 0) - (oldTeamPoints[teamId] ?? 0) + (newTeamPoints[teamId] ?? 0)),
        });
      }

      tx.update(circuitoRef, { completado: true, resultados: enrichedResults });
    });

    // El OVR se replega desde rating_base con el bloque entero, así que tiene que
    // esperar a que la carrera esté escrita. Si falla, los puntos ya están salvados:
    // el rating se puede rehacer luego desde el panel.
    await recalcSplitRatings(splitId);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `splits/${splitId}/circuitos/${circuitoId}`);
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

const puntosDelResultado = (res: RaceResult) => res.puntos != null
  ? Number(res.puntos)
  : (res.racePos >= 1 && res.racePos <= 12 ? POINTS_SCALE[res.racePos - 1] : 0) + (res.qualyPos === 1 ? 2 : 0);

// Las carreras del split con la media de puntos de cada una, que es la referencia contra la
// que se mide a cada piloto. Origins solo guarda puntos por carrera: sin posición ni pole no
// hay bonus que aplicar, y el delta sale del ritmo, que es lo que la hoja registra.
async function leerBloque(splitId: string) {
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
        media: mediaPuntosCarrera(resultados.map(res => ({ puntos: puntosDelResultado(res) }))),
        porPiloto: new Map(resultados.map(res => [res.pilotoId, res])),
      };
    });
}

function evolucionDePiloto(pilotId: string, base: number, bloque: Awaited<ReturnType<typeof leerBloque>>) {
  return evolucionOVRSplit(base, bloque.map(circuito => {
    const res = circuito.porPiloto.get(pilotId);
    return {
      id: circuito.id,
      nombre: circuito.nombre,
      media: circuito.media,
      // Sin resultado el piloto no corrió esa carrera: el rating se arrastra intacto.
      resultado: res
        ? { puntos: puntosDelResultado(res), racePos: res.racePos, qualyPos: res.qualyPos, dnf: res.racePos > 12 || !!res.isDnfOwnError }
        : null,
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

    if (completed.length === 0) {
      // Sin carreras completadas no hay nada que recalcular: el rating se conserva tal cual.
      return { ok: 0, notFound: [], message: `Sin circuitos completados en ${splitId}. No hay nada que recalcular.` };
    }

    const notFound: string[] = [];
    const teamPts: Record<string, number> = {};

    for (const circ of completed) {
      for (const res of circ.resultados as RaceResult[]) {
        const pts = res.puntos != null
          ? Number(res.puntos)
          : (res.racePos >= 1 && res.racePos <= 12 ? POINTS_SCALE[res.racePos - 1] : 0) + (res.qualyPos === 1 ? 2 : 0);
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
        if (res.racePos > 12 || res.isDnfOwnError) acc.dnfs++;
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
