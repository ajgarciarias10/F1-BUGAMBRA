import ExcelJS from '../../apps/api/node_modules/exceljs/excel.js';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';

export const normalize = value => String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();

export async function downloadLeagueSheet(id, { fetcher = fetch, now = new Date(), directory = join(homedir(), 'backups/hoja-liga') } = {}) {
  if (!/^[A-Za-z0-9_-]+$/.test(id)) throw new Error('ID de hoja inválido');
  const response = await fetcher(`https://docs.google.com/spreadsheets/d/${id}/export?format=xlsx`);
  if (!response.ok) throw new Error(`No se pudo descargar la hoja: HTTP ${response.status}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  const sha256 = createHash('sha256').update(bytes).digest('hex');
  const stamp = now.toISOString().replace(/[:.]/g, '-');
  await mkdir(directory, { recursive: true });
  const path = join(directory, `libro-${stamp}-${sha256.slice(0, 12)}.xlsx`);
  await writeFile(path, bytes, { flag: 'wx' });
  return { bytes, sha256, path };
}

export async function loadSheet(bytes) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(bytes);
  const sheet = workbook.getWorksheet('2026');
  if (!sheet) throw new Error('Cambió el formato: falta la hoja 2026');
  for (const [address, expected] of Object.entries({
    C1: 'Piloto', C20: 'Escudería', E35: 'Piloto', A50: 'Escudería',
    E50: 'Presupuesto', R50: 'Fichajes T3', A56: 'Piloto', X56: 'Precio',
  })) {
    if (normalize(sheet.getCell(address).text) !== normalize(expected)) {
      throw new Error(`Cambió el formato: ${address} debe ser «${expected}»`);
    }
  }
  return sheet;
}

export async function loadAliases() {
  return JSON.parse(await readFile(new URL('../../docs/trabajo/migracion-postgres/aliases-hoja.json', import.meta.url), 'utf8'));
}

export function numeric(cell) {
  if (typeof cell.value === 'number') return cell.value;
  if (cell.value && typeof cell.value === 'object' && typeof cell.value.result === 'number') return cell.value.result;
  return null;
}

export function locateRace(sheet, split, raceName) {
  const blocks = [];
  for (let col = 1; col <= sheet.columnCount; col++) {
    if (normalize(sheet.getCell(1, col).text) === 'escuderia') blocks.push(col);
  }
  const teamColumn = blocks[split - 1];
  if (!teamColumn) throw new Error(`No existe el bloque del split ${split} en la hoja`);
  const nextBlock = blocks[split] ?? sheet.columnCount + 1;
  const matches = [];
  for (let col = teamColumn + 1; col < nextBlock; col++) {
    if (normalize(sheet.getCell(1, col).text) === normalize(raceName)) matches.push(col);
  }
  if (matches.length !== 1) throw new Error(`Circuito «${raceName}»: ${matches.length} columnas en el split ${split}`);
  const column = matches[0];
  if (normalize(sheet.getCell(35, column).text) !== normalize(raceName)
    || normalize(sheet.getCell(20, column).text) !== normalize(raceName)
    || normalize(sheet.getCell(56, column).text) !== normalize(raceName)) {
    throw new Error(`Cambió el formato: cabeceras de «${raceName}» no coinciden`);
  }
  let priceColumn = null;
  for (let col = teamColumn; col < column; col++) {
    if (normalize(sheet.getCell(56, col).text).startsWith('precio')) priceColumn = col;
  }
  if (priceColumn === null) throw new Error(`Cambió el formato: falta precio del split ${split}`);
  return { column, teamColumn, priceColumn };
}

export function sheetEvidence(sheet, split, raceName, aliases = {}) {
  const { column, teamColumn, priceColumn } = locateRace(sheet, split, raceName);
  const canonical = name => aliases[name] ?? name;
  const drivers = [];
  for (let row = 2; row < 20; row++) {
    const name = sheet.getCell(row, 3).text.trim();
    if (!name) continue;
    const points = sheet.getCell(row, column);
    const team = sheet.getCell(row, teamColumn);
    drivers.push({ name: canonical(name), nameCell: `C${row}`, points: numeric(points), pointsCell: points.address,
      team: team.text.replace(/\s+\d+$/, '').trim() || null, teamCell: team.address });
  }
  const rivalries = [];
  for (let row = 36; row < 50; row++) {
    const name = sheet.getCell(row, teamColumn).text.trim();
    if (!name) continue;
    const value = sheet.getCell(row, column);
    rivalries.push({ name: canonical(name), value: numeric(value), cell: value.address });
  }
  const teams = [];
  for (let row = 51; row < 56; row++) {
    const name = sheet.getCell(row, 1).text.trim();
    if (!name) continue;
    teams.push({ name, budget: numeric(sheet.getCell(row, 5)), budgetCell: `E${row}`,
    });
  }
  const transferHeader = `fichajes t${split}`;
  let transferColumn = null;
  for (let col = 1; col <= sheet.columnCount; col++) {
    if (normalize(sheet.getCell(50, col).text) === transferHeader) transferColumn = col;
  }
  if (transferColumn === null) throw new Error(`Cambió el formato: falta «${transferHeader}»`);
  for (const team of teams) {
    const row = Number(team.budgetCell.slice(1));
    team.transferTotal = numeric(sheet.getCell(row, transferColumn));
    team.transferCell = sheet.getCell(row, transferColumn).address;
  }
  const prices = [];
  for (let row = 57; row <= sheet.rowCount; row++) {
    const nameCell = sheet.getCell(row, 1);
    if (nameCell.value === null) break;
    const name = nameCell.text.trim();
    const cell = sheet.getCell(row, priceColumn);
    if (name && numeric(cell) !== null) prices.push({ name: canonical(name), value: numeric(cell), cell: cell.address });
  }
  return { sheet: '2026', raceCell: sheet.getCell(1, column).address, drivers, rivalries, teams, prices };
}
