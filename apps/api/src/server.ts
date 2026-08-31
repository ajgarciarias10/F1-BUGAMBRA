import express, { type ErrorRequestHandler } from "express";
import multer from "multer";
import { requireAuthentication, requireRole } from "./auth.ts";
import { config } from "./config.ts";
import {
  applyRaceCorrection,
  CorrectionConflictError,
  CorrectionValidationError,
} from "./correction-service.ts";
import { loadCorrectionContext } from "./correction-repository.ts";
import { pool } from "./database.ts";
import { loadSystemControlData } from "./reconciliation-repository.ts";
import {
  previewRaceCorrection,
  parseRaceResults,
  validateRaceResults,
  validateRaceParticipation,
  type RaceSnapshot,
} from "./domain/race-calculator.ts";
import {
  readControlWorkbook,
  reconcileExcelWithSystem,
  WorkbookValidationError,
} from "./domain/excel-reconciliation.ts";

const app = express();
const workbookUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 1,
    fields: 1,
    parts: 2,
    fieldSize: 100,
  },
});
app.disable("x-powered-by");
app.use(express.json({ limit: "1mb" }));
app.use((request, response, next) => {
  response.header("Access-Control-Allow-Origin", config.corsOrigin);
  response.header("Access-Control-Allow-Headers", "Authorization, Content-Type, Idempotency-Key");
  response.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  if (request.method === "OPTIONS") {
    response.sendStatus(204);
    return;
  }
  next();
});

app.get("/health", async (_request, response, next) => {
  try {
    await pool.query("SELECT 1");
    response.json({ status: "ok" });
  } catch (error) {
    next(error);
  }
});

app.get("/api/me", requireAuthentication, (request, response) => {
  response.json({ user: request.currentUser });
});

app.post(
  "/api/seasons/:seasonId/reconciliation/excel",
  requireAuthentication,
  requireRole("admin"),
  workbookUpload.single("workbook"),
  async (request, response, next) => {
    try {
      const seasonId = request.params.seasonId;
      if (!seasonId) {
        response.status(400).json({ error: "Falta el identificador de temporada." });
        return;
      }
      if (!request.file) {
        response.status(400).json({ error: "Debes adjuntar el Excel en el campo workbook." });
        return;
      }
      const sheetName = typeof request.body?.sheetName === "string" && request.body.sheetName.trim()
        ? request.body.sheetName.trim()
        : undefined;
      const excel = await readControlWorkbook(request.file.buffer, sheetName);
      const system = await loadSystemControlData(seasonId);
      response.json(reconcileExcelWithSystem(excel, system));
    } catch (error) {
      if (error instanceof WorkbookValidationError) {
        response.status(422).json({ error: error.message });
        return;
      }
      next(error);
    }
  },
);

app.post(
  "/api/seasons/:seasonId/races/:raceId/correction-preview",
  requireAuthentication,
  requireRole("admin"),
  async (request, response, next) => {
    try {
      const seasonId = request.params.seasonId;
      const raceId = request.params.raceId;
      if (!seasonId || !raceId) {
        response.status(400).json({ error: "Faltan los identificadores de temporada o carrera." });
        return;
      }
      const context = await loadCorrectionContext(seasonId);
      const existingRace = context.races.find((race) => race.raceId === raceId);
      if (!existingRace) {
        response.status(404).json({ error: "Carrera no encontrada o todavía no cerrada." });
        return;
      }
      const metadata = context.raceMetadata[raceId];
      if (!metadata) {
        response.status(409).json({ error: "Las revisiones de la carrera no son consistentes." });
        return;
      }
      if (metadata.status === "settled") {
        response.status(409).json({
          error: "La economía ya está liquidada; falta habilitar la reversión económica.",
        });
        return;
      }

      let correctedResults;
      try {
        correctedResults = parseRaceResults(request.body?.results);
      } catch (error) {
        response.status(422).json({
          errors: [error instanceof Error ? error.message : "Resultados no válidos."],
        });
        return;
      }
      const correctedRace: RaceSnapshot = {
        raceId: existingRace.raceId,
        sequence: existingRace.sequence,
        results: correctedResults,
      };
      const validationErrors = validateRaceResults(correctedRace.results);
      if (validationErrors.length > 0) {
        response.status(422).json({ errors: validationErrors });
        return;
      }
      const referenceErrors = validateSeasonReferences(correctedRace, context);
      if (referenceErrors.length > 0) {
        response.status(422).json({ errors: referenceErrors });
        return;
      }

      response.json({
        currentRevision: metadata.currentRevision,
        raceSequence: existingRace.sequence,
        preview: previewRaceCorrection(
          context.races,
          correctedRace,
          context.rules,
          context.baseRatings,
        ),
      });
    } catch (error) {
      next(error);
    }
  },
);

app.post(
  "/api/seasons/:seasonId/races/:raceId/corrections",
  requireAuthentication,
  requireRole("admin"),
  async (request, response, next) => {
    try {
      const seasonId = request.params.seasonId;
      const raceId = request.params.raceId;
      if (!seasonId || !raceId) {
        response.status(400).json({ error: "Faltan los identificadores de temporada o carrera." });
        return;
      }
      const idempotencyKey = request.header("idempotency-key")?.trim();
      if (!idempotencyKey) {
        response.status(400).json({ error: "Falta la cabecera Idempotency-Key." });
        return;
      }
      if (idempotencyKey.length > 200) {
        response.status(400).json({ error: "Idempotency-Key es demasiado larga." });
        return;
      }
      const expectedRevision = request.body?.expectedRevision;
      const raceSequence = request.body?.raceSequence;
      const correctionReason = request.body?.correctionReason;
      if (!Number.isSafeInteger(expectedRevision) || expectedRevision < 1 || expectedRevision > 2_147_483_647) {
        response.status(422).json({ error: "expectedRevision no es válida." });
        return;
      }
      if (!Number.isSafeInteger(raceSequence) || raceSequence < 1 || raceSequence > 2_147_483_647) {
        response.status(422).json({ error: "raceSequence no es válida." });
        return;
      }
      if (typeof correctionReason !== "string" || correctionReason.trim().length < 3) {
        response.status(422).json({ error: "Debes indicar el motivo de la corrección." });
        return;
      }

      let correctedResults;
      try {
        correctedResults = parseRaceResults(request.body?.results);
      } catch (error) {
        response.status(422).json({
          errors: [error instanceof Error ? error.message : "Resultados no válidos."],
        });
        return;
      }
      const validationErrors = validateRaceResults(correctedResults);
      if (validationErrors.length > 0) {
        response.status(422).json({ errors: validationErrors });
        return;
      }

      const result = await applyRaceCorrection({
        seasonId,
        raceId,
        expectedRevision,
        correctionReason: correctionReason.trim(),
        correctedRace: {
          raceId,
          sequence: raceSequence,
          results: correctedResults,
        },
        idempotencyKey,
        requestedBy: request.currentUser!.firebaseUid,
      });
      response.json(result);
    } catch (error) {
      if (error instanceof CorrectionConflictError) {
        response.status(409).json({ error: error.message });
        return;
      }
      if (error instanceof CorrectionValidationError) {
        response.status(422).json({ errors: error.errors });
        return;
      }
      next(error);
    }
  },
);

const errorHandler: ErrorRequestHandler = (error, _request, response, _next) => {
  if (error instanceof multer.MulterError) {
    response.status(error.code === "LIMIT_FILE_SIZE" ? 413 : 400).json({
      error: error.code === "LIMIT_FILE_SIZE" ? "El Excel supera el límite de 5 MB." : error.message,
    });
    return;
  }
  if (error instanceof SyntaxError && "status" in error && error.status === 400) {
    response.status(400).json({ error: "El cuerpo JSON no es válido." });
    return;
  }
  console.error(error);
  response.status(500).json({ error: "Error interno del servidor." });
};
app.use(errorHandler);

const server = app.listen(config.port, () => {
  console.log(`API escuchando en el puerto ${config.port}`);
});

async function shutdown(signal: string) {
  console.log(`Cerrando API por ${signal}`);
  server.close(async () => {
    await pool.end();
    process.exit(0);
  });
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));

function validateSeasonReferences(
  race: RaceSnapshot,
  context: Awaited<ReturnType<typeof loadCorrectionContext>>,
): string[] {
  const errors: string[] = [];
  for (const result of race.results) {
    if (!Object.hasOwn(context.baseRatings, result.driverId)) {
      errors.push(`El piloto ${result.driverId} no pertenece a la temporada.`);
    }
    if (!context.allowedTeamIds.has(result.teamIdAtRace)) {
      errors.push(`El equipo ${result.teamIdAtRace} no pertenece a la temporada.`);
    }
  }
  errors.push(...validateRaceParticipation(race.results, race.sequence, context.driverParticipation));
  return errors;
}
