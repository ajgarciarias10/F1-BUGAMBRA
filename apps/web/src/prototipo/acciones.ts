/**
 * Acciones del diseño aprobado que escriben en la liga. Cada una traduce los ids del prototipo
 * (escudería «alfa», piloto «fabi», GP por número) a los de Firestore y llama al mismo servicio
 * auditado que el panel clásico: aquí no hay reglas de dinero propias.
 * Se carga bajo demanda desde sesion.ts, la primera vez que se usa una acción.
 */
import { collection, getDoc, getDocs, doc } from "firebase/firestore";
import { db } from "../services/firebase";
import { anularPacto, asegurarSplitSiguiente, deshacerAlta, guardarPacto } from "../services/transferService";
import { procesarEconomiaCarrera } from "../services/economyService";
import { applyTeamEconomyCorrection, runAuditedAdminBatch } from "../services/adminMutationService";
import { planBooleanFlag } from "../utils/adminMutationPlans";
import { guardarRivalidades, leerPlantillaSplit } from "../services/rivalidadesService";
import { crearSugerencia } from "../services/sugerenciasService";
import { equipoDelPrototipo, pilotoDelPrototipo } from "./perfil";

export interface Resultado { ok: boolean; mensaje?: string }

const TIPOS = ["subasta", "clausula", "mantener"];

async function escuderiaFirestore(splitId: string, equipo: string) {
  const equipos = await getDocs(collection(db, `splits/${splitId}/equipos`));
  const encontrado = equipos.docs.find(team => equipoDelPrototipo(team.id, team.data().nombre) === equipo);
  if (!encontrado) throw new Error(`No encuentro la escudería ${equipo} en este split.`);
  return encontrado;
}

/** La ficha del piloto en el split, esté en la escudería que esté. */
async function fichaFirestore(splitId: string, slug: string) {
  const equipos = await getDocs(collection(db, `splits/${splitId}/equipos`));
  for (const team of equipos.docs) {
    const fichas = await getDocs(collection(db, `splits/${splitId}/equipos/${team.id}/pilotos`));
    const ficha = fichas.docs.find(pilot => pilotoDelPrototipo(pilot.id) === slug);
    if (ficha) return { equipo: team, ficha };
  }
  throw new Error("No encuentro la ficha de ese piloto en este split. Recarga la página.");
}

async function circuitosPorOrden(splitId: string) {
  const circuitos = await getDocs(collection(db, `splits/${splitId}/circuitos`));
  return circuitos.docs.map(c => ({ id: c.id, ...c.data() } as Record<string, any>))
    .sort((a, b) => Number(a.numero_carrera) - Number(b.numero_carrera));
}

export async function pactar(p: { splitId: string; slug: string; destino: string; precio: number; tipo: string }): Promise<Resultado> {
  if (!TIPOS.includes(p.tipo)) return { ok: false, mensaje: "Elige el tipo de operación: subasta, cláusula o mantener." };
  if (!Number.isFinite(p.precio)) return { ok: false, mensaje: "Escribe un precio válido." };
  const [{ equipo, ficha }, destino, circuitos] = await Promise.all([
    fichaFirestore(p.splitId, p.slug), escuderiaFirestore(p.splitId, p.destino), circuitosPorOrden(p.splitId),
  ]);
  const siguiente = await asegurarSplitSiguiente(p.splitId);
  await guardarPacto({
    splitId: p.splitId, nextSplitId: siguiente.id, equipoOrigenId: equipo.id, pilotoId: ficha.id,
    equipoDestinoId: destino.id, precio: p.precio, tipo: p.tipo,
    circuitoId: circuitos.filter(c => c.completado).at(-1)?.id ?? null,
  });
  const nombre = ficha.data().nombre || p.slug;
  return { ok: true, mensaje: `Pacto de ${nombre} con ${destino.data().nombre} guardado.${siguiente.creado ? ` ${siguiente.nombre} creado vacío para guardarlo.` : ""}` };
}

/** Deshace lo último que movió dinero con ese piloto: su pacto pendiente o, si no tiene, su alta. */
export async function deshacer(p: { splitId: string; slug: string }): Promise<Resultado> {
  const { equipo, ficha } = await fichaFirestore(p.splitId, p.slug);
  const nombre = ficha.data().nombre || p.slug;
  if (ficha.data().pending_equipoId) {
    const split = await getDoc(doc(db, "splits", p.splitId));
    const resultado = await anularPacto(p.splitId, equipo.id, ficha.id, `split_${Number(split.data()?.orden) + 1}`);
    return { ok: true, mensaje: `Pacto de ${nombre} anulado e importe devuelto.${resultado === "sin-foto" ? " Era un pacto antiguo: revisa la plantilla del split siguiente." : ""}` };
  }
  await deshacerAlta(p.splitId, equipo.id, ficha.id);
  return { ok: true, mensaje: `Alta de ${nombre} anulada: saldo compensado y ficha anterior restaurada.` };
}

export async function corregirPrecio(p: { splitId: string; slug: string; precio: number; motivo: string }): Promise<Resultado> {
  if (!Number.isFinite(p.precio)) return { ok: false, mensaje: "Escribe un precio válido." };
  if (!p.motivo.trim()) return { ok: false, mensaje: "Escribe el motivo de la corrección." };
  const { equipo, ficha } = await fichaFirestore(p.splitId, p.slug);
  const saldo = equipo.data().presupuesto;
  if (saldo == null) return { ok: false, mensaje: `Falta el saldo registrado de ${equipo.data().nombre}.` };
  const resultado = await applyTeamEconomyCorrection({
    splitId: p.splitId, teamId: equipo.id, expectedBalance: saldo, reason: p.motivo.trim(),
    priceChanges: [{ pilotId: ficha.id, pilotName: ficha.data().nombre || p.slug, expectedPrice: ficha.data().precio_compra, newPrice: p.precio }],
  });
  return { ok: resultado.applied, mensaje: resultado.message };
}

/** Procesa la economía del GP número `n` de la temporada, como el botón del panel. */
export async function procesarEconomia(p: { splitId: string; n: number }): Promise<Resultado> {
  const circuitos = await circuitosPorOrden(p.splitId);
  const primero = Number(circuitos[0]?.numero_carrera);
  // El diseño numera los GP seguidos en la temporada (13–18 en el Split 3); Firestore, igual o desde 1.
  const indice = circuitos.findIndex(c => Number(c.numero_carrera) === p.n);
  const i = indice >= 0 ? indice : p.n - primero;
  const circuito = circuitos[i];
  if (!circuito) return { ok: false, mensaje: `No encuentro el GP ${p.n} en este split.` };
  if (circuito.economia_procesada) return { ok: false, mensaje: "Ese GP ya está procesado." };
  const resultado = await procesarEconomiaCarrera(p.splitId, circuito.id, circuito.nombre, undefined, circuitos.slice(0, i).map(c => c.id));
  return { ok: resultado.processed > 0, mensaje: resultado.message };
}

export async function rivalidades(p: { splitId: string; grupos: { id: string; pilotos: string[] }[] }): Promise<Resultado> {
  const plantilla = await leerPlantillaSplit(p.splitId);
  const idDe = (slug: string) => plantilla.roster.find(pilot => pilotoDelPrototipo(pilot.pilotoId) === slug)?.pilotoId;
  const grupos = p.grupos.map(g => ({ id: g.id, pilotoIds: g.pilotos.map(slug => idDe(slug) || `piloto_${slug}`) }));
  await guardarRivalidades(p.splitId, grupos, plantilla);
  return { ok: true, mensaje: "Rivalidades guardadas." };
}

/** Abre o cierra la ventana de fichajes del split, como el interruptor del panel. `abierto` es lo que ve el admin. */
export async function alternarMercado(p: { splitId: string; abierto: boolean }): Promise<Resultado> {
  const ref = doc(db, "splits", p.splitId);
  await runAuditedAdminBatch({
    refs: [ref],
    action: "fichajes_abiertos_toggle",
    summary: `Ventana de fichajes ${p.abierto ? "cerrada" : "abierta"} en ${p.splitId}`,
    apply: currents => ({
      writes: { [ref.path]: planBooleanFlag(currents[ref.path], "fichajes_abiertos", p.abierto, { mercado_cerrado_por_plantillas: false }).after },
    }),
  });
  return { ok: true, mensaje: p.abierto ? "Mercado cerrado: deja de verse en la app." : "Mercado abierto: ya aparece en el menú de todos." };
}

/** Del desplegable del diseño a las categorías del buzón de la app. */
const CATEGORIA: Record<string, string> = { "Economía y Mercado": "mercado", "Carreras y FIA": "reglas", "Comunidad": "otros", "Televisión": "otros" };

export async function proponer(p: { categoria: string; titulo: string }, autor: { uid: string; nombre: string; email: string; rol: string }): Promise<Resultado> {
  if (!p.titulo.trim()) return { ok: false, mensaje: "Escribe tu propuesta." };
  await crearSugerencia({
    titulo: p.titulo.trim(), descripcion: "", categoria: CATEGORIA[p.categoria] || "otros",
    usuario_nombre: autor.nombre, usuario_uid: autor.uid, usuario_email: autor.email, usuario_rol: autor.rol,
  });
  return { ok: true, mensaje: "Propuesta enviada al comisario." };
}
