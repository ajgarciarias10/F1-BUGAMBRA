import assert from "node:assert/strict";
import { test, beforeEach } from "node:test";
import { build } from "esbuild";
import { fileURLToPath } from "node:url";

// Adaptador de Firestore en memoria con lecturas antes de escrituras y commit atómico, para
// ejecutar el servicio real (incluida la escritura auditada) sin tocar ninguna base de datos.
const state = { docs: new Map<string, any>(), failCommit: false, beforeCommit: null as null | (() => void) };
(globalThis as any).__saldosTest = state;
const firestore = `
const state = globalThis.__saldosTest;
let sequence = 0;
export const serverTimestamp = () => 'timestamp';
function ref(path) { const pieces = path.split('/'); return { path, id: pieces.at(-1) }; }
export function doc(base, ...parts) { return ref([base.path, ...parts].filter(Boolean).join('/') + (parts.length ? '' : '/auto-' + (++sequence))); }
export function collection(base, path) { return ref([base.path, path].filter(Boolean).join('/')); }
function snapshot(r) { const data = structuredClone(state.docs.get(r.path)); return { ref: r, id: r.id, exists: () => data !== undefined, data: () => data }; }
export const getDocs = async r => ({ docs: [...state.docs.keys()].filter(p => p.startsWith(r.path + '/') && p.split('/').length === r.path.split('/').length + 1).map(p => snapshot(ref(p))).filter(s => (r.filters ?? []).every(([key, , value]) => s.data()[key] === value)) });
export const query = (r, ...filters) => ({ ...r, filters });
export const where = (...args) => args;
export const getDoc = async r => snapshot(r);
export const getDocFromServer = getDoc;
export const increment = value => ({ __increment: value });
export const deleteField = () => ({ __delete: true });
const unexpectedWrite = () => { throw Error('Unexpected non-transactional write'); };
export const writeBatch = unexpectedWrite, updateDoc = unexpectedWrite, setDoc = unexpectedWrite, deleteDoc = unexpectedWrite, addDoc = unexpectedWrite;
export async function runTransaction(db, callback) {
  const writes = [];
  const tx = {
    get: async r => { if (writes.length) throw Error('Read after write'); return snapshot(r); },
    set: (r, data) => writes.push(['set', r, data]),
    update: () => { throw Error('Unexpected update'); },
    delete: r => writes.push(['delete', r]),
  };
  const result = await callback(tx);
  if (state.failCommit) throw Error('Injected commit failure');
  for (const [kind, r, data] of writes) kind === 'delete' ? state.docs.delete(r.path) : state.docs.set(r.path, structuredClone(data));
  return result;
}
`;
const bundle = await build({
  stdin: { contents: "export * from './saldosHistoricosService';", resolveDir: fileURLToPath(new URL(".", import.meta.url)) },
  bundle: true, write: false, format: "esm", platform: "node",
  plugins: [{ name: "memory-firestore", setup(builder) {
    builder.onResolve({ filter: /^firebase\/firestore$/ }, () => ({ path: "firestore", namespace: "test" }));
    builder.onResolve({ filter: /^\.\/auth$/ }, () => ({ path: "auth", namespace: "test" }));
    builder.onResolve({ filter: /^\.\/firebase$/ }, () => ({ path: "db", namespace: "test" }));
    builder.onLoad({ filter: /.*/, namespace: "test" }, args => ({ contents: args.path === "db" ? "export const db = {};" : args.path === "auth" ? "export const auth = { currentUser: { uid: 'admin' } };" : firestore, loader: "js" }));
  } }],
});
const service = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString("base64")}`);

let txSeq = 0;
const asiento = (equipoId: string, cantidad: number, esIngreso: boolean, fecha: number | null, circuitoId?: string, extra: Record<string, unknown> = {}) => {
  state.docs.set(`transacciones/t${++txSeq}`, {
    splitId: "s3", equipoId, equipo: equipoId, tipo: circuitoId ? "premio_carrera" : "ajuste",
    cantidad, esIngreso, fecha: fecha === null ? null : { seconds: fecha / 1000 }, ...(circuitoId ? { circuitoId } : {}), ...extra,
  });
};
const circuito = (id: string, numero: number, data: Record<string, unknown> = {}) =>
  state.docs.set(`splits/s3/circuitos/${id}`, { nombre: id.toUpperCase(), numero_carrera: numero, economia_procesada: true, economia_version: 1, ...data });

// Split con dos escuderías: a abrió con 100 y tenía fichado a P1 por 60 (el mercado inicial no
// se asentó, como en las aperturas derivadas); b abrió con 50 con un piloto de precio negativo
// (-20 ingresa) y una ficha restaurada que no se cobró. GP1 y GP2 liquidados; entre ellos a fichó
// a P2 por 10 y b recibió una devolución de 5; tras GP2 hay un premio. GP3 sin liquidar.
beforeEach(() => {
  state.docs = new Map(); state.failCommit = false; txSeq = 0;
  state.docs.set("splits/s3", { nombre: "Split 3" });
  state.docs.set("splits/s3/equipos/a", { nombre: "A", presupuesto_inicial: 100, presupuesto: 45 });
  state.docs.set("splits/s3/equipos/b", { nombre: "B", presupuesto_inicial: 50, presupuesto: 81.5 });
  state.docs.set("splits/s3/equipos/agente_libre", { nombre: "Agentes libres", presupuesto: 0 });
  state.docs.set("pilotos/p1", { nombre: "P1" });
  state.docs.set("pilotos/p2", { nombre: "P2" });
  state.docs.set("splits/s3/equipos/a/pilotos/p1", { precio_compra: 60 });
  state.docs.set("splits/s3/equipos/a/pilotos/p2", { precio_compra: 10 });
  state.docs.set("splits/s3/equipos/a/pilotos/p3", { precio_compra: 0 });
  state.docs.set("splits/s3/equipos/b/pilotos/p4", { precio_compra: -20 });
  state.docs.set("splits/s3/equipos/b/pilotos/p5", { precio_compra: 30, restaurado_desde: "s2" });
  circuito("gp1", 1); circuito("gp2", 2); circuito("gp3", 3, { economia_procesada: false });
  asiento("a", 8, true, 1000, "gp1"); asiento("b", 4, true, 1000, "gp1");
  asiento("a", 10, false, 1500, undefined, { tipo: "fichaje", piloto: "P2" }); // cargo extra entre GP
  asiento("b", 5, true, 1600);   // devolución entre GP
  asiento("a", 6, true, 2000, "gp2"); asiento("b", 2.5, true, 2000, "gp2");
  asiento("a", 1, true, 3000);   // premio tras el último GP
  // Saldos vivos: a = 100 − 60 + 8 − 10 + 6 + 1 = 45; b = 50 + 20 + 4 + 5 + 2.5 = 81.5
});

const vista = async (referencias?: Record<string, { saldo: number; referenciaLibro: string }>) => {
  const fuente = await service.cargarFuenteSaldos("s3");
  return { fuente, vista: service.reconstruirSaldosSplit(fuente, referencias) };
};
const equipo = (v: any, id: string) => v.equipos.find((e: any) => e.id === id);
const sinCambios = () => structuredClone([...state.docs]);

test("el mercado cobra precios positivos, ingresa los negativos e ignora fichas restauradas o a cero", () => {
  assert.equal(service.mercadoPlantilla([{ precio_compra: 60 }, { precio_compra: -20 }, { precio_compra: 0 }, { precio_compra: 30, restaurado_desde: "s2" }]), -40);
});

test("reconstruye hacia atrás desde el saldo vivo; fichajes y devoluciones entre GP quedan en el antes siguiente", async () => {
  const { vista: v } = await vista();
  assert.deepEqual(v.problemas, []);
  const a = equipo(v, "a"), b = equipo(v, "b");
  assert.deepEqual(a.tramos.map((t: any) => [t.antes, t.ingresos, t.despues]), [[40, 8, 48], [38, 6, 44]]);
  assert.deepEqual(b.tramos.map((t: any) => [t.antes, t.ingresos, t.despues]), [[70, 4, 74], [79, 2.5, 81.5]]);
  // El fichaje de P2 está en la plantilla pero se cobró después del primer GP: se descuenta.
  assert.equal(a.mercado, -70); assert.equal(a.mercadoPosterior, -10); assert.equal(a.apertura, 40); assert.equal(a.desvio, 0);
  assert.equal(b.mercado, 20); assert.equal(b.apertura, 70); assert.equal(b.desvio, 0);
  assert.deepEqual(v.carreras.map((c: any) => c.estado), ["reconstruible", "reconstruible", "sin_liquidar"]);
  assert.equal(v.escribible, true);
});

test("un desvío frente a inicial + mercado se muestra con su tamaño y no escribe nada", async () => {
  state.docs.get("splits/s3/equipos/b").presupuesto = 90;
  const { fuente, vista: v } = await vista();
  assert.equal(equipo(v, "b").desvio, 8.5);
  assert.equal(v.escribible, false);
  const antes = sinCambios();
  await assert.rejects(service.guardarSaldosReconstruidos(fuente, v), /no está demostrada/);
  assert.deepEqual([...state.docs], antes);
});

test("un piloto liberado con su cargo en el libro desvía, bloquea y se nombra", async () => {
  asiento("a", 15, false, 500, undefined, { tipo: "fichaje", piloto: "Pepe" });
  state.docs.get("splits/s3/equipos/a").presupuesto = 30;
  const { vista: v } = await vista();
  assert.equal(equipo(v, "a").desvio, -15);
  assert.deepEqual(equipo(v, "a").pilotosFuera, ["Pepe"]);
  assert.equal(v.escribible, false);
});

test("si todo cuadra escribe los GP sin saldo con origen reconstruido y una sola auditoría", async () => {
  const { fuente, vista: v } = await vista();
  assert.deepEqual(await service.guardarSaldosReconstruidos(fuente, v), { circuitos: 2 });
  assert.deepEqual(state.docs.get("splits/s3/circuitos/gp1").economia_saldos, {
    a: { antes: 40, ingresos: 8, despues: 48, origen: "reconstruido" },
    b: { antes: 70, ingresos: 4, despues: 74, origen: "reconstruido" },
  });
  assert.equal(state.docs.get("splits/s3/circuitos/gp1").economia_procesada, true);
  assert.equal(state.docs.get("splits/s3/circuitos/gp3").economia_saldos, undefined);
  const audits = [...state.docs.entries()].filter(([path]) => path.startsWith("admin_audit/"));
  assert.equal(audits.length, 1);
  assert.equal(audits[0][1].action, "economy_balances_rebuild");
  assert.equal(audits[0][1].before["splits/s3/circuitos/gp1"].economia_saldos, undefined);
  // Ningún saldo vivo cambia.
  assert.equal(state.docs.get("splits/s3/equipos/a").presupuesto, 45);
  assert.equal(state.docs.get("splits/s3/equipos/b").presupuesto, 81.5);
});

test("un saldo que cambia tras la vista previa rechaza la escritura sin dejar nada", async () => {
  const { fuente, vista: v } = await vista();
  state.docs.get("splits/s3/equipos/a").presupuesto = 44;
  const antes = sinCambios();
  await assert.rejects(service.guardarSaldosReconstruidos(fuente, v), /ha cambiado/);
  assert.deepEqual([...state.docs], antes);
});

test("un GP liquidado o revertido tras la vista previa rechaza la escritura", async () => {
  const { fuente, vista: v } = await vista();
  circuito("gp2", 2, { economia_version: 2 });
  await assert.rejects(service.guardarSaldosReconstruidos(fuente, v), /GP2 ha cambiado/);
  assert.equal(state.docs.get("splits/s3/circuitos/gp1").economia_saldos, undefined);
});

test("un fallo de commit no deja saldos a medias", async () => {
  const { fuente, vista: v } = await vista();
  const antes = sinCambios();
  state.failCommit = true;
  await assert.rejects(service.guardarSaldosReconstruidos(fuente, v));
  assert.deepEqual([...state.docs], antes);
});

test("no sobrescribe un GP con saldos guardados y exige que coincidan con los reconstruidos", async () => {
  circuito("gp2", 2, { economia_saldos: { a: { antes: 38, ingresos: 6, despues: 44 }, b: { antes: 79, ingresos: 2.5, despues: 81.5 } } });
  const { fuente, vista: v } = await vista();
  assert.equal(v.escribible, true);
  assert.deepEqual(v.carreras.map((c: any) => c.estado), ["reconstruible", "ya_guardado", "sin_liquidar"]);
  await service.guardarSaldosReconstruidos(fuente, v);
  assert.equal(state.docs.get("splits/s3/circuitos/gp2").economia_saldos.a.origen, undefined);

  circuito("gp2", 2, { economia_saldos: { a: { antes: 38, ingresos: 6, despues: 45 }, b: { antes: 79, ingresos: 2.5, despues: 81.5 } } });
  const otra = await vista();
  assert.equal(otra.vista.escribible, false);
  assert.match(otra.vista.problemas.join(" "), /A: el saldo guardado tras GP2 \(45M\) no coincide/);
});

test("un asiento sin fecha o un GP liquidado sin asientos hacen el split no demostrable", async () => {
  asiento("a", 1, false, null);
  let { vista: v } = await vista();
  assert.equal(v.escribible, false);
  assert.match(v.problemas.join(" "), /no tiene fecha/);

  state.docs.delete(`transacciones/t${txSeq}`);
  circuito("gp0", 0.5);
  ({ vista: v } = await vista());
  assert.equal(v.escribible, false);
  assert.match(v.problemas.join(" "), /GP0 está liquidado pero no tiene asientos/);
});

test("un GP sin liquidar (como Hungría) se muestra pero nunca se rellena", async () => {
  circuito("gp1", 1, { economia_procesada: false });
  for (const id of ["t1", "t2", "t4"]) state.docs.delete(`transacciones/${id}`);
  state.docs.get("splits/s3/equipos/a").presupuesto = 37;
  state.docs.get("splits/s3/equipos/b").presupuesto = 72.5;
  const { fuente, vista: v } = await vista();
  assert.equal(v.carreras[0].estado, "sin_liquidar");
  assert.equal(equipo(v, "a").tramos.length, 1);
  assert.equal(v.escribible, true, v.problemas.join(" "));
  await service.guardarSaldosReconstruidos(fuente, v);
  assert.equal(state.docs.get("splits/s3/circuitos/gp1").economia_saldos, undefined);
  assert.deepEqual(state.docs.get("splits/s3/circuitos/gp2").economia_saldos.a, { antes: 30, ingresos: 6, despues: 36, origen: "reconstruido" });
});

test("un asiento de un GP sin liquidar bloquea la escritura", async () => {
  asiento("a", 3, true, 4000, "gp3");
  state.docs.get("splits/s3/equipos/a").presupuesto = 48;
  const { vista: v } = await vista();
  assert.equal(v.escribible, false);
  assert.match(v.problemas.join(" "), /es de un GP sin liquidar/);
});

test("un checkpoint oficial que cuadra permite guardar un ajuste manual y audita su cifra y referencia", async () => {
  // Ajuste de comisarios sin asiento de tope: 70M teóricos, 50M oficiales antes del GP1.
  state.docs.get("splits/s3/equipos/b").presupuesto = 61.5;
  const { fuente, vista: v } = await vista({ b: { saldo: 50, referenciaLibro: "2026!R53" } });
  const b = equipo(v, "b");
  assert.equal(b.aperturaPlantilla, 70);
  assert.equal(b.apertura, 50);
  assert.equal(b.desvio, -20);
  assert.equal(b.desvioReferencia, 0);
  assert.equal(v.escribible, true);
  const balances = fuente.equipos.map((e: any) => [e.id, e.presupuesto]);
  await service.guardarSaldosReconstruidos(fuente, v);
  assert.equal(state.docs.get("splits/s3/circuitos/gp1").economia_saldos.b.antes, 50);
  const audits = [...state.docs.entries()].filter(([path]) => path.startsWith("admin_audit/"));
  assert.equal(audits.length, 1);
  assert.match(audits[0][1].summary, /b: 50M \(2026!R53\)/);
  for (const [id, balance] of balances) assert.equal(state.docs.get(`splits/s3/equipos/${id}`).presupuesto, balance);
});

test("un checkpoint que discrepa bloquea aunque inicial + mercado cuadre", async () => {
  const { fuente, vista: v } = await vista({ b: { saldo: 50, referenciaLibro: "2026!R53" } });
  assert.equal(equipo(v, "b").desvio, 0);
  assert.equal(equipo(v, "b").desvioReferencia, 20);
  assert.equal(v.escribible, false);
  const antes = sinCambios();
  await assert.rejects(service.guardarSaldosReconstruidos(fuente, v), /no está demostrada/);
  assert.deepEqual([...state.docs], antes);
});

test("un checkpoint sin hoja y celda bloquea incluso cuando ambos saldos cuadran", async () => {
  for (const referenciaLibro of ["", "   ", "R53", "2026", "2026!"]) {
    const { fuente, vista: v } = await vista({ b: { saldo: 70, referenciaLibro } });
    assert.equal(v.escribible, false, referenciaLibro);
    assert.match(v.problemas.join(" "), /hoja y celda/);
    const antes = sinCambios();
    await assert.rejects(service.guardarSaldosReconstruidos(fuente, v), /no está demostrada/);
    assert.deepEqual([...state.docs], antes);
  }
});

test("un checkpoint no numérico bloquea sin volver a inicial + mercado", async () => {
  for (const saldo of [NaN, Infinity]) {
    const { fuente, vista: v } = await vista({ b: { saldo, referenciaLibro: "2026!R53" } });
    assert.equal(v.escribible, false);
    assert.match(v.problemas.join(" "), /saldo oficial válido/);
    await assert.rejects(service.guardarSaldosReconstruidos(fuente, v), /no está demostrada/);
  }
});

test("guardar vuelve a validar el checkpoint aunque la vista conserve escribible", async () => {
  for (const checkpoint of [{ saldo: 50, referenciaLibro: "2026!R53" }, { saldo: 70, referenciaLibro: "" }]) {
    const { fuente, vista: v } = await vista({ b: { saldo: 70, referenciaLibro: "2026!R53" } });
    assert.equal(v.escribible, true);
    v.checkpoints.b = checkpoint;
    const antes = sinCambios();
    await assert.rejects(service.guardarSaldosReconstruidos(fuente, v), /no está demostrada/);
    assert.deepEqual([...state.docs], antes);
  }
});

test("el checkpoint admite hasta 0,1M de desvío en ambos sentidos y bloquea fuera del margen", async () => {
  for (const saldo of [69.9, 70.1, 69.89, 70.11]) {
    const { vista: v } = await vista({ b: { saldo, referenciaLibro: "2026!R53" } });
    assert.equal(v.escribible, saldo === 69.9 || saldo === 70.1, String(saldo));
  }
});

test("el checkpoint no permite saltarse problemas del libro ni cambios desde la vista previa", async () => {
  const referencias = { b: { saldo: 70, referenciaLibro: "2026!R53" } };
  const { fuente, vista: v } = await vista(referencias);
  state.docs.get("splits/s3/equipos/b").presupuesto = 82;
  const antes = sinCambios();
  await assert.rejects(service.guardarSaldosReconstruidos(fuente, v), /ha cambiado/);
  assert.deepEqual([...state.docs], antes);
  asiento("a", 1, true, null);
  const otra = await vista(referencias);
  assert.equal(otra.vista.escribible, false);
  assert.match(otra.vista.problemas.join(" "), /no tiene fecha/);
});

test("conserva un saldo negativo existente", async () => {
  state.docs.get("splits/s3/equipos/a").presupuesto_inicial = 50;
  state.docs.get("splits/s3/equipos/a").presupuesto = -5;
  const { vista: v } = await vista();
  assert.deepEqual(equipo(v, "a").tramos.map((t: any) => t.antes), [-10, -12]);
  assert.equal(equipo(v, "a").desvio, 0);
});

test("asientos antiguos sin equipoId se atribuyen por nombre; uno sin escudería bloquea", async () => {
  state.docs.set("transacciones/legacy", { splitId: "s3", equipo: "A", cantidad: 2, esIngreso: true, fecha: { seconds: 3.5 } });
  state.docs.get("splits/s3/equipos/a").presupuesto = 47;
  let { vista: v } = await vista();
  assert.equal(v.escribible, true);
  assert.equal(equipo(v, "a").tramos[1].despues, 44);

  state.docs.set("transacciones/huerfano", { splitId: "s3", equipo: "Desconocida", cantidad: 2, esIngreso: true, fecha: { seconds: 3.6 } });
  ({ vista: v } = await vista());
  assert.equal(v.escribible, false);
  assert.match(v.problemas.join(" "), /huerfano no corresponde/);
});

test("la marca o un asiento de tope no recortan la apertura teórica: sin checkpoint se bloquea", async () => {
  state.docs.set("splits/s3", { nombre: "Split 3", economia_tope_aplicado: true });
  state.docs.get("splits/s3/equipos/b").presupuesto = 61.5;
  for (const conAsiento of [false, true]) {
    if (conAsiento) state.docs.set("transacciones/tope_subasta__s3__b", {
      splitId: "s3", equipoId: "b", equipo: "B", tipo: "ajuste", cantidad: 20, esIngreso: false, fecha: { seconds: 0.1 },
    });
    const { fuente, vista: v } = await vista();
    assert.equal(equipo(v, "b").apertura, 70);
    assert.equal(equipo(v, "b").saldoAntesPrimerGp, 50);
    assert.equal(equipo(v, "b").desvio, -20);
    assert.equal(v.escribible, false);
    const antes = sinCambios();
    await assert.rejects(service.guardarSaldosReconstruidos(fuente, v), /no está demostrada/);
    assert.deepEqual([...state.docs], antes);
  }
});

test("un asiento de tope fechado se cuenta una sola vez según su lugar en el libro", async () => {
  state.docs.get("splits/s3/equipos/b").presupuesto = 61.5;
  for (const seconds of [0.1, 1.7, 3.5]) {
    state.docs.set("transacciones/tope_subasta__s3__b", {
      splitId: "s3", equipoId: "b", equipo: "B", tipo: "ajuste", cantidad: 20, esIngreso: false, fecha: { seconds },
    });
    const saldo = seconds < 1 ? 50 : 70;
    const { vista: v } = await vista({ b: { saldo, referenciaLibro: "2026!R53" } });
    const b = equipo(v, "b");
    assert.equal(b.saldoAntesPrimerGp, saldo);
    assert.equal(b.desvioReferencia, 0);
    assert.equal(b.tramos[0].despues, saldo + 4);
    assert.equal(b.tramos[1].despues, seconds > 2 ? 81.5 : 61.5);
    assert.equal(v.escribible, true, v.problemas.join(" "));
  }
});
