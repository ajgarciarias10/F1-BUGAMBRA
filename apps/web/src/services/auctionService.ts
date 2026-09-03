import {
  doc, getDoc, getDocs, collection, setDoc, updateDoc, deleteDoc,
  addDoc, runTransaction, serverTimestamp, writeBatch,
} from "firebase/firestore";
import { db } from "./firebase";
import {
  CLAUSULA_LA_COBRA_EL_VENDEDOR, clausulaInicialDe, ficharPiloto,
  findPilotEntry, mantenerInicialDe,
} from "./economyService";

// ─── SUBASTA EN VIVO ─────────────────────────────────────────────────────────
// El día de mercado no hay precio de salida: cualquier jeque elegible puede poner la
// primera cifra. A partir de ahí puja quien quiera, el equipo que tenía al piloto incluido,
// y quien no se lo lleve lo pierde. El reloj empieza con la primera puja y solo el admin
// puede conceder una prórroga manual.
//
// El modo simulacro aplica temporalmente dinero y roster para probar el recorrido completo,
// pero conserva una copia que permite deshacer la adjudicación sin dejar datos de prueba.

export type EstadoSubasta = "inactiva" | "esperando_apertura" | "en_curso" | "adjudicada";
export type ModoSubasta = "real" | "simulacro";
export type TipoOperacion = "subasta" | "clausula" | "mantener";

export const DURACION_POR_DEFECTO = 60;
export const PRORROGA_POR_DEFECTO = 15;
export const PLAZAS_POR_EQUIPO = 4;

interface ReversionSimulacion {
  equipoGanadorId: string;
  presupuestoAnterior: number;
  pilotoId: string;
  equipoOrigenId: string | null;
  pilotoOrigen: Record<string, unknown> | null;
  pilotoDestinoAnterior: Record<string, unknown> | null;
}

export interface SalaSubasta {
  estado: EstadoSubasta;
  modo: ModoSubasta;
  /** Momento en que se abre el mercado, en epoch ms. Hasta entonces solo hay cuenta atrás. */
  apertura_programada: number | null;
  duracion_segundos: number;
  prorroga_segundos: number;
  plazas_por_equipo: number;
  pilotoId: string | null;
  pilotoNombre: string | null;
  pilotoOvr: number | null;
  tipo_operacion: TipoOperacion;
  equipo_anterior_id: string | null;
  equipo_anterior_nombre: string | null;
  abridor_equipo_id: string | null;
  abridor_equipo_nombre: string | null;
  puja_actual: number | null;
  puja_equipo_id: string | null;
  puja_equipo_nombre: string | null;
  termina_en: number | null;
  prorrogada: number;
  adjudicacion: {
    equipoId: string;
    equipoNombre: string;
    precio: number;
    vendedorId: string | null;
    vendedorNombre: string | null;
    modo: ModoSubasta;
    desierta: boolean;
  } | null;
  simulacion_reversiones: ReversionSimulacion[];
}

const salaRef = (splitId: string) => doc(db, `splits/${splitId}/subasta`, "sala");
const pujasRef = (splitId: string) => collection(db, `splits/${splitId}/subasta/sala/pujas`);

export const SALA_VACIA: SalaSubasta = {
  estado: "inactiva",
  modo: "simulacro",
  apertura_programada: null,
  duracion_segundos: DURACION_POR_DEFECTO,
  prorroga_segundos: PRORROGA_POR_DEFECTO,
  plazas_por_equipo: PLAZAS_POR_EQUIPO,
  pilotoId: null, pilotoNombre: null, pilotoOvr: null,
  tipo_operacion: "subasta",
  equipo_anterior_id: null, equipo_anterior_nombre: null,
  abridor_equipo_id: null, abridor_equipo_nombre: null,
  puja_actual: null, puja_equipo_id: null, puja_equipo_nombre: null,
  termina_en: null, prorrogada: 0,
  adjudicacion: null,
  simulacion_reversiones: [],
};

// ─── ESTADO DE LAS ESCUDERÍAS ────────────────────────────────────────────────

export interface EquipoEnSubasta {
  id: string;
  nombre: string;
  presupuesto: number;
  plantilla: number;
  completo: boolean;
}

export async function leerEquiposDeSubasta(
  splitId: string,
  plazasPorEquipo = PLAZAS_POR_EQUIPO,
): Promise<EquipoEnSubasta[]> {
  const equiposSnap = await getDocs(collection(db, `splits/${splitId}/equipos`));
  const equipos: EquipoEnSubasta[] = [];

  for (const equipoDoc of equiposSnap.docs) {
    if (equipoDoc.id === "agente_libre") continue;
    const data = equipoDoc.data() as any;
    const pilotosSnap = await getDocs(collection(db, `splits/${splitId}/equipos/${equipoDoc.id}/pilotos`));
    // Solo ocupan plaza los pilotos ya fichados para este split.
    const plantilla = pilotosSnap.docs.filter(pd => Number((pd.data() as any).precio_compra ?? 0) !== 0).length;
    equipos.push({
      id: equipoDoc.id,
      nombre: data.nombre || equipoDoc.id,
      presupuesto: Number(data.presupuesto ?? 0),
      plantilla,
      completo: plantilla >= plazasPorEquipo,
    });
  }
  return equipos.sort((a, b) => a.nombre.localeCompare(b.nombre));
}

// Una escudería completa no puede seguir pujando, y nadie puja por encima de su saldo.
export function puedePujar(equipo: EquipoEnSubasta, importe: number): { ok: boolean; motivo?: string } {
  if (equipo.completo) return { ok: false, motivo: "Plantilla completa: no puedes seguir pujando." };
  if (importe > equipo.presupuesto) return { ok: false, motivo: `Te faltan ${(importe - equipo.presupuesto).toFixed(1)}M para esa puja.` };
  return { ok: true };
}

// ─── CONFIGURACIÓN Y APERTURA ────────────────────────────────────────────────

export async function configurarSala(
  splitId: string,
  config: Partial<Pick<SalaSubasta, "modo" | "duracion_segundos" | "prorroga_segundos" | "plazas_por_equipo" | "apertura_programada">>,
): Promise<void> {
  await setDoc(salaRef(splitId), { ...config, actualizado_en: serverTimestamp() }, { merge: true });
}

export async function prorrogarSubasta(
  splitId: string,
): Promise<{ ok: boolean; message: string }> {
  try {
    return await runTransaction(db, async transaction => {
      const salaSnap = await transaction.get(salaRef(splitId));
      if (!salaSnap.exists()) return { ok: false, message: "No hay subasta abierta." };
      const sala = salaSnap.data() as SalaSubasta;
      if (sala.estado !== "en_curso" || sala.termina_en == null) {
        return { ok: false, message: "La prórroga solo puede darse durante una puja activa." };
      }
      const segundos = Math.max(0, sala.prorroga_segundos);
      if (segundos === 0) return { ok: false, message: "Configura una prórroga mayor que cero." };

      transaction.update(salaRef(splitId), {
        termina_en: Math.max(Date.now(), sala.termina_en) + segundos * 1000,
        prorrogada: (sala.prorrogada ?? 0) + 1,
        actualizado_en: serverTimestamp(),
      });
      return { ok: true, message: `Prórroga concedida: +${segundos}s.` };
    });
  } catch (error: any) {
    return { ok: false, message: `Error al conceder la prórroga: ${error.message}` };
  }
}

async function limpiarPujas(splitId: string): Promise<void> {
  const pujasSnap = await getDocs(pujasRef(splitId));
  await Promise.all(pujasSnap.docs.map(d => deleteDoc(d.ref)));
}

// Saca un piloto a subasta. La sala espera hasta que cualquier escudería elegible haga
// la primera oferta; en ese momento comienza el reloj compartido.
export async function sacarPilotoASubasta(
  splitId: string,
  piloto: { id: string; nombre: string; ovr?: number | null; equipoAnteriorId?: string | null; equipoAnteriorNombre?: string | null },
  tipo: TipoOperacion,
): Promise<{ ok: boolean; message: string }> {
  const [salaSnap, splitSnap] = await Promise.all([
    getDoc(salaRef(splitId)),
    getDoc(doc(db, "splits", splitId)),
  ]);
  const sala = { ...SALA_VACIA, ...(salaSnap.data() as Partial<SalaSubasta> | undefined) };
  if (splitSnap.exists() && splitSnap.data().fichajes_abiertos === false) {
    return { ok: false, message: "El mercado está cerrado para este split." };
  }
  if (sala.modo === "real" && sala.simulacion_reversiones.length > 0) {
    return { ok: false, message: "Deshaz las adjudicaciones simuladas antes de usar el modo real." };
  }

  // La cita es del mercado de verdad. El simulacro está siempre disponible, que para eso es
  // el ensayo: si no, poner la fecha bloquearía las pruebas previas.
  if (sala.modo === "real" && sala.apertura_programada != null && Date.now() < sala.apertura_programada) {
    return { ok: false, message: `El mercado no abre hasta el ${new Date(sala.apertura_programada).toLocaleString("es-ES")}.` };
  }

  const equipos = await leerEquiposDeSubasta(splitId, sala.plazas_por_equipo);
  const elegibles = equipos.filter(equipo => !equipo.completo);
  if (elegibles.length === 0) {
    return { ok: false, message: "Todas las escuderías tienen la plantilla completa." };
  }

  await limpiarPujas(splitId);
  await setDoc(salaRef(splitId), {
    ...sala,
    estado: "esperando_apertura" as EstadoSubasta,
    pilotoId: piloto.id,
    pilotoNombre: piloto.nombre,
    pilotoOvr: piloto.ovr ?? null,
    tipo_operacion: tipo,
    equipo_anterior_id: piloto.equipoAnteriorId ?? null,
    equipo_anterior_nombre: piloto.equipoAnteriorNombre ?? null,
    abridor_equipo_id: null,
    abridor_equipo_nombre: null,
    puja_actual: null, puja_equipo_id: null, puja_equipo_nombre: null,
    termina_en: null, prorrogada: 0,
    adjudicacion: null,
    actualizado_en: serverTimestamp(),
  });

  return { ok: true, message: `${piloto.nombre} ya está disponible para todos los jeques.` };
}

// ─── PUJAS ───────────────────────────────────────────────────────────────────

// La apertura y las pujas siguientes comparten transacción: el estado de la sala es la
// única fuente de verdad y dos jeques pujando a la vez no pueden pisarse.
export async function pujar(
  splitId: string,
  equipo: { id: string; nombre: string },
  importe: number,
): Promise<{ ok: boolean; message: string }> {
  if (!Number.isFinite(importe)) return { ok: false, message: "Importe no válido." };
  const cifra = Math.round(importe * 10) / 10;

  try {
    const resultado = await runTransaction(db, async transaction => {
      const salaSnap = await transaction.get(salaRef(splitId));
      if (!salaSnap.exists()) return { ok: false, message: "No hay subasta abierta." };
      const sala = salaSnap.data() as SalaSubasta;

      if (sala.estado === "en_curso") {
        if (sala.termina_en != null && Date.now() > sala.termina_en) {
          return { ok: false, message: "El tiempo se agotó." };
        }
        if (sala.puja_actual != null && cifra <= sala.puja_actual) {
          return { ok: false, message: `Hay que superar los ${sala.puja_actual}M.` };
        }
      } else if (sala.estado !== "esperando_apertura") {
        return { ok: false, message: "La subasta no está abierta." };
      }

      const equipoSnap = await transaction.get(doc(db, `splits/${splitId}/equipos`, equipo.id));
      const presupuesto = Number(equipoSnap.data()?.presupuesto ?? 0);
      if (cifra > presupuesto) {
        return { ok: false, message: `Te faltan ${(cifra - presupuesto).toFixed(1)}M para esa puja.` };
      }

      const ahora = Date.now();
      const abriendo = sala.estado === "esperando_apertura";
      const terminaEn = abriendo
        ? ahora + sala.duracion_segundos * 1000
        : sala.termina_en;

      transaction.update(salaRef(splitId), {
        estado: "en_curso" as EstadoSubasta,
        puja_actual: cifra,
        puja_equipo_id: equipo.id,
        puja_equipo_nombre: equipo.nombre,
        termina_en: terminaEn,
        actualizado_en: serverTimestamp(),
      });

      return { ok: true, message: abriendo ? `Apertura en ${cifra}M.` : `Puja de ${cifra}M.`, abriendo };
    });

    if (resultado.ok) {
      await addDoc(pujasRef(splitId), {
        equipoId: equipo.id, equipoNombre: equipo.nombre, importe: cifra,
        apertura: !!(resultado as any).abriendo,
        prorroga: false,
        creado_en: serverTimestamp(),
        instante: Date.now(),
      });
    }
    return { ok: resultado.ok, message: resultado.message };
  } catch (error: any) {
    return { ok: false, message: `Error al pujar: ${error.message}` };
  }
}

async function aplicarAdjudicacionSimulada(
  splitId: string,
  sala: SalaSubasta,
  ganadorId: string,
  ganadorNombre: string,
  precio: number,
  vendedorId: string | null,
): Promise<{ ok: boolean; message: string }> {
  if (!sala.pilotoId) return { ok: false, message: "La sala no tiene piloto." };

  const ganadorRef = doc(db, `splits/${splitId}/equipos`, ganadorId);
  const [ganadorSnap, origen] = await Promise.all([
    getDoc(ganadorRef),
    findPilotEntry(splitId, sala.pilotoId),
  ]);
  if (!ganadorSnap.exists()) return { ok: false, message: "La escudería ganadora ya no existe." };

  const destinoRef = doc(db, `splits/${splitId}/equipos/${ganadorId}/pilotos`, sala.pilotoId);
  const destinoAnteriorSnap = origen?.equipoId === ganadorId ? null : await getDoc(destinoRef);
  const presupuestoAnterior = Number(ganadorSnap.data().presupuesto ?? 0);
  const delta = precio < 0 ? Math.abs(precio) : -precio;
  const mantener = mantenerInicialDe(precio);
  const clausula = clausulaInicialDe(precio);
  const datosPiloto = origen?.data || {
    pilotoId: sala.pilotoId,
    nombre: sala.pilotoNombre || sala.pilotoId,
    rating_piloto: sala.pilotoOvr || 70,
    puntos_piloto: 0,
    victorias: 0,
    podios: 0,
    poles: 0,
    dnfs: 0,
    carreras_limpias: 0,
  };

  const batch = writeBatch(db);
  batch.set(destinoRef, {
    ...datosPiloto,
    pilotoId: sala.pilotoId,
    equipoId: ganadorId,
    precio_compra: precio,
    mantener_actual: mantener,
    clausula_actual: clausula,
    mantener_inicial_split: mantener,
    clausula_inicial_split: clausula,
    precio_carrera_anterior: mantener,
    historial_precios: {},
  });
  if (origen && origen.equipoId !== ganadorId) batch.delete(origen.ref);
  batch.update(ganadorRef, { presupuesto: presupuestoAnterior + delta });
  batch.update(salaRef(splitId), {
    estado: "adjudicada" as EstadoSubasta,
    adjudicacion: {
      equipoId: ganadorId,
      equipoNombre: ganadorNombre,
      precio,
      vendedorId,
      vendedorNombre: vendedorId ? sala.equipo_anterior_nombre : null,
      modo: sala.modo,
      desierta: false,
    },
    simulacion_reversiones: [...sala.simulacion_reversiones, {
        equipoGanadorId: ganadorId,
        presupuestoAnterior,
        pilotoId: sala.pilotoId,
        equipoOrigenId: origen?.equipoId ?? null,
        pilotoOrigen: origen?.data ?? null,
        pilotoDestinoAnterior: destinoAnteriorSnap?.exists() ? destinoAnteriorSnap.data() : null,
      }],
    actualizado_en: serverTimestamp(),
  });
  await batch.commit();

  return {
    ok: true,
    message: `${sala.pilotoNombre} → ${ganadorNombre} por ${precio.toFixed(1)}M (simulacro reversible).`,
  };
}

async function revertirAdjudicacionSimulada(splitId: string, copia: ReversionSimulacion): Promise<void> {
  const ganadorRef = doc(db, `splits/${splitId}/equipos`, copia.equipoGanadorId);
  const destinoRef = doc(db, `splits/${splitId}/equipos/${copia.equipoGanadorId}/pilotos`, copia.pilotoId);
  const batch = writeBatch(db);
  batch.update(ganadorRef, { presupuesto: copia.presupuestoAnterior });

  if (copia.equipoOrigenId === copia.equipoGanadorId && copia.pilotoOrigen) {
    batch.set(destinoRef, copia.pilotoOrigen as any);
  } else {
    if (copia.pilotoDestinoAnterior) batch.set(destinoRef, copia.pilotoDestinoAnterior as any);
    else batch.delete(destinoRef);
    if (copia.equipoOrigenId && copia.pilotoOrigen) {
      batch.set(
        doc(db, `splits/${splitId}/equipos/${copia.equipoOrigenId}/pilotos`, copia.pilotoId),
        copia.pilotoOrigen as any,
      );
    }
  }
  await batch.commit();
}

export async function deshacerAdjudicacionSimulada(
  splitId: string,
): Promise<{ ok: boolean; message: string }> {
  try {
    const salaSnap = await getDoc(salaRef(splitId));
    if (!salaSnap.exists()) return { ok: false, message: "No hay simulación que deshacer." };
    const sala = { ...SALA_VACIA, ...(salaSnap.data() as Partial<SalaSubasta>) };
    if (sala.simulacion_reversiones.length === 0) return { ok: false, message: "No hay cambios simulados que deshacer." };
    for (const copia of [...sala.simulacion_reversiones].reverse()) {
      await revertirAdjudicacionSimulada(splitId, copia);
    }
    await limpiarPujas(splitId);
    await setDoc(salaRef(splitId), {
      ...SALA_VACIA,
      modo: sala.modo,
      apertura_programada: sala.apertura_programada,
      duracion_segundos: sala.duracion_segundos,
      prorroga_segundos: sala.prorroga_segundos,
      plazas_por_equipo: sala.plazas_por_equipo,
      actualizado_en: serverTimestamp(),
    });
    return { ok: true, message: "Simulacro deshecho: pilotos y presupuestos restaurados." };
  } catch (error: any) {
    return { ok: false, message: `Error al deshacer la adjudicación: ${error.message}` };
  }
}

// ─── ADJUDICACIÓN ────────────────────────────────────────────────────────────

// Cierra el reloj y entrega el piloto. En real cobra al ganador; en simulacro aplica el
// mismo movimiento de forma reversible para poder probar saldo, plantilla y siguientes pujas.
export async function adjudicarSubasta(
  splitId: string,
  forzar = false,
): Promise<{ ok: boolean; message: string }> {
  try {
    const salaSnap = await getDoc(salaRef(splitId));
    if (!salaSnap.exists()) return { ok: false, message: "No hay subasta que cerrar." };
    const sala = { ...SALA_VACIA, ...(salaSnap.data() as Partial<SalaSubasta>) };

    if (sala.estado === "adjudicada") return { ok: false, message: "Esta subasta ya está adjudicada." };
    if (sala.estado === "inactiva") return { ok: false, message: "No hay subasta abierta." };
    if (!forzar && sala.estado === "en_curso" && sala.termina_en != null && sala.termina_en > Date.now()) {
      return { ok: false, message: "La subasta no puede adjudicarse mientras quede tiempo." };
    }

    // Sin ninguna puja el piloto se queda sin dueño: nadie lo quiso a ningún precio.
    if (sala.estado === "esperando_apertura" || sala.puja_actual == null || !sala.puja_equipo_id) {
      await updateDoc(salaRef(splitId), {
        estado: "adjudicada" as EstadoSubasta,
        adjudicacion: {
          equipoId: "agente_libre", equipoNombre: "Agentes libres", precio: 0,
          vendedorId: sala.equipo_anterior_id, vendedorNombre: sala.equipo_anterior_nombre,
          modo: sala.modo, desierta: true,
        },
        actualizado_en: serverTimestamp(),
      });
      return { ok: true, message: `${sala.pilotoNombre} queda desierto: sigue libre.` };
    }

    const precio = sala.puja_actual;
    const ganadorId = sala.puja_equipo_id;
    const ganadorNombre = sala.puja_equipo_nombre || ganadorId;
    // El dinero de la cláusula se retira del sistema, así que no hay nadie que cobre. Si la
    // liga cambia de opinión basta con CLAUSULA_LA_COBRA_EL_VENDEDOR.
    const vendedorId = CLAUSULA_LA_COBRA_EL_VENDEDOR
      && sala.tipo_operacion === "clausula"
      && sala.equipo_anterior_id
      && sala.equipo_anterior_id !== ganadorId
      && sala.equipo_anterior_id !== "agente_libre"
      ? sala.equipo_anterior_id
      : null;

    if (sala.modo === "simulacro") {
      return await aplicarAdjudicacionSimulada(splitId, sala, ganadorId, ganadorNombre, precio, vendedorId);
    }

    if (sala.pilotoId) {
      // ficharPiloto ya mueve al piloto, fija su curva de precios, cobra al comprador y
      // abona la cláusula al vendedor: la subasta solo le pasa el desenlace.
      const resultado = await ficharPiloto({
        splitId,
        teamId: ganadorId,
        teamName: ganadorNombre,
        pilotoId: sala.pilotoId,
        pilotName: sala.pilotoNombre || sala.pilotoId,
        tipo: sala.tipo_operacion === "clausula" ? "clausula" : "subasta",
        precio,
      });
      if (!resultado.success) return { ok: false, message: resultado.message };
    }

    await updateDoc(salaRef(splitId), {
      estado: "adjudicada" as EstadoSubasta,
      adjudicacion: {
        equipoId: ganadorId, equipoNombre: ganadorNombre, precio,
        vendedorId, vendedorNombre: vendedorId ? sala.equipo_anterior_nombre : null,
        modo: sala.modo, desierta: false,
      },
      simulacion_reversiones: [],
      actualizado_en: serverTimestamp(),
    });

    return {
      ok: true,
      message: `${sala.pilotoNombre} → ${ganadorNombre} por ${precio}M`
        + (vendedorId ? ` · ${sala.equipo_anterior_nombre} cobra ${precio}M` : ""),
    };
  } catch (error: any) {
    return { ok: false, message: `Error al adjudicar: ${error.message}` };
  }
}

export async function cerrarSala(splitId: string, revertirSimulacion = true): Promise<void> {
  const salaSnap = await getDoc(salaRef(splitId));
  const sala = { ...SALA_VACIA, ...(salaSnap.data() as Partial<SalaSubasta> | undefined) };
  if (revertirSimulacion) {
    for (const copia of [...sala.simulacion_reversiones].reverse()) {
      await revertirAdjudicacionSimulada(splitId, copia);
    }
  }
  await limpiarPujas(splitId);
  await setDoc(salaRef(splitId), {
    ...SALA_VACIA,
    modo: sala.modo,
    apertura_programada: sala.apertura_programada,
    duracion_segundos: sala.duracion_segundos,
    prorroga_segundos: sala.prorroga_segundos,
    plazas_por_equipo: sala.plazas_por_equipo,
    simulacion_reversiones: revertirSimulacion ? [] : sala.simulacion_reversiones,
    actualizado_en: serverTimestamp(),
  });
}

export async function comenzarTemporada(
  splitId: string,
): Promise<{ ok: boolean; message: string }> {
  try {
    const [salaSnap, splitsSnap] = await Promise.all([
      getDoc(salaRef(splitId)),
      getDocs(collection(db, "splits")),
    ]);
    const sala = salaSnap.exists() ? { ...SALA_VACIA, ...(salaSnap.data() as Partial<SalaSubasta>) } : SALA_VACIA;
    if (sala.estado === "en_curso" || sala.estado === "esperando_apertura") {
      return { ok: false, message: "Termina o vacía la subasta antes de comenzar la temporada." };
    }
    if (sala.simulacion_reversiones.length > 0) {
      return { ok: false, message: "Deshaz las adjudicaciones simuladas antes de comenzar la temporada." };
    }

    const selected = splitsSnap.docs.find(splitDoc => splitDoc.id === splitId);
    if (!selected) return { ok: false, message: "El split seleccionado no existe." };
    await cerrarSala(splitId, false);
    const batch = writeBatch(db);
    splitsSnap.docs.forEach(splitDoc => {
      if (splitDoc.id !== splitId && splitDoc.data().activo) {
        batch.update(splitDoc.ref, { activo: false });
      }
    });
    batch.update(selected.ref, {
      activo: true,
      completado: false,
      fichajes_abiertos: false,
      temporada_iniciada: true,
      temporada_iniciada_en: serverTimestamp(),
    });
    await batch.commit();
    return { ok: true, message: `${selected.data().nombre || splitId} ha comenzado. Mercado cerrado.` };
  } catch (error: any) {
    return { ok: false, message: `Error al comenzar la temporada: ${error.message}` };
  }
}
