import type { Pool, PoolClient } from "pg";
import { pool } from "./database.ts";
import type { RaceSnapshot } from "./domain/race-calculator.ts";
import { parseSeasonRules, type SeasonRules } from "./domain/rules.ts";

export interface CorrectionContext {
  rules: SeasonRules;
  races: RaceSnapshot[];
  baseRatings: Record<string, number>;
  driverParticipation: Record<string, {
    startsAtSequence: number;
    endsAtSequence: number | null;
  }>;
  allowedTeamIds: Set<string>;
  raceMetadata: Record<string, {
    currentRevision: number;
    status: "finalized" | "settled";
  }>;
}

export async function loadCorrectionContext(
  seasonId: string,
  database: Pool | PoolClient = pool,
): Promise<CorrectionContext> {
  const [rulesResult, resultsResult, driversResult, teamsResult] = await Promise.all([
    database.query<{ configuration: unknown }>(
      `SELECT sr.configuration
       FROM season s
       JOIN season_ruleset sr ON sr.id = s.active_ruleset_id
       WHERE s.id = $1 AND sr.status = 'published'`,
      [seasonId],
    ),
    database.query<{
      race_id: string;
      sequence: number;
      current_revision: number;
      race_status: "finalized" | "settled";
      driver_id: string;
      team_id: string;
      qualifying_position: number;
      race_position: number | null;
      dnf: boolean;
      own_error_dnf: boolean;
      clean_race: boolean;
      fastest_lap: boolean;
      mvp: boolean;
      driver_of_the_day: boolean;
      overtakes_boost: boolean;
    }>(
      `SELECT r.id AS race_id, r.sequence, r.current_revision, r.status AS race_status,
              sd.id AS driver_id, st.id AS team_id,
              rr.qualifying_position, rr.race_position, rr.dnf,
              rr.own_error_dnf, rr.clean_race, rr.fastest_lap, rr.mvp,
              rr.driver_of_the_day, rr.overtakes_boost
       FROM race r
       JOIN race_revision rev ON rev.race_id = r.id
         AND rev.status = 'current' AND rev.revision = r.current_revision
       JOIN race_result rr ON rr.race_revision_id = rev.id
       JOIN season_driver sd ON sd.id = rr.season_driver_id
       JOIN season_team st ON st.id = rr.season_team_id_at_race
       WHERE r.season_id = $1 AND r.status IN ('finalized', 'settled')
       ORDER BY r.sequence, rr.race_position NULLS LAST, rr.qualifying_position`,
      [seasonId],
    ),
    database.query<{
      id: string;
      base_rating: string;
      starts_at_sequence: number;
      ends_at_sequence: number | null;
    }>(
      `SELECT id, base_rating, starts_at_sequence, ends_at_sequence
       FROM season_driver WHERE season_id = $1`,
      [seasonId],
    ),
    database.query<{ id: string }>("SELECT id FROM season_team WHERE season_id = $1", [seasonId]),
  ]);

  const configuration = rulesResult.rows[0]?.configuration;
  if (!configuration) throw new Error("La temporada no tiene un ruleset publicado.");
  const rules = parseSeasonRules(configuration);

  const racesById = new Map<string, RaceSnapshot>();
  const raceMetadata: CorrectionContext["raceMetadata"] = {};
  for (const row of resultsResult.rows) {
    const race = racesById.get(row.race_id) ?? {
      raceId: row.race_id,
      sequence: row.sequence,
      results: [],
    };
    race.results.push({
      driverId: row.driver_id,
      teamIdAtRace: row.team_id,
      qualifyingPosition: row.qualifying_position,
      racePosition: row.race_position,
      dnf: row.dnf,
      ownErrorDnf: row.own_error_dnf,
      cleanRace: row.clean_race,
      fastestLap: row.fastest_lap,
      mvp: row.mvp,
      driverOfTheDay: row.driver_of_the_day,
      overtakesBoost: row.overtakes_boost,
    });
    racesById.set(row.race_id, race);
    raceMetadata[row.race_id] = {
      currentRevision: row.current_revision,
      status: row.race_status,
    };
  }

  return {
    rules,
    races: [...racesById.values()],
    baseRatings: Object.fromEntries(driversResult.rows.map((row) => [row.id, Number(row.base_rating)])),
    driverParticipation: Object.fromEntries(driversResult.rows.map((row) => [row.id, {
      startsAtSequence: row.starts_at_sequence,
      endsAtSequence: row.ends_at_sequence,
    }])),
    allowedTeamIds: new Set(teamsResult.rows.map((row) => row.id)),
    raceMetadata,
  };
}
