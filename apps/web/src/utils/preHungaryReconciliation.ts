/**
 * One-time Split 3 pre-Hungary reconciliation from the official 2026 workbook.
 * The T3 transfer totals come from sheet 2026, column R, team summary rows 51–53.
 * Opening balances were checked against the live Split 3 team documents before
 * calculating these reviewed pre-race targets.
 */
export const PRE_HUNGARY_RECONCILIATION = {
  splitId: "split_3",
  raceId: "hungria",
  operationId: "split_3_pre_hungary_budget_v1",
  source: "Excel oficial 2026, fichajes T3 (R51:R53)",
  teams: [
    { id: "equipo_alfa_romero", name: "Alfa Romero", opening: 165.2, transferSpend: 115.2, target: 50 },
    { id: "equipo_roses", name: "Roses", opening: 115.9, transferSpend: 65.9, target: 50 },
    { id: "equipo_zenith", name: "Zenith", opening: 163.1, transferSpend: 126.8, target: 36.3 },
  ],
} as const;

export function validatePreHungaryPlan() {
  for (const team of PRE_HUNGARY_RECONCILIATION.teams) {
    const calculated = Math.round((team.opening - team.transferSpend) * 10) / 10;
    if (calculated !== team.target) throw new Error(`El saldo objetivo de ${team.name} no coincide con su fórmula oficial.`);
  }
  return PRE_HUNGARY_RECONCILIATION.teams;
}
