/**
 * Helper to determine if a split is unlocked/visible.
 * - Split 1 is always unlocked.
 * - Any subsequent split is unlocked ONLY if the previous split was fully completed
 *   (i.e. ALL its circuits have completado === true, and there is at least 1 circuit).
 */
export const isSplitUnlocked = (splitId: string, allSplits: any[]): boolean => {
  const sorted = [...allSplits].sort((a, b) => a.id.localeCompare(b.id));
  const index = sorted.findIndex(s => s.id === splitId);
  if (index <= 0) return true; // split_1 is always unlocked
  const prevSplit = sorted[index - 1];
  const hasCircuits = prevSplit.circuitos && prevSplit.circuitos.length > 0;
  const allCompleted = hasCircuits && prevSplit.circuitos.every((c: any) => c.completado);
  return allCompleted;
};

export interface RivalryPilot {
  id: string;
  nombre: string;
  equipoId: string;
  equipoNombre: string;
  rating: number;
  puntos_piloto: number;
}

export interface RivalryPair {
  pilotoA: RivalryPilot;
  pilotoB: RivalryPilot;
  ratingDiff: number;
  equipoA: string;
  equipoB: string;
}

export interface RivalryGroupMember extends RivalryPilot {
  statusRank: number;
  price: number;
}

export interface RivalryGroup {
  id: string;
  statusRank: number;
  type: "triad" | "pair" | "solo";
  members: RivalryGroupMember[];
  groupScore: number;
  fixedRewardPerRace?: number;
}

export interface SplitRivalries {
  splitId: string;
  totalPilotos: number;
  pairCount: number;
  coeficiente: number;
  rivalidades: RivalryPair[];
  groups: RivalryGroup[];
  soloPilots: RivalryGroupMember[];
}

const RIVALRY_COEFFICIENT_TABLE: Record<number, number> = {
  8: 1.0,
  10: 1.0,
  12: 1.1,
  14: 1.2,
  16: 1.3
};

export function getRivalryCoefficient(totalPilotos: number): number {
  return RIVALRY_COEFFICIENT_TABLE[totalPilotos] ?? 1.0;
}

const getPilotPrice = (pilot: any): number => {
  return pilot.precio_compra_split ?? pilot.clausula_actual ?? (pilot.rating_piloto || 70) * 0.5;
};

const buildStatusRankedPilots = (split: any): RivalryGroupMember[] => {
  const pilots: RivalryGroupMember[] = [];

  (split.equipos || []).forEach((equipo: any) => {
    const sortedTeamPilots = [...(equipo.pilotos || [])].sort((a: any, b: any) => {
      const priceA = getPilotPrice(a);
      const priceB = getPilotPrice(b);
      if (priceB !== priceA) return priceB - priceA;
      return (b.rating_piloto || 70) - (a.rating_piloto || 70);
    });

    sortedTeamPilots.forEach((pilot: any, index: number) => {
      pilots.push({
        id: pilot.id,
        nombre: pilot.nombre,
        equipoId: equipo.id,
        equipoNombre: equipo.nombre,
        rating: pilot.rating_piloto ?? 70,
        puntos_piloto: pilot.puntos_piloto ?? 0,
        statusRank: index + 1,
        price: getPilotPrice(pilot)
      });
    });
  });

  return pilots;
};

const buildStatusRivalryGroups = (split: any) => {
  const pilots = buildStatusRankedPilots(split);
  const groups: RivalryGroup[] = [];
  const soloPilots: RivalryGroupMember[] = [];

  const byStatus = pilots.reduce((acc: Record<number, RivalryGroupMember[]>, pilot) => {
    if (!acc[pilot.statusRank]) acc[pilot.statusRank] = [];
    acc[pilot.statusRank].push(pilot);
    return acc;
  }, {} as Record<number, RivalryGroupMember[]>);

  Object.keys(byStatus).sort((a, b) => Number(a) - Number(b)).forEach((statusKey) => {
    const statusRank = Number(statusKey);
    const pool = [...byStatus[statusRank]].sort((a, b) => b.rating - a.rating || a.nombre.localeCompare(b.nombre));

    while (pool.length > 0) {
      if (pool.length === 1) {
        const solo = pool.shift()!;
        soloPilots.push(solo);
        continue;
      }

      if (pool.length % 2 === 1 && pool.length >= 3) {
        const members = pool.splice(0, 3);
        const meanRating = members.reduce((sum, member) => sum + member.rating, 0) / members.length;
        const spread = Math.max(...members.map(m => m.rating)) - Math.min(...members.map(m => m.rating));
        groups.push({
          id: `${split.id}-status-${statusRank}-triad-${groups.length}`,
          statusRank,
          type: "triad",
          members,
          groupScore: Math.max(0, meanRating - spread * 0.3 + 1),
          fixedRewardPerRace: undefined
        });
        continue;
      }

      const members = pool.splice(0, 2);
      const meanRating = (members[0].rating + members[1].rating) / 2;
      const spread = Math.abs(members[0].rating - members[1].rating);
      groups.push({
        id: `${split.id}-status-${statusRank}-pair-${groups.length}`,
        statusRank,
        type: "pair",
        members,
        groupScore: Math.max(0, meanRating - spread * 0.4),
        fixedRewardPerRace: undefined
      });
    }
  });

  return { groups, soloPilots };
};

export const getRivalryGroupMember = (split: any, pilotId: string): RivalryGroupMember | null => {
  const team = (split.equipos || []).find((eq: any) => (eq.pilotos || []).some((pilot: any) => pilot.id === pilotId));
  if (!team) return null;

  const pilot = (team.pilotos || []).find((p: any) => p.id === pilotId);
  if (!pilot) return null;

  const statusRankMap = buildStatusRankedPilots(split).reduce((acc: Record<string, number>, p) => {
    acc[p.id] = p.statusRank;
    return acc;
  }, {} as Record<string, number>);

  return {
    id: pilot.id,
    nombre: pilot.nombre,
    equipoId: team.id,
    equipoNombre: team.nombre,
    rating: pilot.rating_piloto ?? 70,
    puntos_piloto: pilot.puntos_piloto ?? 0,
    statusRank: statusRankMap[pilot.id] ?? 1,
    price: getPilotPrice(pilot)
  };
};

const normalizeSplitRivalries = (split: any): SplitRivalries => {
  if (split?.rivalries && Array.isArray(split.rivalries.groups) && Array.isArray(split.rivalries.soloPilots)) {
    const totalPilotos = (split.equipos || []).flatMap((equipo: any) => equipo.pilotos || []).length;
    const groups = split.rivalries.groups;
    const soloPilots = split.rivalries.soloPilots;
    return {
      splitId: split.id,
      totalPilotos,
      coeficiente: getRivalryCoefficient(totalPilotos),
      pairCount: groups.filter((group: any) => group.type === "pair").length,
      rivalidades: [],
      groups,
      soloPilots
    };
  }

  return buildRivalryTable(split);
};

export function buildRivalryTable(split: any): SplitRivalries {
  const pilots: RivalryPilot[] = (split.equipos || []).flatMap((equipo: any) =>
    (equipo.pilotos || []).map((p: any) => ({
      id: p.id,
      nombre: p.nombre,
      equipoId: equipo.id,
      equipoNombre: equipo.nombre,
      rating: p.rating_piloto ?? 70,
      puntos_piloto: p.puntos_piloto ?? 0
    }))
  );

  const totalPilotos = pilots.length;
  const coeficiente = getRivalryCoefficient(totalPilotos);
  const unpaired = new Set(pilots.map((p) => p.id));
  const sortedPilots = [...pilots].sort((a, b) => b.rating - a.rating || a.nombre.localeCompare(b.nombre));
  const rivalidades: RivalryPair[] = [];

  for (const piloto of sortedPilots) {
    if (!unpaired.has(piloto.id)) continue;

    const candidate = sortedPilots
      .filter((other) =>
        unpaired.has(other.id) &&
        other.id !== piloto.id &&
        other.equipoId !== piloto.equipoId
      )
      .sort((a, b) => {
        const diffA = Math.abs(a.rating - piloto.rating);
        const diffB = Math.abs(b.rating - piloto.rating);
        return diffA - diffB || a.nombre.localeCompare(b.nombre);
      })[0];

    if (!candidate) continue;

    unpaired.delete(piloto.id);
    unpaired.delete(candidate.id);
    rivalidades.push({
      pilotoA: piloto,
      pilotoB: candidate,
      ratingDiff: Math.abs(piloto.rating - candidate.rating) * coeficiente,
      equipoA: piloto.equipoNombre,
      equipoB: candidate.equipoNombre
    });
  }

  const { groups, soloPilots } = buildStatusRivalryGroups(split);

  return {
    splitId: split.id,
    totalPilotos,
    pairCount: rivalidades.length,
    coeficiente,
    rivalidades,
    groups,
    soloPilots
  };
}

/**
 * Helper to process and resolve all splits.
 * - "En mundial split 2 no puede haber puntos no hemos ni empezado. Ni en el split 3 tampoco ni en el 4."
 * - "Piensa que los equipos tampoco pueden estar hechos en esos splits por que tiene que basicamente mirar al split anterior y ser actualizados. Es como que cada split apunta al anterior en equipos y jugadores. Pero no en puntos de equipo ni puntos de piloto, ni rating cada split cada uno tiene el rating del split anterior que ira cambiando conforme se juegen circuitos."
 */
export function resolveAllSplits(rawSplits: any[]): any[] {
  // Sort splits alphabetically to get split_1, split_2, split_3, split_4
  const sorted = [...rawSplits].sort((a, b) => a.id.localeCompare(b.id));
  
  const resolved: any[] = [];
  
  for (let i = 0; i < sorted.length; i++) {
    const s = sorted[i];
    const isStarted = s.circuitos && s.circuitos.some((c: any) => c.completado);
    
    if (i === 0) {
      const equipos = (s.equipos || []).map((eq: any) => ({
        ...eq,
        puntos_constructores: eq.puntos_constructores ?? 0,
        pilotos: (eq.pilotos || []).map((p: any) => ({
          ...p,
          puntos_piloto: p.puntos_piloto ?? 0,
          victorias: p.victorias ?? 0,
          podios: p.podios ?? 0,
          base_rating: p.base_rating ?? p.rating_piloto ?? 70,
          rating_piloto: p.rating_piloto ?? 70,
          precio_compra_split: p.precio_compra_split ?? 10,
          clausula_actual: p.clausula_actual ?? 15,
          mantener_actual: p.mantener_actual ?? 15,
          precio_carrera_anterior: p.precio_carrera_anterior ?? 10
        }))
      }));

      resolved.push({
        ...s,
        equipos,
        isStarted: true,
        rivalries: normalizeSplitRivalries({ ...s, equipos })
      });
    } else {
      // For split_2, split_3, split_4:
      const prevResolved = resolved[i - 1];
      
      const currentTeamIds = s.equipos?.map((eq: any) => eq.id) || [];
      const prevTeamIds = prevResolved?.equipos?.map((eq: any) => eq.id) || [];
      const teamIds = Array.from(new Set([...currentTeamIds, ...prevTeamIds]));

      const equipos = teamIds.map((teamId) => {
        const eqActual = s.equipos?.find((eq: any) => eq.id === teamId);
        const eqAnterior = prevResolved?.equipos?.find((eq: any) => eq.id === teamId);
        
        let presupuesto = 100;
        if (eqActual?.presupuesto !== undefined) {
          presupuesto = eqActual.presupuesto;
        } else if (eqAnterior?.presupuesto !== undefined) {
          presupuesto = eqAnterior.presupuesto;
        }

        let puntos_constructores = 0;
        if (isStarted) {
          puntos_constructores = eqActual?.puntos_constructores ?? eqAnterior?.puntos_constructores ?? 0;
        }

        let rawPilotos: any[] = [];
        const actualPilots = eqActual?.pilotos || [];
        if (actualPilots.length > 0) {
          const prevPilots = eqAnterior?.pilotos || [];
          const actualPilotIds = actualPilots.map((p: any) => p.id);
          
          const otherTeamsDocs = s.equipos?.filter((eq: any) => eq.id !== teamId) || [];
          const otherTeamsPilotIds = otherTeamsDocs.flatMap((eq: any) => (eq.pilotos || []).map((p: any) => p.id));
          
          const inheritedUnedited = prevPilots.filter((p: any) => {
            const isEditedHere = actualPilotIds.includes(p.id);
            const isMovedElsewhere = otherTeamsPilotIds.includes(p.id);
            return !isEditedHere && !isMovedElsewhere;
          });
          
          rawPilotos = [...actualPilots, ...inheritedUnedited];
        } else {
          rawPilotos = eqAnterior?.pilotos || [];
        }

        const pilotos = rawPilotos.map((p: any) => ({
          ...p,
          puntos_piloto: isStarted ? (p.puntos_piloto ?? 0) : 0,
          victorias: isStarted ? (p.victorias ?? 0) : 0,
          podios: isStarted ? (p.podios ?? 0) : 0,
          base_rating: p.base_rating || p.rating_piloto || 70,
          rating_piloto: p.rating_piloto ?? 70,
          precio_compra_split: p.precio_compra_split ?? 10,
          clausula_actual: p.clausula_actual ?? 15,
          mantener_actual: p.mantener_actual ?? 15,
          precio_carrera_anterior: p.precio_carrera_anterior ?? 10
        }));

        const defaultNombre = teamId === "agente_libre" ? "Agente Libre" : (teamId.charAt(0).toUpperCase() + teamId.slice(1));

        return {
          id: teamId,
          nombre: eqActual?.nombre || eqAnterior?.nombre || defaultNombre,
          jeque_id: eqActual?.jeque_id || eqAnterior?.jeque_id || "",
          presupuesto,
          puntos_constructores,
          pilotos
        };
      });

      resolved.push({
        ...s,
        equipos,
        isStarted,
        rivalries: normalizeSplitRivalries({ ...s, equipos })
      });
    }
  }
  
  return resolved;
}

export function computePilotDynamicOVR(pilot: any): number {
  const base = pilot.base_rating || pilot.rating_piloto || 70;
  const points = pilot.puntos_piloto || 0;
  const wins = pilot.victorias || 0;
  const podiums = pilot.podios || 0;
  const dnfs = pilot.dnfs || 0;

  if (points === 0 && wins === 0 && podiums === 0 && dnfs === 0) {
    return base;
  }

  // Weight recent performance heavily
  // performanceBase is roughly 60 + points + bonuses, scaled.
  let performanceBase = 60 + (points * 0.5) + (wins * 3) + (podiums * 1.5);
  performanceBase = Math.min(95, performanceBase);

  // Blend the original base rating and the performance base.
  // The more points they score, the more the performance overpowers the base.
  const blendFactor = Math.min(0.75, points / 150);
  
  let finalOvr = (base * (1 - blendFactor)) + (performanceBase * blendFactor);
  
  // Apply penalty for DNFs independently
  finalOvr -= (dnfs * 1.5);

  return Math.round(Math.max(50, Math.min(99, finalOvr)));
}

/**
 * MODELO DE ANÁLISIS ESTADÍSTICO DE MERCADO (Reutilizable en React Native)
 * Extrae la lógica pura para calcular qué pilotos son mejores inversiones.
 */
import { POINTS_BY_POSITION } from "../services/economyService";

export function computePilotMarketOpportunities(
  allPilots: any[],
  completedCircuits: any[],
  recommenderStrategy: "balanced" | "momentum" | "budget" | "premium"
) {
  const localPOINTS_SCALE = POINTS_BY_POSITION;

  return allPilots.map((p: any) => {
    const historyScore: number[] = [];
    completedCircuits.forEach((c: any) => {
      const row = c.resultados?.find((r: any) => 
        r.pilotoId === p.id || 
        r.pilotoNombre?.toLowerCase() === p.nombre?.toLowerCase() ||
        r.name?.toLowerCase() === p.nombre?.toLowerCase()
      );
      const pts = row ? (row.racePos >= 1 && row.racePos <= 12 ? localPOINTS_SCALE[row.racePos - 1] : 0) + (row.qualyPos === 1 ? 2 : 0) : 0;
      historyScore.push(pts);
    });

    const totalPoints = p.puntos_piloto || historyScore.reduce((sum, val) => sum + val, 0);

    let trendScore = 0;
    if (historyScore.length >= 2) {
      const lastRacePts = historyScore[historyScore.length - 1];
      const prevRecentPts = historyScore[historyScore.length - 2];
      const recentAv = (lastRacePts + prevRecentPts) / 2;
      const priorRaces = historyScore.slice(0, historyScore.length - 1);
      const priorAv = priorRaces.length > 0 ? priorRaces.reduce((sum, val) => sum + val, 0) / priorRaces.length : recentAv;
      trendScore = recentAv - priorAv;
    }

    let recoScore = 0;
    const rtg = p.rating_piloto || 70;
    const price = p.coste;
    const ptsOverPrice = price > 0 ? (totalPoints / price) : 0;

    if (recommenderStrategy === "balanced") {
      recoScore = (rtg * 0.45) + (ptsOverPrice * 18) + (trendScore * 1.5);
    } else if (recommenderStrategy === "momentum") {
      recoScore = (trendScore * 8.0) + (ptsOverPrice * 6) + (rtg * 0.15);
    } else if (recommenderStrategy === "budget") {
      recoScore = (ptsOverPrice * 35.0) - (price * 0.7) + (trendScore * 1.0);
    } else if (recommenderStrategy === "premium") {
      recoScore = (rtg * 4.0) + (totalPoints * 1.8) + (trendScore * 2.5);
    }

    let justification = "";
    if (recommenderStrategy === "momentum") {
      justification = trendScore > 5 ? `¡En racha espectacular! Viene de subir su promedio de puntos en +${trendScore.toFixed(1)} puntos. Un activo con momentum positivo impecable.` : trendScore < -3 ? `Detección de tendencia irregular (baja de ${Math.abs(trendScore).toFixed(1)} pts). Se encuentra en un bache temporal de resultados. ¡Opción de riesgo!` : `Estadísticas estables en los últimos circuitos. Mantiene una trayectoria regular y segura para aportar consistencia a tu casillero semanal.`;
    } else if (recommenderStrategy === "budget") {
      justification = price < 12 ? `Ganga absoluta a tan solo ${price.toFixed(1)}M. Presenta un coeficiente ROI altamente favorable, liberando presupuesto para realizar otras contrataciones de peso.` : `Excelente rendimiento costo-beneficio de ${ptsOverPrice.toFixed(1)} Pts/M. Una adquisición inteligente para equilibrar las finanzas de tu escudería.`;
    } else if (recommenderStrategy === "premium") {
      justification = `Piloto franquicia con un Rating de ${rtg}. Lidera en potencial neto de puntos y su contratación asegura tener a una superestrella de primera línea.`;
    } else {
      justification = ptsOverPrice > 4.5 ? `Oportunidad recomendada por su increíble eficiencia (${ptsOverPrice.toFixed(1)} pts por millón invertido). Una inversión óptima y segura para el Split.` : trendScore < -4 ? `Aviso: Ha tenido altibajos en el último circuito (bajando de media ${Math.abs(trendScore).toFixed(1)} pts). Aun así, por ${price.toFixed(1)}M puede representar un pilar competitivo excelente.` : `Opción balanceada ideal. Responde con garantías a su costo de ${price.toFixed(1)}M y encaja perfectamente en cualquier estrategia competitiva.`;
    }

    return {
      ...p,
      history: historyScore,
      trendScore,
      ptsOverPrice,
      recoScore,
      justification
    };
  }).sort((a, b) => b.recoScore - a.recoScore).slice(0, 4);
}
