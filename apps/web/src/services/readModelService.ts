// Acceso a Firestore para los read models de readModels.ts. Las lecturas devuelven datos tal
// cual; los fallos se propagan para que la pantalla muestre un error en vez de un saldo en 0.
// Las escrituras de admin pasan por runAuditedAdminMutation (antes/después en una transacción)
// y nunca se disparan solas: cada una exige una acción explícita del administrador.
import { collection, doc, getDocs, limit, orderBy, query, where } from "firebase/firestore";
import { db } from "./firebase";
import { runAuditedAdminMutation } from "./adminMutationService";
import { getYoutubeVideoId } from "../utils/youtube";
import { mergeDoc } from "../utils/adminMutationPlans";
import type { AvisoOficial, DecisionFia, Transaccion } from "../types";
import { buildLedgerView, matchesTeamLedgerEntry, type LedgerView } from "./readModels";

/**
 * Movimientos de un equipo en un split. Lanza si falla la lectura (no devuelve vacío).
 * Se filtra por `splitId` en Firestore y por equipo con `matchesTeamLedgerEntry`, para incluir
 * asientos antiguos sin `equipoId` (solo traen el nombre en `equipo`). Pasa `teamName` para
 * poder casarlos; sin él solo se aceptan por `equipoId` o por id en `equipo`.
 */
export async function fetchTeamLedger(
  splitId: string, teamId: string, currentBalance: number | null | undefined, teamName?: string | null,
): Promise<LedgerView> {
  const snap = await getDocs(query(collection(db, "transacciones"), where("splitId", "==", splitId)));
  const team = { id: teamId, nombre: teamName };
  const txs = snap.docs.map(d => ({ id: d.id, ...d.data() }) as Transaccion).filter(tx => matchesTeamLedgerEntry(tx, splitId, team));
  return buildLedgerView(txs, currentBalance);
}

/**
 * Corrige o anula una decisión FIA ya registrada. No la borra: queda en el acta con la marca de
 * editada o anulada, y el antes y el después en admin_audit.
 */
export async function editarDecisionFia(
  splitId: string, circuitId: string, id: string,
  cambios: Pick<DecisionFia, "motivo" | "efecto_deportivo"> | { anulada: true },
) {
  if ("motivo" in cambios && !cambios.motivo.trim()) throw new Error("La decisión necesita un motivo.");
  await runAuditedAdminMutation({
    ref: doc(db, `splits/${splitId}/circuitos`, circuitId),
    action: "anulada" in cambios ? "decision_fia_anulada" : "decision_fia_editada",
    summary: `Decisión FIA ${id} ${"anulada" in cambios ? "anulada" : "corregida"} en ${circuitId}`,
    apply: current => {
      if (!current) throw new Error("Circuito no encontrado.");
      const existing: DecisionFia[] = current.decisiones_fia ?? [];
      if (!existing.some(d => d.id === id)) throw new Error("Esa decisión FIA ya no existe.");
      return { ...current, decisiones_fia: existing.map(d => d.id === id ? { ...d, ...cambios, editada_en: new Date().toISOString() } : d) };
    },
  });
}

/** Último aviso oficial publicado por el admin, o null si no hay ninguno. */
export async function fetchLatestOfficialNotice(): Promise<AvisoOficial | null> {
  const snap = await getDocs(query(collection(db, "avisos_oficiales"), orderBy("publicado_en", "desc"), limit(1)));
  const first = snap.docs[0];
  return first ? ({ id: first.id, ...first.data() }) as AvisoOficial : null;
}

/** Publicación explícita de un aviso. Crea un documento nuevo; no sobrescribe avisos previos. */
export async function publishOfficialNotice(input: { id: string; titulo: string; texto: string; actorUid: string }) {
  const titulo = input.titulo.trim();
  const texto = input.texto.trim();
  if (!input.id || input.id.includes("/")) throw new Error("Identificador de aviso no válido.");
  if (!titulo || !texto) throw new Error("El aviso necesita título y texto.");
  await runAuditedAdminMutation({
    ref: doc(db, "avisos_oficiales", input.id),
    action: "publicar_aviso_oficial",
    summary: `Aviso oficial: ${titulo}`,
    apply: current => {
      if (current) throw new Error("Este aviso ya está publicado.");
      return { titulo, texto, publicado_por: input.actorUid, publicado_en: new Date().toISOString() };
    },
  });
}

/** Nombre, fecha, hora y número de una carrera, como los programa el admin. */
export async function programarCarrera(splitId: string, circuitoId: string, p: { nombre: string; fecha: string; hora: string; numero_carrera: number }) {
  await runAuditedAdminMutation({
    ref: doc(db, `splits/${splitId}/circuitos`, circuitoId),
    action: "race_schedule_update",
    summary: `Programación de la carrera ${circuitoId}`,
    apply: current => {
      if (!current) throw new Error("La carrera no existe. No se aplicó ningún cambio.");
      // El nombre se puede corregir; el identificador del documento no cambia, así no se pierden referencias.
      return mergeDoc(current, p);
    },
  });
}

/** Publica o retira el vídeo de vuelta rápida de un circuito (url vacía = retirar). */
export async function setFastestLapVideo(splitId: string, circuitId: string, url: string) {
  const clean = url.trim();
  if (clean && !getYoutubeVideoId(clean)) throw new Error("La URL debe ser un vídeo de YouTube válido.");
  await runAuditedAdminMutation({
    ref: doc(db, `splits/${splitId}/circuitos`, circuitId),
    action: "vuelta_rapida_video",
    summary: clean ? `Vídeo de vuelta rápida de ${circuitId}` : `Vídeo de vuelta rápida retirado de ${circuitId}`,
    apply: current => {
      if (!current) throw new Error("Circuito no encontrado.");
      return { ...current, hotlap_url: clean || null };
    },
  });
}

/**
 * Registra una decisión FIA ya anunciada. Idempotente por `decision.id`: reenviarla falla sin
 * duplicar. No calcula ni cobra multas; `transaccionId` solo enlaza un movimiento ya registrado.
 */
export async function registerFiaDecision(splitId: string, circuitId: string, decision: DecisionFia) {
  if (!decision.id || !decision.tipo.trim() || !decision.motivo.trim()) throw new Error("La decisión necesita id, tipo y motivo.");
  if (!decision.pilotoId && !decision.equipoId) throw new Error("Indica el piloto o el equipo afectado.");
  await runAuditedAdminMutation({
    ref: doc(db, `splits/${splitId}/circuitos`, circuitId),
    action: "decision_fia",
    summary: `Decisión FIA ${decision.id} en ${circuitId}`,
    apply: current => {
      if (!current) throw new Error("Circuito no encontrado.");
      const existing: DecisionFia[] = current.decisiones_fia ?? [];
      if (existing.some(d => d.id === decision.id)) throw new Error("Esta decisión FIA ya está registrada.");
      return { ...current, decisiones_fia: [...existing, { ...decision, registrada_en: new Date().toISOString() }] };
    },
  });
}
