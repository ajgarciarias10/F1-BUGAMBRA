import assert from "node:assert/strict";
import test from "node:test";
import type { SplitView } from "../../types";
import { detalleOrigins, filasExcelOrigins, posicionDesdeEstandar } from "./origins";
import { clasificacionDuos, construirLiga, construirTemporadaSplit } from "./temporadas";
import { pid, snapshotASplits } from "./fixtures/snapshot";

test("los puntos estándar dan el puesto: 12 = P1, 10 = P2 … 2 = P10, 1 = rango 11–20, 0 sin terminar = DNF", () => {
  assert.deepEqual(posicionDesdeEstandar(12, true), { estado: "clasificado", puesto: 1 });
  assert.deepEqual(posicionDesdeEstandar(10, true), { estado: "clasificado", puesto: 2 });
  assert.deepEqual(posicionDesdeEstandar(9, true), { estado: "clasificado", puesto: 3 });
  assert.deepEqual(posicionDesdeEstandar(2, true), { estado: "clasificado", puesto: 10 });
  assert.deepEqual(posicionDesdeEstandar(1, true), { estado: "rango_11_20", puesto: null });
  assert.deepEqual(posicionDesdeEstandar(0, false), { estado: "dnf", puesto: null });
  // Valores que no existen en la tabla no se convierten en un puesto.
  assert.deepEqual(posicionDesdeEstandar(11, true), { estado: "desconocida", puesto: null });
  assert.deepEqual(posicionDesdeEstandar(0, true), { estado: "desconocida", puesto: null });
});

test("la deducción coincide con el puesto que el prototipo sacó del Excel en todas las filas", () => {
  const filas = filasExcelOrigins();
  assert.equal(filas.length, 60);
  for (const f of filas) {
    const p = posicionDesdeEstandar(f.std, f.terminar);
    const esperado = f.pos === "DNF" ? "dnf" : f.pos === "11–20" ? "rango_11_20" : f.pos;
    assert.equal(p.estado === "clasificado" ? p.puesto : p.estado, esperado, `GP ${f.numero} ${f.slug}`);
  }
});

test("si el Excel no cuadra con los puntos guardados, el puesto queda desconocido y sin banderas", () => {
  // GP 1, Moles: estándar 12 + extra 3 = 15 puntos guardados.
  assert.equal(detalleOrigins(1, pid("moles"), 15)?.puesto, 1);
  assert.deepEqual(detalleOrigins(1, pid("moles"), 14), { estado: "desconocida", puesto: null, flags: null });
  assert.equal(detalleOrigins(1, pid("nadie"), 0), null);
});

test("Origins con los datos reales: dúos, puestos deducidos, rango y DNF", () => {
  const liga = construirLiga(snapshotASplits());
  const o = liga.origins!;
  assert.equal(o.tipo, "individual");
  assert.equal(o.equipos.length, 0);
  assert.deepEqual(clasificacionDuos(o).map(d => [d.puesto, d.fila.nombre, d.fila.puntos]), [
    [1, "Toni/Fabi", 211], [2, "Jota/Pabliyo", 178], [3, "Moles/Pinilla", 137], [4, "Jose/Samu", 136], [5, "Mimic/Aparicio", 113],
  ]);
  assert.deepEqual(o.duos[0].pilotoIds, [pid("toni"), pid("fabi")]);
  assert.deepEqual(o.duos[0].puntosPorGp, [16, 25, 40, 34, 37, 59]);
  assert.equal(o.pilotos[pid("fabi")].puntos, 101);

  const canada = o.gps[5];
  assert.equal(canada.doble, true);
  // Jota y Fabi tienen 10 puntos estándar los dos: P2 ambos hasta que la liga diga quién ganó.
  assert.equal(canada.resultados[pid("jota")].puesto, 2);
  assert.equal(canada.resultados[pid("fabi")].puesto, 2);
  const silverstone = o.gps[0];
  assert.equal(silverstone.resultados[pid("moles")].puesto, 1);
  assert.equal(silverstone.resultados[pid("pinilla")].estado, "rango_11_20");
  assert.equal(silverstone.resultados[pid("pinilla")].puesto, null);
  assert.equal(silverstone.resultados[pid("aparicio")].estado, "dnf");
  assert.equal(silverstone.resultados[pid("jose")].origins?.pole, true);
});

test("en Origins un puesto o un DNF registrados mandan sobre la deducción", () => {
  const origins = snapshotASplits().find(s => s.tipo === "individual")!;
  const gp1 = origins.circuitos.find(c => c.numero_carrera === 1)!;
  const split: SplitView = {
    ...origins,
    circuitos: [{
      ...gp1,
      resultados: gp1.resultados.map(r => r.pilotoId === pid("moles") ? { ...r, racePos: 3 }
        : r.pilotoId === pid("jose") ? { ...r, isDnf: true } : r),
    }],
  };
  const t = construirTemporadaSplit(split, [1]);
  assert.equal(t.gps[0].resultados[pid("moles")].puesto, 3);
  assert.equal(t.gps[0].resultados[pid("jose")].estado, "dnf");
});
