import assert from "node:assert/strict";
import test from "node:test";
import type { DecisionFia, SplitView } from "../../types";
import { construirLiga } from "../datos/temporadas";
import { EQUIPO_ID, pid, snapshotASplits } from "../datos/fixtures/snapshot";
import {
  actaPublicada, decisionesDelGp, estadosCalendario, filasActa, podioDelGp, reproductorVideo, tarjetasCalendario,
} from "./Carreras";

const base = snapshotASplits();
const ligaBase = construirLiga(base);
const s3 = ligaBase.splits.find(s => s.id === "split_3")!;
const [hungria, , italia] = s3.gps;

/** Split 3 con cambios en un circuito, para fabricar los casos que el snapshot no trae. */
function conCambio(numero: number, cambio: (c: SplitView["circuitos"][number]) => SplitView["circuitos"][number]) {
  const vistas = base.map(s => s.id !== "split_3" ? s : { ...s, circuitos: s.circuitos.map(c => c.numero_carrera === numero ? cambio(c) : c) });
  const liga = construirLiga(vistas);
  return { liga, temporada: liga.splits.find(s => s.id === "split_3")!, vista: vistas.find(s => s.id === "split_3")! };
}

test("el acta mantiene distintos DNF, no corrió y posición desconocida", () => {
  const { temporada } = conCambio(13, c => ({
    ...c, resultados: c.resultados.map(r => r.pilotoId === pid("moles") ? { ...r, racePos: 99, puntos: 0, isDnf: false } : r),
  }));
  const filas = filasActa(temporada, temporada.gps[0]);
  const de = (slug: string) => filas.find(f => f.pilotoId === pid(slug))!;
  assert.equal(de("moles").etiqueta, "Posición desconocida");
  assert.equal(de("moles").puesto, null);
  assert.equal(de("moles").puntos, "0");
  assert.equal(de("aparicio").etiqueta, "No corrió");
  assert.equal(de("aparicio").puntos, "—");
  assert.equal(de("mimic").etiqueta, "P1");
  const italiaFilas = filasActa(s3, italia);
  assert.equal(italiaFilas.find(f => f.pilotoId === pid("pabliyo"))!.etiqueta, "DNF");
  // Orden: clasificados por puesto, luego desconocida, DNF y no corrió.
  const orden = filas.map(f => f.estado);
  assert.deepEqual(orden, [...orden].sort((a, b) => ["clasificado", "rango_11_20", "desconocida", "dnf", "no_corrio"].indexOf(a) - ["clasificado", "rango_11_20", "desconocida", "dnf", "no_corrio"].indexOf(b)));
});

test("el podio solo lleva puestos registrados 1 a 3, nunca deducidos de los puntos", () => {
  assert.deepEqual(podioDelGp(s3, hungria).map(f => [f.puesto, f.pilotoId]).slice(0, 1), [[1, pid("mimic")]]);
  const { temporada } = conCambio(13, c => ({
    ...c, resultados: c.resultados.map(r => r.pilotoId === pid("mimic") ? { ...r, racePos: 99, isDnf: false, puntos: 99 } : r),
  }));
  const podio = podioDelGp(temporada, temporada.gps[0]);
  assert.ok(podio.every(f => f.pilotoId !== pid("mimic")));
  assert.ok(podio.every(f => f.puesto !== null && f.puesto <= 3));
});

test("un GP disputado sin acta cerrada no publica el acta", () => {
  assert.equal(actaPublicada(hungria), true);
  const { temporada } = conCambio(13, c => ({ ...c, acta_cerrada: false }));
  assert.equal(temporada.gps[0].disputada, true);
  assert.equal(actaPublicada(temporada.gps[0]), false);
  assert.equal(actaPublicada(s3.gps[3]), false);
});

test("calendario: disputadas, la próxima y el resto pendientes", () => {
  const estados = estadosCalendario(s3);
  assert.deepEqual(s3.gps.map(g => estados.get(g.circuitoId)), ["disputada", "disputada", "disputada", "proxima", "pendiente", "pendiente"]);
  const tarjetas = tarjetasCalendario(s3);
  assert.equal(tarjetas.length, 6);
  assert.equal(tarjetas[0].podio.length, 3);
  assert.deepEqual(tarjetas[3].podio, []);
});

test("las decisiones FIA salen del circuito guardado, con nombres, y no se inventan", () => {
  assert.deepEqual(decisionesDelGp(s3, undefined), []);
  const decision: DecisionFia = { id: "d1", pilotoId: pid("fabi"), equipoId: EQUIPO_ID.zenith, tipo: "Time penalty", efecto_deportivo: "+5 s", motivo: "Toque en la salida", transaccionId: "tx1" };
  const { temporada, vista } = conCambio(13, c => ({ ...c, decisiones_fia: [decision] }));
  const circuito = vista.circuitos.find(c => c.numero_carrera === 13);
  const [d] = decisionesDelGp(temporada, circuito);
  assert.deepEqual([d.afectado, d.tipo, d.efecto, d.motivo, d.multaAprobada], ["Fabi · Zenith", "Time penalty", "+5 s", "Toque en la salida", true]);
  const sinAfectado = decisionesDelGp(temporada, { ...circuito!, decisiones_fia: [{ id: "d2", tipo: "Aviso", motivo: "x" }] });
  assert.equal(sinAfectado[0].afectado, "Sin afectado indicado");
  assert.equal(sinAfectado[0].efecto, null);
});

test("el vídeo de vuelta rápida no entrega el reproductor hasta pulsar Play", () => {
  const sin = reproductorVideo({ hotlap_url: undefined }, false);
  assert.equal(sin.estado, "pendiente");
  assert.equal(reproductorVideo({ hotlap_url: undefined }, true).embedUrl, null);
  const antes = reproductorVideo({ hotlap_url: "https://youtu.be/abc123" }, false);
  assert.equal(antes.estado, "publicado");
  assert.equal(antes.embedUrl, null);
  assert.ok(antes.miniatura);
  const despues = reproductorVideo({ hotlap_url: "https://youtu.be/abc123" }, true);
  assert.match(despues.embedUrl ?? "", /abc123/);
});

test("Origins: 1 punto estándar es «P11–P20», sin inventar el puesto exacto", () => {
  const origins = ligaBase.origins!;
  const filas = origins.gps.flatMap(g => filasActa(origins, g)).filter(f => f.estado === "rango_11_20");
  assert.ok(filas.length > 0);
  assert.ok(filas.every(f => f.etiqueta === "P11–P20" && f.puesto === null));
});
