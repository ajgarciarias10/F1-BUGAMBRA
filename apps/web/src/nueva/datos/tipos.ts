// Tipos de los read models de la app nueva. Todo sale de `useSplits()`: aquí no se lee Firestore
// ni se escribe nada. Las pantallas de `nueva/pantallas` consumen estas formas.
import type { Equipo, PilotInRoster, RivalryConfig } from "../../types";

/** Cómo terminó un piloto un GP. Nunca se deduce de los puntos, salvo en Origins (`rango_11_20`
 *  y los puestos de Origins salen de sus puntos estándar, excepción aprobada por el dueño). */
export type EstadoResultado =
  | "clasificado"      // puesto registrado (o deducido en Origins)
  | "dnf"              // DNF marcado explícitamente
  | "desconocida"      // corrió, pero el puesto no está registrado
  | "rango_11_20"      // Origins: 1 punto estándar = entre el 11.º y el 20.º
  | "no_corrio";       // GP disputado sin resultado para un piloto de la plantilla

export interface FlagsOrigins {
  /** Puntos estándar del Excel (sin extras); en el GP doble cuentan ×2 en los puntos de la carrera. */
  estandar: number;
  extra: number;
  /** Puntos de rivalidad que el Excel suma solo al dúo. */
  rivalidad: number;
  limpio: boolean;
  terminar: boolean;
  pole: boolean;
  vueltaRapida: boolean;
  pilotoDelDia: boolean;
  racha: boolean;
}

export interface ResultadoGp {
  pilotoId: string;
  /** Escudería con la que corrió ese GP (la del resultado o, si falta, la de la plantilla). */
  equipoId: string | null;
  estado: EstadoResultado;
  /** Solo con `estado === "clasificado"`. */
  puesto: number | null;
  /** Puesto de clasificación registrado; null si no consta. */
  qualy: number | null;
  /** Puntos guardados en el resultado (0 si no corrió). */
  puntos: number;
  vueltaRapida: boolean;
  /** null si el acta no lo dice. */
  limpio: boolean | null;
  origins?: FlagsOrigins;
}

export interface GpTemporada {
  circuitoId: string;
  splitId: string;
  splitNombre: string;
  /** Número del GP en su temporada; en los splits sigue de uno a otro (13–18 en el Split 3). */
  numero: number;
  /** Orden dentro de su split (1..splitTotal). */
  enSplit: number;
  splitTotal: number;
  nombre: string;
  fecha: string | null;
  hora: string | null;
  disputada: boolean;
  actaCerrada: boolean;
  economiaProcesada: boolean;
  /** Origins: el GP cuenta los puntos estándar doble. */
  doble: boolean;
  /** Un registro por piloto con resultado guardado o, si el GP está disputado, por piloto de
   *  la plantilla que no corrió (`no_corrio`). */
  resultados: Record<string, ResultadoGp>;
  /** Puntos de cada escudería en ese GP con la plantilla de su split; null si no se ha disputado. */
  puntosEquipo: Record<string, number> | null;
}

export interface PilotoTemporada {
  pilotoId: string;
  nombre: string;
  fotoUrl?: string;
  /** Escudería en la temporada (en la Temporada 1, la del último split en que corrió). */
  equipoId: string | null;
  /** Temporada 1: escuderías por las que pasó, en orden. */
  equipos: string[];
  /** Puntos oficiales: `puntos_piloto` de la ficha del split, o la suma de resultados en Origins. */
  puntos: number;
  /** Suma de los puntos guardados en los resultados, para detectar descuadres. */
  puntosResultados: number;
  /** Valoración de esa temporada (`rating_piloto` de la ficha del split); null si no consta. */
  rating: number | null;
  /** Ficha del roster del split (no existe en la Temporada 1 ni para quien solo aparece en resultados). */
  ficha?: PilotInRoster;
}

export interface AportePiloto {
  puntos: number;
  /** Nombres de los splits en los que corrió para la escudería. */
  splits: string[];
}

export interface DesgloseCierre {
  mercado: number | null;
  puntos: number | null;
  pole: number | null;
  vueltaRapida: number | null;
  participacion: number | null;
  sinSancionados: number | null;
  rivalidad: number | null;
  premio: number | null;
  conciliado: boolean;
}

export interface EquipoTemporada {
  equipoId: string;
  nombre: string;
  logoUrl?: string;
  /** Puntos oficiales (`puntos_constructores`), sumados split a split en la Temporada 1. */
  puntos: number;
  /** Suma de los puntos por GP calculados con los resultados. */
  puntosResultados: number;
  pilotos: string[];
  porPiloto: Record<string, AportePiloto>;
  /** Saldo de salida: `presupuesto_inicial` o, si falta, el cierre del split anterior. */
  saldoApertura: number | null;
  /** Saldo de cierre conciliado (`economia_historica.presupuesto_cierre`); null si el split no cerró. */
  saldoCierre: number | null;
  /** Saldo actual (`presupuesto`). */
  saldoActual: number | null;
  /** Desglose guardado al cerrar el split. */
  desgloseCierre: DesgloseCierre | null;
  equipo?: Equipo;
}

export interface DuoTemporada {
  id: string;
  nombre: string;
  puntos: number;
  puntosPorGp: Array<number | null>;
  pilotoIds: string[];
}

export type TipoTemporada = "individual" | "split" | "agregada";

export interface Temporada {
  id: string;
  nombre: string;
  tipo: TipoTemporada;
  /** Splits que la forman (uno, o todos los de la Temporada 1). */
  splitIds: string[];
  enCurso: boolean;
  gps: GpTemporada[];
  pilotos: Record<string, PilotoTemporada>;
  equipos: EquipoTemporada[];
  duos: DuoTemporada[];
  rivalidades?: RivalryConfig;
  economiaConfig?: Record<string, number | number[] | boolean>;
}

export interface Liga {
  /** En orden: Origins (si existe), Temporada 1 y sus splits. */
  temporadas: Temporada[];
  origins: Temporada | null;
  temporada1: Temporada | null;
  splits: Temporada[];
  /** Split en curso o, si no hay, el último. */
  actual: Temporada | null;
}
