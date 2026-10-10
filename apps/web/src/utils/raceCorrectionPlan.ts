export type RaceCorrectionEntry = {
  id: string;
  order: number;
  processed: boolean;
};

/** Produces the economy operations needed to correct a processed race. */
export function planRaceEconomyCorrection(
  calendar: RaceCorrectionEntry[],
  targetId: string,
): { reverseIds: string[]; reprocessIds: string[] } {
  const ordered = [...calendar].sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
  const targetIndex = ordered.findIndex(race => race.id === targetId);
  if (targetIndex < 0) throw new Error("La carrera no está en el calendario.");
  if (!ordered[targetIndex].processed) throw new Error("La economía de la carrera que quieres corregir no está procesada.");

  const affected = ordered.slice(targetIndex).filter(race => race.processed).map(race => race.id);
  return { reverseIds: [...affected].reverse(), reprocessIds: affected };
}
