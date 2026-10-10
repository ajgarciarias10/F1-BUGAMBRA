import assert from "node:assert/strict";
import test from "node:test";
import { validatePreHungaryPlan } from "./preHungaryReconciliation";

test("el plan temporal calcula el saldo pre-Hungría desde presupuesto inicial menos fichajes T3", () => {
  assert.deepEqual(validatePreHungaryPlan().map(team => [team.name, Math.round((team.opening - team.transferSpend) * 10) / 10, team.target]), [
    ["Alfa Romero", 50, 50],
    ["Roses", 50, 50],
    ["Zenith", 36.3, 36.3],
  ]);
});
