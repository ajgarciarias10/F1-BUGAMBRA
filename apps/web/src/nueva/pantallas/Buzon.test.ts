import assert from "node:assert/strict";
import test from "node:test";
import { ordenarSugerencias } from "./Buzon";
import type { Sugerencia } from "../../services/sugerenciasService";

const sugerencias = [
  { id: "a", fecha: "2026-01-01", categoria: "interfaz", estado: "pendiente", votos: ["u"] },
  { id: "b", fecha: "2026-02-01", categoria: "mercado", estado: "aprobado", votos: ["u", "v"] },
] as Sugerencia[];

test("filtros y votos conservan el orden sin mutar el snapshot", () => {
  assert.deepEqual(ordenarSugerencias(sugerencias, "all", "all", "votes").map(s => s.id), ["b", "a"]);
  assert.deepEqual(ordenarSugerencias(sugerencias, "interfaz", "pendiente", "date").map(s => s.id), ["a"]);
  assert.deepEqual(sugerencias.map(s => s.id), ["a", "b"]);
});
