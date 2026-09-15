import assert from "node:assert/strict";
import { test, beforeEach } from "node:test";
import { build } from "esbuild";
import { fileURLToPath } from "node:url";

// Adaptador de Firestore en memoria: impone lecturas antes de escrituras y commit atómico.
// Se ejecutan los servicios reales, incluidas sus referencias y cálculos económicos.
const state = { docs: new Map<string, any>(), failCommit: false, sequence: 0 };
(globalThis as any).__transferTest = state;
const firestore = `
const state = globalThis.__transferTest;
export const serverTimestamp = () => 'timestamp';
export const increment = value => ({ __increment: value });
export const deleteField = () => ({ __delete: true });
function ref(path) { const pieces = path.split('/'); return { path, id: pieces.at(-1), get parent() { return ref(pieces.slice(0,-1).join('/')); } }; }
export function doc(base, ...parts) { return ref([base.path, ...parts].filter(Boolean).join('/') + (parts.length ? '' : '/auto-' + (++state.sequence))); }
export function collection(base, path) { return ref([base.path, path].filter(Boolean).join('/')); }
function snapshot(r) { const data = structuredClone(state.docs.get(r.path)); return { ref: r, id: r.id, exists: () => data !== undefined, data: () => data }; }
export const getDoc = async r => snapshot(r);
export const getDocFromServer = getDoc;
export const getDocs = async r => ({ docs: [...state.docs.keys()].filter(p => p.startsWith(r.path + '/') && p.split('/').length === r.path.split('/').length + 1).map(p => snapshot(ref(p))).filter(s => (r.filters ?? []).every(([key, op, value]) => s.data()[key] === value)) });
export async function runTransaction(db, callback) {
  const writes = [];
  const tx = {
    get: async r => { if (writes.length) throw Error('Read after write'); return snapshot(r); },
    set: (r, data, options) => writes.push(['set', r, data, options]),
    update: (r, data) => writes.push(['update', r, data]),
    delete: r => writes.push(['delete', r]),
  };
  const result = await callback(tx);
  if (state.failCommit) throw Error('Injected commit failure');
  const next = new Map(structuredClone([...state.docs]));
  for (const [kind, r, data, options] of writes) {
    if (kind === 'delete') { next.delete(r.path); continue; }
    if (kind === 'update' && !next.has(r.path)) throw Error('Missing document: ' + r.path);
    const value = kind === 'update' || options?.merge ? { ...next.get(r.path) } : {};
    for (const [key, v] of Object.entries(data)) {
      const parts = kind === 'update' ? key.split('.') : [key];
      let target = value;
      for (const part of parts.slice(0,-1)) target = target[part] ??= {};
      const field = parts.at(-1);
      if (v && typeof v === 'object' && '__delete' in v) delete target[field];
      else target[field] = v && typeof v === 'object' && '__increment' in v ? (target[field] ?? 0) + v.__increment : structuredClone(v);
    }
    next.set(r.path, value);
  }
  state.docs = next;
  return result;
}
export const query = (r, ...filters) => ({ ...r, filters });
export const where = (...args) => args;
export const writeBatch = () => { throw Error('Unexpected non-transactional write'); };
export const updateDoc = writeBatch, setDoc = writeBatch, deleteDoc = writeBatch, addDoc = writeBatch;
`;
const bundle = await build({
  stdin: { contents: `export * from './transferService'; export * from './economyService'; export * from './auctionService'; export * from './splitRestoreService'; export { derivarAperturas, aplicarAperturas } from './splitBuilder';`, resolveDir: fileURLToPath(new URL(".", import.meta.url)) },
  bundle: true, write: false, format: "esm", platform: "node",
  plugins: [{ name: "memory-firestore", setup(builder) {
    builder.onResolve({ filter: /^firebase\/firestore$/ }, () => ({ path: "firestore", namespace: "test" }));
    builder.onResolve({ filter: /^\.\/firebase$/ }, () => ({ path: "db", namespace: "test" }));
    builder.onLoad({ filter: /.*/, namespace: "test" }, args => ({ contents: args.path === "db" ? "export const db = {};" : firestore, loader: "js" }));
  } }],
});
const services = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString("base64")}`);
const path = (split: string, team: string, pilot = "p") => `splits/${split}/equipos/${team}/pilotos/${pilot}`;
const budget = (split: string, team: string) => state.docs.get(`splits/${split}/equipos/${team}`).presupuesto;
const pacto = { splitId: "s1", nextSplitId: "s2", equipoOrigenId: "a", pilotoId: "p", equipoDestinoId: "b", precio: 20, tipo: "clausula", circuitoId: null };
beforeEach(() => {
  state.docs = new Map(); state.failCommit = false;
  for (const split of ["s1", "s2"]) {
    state.docs.set(`splits/${split}`, { nombre: split });
    for (const team of ["a", "b", "agente_libre"]) state.docs.set(`splits/${split}/equipos/${team}`, { nombre: team, presupuesto: 100 });
  }
  state.docs.set(path("s1", "a"), { pilotoId: "p", nombre: "Piloto", equipoId: "a", precio_compra: 5, rating_piloto: 80 });
  state.docs.set(path("s2", "agente_libre"), { pilotoId: "p", equipoId: "agente_libre", precio_compra: 0 });
});

test("pactar, modificar equipo/precio y deshacer restaura ficha y ambos saldos", async () => {
  const original = structuredClone(state.docs.get(path("s2", "agente_libre")));
  await services.guardarPacto(pacto);
  assert.equal(budget("s1", "b"), 80);
  assert.equal(state.docs.get(path("s2", "b")).nombre, "Piloto");
  await services.guardarPacto({ ...pacto, equipoDestinoId: "a", precio: 30 });
  assert.equal(budget("s1", "b"), 100);
  assert.equal(budget("s1", "a"), 70);
  await services.anularPacto("s1", "a", "p", "s2");
  assert.equal(budget("s1", "a"), 100);
  assert.deepEqual(state.docs.get(path("s2", "agente_libre")), original);
  assert.equal(state.docs.has(path("s2", "a")), false);
  await assert.rejects(services.anularPacto("s1", "a", "p", "s2"));
  assert.equal(budget("s1", "a"), 100);
});

test("-110 es un importe normal, su anulación recupera el saldo original", async () => {
  await services.guardarPacto({ ...pacto, precio: -110 });
  assert.equal(budget("s1", "b"), 210);
  assert.equal(state.docs.get(path("s2", "b")).precio_compra, -110);
  await services.anularPacto("s1", "a", "p", "s2");
  assert.equal(budget("s1", "b"), 100);
});

test("un precio negativo puede sanear un saldo temporalmente negativo", async () => {
  state.docs.get("splits/s2/equipos/b").presupuesto = -100;
  const result = await services.ficharPiloto({ splitId: "s2", teamId: "b", teamName: "b", pilotoId: "p", pilotName: "p", tipo: "fichaje", precio: -60 });
  assert.equal(result.success, true, result.message);
  assert.equal(budget("s2", "b"), -40);
});

test("un fallo de commit no cobra ni mueve fichas; tampoco deja una anulación a medias", async () => {
  const original = structuredClone([...state.docs]);
  state.failCommit = true;
  await assert.rejects(services.guardarPacto(pacto));
  assert.deepEqual([...state.docs], original);
  state.failCommit = false;
  await services.guardarPacto(pacto);
  const applied = structuredClone([...state.docs]);
  state.failCommit = true;
  await assert.rejects(services.anularPacto("s1", "a", "p", "s2"));
  assert.deepEqual([...state.docs], applied);
});

test("alta directa reversible, sin cobro duplicado y conservando otros ingresos", async () => {
  const params = { splitId: "s2", teamId: "b", teamName: "b", pilotoId: "p", pilotName: "p", tipo: "fichaje", precio: 25 };
  assert.equal((await services.ficharPiloto(params)).success, true);
  assert.equal(budget("s2", "b"), 75);
  assert.equal((await services.ficharPiloto(params)).success, false);
  state.docs.get("splits/s2/equipos/b").presupuesto += 7;
  await services.deshacerAlta("s2", "b", "p");
  assert.equal(budget("s2", "b"), 107);
  assert.equal(state.docs.has(path("s2", "agente_libre")), true);
  await assert.rejects(services.deshacerAlta("s2", "b", "p"));
});

test("cláusula configurable: también se revierte el ingreso del vendedor", async () => {
  state.docs.get("splits/s1").economia_config = { clausula_al_vendedor: true };
  const result = await services.ficharPiloto({ splitId: "s1", teamId: "b", teamName: "b", pilotoId: "p", pilotName: "p", tipo: "clausula", precio: 20 });
  assert.equal(result.success, true, result.message);
  assert.equal(budget("s1", "a"), 120);
  await services.deshacerAlta("s1", "b", "p");
  assert.equal(budget("s1", "a"), 100);
  assert.equal(budget("s1", "b"), 100);
});

test("la adjudicación real cobra una sola vez y cierra la sala en el mismo commit", async () => {
  state.docs.set("splits/s2/subasta/sala", { ...services.SALA_VACIA, modo: "real", estado: "en_curso", pilotoId: "p", pilotoNombre: "p", puja_equipo_id: "b", puja_actual: 15, termina_en: 0 });
  state.failCommit = true;
  assert.equal((await services.adjudicarSubasta("s2")).ok, false);
  assert.equal(budget("s2", "b"), 100);
  assert.equal(state.docs.get("splits/s2/subasta/sala").estado, "en_curso");
  state.failCommit = false;
  assert.equal((await services.adjudicarSubasta("s2")).ok, true);
  assert.equal((await services.adjudicarSubasta("s2")).ok, false);
  assert.equal(budget("s2", "b"), 85);
});

test("premios configurados y cláusula manual: procesar y revertir devuelve importes y precios exactos", async () => {
  state.docs.get("splits/s1").economia_config = { pole: 8, vuelta_rapida: 6, participacion: 0, sin_sancionados: 0, puntos_factor: 0 };
  const pilot = state.docs.get(path("s1", "a"));
  Object.assign(pilot, { mantener_actual: 12, clausula_actual: 37, clausula_manual: 37, precio_carrera_anterior: 14 });
  state.docs.set("splits/s1/circuitos/c1", { nombre: "C1", numero_carrera: 1, acta_cerrada: true, completado: true,
    resultados: [{ pilotoId: "p", equipoId: "a", qualyPos: 1, racePos: 1, fastestLap: true, isClean: true }] });
  const result = await services.procesarEconomiaCarrera("s1", "c1", "C1");
  assert.ok(result.processed > 0, result.message);
  assert.equal(budget("s1", "a"), 114);
  assert.equal(state.docs.get(path("s1", "a")).clausula_actual, 37);
  assert.equal((await services.procesarEconomiaCarrera("s1", "c1", "C1")).processed, 0);
  const reverted = await services.revertirEconomiaCarrera("s1", "c1");
  assert.equal(reverted.ok, true, reverted.message);
  assert.equal(budget("s1", "a"), 100);
  assert.equal(state.docs.get(path("s1", "a")).mantener_actual, 12);
  assert.equal(state.docs.get(path("s1", "a")).precio_carrera_anterior, 14);
  assert.equal((await services.revertirEconomiaCarrera("s1", "c1")).ok, false);
  assert.equal(budget("s1", "a"), 100);
});

test("heredar la apertura no cobra otra vez el pacto y su anulación corrige ambos splits", async () => {
  for (const team of ["a", "b"]) state.docs.get(`splits/s2/equipos/${team}`).presupuesto_inicial = 100;
  await services.guardarPacto(pacto);
  const { filas } = await services.derivarAperturas("s2", "s1");
  assert.equal(filas.find((f: any) => f.equipoId === "b").apertura, 80);
  assert.equal((await services.aplicarAperturas("s2", filas)).ok, true);
  assert.equal(budget("s2", "b"), 80);
  await services.anularPacto("s1", "a", "p", "s2");
  assert.equal(budget("s1", "b"), 100);
  assert.equal(budget("s2", "b"), 100);
  assert.equal(state.docs.get("splits/s2/equipos/b").presupuesto_inicial, 100);
});

test("un pacto actualiza el disponible heredado sin ocultarlo en el presupuesto inicial", async () => {
  Object.assign(state.docs.get("splits/s2/equipos/b"), { presupuesto_inicial: 100, presupuesto_origen_splitId: "s1" });
  await services.guardarPacto(pacto);
  assert.equal(budget("s2", "b"), 80);
  assert.equal(state.docs.get("splits/s2/equipos/b").presupuesto_inicial, 100);
  await services.anularPacto("s1", "a", "p", "s2");
  assert.equal(budget("s2", "b"), 100);
  assert.equal(state.docs.get("splits/s2/equipos/b").presupuesto_inicial, 100);
});

test("derivar el mercado incluye las altas directas y fija un resultado absoluto", async () => {
  state.docs.get("splits/s2/equipos/b").presupuesto_inicial = 100;
  state.docs.get(path("s2", "agente_libre")).restaurado_desde = "s1";
  await services.ficharPiloto({ splitId: "s2", teamId: "b", teamName: "b", pilotoId: "p", pilotName: "p", tipo: "fichaje", precio: 25 });
  assert.equal(state.docs.get(path("s2", "b")).restaurado_desde, null);
  const { filas } = await services.derivarAperturas("s2", "s1");
  assert.equal(filas.find((f: any) => f.equipoId === "b").apertura, 75);
  assert.equal((await services.aplicarAperturas("s2", filas.filter((f: any) => f.equipoId === "b"))).ok, true);
  assert.equal(budget("s2", "b"), 75);
  assert.equal(state.docs.get("splits/s2/equipos/b").presupuesto_inicial, 100);
});

test("Roses: 115,9 menos el mercado completo de 65,9 deja 50", async () => {
  state.docs.get("splits/s1/equipos/b").economia_historica = { presupuesto_cierre: 115.9 };
  state.docs.delete(path("s2", "agente_libre"));
  for (const [pilotoId, precio] of [["jota", 75], ["jose", 75], ["aparicio", -24.1], ["mesa", -60]] as const) {
    state.docs.set(path("s2", "b", pilotoId), { pilotoId, equipoId: "b", precio_compra: precio });
  }
  const { filas } = await services.derivarAperturas("s2", "s1");
  const roses = filas.find((f: any) => f.equipoId === "b");
  assert.equal(roses.cierreAnterior, 115.9);
  assert.equal(roses.mercado, -65.9);
  assert.equal(roses.apertura, 50);
  assert.equal((await services.aplicarAperturas("s2", [roses])).ok, true);
  assert.equal(budget("s2", "b"), 50);
  assert.equal(state.docs.get("splits/s2/equipos/b").presupuesto_inicial, 115.9);
});

test("rellenar un presupuesto inicial ausente no duplica el saldo vivo", async () => {
  delete state.docs.get("splits/s2/equipos/b").presupuesto_inicial;
  const { filas } = await services.derivarAperturas("s2", "s1");
  const team = filas.find((f: any) => f.equipoId === "b");
  assert.equal((await services.aplicarAperturas("s2", [team])).ok, true);
  assert.equal(budget("s2", "b"), 100);
  assert.equal(state.docs.get("splits/s2/equipos/b").presupuesto_inicial, 100);
});

test("no permite reconciliar el mercado después de iniciar la temporada", async () => {
  state.docs.get("splits/s2").temporada_iniciada = true;
  const { filas } = await services.derivarAperturas("s2", "s1");
  const result = await services.aplicarAperturas("s2", filas.filter((f: any) => f.equipoId === "b"));
  assert.equal(result.ok, false);
  assert.match(result.message, /temporada ya ha empezado/);
  assert.equal(budget("s2", "b"), 100);
});

function restorationFixture() {
  state.docs.get("splits/s1").orden = 2;
  state.docs.get("splits/s2").orden = 3;
  state.docs.get("splits/s1/equipos/b").presupuesto = 80;
  state.docs.get("splits/s1/equipos/b").economia_historica = { presupuesto_cierre: 100 };
  Object.assign(state.docs.get(path("s1", "a")), { mantener_actual: 15, clausula_actual: 10,
    puntos_piloto: 99, congelado: true, pending_equipoId: "b", pending_precio_compra: 20, pending_splitId: "s2" });
  state.docs.set(path("s2", "b"), { pilotoId: "p", equipoId: "b", precio_compra: 20 });
  state.docs.get("splits/s2/equipos/b").presupuesto = -10;
  state.docs.set("splits/s2/circuitos/c1", { nombre: "Circuito conservado", numero_carrera: 7, completado: true,
    resultados: [{ pilotoId: "p", racePos: 1 }], economia_procesada: true });
  state.docs.set("transacciones/old-target", { splitId: "s2", equipo: "b", cantidad: 200, esIngreso: false });
}

test("restaurar un split existente recupera el cierre sin cobrar la plantilla y limpia el mercado roto", async () => {
  restorationFixture();
  const preview = await services.previsualizarRestauracion("s1", "s2");
  assert.equal(preview.teams.find((t: any) => t.id === "b").saldo, 100);
  assert.equal(preview.pactos, 1);
  const result = await services.restaurarSplitDesdeCierre("s1", "s2", preview.version);
  assert.equal(budget("s2", "b"), 100);
  assert.equal(budget("s1", "b"), 100);
  assert.equal(state.docs.get(path("s1", "a")).puntos_piloto, 99);
  assert.equal(state.docs.get(path("s1", "a")).pending_equipoId, null);
  assert.equal(state.docs.get(path("s2", "a")).mantener_actual, 15);
  assert.equal(state.docs.get(path("s2", "a")).clausula_actual, 10);
  assert.equal(state.docs.get(path("s2", "a")).puntos_piloto, 0);
  assert.equal(state.docs.has(path("s2", "b")), false);
  assert.equal(state.docs.has(path("s2", "agente_libre")), false);
  assert.equal(state.docs.has("transacciones/old-target"), false);
  assert.equal(state.docs.get("splits/s2/circuitos/c1").nombre, "Circuito conservado");
  assert.deepEqual(state.docs.get("splits/s2/circuitos/c1").resultados, []);
  assert.equal(state.docs.get("splits/s2").fichajes_abiertos, false);
  const aperturas = await services.derivarAperturas("s2", "s1");
  assert.equal(aperturas.filas.find((f: any) => f.equipoId === "a").apertura, 100);
  const backup = [...state.docs.entries()].filter(([p]) => p.startsWith(`restauraciones_split/${result.backupId}/documentos/`));
  assert.ok(backup.some(([, block]) => block.documentos.some((d: any) => d.path === "transacciones/old-target" && d.data.cantidad === 200)));
});

test("un fallo al restaurar conserva los datos originales completos", async () => {
  restorationFixture();
  const preview = await services.previsualizarRestauracion("s1", "s2");
  const original = structuredClone([...state.docs]);
  state.failCommit = true;
  await assert.rejects(services.restaurarSplitDesdeCierre("s1", "s2", preview.version));
  assert.deepEqual([...state.docs], original);
});

test("la restauración rechaza una previsualización desactualizada", async () => {
  restorationFixture();
  const preview = await services.previsualizarRestauracion("s1", "s2");
  state.docs.get("splits/s2/equipos/b").presupuesto = 33;
  await assert.rejects(services.restaurarSplitDesdeCierre("s1", "s2", preview.version), /han cambiado/);
  assert.equal(budget("s2", "b"), 33);
});

test("sin cierre conciliado se recuperan los pactos del saldo vivo; respeta agentes libres declarados", async () => {
  restorationFixture();
  delete state.docs.get("splits/s1/equipos/b").economia_historica;
  state.docs.get(path("s1", "a")).estado_siguiente_split = "agente_libre";
  const preview = await services.previsualizarRestauracion("s1", "s2");
  assert.equal(preview.teams.find((t: any) => t.id === "b").saldo, 100);
  assert.equal(preview.libres, 1);
  await services.restaurarSplitDesdeCierre("s1", "s2", preview.version);
  assert.equal(state.docs.get(path("s2", "agente_libre")).clausula_actual, 10);
});
