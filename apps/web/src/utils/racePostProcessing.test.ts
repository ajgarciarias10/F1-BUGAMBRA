import test from "node:test";
import assert from "node:assert/strict";
import { raceRatingFailureMessage } from "./racePostProcessing";

test("reports when race results persisted but rating recalculation failed", () => {
  const message = raceRatingFailureMessage("split_3", "Error recalculando OVR de split_3: permission denied");
  assert.match(message ?? "", /sí se guardaron/);
  assert.match(message ?? "", /permission denied/);
  assert.match(message ?? "", /Recalcular puntos y rating/);
});

test("does not mark a successful rating recalculation as partial failure", () => {
  assert.equal(raceRatingFailureMessage("split_3", "OVR de split_3 recalculado: 8 pilotos"), null);
});
