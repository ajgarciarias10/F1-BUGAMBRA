import assert from "node:assert/strict";
import test from "node:test";
import {
  previewRaceCorrection,
  parseRaceResults,
  rebuildSeasonProjection,
  validateRaceResults,
  validateRaceParticipation,
  type RaceResultInput,
  type RaceSnapshot,
} from "../src/domain/race-calculator.ts";
import { currentSeasonRules, parseSeasonRules } from "../src/domain/rules.ts";

function result(overrides: Partial<RaceResultInput> & Pick<RaceResultInput, "driverId" | "teamIdAtRace">): RaceResultInput {
  return {
    qualifyingPosition: 1,
    racePosition: 1,
    dnf: false,
    ownErrorDnf: false,
    cleanRace: false,
    fastestLap: false,
    mvp: false,
    driverOfTheDay: false,
    overtakesBoost: false,
    ...overrides,
  };
}

const originalRaces: RaceSnapshot[] = [
  {
    raceId: "race-1",
    sequence: 1,
    results: [
      result({ driverId: "driver-a", teamIdAtRace: "team-red", qualifyingPosition: 1, racePosition: 1 }),
      result({ driverId: "driver-b", teamIdAtRace: "team-blue", qualifyingPosition: 2, racePosition: 2 }),
    ],
  },
  {
    raceId: "race-2",
    sequence: 2,
    results: [
      result({ driverId: "driver-b", teamIdAtRace: "team-blue", qualifyingPosition: 1, racePosition: 1 }),
      result({ driverId: "driver-a", teamIdAtRace: "team-red", qualifyingPosition: 2, racePosition: 2 }),
    ],
  },
];

test("una corrección sustituye puntos en lugar de acumularlos", () => {
  const correctedRace: RaceSnapshot = {
    raceId: "race-1",
    sequence: 1,
    results: [
      result({ driverId: "driver-b", teamIdAtRace: "team-blue", qualifyingPosition: 1, racePosition: 1 }),
      result({ driverId: "driver-a", teamIdAtRace: "team-red", qualifyingPosition: 2, racePosition: 2 }),
    ],
  };

  const preview = previewRaceCorrection(originalRaces, correctedRace, currentSeasonRules, {
    "driver-a": 70,
    "driver-b": 70,
  });

  assert.deepEqual(preview.driverPointChanges["driver-a"], { before: 31, after: 26, difference: -5 });
  assert.deepEqual(preview.driverPointChanges["driver-b"], { before: 31, after: 36, difference: 5 });
  assert.deepEqual(preview.teamPointChanges["team-red"], { before: 31, after: 26, difference: -5 });
  assert.deepEqual(preview.teamPointChanges["team-blue"], { before: 31, after: 36, difference: 5 });
});

test("previsualizar dos veces la misma corrección produce el mismo estado", () => {
  const correctedRace: RaceSnapshot = {
    ...originalRaces[0]!,
    results: [...originalRaces[0]!.results].reverse().map((entry, index) => ({
      ...entry,
      qualifyingPosition: index + 1,
      racePosition: index + 1,
    })),
  };

  const first = previewRaceCorrection(originalRaces, correctedRace, currentSeasonRules, {});
  const second = previewRaceCorrection(originalRaces, correctedRace, currentSeasonRules, {});

  assert.deepEqual(first.after, second.after);
  assert.deepEqual(first.driverPointChanges, second.driverPointChanges);
});

test("volver a enviar un resultado idéntico no genera diferencias", () => {
  const preview = previewRaceCorrection(originalRaces, originalRaces[0]!, currentSeasonRules, {});

  assert.deepEqual(preview.driverPointChanges, {});
  assert.deepEqual(preview.driverRatingChanges, {});
  assert.deepEqual(preview.teamPointChanges, {});
});

test("eliminar un piloto de una carrera elimina su contribución anterior", () => {
  const correctedRace: RaceSnapshot = {
    raceId: "race-1",
    sequence: 1,
    results: [
      result({ driverId: "driver-b", teamIdAtRace: "team-blue", qualifyingPosition: 1, racePosition: 1 }),
    ],
  };

  const preview = previewRaceCorrection(originalRaces, correctedRace, currentSeasonRules, {});

  assert.equal(preview.after.drivers["driver-a"]?.points, 13);
  assert.equal(preview.after.teams["team-red"]?.points, 13);
  assert.equal(preview.driverPointChanges["driver-a"]?.difference, -18);
});

test("una corrección recalcula el rating de las carreras posteriores", () => {
  const rules = structuredClone(currentSeasonRules);
  const correctedRace: RaceSnapshot = {
    ...originalRaces[0]!,
    results: originalRaces[0]!.results.map((entry) => entry.driverId === "driver-a"
      ? { ...entry, ownErrorDnf: true, dnf: true, racePosition: null, cleanRace: false }
      : entry),
  };

  const preview = previewRaceCorrection(originalRaces, correctedRace, rules, {
    "driver-a": 70,
    "driver-b": 70,
  });

  assert.equal(preview.before.drivers["driver-a"]?.rating, 88);
  assert.equal(preview.after.drivers["driver-a"]?.rating, 78);
  assert.equal(preview.driverRatingChanges["driver-a"]?.difference, -10);
});

test("el equipo histórico del resultado recibe los puntos", () => {
  const projection = rebuildSeasonProjection([
    originalRaces[0]!,
    {
      ...originalRaces[1]!,
      results: originalRaces[1]!.results.map((entry) => entry.driverId === "driver-a"
        ? { ...entry, teamIdAtRace: "team-blue" }
        : entry),
    },
  ], currentSeasonRules, {});

  assert.equal(projection.teams["team-red"]?.points, 18);
  assert.equal(projection.teams["team-blue"]?.points, 44);
});

test("rechaza pilotos y posiciones duplicadas", () => {
  const errors = validateRaceResults([
    result({ driverId: "driver-a", teamIdAtRace: "team-red" }),
    result({ driverId: "driver-a", teamIdAtRace: "team-blue" }),
  ]);

  assert.ok(errors.some((error) => error.includes("aparece más de una vez")));
  assert.ok(errors.some((error) => error.includes("clasificación 1 está duplicada")));
  assert.ok(errors.some((error) => error.includes("carrera 1 está duplicada")));
});

test("rechaza contratos incompletos antes de calcular", () => {
  assert.throws(
    () => parseRaceResults([{ driverId: "driver-a" }]),
    /teamIdAtRace no es válido/,
  );
});

test("rechaza una carrera sin resultados", () => {
  assert.deepEqual(validateRaceResults([]), ["La carrera debe contener al menos un resultado."]);
});

test("valida el ruleset completo en tiempo de ejecución", () => {
  assert.deepEqual(parseSeasonRules(structuredClone(currentSeasonRules)), currentSeasonRules);
  const invalidRules = structuredClone(currentSeasonRules) as unknown as Record<string, unknown>;
  invalidRules.market = {};
  assert.throws(() => parseSeasonRules(invalidRules), /market.initialTeamBudget/);
});

test("respeta altas y bajas de pilotos entre bloques", () => {
  const participants = {
    dani: { startsAtSequence: 13, endsAtSequence: null },
    toni: { startsAtSequence: 1, endsAtSequence: 12 },
    samu: { startsAtSequence: 1, endsAtSequence: 12 },
  };
  const daniResult = result({ driverId: "dani", teamIdAtRace: "team-red" });
  const toniResult = result({ driverId: "toni", teamIdAtRace: "team-blue" });
  const samuResult = result({ driverId: "samu", teamIdAtRace: "team-green" });

  assert.deepEqual(validateRaceParticipation([daniResult], 12, participants), [
    "El piloto dani se incorpora en la carrera 13 y no puede aparecer en la 12.",
  ]);
  assert.deepEqual(validateRaceParticipation([toniResult, samuResult], 13, participants), [
    "El piloto toni salió después de la carrera 12 y no puede aparecer en la 13.",
    "El piloto samu salió después de la carrera 12 y no puede aparecer en la 13.",
  ]);
  assert.deepEqual(validateRaceParticipation([daniResult], 13, participants), []);
});
