/**
 * Acciones del diseño aprobado que escriben en la liga. Cada una traduce los ids del prototipo
 * (escudería «alfa», piloto «fabi», GP por número) a los de Firestore y llama al mismo servicio
 * auditado que el panel clásico: aquí no hay reglas de dinero propias.
 * Se carga bajo demanda desde sesion.ts, la primera vez que se usa una acción.
 */
import { collection, getDoc, getDocs, doc } from "firebase/firestore";
import { db } from "../services/firebase";
import { ajustarClausula, anularPacto, asegurarSplitSiguiente, deshacerAlta, guardarPacto, liberarPiloto } from "../services/transferService";
import { ficharPiloto, procesarEconomiaCarrera } from "../services/economyService";
import { processRace } from "../services/raceProcessor";
import { registerFiaDecision } from "../services/readModelService";
import { guardarLogoEquipo } from "../services/perfilService";
import { asignarUsuario, listarUsuarios } from "../services/usuariosService";
import { canPilotParticipateInRace } from "../services/readModels";
import { planActaCerrada } from "../utils/adminMutationPlans";
import { resultadosDelActa, type EntradaActa } from "../utils/actaResultados";
import { applyTeamEconomyCorrection, runAuditedAdminBatch } from "../services/adminMutationService";
import { planBooleanFlag } from "../utils/adminMutationPlans";
import { guardarRivalidades, leerPlantillaSplit } from "../services/rivalidadesService";
import { crearSugerencia } from "../services/sugerenciasService";
import { equipoDelPrototipo, pilotoDelPrototipo } from "./perfil";

const normalizar = (texto: string) => texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();

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

/** El GP número `n` del diseño, su posición en el split y los circuitos del split en orden. */
async function circuitoPorNumero(splitId: string, n: number) {
  const circuitos = await circuitosPorOrden(splitId);
  const primero = Number(circuitos[0]?.numero_carrera);
  // El diseño numera los GP seguidos en la temporada (13–18 en el Split 3); Firestore, igual o desde 1.
  const indice = circuitos.findIndex(c => Number(c.numero_carrera) === n);
  const i = indice >= 0 ? indice : n - primero;
  if (!circuitos[i]) throw new Error(`No encuentro el GP ${n} en este split.`);
  return { circuito: circuitos[i], i, circuitos };
}

/** Procesa la economía del GP número `n` de la temporada, como el botón del panel. */
export async function procesarEconomia(p: { splitId: string; n: number }): Promise<Resultado> {
  const { circuito, i, circuitos } = await circuitoPorNumero(p.splitId, p.n);
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

// ─── Segunda parte: acta, FIA, fichajes fuera de subasta, saldo, fichas, usuarios y logo ───

/** Una fila de la tabla del acta, tal cual la rellena el admin en el diseño. */
export interface FilaActa { slug: string; q: string; c: string; vr: boolean; limpio: boolean; sancion: string }

/**
 * Guarda los resultados del GP con la misma validación y el mismo servicio que el panel y,
 * si `cerrar`, cierra el acta (sin acta cerrada no se puede procesar la economía).
 */
export async function guardarActa(p: { splitId: string; n: number; filas: FilaActa[]; cerrar: boolean }): Promise<Resultado> {
  const [{ circuito }, plantilla] = await Promise.all([circuitoPorNumero(p.splitId, p.n), leerPlantillaSplit(p.splitId)]);
  if (circuito.acta_cerrada) return { ok: false, mensaje: "El acta de este GP ya está cerrada. Para corregirla, reábrela en el panel completo." };
  const entradas: EntradaActa[] = [];
  for (const f of p.filas) {
    const piloto = plantilla.roster.find(x => pilotoDelPrototipo(x.pilotoId) === f.slug);
    const nombre = piloto?.nombre || f.slug;
    if (!piloto) return { ok: false, mensaje: `${nombre} no está en la plantilla de este split.` };
    const noCorrio = [f.q, f.c].filter(v => v === "NC").length;
    if (noCorrio === 2) continue;
    if (noCorrio === 1) return { ok: false, mensaje: `${nombre}: marca «No corrió» en clasificación y en carrera, o pon sus dos puestos.` };
    if (f.sancion === "DSQ") return { ok: false, mensaje: `${nombre}: la descalificación se registra en el panel completo.` };
    entradas.push({
      pilotoId: piloto.pilotoId, nombre, qualyPos: f.q,
      // Con sanción, cuenta el puesto que fija la FIA; un DNF no tiene puesto.
      racePos: f.sancion || (f.c === "DNF" ? undefined : f.c), isDnf: f.c === "DNF" && !f.sancion,
      fastestLap: f.vr, isClean: f.limpio,
    });
  }
  const numero = Number(circuito.numero_carrera);
  const faltan = plantilla.roster.filter(x => x.equipoId !== "agente_libre" && canPilotParticipateInRace(x as any, numero) && !p.filas.some(f => f.slug === pilotoDelPrototipo(x.pilotoId)));
  if (faltan.length) return { ok: false, mensaje: `Faltan en el acta: ${faltan.map(x => x.nombre || x.pilotoId).join(", ")}.` };
  if (!entradas.length) return { ok: false, mensaje: "No hay pilotos que hayan corrido esta carrera." };
  await processRace(p.splitId, circuito.id, resultadosDelActa(entradas));
  if (!p.cerrar) return { ok: true, mensaje: `Resultados del GP ${p.n} guardados. El acta sigue abierta.` };
  const ref = doc(db, `splits/${p.splitId}/circuitos`, circuito.id);
  await runAuditedAdminBatch({
    refs: [ref], action: "acta_cerrada_close", summary: `Acta cerrada en ${circuito.id}`,
    apply: currents => ({ writes: { [ref.path]: planActaCerrada(currents[ref.path], true).after } }),
  });
  return { ok: true, mensaje: `Resultados guardados y acta del GP ${p.n} cerrada. Ya se puede procesar su economía.` };
}

/** Registra una decisión FIA ya anunciada. No cobra la multa: queda escrita en el efecto. */
export async function decisionFia(p: { splitId: string; n: number; piloto: string; motivo: string; efecto: string; multa: string }): Promise<Resultado> {
  if (!p.piloto.trim() || !p.motivo.trim()) return { ok: false, mensaje: "Indica el piloto y el motivo." };
  const [{ circuito }, plantilla] = await Promise.all([circuitoPorNumero(p.splitId, p.n), leerPlantillaSplit(p.splitId)]);
  const buscado = normalizar(p.piloto);
  const piloto = plantilla.roster.find(x => normalizar(x.nombre || "") === buscado || pilotoDelPrototipo(x.pilotoId) === buscado);
  if (!piloto) return { ok: false, mensaje: `No encuentro a «${p.piloto}» en la plantilla de este split.` };
  await registerFiaDecision(p.splitId, circuito.id, {
    id: `fia_${circuito.id}_${Date.now()}`, pilotoId: piloto.pilotoId, tipo: "Sanción", motivo: p.motivo.trim(),
    efecto_deportivo: [p.efecto.trim(), p.multa.trim() && `multa ${p.multa.trim()} (sin cobrar)`].filter(Boolean).join(" · "),
  });
  return { ok: true, mensaje: `Decisión FIA registrada para ${piloto.nombre || p.piloto}.` };
}

/** Fichaje fuera de la subasta, como el «Alta» del panel: el piloto sale del catálogo global. */
export async function fichar(p: { splitId: string; piloto: string; equipo: string; precio: number }): Promise<Resultado> {
  if (!Number.isFinite(p.precio)) return { ok: false, mensaje: "Escribe un precio válido." };
  if (p.equipo === "agente_libre") return { ok: false, mensaje: "Elige una escudería: a agentes libres no se ficha." };
  const [catalogo, equipo] = await Promise.all([getDocs(collection(db, "pilotos")), escuderiaFirestore(p.splitId, p.equipo)]);
  const buscado = normalizar(p.piloto);
  const piloto = catalogo.docs.find(x => normalizar(String(x.data().nombre || "")) === buscado || pilotoDelPrototipo(x.id) === buscado);
  if (!piloto) return { ok: false, mensaje: `«${p.piloto}» no está en el catálogo de pilotos. Créalo antes en el panel completo.` };
  const r = await ficharPiloto({
    splitId: p.splitId, teamId: equipo.id, teamName: equipo.data().nombre || equipo.id,
    pilotoId: piloto.id, pilotName: piloto.data().nombre || piloto.id, tipo: "fichaje", precio: p.precio,
  });
  return { ok: r.success, mensaje: r.message };
}

export async function ajustarSaldo(p: { splitId: string; equipo: string; importe: number; motivo: string }): Promise<Resultado> {
  if (!Number.isFinite(p.importe) || p.importe === 0) return { ok: false, mensaje: "Escribe un importe distinto de 0 (negativo para restar)." };
  if (!p.motivo.trim()) return { ok: false, mensaje: "Escribe el motivo del ajuste." };
  const equipo = await escuderiaFirestore(p.splitId, p.equipo);
  const saldo = equipo.data().presupuesto;
  if (saldo == null) return { ok: false, mensaje: `No se puede ajustar ${equipo.data().nombre}: falta un saldo registrado.` };
  const r = await applyTeamEconomyCorrection({ splitId: p.splitId, teamId: equipo.id, expectedBalance: saldo, reason: p.motivo.trim(), manualBudgetAdjustment: p.importe });
  return { ok: r.applied, mensaje: r.message };
}

export async function liberar(p: { splitId: string; slug: string }): Promise<Resultado> {
  const { equipo, ficha } = await fichaFirestore(p.splitId, p.slug);
  if (equipo.id === "agente_libre") return { ok: false, mensaje: "Ya es agente libre." };
  const nombre = ficha.data().nombre || p.slug;
  await liberarPiloto(p.splitId, equipo.id, ficha.id, nombre, equipo.data().nombre || equipo.id);
  return { ok: true, mensaje: `${nombre} ya es agente libre. Ningún presupuesto se ha movido.` };
}

/** `importe` null retira el ajuste manual y vuelve a la cláusula automática. */
export async function clausula(p: { splitId: string; slug: string; importe: number | null; motivo: string }): Promise<Resultado> {
  if (p.importe !== null && !Number.isFinite(p.importe)) return { ok: false, mensaje: "Escribe un importe válido o déjalo vacío para volver a la automática." };
  if (!p.motivo.trim()) return { ok: false, mensaje: "Escribe el motivo del ajuste de cláusula." };
  const { equipo, ficha } = await fichaFirestore(p.splitId, p.slug);
  await ajustarClausula({ splitId: p.splitId, equipoId: equipo.id, equipoNombre: equipo.data().nombre || equipo.id, pilotoId: ficha.id, nombre: ficha.data().nombre || p.slug, importe: p.importe, motivo: p.motivo.trim() });
  return { ok: true, mensaje: "Cláusula actualizada." };
}

/** Cuentas reales para la tabla de usuarios del diseño, con los ids del diseño. */
export async function usuarios(): Promise<Resultado & { usuarios?: { uid: string; nombre: string; email: string; rol: string; equipo: string; pilotoId: string }[] }> {
  const lista = await listarUsuarios();
  return {
    ok: true,
    usuarios: lista.map(u => ({
      uid: u.uid, nombre: String(u.nombre || u.email || u.uid), email: String(u.email || ""), rol: String(u.rol || "usuario"),
      equipo: equipoDelPrototipo(String(u.escuderia_id || "")) || "", pilotoId: String(u.piloto_id || ""),
    })).sort((a, b) => a.nombre.localeCompare(b.nombre)),
  };
}

export async function guardarUsuario(p: { splitId: string; uid: string; rol: string; equipo: string; pilotoId: string }): Promise<Resultado> {
  const equipoId = p.equipo ? (await escuderiaFirestore(p.splitId, p.equipo)).id : "";
  await asignarUsuario(p.uid, { rol: p.rol, pilotoId: p.pilotoId, equipoId });
  return { ok: true, mensaje: "Cuenta guardada." };
}

export async function logo(p: { splitId: string; equipo: string; url: string }): Promise<Resultado> {
  const equipo = await escuderiaFirestore(p.splitId, p.equipo);
  await guardarLogoEquipo(p.splitId, equipo.id, p.url.trim());
  return { ok: true, mensaje: p.url.trim() ? "Logo actualizado." : "Logo retirado." };
}
