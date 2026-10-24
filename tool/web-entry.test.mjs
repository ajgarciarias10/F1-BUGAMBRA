import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import test from "node:test";

// Ejecutar después de npm run build: protege el artefacto que recibe Hosting,
// no solo el index.html fuente que Vite procesa antes de los pasos de copia.
const dist = new URL("../apps/web/dist/", import.meta.url);
const html = readFileSync(new URL("index.html", dist), "utf8");

test("la entrada publicada monta React y carga un módulo generado que existe", () => {
  assert.ok(/<div id="root"><\/div>/.test(html), "La entrada publicada no tiene la raíz React");
  const entry = html.match(/<script\b[^>]*type="module"[^>]*src="([^"]+)"/);
  assert.ok(entry, "Falta el módulo de entrada de la app real");
  assert.match(entry[1], /^\/assets\/.+\.js$/);
  assert.ok(existsSync(new URL(entry[1].slice(1), dist)));
});

test("la página publicada no contiene la barra ni acciones simuladas del prototipo", () => {
  assert.ok(!/class="proto-bar"|id="roleSelect"|id="dataStateSelect"/.test(html), "Se publicó la barra de simulación");
  assert.ok(!/handleSimAuth|Prototipo: operación simulada|prototipo: no se guarda/.test(html), "Se publicaron acciones simuladas");
});

test("el acceso directo carga los estilos de los controles sin visitar antes la portada", () => {
  const css = [...html.matchAll(/<link\b[^>]*rel="stylesheet"[^>]*href="([^"]+)"/g)]
    .map(([, href]) => readFileSync(new URL(href.replace(/^\//, ""), dist), "utf8")).join("\n");
  assert.ok(css.includes(".nui-button"), "Faltan los estilos compartidos en la entrada de la app");
});
