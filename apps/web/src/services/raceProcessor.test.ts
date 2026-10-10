import assert from 'node:assert/strict';
import { test, beforeEach } from 'node:test';
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';

const state = { docs: new Map<string, any>(), failCommit: false, sequence: 0, commits: 0 };
(globalThis as any).__raceTest = state;
const firestore = `
const state = globalThis.__raceTest;
export const serverTimestamp = () => 'timestamp';
function ref(path) { const parts = path.split('/'); return { path, id: parts.at(-1) }; }
export const doc = (base, ...parts) => ref([base.path, ...parts].filter(Boolean).join('/') + (parts.length ? '' : '/auto-' + (++state.sequence)));
export const collection = (base, path) => ref([base.path, path].filter(Boolean).join('/'));
function snapshot(r) { const data = structuredClone(state.docs.get(r.path)); return { ref:r, id:r.id, exists:()=>data !== undefined, data:()=>data }; }
export const getDoc = async r => snapshot(r);
export const getDocs = async r => ({ docs: [...state.docs.keys()].filter(p => p.startsWith(r.path + '/') && p.split('/').length === r.path.split('/').length + 1).map(p => snapshot(ref(p))) });
export async function runTransaction(db, callback) {
  const writes = [];
  const result = await callback({
    get: async r => { if (writes.length) throw Error('Read after write'); return snapshot(r); },
    update: (r, data) => writes.push(['update', r, data]),
    set: (r, data) => writes.push(['set', r, data]),
  });
  if (state.failCommit) throw Error('Injected commit failure');
  const next = new Map(structuredClone([...state.docs]));
  for (const [kind, r, data] of writes) {
    if (kind === 'update' && !next.has(r.path)) throw Error('Missing document');
    next.set(r.path, { ...(kind === 'update' ? next.get(r.path) : {}), ...structuredClone(data) });
  }
  state.docs = next;
  state.commits++;
  return result;
}
export const writeBatch = () => { throw Error('Unexpected non-transactional write'); };
export const updateDoc = writeBatch;
`;
const bundle = await build({
  stdin: { contents: `export { processRace, revertirCarreraCompleta } from './raceProcessor';`, resolveDir: fileURLToPath(new URL('.', import.meta.url)) },
  bundle: true, write: false, format: 'esm', platform: 'node',
  plugins: [{ name: 'memory-firestore', setup(builder) {
    builder.onResolve({ filter: /^firebase\/firestore$/ }, () => ({ path: 'firestore', namespace: 'test' }));
    builder.onResolve({ filter: /^\.\/(firebase|auth)$/ }, args => ({ path: args.path, namespace: 'test' }));
    builder.onLoad({ filter: /.*/, namespace: 'test' }, args => ({ contents: args.path === './firebase'
      ? "export const db = {}; export const OperationType = { UPDATE:'update' }; export const handleFirestoreError = error => { throw error; };"
      : args.path === './auth' ? "export const auth = { currentUser: { uid: 'admin' } };" : firestore, loader: 'js' }));
  } }],
});
const service = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);
const teamPath = 'splits/s/equipos/team';
const pilotPath = `${teamPath}/pilotos/p`;
const racePath = 'splits/s/circuitos/r1';
const result = (racePos: number, isDnf = false) => [{ pilotoId: 'p', qualyPos: 1, racePos, isDnf, isClean: true, fastestLap: true }];
beforeEach(() => {
  state.docs = new Map([
    ['splits/s', {}],
    [teamPath, { puntos_constructores: 0, presupuesto: 80 }],
    [pilotPath, { rating_base: 70, rating_piloto: 70, puntos_piloto: 0 }],
    ['splits/s/roster/p', { rating_base: 70, rating_piloto: 70, puntos_piloto: 0 }],
    [racePath, { numero_carrera: 1, resultados: [], completado: false, acta_cerrada: false, economia_procesada: false }],
  ]);
  state.failCommit = false;
  state.commits = 0;
});

test('race save and DNF correction update points, ratings, flat roster and audit in one commit', async () => {
  await service.processRace('s', 'r1', result(1));
  assert.equal(state.commits, 1);
  assert.equal(state.docs.get(teamPath).puntos_constructores, 18);
  assert.equal(state.docs.get(pilotPath).puntos_piloto, 18);
  await service.processRace('s', 'r1', result(99, true));
  assert.equal(state.commits, 2);
  assert.equal(state.docs.get(teamPath).puntos_constructores, 2);
  assert.equal(state.docs.get(pilotPath).puntos_piloto, 2);
  assert.equal(state.docs.get(pilotPath).dnfs, 1);
  assert.equal(state.docs.get(pilotPath).victorias, 0);
  assert.equal(state.docs.get('splits/s/roster/p').rating_piloto, state.docs.get(pilotPath).rating_piloto);
  assert.equal(state.docs.get(teamPath).presupuesto, 80);
  assert.equal([...state.docs.keys()].filter(path => path.startsWith('admin_audit/')).length, 2);
});

test('commit failure leaves results, points, rating and audits unchanged', async () => {
  const before = structuredClone([...state.docs]);
  state.failCommit = true;
  await assert.rejects(service.processRace('s', 'r1', result(1)), /Injected commit failure/);
  assert.deepEqual([...state.docs], before);
});

test('reset is atomic and repeatable, returns stats and rating to their pre-race state', async () => {
  await service.processRace('s', 'r1', result(1));
  assert.equal((await service.revertirCarreraCompleta('s', 'r1')).ok, true);
  assert.equal(state.commits, 2);
  assert.equal(state.docs.get(teamPath).puntos_constructores, 0);
  assert.equal(state.docs.get(pilotPath).puntos_piloto, 0);
  assert.equal(state.docs.get(pilotPath).rating_piloto, 70);
  assert.equal(state.docs.get(racePath).completado, false);
  assert.equal((await service.revertirCarreraCompleta('s', 'r1')).ok, true);
  assert.equal(state.docs.get(teamPath).presupuesto, 80);
});

test('reset does not partially undo a paid race or one with later paid economy', async () => {
  await service.processRace('s', 'r1', result(1));
  state.docs.get(racePath).economia_procesada = true;
  let before = structuredClone([...state.docs]);
  assert.equal((await service.revertirCarreraCompleta('s', 'r1')).ok, false);
  assert.deepEqual([...state.docs], before);
  state.docs.get(racePath).economia_procesada = false;
  state.docs.set('splits/s/circuitos/r2', { numero_carrera: 2, economia_procesada: true });
  before = structuredClone([...state.docs]);
  assert.equal((await service.revertirCarreraCompleta('s', 'r1')).ok, false);
  assert.deepEqual([...state.docs], before);
});
