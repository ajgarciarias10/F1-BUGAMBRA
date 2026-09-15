import assert from "node:assert/strict";
import test from "node:test";
import { planRevertFichaje, type FichaPrevia } from "./revertFichaje";

const ficha = (equipoId: string, datos: object): FichaPrevia => ({ equipoId, datos_json: JSON.stringify(datos) });

test("devuelve al piloto al equipo y precio que tenía antes del pacto", () => {
  const plan = planRevertFichaje(
    [{ equipoId: "zenith" }],
    [ficha("agente_libre", { equipoId: "agente_libre", precio_compra: 0, congelado: true })],
  );
  assert.deepEqual(plan.borrar, ["zenith"]);
  assert.deepEqual(JSON.parse(plan.restaurar[0].datos_json).equipoId, "agente_libre");
  assert.equal(plan.resultado, "restaurado");
});

test("no inventa una renovación cuando antes no tenía ficha en el split siguiente", () => {
  const plan = planRevertFichaje([{ equipoId: "roses" }], []);
  assert.deepEqual(plan.borrar, ["roses"]);
  assert.deepEqual(plan.restaurar, [], "el piloto se queda fuera, no vuelve a su equipo de origen");
  assert.equal(plan.resultado, "nada-que-restaurar");
});

test("borra todas las copias, no solo la del equipo del pacto", () => {
  const plan = planRevertFichaje([{ equipoId: "agente_libre" }, { equipoId: "roses" }], []);
  assert.deepEqual(plan.borrar, ["agente_libre", "roses"]);
});

test("un pacto sin foto se retira y se avisa en vez de adivinar el equipo", () => {
  const plan = planRevertFichaje([{ equipoId: "roses" }], null);
  assert.deepEqual(plan.borrar, ["roses"]);
  assert.deepEqual(plan.restaurar, []);
  assert.equal(plan.resultado, "sin-foto");
});

test("sin foto y sin fichas que borrar no hay nada que avisar", () => {
  assert.equal(planRevertFichaje([], null).resultado, "nada-que-restaurar");
});

test("restaura varias fichas si el piloto estaba duplicado antes del pacto", () => {
  const previas = [ficha("agente_libre", { precio_compra: 0 }), ficha("roses", { precio_compra: 12 })];
  const plan = planRevertFichaje([{ equipoId: "zenith" }], previas);
  assert.equal(plan.restaurar.length, 2);
  assert.equal(plan.resultado, "restaurado");
});

test("la foto se guarda tal cual: restaurar no pierde campos del documento", () => {
  const original = { equipoId: "agente_libre", precio_compra: 0, historial_precios: { spa: { mantener: 3 } }, participa_desde: 1 };
  const plan = planRevertFichaje([{ equipoId: "zenith" }], [ficha("agente_libre", original)]);
  assert.deepEqual(JSON.parse(plan.restaurar[0].datos_json), original);
});
