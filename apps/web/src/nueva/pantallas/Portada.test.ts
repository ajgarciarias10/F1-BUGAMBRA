import assert from "node:assert/strict";
import test from "node:test";
import { construirLiga } from "../datos/temporadas.ts";
import { snapshotASplits } from "../datos/fixtures/snapshot.ts";
import type { GpTemporada } from "../datos/tipos.ts";
import { cuentaAtras, fechaDeGp, pestanaDe, resumenLiderazgo, tituloHero } from "./Portada.tsx";
import { proximoGp } from "./Campeonato.tsx";

const liga = construirLiga(snapshotASplits());
const split3 = liga.actual!;

test("la pestaña viene de ?tab= y lo desconocido es Clasificación", () => {
  assert.equal(pestanaDe("equipos"), "equipos");
  assert.equal(pestanaDe("resultados"), "resultados");
  assert.equal(pestanaDe("tv"), "tv");
  assert.equal(pestanaDe("paddock"), "clasificacion");
  assert.equal(pestanaDe(null), "clasificacion");
});

test("el hero cuenta quién lidera, con cuánta ventaja y tras qué carreras", () => {
  assert.equal(resumenLiderazgo(split3),
    "Alfa Romero lidera con 115 puntos, 51 más que Zenith, tras Hungría, Países Bajos y Italia. En pilotos manda Carlos con 40, seguido de Fabi (36).");
});

test("sin carreras disputadas el hero no inventa un líder", () => {
  const sin = { ...split3, gps: split3.gps.map(g => ({ ...g, disputada: false })) };
  assert.equal(resumenLiderazgo(sin), "Aún no se ha disputado ninguna carrera.");
});

test("el título nombra el split y el próximo GP; sin próximo GP lo dice", () => {
  const proximo = proximoGp(split3);
  assert.equal(tituloHero(split3, proximo), `SPLIT 3 · RUMBO A ${proximo!.nombre.toUpperCase()}`);
  assert.equal(tituloHero({ ...split3, enCurso: false }, null), "SPLIT 3 · TEMPORADA CERRADA");
  assert.equal(tituloHero(split3, null), "SPLIT 3 · EN CURSO");
});

test("sin fecha en Firestore el GP muestra «Fecha por confirmar» y no hay cuenta atrás", () => {
  const sinFecha: Pick<GpTemporada, "fecha" | "hora"> = { fecha: null, hora: null };
  assert.deepEqual(fechaDeGp(sinFecha), { texto: "Fecha por confirmar", hora: null, objetivo: null });
  // Una fecha rota tampoco se enseña como real.
  assert.equal(fechaDeGp({ fecha: "no-es-fecha", hora: null }).objetivo, null);
  assert.equal(fechaDeGp({ fecha: "no-es-fecha", hora: null }).texto, "Fecha por confirmar");
  // El próximo GP del fixture real aún no tiene fecha.
  assert.equal(fechaDeGp(proximoGp(split3)!).texto, "Fecha por confirmar");
});

test("con fecha real el GP enseña el día y la hora y fija el instante de la carrera", () => {
  const f = fechaDeGp({ fecha: "2026-11-01", hora: "22:30" });
  assert.match(f.texto, /domingo/);
  assert.match(f.texto, /1 de noviembre/);
  assert.equal(f.hora, "22:30");
  assert.equal(f.objetivo, new Date("2026-11-01T22:30:00").getTime());
  assert.equal(fechaDeGp({ fecha: "2026-11-01", hora: null }).hora, null);
});

test("la cuenta atrás reparte días, horas, minutos y segundos y termina en null", () => {
  const ahora = new Date("2026-10-30T20:00:00").getTime();
  const objetivo = new Date("2026-11-01T22:31:05").getTime();
  assert.deepEqual(cuentaAtras(objetivo, ahora), { dias: 2, horas: 2, minutos: 31, segundos: 5 });
  assert.equal(cuentaAtras(ahora, ahora), null);
  assert.equal(cuentaAtras(ahora - 1000, ahora), null);
  assert.equal(cuentaAtras(NaN, ahora), null);
});
