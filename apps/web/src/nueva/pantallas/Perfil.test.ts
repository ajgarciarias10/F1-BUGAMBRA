import assert from "node:assert/strict";
import test from "node:test";
import { trayectoriaPerfil } from "./Perfil";
import type { SplitView } from "../../types";

test("trayectoria usa la ficha de cada split, incluido Origins, en orden", () => {
  const splits = [
    { id: "s2", nombre: "Split 2", orden: 2, tipo: "equipos", roster: [{ pilotoId: "p", equipoId: "a", rating_piloto: 80, rating_base: 75, puntos_piloto: 20 }], equipos: [{ id: "a", nombre: "Alfa" }] },
    { id: "o", nombre: "Origins", orden: 0, tipo: "individual", roster: [{ pilotoId: "p", equipoId: "", rating_piloto: 0, puntos_piloto: 10 }], equipos: [] },
  ] as unknown as SplitView[];
  assert.deepEqual(trayectoriaPerfil(splits, "p").map(s => [s.splitId, s.equipo, s.puntos, s.rating]), [
    ["o", "Competición individual", 10, null], ["s2", "Alfa", 20, 80],
  ]);
  assert.equal(trayectoriaPerfil(splits, "p")[1].cambio, 5);
});
