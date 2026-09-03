// ─── USUARIOS ─────────────────────────────────────────────────────────────────

export interface Usuario {
  uid: string;
  email: string;
  nombre: string;
  rol: "admin" | "usuario" | "jeque" | "piloto" | "invitado";
  piloto_id: string | null; // FK → pilotos/{id}
  escuderia_id?: string | null;
  foto_url?: string;
  rating_piloto?: number;
}

// ─── PILOTOS (entidad global) ──────────────────────────────────────────────────

export interface Piloto {
  id: string;
  nombre: string;
  rating_piloto: number; // 0-99, evoluciona globalmente carrera a carrera
  foto_url?: string;
}

// ─── SPLITS ───────────────────────────────────────────────────────────────────

export interface Split {
  id: string;
  nombre: string;
  orden: number; // 1,2,3,4
  fichajes_abiertos: boolean;
  activo?: boolean;
  completado?: boolean;
  temporada_iniciada?: boolean;
  tipo?: "equipos" | "individual";
  duos?: Array<{
    id: string;
    nombre: string;
    puntos: number;
    puntos_carreras?: number[];
  }>;
  rivalries?: RivalryConfig;
  /** Fuente cruda que edita el admin: {id, pilotoIds}[]. `rivalries.groups` es lo derivado
   *  de esto (con nombre, equipo, rating...) para el cálculo económico. */
  rivalidades_manual?: Array<{ id: string; pilotoIds: string[] }>;
  video_intro?: string;
}

// ─── EQUIPOS (por split) ───────────────────────────────────────────────────────

export interface Equipo {
  id: string;
  nombre: string;
  presupuesto: number;
  puntos_constructores: number;
  logo_url?: string;
}

// ─── ROSTER (pilotos asignados a equipos por split) ───────────────────────────
// Colección: splits/{splitId}/equipos/{equipoId}/pilotos/{pilotoId}

export type TipoFichaje = "subasta" | "clausula" | "mantener";

export interface RosterEntry {
  pilotoId: string;
  equipoId: string; // "agente_libre" si no tiene equipo
  rating_piloto: number;   // rating actual en este split (0-99), redondeado
  rating_base?: number;    // rating heredado del split anterior; el bloque evoluciona desde él
  rating_exacto?: number;  // el mismo valor sin redondear, para que la herencia no pierda décimas
  // Evolución del OVR carrera a carrera dentro del split
  historial_rating?: Record<string, { carrera: string; rating: number; rating_exacto?: number; delta: number }>;
  rookie?: boolean;
  participa_desde?: number;
  participa_hasta?: number | null;
  tipo_fichaje?: TipoFichaje;
  // Precios del split
  precio_compra: number;
  clausula_actual: number;
  mantener_actual: number;
  clausula_inicial_split: number;
  mantener_inicial_split: number;
  precio_carrera_anterior: number;
  historial_precios: Record<string, { carrera: string; mantener: number | null; clausula: number | null; congelado?: boolean }>;
  pending_equipoId?: string;          // transfer pending to next split
  pending_precio_compra?: number;    // purchase price to apply next split
  pending_tipo_fichaje?: TipoFichaje;
  estado_siguiente_split?: "mantener" | "clausula" | "subasta" | "agente_libre";
  precio_inicio_siguiente_split?: number; // written manually after the split closes
  // Congelación: si true, mantener/clausula no decaen con el procesado de carrera
  congelado?: boolean;
  congelado_en?: string; // circuitoId donde se congeló
  // Stats del split (empiezan a 0 cada split)
  puntos_piloto: number;
  victorias: number;
  podios: number;
  poles: number;
  dnfs: number;
  carreras_limpias: number;
}

// RosterEntry enriquecida con nombre/foto del piloto global (para uso en UI)
export interface PilotInRoster extends RosterEntry {
  nombre: string;
  foto_url?: string;
}

// ─── CIRCUITOS ────────────────────────────────────────────────────────────────

export interface Circuito {
  id: string;
  nombre: string;
  fecha?: string;
  hora?: string;
  numero_carrera?: number;
  hotlap_url?: string;
  completado: boolean;
  acta_cerrada: boolean;
  economia_procesada: boolean;
  resultados: RaceResult[];
  /** uid del votante → pilotoId elegido. Un voto por cuenta de la liga, sin duplicados. */
  piloto_dia_votantes?: Record<string, string>;
  /** true cuando el admin ha fijado el ganador y la votación ya no acepta cambios. */
  piloto_dia_cerrado?: boolean;
  /** pilotoId del ganador; solo tiene sentido si piloto_dia_cerrado es true. */
  piloto_dia_ganador?: string | null;
}

// ─── RESULTADOS DE CARRERA ────────────────────────────────────────────────────

export interface RaceResult {
  pilotoId: string;
  pilotoNombre?: string;
  puntos?: number;
  equipoId?: string; // Equipo en el momento de la carrera; ausente en resultados legacy
  qualyPos: number; // 1-12, o 99 si DNF
  racePos: number;  // 1-12, o 99 si DNF
  isDnfOwnError: boolean;
  isClean: boolean;
  overtakesBoost: boolean;
  isDotd: boolean;
  isMvp: boolean;
  fastestLap: boolean;
}

// ─── VISTA COMBINADA DE SPLIT (para hooks y UI) ───────────────────────────────

export interface SplitView extends Split {
  circuitos: Circuito[];
  equipos: Equipo[];
  roster: PilotInRoster[];
  isStarted: boolean;
}

// ─── TRANSACCIONES ────────────────────────────────────────────────────────────

export type TipoTransaccion =
  | "fichaje"
  | "clausula"
  | "subasta"
  | "piloto_negativo"
  | "ingreso_puntos"
  | "premio_carrera"
  | "rivalidad"
  | "pole"
  | "vuelta_rapida"
  | "sin_sancionados";

export interface Transaccion {
  id?: string;
  equipo: string;
  tipo: TipoTransaccion;
  piloto?: string;
  cantidad: number;
  esIngreso: boolean;
  carrera?: string;
  descripcion?: string;
  fecha: any; // serverTimestamp
}

// ─── RIVALIDADES ──────────────────────────────────────────────────────────────

export interface RivalryConfig {
  groups: RivalryGroup[];
  soloPilots: RivalryGroupMember[];
}

export interface RivalryPilot {
  id: string;
  nombre: string;
  equipoId: string;
  equipoNombre: string;
  rating: number;
  puntos_piloto: number;
}

export interface RivalryGroupMember extends RivalryPilot {
  statusRank: number;
  price: number;
}

export interface RivalryPair {
  pilotoA: RivalryPilot;
  pilotoB: RivalryPilot;
  ratingDiff: number;
  equipoA: string;
  equipoB: string;
}

export interface RivalryGroup {
  id: string;
  statusRank: number;
  type: "triad" | "pair" | "solo";
  members: RivalryGroupMember[];
  groupScore: number;
  fixedRewardPerRace?: number;
}

export interface SplitRivalries {
  splitId: string;
  totalPilotos: number;
  pairCount: number;
  coeficiente: number;
  rivalidades: RivalryPair[];
  groups: RivalryGroup[];
  soloPilots: RivalryGroupMember[];
}
