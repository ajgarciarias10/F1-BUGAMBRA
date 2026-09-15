import assert from "node:assert/strict";
import test from "node:test";
import { canFinalizeMarket, marketCompletion } from "./marketLifecycle";

test("un split sin escuderías o con solo agentes libres no se cierra", () => {
  assert.equal(marketCompletion([], []).complete, false);
  assert.equal(marketCompletion([{ id: "agente_libre" }], []).complete, false);
});

test("solo los equipos confirmados cierran el mercado", () => {
  const state = marketCompletion([{ id: "a", plantilla_completa: true }, { id: "b" }], [
    { pilotoId: "p1", equipoId: "a" },
    { pilotoId: "p2", equipoId: "a" },
    { pilotoId: "p3", equipoId: "b" },
  ]);
  assert.deepEqual(state.teams.map(team => team.complete), [true, false]);
  assert.equal(state.complete, false);
});

test("un equipo puede tener cualquier número de pilotos", () => {
  const state = marketCompletion([{ id: "a", plantilla_completa: true }, { id: "b", plantilla_completa: true }], [
    { pilotoId: "gratis", equipoId: "a" },
    { pilotoId: "negativo", equipoId: "b" },
    { pilotoId: "normal", equipoId: "b" },
  ]);
  assert.equal(state.complete, true);
  assert.equal(state.teams.find(team => team.id === "b")?.pilots.length, 2);
});

test("no cuenta pilotos que salieron ni duplica fichas", () => {
  const state = marketCompletion([{ id: "a", plantilla_completa: true }], [
    { pilotoId: "p1", equipoId: "a" },
    { pilotoId: "p1", equipoId: "a" },
    { pilotoId: "p2", equipoId: "a", participa_hasta: 3 },
    { pilotoId: "p3", equipoId: "agente_libre" },
  ]);
  assert.equal(state.teams[0].pilots.length, 1);
  assert.equal(state.complete, true);
});

test("la finalización de un split no depende de las plantillas de otro", () => {
  const teams = [{ id: "a", plantilla_completa: true }];
  assert.equal(marketCompletion(teams, [{ pilotoId: "p1", equipoId: "a" }]).complete, true);
  assert.equal(marketCompletion(teams, []).complete, false);
});

test("los simulacros pendientes de deshacer nunca anuncian ni cierran mercado", () => {
  assert.equal(canFinalizeMarket({ fichajes_abiertos: true }, { estado: "adjudicada", simulacion_reversiones: [{}] }), false);
  assert.equal(canFinalizeMarket({ fichajes_abiertos: true }, { estado: "inactiva", simulacion_reversiones: [{}] }), false);
});

test("espera a que termine la adjudicación y admite el fichaje directo sin sala", () => {
  for (const estado of ["en_curso", "esperando_apertura"]) {
    assert.equal(canFinalizeMarket({ fichajes_abiertos: true }, { estado }), false);
  }
  assert.equal(canFinalizeMarket({ fichajes_abiertos: true }, { estado: "adjudicada" }), true);
  assert.equal(canFinalizeMarket({ fichajes_abiertos: true }), true);
});

test("no modifica mercados cerrados, temporadas históricas ni competiciones individuales", () => {
  assert.equal(canFinalizeMarket({ fichajes_abiertos: false }), false);
  assert.equal(canFinalizeMarket({ fichajes_abiertos: true, completado: true }), false);
  assert.equal(canFinalizeMarket({ fichajes_abiertos: true, tipo: "individual" }), false);
});
