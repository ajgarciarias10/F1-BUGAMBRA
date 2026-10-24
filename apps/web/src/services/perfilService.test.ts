import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
import { fileURLToPath } from "node:url";

const state = { docs: new Map<string, any>(), writes: [] as Array<[string, string, any]> };
(globalThis as any).__perfilTest = state;
const firestore = `
const state = globalThis.__perfilTest;
export const doc = (_db, ...parts) => ({ path: parts.join('/') });
export const collection = (_db, path) => ({ path });
export const getDoc = async ref => ({ exists: () => state.docs.has(ref.path), data: () => state.docs.get(ref.path) });
export const getDocs = async ref => ({ docs: [...state.docs.entries()].filter(([path]) => path.startsWith(ref.path + '/')).map(([path, value]) => ({ id: path.split('/').at(-1), data: () => value })) });
export const updateDoc = async (ref, data) => { state.writes.push(['update', ref.path, data]); state.docs.set(ref.path, { ...state.docs.get(ref.path), ...data }); };
export const runTransaction = async (_db, callback) => {
  const pending = [];
  const tx = {
    get: ref => getDoc(ref),
    set: (ref, data) => pending.push(['set', ref.path, data]),
  };
  await callback(tx);
  state.writes.push(...pending);
  for (const [, path, data] of pending) state.docs.set(path, data);
};
`;
const bundle = await build({
  stdin: { contents: "export * from './perfilService';", resolveDir: fileURLToPath(new URL(".", import.meta.url)) },
  bundle: true, write: false, format: "esm", platform: "node",
  plugins: [{ name: "memory-firestore", setup(builder) {
    builder.onResolve({ filter: /^firebase\/firestore$/ }, () => ({ path: "firestore", namespace: "test" }));
    builder.onResolve({ filter: /^\.\/firebase$/ }, () => ({ path: "db", namespace: "test" }));
    builder.onLoad({ filter: /.*/, namespace: "test" }, args => ({ contents: args.path === "db" ? "export const db = {};" : firestore, loader: "js" }));
  } }],
});
const service = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString("base64")}`);

test("perfil y logo conservan rutas, campos y null de borrado", async () => {
  state.docs.clear(); state.writes.length = 0;
  await service.guardarPerfil("u", "Nombre", "https://foto");
  await service.guardarLogoEquipo("s3", "a", "");
  assert.deepEqual(state.writes, [
    ["update", "usuarios/u", { nombre: "Nombre", foto_url: "https://foto" }],
    ["update", "splits/s3/equipos/a", { logo_url: null }],
  ]);
});

test("alta no sobrescribe un perfil existente y rechaza una reivindicación ajena", async () => {
  state.docs.clear(); state.writes.length = 0;
  state.docs.set("usuarios/u", { nombre: "Anterior" });
  await service.provisionProfile({ uid: "u", email: "u@ejemplo.com", displayName: "Nuevo", photoURL: "" }, "u@ejemplo.com");
  assert.deepEqual(state.docs.get("usuarios/u"), { nombre: "Anterior" });
  assert.deepEqual(state.docs.get("auth_emails/u@ejemplo.com"), { uid: "u", email: "u@ejemplo.com", auth_email: "u@ejemplo.com" });
  state.docs.set("auth_emails/otro@ejemplo.com", { uid: "otro" });
  await assert.rejects(service.provisionProfile({ uid: "u", email: "otro@ejemplo.com" }, "otro@ejemplo.com"), /Ya existe una cuenta/);
  assert.deepEqual(state.docs.get("auth_emails/otro@ejemplo.com"), { uid: "otro" });
});

test("Google detecta correo asociado a otro UID", async () => {
  state.docs.clear();
  state.docs.set("usuarios/otro", { email: "U@EJEMPLO.COM" });
  assert.equal(await service.perfilGoogleExistente("u", "u@ejemplo.com"), true);
  state.docs.set("usuarios/u", { email: "u@ejemplo.com" });
  assert.equal(await service.perfilGoogleExistente("u", "u@ejemplo.com"), false);
});
