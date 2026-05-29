export interface RivalryPilotSummary {
  pilotoId: string;
  nombre: string;
  equipoId: string;
}

export interface RivalryGroup {
  status: string;
  size: number;
  pilotos: RivalryPilotSummary[];
}

export interface RivalrySummary {
  pagosPorEquipo: Record<string, number>;
  grupos: RivalryGroup[];
}

export const SPLIT_1_STATUS_MAP: Record<string, string> = {
  piloto_aparicio: "3",
  piloto_samu: "3",
  piloto_pinilla: "3",
  piloto_pabliyo: "4",
  piloto_jota: "2",
  piloto_moles: "2",
  piloto_toni: "2",
  piloto_fabi: "1",
  piloto_jose: "1",
  piloto_mimic: "1",
  vacante_alfaromero: "3",
  vacante_zenith: "4"
};

export function getPilotPrice(p: any): number {
  const price = p.precio_compra_split ?? p.precio_compra ?? p.clausula_actual;
  if (price !== undefined && price !== null) return Number(price);
  return Number(p.rating_piloto ? p.rating_piloto * 0.5 : 10);
}

export function assignCostStatusKeys(entries: { pilotoId: string; data: any }[], groupCount = 4): Record<string, string> {
  const ranked = [...entries].sort((a, b) => getPilotPrice(b.data) - getPilotPrice(a.data) || a.pilotoId.localeCompare(b.pilotoId));
  const total = ranked.length;
  if (total === 0) return {};

  const baseSize = Math.floor(total / groupCount);
  const remainder = total % groupCount;
  const sizes = Array(groupCount).fill(baseSize).map((size, index) => size + (index < remainder ? 1 : 0));

  const result: Record<string, string> = {};
  let idx = 0;
  for (let group = 1; group <= groupCount; group++) {
    const size = sizes[group - 1];
    for (let i = 0; i < size; i++) {
      if (!ranked[idx]) break;
      result[ranked[idx].pilotoId] = String(group);
      idx++;
    }
  }

  return result;
}

export function getStatusKey(splitId: string, pid: string, p: any, statusMap?: Record<string, string>): string {
  if (p?.estatus !== undefined && p?.estatus !== null) {
    return String(p.estatus);
  }

  if (splitId === "split_1") {
    return SPLIT_1_STATUS_MAP[pid] || String(p.precio_compra_split ?? p.precio_compra ?? p.clausula_actual ?? pid);
  }

  if (statusMap && statusMap[pid]) {
    return statusMap[pid];
  }

  const price = getPilotPrice(p);
  if (price >= 45) return "1";
  if (price >= 30) return "2";
  if (price >= 20) return "3";
  return "4";
}

export function buildActiveStatusGroups(splitId: string, split: any, results: any[]): Record<string, { pilotoId: string; teamId: string; ref?: any; data: any }[]> {
  const pilotEntries: { pilotoId: string; teamId: string; ref?: any; data: any }[] = [];
  const equipos = split.equipos || [];

  equipos.forEach((eq: any) => {
    const pilotos = eq.pilotos || [];
    pilotos.forEach((p: any) => {
      pilotEntries.push({ pilotoId: p.id, teamId: eq.id, ref: undefined, data: p });
    });
  });

  const statusMap = splitId === "split_1"
    ? undefined
    : assignCostStatusKeys(pilotEntries.map(entry => ({ pilotoId: entry.pilotoId, data: entry.data })));

  const statusGroups: Record<string, { pilotoId: string; teamId: string; ref?: any; data: any }[]> = {};
  pilotEntries.forEach(entry => {
    const statusKey = getStatusKey(splitId, entry.pilotoId, entry.data, statusMap);
    statusGroups[statusKey] = statusGroups[statusKey] || [];
    statusGroups[statusKey].push(entry);
  });

  const resultMap: Record<string, any> = {};
  results.forEach((res: any) => {
    if (res?.pilotoId) resultMap[res.pilotoId] = res;
  });

  const activeStatusGroups: Record<string, { pilotoId: string; teamId: string; ref?: any; data: any }[]> = {};
  for (const key in statusGroups) {
    const present = (statusGroups[key] || []).filter(m => !!resultMap[m.pilotoId]);
    const uniqueByTeam: Record<string, any> = {};
    present.forEach(m => {
      if (!uniqueByTeam[m.teamId]) uniqueByTeam[m.teamId] = m;
    });
    const group = Object.values(uniqueByTeam);
    if (group.length > 0) activeStatusGroups[key] = group;
  }

  return activeStatusGroups;
}

export function buildRivalrySummaryFromGroups(activeStatusGroups: Record<string, { pilotoId: string; teamId: string; ref?: any; data: any }[]>, results: any[]): RivalrySummary {
  const resultMap: Record<string, any> = {};
  results.forEach((res: any) => {
    if (res?.pilotoId) resultMap[res.pilotoId] = res;
  });

  const rivalryPayouts: Record<string, number> = {};

  for (const key in activeStatusGroups) {
    const group = activeStatusGroups[key];
    const size = group.length;

    if (size === 1) {
      const m = group[0];
      rivalryPayouts[m.teamId] = (rivalryPayouts[m.teamId] || 0) + 1.5;
    } else {
      const qualySorted = [...group].sort((a, b) => {
        const qa = resultMap[a.pilotoId]?.qualyPos ?? 999;
        const qb = resultMap[b.pilotoId]?.qualyPos ?? 999;
        return qa - qb;
      });
      const raceSorted = [...group].sort((a, b) => {
        const ra = resultMap[a.pilotoId]?.racePos ?? 999;
        const rb = resultMap[b.pilotoId]?.racePos ?? 999;
        return ra - rb;
      });

      if (size >= 3) {
        const qPayouts = [1, 0.5, 0];
        for (let i = 0; i < 3; i++) {
          const member = qualySorted[i];
          if (!member) break;
          rivalryPayouts[member.teamId] = (rivalryPayouts[member.teamId] || 0) + qPayouts[i];
        }

        const rPayouts = [2, 1, 0];
        for (let i = 0; i < 3; i++) {
          const member = raceSorted[i];
          if (!member) break;
          rivalryPayouts[member.teamId] = (rivalryPayouts[member.teamId] || 0) + rPayouts[i];
        }
      } else if (size === 2) {
        const qWinner = qualySorted[0];
        if (qWinner) rivalryPayouts[qWinner.teamId] = (rivalryPayouts[qWinner.teamId] || 0) + 1;
        const rWinner = raceSorted[0];
        if (rWinner) rivalryPayouts[rWinner.teamId] = (rivalryPayouts[rWinner.teamId] || 0) + 2;
      }
    }
  }

  return {
    pagosPorEquipo: rivalryPayouts,
    grupos: Object.entries(activeStatusGroups).map(([statusKey, group]) => ({
      status: statusKey,
      size: group.length,
      pilotos: group.map(m => ({
        pilotoId: m.pilotoId,
        nombre: m.data?.nombre || m.pilotoId,
        equipoId: m.teamId
      }))
    }))
  };
}

export function buildRivalrySummaryFromResults(splitId: string, split: any, results: any[]): RivalrySummary {
  const activeStatusGroups = buildActiveStatusGroups(splitId, split, results);
  return buildRivalrySummaryFromGroups(activeStatusGroups, results);
}
