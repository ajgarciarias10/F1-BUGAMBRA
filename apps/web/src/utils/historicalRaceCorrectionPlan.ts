export type HistoricalRaceSummary = {
  id: string;
  nombre?: string;
  numero_carrera?: number;
  completado?: boolean;
  economia_procesada?: boolean;
};

export type HistoricalRaceCorrectionPlan = {
  target: HistoricalRaceSummary;
  laterProcessedNewestFirst: HistoricalRaceSummary[];
  replayChronological: HistoricalRaceSummary[];
};

const raceOrder = (race: HistoricalRaceSummary) => Number(race.numero_carrera ?? Number.MAX_SAFE_INTEGER);

/** Plans the existing manual reversal/replay sequence; it does not perform mutations. */
export function buildHistoricalRaceCorrectionPlan(
  races: HistoricalRaceSummary[],
  targetRaceId: string,
): HistoricalRaceCorrectionPlan | null {
  const ordered = [...races].sort((a, b) => raceOrder(a) - raceOrder(b) || a.id.localeCompare(b.id));
  const targetIndex = ordered.findIndex(race => race.id === targetRaceId);
  if (targetIndex < 0) return null;

  const target = ordered[targetIndex];
  const laterProcessedChronological = ordered
    .slice(targetIndex + 1)
    .filter(race => race.economia_procesada);
  const needsReplayFromTarget = target.economia_procesada || laterProcessedChronological.length > 0;

  return {
    target,
    laterProcessedNewestFirst: [...laterProcessedChronological].reverse(),
    replayChronological: [
      ...(needsReplayFromTarget ? [target] : []),
      ...laterProcessedChronological,
    ],
  };
}
