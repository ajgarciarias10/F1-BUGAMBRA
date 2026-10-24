import assert from "node:assert/strict";
import test from "node:test";
import { construirLiga, pactosDelSplit } from "../datos";
import { EQUIPO_ID, pid, snapshotASplits } from "../datos/fixtures/snapshot";
import { fichaEquipo, textoFichaje } from "./Equipos";

const splits = snapshotASplits();
const liga = construirLiga(splits);

test("la ficha de un split muestra plantilla, saldo y cambios reales", () => {
  const split = liga.splits.find(s => s.id === "split_3")!;
  const ficha = fichaEquipo(liga, split, EQUIPO_ID.zenith)!;
  assert.equal(ficha.equipo.nombre, "Zenith");
  assert.equal(ficha.pilotos.length, 3);
  assert.equal(ficha.puesto, 2);
  assert.ok(ficha.altas.includes(pid("fabi")));
  assert.equal(ficha.saldo, split.equipos.find(e => e.equipoId === EQUIPO_ID.zenith)!.saldoActual);
});

test("la Temporada 1 conserva todos los pilotos de cada escudería", () => {
  const ficha = fichaEquipo(liga, liga.temporada1!, EQUIPO_ID.zenith)!;
  assert.equal(ficha.pilotos.length, 8);
  assert.deepEqual(ficha.altas, []);
  assert.equal(ficha.aportes[pid("moles")].puntos, 49);
});

test("el pacto usa el precio y destino guardados; sin pacto no anuncia fichaje", () => {
  const actual = splits.find(s => s.id === "split_3")!;
  const pilotoId = actual.roster[0].pilotoId;
  const conPacto = { ...actual, roster: actual.roster.map(p => p.pilotoId === pilotoId ? {
    ...p, pending_equipoId: EQUIPO_ID.roses, pending_precio_compra: 70, pending_splitId: "split_4",
  } : p) };
  const pactos = pactosDelSplit([...splits.filter(s => s.id !== actual.id), conPacto], actual.id)!;
  assert.equal(textoFichaje(pactos.porPiloto[pilotoId], "Roses", "Split 4"), "Fichado para el Split 4 con Roses · 70 M€");
  assert.equal(textoFichaje(pactos.porPiloto[actual.roster[1].pilotoId], "Roses", "Split 4"), null);
});
