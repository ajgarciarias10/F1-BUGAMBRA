import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ExcelJS from '../apps/api/node_modules/exceljs/excel.js';
import { compareRace } from './check-race-against-sheet.mjs';
import { loadSheet, locateRace, sheetEvidence } from './lib/league-sheet.mjs';

const workbookPath = `${process.env.HOME}/backups/hoja-liga/libro-2026-11-04-8f6009254a03.xlsx`;

test('rechaza cambios en la cabecera usada', async () => {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(await readFile(workbookPath));
  workbook.getWorksheet('2026').getCell('E50').value = 'Otra cosa';
  await assert.rejects(loadSheet(await workbook.xlsx.writeBuffer()), /E50/);
});

test('localiza la carrera por nombre y conserva vacíos como desconocidos', async () => {
  const sheet = await loadSheet(await readFile(workbookPath));
  assert.equal(sheet.getCell(1, locateRace(sheet, 3, 'Hungría').column).address, 'Y1');
  const evidence = sheetEvidence(sheet, 3, 'Hungría', { Alex: 'Mimic' });
  const mimic = evidence.drivers.find(item => item.name === 'Mimic');
  assert.equal(mimic.pointsCell, 'Y3');
  assert.equal(evidence.drivers.find(item => item.name === 'Mesa').points, null);
});

test('compara la copia sin inferir posiciones ni sustituir vacíos por cero', () => {
  const evidence = { drivers: [{ name: 'Mimic', points: 16, pointsCell: 'Y5', team: 'Alfa Romero', teamCell: 'W5' }],
    rivalries: [], prices: [], teams: [] };
  const docs = [
    { path: 'splits/split_3/circuitos/hungria', data: { nombre: 'Hungría', resultados: [
      { pilotoNombre: 'Mimic', puntos: 16, qualyPos: 16, racePos: 1, equipoId: 'equipo_alfa_romero' },
    ] } },
    { path: 'splits/split_3/equipos/equipo_alfa_romero', data: { nombre: 'Alfa Romero' } },
  ];
  const report = compareRace(evidence, docs, 'split_3', 'hungria');
  assert.equal(report.comparisons.find(item => item.category === 'puntos').status, 'coincide');
  assert.equal(report.comparisons.find(item => item.category === 'llegada').status, 'desconocido');
  evidence.drivers[0].points = null;
  assert.equal(compareRace(evidence, docs, 'split_3', 'hungria').comparisons[0].status, 'desconocido');
});
