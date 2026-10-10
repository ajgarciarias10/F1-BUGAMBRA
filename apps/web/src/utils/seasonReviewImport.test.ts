import test from "node:test";
import assert from "node:assert/strict";
import { historicalResultPositions, requireHistoricalPriceDerivedValues, requireOpeningBudget, rivalryPayoutFromPositions } from "./seasonReviewImport";

test("historical points never imply a finish or qualifying position, and zero points is not DNF", () => {
  assert.deepEqual(historicalResultPositions(false), { qualyPos: 99, racePos: 99, isDnf: false, isDnfOwnError: false });
  assert.deepEqual(historicalResultPositions(true), { qualyPos: 1, racePos: 99, isDnf: false, isDnfOwnError: false });
});

test("unknown positions cannot produce a rivalry payout", () => {
  assert.equal(rivalryPayoutFromPositions([{ qualyPos: 1, racePos: 99 }, { qualyPos: 99, racePos: 2 }], [1, 0], [2, 0]), null);
  assert.equal(rivalryPayoutFromPositions([{ qualyPos: 1, racePos: 1 }, { qualyPos: 2, racePos: 2 }], [1, 0], [2, 0]), 3);
});

test("historic import requires real opening budgets and mapped keep/clause values", () => {
  assert.equal(requireOpeningBudget("Team", undefined, 50), 50);
  assert.throws(() => requireOpeningBudget("Team", undefined, undefined), /presupuesto inicial de Team/);
  assert.deepEqual(requireHistoricalPriceDerivedValues("Pilot", 3, 2), { keep: 3, clause: 2 });
  assert.throws(() => requireHistoricalPriceDerivedValues("Pilot", undefined, undefined), /no se derivan con multiplicadores estimados/);
});
