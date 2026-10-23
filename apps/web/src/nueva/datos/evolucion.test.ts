import assert from "node:assert/strict";
import test from "node:test";
import type { Transaccion } from "../../types";
import { evolucionEscuderias } from "./evolucion";
import { construirLiga } from "./temporadas";
import { EQUIPO_ID, snapshotASplits } from "./fixtures/snapshot";

const ALFA = EQUIPO_ID.alfa;
const splits = snapshotASplits();
const liga = construirLiga(splits);

test("Temporada 1: columnas = 18 GP en tres tramos, puntos acumulados y saldos guardados por split", () => {
  const evo = evolucionEscuderias(liga, splits, liga.temporada1!);
  assert.equal(evo.columnas.length, 18);
  assert.deepEqual(evo.tramos.map(t => [t.nombre, t.desde, t.hasta, t.enCurso]),
    [["Split 1", 0, 5, false], ["Split 2", 6, 11, false], ["Split 3", 12, 17, true]]);
  assert.deepEqual(evo.tramos[0].saldos[ALFA], { apertura: 100, cierre: 83.2, actual: 47.2 });
  assert.deepEqual(evo.tramos[2].saldos[ALFA], { apertura: 165.2, cierre: null, actual: 105 });
  const alfa = evo.series.find(s => s.equipoId === ALFA)!;
  assert.equal(alfa.puntosAcumulados[14], 377);
  assert.equal(alfa.puntosAcumulados[15], null);
});

test("sin libro: los ingresos de GP procesados se recalculan y el saldo tras cada GP queda desconocido, nunca estimado", () => {
  const s3 = liga.splits.find(s => s.id === "split_3")!;
  const alfa = evolucionEscuderias(liga, splits, s3).series.find(s => s.equipoId === ALFA)!;
  assert.deepEqual(alfa.ingresosPorGp.map(i => [i.importe, i.origen]),
    [[17.1, "calculado"], [20.7, "calculado"], [17.2, "calculado"], [null, null], [null, null], [null, null]]);
  assert.deepEqual(alfa.saldoTrasGp.map(s => [s.saldo, s.estado]), [
    [null, "desconocido"], [null, "desconocido"], [null, "desconocido"], [null, "pendiente"], [null, "pendiente"], [null, "pendiente"],
  ]);
});

test("con libro: lo abonado sale de los asientos del GP y el saldo solo si el asiento lo guardó", () => {
  const s3 = liga.splits.find(s => s.id === "split_3")!;
  const gp13 = s3.gps[0].circuitoId, gp14 = s3.gps[1].circuitoId;
  const asiento = (circuitoId: string, tipo: Transaccion["tipo"], cantidad: number, extra: Partial<Transaccion> = {}): Transaccion => ({
    equipo: "Alfa Romero", equipoId: ALFA, splitId: "split_3", circuitoId, tipo, cantidad, esIngreso: true, fecha: 1, ...extra,
  });
  const libro = [
    asiento(gp13, "ingreso_puntos", 4.1, { fecha: 1 }),
    asiento(gp13, "rivalidad", 9, { fecha: 2, saldo_nuevo: 63.2 }),
    asiento(gp13, "premio_carrera", 4, { fecha: 3, saldo_nuevo: 67.2 }),
    asiento(gp14, "premio_carrera", 4, { fecha: 4 }),
    // De otra escudería: no cuenta.
    { ...asiento(gp13, "pole", 2), equipoId: EQUIPO_ID.zenith },
  ];
  const alfa = evolucionEscuderias(liga, splits, s3, libro).series.find(s => s.equipoId === ALFA)!;
  assert.deepEqual([alfa.ingresosPorGp[0].importe, alfa.ingresosPorGp[0].origen, alfa.ingresosPorGp[0].porFuente?.rivalry], [17.1, "libro", 9]);
  assert.deepEqual(alfa.saldoTrasGp[0], { saldo: 67.2, estado: "registrado" });
  assert.deepEqual([alfa.ingresosPorGp[1].importe, alfa.ingresosPorGp[1].origen], [4, "libro"]);
  assert.deepEqual(alfa.saldoTrasGp[1], { saldo: null, estado: "desconocido" });
  assert.equal(alfa.ingresosPorGp[2].origen, "calculado");
});

test("un GP disputado sin procesar enseña lo previsto y su saldo queda pendiente", () => {
  const sinProcesar = splits.map(x => x.id !== "split_3" ? x : {
    ...x, circuitos: x.circuitos.map(c => c.numero_carrera === 15 ? { ...c, economia_procesada: false } : c),
  });
  const l = construirLiga(sinProcesar);
  const alfa = evolucionEscuderias(l, sinProcesar, l.splits[2]).series.find(s => s.equipoId === ALFA)!;
  assert.deepEqual([alfa.ingresosPorGp[2].importe, alfa.ingresosPorGp[2].origen], [17.2, "previsto"]);
  assert.deepEqual(alfa.saldoTrasGp[2], { saldo: null, estado: "pendiente" });
});
