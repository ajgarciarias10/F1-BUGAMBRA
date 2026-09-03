import {
  doc, getDoc, getDocs, collection, setDoc, updateDoc, deleteDoc,
  addDoc, runTransaction, serverTimestamp,
} from "firebase/firestore";
import { db } from "./firebase";
import { CLAUSULA_LA_COBRA_EL_VENDEDOR, ficharPiloto } from "./economyService";

// ─── SUBASTA EN VIVO ─────────────────────────────────────────────────────────
// El día de mercado no hay precio de salida: se sortea quién abre y ese jeque pone la
// primera cifra. A partir de ahí puja quien quiera, el equipo que tenía al piloto incluido,
// y quien no se lo lleve lo pierde. El reloj lo fija el admin; una puja en los últimos
// segundos lo prorroga para que nadie gane por esperar al final.
//
// El modo simulacro deja el mismo recorrido pero no toca dinero ni rosters: sirve para
// probarlo con gente antes de aplicarlo a la liga de verdad.

export type EstadoSubasta = "inactiva" | "esperando_apertura" | "en_curso" | "adjudicada";
export type ModoSubasta = "real" | "simulacro";
export type TipoOperacion = "subasta" | "clausula" | "mantener";

export const DURACION_POR_DEFECTO = 60;
export const PRORROGA_POR_DEFECTO = 15;
export const PLAZAS_POR_EQUIPO = 4;

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

async function limpiarPujas(splitId: string): Promise<void> {
  const pujasSnap = await getDocs(pujasRef(splitId));
  await Promise.all(pujasSnap.docs.map(d => deleteDoc(d.ref)));
}

// Saca un piloto a subasta y sortea quién abre. El sorteo es entre las escuderías que
// pueden pujar: sortear a una completa dejaría la puja muerta antes de empezar.
export async function sacarPilotoASubasta(
  splitId: string,
  piloto: { id: string; nombre: string; ovr?: number | null; equipoAnteriorId?: string | null; equipoAnteriorNombre?: string | null },
  tipo: TipoOperacion,
  abridorEquipoId?: string,
): Promise<{ ok: boolean; message: string; abridor?: EquipoEnSubasta }> {
  const salaSnap = await getDoc(salaRef(splitId));
  const sala = { ...SALA_VACIA, ...(salaSnap.data() as Partial<SalaSubasta> | undefined) };

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

  const abridorManual = sala.modo === "simulacro" && abridorEquipoId
    ? elegibles.find(equipo => equipo.id === abridorEquipoId)
    : undefined;
  if (sala.modo === "simulacro" && abridorEquipoId && !abridorManual) {
    return { ok: false, message: "El jeque elegido no puede participar en esta subasta." };
  }
  const abridor = abridorManual ?? elegibles[Math.floor(Math.random() * elegibles.length)];
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
    abridor_equipo_id: abridor.id,
    abridor_equipo_nombre: abridor.nombre,
    puja_actual: null, puja_equipo_id: null, puja_equipo_nombre: null,
    termina_en: null, prorrogada: 0,
    adjudicacion: null,
    actualizado_en: serverTimestamp(),
  });

  return { ok: true, message: `Abre ${abridor.nombre}.`, abridor };
}

export async function pasarTurnoApertura(
  splitId: string,
  equipoActualId: string,
): Promise<{ ok: boolean; message: string }> {
  try {
    const salaSnap = await getDoc(salaRef(splitId));
    if (!salaSnap.exists()) return { ok: false, message: "No hay subasta abierta." };
    const sala = salaSnap.data() as SalaSubasta;
    if (sala.estado !== "esperando_apertura") {
      return { ok: false, message: "El turno solo puede pasarse antes de la primera puja." };
    }
    if (sala.abridor_equipo_id !== equipoActualId) {
      return { ok: false, message: `La apertura le toca a ${sala.abridor_equipo_nombre}.` };
    }

    const elegibles = (await leerEquiposDeSubasta(splitId, sala.plazas_por_equipo))
      .filter(equipo => !equipo.completo);
    if (elegibles.length < 2) {
      return { ok: false, message: "No hay otro jeque elegible al que pasarle el turno." };
    }
    const indiceActual = elegibles.findIndex(equipo => equipo.id === equipoActualId);
    const siguiente = elegibles[indiceActual >= 0 ? (indiceActual + 1) % elegibles.length : 0];

    return await runTransaction(db, async transaction => {
      const actualSnap = await transaction.get(salaRef(splitId));
      const actual = actualSnap.data() as SalaSubasta | undefined;
      if (!actual || actual.estado !== "esperando_apertura") {
        return { ok: false, message: "La puja ya ha comenzado." };
      }
      if (actual.abridor_equipo_id !== equipoActualId) {
        return { ok: false, message: `El turno ya corresponde a ${actual.abridor_equipo_nombre}.` };
      }
      transaction.update(salaRef(splitId), {
        abridor_equipo_id: siguiente.id,
        abridor_equipo_nombre: siguiente.nombre,
        actualizado_en: serverTimestamp(),
      });
      return { ok: true, message: `${actual.abridor_equipo_nombre} pasa el turno a ${siguiente.nombre}.` };
    });
  } catch (error: any) {
    return { ok: false, message: `Error al pasar el turno: ${error.message}` };
  }
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

      if (sala.estado === "esperando_apertura") {
        if (sala.abridor_equipo_id !== equipo.id) {
          return { ok: false, message: `La apertura le toca a ${sala.abridor_equipo_nombre}.` };
        }
      } else if (sala.estado === "en_curso") {
        if (sala.termina_en != null && Date.now() > sala.termina_en) {
          return { ok: false, message: "El tiempo se agotó." };
        }
        if (sala.puja_equipo_id === equipo.id) {
          return { ok: false, message: "Ya tienes la puja más alta." };
        }
        if (sala.puja_actual != null && cifra <= sala.puja_actual) {
          return { ok: false, message: `Hay que superar los ${sala.puja_actual}M.` };
        }
      } else {
        return { ok: false, message: "La subasta no está abierta." };
      }

      const equipoSnap = await transaction.get(doc(db, `splits/${splitId}/equipos`, equipo.id));
      const presupuesto = Number(equipoSnap.data()?.presupuesto ?? 0);
      if (cifra > presupuesto) {
        return { ok: false, message: `Te faltan ${(cifra - presupuesto).toFixed(1)}M para esa puja.` };
      }

      const ahora = Date.now();
      const abriendo = sala.estado === "esperando_apertura";
      // Una puja en el tramo final estira el reloj: si no, ganaría quien pulse el último.
      const restante = sala.termina_en != null ? sala.termina_en - ahora : 0;
      const prorroga = !abriendo && restante < sala.prorroga_segundos * 1000;
      const terminaEn = abriendo
        ? ahora + sala.duracion_segundos * 1000
        : prorroga ? ahora + sala.prorroga_segundos * 1000 : sala.termina_en;

      transaction.update(salaRef(splitId), {
        estado: "en_curso" as EstadoSubasta,
        puja_actual: cifra,
        puja_equipo_id: equipo.id,
        puja_equipo_nombre: equipo.nombre,
        termina_en: terminaEn,
        prorrogada: (sala.prorrogada ?? 0) + (prorroga ? 1 : 0),
        actualizado_en: serverTimestamp(),
      });

      return { ok: true, message: abriendo ? `Apertura en ${cifra}M.` : `Puja de ${cifra}M.`, prorroga, abriendo };
    });

    if (resultado.ok) {
      await addDoc(pujasRef(splitId), {
        equipoId: equipo.id, equipoNombre: equipo.nombre, importe: cifra,
        apertura: !!(resultado as any).abriendo,
        prorroga: !!(resultado as any).prorroga,
        creado_en: serverTimestamp(),
        instante: Date.now(),
      });
    }
    return { ok: resultado.ok, message: resultado.message };
  } catch (error: any) {
    return { ok: false, message: `Error al pujar: ${error.message}` };
  }
}

// ─── ADJUDICACIÓN ────────────────────────────────────────────────────────────

// Cierra el reloj y entrega el piloto. En real cobra al ganador y, si fue por cláusula,
// paga a la escudería que lo pierde; en simulacro solo deja escrito el desenlace.
export async function adjudicarSubasta(
  splitId: string,
): Promise<{ ok: boolean; message: string }> {
  try {
    const salaSnap = await getDoc(salaRef(splitId));
    if (!salaSnap.exists()) return { ok: false, message: "No hay subasta que cerrar." };
    const sala = salaSnap.data() as SalaSubasta;

    if (sala.estado === "adjudicada") return { ok: false, message: "Esta subasta ya está adjudicada." };
    if (sala.estado === "inactiva") return { ok: false, message: "No hay subasta abierta." };

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

    if (sala.modo === "real" && sala.pilotoId) {
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
      actualizado_en: serverTimestamp(),
    });

    return {
      ok: true,
      message: `${sala.pilotoNombre} → ${ganadorNombre} por ${precio}M`
        + (vendedorId ? ` · ${sala.equipo_anterior_nombre} cobra ${precio}M` : "")
        + (sala.modo === "simulacro" ? " (simulacro: no se ha movido dinero)" : ""),
    };
  } catch (error: any) {
    return { ok: false, message: `Error al adjudicar: ${error.message}` };
  }
}

export async function cerrarSala(splitId: string): Promise<void> {
  const salaSnap = await getDoc(salaRef(splitId));
  const sala = { ...SALA_VACIA, ...(salaSnap.data() as Partial<SalaSubasta> | undefined) };
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
}
