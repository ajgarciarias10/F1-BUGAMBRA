import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { downloadLeagueSheet, loadAliases, loadSheet, normalize, sheetEvidence } from './lib/league-sheet.mjs';

const amount = value => typeof value === 'number' && Number.isFinite(value) ? value : null;
const key = value => normalize(value ?? '');
const equal = (left, right) => left !== null && right !== null && Math.abs(left - right) < 1e-8;

export function compareRace(evidence, docs, splitId, raceId) {
  const race = docs.find(doc => doc.path === `splits/${splitId}/circuitos/${raceId}`);
  if (!race) throw new Error(`No existe ${splitId}/${raceId} en la copia de Firebase`);
  const results = Array.isArray(race.data.resultados) ? race.data.resultados : [];
  const teams = docs.filter(doc => new RegExp(`^splits/${splitId}/equipos/[^/]+$`).test(doc.path));
  const teamById = new Map(teams.map(doc => [doc.path.split('/').at(-1), doc.data.nombre]));
  const transactions = docs.filter(doc => doc.path.startsWith('transacciones/')
    && doc.data.splitId === splitId && doc.data.circuitoId === raceId);
  const compared = [];
  const add = (category, name, cell, sheet, app, note = '') => compared.push({ category, name, cell, sheet, app,
    status: sheet === null || app === null ? 'desconocido' : equal(sheet, app) ? 'coincide' : 'difiere', note });

  for (const driver of evidence.drivers) {
    const result = results.find(item => key(item.pilotoNombre) === key(driver.name));
    add('puntos', driver.name, driver.pointsCell, driver.points, amount(result?.puntos),
      result ? '' : 'Sin resultado de este piloto en la copia');
    const appTeam = result ? teamById.get(result.equipoId) ?? null : null;
    compared.push({ category: 'equipo', name: driver.name, cell: driver.teamCell, sheet: driver.team,
      app: appTeam, status: !driver.team || !appTeam ? 'desconocido' : key(driver.team) === key(appTeam) ? 'coincide' : 'difiere' });
    for (const [category, app] of [['clasificación', result?.qualyPos], ['llegada', result?.racePos]]) {
      compared.push({ category, name: driver.name, cell: null, sheet: null, app: amount(app), status: 'desconocido',
        note: 'La hoja solo registra puntos; no permite deducir posiciones' });
    }
  }
  for (const result of results) {
    if (!evidence.drivers.some(driver => key(driver.name) === key(result.pilotoNombre))) {
      add('puntos', result.pilotoNombre, null, null, amount(result.puntos), 'Piloto ausente en la tabla de la hoja');
    }
  }
  for (const entry of evidence.rivalries) {
    const matching = transactions.filter(doc => doc.data.tipo === 'rivalidad' && key(doc.data.piloto) === key(entry.name));
    const app = matching.length ? matching.reduce((sum, doc) => sum + (doc.data.esIngreso ? 1 : -1) * Number(doc.data.cantidad), 0) : null;
    add('rivalidad', entry.name, entry.cell, entry.value, app,
      matching.length ? '' : 'No hay asiento de rivalidad para este piloto y carrera');
  }
  const roster = docs.filter(doc => new RegExp(`^splits/${splitId}/equipos/[^/]+/pilotos/[^/]+$`).test(doc.path));
  for (const pilot of roster) {
    const name = pilot.data.nombre;
    const matches = evidence.prices.filter(entry => key(entry.name) === key(name));
    const unique = [...new Set(matches.map(entry => entry.value))];
    const price = unique.length === 1 ? matches[0] : null;
    add('fichaje', name, price?.cell ?? null, price?.value ?? null, amount(pilot.data.precio_compra),
      price ? '' : 'Precio de hoja ausente o ambiguo');
  }
  for (const entry of evidence.teams) {
    const team = teams.find(doc => key(doc.data.nombre) === key(entry.name));
    add('presupuesto actual', entry.name, entry.budgetCell, entry.budget, amount(team?.data.presupuesto),
      'Ambos son saldos actuales de sus respectivas fuentes; la hoja puede incluir jornadas aún no importadas');
    const teamRoster = roster.filter(doc => doc.data.equipoId === team?.path.split('/').at(-1));
    const total = teamRoster.length ? teamRoster.reduce((sum, doc) => sum + Number(doc.data.precio_compra), 0) : null;
    add('fichajes del split', entry.name, entry.transferCell, entry.transferTotal, total,
      'El agregado de la hoja puede incluir ajustes no desglosados');
    for (const [type, category] of [['ingreso_puntos', 'premio puntos'], ['pole', 'premio pole'],
      ['vuelta_rapida', 'premio vuelta rápida'], ['sin_sancionados', 'premio sin sanciones'],
      ['premio_carrera', 'premio participación']]) {
      const matches = transactions.filter(doc => doc.data.equipoId === team?.path.split('/').at(-1) && doc.data.tipo === type);
      compared.push({ category, name: entry.name, cell: null, sheet: null,
        app: matches.length ? matches.reduce((sum, doc) => sum + Number(doc.data.cantidad), 0) : null,
        status: 'desconocido', note: 'La hoja no desglosa este premio por jornada en una celda numérica' });
    }
  }
  return { source: 'f1_import_test.documento (copia fiel de Firebase)', splitId, raceId,
    raceName: race.data.nombre, economyProcessedInCopy: race.data.economia_procesada ?? null,
    comparisons: compared, summary: {
      coincide: compared.filter(item => item.status === 'coincide').length,
      difiere: compared.filter(item => item.status === 'difiere').length,
      desconocido: compared.filter(item => item.status === 'desconocido').length,
    } };
}

export function loadStagingDocuments(splitId) {
  if (!/^[a-z0-9_]+$/.test(splitId)) throw new Error('ID de split inválido');
  const query = `SELECT json_build_object('path',path,'data',data) FROM f1_import_test.documento
    WHERE path = 'splits/${splitId}' OR path LIKE 'splits/${splitId}/%'
      OR (coleccion = 'transacciones' AND data->>'splitId' = '${splitId}') ORDER BY seq`;
  const output = execFileSync('docker', ['exec', 'f1-postgres', 'psql', '-X', '-q', '-t', '-A',
    '-U', 'f1_bugambra', '-d', 'f1_bugambra', '-c', query], { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
  return output.trim().split('\n').filter(Boolean).map(line => JSON.parse(line));
}

async function main() {
  const args = process.argv.slice(2);
  const option = flag => args[args.indexOf(flag) + 1];
  const splitId = option('--split');
  const raceId = option('--race');
  if (!splitId || !raceId || !/^[a-z0-9_]+$/.test(splitId) || !/^[a-z0-9_]+$/.test(raceId)) {
    throw new Error('Uso: node scripts/check-race-against-sheet.mjs --split <id> --race <id>');
  }
  const id = process.env.LEAGUE_SHEET_ID?.trim()
    ?? (await readFile(`${process.env.HOME}/.secrets/league-sheet-id`, 'utf8')).trim();
  const docs = loadStagingDocuments(splitId);
  const race = docs.find(doc => doc.path === `splits/${splitId}/circuitos/${raceId}`);
  if (!race) throw new Error(`No existe ${splitId}/${raceId} en f1_import_test`);
  const split = Number(splitId.match(/^split_(\d+)$/)?.[1]);
  if (!Number.isInteger(split) || split < 1) throw new Error('La hoja 2026 no tiene un bloque para ese split');
  const download = await downloadLeagueSheet(id);
  const sheet = await loadSheet(download.bytes);
  const evidence = sheetEvidence(sheet, split, race.data.nombre, await loadAliases());
  console.log(JSON.stringify({ workbook: { file: download.path, sha256: download.sha256, sheet: evidence.sheet,
    raceCell: evidence.raceCell }, ...compareRace(evidence, docs, splitId, raceId) }, null, 2));
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}
