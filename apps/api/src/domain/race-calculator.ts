import type { SeasonRules } from "./rules.ts";

export interface RaceResultInput {
  driverId: string;
  teamIdAtRace: string;
  qualifyingPosition: number;
  racePosition: number | null;
  dnf: boolean;
  ownErrorDnf: boolean;
  cleanRace: boolean;
  fastestLap: boolean;
  mvp: boolean;
  driverOfTheDay: boolean;
  overtakesBoost: boolean;
}

export interface RaceSnapshot {
  raceId: string;
  sequence: number;
  results: RaceResultInput[];
}

export interface DriverParticipationWindow {
  startsAtSequence: number;
  endsAtSequence: number | null;
}

export interface DriverSeasonState {
  points: number;
  rating: number;
  wins: number;
  podiums: number;
  poles: number;
  dnfs: number;
  cleanRaces: number;
}

export interface TeamSeasonState {
  points: number;
}

export interface SeasonProjection {
  drivers: Record<string, DriverSeasonState>;
  teams: Record<string, TeamSeasonState>;
}

export interface ProjectionDelta {
  before: number;
  after: number;
  difference: number;
}

export interface CorrectionPreview {
  before: SeasonProjection;
  after: SeasonProjection;
  driverPointChanges: Record<string, ProjectionDelta>;
  driverRatingChanges: Record<string, ProjectionDelta>;
  teamPointChanges: Record<string, ProjectionDelta>;
}

export function parseRaceResults(input: unknown): RaceResultInput[] {
  if (!Array.isArray(input)) throw new Error("results debe ser una lista.");

  return input.map((item, index) => {
    if (!isRecord(item)) throw new Error(`El resultado ${index + 1} no es un objeto válido.`);
    const driverId = readText(item.driverId, "driverId", index);
    const teamIdAtRace = readText(item.teamIdAtRace, "teamIdAtRace", index);
    const qualifyingPosition = readPositiveInteger(item.qualifyingPosition, "qualifyingPosition", index);
    const racePosition = item.racePosition === null
      ? null
      : readPositiveInteger(item.racePosition, "racePosition", index);

    return {
      driverId,
      teamIdAtRace,
      qualifyingPosition,
      racePosition,
      dnf: readBoolean(item.dnf, "dnf", index),
      ownErrorDnf: readBoolean(item.ownErrorDnf, "ownErrorDnf", index),
      cleanRace: readBoolean(item.cleanRace, "cleanRace", index),
      fastestLap: readBoolean(item.fastestLap, "fastestLap", index),
      mvp: readBoolean(item.mvp, "mvp", index),
      driverOfTheDay: readBoolean(item.driverOfTheDay, "driverOfTheDay", index),
      overtakesBoost: readBoolean(item.overtakesBoost, "overtakesBoost", index),
    };
  });
}

export function validateRaceResults(results: RaceResultInput[]): string[] {
  const errors: string[] = [];
  const driverIds = new Set<string>();
  const qualifyingPositions = new Set<number>();
  const classifiedRacePositions = new Set<number>();

  if (results.length === 0) {
    errors.push("La carrera debe contener al menos un resultado.");
  }

  for (const result of results) {
    if (driverIds.has(result.driverId)) {
      errors.push(`El piloto ${result.driverId} aparece más de una vez.`);
    }
    driverIds.add(result.driverId);

    if (result.ownErrorDnf && !result.dnf) {
      errors.push(`El DNF por error propio de ${result.driverId} requiere marcar DNF.`);
    }

    if (!Number.isInteger(result.qualifyingPosition) || result.qualifyingPosition < 1) {
      errors.push(`La posición de clasificación de ${result.driverId} no es válida.`);
    } else if (qualifyingPositions.has(result.qualifyingPosition)) {
      errors.push(`La posición de clasificación ${result.qualifyingPosition} está duplicada.`);
    }
    qualifyingPositions.add(result.qualifyingPosition);

    if (!result.dnf) {
      if (result.racePosition === null || !Number.isInteger(result.racePosition) || result.racePosition < 1) {
        errors.push(`La posición de carrera de ${result.driverId} no es válida.`);
      } else if (classifiedRacePositions.has(result.racePosition)) {
        errors.push(`La posición de carrera ${result.racePosition} está duplicada.`);
      }
      if (result.racePosition !== null) classifiedRacePositions.add(result.racePosition);
    }
  }

  if (results.filter((result) => result.fastestLap).length > 1) {
    errors.push("Solo puede existir una vuelta rápida por carrera.");
  }
  if (results.filter((result) => result.mvp).length > 1) {
    errors.push("Solo puede existir un MVP por carrera.");
  }
  if (results.filter((result) => result.driverOfTheDay).length > 1) {
    errors.push("Solo puede existir un piloto del día por carrera.");
  }

  return errors;
}

export function validateRaceParticipation(
  results: RaceResultInput[],
  raceSequence: number,
  participation: Record<string, DriverParticipationWindow>,
): string[] {
  const errors: string[] = [];
  for (const result of results) {
    const window = participation[result.driverId];
    if (!window) continue;
    if (raceSequence < window.startsAtSequence) {
      errors.push(
        `El piloto ${result.driverId} se incorpora en la carrera ${window.startsAtSequence} `
        + `y no puede aparecer en la ${raceSequence}.`,
      );
    } else if (window.endsAtSequence !== null && raceSequence > window.endsAtSequence) {
      errors.push(
        `El piloto ${result.driverId} salió después de la carrera ${window.endsAtSequence} `
        + `y no puede aparecer en la ${raceSequence}.`,
      );
    }
  }
  return errors;
}

export function calculateDriverPoints(result: RaceResultInput, rules: SeasonRules): number {
  const receivesPositionPoints = !result.dnf || rules.points.dnfReceivesPositionPoints;
  const positionPoints = receivesPositionPoints && result.racePosition !== null
    ? (rules.points.byPosition[result.racePosition - 1] ?? 0)
    : 0;

  return positionPoints
    + (result.qualifyingPosition === 1 ? rules.points.poleBonus : 0)
    + (result.fastestLap ? rules.points.fastestLapBonus : 0);
}

export function calculateRatingDelta(result: RaceResultInput, rules: SeasonRules): number {
  const rating = rules.rating;
  let delta = result.ownErrorDnf
    ? rating.ownErrorDnfDelta
    : (result.racePosition === null
      ? rating.racePositionFallback
      : (rating.racePositionDelta[result.racePosition] ?? rating.racePositionFallback));

  delta += rating.qualifyingPositionDelta[result.qualifyingPosition]
    ?? rating.qualifyingPositionFallback;
  if (result.cleanRace) delta += rating.cleanRaceBonus;
  if (result.fastestLap) delta += rating.fastestLapBonus;
  if (result.mvp) delta += rating.mvpBonus;
  if (result.driverOfTheDay) delta += rating.driverOfTheDayBonus;
  if (result.overtakesBoost) delta += rating.overtakesBonus;

  return delta;
}

export function rebuildSeasonProjection(
  races: RaceSnapshot[],
  rules: SeasonRules,
  baseRatings: Record<string, number>,
): SeasonProjection {
  const projection: SeasonProjection = { drivers: {}, teams: {} };
  const orderedRaces = [...races].sort((left, right) => left.sequence - right.sequence);

  for (const race of orderedRaces) {
    const validationErrors = validateRaceResults(race.results);
    if (validationErrors.length > 0) {
      throw new Error(`Resultados inválidos en ${race.raceId}: ${validationErrors.join(" ")}`);
    }

    for (const result of race.results) {
      const driver = projection.drivers[result.driverId] ?? {
        points: 0,
        rating: clampRating(baseRatings[result.driverId] ?? rules.rating.minimum, rules),
        wins: 0,
        podiums: 0,
        poles: 0,
        dnfs: 0,
        cleanRaces: 0,
      };
      const team = projection.teams[result.teamIdAtRace] ?? { points: 0 };
      const points = calculateDriverPoints(result, rules);

      driver.points += points;
      driver.rating = clampRating(driver.rating + calculateRatingDelta(result, rules), rules);
      if (!result.dnf && result.racePosition === 1) driver.wins += 1;
      if (!result.dnf && result.racePosition !== null && result.racePosition <= 3) driver.podiums += 1;
      if (result.qualifyingPosition === 1) driver.poles += 1;
      if (result.dnf) driver.dnfs += 1;
      if (result.cleanRace) driver.cleanRaces += 1;
      team.points += points;

      projection.drivers[result.driverId] = driver;
      projection.teams[result.teamIdAtRace] = team;
    }
  }

  return projection;
}

export function previewRaceCorrection(
  races: RaceSnapshot[],
  correctedRace: RaceSnapshot,
  rules: SeasonRules,
  baseRatings: Record<string, number>,
): CorrectionPreview {
  const targetIndex = races.findIndex((race) => race.raceId === correctedRace.raceId);
  if (targetIndex === -1) {
    throw new Error(`No existe la carrera ${correctedRace.raceId}.`);
  }
  if (races[targetIndex]?.sequence !== correctedRace.sequence) {
    throw new Error("Una corrección no puede cambiar el orden de la carrera.");
  }

  const before = rebuildSeasonProjection(races, rules, baseRatings);
  const correctedRaces = races.map((race, index) => index === targetIndex ? correctedRace : race);
  const after = rebuildSeasonProjection(correctedRaces, rules, baseRatings);

  return {
    before,
    after,
    driverPointChanges: collectChanges(before.drivers, after.drivers, (state) => state.points),
    driverRatingChanges: collectChanges(before.drivers, after.drivers, (state) => state.rating),
    teamPointChanges: collectChanges(before.teams, after.teams, (state) => state.points),
  };
}

function clampRating(rating: number, rules: SeasonRules): number {
  return Math.max(rules.rating.minimum, Math.min(rules.rating.maximum, rating));
}

function collectChanges<T>(
  before: Record<string, T>,
  after: Record<string, T>,
  getValue: (state: T) => number,
): Record<string, ProjectionDelta> {
  const changes: Record<string, ProjectionDelta> = {};
  const ids = new Set([...Object.keys(before), ...Object.keys(after)]);

  for (const id of ids) {
    const beforeState = before[id];
    const afterState = after[id];
    const beforeValue = beforeState === undefined ? 0 : getValue(beforeState);
    const afterValue = afterState === undefined ? 0 : getValue(afterState);
    if (beforeValue !== afterValue) {
      changes[id] = {
        before: beforeValue,
        after: afterValue,
        difference: afterValue - beforeValue,
      };
    }
  }

  return changes;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readText(value: unknown, field: string, index: number): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${field} no es válido en el resultado ${index + 1}.`);
  }
  return value;
}

function readPositiveInteger(value: unknown, field: string, index: number): number {
  if (!Number.isSafeInteger(value) || (value as number) < 1 || (value as number) > 1000) {
    throw new Error(`${field} no es válido en el resultado ${index + 1}.`);
  }
  return value as number;
}

function readBoolean(value: unknown, field: string, index: number): boolean {
  if (typeof value !== "boolean") {
    throw new Error(`${field} no es válido en el resultado ${index + 1}.`);
  }
  return value;
}
