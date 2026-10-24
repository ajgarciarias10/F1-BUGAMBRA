import assert from "node:assert/strict";
import test from "node:test";
import type { Circuito, SplitView } from "../../types";
import {
  cambiosDePlantilla, clasificacionEquipos, clasificacionPilotos, construirLiga, evolucionEquipos, evolucionPiloto,
  numerarGps, puntosPilotosPorGp, saldosEntreSplits, trayectoriaPiloto,
} from "./temporadas";
import { EQUIPO_ID, pid, snapshotASplits } from "./fixtures/snapshot";

const ALFA = EQUIPO_ID.alfa, ZENITH = EQUIPO_ID.zenith, ROSES = EQUIPO_ID.roses;
const liga = construirLiga(snapshotASplits());
const split = (id: string) => liga.splits.find(s => s.id === id)!;

test("temporadas en orden: Origins, Temporada 1 y sus splits; la actual es el split en curso", () => {
  assert.deepEqual(liga.temporadas.map(t => [t.nombre, t.tipo]), [
    ["Origins", "individual"], ["Temporada 1", "agregada"], ["Split 1", "split"], ["Split 2", "split"], ["Split 3", "split"],
  ]);
  assert.equal(liga.actual?.id, "split_3");
  assert.equal(liga.temporada1?.enCurso, true);
});

test("la Temporada 1 suma los splits: Zenith 383, Alfa Romero 377, Roses 347", () => {
  assert.deepEqual(clasificacionEquipos(liga.temporada1!).map(f => [f.puesto, f.fila.nombre, f.fila.puntos, f.diferencia]), [
    [1, "Zenith", 383, 0], [2, "Alfa Romero", 377, 6], [3, "Roses", 347, 36],
  ]);
  // Lo oficial coincide con lo que dan los resultados GP a GP.
  for (const e of liga.temporada1!.equipos) assert.equal(e.puntosResultados, e.puntos, e.nombre);
});

test("los GP siguen la numeración de la temporada de un split a otro", () => {
  assert.deepEqual(liga.temporada1!.gps.map(g => g.numero), Array.from({ length: 18 }, (_, i) => i + 1));
  assert.deepEqual(split("split_3").gps.map(g => [g.numero, g.enSplit, g.splitTotal]),
    [[13, 1, 6], [14, 2, 6], [15, 3, 6], [16, 4, 6], [17, 5, 6], [18, 6, 6]]);
  const c = (n: number | undefined): Circuito => ({ id: `c${n}`, nombre: "", numero_carrera: n, completado: false, acta_cerrada: false, economia_procesada: false, resultados: [] });
  // Un split que vuelve a empezar en 1 se numera a continuación del anterior.
  assert.deepEqual(numerarGps([[c(1), c(2)], [c(1), c(2)], [c(5), c(6)]]), [[1, 2], [3, 4], [5, 6]]);
});

test("puntos de escudería por GP con la plantilla de su split; los GP por disputar no suman", () => {
  const s3 = split("split_3");
  assert.deepEqual(s3.gps.map(g => g.puntosEquipo && [g.puntosEquipo[ALFA], g.puntosEquipo[ROSES], g.puntosEquipo[ZENITH]]),
    [[41, 4, 25], [37, 18, 26], [37, 22, 13], null, null, null]);
  const evo = evolucionEquipos(s3);
  assert.deepEqual(evo.series.find(s => s.id === ALFA)!.acumulado, [41, 78, 115, null, null, null]);
  assert.deepEqual(evo.columnas.map(c => c.pendiente), [false, false, false, true, true, true]);
  // En la Temporada 1 el acumulado sigue de un split a otro.
  const anual = evolucionEquipos(liga.temporada1!).series.find(s => s.id === ZENITH)!;
  assert.equal(anual.acumulado[14], 383);
  assert.equal(anual.acumulado[5], 130);
  assert.equal(anual.acumulado[11], 319);
});

test("la Temporada 1 lista todos los pilotos que corrieron para cada escudería, con sus puntos y splits", () => {
  const zenith = liga.temporada1!.equipos.find(e => e.equipoId === ZENITH)!;
  assert.deepEqual(new Set(zenith.pilotos), new Set(["aparicio", "jose", "moles", "carlos", "mesa", "mimic", "fabi", "pabliyo"].map(pid)));
  assert.deepEqual(zenith.porPiloto[pid("moles")], { puntos: 49, splits: ["Split 1", "Split 3"] });
  assert.deepEqual(zenith.porPiloto[pid("jose")], { puntos: 155, splits: ["Split 1", "Split 2"] });
  const mimic = liga.temporada1!.pilotos[pid("mimic")];
  assert.equal(mimic.puntos, 81 + 64 + 28);
  assert.deepEqual(mimic.equipos, [ALFA, ZENITH, ALFA]);
  assert.equal(mimic.equipoId, ALFA);
  assert.equal(mimic.rating, 81);
});

test("clasificación de pilotos por temporada, con filtro por escudería y puesto general", () => {
  const s3 = split("split_3");
  const top = clasificacionPilotos(s3).slice(0, 3).map(f => [f.puesto, f.fila.nombre, f.fila.puntos]);
  assert.deepEqual(top, [[1, "Carlos", 40], [2, "Fabi", 36], [3, "Mimic", 28]]);
  assert.deepEqual(clasificacionPilotos(s3, ROSES).map(f => [f.puesto, f.fila.nombre]),
    [[7, "Jose"], [8, "Jota"], [9, "Aparicio"], [11, "Mesa"]]);
  // Empates comparten puesto (Aparicio y Moles, 6 puntos).
  assert.deepEqual(clasificacionPilotos(s3).filter(f => f.fila.puntos === 6).map(f => [f.puesto, f.fila.nombre]),
    [[9, "Aparicio"], [9, "Moles"]]);
});

test("DNF, no corrió y posición desconocida se mantienen distintos", () => {
  const s3 = split("split_3");
  const [hungria, , italia] = s3.gps;
  assert.equal(italia.resultados[pid("pabliyo")].estado, "dnf");
  assert.equal(italia.resultados[pid("pabliyo")].puesto, null);
  assert.equal(hungria.resultados[pid("aparicio")].estado, "no_corrio");
  assert.equal(hungria.resultados[pid("mimic")].estado, "clasificado");
  assert.equal(hungria.resultados[pid("mimic")].puesto, 1);
  // 0 puntos y puesto 99 sin DNF marcado: desconocida, nunca retirada.
  const s3View = snapshotASplits().find(s => s.id === "split_3")!;
  const conDesconocida: SplitView = {
    ...s3View,
    circuitos: s3View.circuitos.map(c => c.numero_carrera !== 13 ? c : {
      ...c, resultados: c.resultados.map(r => r.pilotoId === pid("moles") ? { ...r, racePos: 99, puntos: 0, isDnf: false } : r),
    }),
  };
  const r = construirLiga([conDesconocida]).splits[0].gps[0].resultados[pid("moles")];
  assert.equal(r.estado, "desconocida");
  assert.equal(r.puesto, null);
  const tabla = puntosPilotosPorGp(s3, ZENITH);
  assert.equal(tabla.find(f => f.piloto.pilotoId === pid("pabliyo"))!.resultados[2]!.estado, "dnf");
  assert.equal(tabla[0].resultados[3], null);
});

test("saldos: la salida de un split es el cierre del anterior y la serie entre splits", () => {
  assert.deepEqual(saldosEntreSplits(liga, ALFA).map(f => [f.clave, f.split, f.saldo]), [
    ["inicio", "Split 1", 100], ["cierre", "Split 1", 83.2], ["cierre", "Split 2", 165.2], ["actual", "Split 3", 105],
  ]);
  const roses2 = split("split_2").equipos.find(e => e.equipoId === ROSES)!;
  assert.equal(roses2.saldoApertura, 145);
  assert.equal(roses2.desgloseCierre?.rivalidad, 23);
  // Sin `presupuesto_inicial` guardado, la salida es el cierre del split anterior.
  const sinInicial = snapshotASplits().map(s => s.id !== "split_3" ? s : {
    ...s, equipos: s.equipos.map(e => { const { presupuesto_inicial: _, ...resto } = e as typeof e & { presupuesto_inicial?: number }; return resto; }),
  });
  const s3 = construirLiga(sinInicial).splits[2];
  assert.equal(s3.equipos.find(e => e.equipoId === ZENITH)!.saldoApertura, 163.1);
  assert.equal(s3.equipos.find(e => e.equipoId === ZENITH)!.saldoCierre, null);
});

test("evolución de un piloto en la Temporada 1 y su trayectoria", () => {
  const evo = evolucionPiloto(liga, pid("mimic"));
  assert.equal(evo.columnas.length, 18);
  assert.deepEqual([evo.columnas[0].grupoSub, evo.columnas[6].grupoSub, evo.columnas[12].grupoSub], ["Alfa Romero", "Zenith", "Alfa Romero"]);
  assert.equal(evo.serie.acumulado[14], 173);
  assert.equal(evo.serie.acumulado[15], null);
  const trayectoria = trayectoriaPiloto(liga, pid("mimic"));
  assert.deepEqual(trayectoria.map(t => t.temporada), ["Origins", "Temporada 1", "Split 1", "Split 2", "Split 3"]);
  assert.equal(trayectoria[4].provisional, true);
});

test("altas y bajas respecto al split anterior", () => {
  const cambios = cambiosDePlantilla(liga, "split_3").find(c => c.equipoId === ZENITH)!;
  assert.deepEqual(new Set(cambios.altas), new Set([pid("fabi"), pid("moles"), pid("pabliyo")]));
  assert.deepEqual(new Set(cambios.bajas), new Set([pid("carlos"), pid("jose"), pid("mesa"), pid("mimic")]));
});
