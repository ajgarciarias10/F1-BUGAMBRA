import assert from "node:assert/strict";
import test from "node:test";
import { buildHistoricalRaceCorrectionPlan } from "./historicalRaceCorrectionPlan";

const races = [
  { id: "r3", nombre: "Race 3", numero_carrera: 3, completado: true, economia_procesada: true },
  { id: "r1", nombre: "Race 1", numero_carrera: 1, completado: true, economia_procesada: true },
  { id: "r4", nombre: "Race 4", numero_carrera: 4, completado: true, economia_procesada: false },
  { id: "r2", nombre: "Race 2", numero_carrera: 2, completado: true, economia_procesada: true },
];

test("plans reversal newest-first and replay chronologically", () => {
  const plan = buildHistoricalRaceCorrectionPlan(races, "r2");
  assert.deepEqual(plan?.laterProcessedNewestFirst.map(race => race.id), ["r3"]);
  assert.deepEqual(plan?.replayChronological.map(race => race.id), ["r2", "r3"]);
});

test("returns null when target does not exist", () => {
  assert.equal(buildHistoricalRaceCorrectionPlan(races, "missing"), null);
});

test("includes an unprocessed target before downstream processed races are replayed", () => {
  const plan = buildHistoricalRaceCorrectionPlan([
    { id: "r1", numero_carrera: 1, completado: true, economia_procesada: false },
    { id: "r2", numero_carrera: 2, completado: true, economia_procesada: true },
  ], "r1");
  assert.deepEqual(plan?.replayChronological.map(race => race.id), ["r1", "r2"]);
});
