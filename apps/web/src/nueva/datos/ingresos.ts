// Vista previa de lo que «Procesar economía» abona a cada escudería por un circuito. Repite, sin
// escribir nada, el cálculo de `procesarEconomiaCarrera` (services/economyService.ts): puntos ×
// factor, pole, vuelta rápida, piloto sin rival, grupos de rivalidad (clasificación y carrera),
// participación y equipo sin sancionados. Las cantidades salen de `economyRules` con la
// `economia_config` del split; aquí no hay constantes copiadas. Cada línea conserva su fuente.
import type { Circuito, LedgerSource, RaceResult, SplitView, TipoTransaccion } from "../../types";
import { economyRules, pointsForRaceResult } from "../../utils/economyRules";

export type FuenteIngreso = Extract<LedgerSource, "points" | "pole" | "fastestLap" | "rivalry" | "participation" | "cleanTeam">;
export const FUENTES_INGRESO: readonly FuenteIngreso[] = ["points", "pole", "fastestLap", "rivalry", "participation", "cleanTeam"];

export interface LineaIngreso {
  equipoId: string;
  fuente: FuenteIngreso;
  /** Tipo de asiento que escribiría `procesarEconomiaCarrera`. */
  tipo: TipoTransaccion;
  /** Para la rivalidad: piloto sin rival, premio de clasificación o de carrera. */
  rivalidad?: "solo" | "clasificacion" | "carrera";
  pilotoId?: string;
  piloto?: string;
  importe: number;
  /** El mismo texto que la descripción del asiento. */
  texto: string;
}

export interface IngresoEquipo {
  total: number;
  porFuente: Record<FuenteIngreso, number>;
  lineas: LineaIngreso[];
}

export interface DesgloseCircuito {
  circuitoId: string;
  lineas: LineaIngreso[];
  porEquipo: Record<string, IngresoEquipo>;
  /** Motivos por los que `procesarEconomiaCarrera` no lo procesaría ahora mismo. */
  problemas: string[];
  procesada: boolean;
  /** «aplicadas»: las reglas que guardó el circuito al procesarse (`economia_reglas_aplicadas`);
   *  «split»: la `economia_config` actual del split. */
  reglas: "aplicadas" | "split";
}

const r2 = (n: number) => Math.round(n * 100) / 100;
const SIN_EQUIPO = "agente_libre";
const puestoValido = (n: unknown): n is number => Number.isInteger(n) && (n as number) > 0 && n !== 99;

/** Lo que abonaría `procesarEconomiaCarrera` por este circuito, línea a línea. */
export function desgloseCircuito(split: SplitView, circuito: Circuito): DesgloseCircuito {
  const resultados: RaceResult[] = circuito.resultados ?? [];
  const problemas: string[] = [];
  if (!circuito.acta_cerrada) problemas.push("Cierra el acta antes de procesar la economía.");
  if (resultados.length === 0) problemas.push("No hay resultados registrados para procesar.");
  else {
    if (resultados.filter(r => r.qualyPos === 1).length !== 1) problemas.push("La carrera debe tener exactamente una pole.");
    if (resultados.filter(r => r.fastestLap === true).length !== 1) problemas.push("La carrera debe tener exactamente una vuelta rápida.");
    if (resultados.some(r => typeof r.isClean !== "boolean")) problemas.push("Indica si todos los pilotos están limpios o sancionados.");
  }
  // Un circuito ya procesado guarda las reglas con las que se abonó: así lo enseñado es lo
  // que se cobró aunque después cambie la configuración del split.
  const aplicadas = circuito.economia_procesada === true
    ? (circuito as Circuito & { economia_reglas_aplicadas?: unknown }).economia_reglas_aplicadas : undefined;
  const reglas = aplicadas && typeof aplicadas === "object" ? "aplicadas" as const : "split" as const;
  const vacio: DesgloseCircuito = { circuitoId: circuito.id, lineas: [], porEquipo: {}, problemas, procesada: circuito.economia_procesada === true, reglas };

  let rules: ReturnType<typeof economyRules>;
  try {
    rules = economyRules((reglas === "aplicadas" ? aplicadas : split.economia_config) as Parameters<typeof economyRules>[0]);
  } catch (error) {
    // Con reglas inválidas el servicio tampoco procesa: no hay importes que enseñar.
    return { ...vacio, problemas: [...problemas, (error as Error).message] };
  }

  const equipos = new Map(split.equipos.map(e => [e.id, e]));
  const equipoDeFicha = new Map(split.roster
    .filter(p => p.equipoId && p.equipoId !== SIN_EQUIPO)
    .map(p => [p.pilotoId, p.equipoId]));
  const nombres = new Map(split.roster.map(p => [p.pilotoId, p.nombre]));
  const nombre = (pilotoId: string) => nombres.get(pilotoId) || pilotoId;
  const equipoDe = (r: RaceResult) => r.equipoId ?? equipoDeFicha.get(r.pilotoId);

  const lineas: LineaIngreso[] = [];
  const add = (linea: Omit<LineaIngreso, "piloto"> & { pilotoId?: string }) =>
    lineas.push({ ...linea, ...(linea.pilotoId ? { piloto: nombre(linea.pilotoId) } : {}) });

  const sucios = new Set<string>();
  const participan = new Set<string>();
  const desconocidos = new Set<string>();
  for (const r of resultados) {
    const equipoId = equipoDe(r);
    if (!equipoId || equipoId === SIN_EQUIPO) continue;
    if (!equipos.has(equipoId)) { desconocidos.add(equipoId); continue; }
    participan.add(equipoId);
    if (!r.isClean) sucios.add(equipoId);
  }
  for (const id of desconocidos) problemas.push(`No existe la escudería ${id} del resultado.`);

  const solos = new Set((split.rivalries?.soloPilots ?? []).map(p => p.id));
  for (const r of resultados) {
    const equipoId = equipoDe(r);
    if (!equipoId || equipoId === SIN_EQUIPO || !equipos.has(equipoId)) continue;
    const puntos = pointsForRaceResult(r, rules);
    if (puntos > 0) {
      const importe = parseFloat((puntos * rules.puntos_factor).toFixed(2));
      add({ equipoId, fuente: "points", tipo: "ingreso_puntos", pilotoId: r.pilotoId, importe, texto: `${puntos} pts × ${rules.puntos_factor}M = +${importe}M` });
    }
    if (r.qualyPos === 1) add({ equipoId, fuente: "pole", tipo: "pole", pilotoId: r.pilotoId, importe: rules.pole, texto: `Pole position: +${rules.pole}M` });
    if (r.fastestLap) add({ equipoId, fuente: "fastestLap", tipo: "vuelta_rapida", pilotoId: r.pilotoId, importe: rules.vuelta_rapida, texto: `Vuelta rápida: +${rules.vuelta_rapida}M` });
    if (solos.has(r.pilotoId)) {
      add({ equipoId, fuente: "rivalry", tipo: "rivalidad", rivalidad: "solo", pilotoId: r.pilotoId, importe: rules.solo, texto: `Piloto sin rival: +${rules.solo}M` });
    }
  }

  for (const grupo of split.rivalries?.groups ?? []) {
    if (grupo.type === "solo") continue;
    const duo = grupo.members.length === 2;
    const miembros = grupo.members.flatMap(m => {
      const r = resultados.find(x => x.pilotoId === m.id);
      const equipoId = r ? equipoDe(r) : undefined;
      if (!r || !equipoId || equipoId === SIN_EQUIPO || !equipos.has(equipoId)) return [];
      return [{ pilotoId: m.id, qualyPos: r.qualyPos, racePos: r.racePos, equipoId }];
    });
    const reparto = (campo: "qualyPos" | "racePos", premios: readonly number[], cual: "clasificacion" | "carrera") => {
      miembros.filter(m => puestoValido(m[campo])).sort((a, b) => a[campo] - b[campo]).forEach((m, i) => {
        const premio = premios[i] ?? 0;
        if (premio > 0) add({
          equipoId: m.equipoId, fuente: "rivalry", tipo: "rivalidad", rivalidad: cual, pilotoId: m.pilotoId, importe: premio,
          texto: `Rivalidad ${cual === "clasificacion" ? "clasificación" : "carrera"} P${i + 1}: +${premio}M`,
        });
      });
    };
    reparto("qualyPos", duo ? rules.rivalidad_duo_clasificacion : rules.rivalidad_clasificacion, "clasificacion");
    reparto("racePos", duo ? rules.rivalidad_duo_carrera : rules.rivalidad_carrera, "carrera");
  }

  for (const equipoId of participan) {
    add({ equipoId, fuente: "participation", tipo: "premio_carrera", importe: rules.participacion, texto: `Participación del equipo: +${rules.participacion}M` });
    if (!sucios.has(equipoId)) {
      add({ equipoId, fuente: "cleanTeam", tipo: "sin_sancionados", importe: rules.sin_sancionados, texto: `Equipo sin penalizados: +${rules.sin_sancionados}M` });
    }
  }

  return { ...vacio, problemas, lineas, porEquipo: agrupar(lineas) };
}

const porFuenteVacio = (): Record<FuenteIngreso, number> =>
  Object.fromEntries(FUENTES_INGRESO.map(f => [f, 0])) as Record<FuenteIngreso, number>;

function agrupar(lineas: readonly LineaIngreso[]): Record<string, IngresoEquipo> {
  const out: Record<string, IngresoEquipo> = {};
  for (const l of lineas) {
    const e = out[l.equipoId] ??= { total: 0, porFuente: porFuenteVacio(), lineas: [] };
    e.total = r2(e.total + l.importe);
    e.porFuente[l.fuente] = r2(e.porFuente[l.fuente] + l.importe);
    e.lineas.push(l);
  }
  return out;
}

/** Ingresos de cada escudería sumados en los circuitos disputados del split. Con
 *  `soloProcesadas`, solo los que ya tienen la economía procesada. */
export function ingresosSplit(split: SplitView, opciones: { soloProcesadas?: boolean } = {}): Record<string, IngresoEquipo> {
  const lineas = split.circuitos
    .filter(c => c.completado && (!opciones.soloProcesadas || c.economia_procesada))
    .flatMap(c => desgloseCircuito(split, c).lineas);
  return agrupar(lineas);
}
