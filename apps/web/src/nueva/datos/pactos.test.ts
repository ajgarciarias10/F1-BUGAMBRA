import assert from "node:assert/strict";
import test from "node:test";
import type { PilotInRoster, SplitView } from "../../types";
import { pactosDelSplit, splitSiguiente } from "./pactos";

const ficha = (pilotoId: string, equipoId: string, extra: Record<string, unknown> = {}): PilotInRoster => ({
  pilotoId, equipoId, nombre: pilotoId.toUpperCase(), rating_piloto: 70,
  precio_compra: 0, clausula_actual: 0, mantener_actual: 0, clausula_inicial_split: 0, mantener_inicial_split: 0,
  precio_carrera_anterior: 0, historial_precios: {}, puntos_piloto: 0, victorias: 0, podios: 0, poles: 0, dnfs: 0, carreras_limpias: 0,
  ...extra,
} as PilotInRoster);

const split = (id: string, orden: number, roster: PilotInRoster[]): SplitView => ({
  id, nombre: id.toUpperCase(), orden, fichajes_abiertos: true, circuitos: [], roster, isStarted: false,
  equipos: [{ id: "A", nombre: "Alfa", presupuesto: 50, puntos_constructores: 0 }, { id: "B", nombre: "Beta", presupuesto: 50, puntos_constructores: 0 }],
});

const actual = split("s3", 3, [
  ficha("p1", "A", { pending_equipoId: "B", pending_precio_compra: 20, pending_tipo_fichaje: "clausula", pending_splitId: "s4", congelado: true }),
  ficha("p2", "A", { pending_equipoId: "A", pending_precio_compra: 10, pending_tipo_fichaje: "mantener", pending_splitId: "s4" }),
  ficha("p3", "B"),
  ficha("p4", "agente_libre", { pending_equipoId: "A", pending_precio_compra: 5, pending_tipo_fichaje: "subasta", pending_splitId: "s4" }),
]);
const nombres = (xs: Array<{ pilotoId: string; equipoId: string | null; precio: number | null; tipo: string | null; estado: string }>) =>
  xs.map(x => [x.pilotoId, x.equipoId, x.precio, x.tipo, x.estado]);

test("sin split siguiente: los pactos guardados en la ficha dan la plantilla prevista", () => {
  const p = pactosDelSplit([actual], "s3")!;
  assert.equal(p.siguiente, null);
  assert.deepEqual(p.porPiloto.p1.guardado, { equipoId: "B", precio: 20, tipo: "clausula", splitId: "s4" });
  assert.equal(p.porPiloto.p1.congelado, true);
  assert.deepEqual([p.porPiloto.p1.destino, p.porPiloto.p1.estadoDestino], ["B", "pactado"]);
  assert.equal(p.porPiloto.p3.guardado, null);
  assert.equal(p.porPiloto.p3.estadoDestino, "sin_decidir");
  assert.deepEqual(nombres(p.porEquipo.A.siguen), [["p2", "A", 10, "mantener", "pactado"]]);
  assert.deepEqual(nombres(p.porEquipo.A.seVan), [["p1", "B", 20, "clausula", "pactado"]]);
  assert.deepEqual(nombres(p.porEquipo.A.llegan), [["p4", null, 5, "subasta", "pactado"]]);
  assert.deepEqual(nombres(p.porEquipo.B.llegan), [["p1", "A", 20, "clausula", "pactado"]]);
  assert.deepEqual(nombres(p.porEquipo.B.sinDecidir), [["p3", null, null, null, "sin_decidir"]]);
});

test("con el split siguiente creado: lo registrado allí, quien queda libre y quien llega nuevo", () => {
  const siguiente = split("s4", 5, [
    ficha("p1", "B", { precio_compra: 20, tipo_fichaje: "clausula" }),
    ficha("p2", "A", { precio_compra: 10, tipo_fichaje: "mantener" }),
    ficha("p3", "agente_libre"),
    ficha("p5", "B", { precio_compra: 7, tipo_fichaje: "subasta" }),
  ]);
  const p = pactosDelSplit([actual, siguiente], "s3")!;
  assert.deepEqual(p.siguiente, { id: "s4", nombre: "S4" });
  assert.equal(p.porPiloto.p1.estadoDestino, "registrado");
  assert.equal(p.porPiloto.p4.estadoDestino, "pactado");
  assert.deepEqual(nombres(p.porEquipo.B.llegan), [["p1", "A", 20, "clausula", "registrado"], ["p5", null, 7, "subasta", "en_plantilla"]]);
  assert.deepEqual(nombres(p.porEquipo.B.seVan), [["p3", "agente_libre", null, null, "en_plantilla"]]);
  assert.deepEqual(p.porEquipo.B.sinDecidir, []);
});

test("el split de destino es el que guardó el pacto, aunque haya otro en medio por orden", () => {
  const intermedio = split("s3b", 4, []);
  const destino = split("s4", 5, []);
  assert.equal(splitSiguiente([actual, intermedio, destino], "s3")?.id, "s4");
  // Si el destino guardado no existe, se usa el orden, como el panel.
  const sinDestino = split("s3", 3, [ficha("p1", "A", { pending_splitId: "borrado" })]);
  assert.equal(splitSiguiente([sinDestino, intermedio], "s3")?.id, "s3b");
  assert.equal(splitSiguiente([sinDestino], "s3"), null);
});
