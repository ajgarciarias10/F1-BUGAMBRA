import type {
  SplitView, Equipo, PilotInRoster,
  RivalryGroupMember, RivalryGroup, RivalryPair, RivalryPilot, SplitRivalries,
} from "../types";

// ─── SPLIT UNLOCKED ───────────────────────────────────────────────────────────

export const isSplitUnlocked = (splitId: string, allSplits: SplitView[]): boolean => {
  const sorted = [...allSplits].sort((a, b) => a.orden - b.orden);
  const idx = sorted.findIndex(s => s.id === splitId);
  if (idx <= 0) return true;
  const prev = sorted.slice(0, idx).reverse().find(s => s.tipo !== "individual" && s.circuitos.length > 0);
  if (!prev) return true;
  return prev.circuitos.length > 0 && prev.circuitos.every(c => c.completado);
};

export function resolveInitialPilotRating(
  pilotId: string,
  targetSplit: SplitView,
  allSplits: SplitView[],
): { rating: number; rookie: boolean; sourceSplitId: string | null } {
  const previousEntry = [...allSplits]
    .filter(split => split.id !== targetSplit.id && split.orden < targetSplit.orden)
    .sort((a, b) => b.orden - a.orden)
    .map(split => ({ split, entry: split.roster.find(pilot => pilot.pilotoId === pilotId) }))
    .find(result => result.entry);

  if (!previousEntry?.entry) {
    return { rating: 70, rookie: true, sourceSplitId: null };
  }

  return {
    rating: Number(previousEntry.entry.rating_piloto ?? 70),
    rookie: false,
    sourceSplitId: previousEntry.split.id,
  };
}

// ─── COEFICIENTE DE RIVALIDAD ─────────────────────────────────────────────────

const RIVALRY_COEFFICIENT_TABLE: Record<number, number> = {
  8: 1.0, 10: 1.0, 12: 1.1, 14: 1.2, 16: 1.3,
};

export function getRivalryCoefficient(totalPilotos: number): number {
  return RIVALRY_COEFFICIENT_TABLE[totalPilotos] ?? 1.0;
}

// ─── CONSTRUIR PILOTOS ORDENADOS POR STATUS ───────────────────────────────────
// "Status" = posición del piloto dentro de su equipo ordenada por precio (1º→más caro)

function buildStatusRankedPilots(roster: PilotInRoster[], equipos: Equipo[]): RivalryGroupMember[] {
  const equipoNombreMap = Object.fromEntries(equipos.map(e => [e.id, e.nombre]));

  // Agrupar por equipo
  const byTeam: Record<string, PilotInRoster[]> = {};
  for (const p of roster) {
    if (!p.equipoId || p.equipoId === "agente_libre") continue;
    (byTeam[p.equipoId] ??= []).push(p);
  }

  const result: RivalryGroupMember[] = [];
  for (const [teamId, pilots] of Object.entries(byTeam)) {
    const sorted = [...pilots].sort((a, b) => {
      const pa = a.precio_compra ?? 0;
      const pb = b.precio_compra ?? 0;
      return pb !== pa ? pb - pa : (b.rating_piloto ?? 0) - (a.rating_piloto ?? 0);
    });
    sorted.forEach((p, idx) => {
      result.push({
        id:          p.pilotoId,
        nombre:      p.nombre,
        equipoId:    teamId,
        equipoNombre: equipoNombreMap[teamId] ?? teamId,
        rating:      p.rating_piloto ?? 0,
        puntos_piloto: p.puntos_piloto ?? 0,
        statusRank:  idx + 1,
        price:       p.precio_compra ?? 10,
      });
    });
  }
  return result;
}

// ─── GRUPOS DE RIVALIDAD POR STATUS ──────────────────────────────────────────

function buildStatusRivalryGroups(roster: PilotInRoster[], equipos: Equipo[]) {
  const pilots = buildStatusRankedPilots(roster, equipos);
  const groups: RivalryGroup[] = [];
  const soloPilots: RivalryGroupMember[] = [];

  const byStatus = pilots.reduce<Record<number, RivalryGroupMember[]>>((acc, p) => {
    (acc[p.statusRank] ??= []).push(p);
    return acc;
  }, {});

  for (const statusKey of Object.keys(byStatus).sort((a, b) => Number(a) - Number(b))) {
    const statusRank = Number(statusKey);
    const pool = [...byStatus[statusRank]].sort((a, b) => b.rating - a.rating || a.nombre.localeCompare(b.nombre));

    while (pool.length > 0) {
      if (pool.length === 1) {
        soloPilots.push(pool.shift()!);
        continue;
      }
      if (pool.length % 2 === 1 && pool.length >= 3) {
        const members = pool.splice(0, 3);
        const meanRating = members.reduce((s, m) => s + m.rating, 0) / 3;
        const spread = Math.max(...members.map(m => m.rating)) - Math.min(...members.map(m => m.rating));
        groups.push({
          id: `status-${statusRank}-triad-${groups.length}`,
          statusRank, type: "triad", members,
          groupScore: Math.max(0, meanRating - spread * 0.3 + 1),
        });
        continue;
      }
      const members = pool.splice(0, 2);
      const spread = Math.abs(members[0].rating - members[1].rating);
      const mean   = (members[0].rating + members[1].rating) / 2;
      groups.push({
        id: `status-${statusRank}-pair-${groups.length}`,
        statusRank, type: "pair", members,
        groupScore: Math.max(0, mean - spread * 0.4),
      });
    }
  }
  return { groups, soloPilots };
}

// ─── TABLA DE RIVALIDADES COMPLETA ────────────────────────────────────────────

export function buildRivalryTable(split: SplitView): SplitRivalries {
  const { roster, equipos } = split;
  const equipoNombreMap = Object.fromEntries(equipos.map(e => [e.id, e.nombre]));

  const pilots: RivalryPilot[] = roster
    .filter(p => p.equipoId && p.equipoId !== "agente_libre")
    .map(p => ({
      id:          p.pilotoId,
      nombre:      p.nombre,
      equipoId:    p.equipoId,
      equipoNombre: equipoNombreMap[p.equipoId] ?? p.equipoId,
      rating:      p.rating_piloto ?? 0,
      puntos_piloto: p.puntos_piloto ?? 0,
    }));

  const totalPilotos = pilots.length;
  const coeficiente  = getRivalryCoefficient(totalPilotos);
  const unpaired     = new Set(pilots.map(p => p.id));
  const sorted       = [...pilots].sort((a, b) => b.rating - a.rating || a.nombre.localeCompare(b.nombre));
  const rivalidades: RivalryPair[] = [];

  for (const piloto of sorted) {
    if (!unpaired.has(piloto.id)) continue;
    const candidate = sorted
      .filter(o => unpaired.has(o.id) && o.id !== piloto.id && o.equipoId !== piloto.equipoId)
      .sort((a, b) => Math.abs(a.rating - piloto.rating) - Math.abs(b.rating - piloto.rating) || a.nombre.localeCompare(b.nombre))[0];
    if (!candidate) continue;
    unpaired.delete(piloto.id);
    unpaired.delete(candidate.id);
    rivalidades.push({
      pilotoA: piloto, pilotoB: candidate,
      ratingDiff: Math.abs(piloto.rating - candidate.rating) * coeficiente,
      equipoA: piloto.equipoNombre, equipoB: candidate.equipoNombre,
    });
  }

  const { groups, soloPilots } = buildStatusRivalryGroups(roster, equipos);

  return { splitId: split.id, totalPilotos, pairCount: rivalidades.length, coeficiente, rivalidades, groups, soloPilots };
}

// ─── NORMALIZAR RIVALIDADES (BD o calculadas) ─────────────────────────────────

export function normalizeSplitRivalries(split: SplitView): SplitRivalries {
  const r = split.rivalries;
  if (r && Array.isArray(r.groups) && Array.isArray(r.soloPilots)) {
    return {
      splitId:      split.id,
      totalPilotos: split.roster.filter(p => p.equipoId !== "agente_libre").length,
      coeficiente:  getRivalryCoefficient(split.roster.length),
      pairCount:    r.groups.filter((g: any) => g.type === "pair").length,
      rivalidades:  [],
      groups:       r.groups,
      soloPilots:   r.soloPilots,
    };
  }
  return buildRivalryTable(split);
}

// ─── OBTENER MIEMBRO DE RIVALIDAD PARA UN PILOTO ──────────────────────────────

export function getRivalryGroupMember(split: SplitView, pilotoId: string): RivalryGroupMember | null {
  const ranked = buildStatusRankedPilots(split.roster, split.equipos);
  return ranked.find(p => p.id === pilotoId) ?? null;
}

// ─── OVR DINÁMICO (para paneles de rivalidad) ─────────────────────────────────
// rating_piloto ya acumula deltas de rendimiento carrera a carrera desde 0.

export function computePilotDynamicOVR(pilot: PilotInRoster): number {
  return pilot.rating_piloto ?? 0;
}
