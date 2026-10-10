// Read-only diagnostic for the official f1-bugambra-control-v1 workbook layout.
// No Firebase imports, application writes, or inferred budget targets.
import ExcelJS from '../apps/api/node_modules/exceljs/excel.js';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const path = process.argv[2];
if (!path) throw new Error('Usage: node scripts/audit-workbook-economy.mjs /path/to/export.xlsx');
const bytes = await readFile(path);
const workbook = new ExcelJS.Workbook();
await workbook.xlsx.load(bytes);
const sheet = workbook.getWorksheet('2026');
if (!sheet || sheet.getCell('E50').text !== 'Presupuesto' || sheet.getCell('R50').text !== 'Fichajes T3') {
  throw new Error('Workbook layout changed; review the reader before interpreting its output.');
}
const round = n => Math.round((n + Number.EPSILON) * 1e6) / 1e6;
// These pre-Hungary scenarios are only meaningful for the current checkpoint:
// Hungary is the latest recorded race and no later market blocks are posted.
for (let row = 2; row <= 14; row++) for (const column of ['Z','AA','AB','AC','AD','AH','AI','AJ','AK','AL','AM']) {
  if (sheet.getCell(`${column}${row}`).value !== null) throw new Error('Later race data exists; extend the checkpoint model first.');
}
for (let row = 51; row <= 53; row++) for (let col = 19; col <= 41; col++) {
  if (sheet.getCell(row, col).value !== null) throw new Error('Later market or prize adjustments exist; extend the checkpoint model first.');
}
const value = address => {
  const cell = sheet.getCell(address);
  if (typeof cell.value === 'number') return cell.value;
  if (cell.type === ExcelJS.ValueType.Formula) {
    if (typeof cell.result === 'number') return cell.result;
    // Excel export omits cached zero for these SUM formulas.
    const match = cell.formula.match(/^SUM\(([A-Z]+\d+):([A-Z]+\d+)\)$/);
    if (match) {
      const a = sheet.getCell(match[1]); const b = sheet.getCell(match[2]);
      let total = 0;
      for (let r = a.row; r <= b.row; r++) for (let c = a.col; c <= b.col; c++) {
        // Merged team summary rows repeat the master; Excel SUM counts it once.
        const entry = sheet.getCell(r, c);
        if (!entry.isMerged || entry.master.address === entry.address) total += value(entry.address);
      }
      return total;
    }
    throw new Error(`Missing numeric cached result: ${address} (${cell.formula})`);
  }
  if (cell.value === null) return 0;
  throw new Error(`Not a number: ${address}`);
};
const cellEvidence = address => ({ address, value: sheet.getCell(address).value, formula: sheet.getCell(address).formula });
const baseTeam = text => text.replace(/ \d+$/, '');
const aliases = { Alex: 'Mimic', 'Jose ★★': 'Jose', 'Fabi ★': 'Fabi' };
const canonical = text => aliases[text] ?? text;
const blocks = [
  { name: 'T1', assignment: 'E', team: 'F', total: 'M', races: ['G','H','I','J','K','L'] },
  { name: 'T2', assignment: 'N', team: 'O', total: 'V', races: ['P','Q','R','S','T','U'] },
  { name: 'T3', assignment: 'W', team: 'X', total: 'AE', races: ['Y','Z','AA','AB','AC','AD'] },
];
const teams = [51,52,53].map(row => {
  const name = sheet.getCell(`A${row}`).text;
  const formula = sheet.getCell(`E${row}`).formula;
  const pointsAddress = formula.match(/100\+(D\d+)\*0\.1/)[1];
  const rivalry = blocks.map(block => {
    const entries = [];
    for (let r = 36; r <= 47; r++) if (baseTeam(sheet.getCell(`${block.team}${r}`).text) === name) {
      entries.push({ teamCell: `${block.team}${r}`, totalCell: `${block.total}${r}`, amount: value(`${block.total}${r}`) });
    }
    return { block: block.name, entries, total: entries.reduce((sum, e) => sum + e.amount, 0) };
  });
  const marks = [];
  for (const block of blocks) for (let r = 2; r <= 14; r++) {
    if (baseTeam(sheet.getCell(`${block.assignment}${r}`).text) !== name) continue;
    for (const col of block.races) {
      const cell = sheet.getCell(`${col}${r}`);
      if (cell.value !== null && (cell.font?.bold || cell.font?.color?.argb === 'FF9900FF')) {
        marks.push({ cell: cell.address, driver: sheet.getCell(`C${r}`).text,
          bold: cell.font?.bold === true, purple: cell.font?.color?.argb === 'FF9900FF' });
      }
    }
  }
  const roster = [];
  for (let r = 2; r <= 14; r++) if (baseTeam(sheet.getCell(`W${r}`).text) === name) {
    const driver = canonical(sheet.getCell(`C${r}`).text);
    const priceRow = Array.from({ length: 13 }, (_, i) => 57 + i * 2)
      .find(p => canonical(sheet.getCell(`A${p}`).text) === driver);
    if (!priceRow) throw new Error(`No reviewed price alias for ${driver}`);
    roster.push({ driver, assignment: `W${r}`, priceCell: `X${priceRow}`, price: value(`X${priceRow}`) });
  }
  const components = {
    seasonOpening: 100, points: round(value(pointsAddress) * .1),
    poles: value(`F${row}`) * 2, fastestLaps: value(`G${row}`),
    cleanTeams: value(`H${row}`) * 3, participation: value(`I${row}`) * 4,
    rivalries: rivalry.reduce((s, b) => s + b.total, 0),
  };
  const adjustments = Array.from({ length: 30 }, (_, i) => sheet.getCell(row, 12 + i))
    .filter(c => c.value !== null).map(c => ({ cell: c.address, label: sheet.getCell(50, c.col).text, amount: value(c.address) }));
  const reconstructed = round(Object.values(components).reduce((a,b) => a+b,0) - adjustments.reduce((a,b) => a+b.amount,0));
  const hungaryPoints = roster.reduce((sum, p) => sum + value(`Y${p.assignment.slice(1)}`),0);
  const hungaryMarks = marks.filter(m => m.cell.startsWith('Y'));
  const hungaryKnown = round(hungaryPoints * .1 + rivalry[2].total + 4
    + hungaryMarks.reduce((sum,m) => sum + (m.bold ? 2 : 0) + (m.purple ? 1 : 0),0));
  return { name, formulaCell: `E${row}`, formula, reportedBalance: value(`E${row}`), components,
    reconstructed, matchesCachedBalance: reconstructed === value(`E${row}`), rivalry, adjustments,
    counters: ['F','G','H','I'].map(c => cellEvidence(`${c}${row}`)), marks,
    boldCountMatchesPoleCounter: marks.filter(m => m.bold).length === value(`F${row}`),
    purpleCountMatchesFastestCounter: marks.filter(m => m.purple).length === value(`G${row}`),
    roster, rosterPriceSum: round(roster.reduce((s,p) => s+p.price,0)),
    transferAggregate: value(`R${row}`),
    unitemizedTransferAmount: round(value(`R${row}`) - roster.reduce((s,p) => s+p.price,0)),
    hungary: { points: hungaryPoints, recordedRivalries: rivalry[2].total,
      knownIncomeAssumingStyleSemanticsAndParticipation: hungaryKnown,
      preRaceIfNoCleanAward: round(reconstructed - hungaryKnown),
      preRaceIfCleanAward: round(reconstructed - hungaryKnown - 3),
      warning: 'H is a cumulative manual clean-race count; the workbook does not date these awards. Style semantics require administrator confirmation. No single pre-race target is asserted.' },
  };
});
console.log(JSON.stringify({ path, sha256: createHash('sha256').update(bytes).digest('hex'),
  sourceSheet: '2026', aliases,
  caveats: ['Rates reflect the explicit E51:E53 formulas and Reglamento O3:O9.',
    'Global clean-race counters cannot identify which races earned the award.',
    'Literal transfer aggregates may include league adjustments; missing itemization is not proof of a specific historical transaction.',
    'No database values or assumed inherited balances are used.'], teams }, null, 2));
