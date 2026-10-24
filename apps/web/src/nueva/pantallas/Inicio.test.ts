import assert from "node:assert/strict";
import test from "node:test";
import { resumenInicio } from "./Inicio";
import type { Temporada } from "../datos/tipos";

const temporada = {
  id: "s3", nombre: "Split 3", tipo: "split", enCurso: true, splitIds: ["s3"],
  gps: [
    { numero: 13, nombre: "Hungría", disputada: true, actaCerrada: true, economiaProcesada: false },
    { numero: 14, nombre: "Bélgica", disputada: true, actaCerrada: false, economiaProcesada: false },
    { numero: 15, nombre: "Italia", disputada: false, actaCerrada: false, economiaProcesada: false },
  ],
  equipos: [
    { equipoId: "a", nombre: "Alfa", puntos: 30, saldoActual: null },
    { equipoId: "b", nombre: "Roses", puntos: 60, saldoActual: 0 },
  ],
  pilotos: { p: { pilotoId: "p", nombre: "Piloto", puntos: 25 } }, duos: [],
} as unknown as Temporada;

test("comisario: distingue actas pendientes de economía sin procesar", () => {
  const resumen = resumenInicio(temporada, "admin", null, null);
  assert.equal(resumen.actasPendientes, 1);
  assert.equal(resumen.economiasPendientes, 2);
  assert.equal(resumen.equipo, null);
});

test("jeque y director: saldo desconocido no se convierte en cero; cero real se conserva", () => {
  assert.equal(resumenInicio(temporada, "jeque", "a", null).saldo, null);
  assert.equal(resumenInicio(temporada, "director_deportivo", "b", null).saldo, 0);
  assert.equal(resumenInicio(temporada, "usuario", "a", null).saldo, null);
});

test("piloto: su puntuación y próximo GP proceden de datos reales", () => {
  const resumen = resumenInicio(temporada, "piloto", null, "p");
  assert.equal(resumen.piloto?.puntos, 25);
  assert.equal(resumen.proximoGp?.nombre, "Italia");
});
