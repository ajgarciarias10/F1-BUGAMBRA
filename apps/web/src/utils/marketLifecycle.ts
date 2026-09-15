export interface MarketTeam {
  id: string;
  nombre?: string;
  plantilla_completa?: boolean;
}

export interface MarketPilot {
  pilotoId: string;
  equipoId: string;
  nombre?: string;
  participa_hasta?: number | null;
}

export function canFinalizeMarket(
  split: { tipo?: string; completado?: boolean; fichajes_abiertos?: boolean },
  room?: { estado?: string; simulacion_reversiones?: unknown[] },
) {
  return split.tipo !== "individual" && !split.completado && split.fichajes_abiertos === true
    && room?.estado !== "en_curso" && room?.estado !== "esperando_apertura"
    && !room?.simulacion_reversiones?.length;
}

export function marketCompletion(teams: MarketTeam[], roster: MarketPilot[]) {
  const entries = teams.filter(team => team.id !== "agente_libre").map(team => {
    const pilots = [...new Map(roster
      .filter(pilot => pilot.equipoId === team.id && pilot.participa_hasta == null)
      .map(pilot => [pilot.pilotoId, pilot])).values()];
    return { ...team, pilots, complete: team.plantilla_completa === true && pilots.length > 0 };
  });
  return { teams: entries, complete: entries.length > 0 && entries.every(team => team.complete) };
}
