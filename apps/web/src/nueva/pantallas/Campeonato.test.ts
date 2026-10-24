import assert from "node:assert/strict";
import test from "node:test";
import { cartaDeTemporada } from "../datos/cartas.ts";
import { construirLiga } from "../datos/temporadas.ts";
import { snapshotASplits } from "../datos/fixtures/snapshot.ts";
import type { ResultadoGp } from "../datos/tipos.ts";
import {
  ID_HISTORICO, caraACara, cartaEnTemporada, construirHistorico, ganadoresGp, gruposTemporadas, marcaEquipo, marcasOrigins,
  palmares, pilotosPorEscuderia, proximoGp, textoPuesto,
} from "./Campeonato.tsx";

const liga = construirLiga(snapshotASplits());
const temporada = (id: string) => liga.temporadas.find(t => t.id === id)!;

test("el selector tiene Origins, la Temporada 1 con sus splits y el Histórico (Origins + Temporada 1)", () => {
  const grupos = gruposTemporadas(liga);
  assert.deepEqual(grupos.map(g => g.id), ["origins", "t1", ID_HISTORICO]);
  assert.deepEqual(grupos[1].temporadas.map(t => t.id), ["temporada_1", "split_1", "split_2", "split_3"]);
  const historico = grupos[2].temporadas;
  assert.equal(historico.length, 1);
  assert.deepEqual([historico[0].nombre, historico[0].detalle], ["Histórico", "Origins + Temporada 1"]);
  // «Mundial» no es un split: no aparece ningún nodo con ese nombre ni un id que no sea una temporada de la liga.
  const ids = new Set([...liga.temporadas.map(t => t.id), ID_HISTORICO]);
  for (const g of grupos) for (const t of g.temporadas) { assert.ok(ids.has(t.id), t.id); assert.doesNotMatch(t.nombre, /mundial/i); }
});

test("sin Origins o sin splits el Histórico no se ofrece", () => {
  const sinOrigins = construirLiga(snapshotASplits().filter(s => s.tipo !== "individual"));
  assert.deepEqual(gruposTemporadas(sinOrigins).map(g => g.id), ["t1"]);
});

test("el Histórico suma los puntos de Origins y de la Temporada 1 de cada piloto", () => {
  const filas = construirHistorico(liga);
  for (const f of filas) {
    assert.equal(f.total, Math.round(((f.origins ?? 0) + (f.temporada1 ?? 0)) * 100) / 100, f.nombre);
    assert.equal(f.origins, liga.origins!.pilotos[f.pilotoId]?.puntos ?? null);
    assert.equal(f.temporada1, liga.temporada1!.pilotos[f.pilotoId]?.puntos ?? null);
  }
  assert.deepEqual(filas.map(f => f.total), [...filas.map(f => f.total)].sort((a, b) => b - a));
  const mimic = filas.find(f => f.nombre === "Mimic")!;
  assert.deepEqual([mimic.origins, mimic.temporada1, mimic.total], [79, 173, 252]);
  // Todos los pilotos de las dos temporadas, sin repetir.
  const ids = new Set([...Object.keys(liga.origins!.pilotos), ...Object.keys(liga.temporada1!.pilotos)]);
  assert.equal(filas.length, ids.size);
});

test("el palmarés da campeón en lo cerrado y solo líder en lo que sigue en curso", () => {
  const p = new Map(palmares(liga).map(f => [f.temporadaId, f]));
  assert.deepEqual([p.get("origins")!.campeonEquipos, p.get("origins")!.tipoEquipos, p.get("origins")!.provisional], ["Toni/Fabi", "Dúos", false]);
  assert.deepEqual([p.get("split_1")!.campeonEquipos, p.get("split_1")!.provisional], ["Roses", false]);
  assert.deepEqual([p.get("split_3")!.campeonEquipos, p.get("split_3")!.provisional, p.get("split_3")!.carreras], ["Alfa Romero", true, 3]);
  assert.equal(p.get("temporada_1")!.campeonEquipos, "Zenith");
});

test("una temporada sin puntos no tiene campeón y un empate en cabeza lista a los dos", () => {
  const ceros = snapshotASplits().filter(s => s.id === "split_3").map(s => ({
    ...s,
    equipos: s.equipos.map(e => ({ ...e, puntos_constructores: 0 })),
    roster: s.roster.map(r => ({ ...r, puntos_piloto: 0 })),
  }));
  const sinPuntos = palmares(construirLiga(ceros))[0];
  assert.equal(sinPuntos.campeonPilotos, null);
  assert.equal(sinPuntos.campeonEquipos, null);
  const empatados = ceros.map(s => ({
    ...s,
    equipos: s.equipos.map((e, i) => ({ ...e, puntos_constructores: i < 2 ? 10 : 0 })),
    roster: s.roster.map((r, i) => ({ ...r, puntos_piloto: i < 2 ? 5 : 0 })),
  }));
  const fila = palmares(construirLiga(empatados))[0];
  assert.match(fila.campeonEquipos ?? "", / \/ /);
  assert.match(fila.campeonPilotos ?? "", / \/ /);
});

test("el ganador de un GP es quien tiene el puesto 1 registrado; con empate o sin registro no hay ganador", () => {
  const origins = liga.origins!;
  const ganadores = origins.gps.map(g => ganadoresGp(g));
  assert.deepEqual(ganadores[0], ["piloto_moles"]);
  // Canadá: Jota y Fabi comparten P2 y nadie tiene P1 registrado.
  assert.deepEqual(ganadores[5], []);
  const pendiente = liga.actual!.gps.find(g => !g.disputada)!;
  assert.deepEqual(ganadoresGp(pendiente), []);
});

test("textoPuesto no inventa puestos", () => {
  const r = (estado: ResultadoGp["estado"], puesto: number | null): ResultadoGp => ({ pilotoId: "p", equipoId: null, estado, puesto, qualy: null, puntos: 0, vueltaRapida: false, limpio: null });
  assert.equal(textoPuesto(r("clasificado", 3)), "P3");
  assert.equal(textoPuesto(r("dnf", null)), "DNF");
  assert.equal(textoPuesto(r("desconocida", null)), "¿?");
  assert.equal(textoPuesto(r("rango_11_20", null)), "P11–20");
  assert.equal(textoPuesto(r("no_corrio", null)), "NC");
  assert.equal(textoPuesto(null), "NC");
  assert.deepEqual(marcasOrigins(null), []);
});

test("las marcas de Origins salen de las banderas del Excel", () => {
  const hay = liga.origins!.gps.flatMap(g => Object.values(g.resultados)).find(r => r.origins?.pole);
  assert.ok(hay);
  assert.ok(marcasOrigins(hay).includes("PO"));
});

test("el cara a cara no marca mejor sin dato en los dos, y en DNF y puesto medio gana el menor", () => {
  const s3 = temporada("split_3");
  const [x, y] = Object.keys(s3.pilotos).map(id => cartaDeTemporada(s3, id)!);
  const filas = new Map(caraACara(x, y).map(f => [f.etiqueta, f]));
  assert.equal(filas.get("Puntos")!.mejor, x.puntos > y.puntos ? "a" : x.puntos < y.puntos ? "b" : null);
  const base = { ...x, dnfs: 1, mediaCarrera: 2 };
  const peor = { ...y, dnfs: 3, mediaCarrera: 4 };
  const c = new Map(caraACara(base, peor).map(f => [f.etiqueta, f]));
  assert.equal(c.get("DNF")!.mejor, "a");
  assert.equal(c.get("Puesto medio en carrera")!.mejor, "a");
  const sin = new Map(caraACara({ ...base, mediaCarrera: null, rating: null }, peor).map(f => [f.etiqueta, f]));
  assert.equal(sin.get("Puesto medio en carrera")!.mejor, null);
  assert.equal(sin.get("Puesto medio en carrera")!.a, "—");
  assert.equal(sin.get("Valoración (OVR)")!.mejor, null);
  const igual = new Map(caraACara(base, { ...peor, dnfs: 1 }).map(f => [f.etiqueta, f]));
  assert.equal(igual.get("DNF")!.mejor, null);
});

test("la carta de la Temporada 1 completa toma la valoración del último split en que corrió", () => {
  const t1 = liga.temporada1!;
  const id = Object.keys(t1.pilotos).find(p => liga.splits.some(s => s.pilotos[p]?.rating != null))!;
  const carta = cartaEnTemporada(liga, t1, id)!;
  const ultimo = [...liga.splits].reverse().find(s => s.pilotos[id]?.rating != null)!;
  assert.equal(carta.rating, ultimo.pilotos[id].rating);
  assert.equal(carta.temporadaId, t1.id);
  assert.equal(cartaEnTemporada(liga, t1, "no_existe"), null);
});

test("los pilotos se agrupan por escudería en el orden de la clasificación; Origins, en un solo grupo", () => {
  const grupos = pilotosPorEscuderia(temporada("split_3"));
  assert.deepEqual(grupos.map(g => g.equipo?.nombre), ["Alfa Romero", "Zenith", "Roses"]);
  assert.equal(grupos.reduce((n, g) => n + g.pilotos.length, 0), Object.keys(temporada("split_3").pilotos).length);
  const origins = pilotosPorEscuderia(temporada("origins"));
  assert.equal(origins.length, 1);
  assert.equal(origins[0].equipo, null);
});

test("el próximo GP solo existe en una temporada en curso", () => {
  assert.equal(proximoGp(temporada("split_1")), null);
  const p = proximoGp(temporada("split_3"))!;
  assert.equal(p.disputada, false);
  assert.equal(p.numero, Math.min(...temporada("split_3").gps.filter(g => !g.disputada).map(g => g.numero)));
});

test("las escuderías conocidas tienen su marca y las demás, la neutra", () => {
  assert.equal(marcaEquipo("Alfa Romero").color, "var(--team-alfa)");
  assert.equal(marcaEquipo("Zenith", "/logo.png").logoUrl, "/logo.png");
  assert.equal(marcaEquipo("Zenith").dash, "8 4");
  assert.equal(marcaEquipo("Otra").color, "var(--text-muted)");
});
