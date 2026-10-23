import assert from "node:assert/strict";
import test from "node:test";
import type { Circuito, Transaccion } from "../../types";
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

// Ticket 27: liquidar un GP guarda en el circuito economia_saldos[equipo] = { antes, ingresos, despues }.
const ZENITH = EQUIPO_ID.zenith;
const conSaldos = (cambios: Record<number, Partial<Circuito>>) => splits.map(x => x.id !== "split_3" ? x : {
  ...x, circuitos: x.circuitos.map(c => cambios[c.numero_carrera!] ? { ...c, ...cambios[c.numero_carrera!] } : c),
});
const serie = (sv: ReturnType<typeof conSaldos>, equipoId: string, libro: Transaccion[] = []) => {
  const l = construirLiga(sv);
  return evolucionEscuderias(l, sv, l.splits[2], libro).series.find(s => s.equipoId === equipoId)!;
};

test("con economia_saldos guardado: saldo real tras el GP e ingresos guardados, también en negativo", () => {
  const sv = conSaldos({
    13: { economia_saldos: { [ALFA]: { antes: 50, ingresos: 17.1, despues: 67.1 }, [ZENITH]: { antes: -10, ingresos: 6.6, despues: -3.4 } } },
    14: { economia_saldos: { [ALFA]: { antes: 67.1, ingresos: 20.7, despues: 87.8, origen: "reconstruido" } as never } },
  });
  const alfa = serie(sv, ALFA);
  assert.deepEqual(alfa.saldoTrasGp.slice(0, 2), [
    { saldo: 67.1, estado: "guardado", antes: 50 },
    { saldo: 87.8, estado: "guardado", antes: 67.1, reconstruido: true },
  ]);
  assert.deepEqual(alfa.ingresosPorGp.slice(0, 2).map(i => [i.importe, i.origen]), [[17.1, "guardado"], [20.7, "guardado"]]);
  // GP 15 procesado sin el campo (carrera antigua): sigue desconocido.
  assert.deepEqual(alfa.saldoTrasGp[2], { saldo: null, estado: "desconocido" });
  assert.equal(alfa.ingresosPorGp[2].origen, "calculado");
  // Un saldo negativo es un dato real y se enseña tal cual; el importe guardado manda sobre el recalculado.
  const zenith = serie(sv, ZENITH);
  assert.deepEqual(zenith.saldoTrasGp[0], { saldo: -3.4, estado: "guardado", antes: -10 });
  assert.deepEqual([zenith.ingresosPorGp[0].importe, zenith.ingresosPorGp[0].origen], [6.6, "guardado"]);
  // Una escudería que no aparece en el campo de ese GP no hereda nada de otra.
  assert.deepEqual(serie(sv, EQUIPO_ID.roses).saldoTrasGp[0], { saldo: null, estado: "desconocido" });
});

test("economia_saldos manda sobre el libro; el libro queda como respaldo cuando falta", () => {
  const s3 = splits.find(x => x.id === "split_3")!;
  const gp13 = s3.circuitos.find(c => c.numero_carrera === 13)!.id, gp14 = s3.circuitos.find(c => c.numero_carrera === 14)!.id;
  const libro: Transaccion[] = [
    { equipo: "Alfa Romero", equipoId: ALFA, splitId: "split_3", circuitoId: gp13, tipo: "premio_carrera", cantidad: 4, esIngreso: true, fecha: 1, saldo_nuevo: 999 },
    { equipo: "Alfa Romero", equipoId: ALFA, splitId: "split_3", circuitoId: gp14, tipo: "premio_carrera", cantidad: 4, esIngreso: true, fecha: 2, saldo_nuevo: 71.1 },
  ];
  const alfa = serie(conSaldos({ 13: { economia_saldos: { [ALFA]: { antes: 50, ingresos: 17.1, despues: 67.1 } } } }), ALFA, libro);
  assert.deepEqual([alfa.saldoTrasGp[0].saldo, alfa.saldoTrasGp[0].estado], [67.1, "guardado"]);
  assert.equal(alfa.ingresosPorGp[0].porFuente?.participation, 4);
  assert.deepEqual(alfa.saldoTrasGp[1], { saldo: 71.1, estado: "registrado" });
});

test("una carrera revertida (sin procesar y sin el campo) vuelve a pendiente; un campo huérfano se ignora", () => {
  const revertida = serie(conSaldos({ 15: { economia_procesada: false } }), ALFA);
  assert.deepEqual(revertida.saldoTrasGp[2], { saldo: null, estado: "pendiente" });
  assert.equal(revertida.ingresosPorGp[2].origen, "previsto");
  const huerfano = serie(conSaldos({ 15: { economia_procesada: false, economia_saldos: { [ALFA]: { antes: 1, ingresos: 2, despues: 3 } } } }), ALFA);
  assert.deepEqual(huerfano.saldoTrasGp[2], { saldo: null, estado: "pendiente" });
  // Cifras no numéricas no se toman por un saldo.
  const roto = serie(conSaldos({ 15: { economia_saldos: { [ALFA]: { antes: 1, ingresos: 2, despues: Number.NaN } } } }), ALFA);
  assert.deepEqual(roto.saldoTrasGp[2], { saldo: null, estado: "desconocido" });
});
