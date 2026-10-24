import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

// Se ejecuta después de vite build: protege lo que recibe Hosting, no los HTML fuente.
const dist = new URL("../apps/web/dist/", import.meta.url);
const leer = (nombre) => readFileSync(new URL(nombre, dist), "utf8");
const moduloExiste = (html) => {
  const entry = html.match(/<script\b[^>]*type="module"[^>]*src="([^"]+)"/);
  return Boolean(entry) && /^\/assets\/.+\.js$/.test(entry[1]) && existsSync(new URL(entry[1].slice(1), dist));
};

test("la entrada publicada es el diseño aprobado con la sesión real cargada", () => {
  const html = leer("index.html");
  assert.ok(html.includes('class="site-header'), "Falta la cabecera del diseño aprobado");
  assert.ok(moduloExiste(html), "Falta el módulo de sesión generado");
  assert.ok(html.includes("bugambra:sesion"), "El diseño no escucha la sesión real");
});

test("la entrada publicada no tiene la barra ni el acceso simulado del prototipo", () => {
  const html = leer("index.html");
  assert.ok(!/<aside class="proto-bar"|id="roleSelect"|id="dataStateSelect"|ProtoBtn/.test(html), "Se publicó la barra de simulación");
  assert.ok(!/handleSimAuth|slug === 'fabi'/.test(html), "Se publicó el acceso simulado");
});

test("los paneles clásicos siguen publicados como app React", () => {
  const html = leer("panel.html");
  assert.ok(html.includes('<div id="root"></div>'));
  assert.ok(moduloExiste(html), "Falta el módulo de los paneles");
});
