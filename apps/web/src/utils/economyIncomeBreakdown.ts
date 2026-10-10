import type { TipoTransaccion } from "../types";

export type EconomyIncomeKey = "points" | "pole" | "fastestLap" | "participation" | "cleanTeam" | "rivalry" | "seasonPrize";

export const ECONOMY_INCOME_SOURCES: ReadonlyArray<{ key: EconomyIncomeKey; label: string; types: readonly TipoTransaccion[] }> = [
  { key: "points", label: "Puntos", types: ["ingreso_puntos"] },
  { key: "pole", label: "Pole", types: ["pole"] },
  { key: "fastestLap", label: "Vuelta rápida", types: ["vuelta_rapida"] },
  { key: "participation", label: "Participación", types: ["premio_carrera"] },
  { key: "cleanTeam", label: "Sin sanciones", types: ["sin_sancionados"] },
  { key: "rivalry", label: "Rivalidad", types: ["rivalidad"] },
  { key: "seasonPrize", label: "Premio de temporada", types: ["premio_temporada"] },
] ;
export type EconomyIncomeBreakdown = Record<EconomyIncomeKey, number>;

export function emptyEconomyIncomeBreakdown(): EconomyIncomeBreakdown {
  return Object.fromEntries(ECONOMY_INCOME_SOURCES.map(({ key }) => [key, 0])) as EconomyIncomeBreakdown;
}

export function sumEconomyIncomeTransactions<T extends {
  tipo: TipoTransaccion;
  cantidad?: number;
  esIngreso?: boolean;
}>(transactions: readonly T[]): EconomyIncomeBreakdown {
  const totals = emptyEconomyIncomeBreakdown();
  for (const transaction of transactions) {
    if (!transaction.esIngreso) continue;
    const amount = Number(transaction.cantidad ?? 0);
    if (!Number.isFinite(amount)) continue;
    const source = ECONOMY_INCOME_SOURCES.find(({ types }) => types.includes(transaction.tipo));
    if (source) totals[source.key] += amount;
  }
  return totals;
}

export function totalEconomyIncome(breakdown: EconomyIncomeBreakdown): number {
  return Object.values(breakdown).reduce((total, amount) => total + amount, 0);
}

/** Net administrative balance corrections, kept out of race payout categories. */
export function totalEconomyAdjustments<T extends { tipo: TipoTransaccion; cantidad?: number; esIngreso?: boolean }>(transactions: readonly T[]): number {
  return transactions.reduce((total, transaction) => {
    if (transaction.tipo !== "ajuste") return total;
    const amount = Number(transaction.cantidad ?? 0);
    if (!Number.isFinite(amount)) return total;
    return total + (transaction.esIngreso ? amount : -amount);
  }, 0);
}

const MARKET_TYPES: readonly TipoTransaccion[] = ["fichaje", "clausula", "subasta", "piloto_negativo"];

/** Net market movements from actual ledger entries; never infer them from balances. */
export function sumEconomyMarketTransactions<T extends { tipo: TipoTransaccion; cantidad?: number; esIngreso?: boolean }>(transactions: readonly T[]): number {
  return transactions.reduce((total, transaction) => {
    if (!MARKET_TYPES.includes(transaction.tipo)) return total;
    const amount = Number(transaction.cantidad ?? 0);
    if (!Number.isFinite(amount)) return total;
    return total + (transaction.esIngreso ? amount : -amount);
  }, 0);
}

/** Net price and clause adjustments from ledger entries (pilot price or clause corrections). */
export function sumClausePriceAdjustments<T extends {
  tipo: TipoTransaccion | string;
  cantidad?: number;
  esIngreso?: boolean;
  piloto?: string;
  descripcion?: string;
}>(transactions: readonly T[]): number {
  return transactions.reduce((total, transaction) => {
    const isClauseAdjustment = transaction.tipo === "ajuste" && (
      Boolean(transaction.piloto) ||
      Boolean(transaction.descripcion?.toLowerCase().includes("precio")) ||
      Boolean(transaction.descripcion?.toLowerCase().includes("cláusula")) ||
      Boolean(transaction.descripcion?.toLowerCase().includes("clausula"))
    );
    if (!isClauseAdjustment) return total;
    const amount = Number(transaction.cantidad ?? 0);
    if (!Number.isFinite(amount)) return total;
    return total + (transaction.esIngreso ? amount : -amount);
  }, 0);
}

