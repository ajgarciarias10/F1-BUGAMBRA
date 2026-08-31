import { loadCorrectionContext } from "./correction-repository.ts";
import { pool } from "./database.ts";
import { calculateDriverPoints } from "./domain/race-calculator.ts";
import type {
  SystemBudget,
  SystemControlData,
  SystemEntityPoints,
} from "./domain/excel-reconciliation.ts";

export async function loadSystemControlData(seasonId: string): Promise<SystemControlData> {
  const [context, driversResult, teamsResult, racesResult] = await Promise.all([
    loadCorrectionContext(seasonId),
    pool.query<{
      id: string;
      display_name: string;
      external_key: string;
    }>(
      `SELECT sd.id, d.display_name, d.external_key
       FROM season_driver sd
       JOIN driver d ON d.id = sd.driver_id
       WHERE sd.season_id = $1`,
      [seasonId],
    ),
    pool.query<{
      id: string;
      display_name: string;
      external_key: string;
      current_budget: string;
    }>(
      `SELECT st.id, t.display_name, t.external_key, st.current_budget
       FROM season_team st
       JOIN team t ON t.id = st.team_id
       WHERE st.season_id = $1`,
      [seasonId],
    ),
    pool.query<{ id: string; display_name: string }>(
      "SELECT id, display_name FROM race WHERE season_id = $1 ORDER BY sequence",
      [seasonId],
    ),
  ]);

  const raceNames = new Map(racesResult.rows.map((race) => [race.id, race.display_name]));
  const drivers = new Map<string, SystemEntityPoints>(driversResult.rows.map((driver) => [driver.id, {
    id: driver.id,
    name: driver.display_name,
    aliases: [driver.external_key],
    total: 0,
    races: {},
  }]));
  const teams = new Map<string, SystemEntityPoints>(teamsResult.rows.map((team) => [team.id, {
    id: team.id,
    name: team.display_name,
    aliases: [team.external_key],
    total: 0,
    races: {},
  }]));

  for (const race of context.races) {
    const raceName = raceNames.get(race.raceId);
    if (!raceName) continue;
    for (const result of race.results) {
      const points = calculateDriverPoints(result, context.rules);
      const driver = drivers.get(result.driverId);
      if (driver) {
        driver.races[raceName] = (driver.races[raceName] ?? 0) + points;
        driver.total += points;
      }
      const team = teams.get(result.teamIdAtRace);
      if (team) {
        team.races[raceName] = (team.races[raceName] ?? 0) + points;
        team.total += points;
      }
    }
  }

  const budgets: SystemBudget[] = teamsResult.rows.map((team) => ({
    id: team.id,
    name: team.display_name,
    aliases: [team.external_key],
    budget: Number(team.current_budget),
  }));

  return {
    rules: context.rules,
    raceNames: context.races.flatMap((race) => {
      const name = raceNames.get(race.raceId);
      return name ? [name] : [];
    }),
    drivers: [...drivers.values()],
    teams: [...teams.values()],
    budgets,
  };
}
