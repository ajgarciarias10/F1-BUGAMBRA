import assert from "node:assert/strict";
import test from "node:test";
import { cargoPorPrecio, presupuestoTrasCambiarPrecio, previsualizarAjustePrecio } from "./presupuesto";

test("un fichaje positivo se paga y uno negativo ingresa", () => {
  assert.equal(cargoPorPrecio(70), -70);
  assert.equal(cargoPorPrecio(-60), 60);
  assert.equal(cargoPorPrecio(0), 0);
});

test("subir el precio de un piloto descuenta solo la diferencia", () => {
  assert.equal(presupuestoTrasCambiarPrecio(111.3, 10, 20), 101.3);
});

test("bajar el precio devuelve solo la diferencia", () => {
  assert.equal(presupuestoTrasCambiarPrecio(111.3, 20, 10), 121.3);
});

test("bajar un precio registrado de 54M a 44M devuelve exactamente 10M", () => {
  assert.deepEqual(previsualizarAjustePrecio(20, 54, 44), {
    delta: 10, presupuestoNuevo: 30, insuficiente: false, faltante: 0,
  });
});

test("la corrección del precio del alias Alex/Mimic 28,9M → 50,2M cobra 21,3M", () => {
  assert.deepEqual(previsualizarAjustePrecio(135, 28.9, 50.2), {
    delta: -21.3, presupuestoNuevo: 113.7, insuficiente: false, faltante: 0,
  });
});

test("subir de 54M a 64M cobra 10M y calcula el déficit antes de guardar", () => {
  assert.deepEqual(previsualizarAjustePrecio(6, 54, 64), {
    delta: -10, presupuestoNuevo: -4, insuficiente: true, faltante: 4,
  });
});

test("no cobra de nuevo la plantilla ya pagada: sin cambio de precio, sin cambio de presupuesto", () => {
  assert.equal(presupuestoTrasCambiarPrecio(98.8, 68.4, 68.4), 98.8);
});

test("un piloto que se vuelve más negativo ingresa la diferencia", () => {
  assert.equal(presupuestoTrasCambiarPrecio(100, -5, -60), 155);
});

test("cruzar de negativo a positivo cobra el precio nuevo y retira el ingreso anterior", () => {
  assert.equal(presupuestoTrasCambiarPrecio(100, -30, 20), 50);
});

test("cobrar y devolver el mismo cambio deja el presupuesto igual", () => {
  const tras = presupuestoTrasCambiarPrecio(163.9, 0, 28.9);
  assert.equal(presupuestoTrasCambiarPrecio(tras, 28.9, 0), 163.9);
});
