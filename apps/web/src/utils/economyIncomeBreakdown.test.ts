import assert from "node:assert/strict";
import test from "node:test";
import { totalEconomyAdjustments, sumEconomyIncomeTransactions, sumEconomyMarketTransactions, totalEconomyIncome, sumClausePriceAdjustments } from "./economyIncomeBreakdown";

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

test("muestra el mercado solo desde los movimientos reales del ledger", () => {
  assert.equal(sumEconomyMarketTransactions([
    { tipo: "fichaje", cantidad: 50.2, esIngreso: false },
    { tipo: "clausula", cantidad: 10, esIngreso: true },
    { tipo: "ingreso_puntos", cantidad: 4, esIngreso: true },
  ]), -40.2);
});

test("suma ajustes por cláusulas y precios aislando ajustes manuales de saldo", () => {
  const transactions = [
    { tipo: "ajuste", cantidad: 21.2, esIngreso: false, piloto: "Carlos", descripcion: "Corrección de precio 0M → 21.2M" },
    { tipo: "ajuste", cantidad: 21.2, esIngreso: false, piloto: "Dani", descripcion: "Corrección de precio 0M → 21.2M" },
    { tipo: "ajuste", cantidad: 5, esIngreso: true, piloto: "Piloto X", descripcion: "Corrección de precio 15M → 10M" },
    { tipo: "ajuste", cantidad: 85, esIngreso: false, descripcion: "Ajuste administrativo de saldo (-85M)" },
    { tipo: "fichaje", cantidad: 30, esIngreso: false },
  ];
  // -21.2 - 21.2 + 5 = -37.4 (ignoring the 85 manual adjustment and 30 transfer)
  assert.equal(sumClausePriceAdjustments(transactions), -37.4);
});

