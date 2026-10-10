/** Missing positions stay unknown. A DNF is an independent recorded fact, not a position. */
export function normalizeRaceResults<T extends { racePos?: number; qualyPos?: number; isDnf?: boolean }>(results: T[]) {
  return results.map(result => ({
    ...result,
    racePos: Number.isInteger(result.racePos) && result.racePos! > 0 ? result.racePos! : 99,
    qualyPos: Number.isInteger(result.qualyPos) && result.qualyPos! > 0 ? result.qualyPos! : 99,
    // Both unknown finishes and explicitly entered retirements use 99 in stored data.
    // Legacy guessed DNFs require source reconciliation; the display cannot distinguish them.
    isDnf: result.isDnf === true,
  }));
}
