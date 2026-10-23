import assert from "node:assert/strict";
import test from "node:test";
import { SECCIONES, barraInferior, enlaceActivo, inicioDe, menuPorRol, panelDeRol, type Cuenta, type RolApp } from "./secciones.ts";

const cuenta = (rol: RolApp, extra: Partial<Cuenta> = {}): Cuenta => ({ rol, tienePiloto: false, conSesion: rol !== null, ...extra });
const etiquetas = (c: Cuenta) => menuPorRol(c).principal.map(e => e.etiqueta);
const adminEtiquetas = (c: Cuenta) => menuPorRol(c).admin.map(e => e.etiqueta);

test("visita: portada con pestañas, entrar e instalar", () => {
  assert.deepEqual(etiquetas(cuenta(null)), ["Clasificación", "Equipos", "Resultados", "TV", "Entrar", "Instalar"]);
  assert.deepEqual(adminEtiquetas(cuenta(null)), []);
  assert.equal(barraInferior(cuenta(null)), null);
  assert.equal(inicioDe(cuenta(null)), "/nueva/portada");
});

test("un rol guardado sin sesión cuenta como visita", () => {
  assert.deepEqual(etiquetas(cuenta("admin", { conSesion: false })), etiquetas(cuenta(null)));
});

test("rol invitado con sesión: menú de visita con Perfil en vez de Entrar", () => {
  assert.deepEqual(etiquetas(cuenta("invitado")), ["Clasificación", "Equipos", "Resultados", "TV", "Perfil", "Instalar"]);
});

const LIGA = ["Campeonato", "Carreras", "Mercado", "Equipos", "TV", "Perfil", "Buzón"];

test("usuario y piloto", () => {
  assert.deepEqual(etiquetas(cuenta("usuario")), ["Inicio", ...LIGA]);
  assert.deepEqual(etiquetas(cuenta("piloto")), ["Inicio", "Mi piloto", ...LIGA]);
  assert.deepEqual(adminEtiquetas(cuenta("piloto")), []);
});

test("jeque y director deportivo añaden Mi escudería", () => {
  assert.deepEqual(etiquetas(cuenta("jeque")), ["Inicio", "Mi escudería", ...LIGA]);
  assert.deepEqual(etiquetas(cuenta("director_deportivo")), ["Inicio", "Mi escudería", ...LIGA]);
  assert.equal(barraInferior(cuenta("jeque"))?.[1].etiqueta, "Escudería");
});

test("admin: sin escudería, con secciones de administración y Mi piloto solo si tiene piloto", () => {
  assert.deepEqual(etiquetas(cuenta("admin")), ["Inicio", ...LIGA]);
  assert.deepEqual(etiquetas(cuenta("admin", { tienePiloto: true })), ["Inicio", "Mi piloto", ...LIGA]);
  assert.deepEqual(adminEtiquetas(cuenta("admin")), ["Carreras y actas", "Economía y fichajes", "Rivalidades", "Usuarios", "Vídeos", "Sugerencias", "Temporada"]);
});

test("sin Paddock, Comunidad ni votaciones en ningún menú", () => {
  const roles: RolApp[] = [null, "invitado", "usuario", "piloto", "jeque", "director_deportivo", "admin"];
  for (const rol of roles) {
    const todo = [...etiquetas(cuenta(rol, { tienePiloto: true })), ...adminEtiquetas(cuenta(rol))].join(" ").toLowerCase();
    assert.doesNotMatch(todo, /paddock|comunidad|vot/);
  }
});

test("barra inferior: cinco accesos contando Más", () => {
  assert.deepEqual(barraInferior(cuenta("usuario"))?.map(e => e.etiqueta), ["Inicio", "Campeonato", "Carreras", "TV"]);
  assert.deepEqual(barraInferior(cuenta("admin"))?.map(e => e.etiqueta), ["Inicio", "Campeonato", "Carreras", "TV"]);
});

test("permisos: cada sección de un menú deja pasar a su rol", () => {
  const roles: RolApp[] = ["usuario", "piloto", "jeque", "director_deportivo", "admin"];
  for (const rol of roles) {
    const menu = menuPorRol(cuenta(rol, { tienePiloto: true }));
    for (const e of [...menu.principal, ...menu.admin]) {
      const permitidos = SECCIONES[e.clave].roles;
      assert.ok(permitidos === null || permitidos.includes(rol as string), `${rol} → ${e.clave}`);
    }
  }
});

test("enlace al panel actual por rol", () => {
  assert.equal(panelDeRol("jeque"), "/jeque");
  assert.equal(panelDeRol("admin"), "/piloto");
  assert.equal(panelDeRol("director_deportivo"), "/usuario");
  assert.equal(SECCIONES.carreras.panelActual("usuario"), "/usuario?tab=resultados");
  assert.equal(SECCIONES.adminEconomia.panelActual("admin"), "/admin");
});

test("enlace activo compara ruta y pestaña", () => {
  assert.ok(enlaceActivo("/nueva/inicio", "/nueva/inicio", ""));
  assert.ok(enlaceActivo("/nueva/portada?tab=clasificacion", "/nueva/portada", ""));
  assert.ok(!enlaceActivo("/nueva/portada?tab=equipos", "/nueva/portada", "?tab=tv"));
  assert.ok(!enlaceActivo("/nueva/carreras", "/nueva/admin/carreras", ""));
});
