import test from "node:test";
import assert from "node:assert/strict";
import { buildRaceShareUrl } from "./raceShareUrl";

test("race share URL points directly to the results tab, season, and historic circuit", () => {
  const url = new URL(buildRaceShareUrl("https://league.example", "split_2", "hungary_01"));
  assert.equal(url.pathname, "/");
  assert.equal(url.searchParams.get("tab"), "resultados");
  assert.equal(url.searchParams.get("temporada"), "split_2");
  assert.equal(url.searchParams.get("carrera"), "hungary_01");
});
