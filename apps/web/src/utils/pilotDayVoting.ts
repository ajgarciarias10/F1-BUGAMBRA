import type { RaceResult } from "../types";

export function getPilotDayCandidates(results: RaceResult[] = []): string[] {
  return [...new Set(results.filter(result => result.isDnf !== true).map(result => result.pilotoId).filter(Boolean))];
}

export function pilotDayOpenError(state: { completed?: boolean; closed?: boolean; open?: boolean; candidates: string[] }): string | null {
  if (!state.completed) return "Solo se puede abrir una votación de una carrera completada.";
  if (state.closed) return "La votación ya está cerrada y no se puede reabrir.";
  if (state.open) return "La votación ya está abierta.";
  if (!state.candidates.length) return "No hay pilotos elegibles para votar.";
  return null;
}

export function pilotDayVoteError(state: {
  registeredUid?: string;
  requestedUid: string;
  completed?: boolean;
  open?: boolean;
  closed?: boolean;
  candidates: string[];
  pilotId: string;
}): string | null {
  if (!state.registeredUid || state.registeredUid !== state.requestedUid) return "Debes votar con tu cuenta registrada.";
  if (!state.completed) return "Todavía no hay resultados de esta carrera.";
  if (!state.open) return "El administrador todavía no ha abierto esta votación.";
  if (state.closed) return "La votación ya está cerrada.";
  if (!state.candidates.includes(state.pilotId)) return "Este piloto no está entre los participantes elegibles.";
  return null;
}

export function pilotDayCloseError(state: { open?: boolean; closed?: boolean; candidates: string[]; winnerId: string }): string | null {
  if (state.closed) return "La votación ya está cerrada.";
  if (!state.open) return "La votación no está abierta.";
  if (!state.candidates.includes(state.winnerId)) return "El ganador debe ser un piloto participante elegible.";
  return null;
}
