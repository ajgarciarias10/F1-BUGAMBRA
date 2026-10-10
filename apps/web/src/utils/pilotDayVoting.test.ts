import test from "node:test";
import assert from "node:assert/strict";
import { getPilotDayCandidates, pilotDayCloseError, pilotDayOpenError, pilotDayVoteError } from "./pilotDayVoting";

test("candidate list excludes explicit DNF and removes duplicate pilot entries", () => {
  assert.deepEqual(getPilotDayCandidates([
    { pilotoId: "p1", qualyPos: 1, racePos: 1, isDnf: false, overtakesBoost: false, isDotd: false, isMvp: false, fastestLap: false },
    { pilotoId: "p1", qualyPos: 1, racePos: 1, isDnf: false, overtakesBoost: false, isDotd: false, isMvp: false, fastestLap: false },
    { pilotoId: "p2", qualyPos: 2, racePos: 99, isDnf: true, overtakesBoost: false, isDotd: false, isMvp: false, fastestLap: false },
    { pilotoId: "p3", qualyPos: 3, racePos: 99, isDnf: false, overtakesBoost: false, isDotd: false, isMvp: false, fastestLap: false },
  ]), ["p1", "p3"]);
});

test("only completed, open, unclosed polls with an eligible field can open", () => {
  assert.equal(pilotDayOpenError({ completed: false, candidates: ["p1"] }), "Solo se puede abrir una votación de una carrera completada.");
  assert.match(pilotDayOpenError({ completed: true, closed: true, candidates: ["p1"] }) || "", /cerrada/);
  assert.match(pilotDayOpenError({ completed: true, open: true, candidates: ["p1"] }) || "", /abierta/);
  assert.match(pilotDayOpenError({ completed: true, candidates: [] }) || "", /No hay pilotos/);
  assert.equal(pilotDayOpenError({ completed: true, candidates: ["p1"] }), null);
});

test("votes require the same signed-in account, an open poll, and an eligible pilot", () => {
  const valid = { registeredUid: "uid-1", requestedUid: "uid-1", completed: true, open: true, candidates: ["p1"], pilotId: "p1" };
  assert.match(pilotDayVoteError({ ...valid, registeredUid: undefined }) || "", /cuenta registrada/);
  assert.match(pilotDayVoteError({ ...valid, requestedUid: "uid-2" }) || "", /cuenta registrada/);
  assert.match(pilotDayVoteError({ ...valid, open: false }) || "", /no ha abierto/);
  assert.match(pilotDayVoteError({ ...valid, closed: true }) || "", /cerrada/);
  assert.match(pilotDayVoteError({ ...valid, pilotId: "other" }) || "", /elegibles/);
  assert.equal(pilotDayVoteError(valid), null);
});

test("closing is one-way and requires an eligible winner", () => {
  assert.match(pilotDayCloseError({ open: false, candidates: ["p1"], winnerId: "p1" }) || "", /no está abierta/);
  assert.match(pilotDayCloseError({ open: true, closed: true, candidates: ["p1"], winnerId: "p1" }) || "", /ya está cerrada/);
  assert.match(pilotDayCloseError({ open: true, candidates: ["p1"], winnerId: "p2" }) || "", /elegible/);
  assert.equal(pilotDayCloseError({ open: true, candidates: ["p1"], winnerId: "p1" }), null);
});
