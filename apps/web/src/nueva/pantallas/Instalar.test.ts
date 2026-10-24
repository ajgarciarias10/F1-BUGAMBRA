import assert from "node:assert/strict";
import test from "node:test";
import { pasosInstalacion } from "./Instalar";

test("guías ofrecen instrucciones propias de iPhone, Android y ordenador", () => {
  assert.match(pasosInstalacion("ios").join(" "), /Safari/);
  assert.match(pasosInstalacion("android").join(" "), /Chrome/);
  assert.match(pasosInstalacion("desktop").join(" "), /Chrome o Edge/);
});
