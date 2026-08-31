import assert from "node:assert/strict";
import test from "node:test";
import ExcelJS from "exceljs";
import {
  readControlWorkbook,
  reconcileExcelWithSystem,
  type SystemControlData,
} from "../src/domain/excel-reconciliation.ts";
import { currentSeasonRules } from "../src/domain/rules.ts";

async function createWorkbook(options: {
  emptyData?: boolean;
  secondRaceName?: string;
  driverTotal?: number;
  omitMoneyPerPoint?: boolean;
  duplicateTeamMismatch?: boolean;
  futureZero?: boolean;
  badFutureTeamFormula?: boolean;
} = {}): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const rules = workbook.addWorksheet("Reglamento");
  rules.getCell("A1").value = "Posición";
  rules.getCell("B1").value = "Puntos";
  currentSeasonRules.points.byPosition.forEach((points, index) => {
    rules.getCell(index + 2, 1).value = `${index + 1}º`;
    rules.getCell(index + 2, 2).value = points;
  });
  rules.getCell("A14").value = "Pole";
  rules.getCell("B14").value = 2;
  rules.getCell("A15").value = "Vuelta Rápida";
  rules.getCell("B15").value = "-";
  const rivalryRows: Array<[number, string, string]> = [
    [7, "Clasificación", "1M - 0,5M - 0M"],
    [8, "Carrera", "2M - 1M - 0M"],
    [9, "Total al final de las seis carreras", "6M - 3M - 0M"],
    [10, "Clasificación de dos", "1M"],
    [11, "Carrera de dos", "2M"],
    [12, "Total al final de las seis carreras de dos", "4M - 2M"],
    [13, "Si un piloto no tiene rivales, por cada carrera que corra recibe 1,5M", ""],
  ];
  for (const [row, label, value] of rivalryRows) {
    rules.getCell(row, 4).value = label;
    rules.getCell(row, 6).value = value;
  }
  const budgetRows: Array<[number, string, string]> = [
    [3, "Inicial", "100M"],
    [4, "Puntos conseguidos", "0,1M"],
    [6, "Pole", "2M"],
    [7, "Vuelta Rápida", "1M"],
    [8, "Sin sancionados", "3M"],
    [9, "Participar equipo", "4M"],
    [10, "Posición Constructores", "20M - 15M - 10M"],
    [15, "Después del día de puja ningún jeque podrá tener más de 50M.", ""],
  ];
  for (const [row, label, value] of budgetRows) {
    if (options.omitMoneyPerPoint && label === "Puntos conseguidos") continue;
    rules.getCell(row, 12).value = label;
    rules.getCell(row, 15).value = value;
  }

  const season = workbook.addWorksheet("2026");
  season.getCell("C1").value = "Piloto";
  season.getCell("D1").value = "Puntos";
  season.getCell("G1").value = "Australia";
  season.getCell("H1").value = options.secondRaceName ?? "China";
  season.getCell("M1").value = "Puntos";
  if (!options.emptyData) {
    season.getCell("C2").value = "Jose ★★";
    season.getCell("D2").value = { formula: "SUM(G2:L2)", result: options.driverTotal ?? 31 };
    season.getCell("E2").value = "Zenith 1";
    season.getCell("G2").value = 18;
    season.getCell("H2").value = 13;
  }

  season.getCell("C20").value = "Escudería";
  season.getCell("D20").value = "Puntos";
  season.getCell("G20").value = "Australia";
  season.getCell("H20").value = "China";
  season.getCell("M20").value = "Puntos";
  if (!options.emptyData) {
    for (let row = 21; row <= 24; row += 1) {
      season.getCell(row, 3).value = `Zenith ${row - 20}`;
      season.getCell(row, 4).value = 31;
      season.getCell(row, 7).value = 18;
      season.getCell(row, 8).value = 13;
    }
    if (options.duplicateTeamMismatch) season.getCell(24, 8).value = 99;
  }
  season.getCell("A35").value = "RIVALIDADES";
  season.getCell("E50").value = "Presupuesto";
  if (!options.emptyData) {
    season.getCell("A51").value = "Zenith";
    season.getCell("E51").value = { formula: "100+10", result: 110 };
  }
  if (options.futureZero) {
    season.getCell("Y1").value = "Hungría";
    season.getCell("Y2").value = 0;
    season.getCell("Y20").value = "Hungría";
    for (let row = 21; row <= 24; row += 1) season.getCell(row, 25).value = 0;
  }
  if (options.badFutureTeamFormula) {
    season.getCell("W20").value = "Pilotos";
    season.getCell("Y20").value = "Hungría";
    season.getCell("Y21").value = {
      formula: "IFERROR(XLOOKUP($N21,$C$2:$C$11,Y$2:Y$11),0)",
      result: 0,
    };
  }

  return Buffer.from(await workbook.xlsx.writeBuffer());
}

function matchingSystem(): SystemControlData {
  return {
    rules: structuredClone(currentSeasonRules),
    raceNames: ["Australia", "China"],
    drivers: [{
      id: "driver-jose",
      name: "José",
      aliases: ["jose"],
      total: 31,
      races: { Australia: 18, China: 13 },
    }],
    teams: [{
      id: "team-zenith",
      name: "Zenith",
      aliases: ["zenith"],
      total: 31,
      races: { Australia: 18, China: 13 },
    }],
    budgets: [{
      id: "team-zenith",
      name: "Zenith",
      aliases: ["zenith"],
      budget: 110,
    }],
  };
}

test("lee el formato del Excel de control y normaliza nombres", async () => {
  const excel = await readControlWorkbook(await createWorkbook());

  assert.equal(excel.sheetName, "2026");
  assert.deepEqual(excel.rules?.pointsByPosition, currentSeasonRules.points.byPosition);
  assert.equal(excel.rules?.poleBonus, 2);
  assert.deepEqual(excel.drivers[0], {
    name: "Jose",
    total: 31,
    races: { Australia: 18, China: 13 },
  });
  assert.deepEqual(excel.teams[0], {
    name: "Zenith",
    total: 31,
    races: { Australia: 18, China: 13 },
  });
  assert.deepEqual(excel.budgets, [{ teamName: "Zenith", budget: 110 }]);
});

test("informa que Excel y sistema coinciden sin escribir datos", async () => {
  const excel = await readControlWorkbook(await createWorkbook());
  const report = reconcileExcelWithSystem(excel, matchingSystem());

  assert.equal(report.matches, true);
  assert.equal(report.differences.length, 0);
  assert.equal(report.unmatched.length, 0);
});

test("detalla una diferencia por carrera y presupuesto", async () => {
  const excel = await readControlWorkbook(await createWorkbook());
  const system = matchingSystem();
  system.drivers[0]!.races.China = 11;
  system.budgets[0]!.budget = 108;
  const report = reconcileExcelWithSystem(excel, system);

  assert.equal(report.matches, false);
  assert.ok(report.differences.some((difference) =>
    difference.category === "driver"
      && difference.entity === "Jose"
      && difference.scope === "China"
      && difference.difference === -2));
  assert.ok(report.differences.some((difference) =>
    difference.category === "budget" && difference.difference === -2));
});

test("un Excel vacío nunca puede indicar que todo coincide", async () => {
  const excel = await readControlWorkbook(await createWorkbook({ emptyData: true }));
  const report = reconcileExcelWithSystem(excel, matchingSystem());

  assert.equal(report.matches, false);
  assert.ok(report.validationErrors.some((error) => error.includes("pilotos está vacía")));
  assert.ok(report.unmatched.some((item) => item.category === "driver" && item.name === "José"));
});

test("un alias ambiguo bloquea la conciliación", async () => {
  const excel = await readControlWorkbook(await createWorkbook());
  const system = matchingSystem();
  system.drivers.push({
    id: "driver-other-jose",
    name: "Otro piloto",
    aliases: ["Jose"],
    total: 0,
    races: {},
  });
  const report = reconcileExcelWithSystem(excel, system);

  assert.equal(report.matches, false);
  assert.ok(report.validationErrors.some((error) => error.includes("Alias ambiguo")));
});

test("una estructura nueva cambia la huella y exige revisión", async () => {
  const current = await readControlWorkbook(await createWorkbook());
  const changed = await readControlWorkbook(await createWorkbook({ secondRaceName: "Shanghai" }));

  assert.notEqual(current.structureHash, changed.structureHash);
  assert.equal(reconcileExcelWithSystem(current, matchingSystem()).manualReviewRequired, true);
});

test("detecta un total cacheado que no coincide con las carreras", async () => {
  const excel = await readControlWorkbook(await createWorkbook({ driverTotal: 99 }));

  assert.ok(excel.validationErrors.some((error) =>
    error.includes("el total general es 99") && error.includes("suman 31")));
  assert.equal(reconcileExcelWithSystem(excel, matchingSystem()).matches, false);
});

test("rechaza un archivo que no sea XLSX", async () => {
  await assert.rejects(
    () => readControlWorkbook(Buffer.from("esto no es un excel")),
    /no es un contenedor .xlsx válido/,
  );
});

test("una regla escalar ausente bloquea la conciliación", async () => {
  const excel = await readControlWorkbook(await createWorkbook({ omitMoneyPerPoint: true }));

  assert.ok(excel.validationErrors.some((error) => error.includes("dinero por punto")));
  assert.equal(reconcileExcelWithSystem(excel, matchingSystem()).matches, false);
});

test("una fila duplicada de escudería inconsistente bloquea la conciliación", async () => {
  const excel = await readControlWorkbook(await createWorkbook({ duplicateTeamMismatch: true }));

  assert.ok(excel.validationErrors.some((error) => error.includes("valores distintos para China")));
  assert.equal(reconcileExcelWithSystem(excel, matchingSystem()).matches, false);
});

test("ignora ceros de carreras futuras todavía no cerradas", async () => {
  const excel = await readControlWorkbook(await createWorkbook({ futureZero: true }));
  const report = reconcileExcelWithSystem(excel, matchingSystem());

  assert.equal(report.matches, true);
  assert.ok(!report.unmatched.some((item) => item.name === "Hungría"));
});

test("detecta fórmulas de escudería que apuntan a otro bloque", async () => {
  const excel = await readControlWorkbook(await createWorkbook({ badFutureTeamFormula: true }));

  assert.ok(excel.validationErrors.some((error) =>
    error.includes("fórmula de Hungría") && error.includes("bloque W")));
});
