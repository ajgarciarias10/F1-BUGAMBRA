import assert from "node:assert/strict";
import test from "node:test";
import { createSingleFlight } from "./useSingleFlight.ts";

test("second synchronous call is a no-op while the first is pending", async () => {
  const flight = createSingleFlight();
  let calls = 0;
  const action = flight.guard(async () => { calls++; await new Promise(r => setTimeout(r, 10)); return "ok"; });
  const [a, b] = await Promise.all([action(), action()]);
  assert.equal(calls, 1);
  assert.equal(a, "ok");
  assert.equal(b, undefined);
});

test("flag is released after success and after failure", async () => {
  const states: boolean[] = [];
  const flight = createSingleFlight(p => states.push(p));
  await assert.rejects(flight.run(async () => { throw new Error("boom"); }));
  assert.equal(flight.isPending(), false);
  assert.equal(await flight.run(async () => 1), 1);
  assert.deepEqual(states, [true, false, true, false]);
});
