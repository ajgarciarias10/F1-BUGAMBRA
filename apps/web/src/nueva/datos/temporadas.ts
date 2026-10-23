// Temporadas de la liga a partir de los splits que ya carga `useSplits()`: Origins (individual,
// por dúos), cada split por escuderías y la Temporada 1, que es la suma de sus splits (decisión
// del dueño, 22-10-2026). Porta la lógica de docs/redesign/prototipo-gemini/generador/
// liga-live.js y liga-block.js. Funciones puras: no leen Firestore ni escriben nada.
import type { Circuito, Equipo, PilotInRoster, RaceResult, SplitView } from "../../types";
import { raceResultStatus } from "../../services/readModels";
import { ordenarPorClasificacion, pointsForRaceResult } from "../../utils/economyRules";
import { detalleOrigins, gpOriginsDoble, normalizarNombre, slugPiloto } from "./origins";
import type {
  AportePiloto, DesgloseCierre, DuoTemporada, EquipoTemporada, GpTemporada, Liga, PilotoTemporada,
  ResultadoGp, Temporada,
} from "./tipos";

export const ID_TEMPORADA_1 = "temporada_1";
export const NOMBRE_TEMPORADA_1 = "Temporada 1";
const SIN_EQUIPO = "agente_libre";
type ConfigEconomia = Parameters<typeof pointsForRaceResult>[1];

const numeroFinito = (v: unknown): number | null => typeof v === "number" && Number.isFinite(v) ? v : null;
const redondear = (n: number) => Math.round(n * 100) / 100;
/** Los nombres guardados a veces llevan una estrella de rookie al final. */
const limpiarNombre = (s: string) => s.replace(/[★\s]+$/, "").trim();
const capitalizar = (s: string) => s ? s[0].toUpperCase() + s.slice(1) : s;
const puestoRegistrado = (n: unknown): number | null =>
  typeof n === "number" && Number.isInteger(n) && n >= 1 && n < 99 ? n : null;

// ─── CALENDARIO ──────────────────────────────────────────────────────────────

/** Mismo orden que `procesarEconomiaCarrera`: `numero_carrera`, luego fecha, luego id. */
export function ordenarCalendario(circuitos: readonly Circuito[]): Circuito[] {
  const orden = (c: Circuito) => Number(c.numero_carrera ?? 0);
  return [...circuitos].sort((a, b) => {
    if (orden(a) && orden(b)) return orden(a) - orden(b);
    if (orden(a)) return -1;
    if (orden(b)) return 1;
    const fa = String(a.fecha ?? ""), fb = String(b.fecha ?? "");
    return fa !== fb ? fa.localeCompare(fb) : a.id.localeCompare(b.id);
  });
}

/**
 * Números de GP de una serie de splits seguidos. Si los `numero_carrera` guardados ya continúan
 * de un split a otro (1–6, 7–12, 13–18) se respetan; si un split vuelve a empezar o le faltan,
 * se numera a continuación del anterior.
 */
export function numerarGps(calendarios: ReadonlyArray<readonly Circuito[]>): number[][] {
  let ultimo = 0;
  return calendarios.map(calendario => {
    const guardados = calendario.map(c => Number(c.numero_carrera));
    const continuan = guardados.every((n, i) => Number.isInteger(n) && n > (i === 0 ? ultimo : guardados[i - 1]));
    const numeros = continuan ? guardados : calendario.map((_, i) => ultimo + i + 1);
    if (numeros.length) ultimo = numeros[numeros.length - 1];
    return numeros;
  });
}

// ─── RESULTADOS ──────────────────────────────────────────────────────────────

function resultadoDeSplit(r: RaceResult, equipoId: string | null, reglas: SplitView["economia_config"]): ResultadoGp {
  const estado = raceResultStatus(r);
  return {
    pilotoId: r.pilotoId,
    equipoId,
    estado: estado === "classified" ? "clasificado" : estado === "dnf" ? "dnf" : "desconocida",
    puesto: estado === "classified" ? r.racePos : null,
    qualy: puestoRegistrado(r.qualyPos),
    // Los mismos puntos que usa la economía: los guardados o, si faltan, los del puesto registrado.
    puntos: pointsForRaceResult(r, reglas as ConfigEconomia),
    vueltaRapida: r.fastestLap === true,
    limpio: typeof r.isClean === "boolean" ? r.isClean : null,
  };
}

function resultadoDeOrigins(r: RaceResult, numero: number): ResultadoGp {
  const puntos = numeroFinito(Number(r.puntos)) ?? 0;
  const base: ResultadoGp = {
    pilotoId: r.pilotoId, equipoId: null, estado: "desconocida", puesto: null,
    qualy: puestoRegistrado(r.qualyPos), puntos,
    vueltaRapida: r.fastestLap === true, limpio: typeof r.isClean === "boolean" ? r.isClean : null,
  };
  // Lo registrado manda: un puesto o un DNF guardados no se sustituyen por la deducción.
  if (r.isDnf === true) return { ...base, estado: "dnf" };
  const registrado = puestoRegistrado(r.racePos);
  if (registrado !== null) return { ...base, estado: "clasificado", puesto: registrado };
  const detalle = detalleOrigins(numero, r.pilotoId, puntos);
  if (!detalle) return base;
  return {
    ...base,
    estado: detalle.estado,
    puesto: detalle.puesto,
    ...(detalle.flags ? {
      origins: detalle.flags,
      vueltaRapida: base.vueltaRapida || detalle.flags.vueltaRapida,
      limpio: base.limpio ?? detalle.flags.limpio,
    } : {}),
  };
}

// ─── UN SPLIT ────────────────────────────────────────────────────────────────

interface EquipoGuardado extends Equipo {
  presupuesto_inicial?: unknown;
  economia_historica?: Record<string, unknown>;
}

function desgloseCierreDe(h: Record<string, unknown> | undefined): DesgloseCierre | null {
  if (!h) return null;
  return {
    mercado: numeroFinito(h.ajuste_fichajes),
    puntos: numeroFinito(h.ingresos_puntos),
    pole: numeroFinito(h.ingresos_poles),
    vueltaRapida: numeroFinito(h.ingresos_vueltas_rapidas),
    participacion: numeroFinito(h.ingresos_participacion),
    sinSancionados: numeroFinito(h.ingresos_carreras_limpias),
    rivalidad: numeroFinito(h.ingresos_rivalidades_carreras),
    premio: numeroFinito(h.ajuste_premios),
    conciliado: h.conciliado === true,
  };
}

function nombreDeFicha(ficha: PilotInRoster | undefined, resultado: RaceResult | undefined, pilotoId: string): string {
  const nombre = ficha?.nombre && ficha.nombre !== pilotoId ? ficha.nombre : resultado?.pilotoNombre;
  return limpiarNombre(nombre || capitalizar(slugPiloto(pilotoId)));
}

/** Construye la temporada de un split. `cierresPrevios` es el saldo de cierre del split anterior. */
export function construirTemporadaSplit(
  split: SplitView,
  numeros: readonly number[],
  cierresPrevios: ReadonlyMap<string, number | null> = new Map(),
): Temporada {
  const individual = split.tipo === "individual";
  const calendario = ordenarCalendario(split.circuitos);
  const fichas = new Map(split.roster
    .filter(p => individual || (p.equipoId && p.equipoId !== SIN_EQUIPO))
    .map(p => [p.pilotoId, p]));
  const equipoDe = (pilotoId: string): string | null => individual ? null : fichas.get(pilotoId)?.equipoId ?? null;
  const equipoIds = individual ? [] : split.equipos.map(e => e.id);

  const gps: GpTemporada[] = calendario.map((c, i) => {
    const numero = numeros[i] ?? i + 1;
    const resultados: Record<string, ResultadoGp> = {};
    for (const r of c.resultados ?? []) {
      if (!r?.pilotoId) continue;
      if (individual) { resultados[r.pilotoId] = resultadoDeOrigins(r, numero); continue; }
      const equipoId = r.equipoId && r.equipoId !== SIN_EQUIPO ? r.equipoId : equipoDe(r.pilotoId);
      resultados[r.pilotoId] = resultadoDeSplit(r, equipoId, split.economia_config);
    }
    const disputada = c.completado === true;
    let puntosEquipo: Record<string, number> | null = null;
    if (disputada) {
      for (const pilotoId of fichas.keys()) {
        if (!resultados[pilotoId]) {
          resultados[pilotoId] = {
            pilotoId, equipoId: equipoDe(pilotoId), estado: "no_corrio", puesto: null, qualy: null,
            puntos: 0, vueltaRapida: false, limpio: null,
          };
        }
      }
      puntosEquipo = Object.fromEntries(equipoIds.map(id => [id, 0]));
      for (const r of Object.values(resultados)) {
        if (r.equipoId && r.equipoId in puntosEquipo) puntosEquipo[r.equipoId] = redondear(puntosEquipo[r.equipoId] + r.puntos);
      }
    }
    return {
      circuitoId: c.id, splitId: split.id, splitNombre: split.nombre, numero, enSplit: i + 1,
      splitTotal: calendario.length, nombre: c.nombre, fecha: c.fecha ? String(c.fecha).slice(0, 10) : null,
      hora: c.hora ?? null, disputada, actaCerrada: c.acta_cerrada === true,
      economiaProcesada: c.economia_procesada === true, doble: individual && gpOriginsDoble(numero),
      resultados, puntosEquipo,
    };
  });

  // Pilotos: los de la plantilla y, además, quien tenga resultados sin ficha (p. ej. Origins).
  const puntosResultados = new Map<string, number>();
  const primerResultado = new Map<string, RaceResult>();
  for (const c of calendario) for (const r of c.resultados ?? []) if (r?.pilotoId && !primerResultado.has(r.pilotoId)) primerResultado.set(r.pilotoId, r);
  for (const g of gps) for (const r of Object.values(g.resultados)) {
    puntosResultados.set(r.pilotoId, redondear((puntosResultados.get(r.pilotoId) ?? 0) + r.puntos));
  }
  const ids = [...new Set([...fichas.keys(), ...primerResultado.keys()])];
  const pilotos: Record<string, PilotoTemporada> = {};
  for (const pilotoId of ids) {
    const ficha = fichas.get(pilotoId);
    const deResultados = puntosResultados.get(pilotoId) ?? 0;
    const equipoId = equipoDe(pilotoId);
    const rating = numeroFinito(Number(ficha?.rating_piloto));
    pilotos[pilotoId] = {
      pilotoId,
      nombre: nombreDeFicha(ficha, primerResultado.get(pilotoId), pilotoId),
      fotoUrl: ficha?.foto_url,
      equipoId,
      equipos: equipoId ? [equipoId] : [],
      // En los splits manda `puntos_piloto` de la ficha (lo oficial, como el prototipo); Origins
      // no tiene fichas con puntos y suma sus resultados.
      puntos: !individual && ficha && numeroFinito(ficha.puntos_piloto) !== null ? ficha.puntos_piloto : deResultados,
      puntosResultados: deResultados,
      rating: rating !== null && rating > 0 ? rating : null,
      ...(ficha ? { ficha } : {}),
    };
  }

  const equipos: EquipoTemporada[] = individual ? [] : split.equipos.map(e => {
    const guardado = e as EquipoGuardado;
    const plantilla = Object.values(pilotos).filter(p => p.equipoId === e.id).sort((a, b) => b.puntos - a.puntos || a.nombre.localeCompare(b.nombre));
    const porPiloto: Record<string, AportePiloto> = Object.fromEntries(plantilla.map(p => [p.pilotoId, { puntos: p.puntos, splits: [split.nombre] }]));
    const historica = guardado.economia_historica;
    return {
      equipoId: e.id,
      nombre: e.nombre,
      logoUrl: e.logo_url,
      puntos: numeroFinito(e.puntos_constructores) ?? 0,
      puntosResultados: redondear(gps.reduce((s, g) => s + (g.puntosEquipo?.[e.id] ?? 0), 0)),
      pilotos: plantilla.map(p => p.pilotoId),
      porPiloto,
      saldoApertura: numeroFinito(guardado.presupuesto_inicial) ?? cierresPrevios.get(e.id) ?? null,
      saldoCierre: numeroFinito(historica?.presupuesto_cierre),
      saldoActual: numeroFinito(e.presupuesto),
      desgloseCierre: desgloseCierreDe(historica),
      equipo: e,
    };
  });

  const duos: DuoTemporada[] = (split.duos ?? []).map(d => {
    const partes = String(d.nombre ?? "").split("/").map(normalizarNombre).filter(Boolean);
    const pilotoIds = partes.map(parte => Object.values(pilotos).find(p =>
      normalizarNombre(p.nombre) === parte || normalizarNombre(slugPiloto(p.pilotoId)) === parte)?.pilotoId)
      .filter((id): id is string => !!id);
    return {
      id: d.id, nombre: d.nombre,
      // Los puntos del dúo son los guardados: el Excel les suma la rivalidad (211 de Toni/Fabi es correcto).
      puntos: numeroFinito(d.puntos) ?? 0,
      puntosPorGp: calendario.map((_, i) => numeroFinito(d.puntos_carreras?.[i])),
      pilotoIds,
    };
  }).sort((a, b) => b.puntos - a.puntos);

  return {
    id: split.id, nombre: split.nombre, tipo: individual ? "individual" : "split", splitIds: [split.id],
    enCurso: split.activo === true, gps, pilotos, equipos, duos,
    rivalidades: split.rivalries, economiaConfig: split.economia_config,
  };
}

// ─── TEMPORADA 1 ─────────────────────────────────────────────────────────────

/** Suma de los splits: puntos de pilotos y escuderías, GP seguidos y cada GP con los puntos de
 *  escudería de su propio split. Cada escudería lista todos los pilotos que corrieron para ella. */
export function agregarTemporada(splits: readonly Temporada[], id = ID_TEMPORADA_1, nombre = NOMBRE_TEMPORADA_1): Temporada {
  const pilotos: Record<string, PilotoTemporada> = {};
  for (const s of splits) {
    for (const p of Object.values(s.pilotos)) {
      const a = pilotos[p.pilotoId] ??= {
        pilotoId: p.pilotoId, nombre: p.nombre, fotoUrl: p.fotoUrl, equipoId: null, equipos: [],
        puntos: 0, puntosResultados: 0, rating: null,
      };
      a.puntos = redondear(a.puntos + p.puntos);
      a.puntosResultados = redondear(a.puntosResultados + p.puntosResultados);
      a.nombre = p.nombre;
      a.fotoUrl = p.fotoUrl ?? a.fotoUrl;
      if (p.equipoId) {
        a.equipoId = p.equipoId;
        if (a.equipos[a.equipos.length - 1] !== p.equipoId) a.equipos.push(p.equipoId);
      }
      if (p.rating !== null) a.rating = p.rating; // última valoración conocida
    }
  }

  const ids = [...new Set(splits.flatMap(s => s.equipos.map(e => e.equipoId)))];
  const equipos: EquipoTemporada[] = ids.map(equipoId => {
    const de = splits.map(s => s.equipos.find(e => e.equipoId === equipoId)).filter((e): e is EquipoTemporada => !!e);
    const ultimo = de[de.length - 1];
    const porPiloto: Record<string, AportePiloto> = {};
    for (const e of de) {
      for (const [pilotoId, aporte] of Object.entries(e.porPiloto)) {
        const x = porPiloto[pilotoId] ??= { puntos: 0, splits: [] };
        x.puntos = redondear(x.puntos + aporte.puntos);
        x.splits.push(...aporte.splits);
      }
    }
    return {
      equipoId, nombre: ultimo.nombre, logoUrl: ultimo.logoUrl,
      puntos: redondear(de.reduce((s, e) => s + e.puntos, 0)),
      puntosResultados: redondear(de.reduce((s, e) => s + e.puntosResultados, 0)),
      pilotos: Object.keys(porPiloto), porPiloto,
      saldoApertura: de[0].saldoApertura, saldoCierre: ultimo.saldoCierre, saldoActual: ultimo.saldoActual,
      desgloseCierre: null, equipo: ultimo.equipo,
    };
  });

  return {
    id, nombre, tipo: "agregada", splitIds: splits.flatMap(s => s.splitIds),
    enCurso: splits.some(s => s.enCurso), gps: splits.flatMap(s => s.gps), pilotos, equipos, duos: [],
  };
}

// ─── LIGA ────────────────────────────────────────────────────────────────────

export function construirLiga(splitViews: readonly SplitView[]): Liga {
  // Un split recién creado aún no tiene calendario: no se enseña hasta tenerlo (como el prototipo).
  const conCalendario = splitViews.filter(s => s.circuitos.length > 0);
  const individuales = conCalendario.filter(s => s.tipo === "individual");
  const deEquipos = conCalendario.filter(s => s.tipo !== "individual");

  const individualesT = individuales.map(s =>
    construirTemporadaSplit(s, numerarGps([ordenarCalendario(s.circuitos)])[0]));

  const numeros = numerarGps(deEquipos.map(s => ordenarCalendario(s.circuitos)));
  const splits: Temporada[] = [];
  let cierres = new Map<string, number | null>();
  deEquipos.forEach((s, i) => {
    const t = construirTemporadaSplit(s, numeros[i], cierres);
    splits.push(t);
    cierres = new Map(t.equipos.map(e => [e.equipoId, e.saldoCierre]));
  });

  const temporada1 = splits.length ? agregarTemporada(splits) : null;
  const origins = individualesT[0] ?? null;
  return {
    temporadas: [...individualesT, ...(temporada1 ? [temporada1] : []), ...splits],
    origins,
    temporada1,
    splits,
    actual: splits.find(s => s.enCurso) ?? splits[splits.length - 1] ?? origins,
  };
}

export function temporadaPorId(liga: Liga, id: string): Temporada | null {
  return liga.temporadas.find(t => t.id === id) ?? null;
}

// ─── CLASIFICACIONES ─────────────────────────────────────────────────────────

export interface FilaClasificacion<T> {
  puesto: number;
  /** Puntos que le faltan para el líder (0 para el líder). */
  diferencia: number;
  fila: T;
}

function clasificar<T>(filas: T[], puntos: (f: T) => number, nombre: (f: T) => string): Array<FilaClasificacion<T>> {
  const ordenadas = [...filas].sort((a, b) => nombre(a).localeCompare(nombre(b), "es"));
  const lider = ordenadas.length ? Math.max(...ordenadas.map(puntos)) : 0;
  return ordenarPorClasificacion(ordenadas, puntos).map(({ entry, puesto }) => ({
    puesto, diferencia: redondear(lider - puntos(entry)), fila: entry,
  }));
}

/** Pilotos por puntos. Con `equipoId`, solo los de esa escudería pero con su puesto general. */
export function clasificacionPilotos(t: Temporada, equipoId?: string): Array<FilaClasificacion<PilotoTemporada>> {
  const todas = clasificar(Object.values(t.pilotos), p => p.puntos, p => p.nombre);
  return equipoId ? todas.filter(f => f.fila.equipoId === equipoId) : todas;
}

export function clasificacionEquipos(t: Temporada): Array<FilaClasificacion<EquipoTemporada>> {
  return clasificar(t.equipos, e => e.puntos, e => e.nombre);
}

export function clasificacionDuos(t: Temporada): Array<FilaClasificacion<DuoTemporada>> {
  return clasificar(t.duos, d => d.puntos, d => d.nombre);
}

// ─── EVOLUCIÓN POR GP ────────────────────────────────────────────────────────

export interface ColumnaGp {
  circuitoId: string;
  numero: number;
  nombre: string;
  /** Split al que pertenece (para la banda superior y las rayas de corte). */
  grupo: string;
  /** Texto bajo el grupo, p. ej. la escudería del piloto en ese split. */
  grupoSub?: string;
  pendiente: boolean;
}

export interface SerieEvolucion {
  id: string;
  nombre: string;
  /** Acumulado tras cada GP; null si no se ha disputado o no corrió para esa serie. */
  acumulado: Array<number | null>;
  /** Lo sumado en cada GP. */
  porGp: Array<number | null>;
}

const columnaDe = (g: GpTemporada, grupoSub?: string): ColumnaGp => ({
  circuitoId: g.circuitoId, numero: g.numero, nombre: g.nombre, grupo: g.splitNombre,
  ...(grupoSub ? { grupoSub } : {}), pendiente: !g.disputada,
});

/** Puntos acumulados de cada escudería GP a GP, alineados con el calendario. En la Temporada 1
 *  el acumulado sigue de un split a otro; en un split empieza en cero. */
export function evolucionEquipos(t: Temporada): { columnas: ColumnaGp[]; series: SerieEvolucion[] } {
  const columnas = t.gps.map(g => columnaDe(g));
  const series = t.equipos.map(e => {
    let acumulado = 0;
    const porGp = t.gps.map(g => g.puntosEquipo && e.equipoId in g.puntosEquipo ? g.puntosEquipo[e.equipoId] : null);
    return {
      id: e.equipoId, nombre: e.nombre, porGp,
      acumulado: porGp.map(p => p === null ? null : (acumulado = redondear(acumulado + p))),
    };
  });
  return { columnas, series };
}

/** Evolución de un piloto en los splits de la Temporada 1 en que corrió, con su escudería de
 *  entonces en cada bloque y su resultado de cada GP (null si no corrió). */
export function evolucionPiloto(liga: Liga, pilotoId: string): {
  columnas: ColumnaGp[]; serie: SerieEvolucion; resultados: Array<ResultadoGp | null>;
} {
  const splits = liga.splits.filter(s => s.pilotos[pilotoId]);
  const columnas: ColumnaGp[] = [];
  const porGp: Array<number | null> = [];
  const acumulado: Array<number | null> = [];
  const resultados: Array<ResultadoGp | null> = [];
  let suma = 0;
  for (const s of splits) {
    const equipoId = s.pilotos[pilotoId].equipoId;
    const equipoNombre = s.equipos.find(e => e.equipoId === equipoId)?.nombre;
    for (const g of s.gps) {
      columnas.push(columnaDe(g, equipoNombre));
      const r = g.resultados[pilotoId] ?? null;
      resultados.push(g.disputada ? r : null);
      if (!g.disputada) { porGp.push(null); acumulado.push(null); continue; }
      const puntos = r ? r.puntos : 0;
      suma = redondear(suma + puntos);
      porGp.push(puntos);
      acumulado.push(suma);
    }
  }
  const nombre = liga.temporada1?.pilotos[pilotoId]?.nombre ?? splits[0]?.pilotos[pilotoId]?.nombre ?? pilotoId;
  return { columnas, serie: { id: pilotoId, nombre, porGp, acumulado }, resultados };
}

/** Tabla de puntos por GP de cada piloto, en el orden de la clasificación. */
export function puntosPilotosPorGp(t: Temporada, equipoId?: string): Array<{
  piloto: PilotoTemporada; puesto: number; resultados: Array<ResultadoGp | null>;
}> {
  return clasificacionPilotos(t, equipoId).map(({ fila, puesto }) => ({
    piloto: fila, puesto, resultados: t.gps.map(g => g.disputada ? g.resultados[fila.pilotoId] ?? null : null),
  }));
}

/** Trayectoria de un piloto: su puesto y puntos en cada temporada (Origins, Temporada 1 y splits). */
export function trayectoriaPiloto(liga: Liga, pilotoId: string): Array<{
  temporadaId: string; temporada: string; equipoId: string | null; puesto: number; puntos: number; provisional: boolean;
}> {
  return liga.temporadas.filter(t => t.pilotos[pilotoId]).map(t => {
    const fila = clasificacionPilotos(t).find(f => f.fila.pilotoId === pilotoId)!;
    return {
      temporadaId: t.id, temporada: t.nombre, equipoId: fila.fila.equipoId, puesto: fila.puesto,
      puntos: fila.fila.puntos, provisional: t.enCurso,
    };
  });
}

/** Altas y bajas de cada escudería respecto al split anterior. */
export function cambiosDePlantilla(liga: Liga, splitId: string): Array<{ equipoId: string; altas: string[]; bajas: string[] }> {
  const i = liga.splits.findIndex(s => s.id === splitId);
  if (i <= 0) return [];
  const actual = liga.splits[i], previo = liga.splits[i - 1];
  return actual.equipos.map(e => {
    const antes = previo.equipos.find(x => x.equipoId === e.equipoId)?.pilotos ?? [];
    return { equipoId: e.equipoId, altas: e.pilotos.filter(p => !antes.includes(p)), bajas: antes.filter(p => !e.pilotos.includes(p)) };
  });
}

// ─── SALDOS ENTRE SPLITS ─────────────────────────────────────────────────────

/** Saldo de una escudería al empezar la Temporada 1 y al cerrar cada split (el actual en el split
 *  en curso). El cierre de un split es la salida del siguiente. */
export function saldosEntreSplits(liga: Liga, equipoId: string): Array<{
  clave: "inicio" | "cierre" | "actual"; splitId: string; split: string; saldo: number | null;
}> {
  const filas: ReturnType<typeof saldosEntreSplits> = [];
  const primero = liga.splits.find(s => s.equipos.some(e => e.equipoId === equipoId));
  if (!primero) return filas;
  filas.push({ clave: "inicio", splitId: primero.id, split: primero.nombre, saldo: primero.equipos.find(e => e.equipoId === equipoId)!.saldoApertura });
  for (const s of liga.splits) {
    const e = s.equipos.find(x => x.equipoId === equipoId);
    if (!e) continue;
    filas.push(s.enCurso
      ? { clave: "actual", splitId: s.id, split: s.nombre, saldo: e.saldoActual }
      : { clave: "cierre", splitId: s.id, split: s.nombre, saldo: e.saldoCierre });
  }
  return filas;
}
