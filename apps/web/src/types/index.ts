// ─── USUARIOS ─────────────────────────────────────────────────────────────────

export interface Usuario {
  uid: string;
  email: string;
  nombre: string;
  rol: "admin" | "usuario" | "jeque" | "director_deportivo" | "piloto" | "invitado";
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
  economia_config?: Record<string, number | number[] | boolean>;
  /** Fuente cruda que edita el admin: {id, pilotoIds}[]. `rivalries.groups` es lo derivado
   *  de esto (con nombre, equipo, rating...) para el cálculo económico. */
  rivalidades_manual?: Array<{ id: string; pilotoIds: string[] }>;
  video_intro?: string;
  /** Si está activo, la subasta en vivo está disponible en la pestaña Mercado.
   *  Si está desactivado, los jeques gestionan fichajes directos y presupuestos en Economía. */
  mercado_subasta_activado?: boolean;
  mercado_cerrado_por_plantillas?: boolean;
}

// ─── EQUIPOS (por split) ───────────────────────────────────────────────────────

export interface Equipo {
  id: string;
  nombre: string;
  presupuesto: number | null;
  puntos_constructores: number;
  logo_url?: string;
  /** Máximo de pilotos permitidos en la plantilla para este split (default 4). */
  plantilla_maxima?: number;
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
  /** La votación solo acepta votos mientras este estado esté abierto explícitamente. */
  piloto_dia_abierta?: boolean;
  piloto_dia_candidatos?: string[];
  piloto_dia_abierta_por?: string;
  piloto_dia_abierta_en?: unknown;
  /** true cuando el admin ha fijado el ganador y la votación ya no acepta cambios. */
  piloto_dia_cerrado?: boolean;
  piloto_dia_cerrada_por?: string;
  piloto_dia_cerrada_en?: unknown;
  /** pilotoId del ganador; solo tiene sentido si piloto_dia_cerrado es true. */
  piloto_dia_ganador?: string | null;
  /** Decisiones FIA registradas por el admin. Nunca se calculan ni se infieren. */
  decisiones_fia?: DecisionFia[];
}

// ─── DECISIONES FIA ───────────────────────────────────────────────────────────

export interface DecisionFia {
  /** Identificador estable; sirve para no registrar dos veces la misma decisión. */
  id: string;
  pilotoId?: string;
  equipoId?: string;
  /** Texto libre elegido por el admin (p. ej. "Time penalty"); la app no fija un catálogo. */
  tipo: string;
  /** Efecto deportivo tal y como lo anunció la liga; opcional. */
  efecto_deportivo?: string;
  motivo: string;
  /** Id de la transacción del ledger si hay multa económica ya aprobada y registrada. */
  transaccionId?: string;
  registrada_por?: string;
  registrada_en?: unknown;
}

/** Aviso oficial que el admin publica de forma explícita (colección `avisos_oficiales`). */
export interface AvisoOficial {
  id: string;
  titulo: string;
  texto: string;
  publicado_por?: string;
  publicado_en?: unknown;
}

// ─── ESTADOS DE LECTURA (read models) ─────────────────────────────────────────

export type RaceResultStatus = "classified" | "dnf" | "did_not_race" | "unknown_position";

export type LedgerSource =
  | "points" | "pole" | "fastestLap" | "participation" | "cleanTeam" | "rivalry"
  | "seasonPrize" | "transfer" | "priceAdjustment" | "manualAdjustment" | "other";

export type VotingStatus = "open" | "closed" | "unavailable";

// ─── RESULTADOS DE CARRERA ────────────────────────────────────────────────────

export interface RaceResult {
  pilotoId: string;
  pilotoNombre?: string;
  puntos?: number;
  equipoId?: string; // Equipo en el momento de la carrera; ausente en resultados legacy
  qualyPos: number; // 1-12, o 99 si DNF
  racePos: number;  // Posición real o 99 si aún se desconoce / no terminó
  isDnf?: boolean;
  isDnfOwnError?: boolean;
  isClean?: boolean;
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
  | "sin_sancionados"
  | "premio_temporada"
  | "ajuste";

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
  splitId?: string;
  equipoId?: string;
  circuitoId?: string;
  operacionId?: string | null;
  /** Solo existen en asientos que los guardaron; nunca se reconstruyen. */
  saldo_anterior?: number;
  saldo_nuevo?: number;
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
