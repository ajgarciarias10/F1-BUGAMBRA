import assert from "node:assert/strict";
import test from "node:test";
import { construirRivalidades } from "./rivalidades.ts";

const plantilla = {
  equipos: [{ id: "equipo_zenith", nombre: "Zenith" }, { id: "equipo_roses", nombre: "Roses" }],
  roster: [
    { pilotoId: "piloto_fabi", nombre: "Fabi", equipoId: "equipo_zenith", rating_piloto: 80, precio_compra: 20 },
    { pilotoId: "piloto_jose", nombre: "Jose", equipoId: "equipo_roses", rating_piloto: 70 },
    { pilotoId: "piloto_mesa", nombre: "Mesa", equipoId: "equipo_roses", rating_piloto: 60 },
  ],
};

test("cada grupo describe a sus pilotos con su escudería y su media", () => {
  const r = construirRivalidades("split_3", [{ id: "g1", pilotoIds: ["piloto_fabi", "piloto_jose"] }, { id: "g2", pilotoIds: ["piloto_fabi", "piloto_jose", "piloto_mesa"] }], plantilla);
  assert.equal(r.pairCount, 1);
  assert.equal(r.totalPilotos, 3);
  assert.deepEqual(r.groups.map(g => g.type), ["pair", "triad"]);
  assert.equal(r.groups[0].groupScore, 75);
  assert.deepEqual(r.groups[0].members[0], { id: "piloto_fabi", nombre: "Fabi", equipoId: "equipo_zenith", equipoNombre: "Zenith", rating: 80, puntos_piloto: 0, statusRank: 0, price: 20 });
});

test("un piloto que ya no está en la plantilla se guarda con su id", () => {
  const r = construirRivalidades("split_3", [{ id: "g", pilotoIds: ["piloto_fabi", "piloto_viejo"] }], plantilla);
  assert.deepEqual(r.groups[0].members[1], { id: "piloto_viejo", nombre: "piloto_viejo", equipoId: "", equipoNombre: "", rating: 0, puntos_piloto: 0, statusRank: 0, price: 0 });
});
