/**
 * Tabla de secciones de la app nueva (ADR 0004).
 *
 * Una sola fuente para las rutas, los menús por rol y los permisos de cada
 * pantalla. Mientras una pantalla no exista, la ruta enseña «Pantalla en
 * construcción» con un enlace al panel actual. Para enchufar una pantalla de
 * los tickets 16 a 25 basta con rellenar `pantalla` en su entrada, por ejemplo:
 *
 *   campeonato: { ..., pantalla: lazy(() => import("../pantallas/Campeonato").then(m => ({ default: m.Campeonato }))) },
 *
 * El ticket 26 quitará el prefijo `/nueva` y los marcadores de posición.
 */
import { lazy, type ComponentType } from "react";

/** Rol tal y como llega en `userData.rol`; `null` es una visita sin sesión. */
export type RolApp = "admin" | "jeque" | "director_deportivo" | "piloto" | "usuario" | "invitado" | null;

export const PREFIJO = "/nueva";

/** Todos los roles con sesión: la misma lista que hoy deja pasar a algún panel. */
export const ROLES_CON_SESION = ["admin", "jeque", "director_deportivo", "piloto", "usuario", "invitado"] as const;

export interface Seccion {
  /** Ruta relativa a `/nueva`, sin barra inicial. */
  ruta: string;
  titulo: string;
  /** Texto pequeño junto al enlace del menú. */
  sub: string;
  /** Roles que pueden abrirla (se pasa tal cual a `ProtectedRoute`); `null` = pública. */
  roles: readonly string[] | null;
  /** Dónde vive hoy esta pantalla en la app actual, por rol. */
  panelActual: (rol: RolApp) => string;
  /** La pantalla nueva, cuando exista. Sin ella se muestra el marcador. */
  pantalla?: ComponentType | null;
}

/** Panel actual de cada rol (las rutas que ya existen en App.tsx). */
export function panelDeRol(rol: RolApp): string {
  if (rol === "jeque") return "/jeque";
  // /piloto deja pasar al admin: es su "Acceder a la web" del panel de admin.
  if (rol === "piloto" || rol === "admin") return "/piloto";
  if (rol === "usuario" || rol === "invitado" || rol === "director_deportivo") return "/usuario";
  return "/";
}

const pestana = (tab: string) => (rol: RolApp) => `${panelDeRol(rol)}?tab=${tab}`;
const fija = (href: string) => () => href;

const SOLO_ADMIN = ["admin"] as const;

const DEFINICION = {
  // ── Públicas ──
  portada: { ruta: "portada", titulo: "Portada", sub: "Clasificación", roles: null, panelActual: fija("/"), pantalla: lazy(() => import("../pantallas/Portada").then(m => ({ default: m.Portada }))) },
  entrar: { ruta: "entrar", titulo: "Entrar", sub: "Iniciar sesión", roles: null, panelActual: fija("/login"), pantalla: lazy(() => import("../pantallas/Acceso").then(m => ({ default: m.Acceso }))) },
  instalar: { ruta: "instalar", titulo: "Instalar", sub: "Móvil y PC", roles: null, panelActual: fija("/instalar"), pantalla: lazy(() => import("../pantallas/Instalar").then(m => ({ default: m.Instalar }))) },

  // ── Con sesión ──
  inicio: { ruta: "inicio", titulo: "Inicio", sub: "Panel de la liga", roles: ROLES_CON_SESION, panelActual: pestana("inicio"), pantalla: lazy(() => import("../pantallas/Inicio").then(m => ({ default: m.Inicio }))) },
  campeonato: { ruta: "campeonato", titulo: "Campeonato", sub: "Clasificación y pilotos", roles: ROLES_CON_SESION, panelActual: pestana("championship"), pantalla: lazy(() => import("../pantallas/Campeonato").then(m => ({ default: m.Campeonato }))) },
  carreras: { ruta: "carreras", titulo: "Carreras", sub: "Actas y FIA", roles: ROLES_CON_SESION, panelActual: pestana("resultados"), pantalla: lazy(() => import("../pantallas/Carreras").then(m => ({ default: m.Carreras }))) },
  mercado: { ruta: "mercado", titulo: "Mercado", sub: "Fichajes", roles: ROLES_CON_SESION, panelActual: pestana("market") },
  equipos: { ruta: "equipos", titulo: "Equipos", sub: "Escuderías y pilotos", roles: ROLES_CON_SESION, panelActual: pestana("equipos"), pantalla: lazy(() => import("../pantallas/Equipos").then(m => ({ default: m.Equipos }))) },
  tv: { ruta: "tv", titulo: "TV", sub: "Vídeos y directo", roles: ROLES_CON_SESION, panelActual: pestana("tv") },
  perfil: { ruta: "perfil", titulo: "Perfil", sub: "Tu cuenta", roles: ROLES_CON_SESION, panelActual: pestana("profile"), pantalla: lazy(() => import("../pantallas/Perfil").then(m => ({ default: m.Perfil }))) },
  buzon: { ruta: "buzon", titulo: "Buzón", sub: "Propuestas", roles: ROLES_CON_SESION, panelActual: pestana("suggestions"), pantalla: lazy(() => import("../pantallas/Buzon").then(m => ({ default: m.Buzon }))) },
  // Mismos roles que la ruta actual /piloto.
  miPiloto: { ruta: "mi-piloto", titulo: "Mi piloto", sub: "Ficha y carrera", roles: ["piloto", "admin"], panelActual: fija("/piloto?tab=inicio"), pantalla: lazy(() => import("../pantallas/MiPiloto").then(m => ({ default: m.MiPiloto }))) },
  miEscuderia: { ruta: "escuderia", titulo: "Mi escudería", sub: "Saldo y plantilla", roles: ["jeque", "director_deportivo"], panelActual: pestana("escuderia") },

  // ── Administración (el panel actual no lee ?tab, se abre en su primera pestaña) ──
  adminCarreras: { ruta: "admin/carreras", titulo: "Carreras y actas", sub: "FIA y cierre", roles: SOLO_ADMIN, panelActual: fija("/admin") },
  adminEconomia: { ruta: "admin/economia", titulo: "Economía y fichajes", sub: "Saldos y traspasos", roles: SOLO_ADMIN, panelActual: fija("/admin") },
  adminRivalidades: { ruta: "admin/rivalidades", titulo: "Rivalidades", sub: "Grupos", roles: SOLO_ADMIN, panelActual: fija("/admin") },
  adminUsuarios: { ruta: "admin/usuarios", titulo: "Usuarios", sub: "Cuentas y roles", roles: SOLO_ADMIN, panelActual: fija("/admin") },
  adminVideos: { ruta: "admin/videos", titulo: "Vídeos", sub: "TV", roles: SOLO_ADMIN, panelActual: fija("/admin") },
  adminSugerencias: { ruta: "admin/sugerencias", titulo: "Sugerencias", sub: "Buzón", roles: SOLO_ADMIN, panelActual: fija("/admin") },
  adminTemporada: { ruta: "admin/temporada", titulo: "Temporada", sub: "Mercado y split", roles: SOLO_ADMIN, panelActual: fija("/admin") },
} satisfies Record<string, Seccion>;

export type ClaveSeccion = keyof typeof DEFINICION;

/** El registro único: rutas, permisos, enlaces al panel actual y pantalla de cada sección. */
export const SECCIONES: Record<ClaveSeccion, Seccion> = DEFINICION;

export const CLAVES_ADMIN: ClaveSeccion[] = [
  "adminCarreras", "adminEconomia", "adminRivalidades", "adminUsuarios", "adminVideos", "adminSugerencias", "adminTemporada",
];

export function rutaDe(clave: ClaveSeccion, query = ""): string {
  return `${PREFIJO}/${SECCIONES[clave].ruta}${query}`;
}

export interface EnlaceMenu {
  clave: ClaveSeccion;
  href: string;
  etiqueta: string;
  sub: string;
}

const enlace = (clave: ClaveSeccion, etiqueta?: string, query = "", sub?: string): EnlaceMenu => ({
  clave,
  href: rutaDe(clave, query),
  etiqueta: etiqueta ?? SECCIONES[clave].titulo,
  sub: sub ?? SECCIONES[clave].sub,
});

export interface Cuenta {
  rol: RolApp;
  /** El usuario tiene un piloto enlazado (`piloto_id`). */
  tienePiloto: boolean;
  conSesion: boolean;
}

export interface Menu {
  etiqueta: string;
  principal: EnlaceMenu[];
  admin: EnlaceMenu[];
}

/** Rol efectivo: sin sesión cuenta como visita. */
export function rolEfectivo(cuenta: Cuenta): RolApp {
  return cuenta.conSesion ? cuenta.rol : null;
}

const ETIQUETA_ROL: Record<string, string> = {
  admin: "Comisario",
  jeque: "Jeque",
  director_deportivo: "Director deportivo",
  piloto: "Piloto",
  usuario: "Aficionado",
  invitado: "Invitado",
};

/**
 * Menú lateral por rol, como en el prototipo. Visitas (y el rol `invitado`):
 * portada con sus pestañas, entrar e instalar. El resto, la liga completa;
 * el admin no tiene escudería y conserva Mi piloto solo si tiene piloto enlazado.
 */
export function menuPorRol(cuenta: Cuenta): Menu {
  const rol = rolEfectivo(cuenta);
  if (rol === null || rol === "invitado") {
    const principal = [
      enlace("portada", "Clasificación", "?tab=clasificacion", "Portada"),
      enlace("portada", "Equipos", "?tab=equipos", "3 escuderías"),
      enlace("portada", "Resultados", "?tab=resultados", "Grandes premios"),
      enlace("portada", "TV", "?tab=tv", "Vídeos"),
      cuenta.conSesion ? enlace("perfil") : enlace("entrar"),
      enlace("instalar"),
    ];
    return { etiqueta: cuenta.conSesion ? `Menú · ${ETIQUETA_ROL.invitado}` : "Navegación", principal, admin: [] };
  }

  const principal: EnlaceMenu[] = [enlace("inicio")];
  const conPiloto = rol === "piloto" || (rol === "admin" && cuenta.tienePiloto);
  if (conPiloto) principal.push(enlace("miPiloto"));
  if (rol === "jeque" || rol === "director_deportivo") {
    principal.push(enlace("miEscuderia", undefined, "", rol === "director_deportivo" ? "Solo lectura" : "Gestión"));
  }
  principal.push(
    enlace("campeonato"),
    enlace("carreras"),
    enlace("mercado", undefined, "", rol === "jeque" || rol === "admin" ? "Sala de pujas" : "Solo consulta"),
    enlace("equipos"),
    enlace("tv"),
    enlace("perfil"),
    enlace("buzon"),
  );
  const admin = rol === "admin" ? CLAVES_ADMIN.map(clave => enlace(clave)) : [];
  return { etiqueta: `Menú · ${ETIQUETA_ROL[rol] ?? rol}`, principal, admin };
}

/** Barra inferior móvil: cinco accesos; el último abre el menú. Las visitas no la tienen. */
export function barraInferior(cuenta: Cuenta): EnlaceMenu[] | null {
  const rol = rolEfectivo(cuenta);
  if (rol === null || rol === "invitado") return null;
  const segundo = rol === "jeque" || rol === "director_deportivo" ? enlace("miEscuderia", "Escudería") : enlace("campeonato");
  return [enlace("inicio"), segundo, enlace("carreras"), enlace("tv")];
}

/** Ruta de inicio del shell según haya sesión o no. */
export function inicioDe(cuenta: Cuenta): string {
  const rol = rolEfectivo(cuenta);
  return rol === null || rol === "invitado" ? rutaDe("portada") : rutaDe("inicio");
}

/**
 * ¿Está activo este enlace? Compara la ruta y, si el enlace lleva `?tab=`,
 * también la pestaña (la portada sin pestaña equivale a Clasificación).
 */
export function enlaceActivo(href: string, pathname: string, search: string): boolean {
  const [ruta, query = ""] = href.split("?");
  if (pathname.replace(/\/+$/, "") !== ruta) return false;
  const tab = new URLSearchParams(query).get("tab");
  if (!tab) return true;
  const actual = new URLSearchParams(search).get("tab") || "clasificacion";
  return actual === tab;
}
