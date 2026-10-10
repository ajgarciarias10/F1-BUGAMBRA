/** Historical point sheets do not encode finishing order. Keep positions unknown. */
export function historicalResultPositions(hasPole: boolean) {
  return { qualyPos: hasPole ? 1 : 99, racePos: 99, isDnf: false, isDnfOwnError: false };
}

/** Return null when positions are incomplete so callers cannot invent a rivalry payout. */
export function rivalryPayoutFromPositions(
  members: Array<{ qualyPos?: number; racePos?: number }>,
  qualifyingPrizes: number[],
  racePrizes: number[],
): number | null {
  if (members.length < 2 || members.some(member => !member.qualyPos || !member.racePos || member.qualyPos === 99 || member.racePos === 99)) return null;
  const orderedPayout = (positionKey: "qualyPos" | "racePos", prizes: number[]) =>
    [...members].sort((a, b) => Number(a[positionKey]) - Number(b[positionKey]))
      .reduce((total, _, index) => total + (prizes[index] ?? 0), 0);
  return orderedPayout("qualyPos", qualifyingPrizes) + orderedPayout("racePos", racePrizes);
}

export function requireOpeningBudget(teamName: string, mapped: number | undefined, previousClosing: number | undefined): number {
  const budget = mapped ?? previousClosing;
  if (typeof budget !== "number" || !Number.isFinite(budget)) {
    throw new Error(`Falta el presupuesto inicial de ${teamName}: mapea el presupuesto de apertura o importa primero el cierre del split anterior.`);
  }
  return budget;
}

export function requireHistoricalPriceDerivedValues(pilotName: string, keep: number | undefined, clause: number | undefined) {
  if (typeof keep !== "number" || !Number.isFinite(keep) || typeof clause !== "number" || !Number.isFinite(clause)) {
    throw new Error(`Faltan mantener y cláusula históricos de ${pilotName}. Mapea esos valores; no se derivan con multiplicadores estimados.`);
  }
  return { keep, clause };
}
