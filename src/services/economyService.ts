import {
  doc, getDoc, collection, getDocs, updateDoc, addDoc,
  serverTimestamp, increment
} from "firebase/firestore";
import { db } from "./firebase";

// ─── CONSTANTES ECONÓMICAS ────────────────────────────────────────────────────

export const POINTS_BY_POSITION = [16, 13, 11, 9, 7, 6, 5, 4, 3, 2, 2, 1];

// Millones por posición en clasificación (1° → 1M, 2° → 0.5M, resto → 0)
const MCLASIF = [1, 0.5];
// Millones por posición en carrera (1° → 2M, 2° → 1M, resto → 0)
const MCARRERA = [2, 1];

export const M_POLE             = 2;    // bonus equipo: pole
export const M_VUELTA_RAPIDA    = 1;    // bonus equipo: vuelta rápida
export const M_SIN_SANCIONADOS  = 3;    // bonus equipo: ningún piloto penalizado
export const M_PUNTOS_FACTOR    = 0.1; // por cada punto → 0.1M
export const M_SOLO_POR_CARRERA = 1.5; // piloto sin rival en cada carrera
export const M_RIVALIDAD_CLASIF = 1;   // H2H clasificación (mejor posición gana)
export const M_RIVALIDAD_CARRERA = 2;  // H2H carrera (mejor posición gana)

// ─── HELPERS ─────────────────────────────────────────────────────────────────

export function calcularMillonesClasificacion(pos: number): number {
  return MCLASIF[pos - 1] ?? 0;
}

export function calcularMillonesCarrera(pos: number): number {
  return MCARRERA[pos - 1] ?? 0;
}

export function calcularPuntosPosicion(pos: number): number {
  return POINTS_BY_POSITION[pos - 1] ?? 0;
}

// ─── LOG DE TRANSACCIÓN ───────────────────────────────────────────────────────

async function logTx(data: {
  equipo: string;
  tipo: "fichaje" | "clausula" | "subasta" | "piloto_negativo" | "ingreso_puntos" |
        "premio_carrera" | "rivalidad" | "pole" | "vuelta_rapida" | "sin_sancionados";
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
  pilotId: string;
  pilotName: string;
  tipo: "fichaje" | "clausula" | "subasta";
  precio: number;
}): Promise<{ success: boolean; message: string }> {
  const { splitId, teamId, teamName, pilotId, pilotName, tipo, precio } = params;

  try {
    const teamRef = doc(db, `splits/${splitId}/equipos`, teamId);

    // Precio negativo → el equipo COBRA (es un ingreso)
    const esPrecioNegativo = precio < 0;
    const delta = esPrecioNegativo ? Math.abs(precio) : -precio;

    // El precio pagado define las nuevas valoraciones: mantener=×3, cláusula=×2
    const precioAbs = Math.abs(precio);
    const nuevaMantener = round1(precioAbs * 3);
    const nuevaClausula = round1(precioAbs * 2);

    const pilotRef = doc(db, `splits/${splitId}/equipos/${teamId}/pilotos`, pilotId);

    await Promise.all([
      updateDoc(teamRef, { presupuesto: increment(delta) }),
      updateDoc(pilotRef, {
        precio_compra_split: precioAbs,
        mantener_actual: nuevaMantener,
        clausula_actual: nuevaClausula,
        mantener_inicial_split: nuevaMantener,
        clausula_inicial_split: nuevaClausula,
        precio_carrera_anterior: nuevaMantener,
        historial_precios: {},
      }),
    ]);

    await logTx({
      equipo: teamName,
      tipo: esPrecioNegativo ? "piloto_negativo" : tipo,
      piloto: pilotName,
      cantidad: precioAbs,
      esIngreso: esPrecioNegativo,
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
  circuitName: string
): Promise<{ processed: number; message: string }> {
  try {
    // Guardia de idempotencia: si ya se procesó, no volver a hacerlo
    const circuitoRef = doc(db, `splits/${splitId}/circuitos`, circuitoId);
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

    // ── Leer equipos y pilotos ──────────────────────────────────────────────
    const teamsSnap = await getDocs(collection(db, `splits/${splitId}/equipos`));
    const teamById: Record<string, { ref: any; nombre: string }> = {};
    const teamByPilotId: Record<string, { teamId: string; teamNombre: string }> = {};
    const pilotNombre: Record<string, string> = {};

    for (const teamDoc of teamsSnap.docs) {
      const td = teamDoc.data();
      teamById[teamDoc.id] = { ref: teamDoc.ref, nombre: td.nombre };

      const pilotsSnap = await getDocs(
        collection(db, `splits/${splitId}/equipos/${teamDoc.id}/pilotos`)
      );
      for (const pDoc of pilotsSnap.docs) {
        teamByPilotId[pDoc.id] = { teamId: teamDoc.id, teamNombre: td.nombre };
        pilotNombre[pDoc.id] = pDoc.data().nombre || pDoc.id;
      }
    }

    // ── Leer rivalidades del split ─────────────────────────────────────────
    const splitSnap = await getDoc(doc(db, "splits", splitId));
    const rivalries = splitSnap.data()?.rivalries;
    const groupByPilot: Record<string, any> = {};
    const soloPilotIds = new Set<string>((rivalries?.soloPilots || []).map((p: any) => p.id));

    for (const group of rivalries?.groups || []) {
      for (const member of group.members) {
        groupByPilot[member.id] = group;
      }
    }

    // ── Calcular ganancias por equipo ──────────────────────────────────────
    const earnings: Record<string, number> = {};
    const txQueue: Parameters<typeof logTx>[0][] = [];

    const add = (teamId: string, teamNombre: string, amount: number,
      tipo: Parameters<typeof logTx>[0]["tipo"], piloto?: string, descripcion?: string) => {
      earnings[teamId] = (earnings[teamId] || 0) + amount;
      txQueue.push({ equipo: teamNombre, tipo, piloto, cantidad: amount, esIngreso: true, carrera: circuitName, descripcion });
    };

    // Equipos con al menos un piloto penalizado (para sin_sancionados)
    const dirtyTeams = new Set<string>();
    for (const r of resultados) {
      if (!r.isClean) {
        const t = teamByPilotId[r.pilotoId];
        if (t) dirtyTeams.add(t.teamId);
      }
    }

    // Equipos que participaron
    const participatingTeams = new Set<string>();
    for (const r of resultados) {
      const t = teamByPilotId[r.pilotoId];
      if (t) participatingTeams.add(t.teamId);
    }

    for (const r of resultados) {
      const { pilotoId, qualyPos, racePos, fastestLap } = r;
      const t = teamByPilotId[pilotoId];
      if (!t) continue;

      const nombre = pilotNombre[pilotoId] || pilotoId;
      const isDNF = racePos === 99;

      // 1. Dinero de clasificación (1M/0.5M/0)
      const mClasif = calcularMillonesClasificacion(qualyPos);
      if (mClasif > 0) {
        add(t.teamId, t.teamNombre, mClasif, "premio_carrera", nombre,
          `Clasificación P${qualyPos}: +${mClasif}M`);
      }

      // 2. Dinero de carrera (2M/1M/0)
      if (!isDNF) {
        const mCar = calcularMillonesCarrera(racePos);
        if (mCar > 0) {
          add(t.teamId, t.teamNombre, mCar, "premio_carrera", nombre,
            `Carrera P${racePos}: +${mCar}M`);
        }
      }

      // 3. Millones por puntos (posición + pole + vRápida)
      const ptsPos = isDNF ? 0 : calcularPuntosPosicion(racePos);
      const ptsPole = qualyPos === 1 ? 2 : 0;
      const ptsFL = fastestLap ? 2 : 0;
      const totalPts = ptsPos + ptsPole + ptsFL;

      if (totalPts > 0) {
        const mPts = parseFloat((totalPts * M_PUNTOS_FACTOR).toFixed(2));
        add(t.teamId, t.teamNombre, mPts, "ingreso_puntos", nombre,
          `${totalPts} pts × ${M_PUNTOS_FACTOR}M = +${mPts}M`);
      }

      // 4. Bonus Pole
      if (qualyPos === 1) {
        add(t.teamId, t.teamNombre, M_POLE, "pole", nombre,
          `Pole position: +${M_POLE}M`);
      }

      // 5. Bonus Vuelta Rápida
      if (fastestLap) {
        add(t.teamId, t.teamNombre, M_VUELTA_RAPIDA, "vuelta_rapida", nombre,
          `Vuelta rápida: +${M_VUELTA_RAPIDA}M`);
      }

      // 6. Rival solo → 1.5M automático
      if (soloPilotIds.has(pilotoId)) {
        add(t.teamId, t.teamNombre, M_SOLO_POR_CARRERA, "rivalidad", nombre,
          `Piloto sin rival: +${M_SOLO_POR_CARRERA}M`);
      }
    }

    // 7. Rivalidades H2H por grupo
    for (const group of rivalries?.groups || []) {
      if (group.type === "solo") continue;

      const members: { pilotoId: string; qualyPos: number; racePos: number; teamId: string; teamNombre: string; nombre: string }[] = [];
      for (const m of group.members) {
        const r = resultados.find((res: any) => res.pilotoId === m.id);
        const t = teamByPilotId[m.id];
        if (r && t) {
          members.push({ pilotoId: m.id, qualyPos: r.qualyPos, racePos: r.racePos, teamId: t.teamId, teamNombre: t.teamNombre, nombre: pilotNombre[m.id] || m.id });
        }
      }
      if (members.length < 2) continue;

      // H2H Clasificación: menor qualyPos gana
      const qualyWinner = members.reduce((best, curr) => curr.qualyPos < best.qualyPos ? curr : best);
      add(qualyWinner.teamId, qualyWinner.teamNombre, M_RIVALIDAD_CLASIF, "rivalidad", qualyWinner.nombre,
        `Rivalidad clasificación H2H: +${M_RIVALIDAD_CLASIF}M`);

      // H2H Carrera: menor racePos gana (99=DNF pierde)
      const raceWinner = members.reduce((best, curr) => curr.racePos < best.racePos ? curr : best);
      add(raceWinner.teamId, raceWinner.teamNombre, M_RIVALIDAD_CARRERA, "rivalidad", raceWinner.nombre,
        `Rivalidad carrera H2H: +${M_RIVALIDAD_CARRERA}M`);
    }

    // 8. Sin Sancionados por equipo
    for (const teamId of participatingTeams) {
      if (!dirtyTeams.has(teamId)) {
        const t = teamById[teamId];
        if (t) {
          add(teamId, t.nombre, M_SIN_SANCIONADOS, "sin_sancionados", undefined,
            `Equipo sin penalizados: +${M_SIN_SANCIONADOS}M`);
        }
      }
    }

    // ── Aplicar a Firestore en paralelo ────────────────────────────────────
    const writes: Promise<any>[] = [];

    for (const [teamId, total] of Object.entries(earnings)) {
      const t = teamById[teamId];
      if (t) writes.push(updateDoc(t.ref, { presupuesto: increment(total) }));
    }

    for (const tx of txQueue) {
      writes.push(logTx(tx));
    }

    // 9. Decay de precios de pilotos por carrera
    // Fórmula: clausula_N = clausula_(N-1) - precio_compra × 0.2
    //          mantener_N = clausula_N × 1.5
    // El historial guarda el precio VIGENTE (antes del decay) — lo que vale ESA carrera.
    for (const teamDoc of teamsSnap.docs) {
      const pilotsSnap = await getDocs(
        collection(db, `splits/${splitId}/equipos/${teamDoc.id}/pilotos`)
      );
      for (const pDoc of pilotsSnap.docs) {
        const d = pDoc.data();
        const precioCompra = d.precio_compra_split ?? 0;
        const clausulaActual = d.clausula_actual ?? 0;

        if (precioCompra === 0 && clausulaActual === 0) continue;

        // Precio vigente ESTA carrera (se guarda en historial antes de decrementar)
        const mantenerEstaCarrera = d.mantener_actual ?? 0;
        const clausulaEstaCarrera = clausulaActual;

        // Nuevo precio para SIGUIENTE carrera
        const stepC = round1(Math.abs(precioCompra) * 0.2);
        const newClausula = round1(clausulaEstaCarrera - stepC);
        const newMantener = round1(newClausula * 1.5);

        writes.push(updateDoc(pDoc.ref, {
          clausula_actual: newClausula,
          mantener_actual: newMantener,
          precio_carrera_anterior: mantenerEstaCarrera,
          [`historial_precios.${circuitoId}`]: {
            carrera: circuitName,
            mantener: mantenerEstaCarrera,   // precio vigente ESTA carrera
            clausula: clausulaEstaCarrera,
          },
        }));
      }
    }

    // Marcar circuito como procesado (idempotencia)
    writes.push(updateDoc(circuitoRef, { economia_procesada: true }));

    await Promise.all(writes);

    return {
      processed: txQueue.length,
      message: `Economía de ${circuitName} procesada: ${txQueue.length} movimientos, ${Object.entries(earnings).map(([id, m]) => `${teamById[id]?.nombre} +${m.toFixed(1)}M`).join(" · ")}`,
    };
  } catch (error: any) {
    return { processed: 0, message: `Error al procesar economía: ${error.message}` };
  }
}

// ─── PROCESADO RETROACTIVO ────────────────────────────────────────────────────

/**
 * Procesa retroactivamente la economía de un split entero:
 * 1. Fija mantener_inicial_split / clausula_inicial_split desde precio_compra_split
 * 2. Resetea mantener_actual / clausula_actual al valor inicial (estado limpio)
 * 3. Procesa cada circuito completado en orden cronológico (salta los ya procesados)
 */
export async function procesarEconomiaRetroactivaSplit(
  splitId: string,
  onProgress?: (msg: string) => void
): Promise<{ ok: number; skipped: number; message: string }> {
  try {
    // ── 1. Leer pilotos y fijar precios iniciales ───────────────────────────
    onProgress?.("Inicializando precios de pilotos…");
    const teamsSnap = await getDocs(collection(db, `splits/${splitId}/equipos`));
    const pilotResetWrites: Promise<any>[] = [];

    for (const teamDoc of teamsSnap.docs) {
      const pilotsSnap = await getDocs(
        collection(db, `splits/${splitId}/equipos/${teamDoc.id}/pilotos`)
      );
      for (const pDoc of pilotsSnap.docs) {
        const d = pDoc.data();
        const precioCompra = d.precio_compra_split ?? 0;

        // Si ya tiene mantener_inicial_split fijado, respetarlo; si no, calcularlo
        const mantenerInicial = d.mantener_inicial_split != null
          ? d.mantener_inicial_split
          : round1(precioCompra * 3);
        const clausulaInicial = d.clausula_inicial_split != null
          ? d.clausula_inicial_split
          : round1(precioCompra * 2);

        if (mantenerInicial === 0 && clausulaInicial === 0) continue;

        pilotResetWrites.push(updateDoc(pDoc.ref, {
          mantener_inicial_split: mantenerInicial,
          clausula_inicial_split: clausulaInicial,
          // Reset al estado limpio (antes de cualquier carrera)
          mantener_actual: mantenerInicial,
          clausula_actual: clausulaInicial,
          precio_carrera_anterior: mantenerInicial,
          historial_precios: {},
        }));
      }
    }

    await Promise.all(pilotResetWrites);
    onProgress?.(
      pilotResetWrites.length > 0
        ? `✓ ${pilotResetWrites.length} pilotos con precios inicializados.`
        : `⚠ Ningún piloto tiene precio_compra_split > 0 — revisa los datos en Firebase.`
    );

    // ── 2. Leer circuitos y resetear economia_procesada para forzar re-proceso ─
    onProgress?.("Cargando y limpiando circuitos del split…");
    const circuitosSnap = await getDocs(collection(db, `splits/${splitId}/circuitos`));
    const allCircuits = circuitosSnap.docs.map(d => ({ ref: d.ref, id: d.id, ...d.data() as any }));

    // Limpiar economia_procesada en todos los circuitos para forzar reproceso correcto
    const circuitResetWrites = allCircuits.map(c =>
      updateDoc(c.ref, { economia_procesada: false })
    );
    await Promise.all(circuitResetWrites);
    onProgress?.(`✓ economia_procesada limpiada en ${allCircuits.length} circuitos.`);

    // Ordenar: numero_carrera > fecha (Timestamp o string) > id alfabético
    const toMs = (fecha: any): number => {
      if (!fecha) return 0;
      if (typeof fecha?.toMillis === "function") return fecha.toMillis();
      if (typeof fecha === "string") return new Date(fecha).getTime() || 0;
      return 0;
    };

    const completados = allCircuits
      .filter(c => c.completado)
      .sort((a, b) => {
        if (a.numero_carrera && b.numero_carrera) return a.numero_carrera - b.numero_carrera;
        if (a.numero_carrera) return -1;
        if (b.numero_carrera) return 1;
        const fa = toMs(a.fecha), fb = toMs(b.fecha);
        if (fa !== fb) return fa - fb;
        return a.id.localeCompare(b.id);
      });

    onProgress?.(`Circuitos completados (ordenados): ${completados.map(c => `${c.nombre || c.id}(${c.numero_carrera ?? '?'})`).join(" → ")}`);

    if (completados.length === 0) {
      onProgress?.("⚠ No hay circuitos con completado=true en este split. Verifica en Firebase.");
      return { ok: 0, skipped: 0, message: "No hay circuitos completados para procesar." };
    }

    const conResultados = completados.filter(c => Array.isArray(c.resultados) && c.resultados.length > 0);
    if (conResultados.length < completados.length) {
      onProgress?.(`⚠ ${completados.length - conResultados.length} circuito(s) sin resultados — se omiten.`);
    }

    if (conResultados.length === 0) {
      onProgress?.("⚠ Ningún circuito completado tiene resultados. Verifica que processRace() se ejecutó.");
      return { ok: 0, skipped: 0, message: "Circuitos completos pero sin resultados." };
    }

    onProgress?.(`Procesando ${conResultados.length} circuito(s) en orden: ${conResultados.map(c => c.nombre || c.id).join(" → ")}`);

    // ── 3. Procesar en secuencia (el decay de precios depende del orden) ────
    let ok = 0;
    let skipped = 0;

    for (const c of conResultados) {
      if (c.economia_procesada) {
        skipped++;
        onProgress?.(`  ↳ ${c.nombre || c.id} — ya procesado, saltando.`);
        continue;
      }

      onProgress?.(`  ↳ Procesando ${c.nombre || c.id}…`);
      const result = await procesarEconomiaCarrera(splitId, c.id, c.nombre || c.id);

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

// ─── HELPERS INTERNOS ─────────────────────────────────────────────────────────

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
