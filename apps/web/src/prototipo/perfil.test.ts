import assert from "node:assert/strict";
import test from "node:test";
import { sesionDesdePerfil } from "./perfil.ts";

test("el perfil de Firestore se traduce a los ids del diseño", () => {
  const s = sesionDesdePerfil("u1", "Jeque@Correo.com", { nombre: " Marotez ", rol: "jeque", escuderia_id: "equipo_alfa_romero", piloto_id: "" });
  assert.deepEqual(s, { uid: "u1", nombre: "Marotez", rol: "jeque", equipoId: "alfa", pilotoSlug: null, foto: null });
  const p = sesionDesdePerfil("u2", "p@x.es", { rol: "piloto", piloto_id: "piloto_fabi", escuderia_id: "", foto_url: "https://f" });
  assert.equal(p.pilotoSlug, "fabi");
  assert.equal(p.equipoId, null);
  assert.equal(p.nombre, "p");
  assert.equal(p.foto, "https://f");
});

test("el dueño entra como admin aunque su perfil antiguo diga piloto", () => {
  assert.equal(sesionDesdePerfil("u3", "AJGarciaRias@gmail.com", { rol: "piloto" }).rol, "admin");
  assert.equal(sesionDesdePerfil("u4", "otro@gmail.com", {}).rol, "usuario");
});
