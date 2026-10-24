import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
import { fileURLToPath } from "node:url";

const state = { writes: [] as Array<[string, string, any]> };
(globalThis as any).__sugerenciasTest = state;
const firestore = `
const state = globalThis.__sugerenciasTest;
export const collection = (_db, path) => ({ path });
export const doc = (_db, ...parts) => ({ path: parts.join('/') });
export const arrayUnion = value => ({ union: value });
export const arrayRemove = value => ({ remove: value });
export const addDoc = async (ref, data) => { state.writes.push(['add', ref.path, data]); };
export const updateDoc = async (ref, data) => { state.writes.push(['update', ref.path, data]); };
export const deleteDoc = async ref => { state.writes.push(['delete', ref.path, null]); };
export const onSnapshot = (_ref, next) => { next({ docs: [] }); return () => {}; };
`;
const bundle = await build({
  stdin: { contents: "export * from './sugerenciasService';", resolveDir: fileURLToPath(new URL(".", import.meta.url)) },
  bundle: true, write: false, format: "esm", platform: "node",
  plugins: [{ name: "memory-firestore", setup(builder) {
    builder.onResolve({ filter: /^firebase\/firestore$/ }, () => ({ path: "firestore", namespace: "test" }));
    builder.onResolve({ filter: /^\.\/firebase$/ }, () => ({ path: "db", namespace: "test" }));
    builder.onLoad({ filter: /.*/, namespace: "test" }, args => ({ contents: args.path === "db" ? "export const db = {};" : firestore, loader: "js" }));
  } }],
});
const service = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString("base64")}`);

test("creación conserva el documento actual y los votos usan arrayUnion/arrayRemove", async () => {
  state.writes.length = 0;
  await service.crearSugerencia({ titulo: "Idea", descripcion: "Detalle", categoria: "interfaz", usuario_nombre: "Ana", usuario_uid: "u", usuario_email: "u@x", usuario_rol: "piloto" });
  await service.votarSugerencia("s", "u", false);
  await service.votarSugerencia("s", "u", true);
  assert.equal(state.writes[0][0], "add");
  assert.equal(state.writes[0][1], "mejoras");
  assert.deepEqual(Object.keys(state.writes[0][2]).sort(), ["categoria", "descripcion", "estado", "fecha", "titulo", "usuario_email", "usuario_nombre", "usuario_rol", "usuario_uid", "votos"].sort());
  assert.equal(state.writes[0][2].estado, "pendiente");
  assert.deepEqual(state.writes.slice(1), [["update", "mejoras/s", { votos: { union: "u" } }], ["update", "mejoras/s", { votos: { remove: "u" } }]]);
});

test("estado, respuesta y eliminación mantienen operaciones y rutas", async () => {
  state.writes.length = 0;
  await service.cambiarEstadoSugerencia("s", "revisando");
  await service.responderSugerencia("s", "  Pronto  ");
  await service.eliminarSugerencia("s");
  assert.deepEqual(state.writes, [
    ["update", "mejoras/s", { estado: "revisando" }],
    ["update", "mejoras/s", { respuesta_admin: "Pronto" }],
    ["delete", "mejoras/s", null],
  ]);
});
