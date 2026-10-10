import test from "node:test";
import assert from "node:assert/strict";
import { normalizeRaceResults } from "./normalizeRaceResults";

test("an explicit admin DNF survives the stored unknown-position sentinel", () => {
  assert.equal(normalizeRaceResults([{ racePos: 99, qualyPos: 3, isDnf: true }])[0].isDnf, true);
});

test("unknown or non-scoring results never imply retirement or reconstructed positions", () => {
  const results = normalizeRaceResults([
    { racePos: 99, qualyPos: 99, puntos: 0 },
    { racePos: 15, qualyPos: 14, puntos: 0, isDnf: false },
    { puntos: 16 },
  ]);
  assert.deepEqual(results.map(result => [result.racePos, result.qualyPos, result.isDnf]), [
    [99, 99, false], [15, 14, false], [99, 99, false],
  ]);
});

test("normalization preserves explicit facts and does not mutate persisted results", () => {
  const source = { racePos: 0, qualyPos: -1, isDnf: true, isDnfOwnError: true, puntos: 2 };
  const normalized = normalizeRaceResults([source])[0];
  assert.equal(normalized.racePos, 99);
  assert.equal(normalized.qualyPos, 99);
  assert.equal(normalized.isDnfOwnError, true);
  assert.equal(normalized.puntos, 2);
  assert.equal(source.racePos, 0);
});
