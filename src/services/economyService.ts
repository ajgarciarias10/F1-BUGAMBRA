import {
  doc, getDoc, collection, getDocs, updateDoc, addDoc,
  serverTimestamp, increment, writeBatch,
} from "firebase/firestore";
import { db } from "./firebase";
import type { TipoTransaccion } from "../types";

// ─── CONSTANTES ECONÓMICAS ────────────────────────────────────────────────────

export const POINTS_BY_POSITION = [16, 13, 11, 9, 7, 6, 5, 4, 3, 2, 2, 1];

const MCLASIF  = [1, 0.5];   // 1°→1M, 2°→0.5M
const MCARRERA = [2, 1];      // 1°→2M, 2°→1M

export const M_POLE             = 2;
export const M_VUELTA_RAPIDA    = 1;
export const M_SIN_SANCIONADOS  = 3;
export const M_PUNTOS_FACTOR    = 0.1;
export const M_SOLO_POR_CARRERA = 1.5;
export const M_RIVALIDAD_CLASIF = 1;
export const M_RIVALIDAD_CARRERA = 2;

// ─── HELPERS ──────────────────────────────────────────────────────────────────

export function calcularMillonesClasificacion(pos: number): number {
  return MCLASIF[pos - 1] ?? 0;
}

export function calcularMillonesCarrera(pos: number): number {
  return MCARRERA[pos - 1] ?? 0;
}

export function calcularPuntosPosicion(pos: number): number {
  return POINTS_BY_POSITION[pos - 1] ?? 0;
}

function r1(n: number): number {
  return Math.round(n * 10) / 10;
}

// ─── LOG DE TRANSACCIÓN ───────────────────────────────────────────────────────

async function logTx(data: {
  equipo: string;
  tipo: TipoTransaccion;
  piloto?: string;
  cantidad: number;
  esIngreso: boolean;
  carrera?: string;
  descripcion?: string;
}) {
  const payload = Object.fromEntries(
    Object.entries({ ...data, fecha: serverTimestamp() }).filter(([, v]) => v !== undefined)
  );
  await addDoc(collection(db, "transacciones"), payload);
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
    const delta    = esPrecioNegativo ? Math.abs(precio) : -precio;
    const precioAbs = Math.abs(precio);
    const nuevaMantener = esPrecioNegativo ? r1(precioAbs / 3) : r1(precioAbs * 3);
    const nuevaClausula = esPrecioNegativo ? r1(precioAbs / 2) : r1(precioAbs * 2);

    const teamRef   = doc(db, `splits/${splitId}/equipos`, teamId);
    const rosterRef = doc(db, `splits/${splitId}/roster`, pilotoId);

    await Promise.all([
      updateDoc(teamRef, { presupuesto: increment(delta) }),
      updateDoc(rosterRef, {
        equipoId:               teamId,
        precio_compra:          precioAbs,
        mantener_actual:        nuevaMantener,
        clausula_actual:        nuevaClausula,
        mantener_inicial_split: nuevaMantener,
        clausula_inicial_split: nuevaClausula,
        precio_carrera_anterior: nuevaMantener,
        historial_precios:      {},
      }),
    ]);

    await logTx({
      equipo:      teamName,
      tipo:        esPrecioNegativo ? "piloto_negativo" : tipo,
      piloto:      pilotName,
      cantidad:    precioAbs,
      esIngreso:   esPrecioNegativo,
      descripcion: esPrecioNegativo
        ? `Piloto precio negativo — ingreso al fichar: +${precioAbs}M`
        : `${tipo.charAt(0).toUpperCase() + tipo.slice(1)}: −${precioAbs}M → mantener ${nuevaMantener}M / cláusula ${nuevaClausula}M`,
    });

    return {
      success: true,
      message: `${esPrecioNegativo ? "Ingreso" : "Gasto"}: ${delta >= 0 ? "+" : ""}${delta.toFixed(1)}M | Valoración: ${nuevaMantener}M / ${nuevaClausula}M`,
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
  previousCircuitIds?: string[]   // IDs de circuitos procesados ANTES que éste, en orden
): Promise<{ processed: number; message: string }> {
  try {
    // Guardia de idempotencia
    const circuitoRef  = doc(db, `splits/${splitId}/circuitos`, circuitoId);
    const circuitoSnap = await getDoc(circuitoRef);
    if (!circuitoSnap.exists()) return { processed: 0, message: "Circuito no encontrado." };

    const circuitoData = circuitoSnap.data();
    if (circuitoData?.economia_procesada) {
      return { processed: 0, message: "La economía de este circuito ya fue procesada." };
    }

    const resultados: any[] = circuitoData?.resultados || [];
    if (resultados.length === 0) {
      return { processed: 0, message: "No hay resultados registrados para procesar." };
    }

    // Leer roster, equipos y split (rivalidades) en paralelo
    const [rosterSnap, equiposSnap, splitSnap] = await Promise.all([
      getDocs(collection(db, `splits/${splitId}/roster`)),
      getDocs(collection(db, `splits/${splitId}/equipos`)),
      getDoc(doc(db, "splits", splitId)),
    ]);

    // Leer nombres de pilotos globales
    const pilotNombre: Record<string, string> = {};
    const pilotosSnap = await getDocs(collection(db, "pilotos"));
    pilotosSnap.docs.forEach(d => { pilotNombre[d.id] = d.data().nombre || d.id; });

    // Índices
    const teamById: Record<string, { ref: any; nombre: string }> = {};
    equiposSnap.docs.forEach(d => {
      teamById[d.id] = { ref: d.ref, nombre: d.data().nombre };
    });

    const teamByPilot: Record<string, string> = {}; // pilotoId → equipoId
    rosterSnap.docs.forEach(d => {
      const entry = d.data();
      if (entry.equipoId && entry.equipoId !== "agente_libre") {
        teamByPilot[d.id] = entry.equipoId;
      }
    });

    // Rivalidades
    const rivalries = splitSnap.data()?.rivalries;
    const soloPilotIds = new Set<string>((rivalries?.soloPilots || []).map((p: any) => p.id));
    const groupByPilot: Record<string, any> = {};
    for (const group of rivalries?.groups || []) {
      for (const member of group.members) groupByPilot[member.id] = group;
    }

    // ── Calcular ganancias ─────────────────────────────────────────────────────

    const earnings: Record<string, number> = {};
    const txQueue: Parameters<typeof logTx>[0][] = [];

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

    for (const r of resultados) {
      const tid = teamByPilot[r.pilotoId];
      if (!tid) continue;
      participatingTeams.add(tid);
      if (!r.isClean) dirtyTeams.add(tid);
    }

    for (const r of resultados) {
      const tid = teamByPilot[r.pilotoId];
      if (!tid) continue;

      const nombre = pilotNombre[r.pilotoId] || r.pilotoId;
      const isDNF  = r.racePos === 99;

      // Clasificación
      const mClasif = calcularMillonesClasificacion(r.qualyPos);
      if (mClasif > 0) add(tid, mClasif, "premio_carrera", nombre, `Clasificación P${r.qualyPos}: +${mClasif}M`);

      // Carrera
      if (!isDNF) {
        const mCar = calcularMillonesCarrera(r.racePos);
        if (mCar > 0) add(tid, mCar, "premio_carrera", nombre, `Carrera P${r.racePos}: +${mCar}M`);
      }

      // Millones por puntos
      const ptsPos  = isDNF ? 0 : calcularPuntosPosicion(r.racePos);
      const ptsPole = r.qualyPos === 1 ? 2 : 0;
      const ptsFL   = r.fastestLap ? 2 : 0;
      const totalPts = ptsPos + ptsPole + ptsFL;
      if (totalPts > 0) {
        const mPts = parseFloat((totalPts * M_PUNTOS_FACTOR).toFixed(2));
        add(tid, mPts, "ingreso_puntos", nombre, `${totalPts} pts × ${M_PUNTOS_FACTOR}M = +${mPts}M`);
      }

      // Bonus pole
      if (r.qualyPos === 1) add(tid, M_POLE, "pole", nombre, `Pole position: +${M_POLE}M`);

      // Bonus vuelta rápida
      if (r.fastestLap) add(tid, M_VUELTA_RAPIDA, "vuelta_rapida", nombre, `Vuelta rápida: +${M_VUELTA_RAPIDA}M`);

      // Piloto sin rival
      if (soloPilotIds.has(r.pilotoId)) {
        add(tid, M_SOLO_POR_CARRERA, "rivalidad", nombre, `Piloto sin rival: +${M_SOLO_POR_CARRERA}M`);
      }
    }

    // Rivalidades H2H
    for (const group of rivalries?.groups || []) {
      if (group.type === "solo") continue;

      const members = group.members
        .map((m: any) => {
          const r = resultados.find((res: any) => res.pilotoId === m.id);
          const tid = teamByPilot[m.id];
          if (!r || !tid) return null;
          return { pilotoId: m.id, qualyPos: r.qualyPos, racePos: r.racePos, teamId: tid, nombre: pilotNombre[m.id] || m.id };
        })
        .filter(Boolean);

      if (members.length < 2) continue;

      const qualyWinner = members.reduce((best: any, curr: any) => curr.qualyPos < best.qualyPos ? curr : best);
      add(qualyWinner.teamId, M_RIVALIDAD_CLASIF, "rivalidad", qualyWinner.nombre, `Rivalidad clasificación H2H: +${M_RIVALIDAD_CLASIF}M`);

      const raceWinner = members.reduce((best: any, curr: any) => curr.racePos < best.racePos ? curr : best);
      add(raceWinner.teamId, M_RIVALIDAD_CARRERA, "rivalidad", raceWinner.nombre, `Rivalidad carrera H2H: +${M_RIVALIDAD_CARRERA}M`);
    }

    // Sin sancionados
    for (const teamId of participatingTeams) {
      if (!dirtyTeams.has(teamId) && teamById[teamId]) {
        add(teamId, M_SIN_SANCIONADOS, "sin_sancionados", undefined, `Equipo sin penalizados: +${M_SIN_SANCIONADOS}M`);
      }
    }

    // ── Aplicar con writeBatch ─────────────────────────────────────────────────

    const batch = writeBatch(db);

    // Presupuestos de equipos
    for (const [teamId, total] of Object.entries(earnings)) {
      if (teamById[teamId]) {
        batch.update(teamById[teamId].ref, { presupuesto: increment(total) });
      }
    }

    // Decay de precios de pilotos
    const decayLog: Array<{
      nombre: string;
      mantenerAntes: number;
      mantenerDespues: number;
      clausulaDespues: number;
      congelado: boolean;
    }> = [];

    for (const rosterDoc of rosterSnap.docs) {
      const d = rosterDoc.data();
      const precioCompra   = d.precio_compra   ?? 0;
      const clausulaActual = d.clausula_actual  ?? 0;
      if (precioCompra === 0 && clausulaActual === 0) continue;

      const mantenerEstaCarrera = d.mantener_actual ?? 0;
      const nombre = pilotNombre[rosterDoc.id] || rosterDoc.id;
      const hasPendingTransfer = d.pending_equipoId != null || d.pending_precio_compra != null;

      // Determinar si el freeze aplica a ESTE circuito específico
      const isFrozenHere = (() => {
        if (!d.congelado && !hasPendingTransfer) return false;
        if (previousCircuitIds === undefined) return true; // compatibilidad: sin info de orden → congelado global
        if (!d.congelado_en) return true; // congelado desde el inicio (antes de cualquier carrera)
        // El freeze empieza en el circuito POSTERIOR a congelado_en
        return previousCircuitIds.includes(d.congelado_en);
      })();

      if (isFrozenHere) {
        decayLog.push({ nombre, mantenerAntes: mantenerEstaCarrera, mantenerDespues: mantenerEstaCarrera, clausulaDespues: clausulaActual, congelado: true });
        batch.update(rosterDoc.ref, {
          precio_carrera_anterior: mantenerEstaCarrera,
          [`historial_precios.${circuitoId}`]: {
            carrera:   circuitName,
            mantener:  mantenerEstaCarrera,
            clausula:  clausulaActual,
            congelado: true,
          },
        });
      } else if (precioCompra === -110) {
        // Sentinel freeze price: no más cálculos hasta que el piloto salga de esta parte.
        decayLog.push({ nombre, mantenerAntes: mantenerEstaCarrera, mantenerDespues: mantenerEstaCarrera, clausulaDespues: clausulaActual, congelado: true });
        batch.update(rosterDoc.ref, {
          precio_carrera_anterior: mantenerEstaCarrera,
          [`historial_precios.${circuitoId}`]: {
            carrera:   circuitName,
            mantener:  mantenerEstaCarrera,
            clausula:  clausulaActual,
            congelado: true,
          },
        });
      } else if (precioCompra < 0) {
        // Piloto con precio negativo: crecimiento lineal
        // mantener: base(|p|/3) + 20% de base por carrera
        // clausula: base(|p|/2) + 20% de base por carrera
        const precioAbs = Math.abs(precioCompra);
        const stepM      = r1(precioAbs / 3 * 0.2);
        const stepCl     = r1(precioAbs / 2 * 0.2);
        const newMantener = r1(mantenerEstaCarrera + stepM);
        const newClausula = r1(clausulaActual + stepCl);

        decayLog.push({ nombre, mantenerAntes: mantenerEstaCarrera, mantenerDespues: newMantener, clausulaDespues: newClausula, congelado: false });
        batch.update(rosterDoc.ref, {
          clausula_actual:          newClausula,
          mantener_actual:          newMantener,
          precio_carrera_anterior:  mantenerEstaCarrera,
          [`historial_precios.${circuitoId}`]: {
            carrera:  circuitName,
            mantener: mantenerEstaCarrera,
            clausula: clausulaActual,
          },
        });
      } else {
        // Piloto con precio positivo: decay estándar
        const stepC       = r1(Math.abs(precioCompra) * 0.2);
        const newClausula = r1(clausulaActual - stepC);
        const newMantener = r1(newClausula * 1.5);

        decayLog.push({ nombre, mantenerAntes: mantenerEstaCarrera, mantenerDespues: newMantener, clausulaDespues: newClausula, congelado: false });
        batch.update(rosterDoc.ref, {
          clausula_actual:          newClausula,
          mantener_actual:          newMantener,
          precio_carrera_anterior:  mantenerEstaCarrera,
          [`historial_precios.${circuitoId}`]: {
            carrera:  circuitName,
            mantener: mantenerEstaCarrera,
            clausula: clausulaActual,
          },
        });
      }
    }

    // Marcar circuito como procesado
    batch.update(circuitoRef, { economia_procesada: true });

    await batch.commit();

    // Emitir log de resultados
    if (onProgress) {
      onProgress(`✓ ${circuitName} procesado`);
      for (const [teamId, total] of Object.entries(earnings).sort((a, b) => b[1] - a[1])) {
        onProgress(`equipo:${teamById[teamId]?.nombre ?? teamId}:${total.toFixed(1)}`);
      }
      for (const p of decayLog.sort((a, b) => a.nombre.localeCompare(b.nombre))) {
        onProgress(`piloto:${p.nombre}:${p.mantenerAntes}:${p.mantenerDespues}:${p.clausulaDespues}:${p.congelado}`);
      }
    }

    // Log de transacciones (fuera del batch — addDoc no es compatible con batch)
    await Promise.all(txQueue.map(tx => logTx(tx)));

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

// ─── PROCESADO RETROACTIVO DE UN SPLIT ───────────────────────────────────────

export async function procesarEconomiaRetroactivaSplit(
  splitId: string,
  onProgress?: (msg: string) => void
): Promise<{ ok: number; skipped: number; message: string }> {
  try {
    // 1. Resetear precios iniciales de pilotos del roster
    onProgress?.("Inicializando precios de pilotos…");
    const rosterSnap = await getDocs(collection(db, `splits/${splitId}/roster`));
    const resetBatch = writeBatch(db);
    let resetCount = 0;

    for (const rDoc of rosterSnap.docs) {
      const d = rDoc.data();
      const precioCompra = d.precio_compra ?? 0;

      const mantenerInicial = d.mantener_inicial_split != null ? d.mantener_inicial_split : r1(precioCompra * 3);
      const clausulaInicial = d.clausula_inicial_split != null ? d.clausula_inicial_split : r1(precioCompra * 2);
      if (mantenerInicial === 0 && clausulaInicial === 0) continue;

      resetBatch.update(rDoc.ref, {
        mantener_inicial_split:  mantenerInicial,
        clausula_inicial_split:  clausulaInicial,
        mantener_actual:         mantenerInicial,
        clausula_actual:         clausulaInicial,
        precio_carrera_anterior: mantenerInicial,
        historial_precios:       {},
      });
      resetCount++;
    }
    await resetBatch.commit();
    onProgress?.(resetCount > 0 ? `✓ ${resetCount} pilotos con precios inicializados.` : "⚠ Ningún piloto tiene precio_compra > 0.");

    // 2. Limpiar economia_procesada en todos los circuitos
    onProgress?.("Limpiando circuitos del split…");
    const circSnap = await getDocs(collection(db, `splits/${splitId}/circuitos`));
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
    const processedSoFar: string[] = []; // acumula IDs en orden para el check de freeze temporal

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
