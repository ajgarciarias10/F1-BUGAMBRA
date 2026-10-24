import assert from "node:assert/strict";
import test from "node:test";
import { cartaDeTemporada, nivelDe } from "./cartas";
import { construirLiga } from "./temporadas";
import { EQUIPO_ID, pid, snapshotASplits } from "./fixtures/snapshot";

const liga = construirLiga(snapshotASplits());
const temporada = (id: string) => liga.temporadas.find(t => t.id === id)!;

test("niveles con los mismos cortes que PilotCardF1: ELITE ≥ 90, PRO ≥ 85, ADV ≥ 80, CORE", () => {
  assert.deepEqual([95, 90, 89.9, 85, 84, 80, 79.9, 50].map(nivelDe), ["ELITE", "ELITE", "PRO", "PRO", "ADV", "ADV", "CORE", "CORE"]);
  assert.equal(nivelDe(null), null);
  assert.equal(nivelDe(undefined), null);
});

test("la carta de un split antiguo es la de entonces: escudería y valoración de ese split", () => {
  const s1 = cartaDeTemporada(temporada("split_1"), pid("mimic"))!;
  assert.deepEqual([s1.equipoId, s1.equipoNombre, s1.rating, s1.nivel, s1.puntos], [EQUIPO_ID.alfa, "Alfa Romero", 77, "CORE", 81]);
  const s2 = cartaDeTemporada(temporada("split_2"), pid("mimic"))!;
  assert.deepEqual([s2.equipoId, s2.equipoNombre, s2.rating, s2.nivel, s2.puntos], [EQUIPO_ID.zenith, "Zenith", 81, "ADV", 64]);
  // Samu ya no corre en el Split 3, pero su carta del Split 2 existe.
  assert.equal(cartaDeTemporada(temporada("split_3"), pid("samu")), null);
  assert.equal(cartaDeTemporada(temporada("split_2"), pid("samu"))!.equipoNombre, "Roses");
});

test("estadísticas de la carta solo con lo registrado", () => {
  const pabliyo = cartaDeTemporada(temporada("split_3"), pid("pabliyo"))!;
  assert.equal(pabliyo.carreras, 3);
  assert.deepEqual([pabliyo.victorias, pabliyo.podios, pabliyo.poles, pabliyo.vueltasRapidas, pabliyo.dnfs, pabliyo.limpias], [0, 1, 1, 1, 1, 2]);
  // La media de carrera usa solo puestos registrados: el DNF de Italia no cuenta como puesto.
  assert.equal(pabliyo.mediaCarrera, 3.5);
  assert.deepEqual(pabliyo.evolucion.map(e => [e.numero, e.estado, e.puesto, e.puntos]), [
    [13, "clasificado", 4, 11], [14, "clasificado", 3, 11], [15, "dnf", null, 0],
  ]);
  // Aparicio no corrió en Hungría: esa carrera no aparece en su carta.
  assert.deepEqual(cartaDeTemporada(temporada("split_3"), pid("aparicio"))!.evolucion.map(e => e.numero), [14, 15]);
});

test("carta de Origins: individual, sin valoración, con el puesto deducido y sus marcas", () => {
  const jose = cartaDeTemporada(temporada("origins"), pid("jose"))!;
  assert.equal(jose.equipoId, null);
  assert.equal(jose.nivel, null);
  assert.equal(jose.evolucion[0].puesto, 2);
  assert.ok(jose.poles >= 1);
});

test("carta de la Temporada 1: suma de los splits, última escudería y última valoración", () => {
  const mimic = cartaDeTemporada(temporada("temporada_1"), pid("mimic"))!;
  assert.deepEqual([mimic.equipoNombre, mimic.rating, mimic.nivel, mimic.puntos, mimic.carreras], ["Alfa Romero", 81, "ADV", 173, 15]);
});
