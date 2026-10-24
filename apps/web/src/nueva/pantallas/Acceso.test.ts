import assert from "node:assert/strict";
import test from "node:test";
import { validarRegistro } from "./Acceso";

test("registro protege longitud y coincidencia de contraseña", () => {
  assert.match(validarRegistro("12345", "12345") || "", /6 caracteres/);
  assert.match(validarRegistro("abcdef", "abcdeg") || "", /no coinciden/);
  assert.equal(validarRegistro("abcdef", "abcdef"), null);
});
