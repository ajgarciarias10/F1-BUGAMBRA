import test from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_ECONOMY_RULES, economyRules, pointsForRaceResult } from "./economyRules";

test("existing splits retain the current points and pole defaults", () => {
  assert.deepEqual(economyRules().puntos_por_posicion, [16, 13, 11, 9, 8, 7, 6, 5, 4, 3, 2, 1]);
  assert.equal(economyRules().puntos_pole, 2);
});

test("split-specific scoring applies configured position and pole points when results lack saved points", () => {
  const rules = { ...DEFAULT_ECONOMY_RULES, puntos_por_posicion: [25, 18], puntos_pole: 5 };
  assert.equal(pointsForRaceResult({ racePos: 1, qualyPos: 1 }, rules), 30);
  assert.equal(pointsForRaceResult({ racePos: 2, qualyPos: 2 }, rules), 18);
  assert.equal(pointsForRaceResult({ racePos: 3, qualyPos: 1 }, rules), 5);
});

test("stored acta points override later rule changes", () => {
  assert.equal(pointsForRaceResult({ puntos: 7, racePos: 1, qualyPos: 1 }, { puntos_por_posicion: [99], puntos_pole: 99 }), 7);
});
