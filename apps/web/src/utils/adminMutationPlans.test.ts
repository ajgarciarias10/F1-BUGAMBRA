import assert from "node:assert/strict";
import test from "node:test";
import { mergeDoc, planActaCerrada, planBooleanFlag, planNameEdit, planPhotoEdit } from "./adminMutationPlans.ts";

test("boolean flag flips from the expected stored value and keeps other fields", () => {
  const r = planBooleanFlag({ fichajes_abiertos: false, x: 1 }, "fichajes_abiertos", false, { mercado_cerrado_por_plantillas: false });
  assert.equal(r.next, true);
  assert.deepEqual(r.after, { fichajes_abiertos: true, x: 1, mercado_cerrado_por_plantillas: false });
});

test("boolean flag treats a missing field as false and rejects stale panel state", () => {
  assert.equal(planBooleanFlag({}, "f", false).next, true);
  assert.throws(() => planBooleanFlag({ f: true }, "f", false), /cambió/);
  assert.throws(() => planBooleanFlag(null, "f", false), /no existe/);
});

test("acta is a no-op when already in the requested state", () => {
  assert.equal(planActaCerrada({ acta_cerrada: true }, true).after, null);
  assert.equal(planActaCerrada({}, false).after, null);
  assert.deepEqual(planActaCerrada({ acta_cerrada: false, a: 1 }, true).after, { acta_cerrada: true, a: 1 });
  assert.deepEqual(planActaCerrada({ acta_cerrada: true }, false).after, { acta_cerrada: false });
  assert.throws(() => planActaCerrada(null, true));
});

test("name edit writes only existing docs and fails when none exist", () => {
  const w = planNameEdit({ "usuarios/a": { nombre: "Old", k: 1 }, "plantilla/a": null, "pilotos/a": { nombre: "Old" } }, "New");
  assert.deepEqual(Object.keys(w), ["usuarios/a", "pilotos/a"]);
  assert.deepEqual(w["usuarios/a"], { nombre: "New", k: 1 });
  assert.throws(() => planNameEdit({ "usuarios/a": null }, "New"));
});

test("photo edit merges, skips optional missing update targets, and requires required ones", () => {
  const currents = { "pilotos/a": null, "plantilla/a": null, "r/a": { foto_url: "old", n: 1 } };
  const w = planPhotoEdit(currents, [
    { path: "pilotos/a", mode: "merge" },
    { path: "plantilla/a", mode: "update" },
    { path: "r/a", mode: "merge" },
  ], null);
  assert.deepEqual(w, { "pilotos/a": { foto_url: null }, "r/a": { foto_url: null, n: 1 } });
  assert.throws(() => planPhotoEdit(currents, [{ path: "plantilla/a", mode: "update", required: true }], "u"));
});

test("mergeDoc does not mutate its input", () => {
  const cur = { a: 1 };
  assert.deepEqual(mergeDoc(cur, { b: 2 }), { a: 1, b: 2 });
  assert.deepEqual(cur, { a: 1 });
});
