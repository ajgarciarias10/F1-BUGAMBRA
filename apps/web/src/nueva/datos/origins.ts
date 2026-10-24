// Origins guardó en Firestore solo los puntos de cada carrera. El dueño aprobó (22-10-2026, ver
// AGENTS.md y docs/redesign/prototipo-gemini/decisiones.md) mostrar el puesto deducido de los
// puntos estándar del Excel de Origins: puntos de la carrera menos los extra. Es una excepción
// solo para Origins; el resto de la app nunca deduce puestos de los puntos.
import detalleJson from "./origins-detalle.json";
import type { EstadoResultado, FlagsOrigins } from "./tipos";

interface FilaExcel {
  pos: number | string;
  std: number; extra: number; riv: number;
  limpio: number; terminar: number; pole: number; vr: number; pdd: number; racha: number;
}
interface GpExcel { circuito: string; doble: boolean; pilotos: Record<string, FilaExcel> }

const DETALLE = (detalleJson as unknown as { gps: Record<string, GpExcel> }).gps;

/** Puntos estándar de Origins por puesto: 12 = P1, 10 = P2, 9 = P3 … 2 = P10. */
const ESTANDAR_POR_PUESTO = [12, 10, 9, 8, 7, 6, 5, 4, 3, 2];

export interface PosicionOrigins {
  estado: Exclude<EstadoResultado, "no_corrio">;
  puesto: number | null;
}

/** 12…2 → P1…P10; 1 → entre P11 y P20 (el Excel no guarda el puesto exacto); 0 sin terminar → DNF.
 *  Cualquier otro valor queda como desconocido. Dos pilotos con el mismo estándar comparten puesto
 *  (Canadá: Jota y Fabi, P2 los dos hasta que la liga diga quién ganó). */
export function posicionDesdeEstandar(estandar: number, terminar: boolean): PosicionOrigins {
  if (estandar === 0 && !terminar) return { estado: "dnf", puesto: null };
  if (!terminar) return { estado: "desconocida", puesto: null };
  if (estandar === 1) return { estado: "rango_11_20", puesto: null };
  const indice = ESTANDAR_POR_PUESTO.indexOf(estandar);
  return indice >= 0 ? { estado: "clasificado", puesto: indice + 1 } : { estado: "desconocida", puesto: null };
}

/** `piloto_fabi` → `fabi`, que es la clave del Excel. */
export function slugPiloto(pilotoId: string): string {
  return pilotoId.replace(/^piloto_/, "");
}

/** Nombre sin tildes ni mayúsculas, para casar «Toni/Fabi» con los pilotos. */
export function normalizarNombre(nombre: string): string {
  return nombre.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export function gpOriginsDoble(numero: number): boolean {
  return DETALLE[String(numero)]?.doble === true;
}

export interface DetalleOriginsPiloto extends PosicionOrigins {
  /** null cuando el Excel no cuadra con los puntos guardados. */
  flags: FlagsOrigins | null;
}

/**
 * Detalle del Excel para un piloto en un GP de Origins. Solo se usa si cuadra con los puntos
 * guardados en Firestore (estándar × multiplicador + extra); si no cuadra, el puesto queda
 * desconocido y no se enseñan banderas, porque una de las dos fuentes estaría mal.
 */
export function detalleOrigins(numero: number, pilotoId: string, puntosGuardados: number): DetalleOriginsPiloto | null {
  const gp = DETALLE[String(numero)];
  const fila = gp?.pilotos[slugPiloto(pilotoId)];
  if (!gp || !fila) return null;
  const esperado = fila.std * (gp.doble ? 2 : 1) + fila.extra;
  if (esperado !== puntosGuardados) return { estado: "desconocida", puesto: null, flags: null };
  return { ...posicionDesdeEstandar(fila.std, fila.terminar === 1), flags: flagsDe(fila) };
}

function flagsDe(fila: FilaExcel): FlagsOrigins {
  return {
    estandar: fila.std, extra: fila.extra, rivalidad: fila.riv,
    limpio: fila.limpio === 1, terminar: fila.terminar === 1, pole: fila.pole === 1,
    vueltaRapida: fila.vr === 1, pilotoDelDia: fila.pdd === 1, racha: fila.racha === 1,
  };
}

/** Solo para los tests: las filas del Excel tal cual. */
export function filasExcelOrigins(): Array<{ numero: number; slug: string; pos: number | string; std: number; terminar: boolean }> {
  return Object.entries(DETALLE).flatMap(([numero, gp]) => Object.entries(gp.pilotos).map(([slug, f]) => ({
    numero: Number(numero), slug, pos: f.pos, std: f.std, terminar: f.terminar === 1,
  })));
}
