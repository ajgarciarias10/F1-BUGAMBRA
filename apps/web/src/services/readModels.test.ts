import assert from "node:assert/strict";
import { test } from "node:test";
import { buildJequeHome, buildLedgerView, matchesTeamLedgerEntry, buildRaceReport, fastestLapVideoOf, raceResultStatus } from "./readModels";
import type { Circuito, PilotInRoster, Transaccion } from "../types";

const tx = (o: Partial<Transaccion>): Transaccion => ({ equipo: "T", tipo: "ingreso_puntos", cantidad: 1, esIngreso: true, fecha: null, ...o });

test("ledger keeps each payout source and signs expenses/income", () => {
  const view = buildLedgerView([
    tx({ id: "a", tipo: "pole", cantidad: 2, fecha: 1 }),
    tx({ id: "b", tipo: "fichaje", cantidad: 10, esIngreso: false, fecha: 2 }),
    tx({ id: "c", tipo: "piloto_negativo", cantidad: 4, esIngreso: true, fecha: 3 }),
    tx({ id: "d", tipo: "ajuste", cantidad: 1, esIngreso: false, fecha: 4, descripcion: "Ajuste admin" }),
    tx({ id: "e", tipo: "ajuste", cantidad: 3, esIngreso: true, fecha: 5, piloto: "p1" }),
    tx({ id: "f", tipo: "premio_temporada", cantidad: 20, fecha: 6 }),
  ], 50);
  assert.deepEqual(view.netBySource, { pole: 2, transfer: -6, manualAdjustment: -1, priceAdjustment: 3, seasonPrize: 20 });
  assert.deepEqual(view.entries.map(e => e.id), ["f", "e", "d", "c", "b", "a"]);
  assert.equal(view.state, "ok");
});

test("ledger states never invent a zero balance", () => {
  assert.equal(buildLedgerView([], 10).state, "empty");
  assert.equal(buildLedgerView([tx({})], null).state, "balance_unknown");
  assert.equal(buildLedgerView([tx({ id: "a", fecha: 1, saldo_nuevo: 40 })], 41.3).state, "pending_reconciliation");
  assert.equal(buildLedgerView([tx({ id: "a", fecha: 1, saldo_nuevo: 40 })], 40).state, "ok");
  assert.equal(buildLedgerView([tx({ id: "a", fecha: 1 })], 40).entries[0].balanceAfter, null);
});

const res = (o: any) => ({ pilotoId: "p", qualyPos: 1, racePos: 1, overtakesBoost: false, isDotd: false, isMvp: false, fastestLap: false, ...o });
test("zero points / position 99 is unknown, DNF only when explicit", () => {
  assert.equal(raceResultStatus(res({ racePos: 99, puntos: 0 })), "unknown_position");
  assert.equal(raceResultStatus(res({ racePos: 99, isDnf: true })), "dnf");
  assert.equal(raceResultStatus(res({ racePos: 5 })), "classified");
});

test("race report separates DNF, did-not-race and unknown; points are never inferred", () => {
  const roster = ["a", "b", "c", "d", "e"].map((id, i) => ({ pilotoId: id, nombre: id, equipoId: "t", participa_desde: id === "e" ? 5 : 1 } as PilotInRoster));
  const circuito = {
    id: "gp", nombre: "GP", completado: true, acta_cerrada: true, numero_carrera: 2, economia_procesada: false,
    resultados: [res({ pilotoId: "a", racePos: 1, puntos: 16 }), res({ pilotoId: "b", racePos: 99 }), res({ pilotoId: "c", racePos: 99, isDnf: true })],
    decisiones_fia: [{ id: "d1", pilotoId: "a", tipo: "t", motivo: "m" }],
  } as Circuito;
  const report = buildRaceReport(circuito, roster);
  assert.deepEqual(report.rows.map(r => [r.pilotId, r.status, r.points]), [["a", "classified", 16], ["b", "unknown_position", null], ["c", "dnf", null], ["d", "did_not_race", null]]);
  assert.equal(report.decisions.length, 1);
  assert.equal(report.published, true);
});

test("fastest lap video is pending until a valid YouTube url exists", () => {
  assert.equal(fastestLapVideoOf({}).status, "pending");
  assert.equal(fastestLapVideoOf({ hotlap_url: "not a url" }).embedUrl, null);
  const v = fastestLapVideoOf({ hotlap_url: "https://youtu.be/abc123" });
  assert.equal(v.status, "available");
  assert.match(v.embedUrl!, /embed\/abc123/);
});

test("jeque home: next GP, rank and unknown balance stay null", () => {
  const split: any = {
    circuitos: [{ id: "c2", nombre: "B", numero_carrera: 2, completado: false }, { id: "c1", nombre: "A", numero_carrera: 1, completado: true }],
    equipos: [{ id: "x", nombre: "X", presupuesto: null, puntos_constructores: 5 }, { id: "y", nombre: "Y", presupuesto: 12, puntos_constructores: 9 }],
  };
  const home = buildJequeHome(split, "x", null);
  assert.equal(home.nextRace?.id, "c2");
  assert.equal(home.nextRace?.fastestLap.status, "pending");
  assert.deepEqual([home.team?.rank, home.team?.of, home.availableBalance, home.notice], [2, 2, null, null]);
  assert.equal(buildJequeHome(split, "y", null).availableBalance, 12);
  assert.equal(buildJequeHome(split, null, null).team, null);
});

test("team ledger matcher covers current and legacy shapes without cross-assigning", () => {
  const team = { id: "equipo_alfa", nombre: "Alfa Romero" };
  const m = (o: Partial<Transaccion>) => matchesTeamLedgerEntry(tx(o), "s3", team);
  assert.equal(m({ splitId: "s3", equipoId: "equipo_alfa", equipo: "otro nombre" }), true);
  assert.equal(m({ splitId: "s3", equipoId: "equipo_roses", equipo: "Alfa Romero" }), false);
  assert.equal(m({ splitId: "s3", equipo: " alfa romero " }), true);
  assert.equal(m({ splitId: "s3", equipo: "equipo_alfa" }), true);
  assert.equal(m({ splitId: "s3", equipoId: "", equipo: "Alfa Romero" }), true);
  assert.equal(m({ splitId: "s3", equipo: "Roses" }), false);
  assert.equal(m({ splitId: "s2", equipoId: "equipo_alfa" }), false);
  assert.equal(m({ equipoId: "equipo_alfa" }), false);
  assert.equal(m({ splitId: "s3", equipo: "" }), false);
  assert.equal(matchesTeamLedgerEntry(tx({ splitId: "s3", equipo: "Alfa Romero" }), "s3", { id: "equipo_alfa" }), false);
});
