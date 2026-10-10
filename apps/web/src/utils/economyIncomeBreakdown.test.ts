import assert from "node:assert/strict";
import test from "node:test";
import { totalEconomyAdjustments, sumEconomyIncomeTransactions, totalEconomyIncome } from "./economyIncomeBreakdown";

test("separa cada origen de ingreso según el tipo de asiento del ledger", () => {
  const breakdown = sumEconomyIncomeTransactions([
    { tipo: "ingreso_puntos", cantidad: 3.2, esIngreso: true },
    { tipo: "pole", cantidad: 2, esIngreso: true },
    { tipo: "vuelta_rapida", cantidad: 1, esIngreso: true },
    { tipo: "premio_carrera", cantidad: 4, esIngreso: true },
    { tipo: "sin_sancionados", cantidad: 3, esIngreso: true },
    { tipo: "rivalidad", cantidad: 1.5, esIngreso: true },
    { tipo: "premio_temporada", cantidad: 20, esIngreso: true },
    { tipo: "fichaje", cantidad: 8, esIngreso: false },
    { tipo: "ajuste", cantidad: 5, esIngreso: true },
  ]);

  assert.deepEqual(breakdown, {
    points: 3.2,
    pole: 2,
    fastestLap: 1,
    participation: 4,
    cleanTeam: 3,
    rivalry: 1.5,
    seasonPrize: 20,
  });
  assert.equal(totalEconomyIncome(breakdown), 34.7);
});

test("ignora cargos, valores no finitos y asientos sin fuente de payout", () => {
  const breakdown = sumEconomyIncomeTransactions([
    { tipo: "pole", cantidad: 2, esIngreso: false },
    { tipo: "rivalidad", cantidad: Number.NaN, esIngreso: true },
    { tipo: "ajuste", cantidad: 7, esIngreso: true },
  ]);
  assert.equal(totalEconomyIncome(breakdown), 0);
});

test("mantiene los ajustes de saldo separados del desglose de ingresos de carrera", () => {
  assert.equal(totalEconomyAdjustments([
    { tipo: "ajuste", cantidad: 10, esIngreso: true },
    { tipo: "ajuste", cantidad: 4, esIngreso: false },
    { tipo: "fichaje", cantidad: 90, esIngreso: false },
  ]), 6);
});
