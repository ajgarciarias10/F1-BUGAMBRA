import assert from "node:assert/strict";
import test from "node:test";
import { construirLiga } from "../datos";
import { pid, snapshotASplits } from "../datos/fixtures/snapshot";
import { modeloMiPiloto, pilotoDeCuenta, textoResultado } from "./MiPiloto";

const liga = construirLiga(snapshotASplits());

test("Mi piloto se identifica por la cuenta y no por el primer piloto de la parrilla", () => {
  assert.equal(pilotoDeCuenta({ piloto_id: pid("fabi") }), pid("fabi"));
  assert.equal(pilotoDeCuenta({ piloto_id: null }), null);
});

test("evolución y trayectoria siguen los splits reales del piloto", () => {
  const modelo = modeloMiPiloto(liga, pid("fabi"))!;
  assert.equal(modelo.carta.nombre, "Fabi");
  assert.ok(modelo.evolucion.columnas.length > 6);
  assert.ok(modelo.trayectoria.some(t => t.temporada === "Origins"));
  assert.ok(modelo.trayectoria.some(t => t.temporada === "Temporada 1"));
});

test("DNF, posición desconocida y ausencia no se convierten en puesto", () => {
  assert.equal(textoResultado({ estado: "dnf", puesto: null }), "DNF");
  assert.equal(textoResultado({ estado: "desconocida", puesto: null }), "¿?");
  assert.equal(textoResultado({ estado: "no_corrio", puesto: null }), "NC");
  assert.equal(textoResultado(null), "NC");
});
