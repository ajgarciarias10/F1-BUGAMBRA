import test from "node:test";
import assert from "node:assert/strict";
import { planRaceEconomyCorrection } from "./raceCorrectionPlan";

test("correction reverses processed downstream races latest-first and reapplies forward", () => {
  const result = planRaceEconomyCorrection([
    { id: "r3", order: 3, processed: true },
    { id: "r1", order: 1, processed: true },
    { id: "r2", order: 2, processed: false },
    { id: "r4", order: 4, processed: true },
  ], "r1");
  assert.deepEqual(result, { reverseIds: ["r4", "r3", "r1"], reprocessIds: ["r1", "r3", "r4"] });
});

test("correction refuses missing or unprocessed target before any mutation", () => {
  const calendar = [{ id: "r1", order: 1, processed: false }];
  assert.throws(() => planRaceEconomyCorrection(calendar, "missing"), /no está en el calendario/);
  assert.throws(() => planRaceEconomyCorrection(calendar, "r1"), /no está procesada/);
});
