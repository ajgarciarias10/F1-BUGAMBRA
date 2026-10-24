import assert from "node:assert/strict";
import test from "node:test";
import { escalaEvolucion, etiquetaSaldo, tramosEvolucion } from "./evolucionModelo";
import type { ColumnaGp } from "../datos/temporadas";

const columnas: ColumnaGp[] = Array.from({ length: 6 }, (_, i) => ({ circuitoId: String(i), numero: i + 1, nombre: `GP ${i + 1}`, grupo: i < 3 ? "Split 1" : "Split 2", pendiente: i === 5 }));
test("los huecos, límites de split y GP pendientes no inventan una continuidad", () => {
  const valores = [10, null, 30, 40, 50, 60];
  assert.deepEqual(tramosEvolucion(columnas, valores, false).map(t => t.map(p => p.indice)), [[0], [2], [3, 4]]);
  assert.deepEqual(tramosEvolucion(columnas, valores, true).map(t => t.map(p => p.indice)), [[0], [2, 3, 4]]);
  assert.deepEqual(tramosEvolucion(columnas, [NaN, Infinity], true), []);
});
test("la escala permite cero, negativos y series vacías sin coordenadas inválidas", () => {
  for (const valores of [[], [null, null], [0, 0], [-12, -12], [-10, 20], [NaN, Infinity]]) {
    const escala = escalaEvolucion(valores, true);
    assert.ok(escala.ticks.length >= 2);
    assert.ok(escala.ticks.every(t => Number.isFinite(escala.y(t))));
    assert.ok(escala.ticks.includes(0));
  }
  const escala = escalaEvolucion([-10, 20], true);
  assert.ok(escala.y(-10) > escala.y(20));
});
test("cada saldo conserva su procedencia y nunca llama guardado al reconstruido", () => {
  assert.equal(etiquetaSaldo({ saldo: 0, estado: "guardado" }), "guardado");
  assert.equal(etiquetaSaldo({ saldo: 50, estado: "guardado", reconstruido: true }), "reconstruido");
  assert.equal(etiquetaSaldo({ saldo: null, estado: "desconocido" }), "desconocido");
  assert.equal(etiquetaSaldo({ saldo: null, estado: "pendiente" }), "pendiente");
  assert.equal(etiquetaSaldo({ saldo: -10, estado: "registrado" }), "registrado");
});
