import type {
  SplitView, Equipo, PilotInRoster,
  RivalryGroupMember, RivalryGroup, RivalryPair, RivalryPilot, SplitRivalries,
} from "../types";

// ─── SPLIT UNLOCKED ───────────────────────────────────────────────────────────

export const isSplitUnlocked = (splitId: string, allSplits: SplitView[]): boolean => {
  const sorted = [...allSplits].sort((a, b) => a.orden - b.orden);
  const idx = sorted.findIndex(s => s.id === splitId);
  if (idx <= 0) return true;
  const previousTeamSplits = sorted.slice(0, idx).filter(s => s.tipo !== "individual");
  return previousTeamSplits.every(split =>
    split.circuitos.length > 0
    && split.circuitos.every(circuit => circuit.completado && circuit.acta_cerrada && circuit.economia_procesada)
  );
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

// ─── OVR ──────────────────────────────────────────────────────────────────────
// El OVR no se almacena: se deriva de lo que ha hecho el piloto en el split, así que
// nunca se desincroniza de los resultados. 50 es el suelo de un piloto sin puntuar y
// 99 el techo. La referencia es la puntuación máxima posible de una carrera: 16 de
// victoria + 2 de pole.

const PUNTUACION_MAXIMA_CARRERA = 18;

export function computePilotOVR(stats: {
  puntos_piloto?: number;
  victorias?: number;
  podios?: number;
  poles?: number;
  dnfs?: number;
  carreras_limpias?: number;
}): number {
  const puntos    = Number(stats.puntos_piloto ?? 0);
  const victorias = Number(stats.victorias ?? 0);
  const podios    = Number(stats.podios ?? 0);
  const poles     = Number(stats.poles ?? 0);
  const dnfs      = Number(stats.dnfs ?? 0);
  const disputadas = Number(stats.carreras_limpias ?? 0) + dnfs;

  // Sin carreras disputadas no hay nada que valorar: se queda en el punto de partida.
  if (disputadas === 0) return 70;

  const ritmo = puntos / disputadas / PUNTUACION_MAXIMA_CARRERA; // 0 → 1
  const ovr = 50
    + ritmo * 50
    + victorias * 1.5
    + podios * 0.5
    + poles * 1
    - dnfs * 1.5;

  return Math.round(Math.max(50, Math.min(99, ovr)));
}

export function computePilotDynamicOVR(pilot: PilotInRoster): number {
  return Number(pilot.rating_piloto) > 0 ? Number(pilot.rating_piloto) : computePilotOVR(pilot as any);
}

// ─── EVOLUCIÓN DEL OVR POR TRAYECTORIA ───────────────────────────────────────
// El OVR de `computePilotOVR` mira un split aislado: un piloto que hizo una gran
// temporada y luego una mala vuelve a caer a 50 como si debutara. Para que el overall
// sea una trayectoria, el rating arranca en el que cerró el split anterior y cada
// carrera le suma su delta. El que cierra el bloque es el que hereda el siguiente.
//
// El delta compara al piloto con la media real de la carrera, no con una referencia
// fija: así funciona igual con 8, 12 o 16 pilotos y un 8º puesto no puntúa lo mismo en
// una parrilla corta que en una larga.

export const OVR_DEBUT = 70;
export const OVR_SUELO = 50;
export const OVR_TECHO = 99;

// Cuánto mueve como máximo una carrera media-buena. Con 6 carreras por bloque, un split
// dominante sube ~10 puntos y uno desastroso baja ~7: una carrera no descoloca a nadie,
// pero una temporada entera sí.
const GANANCIA_POR_CARRERA = 3;
const BONUS_VICTORIA = 0.5;
const BONUS_POLE     = 0.3;
const CASTIGO_DNF    = 1;

export type ResultadoParaOVR = {
  puntos: number;
  racePos: number;
  qualyPos: number;
  dnf: boolean;
};

// Cuanto más alto es el OVR más cuesta subir, y cuanto más bajo menos se hunde. Sin esto
// un piloto dominante llegaría a 99 en dos bloques y ya no podría distinguirse del resto.
function resistencia(ratingActual: number, delta: number): number {
  const margen = delta > 0
    ? (OVR_TECHO - ratingActual) / (OVR_TECHO - OVR_DEBUT)
    : (ratingActual - OVR_SUELO) / (OVR_DEBUT - OVR_SUELO);
  return Math.max(0.25, Math.min(1, margen));
}

export function deltaOVRCarrera(
  resultado: ResultadoParaOVR,
  mediaPuntosCarrera: number,
  ratingActual: number,
): number {
  const referencia = mediaPuntosCarrera > 0 ? mediaPuntosCarrera : PUNTUACION_MAXIMA_CARRERA / 2;
  let delta = GANANCIA_POR_CARRERA * (resultado.puntos - referencia) / PUNTUACION_MAXIMA_CARRERA;
  if (resultado.racePos === 1)  delta += BONUS_VICTORIA;
  if (resultado.qualyPos === 1) delta += BONUS_POLE;
  if (resultado.dnf)            delta -= CASTIGO_DNF;
  return Math.round(delta * resistencia(ratingActual, delta) * 100) / 100;
}

export function mediaPuntosCarrera(resultados: Array<{ puntos: number }>): number {
  if (resultados.length === 0) return 0;
  return resultados.reduce((total, r) => total + r.puntos, 0) / resultados.length;
}

// Recorre las carreras del bloque en orden y devuelve el rating tras cada una. El primer
// elemento es el rating de partida heredado, así que la serie tiene una entrada más que
// carreras: es la curva que se pinta en el perfil.
export function evolucionOVRSplit(
  ratingInicial: number,
  carreras: Array<{ id: string; nombre: string; resultado: ResultadoParaOVR | null; media: number; bonusOVR?: number }>,
): { ratingFinal: number; puntos: Array<{ circuitoId: string; carrera: string; rating: number; delta: number }> } {
  let rating = Math.max(OVR_SUELO, Math.min(OVR_TECHO, ratingInicial || OVR_DEBUT));
  const puntos: Array<{ circuitoId: string; carrera: string; rating: number; delta: number }> = [];

  for (const carrera of carreras) {
    // Sin resultado el piloto no corrió: el rating ni sube ni baja, se arrastra. El bonus de
    // piloto del día se suma aparte, así que cuenta aunque esa carrera no la haya corrido.
    const deltaCarrera = carrera.resultado ? deltaOVRCarrera(carrera.resultado, carrera.media, rating) : 0;
    const delta = deltaCarrera + (carrera.bonusOVR ?? 0);
    rating = Math.max(OVR_SUELO, Math.min(OVR_TECHO, rating + delta));
    puntos.push({
      circuitoId: carrera.id,
      carrera: carrera.nombre,
      rating: Math.round(rating * 100) / 100,
      delta,
    });
  }

  return { ratingFinal: rating, puntos };
}
