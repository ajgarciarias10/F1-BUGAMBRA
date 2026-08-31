import { createHash } from "node:crypto";
import type { PoolClient } from "pg";
import { loadCorrectionContext } from "./correction-repository.ts";
import { pool } from "./database.ts";
import {
  previewRaceCorrection,
  validateRaceParticipation,
  type CorrectionPreview,
  type RaceSnapshot,
  type SeasonProjection,
} from "./domain/race-calculator.ts";

interface ApplyRaceCorrectionInput {
  seasonId: string;
  raceId: string;
  expectedRevision: number;
  correctionReason: string;
  correctedRace: RaceSnapshot;
  idempotencyKey: string;
  requestedBy: string;
}

interface ApplyRaceCorrectionResponse {
  raceId: string;
  revision: number;
  preview: CorrectionPreview;
}

export class CorrectionConflictError extends Error {}
export class CorrectionValidationError extends Error {
  constructor(public readonly errors: string[]) {
    super(errors.join(" "));
  }
}

export async function applyRaceCorrection(
  input: ApplyRaceCorrectionInput,
): Promise<ApplyRaceCorrectionResponse> {
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      return await applyRaceCorrectionOnce(input);
    } catch (error) {
      if (!isSerializationFailure(error) || attempt === 3) throw error;
    }
  }
  throw new Error("No se pudo completar la corrección.");
}

async function applyRaceCorrectionOnce(
  input: ApplyRaceCorrectionInput,
): Promise<ApplyRaceCorrectionResponse> {
  const client = await pool.connect();
  const lockKey = `${input.requestedBy}:correct_race:${input.idempotencyKey}`;
  let lockAcquired = false;
  let destroyClient = false;
  try {
    await client.query("SELECT pg_advisory_lock(hashtext($1))", [lockKey]);
    lockAcquired = true;
    await client.query("BEGIN ISOLATION LEVEL SERIALIZABLE");

    const requestHash = createHash("sha256").update(JSON.stringify({
      seasonId: input.seasonId,
      raceId: input.raceId,
      expectedRevision: input.expectedRevision,
      correctionReason: input.correctionReason,
      correctedRace: input.correctedRace,
      requestedBy: input.requestedBy,
    })).digest("hex");
    const previousCommand = await client.query<{
      request_hash: string;
      response: ApplyRaceCorrectionResponse | null;
    }>(
      `SELECT request_hash, response FROM processing_command
       WHERE requested_by = $1 AND command_type = 'correct_race' AND idempotency_key = $2`,
      [input.requestedBy, input.idempotencyKey],
    );
    const existing = previousCommand.rows[0];
    if (existing) {
      if (existing.request_hash !== requestHash) {
        throw new CorrectionConflictError("La clave de idempotencia ya se usó con otros datos.");
      }
      if (!existing.response) {
        throw new CorrectionConflictError("La corrección con esta clave todavía se está procesando.");
      }
      await client.query("COMMIT");
      return existing.response;
    }

    const raceResult = await client.query<{
      status: "draft" | "validated" | "finalized" | "settled";
      current_revision: number;
      sequence: number;
    }>(
      `SELECT status, current_revision, sequence
       FROM race
       WHERE id = $1 AND season_id = $2
       FOR UPDATE`,
      [input.raceId, input.seasonId],
    );
    const race = raceResult.rows[0];
    if (!race) throw new CorrectionConflictError("La carrera no existe en esta temporada.");
    if (race.status === "settled") {
      throw new CorrectionConflictError(
        "La economía de esta carrera ya está liquidada. Debe corregirse con reversión económica.",
      );
    }
    if (race.status !== "finalized") {
      throw new CorrectionConflictError("Solo se pueden corregir carreras cerradas.");
    }
    if (race.current_revision !== input.expectedRevision) {
      throw new CorrectionConflictError(
        `La carrera cambió: se esperaba la revisión ${input.expectedRevision} y es la ${race.current_revision}.`,
      );
    }
    if (input.correctedRace.sequence !== race.sequence) {
      throw new CorrectionConflictError("Una corrección no puede alterar el orden de la carrera.");
    }

    const beforeContext = await loadCorrectionContext(input.seasonId, client);
    const referenceErrors: string[] = [];
    for (const result of input.correctedRace.results) {
      if (!Object.hasOwn(beforeContext.baseRatings, result.driverId)) {
        referenceErrors.push(`El piloto ${result.driverId} no pertenece a la temporada.`);
      }
      if (!beforeContext.allowedTeamIds.has(result.teamIdAtRace)) {
        referenceErrors.push(`El equipo ${result.teamIdAtRace} no pertenece a la temporada.`);
      }
    }
    referenceErrors.push(...validateRaceParticipation(
      input.correctedRace.results,
      input.correctedRace.sequence,
      beforeContext.driverParticipation,
    ));
    if (referenceErrors.length > 0) throw new CorrectionValidationError(referenceErrors);
    const preview = previewRaceCorrection(
      beforeContext.races,
      input.correctedRace,
      beforeContext.rules,
      beforeContext.baseRatings,
    );
    const newRevision = race.current_revision + 1;

    const supersededResult = await client.query(
      "UPDATE race_revision SET status = 'superseded' WHERE race_id = $1 AND status = 'current'",
      [input.raceId],
    );
    if (supersededResult.rowCount !== 1) {
      throw new CorrectionConflictError("La revisión actual de la carrera no es consistente.");
    }
    const revisionResult = await client.query<{ id: string }>(
      `INSERT INTO race_revision
         (race_id, revision, status, source, correction_reason, created_by)
       VALUES ($1, $2, 'current', 'manual', $3, $4)
       RETURNING id`,
      [input.raceId, newRevision, input.correctionReason, input.requestedBy],
    );
    const revisionId = revisionResult.rows[0]?.id;
    if (!revisionId) throw new Error("No se pudo crear la revisión de la carrera.");

    for (const result of input.correctedRace.results) {
      await client.query(
        `INSERT INTO race_result (
           race_revision_id, season_driver_id, season_team_id_at_race,
           qualifying_position, race_position, dnf, own_error_dnf, clean_race,
           fastest_lap, mvp, driver_of_the_day, overtakes_boost
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        [
          revisionId,
          result.driverId,
          result.teamIdAtRace,
          result.qualifyingPosition,
          result.racePosition,
          result.dnf,
          result.ownErrorDnf,
          result.cleanRace,
          result.fastestLap,
          result.mvp,
          result.driverOfTheDay,
          result.overtakesBoost,
        ],
      );
    }

    await client.query(
      "UPDATE race SET current_revision = $2, updated_at = now() WHERE id = $1",
      [input.raceId, newRevision],
    );
    await replaceStandingProjections(client, input.seasonId, preview.after, beforeContext.baseRatings);

    const response: ApplyRaceCorrectionResponse = {
      raceId: input.raceId,
      revision: newRevision,
      preview,
    };
    await client.query(
      `INSERT INTO processing_command
         (idempotency_key, command_type, aggregate_id, requested_by, request_hash, response, completed_at)
       VALUES ($1, 'correct_race', $2, $3, $4, $5, now())`,
      [input.idempotencyKey, input.raceId, input.requestedBy, requestHash, response],
    );
    await client.query(
      `INSERT INTO audit_log (actor_uid, action, entity_type, entity_id, before_data, after_data)
       VALUES ($1, 'race.corrected', 'race', $2, $3, $4)`,
      [input.requestedBy, input.raceId, { revision: race.current_revision }, { revision: newRevision, reason: input.correctionReason }],
    );

    await client.query("COMMIT");
    return response;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    if (lockAcquired) {
      try {
        await client.query("SELECT pg_advisory_unlock(hashtext($1))", [lockKey]);
      } catch (error) {
        destroyClient = true;
        console.error("No se pudo liberar el bloqueo de idempotencia", error);
      }
    }
    client.release(destroyClient);
  }
}

function isSerializationFailure(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "40001";
}

async function replaceStandingProjections(
  client: PoolClient,
  seasonId: string,
  projection: SeasonProjection,
  baseRatings: Record<string, number>,
): Promise<void> {
  const drivers = await client.query<{ id: string }>(
    "SELECT id FROM season_driver WHERE season_id = $1",
    [seasonId],
  );
  for (const { id } of drivers.rows) {
    const state = projection.drivers[id] ?? {
      points: 0,
      rating: baseRatings[id] ?? 50,
      wins: 0,
      podiums: 0,
      poles: 0,
      dnfs: 0,
      cleanRaces: 0,
    };
    await client.query(
      `INSERT INTO driver_standing
         (season_driver_id, points, rating, wins, podiums, poles, dnfs, clean_races, recalculated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, now())
       ON CONFLICT (season_driver_id) DO UPDATE SET
         points = EXCLUDED.points,
         rating = EXCLUDED.rating,
         wins = EXCLUDED.wins,
         podiums = EXCLUDED.podiums,
         poles = EXCLUDED.poles,
         dnfs = EXCLUDED.dnfs,
         clean_races = EXCLUDED.clean_races,
         recalculated_at = now()`,
      [id, state.points, state.rating, state.wins, state.podiums, state.poles, state.dnfs, state.cleanRaces],
    );
  }

  const teams = await client.query<{ id: string }>(
    "SELECT id FROM season_team WHERE season_id = $1",
    [seasonId],
  );
  for (const { id } of teams.rows) {
    await client.query(
      `INSERT INTO team_standing (season_team_id, points, recalculated_at)
       VALUES ($1, $2, now())
       ON CONFLICT (season_team_id) DO UPDATE SET
         points = EXCLUDED.points,
         recalculated_at = now()`,
      [id, projection.teams[id]?.points ?? 0],
    );
  }
}
