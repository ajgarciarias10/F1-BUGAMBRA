// Read models puros para las pantallas del jeque. No importan Firebase: reciben datos ya leídos
// y reutilizan las reglas existentes (utils/*) en lugar de duplicarlas. Nada aquí escribe,
// calcula economía ni infiere datos que el admin no haya registrado.
import type {
  AvisoOficial, Circuito, DecisionFia, Equipo, LedgerSource, PilotInRoster, RaceResult,
  RaceResultStatus, SplitView, Transaccion,
} from "../types";
import { ECONOMY_INCOME_SOURCES, sumClausePriceAdjustments } from "../utils/economyIncomeBreakdown";
import { buildRaceShareUrl } from "../utils/raceShareUrl";
import { getYoutubeEmbedUrl, getYoutubeThumbnailUrl } from "../utils/youtube";

const r1 = (n: number) => Math.round(n * 10) / 10;

// ─── LEDGER ───────────────────────────────────────────────────────────────────

const TRANSFER_TYPES: readonly string[] = ["fichaje", "clausula", "subasta", "piloto_negativo"];

/** Fuente de pago de un asiento. Cada tipo del ledger conserva su propia fuente. */
export function ledgerSourceOf(tx: Pick<Transaccion, "tipo" | "piloto" | "descripcion">): LedgerSource {
  const income = ECONOMY_INCOME_SOURCES.find(({ types }) => types.includes(tx.tipo));
  if (income) return income.key;
  if (TRANSFER_TYPES.includes(tx.tipo)) return "transfer";
  if (tx.tipo === "ajuste") {
    // Mismo criterio que sumClausePriceAdjustments (no se duplica la heurística).
    return sumClausePriceAdjustments([{ ...tx, cantidad: 1, esIngreso: true }]) !== 0
      ? "priceAdjustment" : "manualAdjustment";
  }
  return "other";
}

const normalizeName = (v: unknown) => typeof v === "string" ? v.trim().toLocaleLowerCase("es") : "";

/**
 * Asiento de `team` en `splitId`. Todos los escritores actuales guardan `equipoId` (+ `equipo`
 * con el nombre). Los asientos antiguos sin `equipoId` solo traen `equipo` (nombre; en algunos
 * casos el id), así que se aceptan por nombre/id únicamente cuando NO tienen `equipoId`:
 * un `equipoId` distinto nunca se reasigna por coincidencia de nombre. Sin `splitId` no hay
 * forma de saber el split, y el asiento no se atribuye a ninguno.
 */
export function matchesTeamLedgerEntry(
  tx: Pick<Transaccion, "equipo" | "equipoId" | "splitId">,
  splitId: string,
  team: { id: string; nombre?: string | null },
): boolean {
  if (tx.splitId !== splitId) return false;
  if (typeof tx.equipoId === "string" && tx.equipoId !== "") return tx.equipoId === team.id;
  const legacy = normalizeName(tx.equipo);
  if (!legacy) return false;
  return legacy === normalizeName(team.id) || (!!normalizeName(team.nombre) && legacy === normalizeName(team.nombre));
}

function toMillis(value: unknown): number | null {
  if (value == null) return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (value instanceof Date) return value.getTime();
  const v = value as { toMillis?: () => number; seconds?: number };
  if (typeof v.toMillis === "function") return v.toMillis();
  if (typeof v.seconds === "number") return v.seconds * 1000;
  return null;
}

export interface LedgerEntry {
  id: string;
  dateMs: number | null;
  tipo: Transaccion["tipo"];
  source: LedgerSource;
  /** Positivo = ingreso del equipo, negativo = gasto. */
  signedAmount: number;
  concept: string;
  splitId?: string;
  circuitId?: string;
  pilot?: string;
  /** Referencia de operación si existe; si no, el id del asiento. */
  reference: string;
  /** Solo si el asiento lo guardó. Nunca se reconstruye. */
  balanceAfter: number | null;
}

export type LedgerState = "ok" | "empty" | "balance_unknown" | "pending_reconciliation";

export interface LedgerView {
  state: LedgerState;
  entries: LedgerEntry[];
  /** Neto firmado por fuente, para el desglose; nunca fusiona ajustes con otras fuentes. */
  netBySource: Partial<Record<LedgerSource, number>>;
}

export function buildLedgerView(
  transactions: readonly Transaccion[],
  currentBalance: number | null | undefined,
): LedgerView {
  const entries: LedgerEntry[] = transactions.map(tx => {
    const amount = Number(tx.cantidad ?? 0);
    const safe = Number.isFinite(amount) ? amount : 0;
    return {
      id: tx.id ?? "",
      dateMs: toMillis(tx.fecha),
      tipo: tx.tipo,
      source: ledgerSourceOf(tx),
      signedAmount: r1(tx.esIngreso ? safe : -safe) || 0,
      concept: tx.descripcion ?? "",
      splitId: tx.splitId,
      circuitId: tx.circuitoId,
      pilot: tx.piloto,
      reference: tx.operacionId ?? tx.id ?? "",
      balanceAfter: typeof tx.saldo_nuevo === "number" && Number.isFinite(tx.saldo_nuevo) ? tx.saldo_nuevo : null,
    };
  }).sort((a, b) => (b.dateMs ?? Infinity) - (a.dateMs ?? Infinity) || a.id.localeCompare(b.id));

  const netBySource: LedgerView["netBySource"] = {};
  for (const entry of entries) netBySource[entry.source] = r1((netBySource[entry.source] ?? 0) + entry.signedAmount);

  let state: LedgerState = "ok";
  if (typeof currentBalance !== "number" || !Number.isFinite(currentBalance)) state = "balance_unknown";
  else if (entries.length === 0) state = "empty";
  else {
    const latest = entries.find(entry => entry.balanceAfter !== null);
    if (latest && r1(latest.balanceAfter!) !== r1(currentBalance)) state = "pending_reconciliation";
  }
  return { state, entries, netBySource };
}

// ─── ACTA DE CARRERA ──────────────────────────────────────────────────────────

/** Misma ventana de participación que usa el panel admin y la API (participa_desde/hasta). */
export function canPilotParticipateInRace(
  pilot: Pick<PilotInRoster, "participa_desde" | "participa_hasta">,
  raceSequence: number,
): boolean {
  const startsAt = Number(pilot.participa_desde ?? 1);
  const endsAt = pilot.participa_hasta == null ? null : Number(pilot.participa_hasta);
  return raceSequence >= startsAt && (endsAt == null || raceSequence <= endsAt);
}

/**
 * Estado de un resultado guardado. DNF solo si el admin lo marcó (`isDnf === true`);
 * 0 puntos o racePos 99 sin DNF es posición desconocida, nunca retirada.
 */
export function raceResultStatus(result: Pick<RaceResult, "racePos" | "isDnf">): Exclude<RaceResultStatus, "did_not_race"> {
  if (result.isDnf === true) return "dnf";
  return Number.isInteger(result.racePos) && result.racePos >= 1 && result.racePos < 99 ? "classified" : "unknown_position";
}

export interface RaceReportRow {
  pilotId: string;
  name: string;
  teamId?: string;
  status: RaceResultStatus;
  /** null cuando se desconoce o no corrió. */
  racePos: number | null;
  qualyPos: number | null;
  /** Solo los puntos guardados en el resultado; nunca se reconstruyen desde la posición. */
  points: number | null;
  fastestLap: boolean;
}

export interface RaceReport {
  circuitId: string;
  published: boolean;
  rows: RaceReportRow[];
  decisions: DecisionFia[];
}

const knownPos = (n: number | undefined) => Number.isInteger(n) && n! >= 1 && n! < 99 ? n! : null;

export function buildRaceReport(circuito: Circuito, roster: readonly PilotInRoster[] = []): RaceReport {
  const names = new Map(roster.map(p => [p.pilotoId, p.nombre]));
  const saved = new Set(circuito.resultados?.map(r => r.pilotoId));
  const rows: RaceReportRow[] = (circuito.resultados ?? []).map(result => {
    const status = raceResultStatus(result);
    return {
      pilotId: result.pilotoId,
      name: result.pilotoNombre ?? names.get(result.pilotoId) ?? result.pilotoId,
      teamId: result.equipoId,
      status,
      racePos: status === "classified" ? knownPos(result.racePos) : null,
      qualyPos: knownPos(result.qualyPos),
      points: typeof result.puntos === "number" && Number.isFinite(result.puntos) ? result.puntos : null,
      fastestLap: result.fastestLap === true,
    };
  });
  const sequence = Number(circuito.numero_carrera ?? 0);
  if (circuito.completado && sequence >= 1) {
    for (const pilot of roster) {
      if (saved.has(pilot.pilotoId) || !canPilotParticipateInRace(pilot, sequence)) continue;
      rows.push({
        pilotId: pilot.pilotoId, name: pilot.nombre, teamId: pilot.equipoId, status: "did_not_race",
        racePos: null, qualyPos: null, points: null, fastestLap: false,
      });
    }
  }
  const rank = (row: RaceReportRow) => row.status === "classified" ? row.racePos! : row.status === "unknown_position" ? 1000 : row.status === "dnf" ? 2000 : 3000;
  rows.sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name));
  return {
    circuitId: circuito.id,
    published: circuito.completado === true && circuito.acta_cerrada === true,
    rows,
    decisions: circuito.decisiones_fia ?? [],
  };
}

// ─── VÍDEO DE VUELTA RÁPIDA ───────────────────────────────────────────────────

export interface FastestLapVideo {
  status: "available" | "pending";
  thumbnailUrl: string | null;
  /** URL del reproductor: úsala solo tras el clic en "Reproducir". */
  embedUrl: string | null;
}

export function fastestLapVideoOf(circuito: Pick<Circuito, "hotlap_url">): FastestLapVideo {
  const embedUrl = circuito.hotlap_url ? getYoutubeEmbedUrl(circuito.hotlap_url) : "";
  if (!embedUrl) return { status: "pending", thumbnailUrl: null, embedUrl: null };
  return { status: "available", thumbnailUrl: getYoutubeThumbnailUrl(circuito.hotlap_url!), embedUrl };
}

// ─── INICIO DEL JEQUE ─────────────────────────────────────────────────────────

export interface JequeHome {
  nextRace: Pick<Circuito, "id" | "nombre" | "fecha" | "hora" | "numero_carrera"> & { fastestLap: FastestLapVideo } | null;
  notice: AvisoOficial | null;
  team: { id: string; name: string; constructorPoints: number; rank: number; of: number } | null;
  /** null = saldo no disponible; nunca se sustituye por 0. */
  availableBalance: number | null;
}

export function buildJequeHome(split: Pick<SplitView, "circuitos" | "equipos">, teamId: string | null | undefined, notice: AvisoOficial | null): JequeHome {
  const next = [...split.circuitos].filter(c => !c.completado)
    .sort((a, b) => Number(a.numero_carrera ?? Infinity) - Number(b.numero_carrera ?? Infinity))[0];
  const ranked: Equipo[] = [...split.equipos].sort((a, b) => (b.puntos_constructores ?? 0) - (a.puntos_constructores ?? 0));
  const idx = teamId ? ranked.findIndex(t => t.id === teamId) : -1;
  const team = idx >= 0 ? ranked[idx] : null;
  const balance = team?.presupuesto;
  return {
    nextRace: next ? { id: next.id, nombre: next.nombre, fecha: next.fecha, hora: next.hora, numero_carrera: next.numero_carrera, fastestLap: fastestLapVideoOf(next) } : null,
    notice,
    team: team ? { id: team.id, name: team.nombre, constructorPoints: team.puntos_constructores ?? 0, rank: idx + 1, of: ranked.length } : null,
    availableBalance: typeof balance === "number" && Number.isFinite(balance) ? balance : null,
  };
}
