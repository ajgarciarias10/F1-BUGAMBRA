import assert from "node:assert/strict";
import test from "node:test";
import { resolveTransferView, type TransferPilot } from "./transferView";

test("Jota: el pacto del Split 2 coincide con su ficha registrada en Split 3", () => {
  const result = resolveTransferView({
    pilotoId: "jota", equipoId: "alfa", pending_equipoId: "roses",
    pending_precio_compra: 75, pending_tipo_fichaje: "clausula",
  }, [{ pilotoId: "jota", equipoId: "roses", precio_compra: 75 }]);
  assert.deepEqual(result, { equipoId: "roses", precio: 75, tipo: "clausula", estado: "registrado", origen: "actual" });
});

test("muestra fichajes ya registrados aunque no exista pending en el split anterior", () => {
  const source: TransferPilot = { pilotoId: "moles", equipoId: "alfa", pending_equipoId: null, pending_precio_compra: null };
  const destination: TransferPilot = { pilotoId: "moles", equipoId: "zenith", precio_compra: 36.6, tipo_fichaje: "clausula" };
  const before = structuredClone([source, destination]);
  assert.deepEqual(resolveTransferView(source, [destination]), {
    equipoId: "zenith", precio: 36.6, tipo: "clausula", estado: "registrado", origen: "siguiente",
  });
  assert.deepEqual([source, destination], before, "la lectura no crea campos que puedan generar cargos o devoluciones");
});

test("un pacto de cero millones entre agentes libres sigue siendo pendiente", () => {
  const result = resolveTransferView({ pilotoId: "carlos", equipoId: "zenith" }, [{
    pilotoId: "carlos", equipoId: "agente_libre", precio_compra: 0,
    pending_equipoId: "alfa", pending_precio_compra: 0, pending_tipo_fichaje: "subasta",
  }]);
  assert.equal(result?.estado, "pendiente");
  assert.equal(result?.precio, 0);
  assert.equal(result?.equipoId, "alfa");
});

test("los precios negativos conservan su signo", () => {
  const result = resolveTransferView({ pilotoId: "mesa", equipoId: "zenith" }, [{
    pilotoId: "mesa", equipoId: "agente_libre", pending_equipoId: "roses", pending_precio_compra: -60,
  }]);
  assert.equal(result?.precio, -60);
  assert.equal(result?.estado, "pendiente");
});

test("no inventa destino ni renovación si falta la ficha del siguiente split", () => {
  assert.equal(resolveTransferView({ pilotoId: "samu", equipoId: "roses", precio_compra: 5 }, []), null);
  assert.equal(resolveTransferView({ pilotoId: "toni", equipoId: "roses" }, [
    { pilotoId: "otro", equipoId: "roses", precio_compra: 20 },
  ]), null);
});

test("no confunde el contrato del siguiente split con un pacto para una etapa posterior", () => {
  const result = resolveTransferView({ pilotoId: "p1", equipoId: "alfa" }, [{
    pilotoId: "p1", equipoId: "roses", precio_compra: 25,
    pending_equipoId: "zenith", pending_precio_compra: 80,
  }]);
  assert.equal(result?.equipoId, "roses");
  assert.equal(result?.precio, 25);
});

test("ignora fichas finalizadas y distingue un pacto aún no aplicado", () => {
  const result = resolveTransferView({
    pilotoId: "p1", equipoId: "alfa", pending_equipoId: "roses", pending_precio_compra: 25,
  }, [{ pilotoId: "p1", equipoId: "roses", precio_compra: 25, participa_hasta: 3 }]);
  assert.equal(result?.estado, "pactado");
});

test("no presenta como registrado un destino o precio que contradice el pacto", () => {
  const result = resolveTransferView({
    pilotoId: "p1", equipoId: "alfa", pending_equipoId: "roses", pending_precio_compra: 25,
  }, [{ pilotoId: "p1", equipoId: "zenith", precio_compra: 30 }]);
  assert.equal(result?.estado, "pactado");
  assert.equal(result?.equipoId, "roses");
});
