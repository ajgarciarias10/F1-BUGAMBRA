import {
  doc, getDoc, getDocFromServer, collection, getDocs, updateDoc, addDoc, deleteDoc, setDoc,
  serverTimestamp, increment, writeBatch, runTransaction, deleteField, query, where,
} from "firebase/firestore";
import { db } from "./firebase";
import type { TipoTransaccion } from "../types";

// ─── CONSTANTES ECONÓMICAS ────────────────────────────────────────────────────

export const POINTS_BY_POSITION = [16, 13, 11, 9, 8, 7, 6, 5, 4, 3, 2, 1];

const MCLASIF  = [1, 0.5, 0];
const MCARRERA = [2, 1, 0];
const MCLASIF_DUO = [1, 0];
const MCARRERA_DUO = [2, 0];

export const M_POLE             = 2;
export const M_VUELTA_RAPIDA    = 1;
export const M_SIN_SANCIONADOS  = 3;
export const M_PARTICIPACION    = 4;
export const M_PUNTOS_FACTOR    = 0.1;
export const M_SOLO_POR_CARRERA = 1.5;
export const M_RIVALIDAD_CLASIF = 1;
export const M_RIVALIDAD_CARRERA = 2;

// El dinero de una cláusula se retira del sistema: la escudería que pierde al piloto no
// cobra nada. Confirmado contra los saldos de cierre del Split 2, donde Alfa Romero y Roses
// cuadran al decimal solo sin ese abono. En true se le pagaría al vendedor.
export const CLAUSULA_LA_COBRA_EL_VENDEDOR: boolean = false;

// ─── HELPERS ──────────────────────────────────────────────────────────────────

export function calcularMillonesClasificacion(pos: number): number {
  return MCLASIF[pos - 1] ?? 0;
}

export function calcularMillonesCarrera(pos: number): number {
  return MCARRERA[pos - 1] ?? 0;
}

export function calcularMillonesRivalidadClasificacion(pos: number, total: number): number {
  return (total === 2 ? MCLASIF_DUO : MCLASIF)[pos - 1] ?? 0;
}

export function calcularMillonesRivalidadCarrera(pos: number, total: number): number {
  return (total === 2 ? MCARRERA_DUO : MCARRERA)[pos - 1] ?? 0;
}

export function calcularPuntosPosicion(pos: number): number {
  return POINTS_BY_POSITION[pos - 1] ?? 0;
}

function r1(n: number): number {
  return Math.round(n * 10) / 10;
}

// ─── CURVA DE PRECIOS DEL BLOQUE ──────────────────────────────────────────────
// El Excel no aplica un recorte único al fichar: mantener y cláusula avanzan en pasos
// iguales carrera a carrera, y la cláusula aterriza justo en el precio de compra en la
// última del bloque. El mantener conserva la proporción con la que arrancó: ×1,5 en
// positivos (3p sobre 2p) y ×2/3 en negativos (p/3 sobre p/2), porque un precio negativo
// divide en vez de multiplicar.
//
//   Carlos   +61,5 → cláusula 123,0 · 110,7 · 98,4 · 86,1 · 73,8 · 61,5
//   Aparicio  −42  → cláusula −21,0 · −25,2 · −29,4 · −33,6 · −37,8 · −42,0
//                    mantener −14,0 · −16,8 · −19,6 · −22,4 · −25,2 · −28,0
//
// Las dos series se interpolan por separado: derivar el mantener de la cláusula ya
// redondeada mete saltos no monótonos en precios pequeños.

export const CARRERAS_POR_BLOQUE = 6;

export function mantenerInicialDe(precioCompra: number): number {
  return r1(precioCompra < 0 ? precioCompra / 3 : precioCompra * 3);
}

export function clausulaInicialDe(precioCompra: number): number {
  return r1(precioCompra < 0 ? precioCompra / 2 : precioCompra * 2);
}

// Precio vigente en la carrera `indiceCarrera` (0 = primera del bloque). Es función pura
// del precio de compra y del calendario, así que reprocesar una carrera da lo mismo.
export function precioPilotoEnCarrera(
  precioCompra: number,
  indiceCarrera: number,
  carrerasDelBloque: number = CARRERAS_POR_BLOQUE,
): { mantener: number; clausula: number } {
  const clausulaInicial = clausulaInicialDe(precioCompra);
  const mantenerInicial = mantenerInicialDe(precioCompra);
  if (clausulaInicial === 0) return { mantener: mantenerInicial, clausula: clausulaInicial };

  const tramos = Math.max(1, (carrerasDelBloque || CARRERAS_POR_BLOQUE) - 1);
  const indice = Math.max(0, Math.min(indiceCarrera, tramos));
  // La cláusula termina en el precio de compra; el mantener, en su proporción con ella.
  const mantenerFinal = precioCompra * (mantenerInicial / clausulaInicial);

  return {
    mantener: r1(mantenerInicial + ((mantenerFinal - mantenerInicial) / tramos) * indice),
    clausula: r1(clausulaInicial + ((precioCompra - clausulaInicial) / tramos) * indice),
  };
}

// Serie completa del bloque, para los cargadores que escriben un split ya disputado.
export function curvaPreciosBloque(
  precioCompra: number,
  carrerasDelBloque: number = CARRERAS_POR_BLOQUE,
): Array<{ mantener: number; clausula: number }> {
  return Array.from({ length: carrerasDelBloque }, (_, indice) =>
    precioPilotoEnCarrera(precioCompra, indice, carrerasDelBloque));
}

// ─── LOG DE TRANSACCIÓN ───────────────────────────────────────────────────────

type TransactionLog = {
  equipo: string;
  tipo: TipoTransaccion;
  piloto?: string;
  cantidad: number;
  esIngreso: boolean;
  carrera?: string;
  descripcion?: string;
  splitId?: string;
  circuitoId?: string;
};

function transactionPayload(data: TransactionLog) {
  return Object.fromEntries(
    Object.entries({ ...data, fecha: serverTimestamp() }).filter(([, v]) => v !== undefined)
  );
}

async function logTx(data: TransactionLog) {
  const payload = transactionPayload(data);
  await addDoc(collection(db, "transacciones"), payload);
}

// ─── HELPER: buscar doc anidado de un piloto en un split ─────────────────────

export async function findPilotEntry(
  splitId: string,
  pilotoId: string,
  equiposSnap?: Awaited<ReturnType<typeof getDocs>>
): Promise<{ ref: any; data: any; equipoId: string } | null> {
  const snap = equiposSnap ?? await getDocs(collection(db, `splits/${splitId}/equipos`));
  for (const equipoDoc of snap.docs) {
    const ref = doc(db, `splits/${splitId}/equipos/${equipoDoc.id}/pilotos`, pilotoId);
    const pd = await getDoc(ref);
    if (pd.exists()) {
      return { ref, data: pd.data(), equipoId: equipoDoc.id };
    }
  }
  return null;
}

// ─── FICHAJE DE PILOTO ────────────────────────────────────────────────────────

export async function ficharPiloto(params: {
  splitId: string;
  teamId: string;
  teamName: string;
  pilotoId: string;
  pilotName: string;
  tipo: "fichaje" | "clausula" | "subasta";
  precio: number;
}): Promise<{ success: boolean; message: string }> {
  const { splitId, teamId, teamName, pilotoId, pilotName, tipo, precio } = params;

  try {
    const esPrecioNegativo = precio < 0;
    const delta     = esPrecioNegativo ? Math.abs(precio) : -precio;
    const precioAbs = Math.abs(precio);
    // Un precio negativo divide en vez de multiplicar, conservando el signo (Excel T2/T3).
    const nuevaMantener = mantenerInicialDe(precio);
    const nuevaClausula = clausulaInicialDe(precio);

    const teamRef = doc(db, `splits/${splitId}/equipos`, teamId);

    // Buscar doc actual del piloto (puede estar en otro equipo)
    const current = await findPilotEntry(splitId, pilotoId);

    const priceFields = {
      equipoId:               teamId,
      precio_compra:          precio,
      mantener_actual:        nuevaMantener,
      clausula_actual:        nuevaClausula,
      mantener_inicial_split: nuevaMantener,
      clausula_inicial_split: nuevaClausula,
      precio_carrera_anterior: nuevaMantener,
      historial_precios:      {},
    };

    const newRef = doc(db, `splits/${splitId}/equipos/${teamId}/pilotos`, pilotoId);

    if (current && current.equipoId !== teamId) {
      // Mover de equipo: preservar datos existentes + actualizar precios
      await setDoc(newRef, { ...current.data, ...priceFields });
      await deleteDoc(current.ref);
    } else if (current) {
      // Mismo equipo: solo actualizar precios
      await updateDoc(current.ref, priceFields);
    } else {
      // Piloto sin doc en este split: crear con stats en 0
      await setDoc(newRef, {
        pilotoId,
        rating_piloto: 70,
        puntos_piloto: 0, victorias: 0, podios: 0,
        poles: 0, dnfs: 0, carreras_limpias: 0,
        ...priceFields,
      });
    }

    await updateDoc(teamRef, { presupuesto: increment(delta) });

    // Abono al vendedor, desactivado por regla de liga. Solo contaría si el piloto sale de
    // otro equipo: clausular a uno propio nunca mueve dinero entre escuderías.
    const equipoVendedorId = CLAUSULA_LA_COBRA_EL_VENDEDOR && tipo === "clausula" && current && current.equipoId !== teamId && current.equipoId !== "agente_libre"
      ? current.equipoId
      : null;
    let nombreVendedor = "";
    if (equipoVendedorId && !esPrecioNegativo) {
      const vendedorRef  = doc(db, `splits/${splitId}/equipos`, equipoVendedorId);
      const vendedorSnap = await getDoc(vendedorRef);
      nombreVendedor = vendedorSnap.data()?.nombre || equipoVendedorId;
      await updateDoc(vendedorRef, { presupuesto: increment(precioAbs) });
      await logTx({
        equipo:      nombreVendedor,
        tipo:        "clausula",
        piloto:      pilotName,
        cantidad:    precioAbs,
        esIngreso:   true,
        splitId,
        descripcion: `Cláusula cobrada: ${teamName} se lleva a ${pilotName} → +${precioAbs}M`,
      });
    }

    await logTx({
      equipo:      teamName,
      tipo:        esPrecioNegativo ? "piloto_negativo" : tipo,
      piloto:      pilotName,
      cantidad:    precioAbs,
      esIngreso:   esPrecioNegativo,
      splitId,
      descripcion: esPrecioNegativo
        ? `Piloto precio negativo — ingreso al fichar: +${precioAbs}M`
        : `${tipo.charAt(0).toUpperCase() + tipo.slice(1)}: −${precioAbs}M → mantener ${nuevaMantener}M / cláusula ${nuevaClausula}M`
          + (nombreVendedor ? ` · pagados a ${nombreVendedor}` : ""),
    });

    return {
      success: true,
      message: `${esPrecioNegativo ? "Ingreso" : "Gasto"}: ${delta >= 0 ? "+" : ""}${delta.toFixed(1)}M | Valoración: ${nuevaMantener}M / ${nuevaClausula}M`
        + (nombreVendedor ? ` | ${nombreVendedor} cobra +${precioAbs}M` : ""),
    };
  } catch (error: any) {
    return { success: false, message: `Error al fichar: ${error.message}` };
  }
}

// ─── ECONOMÍA DE CARRERA ──────────────────────────────────────────────────────

export async function procesarEconomiaCarrera(
  splitId: string,
  circuitoId: string,
  circuitName: string,
  onProgress?: (msg: string) => void,
  previousCircuitIds?: string[]
): Promise<{ processed: number; message: string }> {
  try {
    const circuitoRef  = doc(db, `splits/${splitId}/circuitos`, circuitoId);
    // Del servidor, no de la caché local persistente: la transacción de abajo siempre lee
    // del servidor, así que si esta primera lectura viniera de caché y aún no hubiera
    // sincronizado el último cambio (cerrar acta, corregir resultados...), las dos
    // lecturas no coincidirían nunca y el proceso fallaría siempre con "los resultados
    // cambiaron", aunque nadie los haya tocado de verdad.
    const circuitoSnap = await getDocFromServer(circuitoRef);
    if (!circuitoSnap.exists()) return { processed: 0, message: "Circuito no encontrado." };

    const circuitoData = circuitoSnap.data();
    if (circuitoData?.economia_procesada) {
      return { processed: 0, message: "La economía de este circuito ya fue procesada." };
    }
    if (!circuitoData?.acta_cerrada) {
      return { processed: 0, message: "Cierra el acta antes de procesar la economía." };
    }

    const resultados: any[] = circuitoData?.resultados || [];
    if (resultados.length === 0) {
      return { processed: 0, message: "No hay resultados registrados para procesar." };
    }
    if (resultados.filter(result => result.qualyPos === 1).length !== 1) {
      return { processed: 0, message: "La carrera debe tener exactamente una pole." };
    }
    if (resultados.filter(result => result.fastestLap === true).length !== 1) {
      return { processed: 0, message: "La carrera debe tener exactamente una vuelta rápida." };
    }
    if (resultados.some(result => typeof result.isClean !== "boolean")) {
      return { processed: 0, message: "Indica si todos los pilotos están limpios o sancionados." };
    }

    // Posición de la carrera en el calendario del bloque: la curva de precios es función
    // del índice, no del valor anterior, así que reprocesar no acumula errores.
    const calendarioSnap = await getDocs(collection(db, `splits/${splitId}/circuitos`));
    const calendario = calendarioSnap.docs
      .map(d => ({ id: d.id, orden: Number((d.data() as any).numero_carrera ?? 0), fecha: (d.data() as any).fecha }))
      .sort((a, b) => {
        if (a.orden && b.orden) return a.orden - b.orden;
        if (a.orden) return -1;
        if (b.orden) return 1;
        const fa = a.fecha?.toMillis?.() ?? 0, fb = b.fecha?.toMillis?.() ?? 0;
        return fa !== fb ? fa - fb : a.id.localeCompare(b.id);
      });
    const carrerasDelBloque = calendario.length || CARRERAS_POR_BLOQUE;
    const indiceEnCalendario = calendario.findIndex(c => c.id === circuitoId);
    const indiceCarrera = indiceEnCalendario >= 0 ? indiceEnCalendario : (previousCircuitIds?.length ?? 0);

    const equiposSnap = await getDocs(collection(db, `splits/${splitId}/equipos`));

    const pilotRefs: any[] = [];
    for (const equipoDoc of equiposSnap.docs) {
      const pilotosSubSnap = await getDocs(
        collection(db, `splits/${splitId}/equipos/${equipoDoc.id}/pilotos`)
      );
      pilotosSubSnap.docs.forEach(pd => pilotRefs.push(pd.ref));
    }

    const pilotosSnap = await getDocs(collection(db, "pilotos"));
    const pilotNombre: Record<string, string> = {};
    pilotosSnap.docs.forEach(d => { pilotNombre[d.id] = d.data().nombre || d.id; });

    const splitRef = doc(db, "splits", splitId);
    const result = await runTransaction(db, async transaction => {
      // Firestore requires every transaction read to complete before the first write.
      const [currentCircuit, currentSplit, teamDocs, pilotDocs] = await Promise.all([
        transaction.get(circuitoRef),
        transaction.get(splitRef),
        Promise.all(equiposSnap.docs.map(teamDoc => transaction.get(teamDoc.ref))),
        Promise.all(pilotRefs.map(ref => transaction.get(ref))),
      ]);

      if (currentCircuit.data()?.economia_procesada) {
        return { applied: false as const };
      }
      // Se calcula sobre la lectura fresca de la transacción, no sobre la de fuera: Firestore
      // no garantiza el mismo orden de claves entre una lectura normal y una de transacción,
      // así que comparar con JSON.stringify podía fallar aunque el dato fuera idéntico. Si
      // alguien corrigió los resultados de verdad entre medias, runTransaction ya reintenta
      // solo — es la garantía nativa de Firestore, no hace falta reimplementarla a mano.
      const resultadosTx: any[] = currentCircuit.data()?.resultados ?? [];

      const teamById: Record<string, { ref: any; nombre: string }> = {};
      teamDocs.forEach(teamDoc => {
        if (teamDoc.exists()) {
          teamById[teamDoc.id] = { ref: teamDoc.ref, nombre: teamDoc.data().nombre || teamDoc.id };
        }
      });

      const teamByPilot: Record<string, string> = {};
      const pilotDocData: Array<{ id: string; ref: any; data: any }> = [];
      pilotDocs.forEach(pilotDoc => {
        if (!pilotDoc.exists()) return;
        const d = pilotDoc.data() as any;
        const teamId = pilotDoc.ref.parent.parent?.id;
        if (teamId && d.equipoId && d.equipoId !== "agente_libre") {
          teamByPilot[pilotDoc.id] = teamId;
        }
        pilotDocData.push({ id: pilotDoc.id, ref: pilotDoc.ref, data: d });
      });

      const rivalries = currentSplit.data()?.rivalries;
      const soloPilotIds = new Set<string>((rivalries?.soloPilots || []).map((p: any) => p.id));
      const earnings: Record<string, number> = {};
      const txQueue: TransactionLog[] = [];

      const add = (
        teamId: string, amount: number,
        tipo: TipoTransaccion, piloto?: string, descripcion?: string
      ) => {
        earnings[teamId] = (earnings[teamId] || 0) + amount;
        txQueue.push({
          equipo: teamById[teamId]?.nombre ?? teamId,
          tipo, piloto, cantidad: amount, esIngreso: true,
          carrera: circuitName, descripcion,
        });
      };

      const dirtyTeams = new Set<string>();
      const participatingTeams = new Set<string>();
      for (const raceResult of resultadosTx) {
        const teamId = raceResult.equipoId ?? teamByPilot[raceResult.pilotoId];
        if (!teamId) continue;
        participatingTeams.add(teamId);
        if (!raceResult.isClean) dirtyTeams.add(teamId);
      }

      for (const raceResult of resultadosTx) {
        const teamId = raceResult.equipoId ?? teamByPilot[raceResult.pilotoId];
        if (!teamId) continue;

        const nombre = pilotNombre[raceResult.pilotoId] || raceResult.pilotoId;
        const isDNF = raceResult.racePos === 99;
        const ptsPos = isDNF ? 0 : calcularPuntosPosicion(raceResult.racePos);
        const ptsPole = raceResult.qualyPos === 1 ? 2 : 0;
        const totalPts = ptsPos + ptsPole;
        if (totalPts > 0) {
          const mPts = parseFloat((totalPts * M_PUNTOS_FACTOR).toFixed(2));
          add(teamId, mPts, "ingreso_puntos", nombre, `${totalPts} pts × ${M_PUNTOS_FACTOR}M = +${mPts}M`);
        }

        if (raceResult.qualyPos === 1) add(teamId, M_POLE, "pole", nombre, `Pole position: +${M_POLE}M`);
        if (raceResult.fastestLap) add(teamId, M_VUELTA_RAPIDA, "vuelta_rapida", nombre, `Vuelta rápida: +${M_VUELTA_RAPIDA}M`);
        if (soloPilotIds.has(raceResult.pilotoId)) {
          add(teamId, M_SOLO_POR_CARRERA, "rivalidad", nombre, `Piloto sin rival: +${M_SOLO_POR_CARRERA}M`);
        }
      }

      for (const group of rivalries?.groups || []) {
        if (group.type === "solo") continue;
        const members = group.members
          .map((member: any) => {
            const raceResult = resultadosTx.find((entry: any) => entry.pilotoId === member.id);
            const teamId = raceResult?.equipoId ?? teamByPilot[member.id];
            if (!raceResult || !teamId) return null;
            return {
              pilotoId: member.id,
              qualyPos: raceResult.qualyPos,
              racePos: raceResult.racePos,
              teamId,
              nombre: pilotNombre[member.id] || member.id,
            };
          })
          .filter(Boolean);

        if (members.length < 2) continue;
        [...members].sort((a: any, b: any) => a.qualyPos - b.qualyPos).forEach((member: any, index) => {
          const prize = calcularMillonesRivalidadClasificacion(index + 1, members.length);
          if (prize > 0) add(member.teamId, prize, "rivalidad", member.nombre, `Rivalidad clasificación P${index + 1}: +${prize}M`);
        });
        [...members].sort((a: any, b: any) => a.racePos - b.racePos).forEach((member: any, index) => {
          const prize = calcularMillonesRivalidadCarrera(index + 1, members.length);
          if (prize > 0) add(member.teamId, prize, "rivalidad", member.nombre, `Rivalidad carrera P${index + 1}: +${prize}M`);
        });
      }

      for (const teamId of participatingTeams) {
        if (teamById[teamId]) {
          add(teamId, M_PARTICIPACION, "premio_carrera", undefined, `Participación del equipo: +${M_PARTICIPACION}M`);
        }
        if (!dirtyTeams.has(teamId) && teamById[teamId]) {
          add(teamId, M_SIN_SANCIONADOS, "sin_sancionados", undefined, `Equipo sin penalizados: +${M_SIN_SANCIONADOS}M`);
        }
      }

      const pilotPriceUpdates: Array<{ ref: any; data: Record<string, unknown> }> = [];
      const decayLog: Array<{
        nombre: string;
        mantenerAntes: number;
        mantenerDespues: number;
        clausulaDespues: number;
        congelado: boolean;
      }> = [];

      for (const pilotDoc of pilotDocData) {
        const { id: pilotoId, ref, data: d } = pilotDoc;
        const precioCompra = d.precio_compra ?? 0;
        const clausulaActual = d.clausula_actual ?? 0;
        if (precioCompra === 0 && clausulaActual === 0) continue;

        const nombre = pilotNombre[pilotoId] || pilotoId;
        const hasPendingTransfer = d.pending_equipoId != null || d.pending_precio_compra != null;
        // Precio vigente en esta carrera y el que regirá en la siguiente. En la última del
        // bloque la curva ya no avanza: la cláusula se queda clavada en el precio de compra.
        const vigente  = precioPilotoEnCarrera(precioCompra, indiceCarrera, carrerasDelBloque);
        const proximo  = precioPilotoEnCarrera(precioCompra, indiceCarrera + 1, carrerasDelBloque);
        const mantenerEstaCarrera = vigente.mantener;
        const isFrozenHere = (() => {
          if (!d.congelado && !hasPendingTransfer) return false;
          if (previousCircuitIds === undefined) return true;
          if (!d.congelado_en) return true;
          return previousCircuitIds.includes(d.congelado_en);
        })();

        if (isFrozenHere) {
          // Un precio pactado se sale de la curva: se queda donde estaba hasta el mercado.
          const mantenerCongelado = d.mantener_actual ?? 0;
          decayLog.push({ nombre, mantenerAntes: mantenerCongelado, mantenerDespues: mantenerCongelado, clausulaDespues: clausulaActual, congelado: true });
          pilotPriceUpdates.push({ ref, data: {
            precio_carrera_anterior: mantenerCongelado,
            [`historial_precios.${circuitoId}`]: { carrera: circuitName, mantener: null, clausula: null, congelado: true },
          } });
        } else {
          decayLog.push({ nombre, mantenerAntes: mantenerEstaCarrera, mantenerDespues: proximo.mantener, clausulaDespues: proximo.clausula, congelado: false });
          pilotPriceUpdates.push({ ref, data: {
            clausula_actual: proximo.clausula,
            mantener_actual: proximo.mantener,
            precio_carrera_anterior: mantenerEstaCarrera,
            [`historial_precios.${circuitoId}`]: { carrera: circuitName, mantener: vigente.mantener, clausula: vigente.clausula },
          } });
        }
      }

      for (const [teamId, total] of Object.entries(earnings)) {
        if (teamById[teamId]) transaction.update(teamById[teamId].ref, { presupuesto: increment(total) });
      }
      pilotPriceUpdates.forEach(update => transaction.update(update.ref, update.data));
      txQueue.forEach((entry, index) => {
        const logRef = doc(db, "transacciones", `${splitId}__${circuitoId}__${index}`);
        transaction.set(logRef, transactionPayload({ ...entry, splitId, circuitoId }));
      });
      transaction.update(circuitoRef, { economia_procesada: true });

      return { applied: true as const, earnings, txQueue, decayLog, teamById };
    });

    if (!result.applied) {
      return { processed: 0, message: "La economía de este circuito ya fue procesada." };
    }

    const { earnings, txQueue, decayLog, teamById } = result;

    if (onProgress) {
      onProgress(`✓ ${circuitName} procesado`);
      for (const [teamId, total] of Object.entries(earnings).sort((a, b) => b[1] - a[1])) {
        onProgress(`equipo:${teamById[teamId]?.nombre ?? teamId}:${total.toFixed(1)}`);
      }
      for (const p of decayLog.sort((a, b) => a.nombre.localeCompare(b.nombre))) {
        onProgress(`piloto:${p.nombre}:${p.mantenerAntes}:${p.mantenerDespues}:${p.clausulaDespues}:${p.congelado}`);
      }
    }

    return {
      processed: txQueue.length,
      message: `Economía de ${circuitName} procesada: ${txQueue.length} movimientos, ${
        Object.entries(earnings)
          .map(([id, m]) => `${teamById[id]?.nombre ?? id} +${m.toFixed(1)}M`)
          .join(" · ")
      }`,
    };
  } catch (error: any) {
    return { processed: 0, message: `Error al procesar economía: ${error.message}` };
  }
}

// ─── REVERTIR LA ECONOMÍA DE UNA CARRERA ─────────────────────────────────────
// Deshace exactamente lo que procesarEconomiaCarrera aplicó para un circuito: devuelve a
// cada equipo lo que se le ingresó, borra el registro de transacciones de esa carrera y
// restaura el precio de cada piloto al estado justo anterior. El precio se lee del propio
// historial_precios del piloto (el "vigente" que la carrera ya dejó escrito), no se
// recalcula desde cero: recalcularCurvaPreciosSplit no sirve para esto porque empuja a cada
// piloto hacia el cierre del split entero, no hacia el estado de la carrera anterior.
// Solo se puede revertir el circuito procesado más reciente del split: revertir uno
// intermedio desordenaría la secuencia de índices de la curva de precios de los que ya se
// procesaron después.
export async function revertirEconomiaCarrera(
  splitId: string,
  circuitoId: string,
): Promise<{ ok: boolean; message: string }> {
  try {
    const circuitoRef = doc(db, `splits/${splitId}/circuitos`, circuitoId);
    const [circuitoSnap, calendarioSnap] = await Promise.all([
      getDoc(circuitoRef),
      getDocs(collection(db, `splits/${splitId}/circuitos`)),
    ]);
    if (!circuitoSnap.exists()) return { ok: false, message: "Circuito no encontrado." };
    const circuitoData = circuitoSnap.data() as any;
    if (!circuitoData.economia_procesada) {
      return { ok: false, message: "Este circuito no tiene economía procesada." };
    }

    const calendario = calendarioSnap.docs
      .map(d => ({
        id: d.id,
        orden: Number((d.data() as any).numero_carrera ?? 0),
        procesada: !!(d.data() as any).economia_procesada,
        fecha: (d.data() as any).fecha,
      }))
      .sort((a, b) => {
        if (a.orden && b.orden) return a.orden - b.orden;
        if (a.orden) return -1;
        if (b.orden) return 1;
        const fa = a.fecha?.toMillis?.() ?? 0, fb = b.fecha?.toMillis?.() ?? 0;
        return fa !== fb ? fa - fb : a.id.localeCompare(b.id);
      });
    const indice = calendario.findIndex(c => c.id === circuitoId);
    if (calendario.slice(indice + 1).some(c => c.procesada)) {
      return { ok: false, message: "Hay una carrera posterior con economía ya procesada: revierte primero esa." };
    }
    const anteriorId = indice > 0 ? calendario[indice - 1].id : null;

    const [equiposSnap, txSnap] = await Promise.all([
      getDocs(collection(db, `splits/${splitId}/equipos`)),
      getDocs(query(collection(db, "transacciones"), where("splitId", "==", splitId), where("circuitoId", "==", circuitoId))),
    ]);

    const teamIdByName: Record<string, string> = {};
    equiposSnap.docs.forEach(d => { teamIdByName[(d.data() as any).nombre || d.id] = d.id; });

    // Todas las entradas que procesarEconomiaCarrera registra son ingresos (esIngreso
    // siempre true, ver el closure add() más arriba); revertir siempre resta.
    const refund: Record<string, number> = {};
    txSnap.docs.forEach(txDoc => {
      const data = txDoc.data() as any;
      const teamId = teamIdByName[data.equipo];
      if (!teamId) return;
      refund[teamId] = (refund[teamId] || 0) + Number(data.cantidad || 0);
    });

    const batch = writeBatch(db);
    for (const [teamId, total] of Object.entries(refund)) {
      if (total === 0) continue;
      batch.update(doc(db, `splits/${splitId}/equipos`, teamId), { presupuesto: increment(-total) });
    }
    txSnap.docs.forEach(txDoc => batch.delete(txDoc.ref));

    let pilotosRestaurados = 0;
    for (const equipoDoc of equiposSnap.docs) {
      const pilotosSnap = await getDocs(collection(db, `splits/${splitId}/equipos/${equipoDoc.id}/pilotos`));
      for (const pd of pilotosSnap.docs) {
        const d = pd.data() as any;
        const entry = d.historial_precios?.[circuitoId];
        if (!entry) continue;
        pilotosRestaurados++;

        if (entry.congelado) {
          // Un precio pactado no cambia mantener/cláusula al procesar: solo hay que quitar
          // la entrada de esta carrera del historial.
          batch.update(pd.ref, { [`historial_precios.${circuitoId}`]: deleteField() });
          continue;
        }

        const anterior = anteriorId ? d.historial_precios?.[anteriorId] : null;
        const precioCarreraAnterior = anterior && !anterior.congelado && anterior.mantener != null
          ? anterior.mantener
          : d.mantener_inicial_split ?? entry.mantener;

        batch.update(pd.ref, {
          mantener_actual: entry.mantener,
          clausula_actual: entry.clausula,
          precio_carrera_anterior: precioCarreraAnterior,
          [`historial_precios.${circuitoId}`]: deleteField(),
        });
      }
    }

    batch.update(circuitoRef, { economia_procesada: false });
    await batch.commit();

    return {
      ok: true,
      message: `Economía de ${circuitoData.nombre || circuitoId} revertida: `
        + `${Object.keys(refund).length} equipo(s) reembolsados, ${txSnap.docs.length} movimiento(s) borrados, `
        + `${pilotosRestaurados} piloto(s) con precio restaurado.`,
    };
  } catch (error: any) {
    return { ok: false, message: `Error al revertir la economía: ${error.message}` };
  }
}

// ─── RECALCULAR LA CURVA DE PRECIOS DE UN SPLIT ──────────────────────────────
// Reescribe mantener/cláusula de cada carrera desde el precio de compra y el calendario.
// No toca presupuestos, transacciones ni resultados: sirve para arreglar un split cuya
// economía se cargó conciliada del Excel (que no deja historial) o que se procesó con la
// regla vieja del recorte único. Los precios pactados en mercado se respetan.

export async function recalcularCurvaPreciosSplit(
  splitId: string,
  onProgress?: (msg: string) => void
): Promise<{ pilotos: number; carreras: number; message: string }> {
  try {
    const circSnap = await getDocs(collection(db, `splits/${splitId}/circuitos`));
    const calendario = circSnap.docs
      .map(d => ({ id: d.id, nombre: (d.data() as any).nombre || d.id, orden: Number((d.data() as any).numero_carrera ?? 0) }))
      .sort((a, b) => (a.orden && b.orden ? a.orden - b.orden : a.id.localeCompare(b.id)));

    if (calendario.length === 0) {
      const message = "El split no tiene circuitos: no hay curva que recalcular.";
      onProgress?.(`⚠ ${message}`);
      return { pilotos: 0, carreras: 0, message };
    }
    onProgress?.(`Calendario: ${calendario.map(c => c.nombre).join(" → ")}`);

    const equiposSnap = await getDocs(collection(db, `splits/${splitId}/equipos`));
    const batch = writeBatch(db);
    let pilotos = 0;

    for (const equipoDoc of equiposSnap.docs) {
      const pilotosSnap = await getDocs(collection(db, `splits/${splitId}/equipos/${equipoDoc.id}/pilotos`));
      for (const pd of pilotosSnap.docs) {
        const d = pd.data() as any;
        const precioCompra = Number(d.precio_compra ?? 0);
        if (precioCompra === 0) continue;

        const curva = curvaPreciosBloque(precioCompra, calendario.length);
        // Índice de la carrera en la que se pactó el precio, −1 si el piloto no está
        // congelado. Sin `congelado_en` reconocible se congela desde la primera: es lo que
        // hace el procesado de carrera y así no se le sigue moviendo un precio ya pactado.
        const estaCongelado = d.congelado || d.pending_equipoId != null || d.pending_precio_compra != null;
        const marcaCongelacion = calendario.findIndex(c => c.id === d.congelado_en);
        const congeladoDesde = !estaCongelado ? -1 : marcaCongelacion >= 0 ? marcaCongelacion : 0;

        const historial_precios = Object.fromEntries(calendario.map((circuito, indice) => [
          circuito.id,
          congeladoDesde >= 0 && indice > congeladoDesde
            ? { carrera: circuito.nombre, mantener: null, clausula: null, congelado: true }
            : { carrera: circuito.nombre, mantener: curva[indice].mantener, clausula: curva[indice].clausula, congelado: false },
        ]));

        // Con precio pactado el cierre es el de la carrera en la que se congeló.
        const cierre = curva[congeladoDesde >= 0 ? congeladoDesde : curva.length - 1];

        batch.update(pd.ref, {
          historial_precios,
          mantener_inicial_split:  mantenerInicialDe(precioCompra),
          clausula_inicial_split:  clausulaInicialDe(precioCompra),
          mantener_actual:         cierre.mantener,
          clausula_actual:         cierre.clausula,
          precio_carrera_anterior: cierre.mantener,
        });
        pilotos++;
        onProgress?.(`piloto:${d.nombre || pd.id}:${curva[0].mantener}:${cierre.mantener}:${cierre.clausula}:${congeladoDesde >= 0}`);
      }
    }

    await batch.commit();
    const message = `✓ Curva de precios recalculada: ${pilotos} pilotos × ${calendario.length} carreras.`;
    onProgress?.(message);
    return { pilotos, carreras: calendario.length, message };
  } catch (error: any) {
    const message = `Error recalculando precios: ${error.message}`;
    onProgress?.(`⚠ ${message}`);
    return { pilotos: 0, carreras: 0, message };
  }
}

// ─── PROCESADO RETROACTIVO DE UN SPLIT ───────────────────────────────────────

export async function procesarEconomiaRetroactivaSplit(
  splitId: string,
  onProgress?: (msg: string) => void
): Promise<{ ok: number; skipped: number; message: string }> {
  try {
    const circSnap = await getDocs(collection(db, `splits/${splitId}/circuitos`));
    const alreadyProcessed = circSnap.docs.filter(d => d.data().economia_procesada);
    if (alreadyProcessed.length > 0) {
      const message = `Retroactivo cancelado: ${alreadyProcessed.length} circuito(s) ya tienen economía aplicada. Resetea la economía completa antes de reconstruirla.`;
      onProgress?.(`⚠ ${message}`);
      return { ok: 0, skipped: alreadyProcessed.length, message };
    }

    // 1. Resetear precios iniciales de pilotos (docs anidados)
    onProgress?.("Inicializando precios de pilotos…");
    const equiposSnap = await getDocs(collection(db, `splits/${splitId}/equipos`));
    const resetBatch = writeBatch(db);
    let resetCount = 0;

    for (const equipoDoc of equiposSnap.docs) {
      const pilotosSnap = await getDocs(
        collection(db, `splits/${splitId}/equipos/${equipoDoc.id}/pilotos`)
      );
      for (const pd of pilotosSnap.docs) {
        const d = pd.data();
        const precioCompra = d.precio_compra ?? 0;

        const mantenerInicial = d.mantener_inicial_split != null ? d.mantener_inicial_split : mantenerInicialDe(precioCompra);
        const clausulaInicial = d.clausula_inicial_split != null ? d.clausula_inicial_split : clausulaInicialDe(precioCompra);
        if (mantenerInicial === 0 && clausulaInicial === 0) continue;

        resetBatch.update(pd.ref, {
          mantener_inicial_split:  mantenerInicial,
          clausula_inicial_split:  clausulaInicial,
          mantener_actual:         mantenerInicial,
          clausula_actual:         clausulaInicial,
          precio_carrera_anterior: mantenerInicial,
          historial_precios:       {},
        });
        resetCount++;
      }
    }

    await resetBatch.commit();
    onProgress?.(resetCount > 0 ? `✓ ${resetCount} pilotos con precios inicializados.` : "⚠ Ningún piloto tiene precio_compra > 0.");

    // 2. Limpiar economia_procesada en todos los circuitos
    onProgress?.("Limpiando circuitos del split…");
    const circBatch = writeBatch(db);
    circSnap.docs.forEach(d => circBatch.update(d.ref, { economia_procesada: false }));
    await circBatch.commit();
    onProgress?.(`✓ economia_procesada limpiada en ${circSnap.docs.length} circuitos.`);

    // 3. Ordenar circuitos completados
    const toMs = (fecha: any): number => {
      if (!fecha) return 0;
      if (typeof fecha?.toMillis === "function") return fecha.toMillis();
      if (typeof fecha === "string") return new Date(fecha).getTime() || 0;
      return 0;
    };

    const completados = circSnap.docs
      .map(d => ({ ref: d.ref, id: d.id, ...d.data() as any }))
      .filter(c => c.completado && Array.isArray(c.resultados) && c.resultados.length > 0)
      .sort((a, b) => {
        if (a.numero_carrera && b.numero_carrera) return a.numero_carrera - b.numero_carrera;
        const fa = toMs(a.fecha), fb = toMs(b.fecha);
        if (fa !== fb) return fa - fb;
        return a.id.localeCompare(b.id);
      });

    onProgress?.(`Circuitos a procesar: ${completados.map(c => c.nombre || c.id).join(" → ")}`);

    if (completados.length === 0) {
      onProgress?.("⚠ No hay circuitos completados con resultados.");
      return { ok: 0, skipped: 0, message: "No hay circuitos completados para procesar." };
    }

    // 4. Procesar en secuencia (el decay depende del orden)
    let ok = 0;
    let skipped = 0;
    const processedSoFar: string[] = [];

    for (const c of completados) {
      if (c.economia_procesada) {
        skipped++;
        processedSoFar.push(c.id);
        onProgress?.(`  ↳ ${c.nombre || c.id} — ya procesado, saltando.`);
        continue;
      }
      onProgress?.(`  ↳ Procesando ${c.nombre || c.id}…`);
      const result = await procesarEconomiaCarrera(splitId, c.id, c.nombre || c.id, undefined, processedSoFar);
      processedSoFar.push(c.id);
      if (result.processed > 0) {
        ok++;
        onProgress?.(`    ✓ ${result.message}`);
      } else {
        onProgress?.(`    ⚠ ${result.message}`);
      }
    }

    const finalMsg = `✓ Retroactivo completado: ${ok} procesado(s), ${skipped} ya estaban listos.`;
    onProgress?.(finalMsg);
    return { ok, skipped, message: finalMsg };
  } catch (error: any) {
    const errMsg = `Error retroactivo: ${error.message}`;
    onProgress?.(`⚠ ${errMsg}`);
    return { ok: 0, skipped: 0, message: errMsg };
  }
}
