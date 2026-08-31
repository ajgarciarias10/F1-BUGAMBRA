import ExcelJS from "exceljs";
import JSZip from "jszip";
import { createHash } from "node:crypto";
import type { SeasonRules } from "./rules.ts";

export interface ExcelEntityPoints {
  name: string;
  total: number | null;
  races: Record<string, number>;
}

export interface ExcelBudget {
  teamName: string;
  budget: number;
}

export interface ExcelControlData {
  sheetName: string;
  fileHash: string;
  structureHash: string;
  schemaProfile: "f1-bugambra-control-v1";
  raceNames: string[];
  rules: {
    pointsByPosition: number[];
    poleBonus: number | null;
    fastestLapPoints: number | null;
    initialTeamBudget: number | null;
    moneyPerPoint: number | null;
    polePrize: number | null;
    fastestLapPrize: number | null;
    cleanTeamPrize: number | null;
    participationPrize: number | null;
    constructorPrizeByPosition: number[];
    rivalryQualifyingPrizeByRank: number[];
    rivalryRacePrizeByRank: number[];
    rivalryStagePrizeByRank: number[];
    duoQualifyingPrizeByRank: number[];
    duoRacePrizeByRank: number[];
    duoStagePrizeByRank: number[];
    soloDriverParticipationPrize: number | null;
    budgetCapAfterAuction: number | null;
  } | null;
  drivers: ExcelEntityPoints[];
  teams: ExcelEntityPoints[];
  budgets: ExcelBudget[];
  warnings: string[];
  validationErrors: string[];
}

export interface SystemEntityPoints {
  id: string;
  name: string;
  aliases: string[];
  total: number;
  races: Record<string, number>;
}

export interface SystemBudget {
  id: string;
  name: string;
  aliases: string[];
  budget: number;
}

export interface SystemControlData {
  rules: SeasonRules;
  raceNames: string[];
  drivers: SystemEntityPoints[];
  teams: SystemEntityPoints[];
  budgets: SystemBudget[];
}

export interface ReconciliationDifference {
  category: "rules" | "driver" | "team" | "budget";
  entity: string;
  scope: string;
  excelValue: number;
  systemValue: number | null;
  difference: number | null;
}

export interface ReconciliationReport {
  sheetName: string;
  fileHash: string;
  structureHash: string;
  schemaProfile: ExcelControlData["schemaProfile"];
  manualReviewRequired: true;
  fullyVerified: false;
  notCompared: string[];
  matches: boolean;
  comparedValues: number;
  differences: ReconciliationDifference[];
  unmatched: Array<{ category: "driver" | "team" | "race"; name: string }>;
  warnings: string[];
  validationErrors: string[];
}

const TOTAL_COLUMNS = [13, 22, 31, 40];
const MAX_ARCHIVE_ENTRIES = 2_000;
const MAX_UNCOMPRESSED_SIZE = 25 * 1024 * 1024;
const MAX_UNCOMPRESSED_ENTRY_SIZE = 10 * 1024 * 1024;

export class WorkbookValidationError extends Error {}

export async function readControlWorkbook(buffer: Buffer, sheetName?: string): Promise<ExcelControlData> {
  await validateArchiveSize(buffer);
  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.load(buffer as never);
  } catch {
    throw new WorkbookValidationError("El archivo no es un Excel .xlsx válido.");
  }
  const worksheet = sheetName
    ? workbook.getWorksheet(sheetName)
    : workbook.worksheets.find((sheet) => /^\d{4}$/.test(sheet.name));
  if (!worksheet) throw new WorkbookValidationError("No se encontró la hoja de temporada solicitada.");
  if (workbook.worksheets.some((sheet) => sheet.rowCount > 5_000 || sheet.columnCount > 200)) {
    throw new WorkbookValidationError("Una de las hojas supera los límites permitidos.");
  }

  const driverHeaderRow = findRow(worksheet, (row) => text(row.getCell(3)) === "Piloto"
    && text(row.getCell(4)) === "Puntos");
  const teamHeaderRow = findRow(worksheet, (row) => text(row.getCell(3)) === "Escudería"
    && text(row.getCell(4)) === "Puntos");
  if (!driverHeaderRow || !teamHeaderRow) {
    throw new WorkbookValidationError("El Excel no contiene las tablas esperadas de pilotos y escuderías.");
  }

  const warnings: string[] = [];
  const validationErrors: string[] = [];
  const drivers = readPointsSection(
    worksheet, driverHeaderRow, driverHeaderRow + 1, teamHeaderRow - 1, false, warnings, validationErrors,
  );
  const nextSectionRow = findRow(worksheet, (row) => text(row.getCell(1)) === "RIVALIDADES") ?? worksheet.rowCount + 1;
  const teams = readPointsSection(
    worksheet, teamHeaderRow, teamHeaderRow + 1, nextSectionRow - 1, true, warnings, validationErrors,
  );
  const budgetHeaderRow = findRow(worksheet, (row) => text(row.getCell(5)) === "Presupuesto");
  const budgets = budgetHeaderRow ? readBudgets(worksheet, budgetHeaderRow + 1) : [];
  if (!budgetHeaderRow) warnings.push("No se encontró la tabla de presupuestos.");
  const rules = readWorkbookRules(workbook.getWorksheet("Reglamento"));
  const raceNames = readRaceNames(worksheet.getRow(driverHeaderRow));

  if (drivers.length === 0) validationErrors.push("La tabla de pilotos está vacía.");
  if (teams.length === 0) validationErrors.push("La tabla de escuderías está vacía.");
  if (budgets.length === 0) validationErrors.push("La tabla de presupuestos está vacía.");
  if (!rules) validationErrors.push("No se pudieron leer las reglas del libro.");
  else validateRequiredWorkbookRules(rules, validationErrors);
  for (const entity of [...drivers, ...teams]) {
    if (entity.total === null) validationErrors.push(`${entity.name}: falta el total de puntos calculado.`);
  }

  const structureHash = createHash("sha256").update(structuralDescription(workbook)).digest("hex");

  return {
    sheetName: worksheet.name,
    fileHash: createHash("sha256").update(buffer).digest("hex"),
    structureHash,
    schemaProfile: "f1-bugambra-control-v1",
    raceNames,
    rules,
    drivers,
    teams,
    budgets,
    warnings,
    validationErrors,
  };
}

export function reconcileExcelWithSystem(
  excel: ExcelControlData,
  system: SystemControlData,
): ReconciliationReport {
  const differences: ReconciliationDifference[] = [];
  const unmatched: ReconciliationReport["unmatched"] = [];
  const warnings = [...excel.warnings];
  const validationErrors = [...excel.validationErrors];
  let comparedValues = 0;

  if (excel.rules) {
    compareRuleArray(differences, "Puntuación P", excel.rules.pointsByPosition,
      system.rules.points.byPosition, () => { comparedValues += 1; });
    if (excel.rules.poleBonus !== null) {
      comparedValues += 1;
      addDifference(differences, "rules", "Puntuación", "Pole", excel.rules.poleBonus,
        system.rules.points.poleBonus);
    }
    compareOptionalRule(differences, "Vuelta rápida deportiva", excel.rules.fastestLapPoints,
      system.rules.points.fastestLapBonus, () => { comparedValues += 1; });
    compareOptionalRule(differences, "Presupuesto inicial", excel.rules.initialTeamBudget,
      system.rules.market.initialTeamBudget, () => { comparedValues += 1; });
    compareOptionalRule(differences, "Dinero por punto", excel.rules.moneyPerPoint,
      system.rules.economy.moneyPerPoint, () => { comparedValues += 1; });
    compareOptionalRule(differences, "Premio pole", excel.rules.polePrize,
      system.rules.economy.polePrize, () => { comparedValues += 1; });
    compareOptionalRule(differences, "Premio vuelta rápida", excel.rules.fastestLapPrize,
      system.rules.economy.fastestLapPrize, () => { comparedValues += 1; });
    compareOptionalRule(differences, "Premio equipo limpio", excel.rules.cleanTeamPrize,
      system.rules.economy.cleanTeamPrize, () => { comparedValues += 1; });
    compareOptionalRule(differences, "Premio participación", excel.rules.participationPrize,
      system.rules.economy.participationPrize, () => { comparedValues += 1; });
    compareRuleArray(differences, "Premio constructores", excel.rules.constructorPrizeByPosition,
      system.rules.economy.constructorPrizeByPosition, () => { comparedValues += 1; });
    compareRuleArray(differences, "Rivalidad clasificación", excel.rules.rivalryQualifyingPrizeByRank,
      system.rules.rivalries.qualifyingPrizeByRank, () => { comparedValues += 1; });
    compareRuleArray(differences, "Rivalidad carrera", excel.rules.rivalryRacePrizeByRank,
      system.rules.rivalries.racePrizeByRank, () => { comparedValues += 1; });
    compareRuleArray(differences, "Rivalidad bloque", excel.rules.rivalryStagePrizeByRank,
      system.rules.rivalries.stagePrizeByRank, () => { comparedValues += 1; });
    compareRuleArray(differences, "Rivalidad dúo clasificación", excel.rules.duoQualifyingPrizeByRank,
      system.rules.rivalries.duoQualifyingPrizeByRank, () => { comparedValues += 1; });
    compareRuleArray(differences, "Rivalidad dúo carrera", excel.rules.duoRacePrizeByRank,
      system.rules.rivalries.duoRacePrizeByRank, () => { comparedValues += 1; });
    compareRuleArray(differences, "Rivalidad dúo bloque", excel.rules.duoStagePrizeByRank,
      system.rules.rivalries.duoStagePrizeByRank, () => { comparedValues += 1; });
    compareOptionalRule(differences, "Piloto sin rival", excel.rules.soloDriverParticipationPrize,
      system.rules.rivalries.soloDriverParticipationPrize, () => { comparedValues += 1; });
    compareOptionalRule(differences, "Límite tras puja", excel.rules.budgetCapAfterAuction,
      system.rules.market.budgetCapAfterAuction, () => { comparedValues += 1; });
  }

  const systemDrivers = createLookup(system.drivers, false, warnings);
  const systemTeams = createLookup(system.teams, true, warnings);
  const systemBudgets = createLookup(system.budgets, true, warnings);
  validationErrors.push(...warnings.filter((warning) => warning.startsWith("Alias ambiguo")));
  const knownRaceNames = new Set(system.raceNames.map(normalizeName));

  comparePointEntities("driver", excel.drivers, systemDrivers, knownRaceNames, differences, unmatched,
    () => { comparedValues += 1; });
  comparePointEntities("team", excel.teams, systemTeams, knownRaceNames, differences, unmatched,
    () => { comparedValues += 1; });

  for (const budget of excel.budgets) {
    const systemBudget = systemBudgets.get(normalizeTeamName(budget.teamName));
    if (!systemBudget) {
      unmatched.push({ category: "team", name: budget.teamName });
      continue;
    }
    comparedValues += 1;
    addDifference(differences, "budget", budget.teamName, "Presupuesto", budget.budget, systemBudget.budget);
  }

  addMissingSystemEntities(excel.drivers, system.drivers, "driver", unmatched);
  addMissingSystemEntities(excel.teams, system.teams, "team", unmatched);
  addMissingSystemEntities(excel.budgets.map((budget) => ({ name: budget.teamName })), system.budgets,
    "team", unmatched);
  const excelRaceNames = new Set(excel.raceNames.map(normalizeName));
  for (const raceName of system.raceNames) {
    if (!excelRaceNames.has(normalizeName(raceName))) unmatched.push({ category: "race", name: raceName });
  }

  return {
    sheetName: excel.sheetName,
    fileHash: excel.fileHash,
    structureHash: excel.structureHash,
    schemaProfile: excel.schemaProfile,
    manualReviewRequired: true,
    fullyVerified: false,
    notCompared: [
      "Ingresos de rivalidades por carrera y premios de cierre de bloque",
      "Evolución de mantener y cláusula por piloto",
      "Conceptos manuales de fichajes y premios entre bloques",
      "Rating, porque el Excel no contiene su fórmula",
    ],
    matches: differences.length === 0 && unmatched.length === 0 && validationErrors.length === 0,
    comparedValues,
    differences,
    unmatched: deduplicateUnmatched(unmatched),
    warnings,
    validationErrors,
  };
}

function readPointsSection(
  worksheet: ExcelJS.Worksheet,
  headerRowNumber: number,
  firstRow: number,
  lastRow: number,
  teams: boolean,
  warnings: string[],
  validationErrors: string[],
): ExcelEntityPoints[] {
  const header = worksheet.getRow(headerRowNumber);
  const byName = new Map<string, ExcelEntityPoints>();

  for (let rowNumber = firstRow; rowNumber <= lastRow; rowNumber += 1) {
    const row = worksheet.getRow(rowNumber);
    const rawName = text(row.getCell(3));
    if (!rawName) continue;
    const name = teams ? stripTeamSlot(rawName) : stripDriverDecorations(rawName);
    const key = teams ? normalizeTeamName(name) : normalizeName(name);
    const entity = byName.get(key) ?? { name, total: numeric(row.getCell(4)), races: {} };

    for (const totalColumn of TOTAL_COLUMNS) {
      const raceStart = totalColumn - 6;
      let blockHasValues = false;
      let blockTotal = 0;
      for (let column = raceStart; column < totalColumn; column += 1) {
        const raceName = text(header.getCell(column));
        const points = numeric(row.getCell(column));
        if (!raceName || points === null) continue;
        blockHasValues = true;
        blockTotal += points;
        const previous = entity.races[raceName];
        if (previous !== undefined && !nearlyEqual(previous, points)) {
          validationErrors.push(`${name}: valores distintos para ${raceName} en filas duplicadas.`);
          continue;
        }
        entity.races[raceName] = points;
      }
      const declaredBlockTotal = numeric(row.getCell(totalColumn));
      if (blockHasValues && declaredBlockTotal !== null && !nearlyEqual(blockTotal, declaredBlockTotal)) {
        validationErrors.push(
          `${name}: el total del bloque terminado en ${text(header.getCell(totalColumn)) || totalColumn} `
          + `es ${declaredBlockTotal}, pero sus carreras suman ${blockTotal}.`,
        );
      }
    }

    const rowTotal = numeric(row.getCell(4));
    if (entity.total === null) entity.total = rowTotal;
    if (entity.total !== null && rowTotal !== null && !nearlyEqual(entity.total, rowTotal)) {
      validationErrors.push(`${name}: el total general no coincide entre filas duplicadas.`);
    }
    byName.set(key, entity);
  }

  return [...byName.values()].map((entity) => {
    const calculatedTotal = Object.values(entity.races).reduce((sum, points) => sum + points, 0);
    if (entity.total === null) {
      entity.total = calculatedTotal;
      warnings.push(`${entity.name}: total sin resultado cacheado; reconstruido desde las carreras.`);
    } else if (!nearlyEqual(entity.total, calculatedTotal)) {
      validationErrors.push(
        `${entity.name}: el total general es ${entity.total}, pero las carreras suman ${calculatedTotal}.`,
      );
    }
    return entity;
  });
}

function readBudgets(worksheet: ExcelJS.Worksheet, firstRow: number): ExcelBudget[] {
  const budgets: ExcelBudget[] = [];
  for (let rowNumber = firstRow; rowNumber <= worksheet.rowCount; rowNumber += 1) {
    const row = worksheet.getRow(rowNumber);
    const teamName = text(row.getCell(1));
    const budget = numeric(row.getCell(5));
    if (!teamName || budget === null) {
      if (budgets.length > 0) break;
      continue;
    }
    budgets.push({ teamName: stripTeamSlot(teamName), budget });
  }
  return budgets;
}

function readWorkbookRules(worksheet: ExcelJS.Worksheet | undefined): ExcelControlData["rules"] {
  if (!worksheet) return null;
  const pointsByPosition: number[] = [];
  let poleBonus: number | null = null;
  for (let rowNumber = 1; rowNumber <= worksheet.rowCount; rowNumber += 1) {
    const label = text(worksheet.getCell(rowNumber, 1));
    const value = numeric(worksheet.getCell(rowNumber, 2));
    const positionMatch = label.match(/^(\d+)/);
    if (positionMatch && value !== null) pointsByPosition[Number(positionMatch[1]) - 1] = value;
    if (normalizeName(label) === "pole") poleBonus = value;
  }
  if (pointsByPosition.length === 0) return null;

  const budgetValue = (label: string): number | null => {
    const row = findLabelRow(worksheet, 12, label);
    return row === null ? null : firstNumber(text(worksheet.getCell(row, 15)));
  };
  const rivalryValues = (label: string): number[] => {
    const row = findLabelRow(worksheet, 4, label);
    return row === null ? [] : numberList(text(worksheet.getCell(row, 6)));
  };
  const fastestLapPointsRow = findLabelRow(worksheet, 1, "Vuelta Rápida");
  const fastestLapPointsText = fastestLapPointsRow === null
    ? ""
    : text(worksheet.getCell(fastestLapPointsRow, 2));
  const soloRow = findLabelRow(worksheet, 4, "Si un piloto no tiene rivales");
  const budgetCapRow = findLabelRow(worksheet, 12, "Después del día de puja");

  return {
    pointsByPosition,
    poleBonus,
    fastestLapPoints: fastestLapPointsRow === null
      ? null
      : (numeric(worksheet.getCell(fastestLapPointsRow, 2))
        ?? (fastestLapPointsText.trim() === "-" ? 0 : null)),
    initialTeamBudget: budgetValue("Inicial"),
    moneyPerPoint: budgetValue("Puntos conseguidos"),
    polePrize: budgetValue("Pole"),
    fastestLapPrize: budgetValue("Vuelta Rápida"),
    cleanTeamPrize: budgetValue("Sin sancionados"),
    participationPrize: budgetValue("Participar equipo"),
    constructorPrizeByPosition: (() => {
      const row = findLabelRow(worksheet, 12, "Posición Constructores");
      return row === null ? [] : numberList(text(worksheet.getCell(row, 15)));
    })(),
    rivalryQualifyingPrizeByRank: rivalryValues("Clasificación"),
    rivalryRacePrizeByRank: rivalryValues("Carrera"),
    rivalryStagePrizeByRank: rivalryValues("Total al final de las seis carreras"),
    duoQualifyingPrizeByRank: padWithZeros(rivalryValues("Clasificación de dos"), 2),
    duoRacePrizeByRank: padWithZeros(rivalryValues("Carrera de dos"), 2),
    duoStagePrizeByRank: rivalryValues("Total al final de las seis carreras de dos"),
    soloDriverParticipationPrize: soloRow === null ? null : firstNumber(text(worksheet.getCell(soloRow, 4))),
    budgetCapAfterAuction: budgetCapRow === null ? null : firstNumber(text(worksheet.getCell(budgetCapRow, 12))),
  };
}

function comparePointEntities(
  category: "driver" | "team",
  excelEntities: ExcelEntityPoints[],
  systemLookup: Map<string, SystemEntityPoints>,
  knownRaceNames: Set<string>,
  differences: ReconciliationDifference[],
  unmatched: ReconciliationReport["unmatched"],
  onCompared: () => void,
): void {
  for (const excelEntity of excelEntities) {
    const key = category === "team" ? normalizeTeamName(excelEntity.name) : normalizeName(excelEntity.name);
    const systemEntity = systemLookup.get(key);
    if (!systemEntity) {
      unmatched.push({ category, name: excelEntity.name });
      continue;
    }
    for (const [raceName, excelPoints] of Object.entries(excelEntity.races)) {
      const raceKey = normalizeName(raceName);
      if (!knownRaceNames.has(raceKey)) {
        if (!nearlyEqual(excelPoints, 0)) unmatched.push({ category: "race", name: raceName });
        continue;
      }
      const systemRace = Object.entries(systemEntity.races)
        .find(([name]) => normalizeName(name) === raceKey);
      onCompared();
      addDifference(differences, category, excelEntity.name, raceName, excelPoints, systemRace?.[1] ?? 0);
    }
    if (excelEntity.total !== null) {
      onCompared();
      addDifference(differences, category, excelEntity.name, "Total", excelEntity.total, systemEntity.total);
    }
  }
}

function createLookup<T extends { name: string; aliases: string[] }>(
  entities: T[],
  teams: boolean,
  warnings: string[],
): Map<string, T> {
  const lookup = new Map<string, T>();
  const ambiguous = new Set<string>();
  for (const entity of entities) {
    for (const alias of [entity.name, ...entity.aliases]) {
      const key = teams ? normalizeTeamName(alias) : normalizeName(alias);
      const existing = lookup.get(key);
      if (existing && existing !== entity) {
        warnings.push(`Alias ambiguo en el sistema: ${alias}.`);
        ambiguous.add(key);
      }
      else lookup.set(key, entity);
    }
  }
  for (const key of ambiguous) lookup.delete(key);
  return lookup;
}

function addMissingSystemEntities(
  excelEntities: Array<{ name: string }>,
  systemEntities: Array<{ name: string; aliases: string[] }>,
  category: "driver" | "team",
  unmatched: ReconciliationReport["unmatched"],
): void {
  const excelNames = new Set(excelEntities.map((entity) => category === "team"
    ? normalizeTeamName(entity.name)
    : normalizeName(entity.name)));
  for (const entity of systemEntities) {
    const candidates = [entity.name, ...entity.aliases].map((name) => category === "team"
      ? normalizeTeamName(name)
      : normalizeName(name));
    if (!candidates.some((candidate) => excelNames.has(candidate))) {
      unmatched.push({ category, name: entity.name });
    }
  }
}

function compareOptionalRule(
  differences: ReconciliationDifference[],
  scope: string,
  excelValue: number | null,
  systemValue: number,
  onCompared: () => void,
): void {
  if (excelValue === null) return;
  onCompared();
  addDifference(differences, "rules", "Reglamento", scope, excelValue, systemValue);
}

function compareRuleArray(
  differences: ReconciliationDifference[],
  scope: string,
  excelValues: number[],
  systemValues: number[],
  onCompared: () => void,
): void {
  const length = Math.max(excelValues.length, systemValues.length);
  for (let index = 0; index < length; index += 1) {
    const excelValue = excelValues[index];
    const systemValue = systemValues[index];
    if (excelValue === undefined) {
      differences.push({
        category: "rules",
        entity: "Reglamento",
        scope: `${scope} ${index + 1}`,
        excelValue: 0,
        systemValue: systemValue ?? null,
        difference: null,
      });
      continue;
    }
    onCompared();
    addDifference(differences, "rules", "Reglamento", `${scope} ${index + 1}`,
      excelValue, systemValue ?? null);
  }
}

function addDifference(
  differences: ReconciliationDifference[],
  category: ReconciliationDifference["category"],
  entity: string,
  scope: string,
  excelValue: number,
  systemValue: number | null,
): void {
  if (systemValue !== null && nearlyEqual(excelValue, systemValue)) return;
  differences.push({
    category,
    entity,
    scope,
    excelValue,
    systemValue,
    difference: systemValue === null ? null : systemValue - excelValue,
  });
}

function findRow(worksheet: ExcelJS.Worksheet, predicate: (row: ExcelJS.Row) => boolean): number | null {
  for (let rowNumber = 1; rowNumber <= worksheet.rowCount; rowNumber += 1) {
    if (predicate(worksheet.getRow(rowNumber))) return rowNumber;
  }
  return null;
}

function findLabelRow(worksheet: ExcelJS.Worksheet, column: number, expected: string): number | null {
  const normalizedExpected = normalizeName(expected);
  for (let rowNumber = 1; rowNumber <= worksheet.rowCount; rowNumber += 1) {
    const label = normalizeName(text(worksheet.getCell(rowNumber, column)));
    if (label === normalizedExpected || label.startsWith(normalizedExpected)) return rowNumber;
  }
  return null;
}

function readRaceNames(header: ExcelJS.Row): string[] {
  return TOTAL_COLUMNS.flatMap((totalColumn) => {
    const names: string[] = [];
    for (let column = totalColumn - 6; column < totalColumn; column += 1) {
      const name = text(header.getCell(column));
      if (name) names.push(name);
    }
    return names;
  });
}

function numberList(value: string): number[] {
  return [...value.matchAll(/-?\d+(?:[.,]\d+)?/g)].map((match) => Number(match[0].replace(",", ".")));
}

function padWithZeros(values: number[], length: number): number[] {
  return Array.from({ length }, (_, index) => values[index] ?? 0);
}

function firstNumber(value: string): number | null {
  return numberList(value)[0] ?? null;
}

async function validateArchiveSize(buffer: Buffer): Promise<void> {
  let archive: JSZip;
  try {
    archive = await JSZip.loadAsync(buffer);
  } catch {
    throw new WorkbookValidationError("El archivo no es un contenedor .xlsx válido.");
  }
  const files = Object.values(archive.files);
  if (files.length > MAX_ARCHIVE_ENTRIES) {
    throw new WorkbookValidationError("El Excel contiene demasiados archivos internos.");
  }
  let totalSize = 0;
  for (const file of files) {
    const internal = file as unknown as { _data?: { uncompressedSize?: number } };
    const entrySize = internal._data?.uncompressedSize ?? 0;
    if (entrySize > MAX_UNCOMPRESSED_ENTRY_SIZE) {
      throw new WorkbookValidationError("Un archivo interno del Excel supera 10 MB.");
    }
    totalSize += entrySize;
    if (totalSize > MAX_UNCOMPRESSED_SIZE) {
      throw new WorkbookValidationError("El contenido descomprimido del Excel supera 25 MB.");
    }
  }
}

function structuralDescription(workbook: ExcelJS.Workbook): string {
  const description = workbook.worksheets.map((worksheet) => {
    const cells: string[] = [];
    worksheet.eachRow({ includeEmpty: false }, (row) => {
      row.eachCell({ includeEmpty: false }, (cell) => {
        const value = cell.value;
        if (typeof value === "object" && value !== null && "formula" in value) {
          cells.push(`${cell.address}:formula:${value.formula}`);
        } else if (typeof value === "object" && value !== null && "sharedFormula" in value) {
          cells.push(`${cell.address}:formula:${value.sharedFormula}`);
        } else if (typeof value === "string") {
          cells.push(`${cell.address}:text:${normalizeName(value)}`);
        } else if (value !== null) {
          cells.push(`${cell.address}:value`);
        }
      });
    });
    return { name: worksheet.name, rows: worksheet.rowCount, columns: worksheet.columnCount, cells };
  });
  return JSON.stringify(description);
}

function validateRequiredWorkbookRules(
  rules: NonNullable<ExcelControlData["rules"]>,
  errors: string[],
): void {
  const requiredScalars: Array<[string, number | null]> = [
    ["pole deportiva", rules.poleBonus],
    ["vuelta rápida deportiva", rules.fastestLapPoints],
    ["presupuesto inicial", rules.initialTeamBudget],
    ["dinero por punto", rules.moneyPerPoint],
    ["premio de pole", rules.polePrize],
    ["premio de vuelta rápida", rules.fastestLapPrize],
    ["premio sin sancionados", rules.cleanTeamPrize],
    ["premio por participar", rules.participationPrize],
    ["premio de piloto sin rival", rules.soloDriverParticipationPrize],
    ["límite después de la puja", rules.budgetCapAfterAuction],
  ];
  for (const [name, value] of requiredScalars) {
    if (value === null) errors.push(`Falta o no es válida la regla: ${name}.`);
  }

  const requiredArrays: Array<[string, number[], number]> = [
    ["puntos por posición", rules.pointsByPosition, 12],
    ["premios de constructores", rules.constructorPrizeByPosition, 3],
    ["rivalidad de clasificación", rules.rivalryQualifyingPrizeByRank, 3],
    ["rivalidad de carrera", rules.rivalryRacePrizeByRank, 3],
    ["rivalidad de bloque", rules.rivalryStagePrizeByRank, 3],
    ["rivalidad de dúo en clasificación", rules.duoQualifyingPrizeByRank, 2],
    ["rivalidad de dúo en carrera", rules.duoRacePrizeByRank, 2],
    ["rivalidad de dúo al final del bloque", rules.duoStagePrizeByRank, 2],
  ];
  for (const [name, values, expectedLength] of requiredArrays) {
    if (values.length !== expectedLength || values.some((value) => !Number.isFinite(value))) {
      errors.push(`Falta o no es válida la regla: ${name}.`);
    }
  }
}

function numeric(cell: ExcelJS.Cell): number | null {
  const value = cell.value;
  const candidate = typeof value === "object" && value !== null && "result" in value ? value.result : value;
  if (typeof candidate === "number" && Number.isFinite(candidate)) return candidate;
  if (typeof candidate === "string") {
    if (candidate.trim() === "") return null;
    const normalized = candidate.replace(",", ".").replace(/[^0-9.-]/g, "");
    if (!normalized || normalized === "-" || normalized === ".") return null;
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function text(cell: ExcelJS.Cell): string {
  const value = cell.value;
  const candidate = typeof value === "object" && value !== null && "result" in value ? value.result : value;
  if (typeof candidate === "string") return candidate.trim();
  if (typeof candidate === "number") return String(candidate);
  if (typeof candidate === "object" && candidate !== null && "richText" in candidate) {
    return candidate.richText.map((part) => part.text).join("").trim();
  }
  return "";
}

function stripDriverDecorations(value: string): string {
  return value.replace(/[★☆]+/g, "").trim();
}

function stripTeamSlot(value: string): string {
  return value.replace(/\s+\d+\s*$/, "").trim();
}

function normalizeTeamName(value: string): string {
  return normalizeName(stripTeamSlot(value));
}

function normalizeName(value: string): string {
  return stripDriverDecorations(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function nearlyEqual(left: number, right: number): boolean {
  return Math.abs(left - right) < 0.001;
}

function deduplicateUnmatched(items: ReconciliationReport["unmatched"]): ReconciliationReport["unmatched"] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = `${item.category}:${normalizeName(item.name)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
