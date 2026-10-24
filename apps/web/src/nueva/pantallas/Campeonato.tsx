// Pantalla Campeonato (ticket 16): clasificación por temporada, cartas de piloto y cara a cara.
// Solo lectura: todo sale de `useLiga()`; aquí no se lee Firestore ni se escribe nada.
// La Clasificación se exporta también para la pestaña del mismo nombre de la Portada.
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useLiga } from "../datos/useLiga";
import { cartaDeTemporada, type CartaPiloto } from "../datos/cartas";
import { normalizarNombre } from "../datos/origins";
import {
  clasificacionDuos, clasificacionEquipos, clasificacionPilotos, evolucionEquipos, puntosPilotosPorGp, temporadaPorId,
  type ColumnaGp,
} from "../datos/temporadas";
import type { EquipoTemporada, GpTemporada, Liga, PilotoTemporada, ResultadoGp, Temporada } from "../datos/tipos";
import { CartaPilotoModal } from "../ui/CartaPilotoModal";
import { ControlSegmentado } from "../ui/ControlSegmentado";
import { Evolucion, type SerieGrafico } from "../ui/Evolucion";
import { TarjetaPiloto, type AparienciaEquipo } from "../ui/TarjetaPiloto";
import { TemporadasRail, type GrupoTemporadas, type OpcionTemporada } from "../ui/TemporadasRail";

// Las hojas de la app nueva las carga `ui/index`; aquí se piden en el navegador para poder probar
// el modelo en Node sin cargar CSS.
if (typeof window !== "undefined") void import("../ui/nueva.css");

export const ID_HISTORICO = "historico";

// ─── MODELO (puro, con pruebas) ──────────────────────────────────────────────

export interface MarcaEquipo extends AparienciaEquipo { serie: string; dash?: string }

const MARCAS: Array<{ clave: string } & Omit<MarcaEquipo, "logoUrl">> = [
  { clave: "alfa", color: "var(--team-alfa)", fondo: "var(--team-alfa-dark)", serie: "var(--serie-alfa)" },
  { clave: "zenith", color: "var(--team-zenith)", fondo: "var(--team-zenith-dark)", serie: "var(--serie-zenith)", dash: "8 4" },
  { clave: "roses", color: "var(--team-roses)", fondo: "var(--team-roses-dark)", serie: "var(--serie-roses)", dash: "2 4" },
];
const NEUTRA = { color: "var(--text-muted)", fondo: "#1b1e26", serie: "var(--text-muted)" };
const SERIES_EXTRA = ["var(--serie-alfa)", "var(--serie-zenith)", "var(--serie-roses)", "var(--accent-ok)", "var(--accent-f1)", "var(--text-muted)"];
const TRAZOS_EXTRA = [undefined, "8 4", "2 4", undefined, "8 4", "2 4"];

/** Colores de una escudería por su nombre; las que no tienen marca propia usan la neutra. */
export function marcaEquipo(nombre: string, logoUrl?: string): MarcaEquipo {
  const n = normalizarNombre(nombre);
  const marca = MARCAS.find(m => n.includes(m.clave));
  return { ...(marca ?? NEUTRA), logoUrl };
}

export const rangoGp = (t: Temporada) => t.gps.length ? `GP ${t.gps[0].numero}–${t.gps[t.gps.length - 1].numero}` : "Sin GP";

function detalleDe(t: Temporada, campeon: string | null): string {
  if (t.tipo === "agregada") return `Total · ${rangoGp(t)}${t.enCurso ? " · en curso" : ""}`;
  if (t.enCurso) return `${rangoGp(t)} · en curso`;
  const base = t.tipo === "individual" ? `${t.gps.length} GP` : rangoGp(t);
  return campeon ? `${base} · ${campeon}` : base;
}

/** Quién va primero (o todos los empatados); null si aún no hay puntos. */
function lideres<T>(filas: Array<{ puesto: number; fila: T }>, puntos: (f: T) => number, nombre: (f: T) => string): string | null {
  const primeros = filas.filter(f => f.puesto === 1 && puntos(f.fila) > 0);
  return primeros.length ? primeros.map(f => nombre(f.fila)).join(" / ") : null;
}

export interface PalmaresFila {
  temporadaId: string;
  nombre: string;
  rango: string;
  carreras: number;
  /** Temporada sin cerrar: el nombre es el líder de hoy, no un campeón. */
  provisional: boolean;
  campeonPilotos: string | null;
  /** Escuderías, o dúos en Origins. */
  campeonEquipos: string | null;
  tipoEquipos: "Escuderías" | "Dúos";
}

export function palmares(liga: Liga): PalmaresFila[] {
  return liga.temporadas.map(t => ({
    temporadaId: t.id, nombre: t.nombre, rango: rangoGp(t), carreras: t.gps.filter(g => g.disputada).length,
    provisional: t.enCurso,
    campeonPilotos: lideres(clasificacionPilotos(t), p => p.puntos, p => p.nombre),
    campeonEquipos: t.tipo === "individual"
      ? lideres(clasificacionDuos(t), d => d.puntos, d => d.nombre)
      : lideres(clasificacionEquipos(t), e => e.puntos, e => e.nombre),
    tipoEquipos: t.tipo === "individual" ? "Dúos" : "Escuderías",
  }));
}

/** Los nodos del selector: Origins, Temporada 1 con sus splits y el Histórico (Origins + Temporada 1). */
export function gruposTemporadas(liga: Liga): GrupoTemporadas[] {
  const campeon = new Map(palmares(liga).map(p => [p.temporadaId, p.campeonEquipos]));
  const opcion = (t: Temporada): OpcionTemporada => ({
    id: t.id, nombre: t.nombre, tipo: t.tipo, enCurso: t.enCurso, detalle: detalleDe(t, campeon.get(t.id)?.replace(/^Dúo /, "") ?? null),
  });
  const grupos: GrupoTemporadas[] = [];
  if (liga.origins) grupos.push({ id: "origins", nombre: `Temporada ${liga.origins.nombre} · por dúos`, temporadas: [opcion(liga.origins)] });
  if (liga.temporada1) grupos.push({ id: "t1", nombre: `${liga.temporada1.nombre} · por escuderías`, temporadas: [liga.temporada1, ...liga.splits].map(opcion) });
  if (liga.origins && liga.temporada1) grupos.push({
    id: ID_HISTORICO, nombre: "Todas las temporadas",
    temporadas: [{ id: ID_HISTORICO, nombre: "Histórico", tipo: "agregada", enCurso: false, detalle: `${liga.origins.nombre} + ${liga.temporada1.nombre}` }],
  });
  return grupos;
}

export interface HistoricoPiloto {
  pilotoId: string;
  nombre: string;
  fotoUrl?: string;
  origins: number | null;
  temporada1: number | null;
  total: number;
}

/** El «Mundial Global» del panel actual: los puntos de cada piloto en Origins más los de la Temporada 1.
 *  Se compone con lo que ya calcula `construirLiga`; no hay documento nuevo. */
export function construirHistorico(liga: Liga): HistoricoPiloto[] {
  const partes = [liga.origins, liga.temporada1].filter((t): t is Temporada => t !== null);
  const ids = new Set(partes.flatMap(t => Object.keys(t.pilotos)));
  const redondear = (n: number) => Math.round(n * 100) / 100;
  return [...ids].map(id => {
    const enOrigins = liga.origins?.pilotos[id], enT1 = liga.temporada1?.pilotos[id];
    const ficha = enT1 ?? enOrigins!;
    return {
      pilotoId: id, nombre: ficha.nombre, fotoUrl: enT1?.fotoUrl ?? enOrigins?.fotoUrl,
      origins: enOrigins ? enOrigins.puntos : null, temporada1: enT1 ? enT1.puntos : null,
      total: redondear((enOrigins?.puntos ?? 0) + (enT1?.puntos ?? 0)),
    };
  }).sort((a, b) => b.total - a.total || a.nombre.localeCompare(b.nombre, "es"));
}

/** Ganador de un GP disputado: quien tiene el puesto 1 registrado (nunca se deduce de los puntos). */
export function ganadoresGp(g: GpTemporada): string[] {
  if (!g.disputada) return [];
  return Object.values(g.resultados).filter(r => r.estado === "clasificado" && r.puesto === 1).map(r => r.pilotoId);
}

/** Texto del puesto de una celda de resultados. */
export function textoPuesto(r: ResultadoGp | null | undefined): string {
  if (!r || r.estado === "no_corrio") return "NC";
  switch (r.estado) {
    case "dnf": return "DNF";
    case "desconocida": return "¿?";
    case "rango_11_20": return "P11–20";
    case "clasificado": return r.puesto === null ? "¿?" : `P${r.puesto}`;
  }
}

/** Marcas de Origins: pole, vuelta rápida, piloto del día y racha. */
export function marcasOrigins(r: ResultadoGp | null | undefined): string[] {
  const o = r?.origins;
  if (!o) return [];
  return [o.pole && "PO", o.vueltaRapida && "VR", o.pilotoDelDia && "PD", o.racha && "R"].filter((m): m is string => typeof m === "string");
}

/** Primer GP por disputar, solo en una temporada en curso. */
export function proximoGp(t: Temporada): GpTemporada | null {
  return t.enCurso ? t.gps.find(g => !g.disputada) ?? null : null;
}

export function fechaCorta(fecha: string | null): string | null {
  if (!fecha) return null;
  const d = new Date(`${fecha}T12:00:00`);
  return Number.isNaN(d.getTime()) ? null : new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "short", year: "numeric" }).format(d);
}

export interface FilaCaraACara { etiqueta: string; a: string; b: string; mejor: "a" | "b" | null }

/** Cara a cara de dos cartas de la misma temporada. «Mejor» solo se marca si la cifra existe en los dos. */
export function caraACara(a: CartaPiloto, b: CartaPiloto): FilaCaraACara[] {
  const num = (v: number | null) => v === null ? "—" : v.toLocaleString("es-ES", { maximumFractionDigits: 1 });
  const fila = (etiqueta: string, x: number | null, y: number | null, menorGana = false): FilaCaraACara => ({
    etiqueta, a: num(x), b: num(y),
    mejor: x === null || y === null || x === y ? null : (x < y) === menorGana ? "a" : "b",
  });
  return [
    fila("Puntos", a.puntos, b.puntos),
    fila("Valoración (OVR)", a.rating, b.rating),
    fila("Carreras", a.carreras, b.carreras),
    fila("Victorias", a.victorias, b.victorias),
    fila("Podios", a.podios, b.podios),
    fila("Poles", a.poles, b.poles),
    fila("Vueltas rápidas", a.vueltasRapidas, b.vueltasRapidas),
    fila("Carreras limpias", a.limpias, b.limpias),
    fila("DNF", a.dnfs, b.dnfs, true),
    fila("Puesto medio en carrera", a.mediaCarrera, b.mediaCarrera, true),
    fila("Media de puntos", a.mediaPuntos, b.mediaPuntos),
  ];
}

/** Carta de un piloto en la temporada elegida. En la Temporada 1 completa la valoración es la del último
 *  split en que corrió (la ficha de la temporada agregada no la tiene). */
export function cartaEnTemporada(liga: Liga, t: Temporada, pilotoId: string): CartaPiloto | null {
  const carta = cartaDeTemporada(t, pilotoId);
  if (!carta || t.tipo !== "agregada" || carta.rating !== null) return carta;
  const ultimo = [...liga.splits].reverse().find(s => s.pilotos[pilotoId]?.rating != null);
  const rating = ultimo?.pilotos[pilotoId].rating ?? null;
  const carta2 = ultimo ? cartaDeTemporada(ultimo, pilotoId) : null;
  return rating === null ? carta : { ...carta, rating, nivel: carta2?.nivel ?? null };
}

/** Pilotos agrupados por escudería, en el orden de la clasificación de escuderías (los dúos y Origins, en un grupo). */
export function pilotosPorEscuderia(t: Temporada): Array<{ equipo: EquipoTemporada | null; pilotos: PilotoTemporada[] }> {
  const orden = clasificacionPilotos(t).map(f => f.fila);
  if (t.tipo === "individual") return [{ equipo: null, pilotos: orden }];
  return clasificacionEquipos(t).map(f => ({ equipo: f.fila, pilotos: orden.filter(p => p.equipoId === f.fila.equipoId) }))
    .filter(g => g.pilotos.length > 0);
}

const columnasDe = (t: Temporada): ColumnaGp[] => t.gps.map(g => ({
  circuitoId: g.circuitoId, numero: g.numero, nombre: g.nombre, grupo: g.splitNombre, pendiente: !g.disputada,
}));

// ─── ESTADO ──────────────────────────────────────────────────────────────────

/** Temporada elegida: la actual al principio; si desaparece de la liga, vuelve a la actual. */
export function useTemporadaElegida(liga: Liga) {
  const [id, setId] = useState<string | null>(null);
  const actual = liga.actual?.id ?? liga.temporadas[0]?.id ?? ID_HISTORICO;
  const valido = id !== null && (id === ID_HISTORICO ? Boolean(liga.origins && liga.temporada1) : liga.temporadas.some(t => t.id === id));
  return [valido ? id : actual, setId] as const;
}

// ─── PIEZAS ──────────────────────────────────────────────────────────────────

const TH = "px-3 py-2 text-left text-xs font-bold uppercase tracking-wide text-ink-muted";
const TD = "px-3 py-2.5 align-middle border-t border-line";
const PANEL = "overflow-x-auto rounded-lg border border-line bg-surface";
const TABLA = "w-full border-collapse text-sm";
const NUM = "text-right tabular-nums";
const TITULO = "text-xl font-bold uppercase tracking-tight";
const SUB = "mt-1 max-w-3xl text-sm text-ink-muted";

function Avatar({ nombre, fotoUrl }: { nombre: string; fotoUrl?: string }) {
  return <span className="grid size-8 shrink-0 place-items-center overflow-hidden rounded-full bg-surface-3 text-xs font-bold text-ink-2" aria-hidden="true">
    {fotoUrl ? <img src={fotoUrl} alt="" loading="lazy" className="size-full object-cover object-top" /> : nombre.slice(0, 1)}
  </span>;
}

function Posicion({ puesto }: { puesto: number }) {
  return <span className={`inline-grid size-7 place-items-center rounded-full font-bold ${puesto <= 3 ? "bg-brand text-brand-ink" : "text-ink-2"}`}>{puesto}</span>;
}

const Diferencia = ({ dif }: { dif: number }) => dif === 0 ? <>—</> : <>−{dif.toLocaleString("es-ES", { maximumFractionDigits: 2 })}</>;

function Aviso({ children }: { children: ReactNode }) {
  return <p role="status" className="rounded-lg border border-line bg-surface p-4 text-sm text-ink-muted">{children}</p>;
}

interface ContextoClasificacion {
  liga: Liga;
  t: Temporada;
  abrirCarta: (pilotoId: string) => void;
}

function BotonPiloto({ p, ctx }: { p: PilotoTemporada; ctx: ContextoClasificacion }) {
  return <button type="button" onClick={() => ctx.abrirCarta(p.pilotoId)} aria-label={`Abrir carta de ${p.nombre}`}
    className="flex min-h-11 items-center gap-2 text-left font-semibold text-ink hover:underline">
    <Avatar nombre={p.nombre} fotoUrl={p.fotoUrl} /><span>{p.nombre}</span>
  </button>;
}

function nombresEquipos(t: Temporada, p: PilotoTemporada): string {
  const ids = p.equipos.length ? p.equipos : p.equipoId ? [p.equipoId] : [];
  const nombres = ids.map(id => t.equipos.find(e => e.equipoId === id)?.nombre).filter((n): n is string => Boolean(n));
  return nombres.length ? nombres.join(" → ") : "Individual";
}

function TablaPilotos({ ctx, equipoId }: { ctx: ContextoClasificacion; equipoId: string }) {
  const { t } = ctx;
  const individual = t.tipo === "individual";
  const filas = clasificacionPilotos(t, equipoId === "todas" ? undefined : equipoId);
  const descuadres = Object.values(t.pilotos).filter(p => Math.abs(p.puntos - p.puntosResultados) > 0.001);
  return <>
    <div className={PANEL}><table className={TABLA}>
      <caption className="sr-only">Clasificación de pilotos · {t.nombre}</caption>
      <thead><tr><th scope="col" className={`${TH} w-16`}>Pos</th><th scope="col" className={TH}>Piloto</th>
        {!individual && <th scope="col" className={`${TH} hidden sm:table-cell`}>Escudería</th>}
        <th scope="col" className={`${TH} hidden text-right sm:table-cell`}>Dif.</th><th scope="col" className={`${TH} text-right`}>Pts</th></tr></thead>
      <tbody>{filas.map(({ puesto, diferencia, fila: p }) => <tr key={p.pilotoId}>
        <td className={TD}><Posicion puesto={puesto} /></td>
        <td className={TD}><BotonPiloto p={p} ctx={ctx} />
          {!individual && <span className="block text-xs text-ink-muted sm:hidden">{nombresEquipos(t, p)}</span>}</td>
        {!individual && <td className={`${TD} hidden text-ink-2 sm:table-cell`}>{nombresEquipos(t, p)}</td>}
        <td className={`${TD} ${NUM} hidden text-ink-muted sm:table-cell`}><Diferencia dif={diferencia} /></td>
        <td className={`${TD} ${NUM} font-bold`}>{p.puntos.toLocaleString("es-ES")}
          {puesto > 1 && <span className="block text-xs font-normal text-ink-muted sm:hidden"><Diferencia dif={diferencia} /></span>}</td>
      </tr>)}</tbody>
    </table></div>
    {descuadres.length > 0 && <p className="mt-2 text-xs text-ink-muted">
      Los puntos oficiales no coinciden con la suma de los resultados GP a GP en {descuadres.map(p => `${p.nombre} (${p.puntos} oficial, ${p.puntosResultados} en resultados)`).join(", ")}.
    </p>}
    <PuntosPorGp ctx={ctx} equipoId={equipoId} />
  </>;
}

function PuntosPorGp({ ctx, equipoId }: { ctx: ContextoClasificacion; equipoId: string }) {
  const { t } = ctx;
  const filas = puntosPilotosPorGp(t, equipoId === "todas" ? undefined : equipoId);
  const individual = t.tipo === "individual";
  return <figure className="mt-6 min-w-0">
    <figcaption className="mb-2 font-bold">Puntos por GP · {t.nombre}</figcaption>
    <div className={PANEL} role="region" aria-label={`Puntos por GP · ${t.nombre}. Desplaza para ver todos los GP`} tabIndex={0}>
      <table className={`${TABLA} min-w-max`}>
        <thead><tr><th scope="col" className={`${TH} sticky left-0 z-[1] bg-surface`}>Piloto</th>
          {t.gps.map(g => <th scope="col" key={g.circuitoId} className={`${TH} text-center ${g.disputada ? "" : "opacity-60"}`}>
            <span className="block text-ink">GP {g.numero}</span><span className="block font-normal normal-case">{g.nombre}</span></th>)}
          <th scope="col" className={`${TH} text-center`}>Total</th></tr></thead>
        <tbody>{filas.map(({ piloto, resultados }) => <tr key={piloto.pilotoId}>
          <th scope="row" className={`${TD} sticky left-0 z-[1] bg-surface text-left font-semibold`}>{piloto.nombre}</th>
          {t.gps.map((g, i) => {
            const r = resultados[i];
            return <td key={g.circuitoId} className={`${TD} text-center ${g.disputada ? "" : "bg-surface-2/60"}`}>
              {!g.disputada ? null : !r || r.estado === "no_corrio" ? <abbr title="No corrió" className="text-ink-muted no-underline">NC</abbr> : <>
                <strong>{r.puntos}</strong><small className="block text-xs text-ink-muted">{textoPuesto(r)}</small>
                {individual && marcasOrigins(r).length > 0 && <small className="block text-[10px] text-ink-muted">{marcasOrigins(r).join(" ")}</small>}
              </>}
            </td>;
          })}
          <td className={`${TD} text-center font-bold`}>{piloto.puntos.toLocaleString("es-ES")}</td>
        </tr>)}</tbody>
      </table>
    </div>
    <p className="mt-2 max-w-3xl text-xs text-ink-muted">{individual
      ? "Arriba los puntos de la carrera y abajo el puesto. En Origins el puesto se deduce de los puntos estándar (12 = P1, 10 = P2, 9 = P3… 2 = P10; con 1 punto acabó entre el 11.º y el 20.º). Marcas: PO pole, VR vuelta rápida, PD piloto del día, R racha."
      : "Arriba los puntos de esa carrera y abajo el puesto. NC: no corrió. Las columnas sombreadas están por disputar."}</p>
  </figure>;
}

function TablaEquipos({ ctx }: { ctx: ContextoClasificacion }) {
  const { t, liga } = ctx;
  const [alcance, setAlcance] = useState<"split" | "ano">("split");
  const filas = clasificacionEquipos(t);
  const puedeAno = t.tipo === "split" && liga.temporada1 !== null;
  const base = alcance === "ano" && puedeAno ? liga.temporada1! : t;
  const { columnas, series } = evolucionEquipos(base);
  const grafico: SerieGrafico[] = series.map(s => {
    const eq = base.equipos.find(e => e.equipoId === s.id)!;
    const marca = marcaEquipo(eq.nombre);
    return {
      id: s.id, nombre: s.nombre, color: marca.serie, dash: marca.dash, valores: s.acumulado,
      celdas: s.acumulado.map((acum, i) => acum === null ? <span key={i} className="text-ink-muted">—</span>
        : <><strong>{acum.toLocaleString("es-ES")}</strong><small>+{s.porGp[i]}</small></>),
    };
  });
  return <>
    <div className={PANEL}><table className={TABLA}>
      <caption className="sr-only">Clasificación de escuderías · {t.nombre}</caption>
      <thead><tr><th scope="col" className={`${TH} w-16`}>Pos</th><th scope="col" className={TH}>Escudería</th>
        <th scope="col" className={`${TH} hidden md:table-cell`}>Pilotos</th>
        <th scope="col" className={`${TH} hidden text-right sm:table-cell`}>Dif.</th><th scope="col" className={`${TH} text-right`}>Pts</th></tr></thead>
      <tbody>{filas.map(({ puesto, diferencia, fila: e }) => {
        const pilotos = [...e.pilotos].sort((a, b) => (e.porPiloto[b]?.puntos ?? 0) - (e.porPiloto[a]?.puntos ?? 0));
        const lista = pilotos.map(id => `${t.pilotos[id]?.nombre ?? id} ${e.porPiloto[id]?.puntos ?? 0}`).join(" · ");
        return <tr key={e.equipoId}>
          <td className={TD}><Posicion puesto={puesto} /></td>
          <td className={TD}><span className="flex items-center gap-2">
            {e.logoUrl && <img src={e.logoUrl} alt="" className="size-8 shrink-0 rounded-full border border-line bg-black object-cover" />}
            <strong>{e.nombre}</strong></span>
            <span className="mt-1 block text-xs text-ink-muted md:hidden">{lista}</span></td>
          <td className={`${TD} hidden text-ink-2 md:table-cell`}>{lista}</td>
          <td className={`${TD} ${NUM} hidden text-ink-muted sm:table-cell`}><Diferencia dif={diferencia} /></td>
          <td className={`${TD} ${NUM} font-bold`}>{e.puntos.toLocaleString("es-ES")}
            {puesto > 1 && <span className="block text-xs font-normal text-ink-muted sm:hidden"><Diferencia dif={diferencia} /></span>}</td>
        </tr>;
      })}</tbody>
    </table></div>
    {puedeAno && <div className="mt-4" role="group" aria-label="Alcance de la evolución">
      <ControlSegmentado<"split" | "ano"> etiqueta="Alcance de la evolución" valor={alcance} onCambiar={setAlcance}
        opciones={[{ valor: "split", etiqueta: `Solo ${t.nombre}` }, { valor: "ano", etiqueta: `${liga.temporada1!.nombre} completa` }]} />
    </div>}
    <Evolucion titulo={base.tipo === "agregada" ? `Puntos acumulados en la ${base.nombre}` : `Puntos acumulados por GP · ${base.nombre}`}
      columnas={columnas} series={grafico} unirGrupos={base.tipo === "agregada"} formato={n => `${n.toLocaleString("es-ES")} pts`}
      nota={base.tipo === "agregada"
        ? "Cada línea suma los puntos de toda la temporada. Las rayas verticales marcan el paso de un split a otro, donde cambian las plantillas."
        : "En cada GP: arriba el acumulado y abajo lo sumado en esa carrera. Las columnas rayadas están por disputar."} />
  </>;
}

function TablaDuos({ ctx }: { ctx: ContextoClasificacion }) {
  const { t } = ctx;
  const filas = clasificacionDuos(t);
  const columnas = columnasDe(t);
  const grafico: SerieGrafico[] = filas.map(({ fila: d }, i) => {
    let suma = 0;
    const acumulado = d.puntosPorGp.map(p => p === null ? null : (suma = Math.round((suma + p) * 100) / 100));
    return {
      id: d.id, nombre: d.nombre, color: SERIES_EXTRA[i % SERIES_EXTRA.length], dash: TRAZOS_EXTRA[i % TRAZOS_EXTRA.length], valores: acumulado,
      celdas: acumulado.map((acum, k) => acum === null ? <span key={k} className="text-ink-muted">—</span>
        : <><strong>{acum}</strong><small>+{d.puntosPorGp[k]}</small></>),
    };
  });
  if (filas.length === 0) return <Aviso>Esta temporada no tiene dúos registrados.</Aviso>;
  return <>
    <div className={PANEL}><table className={TABLA}>
      <caption className="sr-only">Clasificación de dúos · {t.nombre}</caption>
      <thead><tr><th scope="col" className={`${TH} w-16`}>Pos</th><th scope="col" className={TH}>Dúo</th>
        <th scope="col" className={`${TH} hidden text-right sm:table-cell`}>Dif.</th><th scope="col" className={`${TH} text-right`}>Pts</th></tr></thead>
      <tbody>{filas.map(({ puesto, diferencia, fila: d }) => <tr key={d.id}>
        <td className={TD}><Posicion puesto={puesto} /></td>
        <td className={TD}><span className="flex items-center gap-2">
          <span className="flex -space-x-2">{d.pilotoIds.map(id => <Avatar key={id} nombre={t.pilotos[id]?.nombre ?? id} fotoUrl={t.pilotos[id]?.fotoUrl} />)}</span>
          <strong>{d.nombre}</strong></span>
          <span className="mt-1 block text-xs text-ink-muted">{d.pilotoIds.map(id => `${t.pilotos[id]?.nombre ?? id} ${t.pilotos[id]?.puntos ?? 0}`).join(" · ")}</span></td>
        <td className={`${TD} ${NUM} hidden text-ink-muted sm:table-cell`}><Diferencia dif={diferencia} /></td>
        <td className={`${TD} ${NUM} font-bold`}>{d.puntos.toLocaleString("es-ES")}</td>
      </tr>)}</tbody>
    </table></div>
    <Evolucion titulo={`Puntos acumulados de cada dúo · ${t.nombre}`} columnas={columnas} series={grafico} cabeceraFilas="Dúo"
      formato={n => `${n.toLocaleString("es-ES")} pts`}
      nota="Los puntos del dúo son los de sus dos pilotos más los de rivalidad (1 por ganar la de clasificación y 3 por la de carrera), como en el Excel de Origins." />
  </>;
}

function TablaCarreras({ ctx }: { ctx: ContextoClasificacion }) {
  const { t } = ctx;
  const proxima = proximoGp(t);
  return <div className={PANEL}><table className={TABLA}>
    <caption className="sr-only">Carreras de {t.nombre}</caption>
    <thead><tr><th scope="col" className={TH}>GP</th><th scope="col" className={TH}>Gran Premio</th>
      <th scope="col" className={`${TH} hidden sm:table-cell`}>Fecha</th><th scope="col" className={TH}>Ganador</th></tr></thead>
    <tbody>{t.gps.map(g => {
      const ganadores = ganadoresGp(g);
      const fecha = fechaCorta(g.fecha);
      return <tr key={`${g.splitId}-${g.circuitoId}`}>
        <td className={`${TD} font-bold`}>GP {g.numero}</td>
        <td className={TD}><strong>{g.nombre}</strong><span className="block text-xs text-ink-muted sm:hidden">{fecha ?? (g.disputada ? "" : "Fecha por confirmar")}</span></td>
        <td className={`${TD} hidden text-ink-muted sm:table-cell`}>{fecha ?? (g.disputada ? "—" : "Fecha por confirmar")}</td>
        <td className={TD}>{!g.disputada
          ? <span className="rounded-full border border-line px-2 py-0.5 text-xs font-bold">{g === proxima ? "Próxima" : "Pendiente"}</span>
          : ganadores.length
            ? ganadores.map(id => <button type="button" key={id} onClick={() => ctx.abrirCarta(id)} className="min-h-11 pr-3 font-semibold hover:underline">{t.pilotos[id]?.nombre ?? id}</button>)
            : <span className="text-ink-muted">Sin registro</span>}</td>
      </tr>;
    })}</tbody>
  </table></div>;
}

function TablaHistorico({ liga }: { liga: Liga }) {
  const filas = useMemo(() => construirHistorico(liga), [liga]);
  const total = (liga.origins?.gps.filter(g => g.disputada).length ?? 0) + (liga.temporada1?.gps.filter(g => g.disputada).length ?? 0);
  return <>
    <div className={PANEL}><table className={TABLA}>
      <caption className="sr-only">Histórico de pilotos</caption>
      <thead><tr><th scope="col" className={`${TH} w-16`}>Pos</th><th scope="col" className={TH}>Piloto</th>
        <th scope="col" className={`${TH} hidden text-right sm:table-cell`}>{liga.origins?.nombre}</th>
        <th scope="col" className={`${TH} hidden text-right sm:table-cell`}>{liga.temporada1?.nombre}</th>
        <th scope="col" className={`${TH} text-right`}>Total</th></tr></thead>
      <tbody>{filas.map((f, i) => {
        const puesto = i > 0 && filas[i - 1].total === f.total ? 0 : i + 1;
        const mostrado = puesto || filas.findIndex(x => x.total === f.total) + 1;
        return <tr key={f.pilotoId}>
          <td className={TD}><Posicion puesto={mostrado} /></td>
          <td className={TD}><span className="flex items-center gap-2"><Avatar nombre={f.nombre} fotoUrl={f.fotoUrl} /><strong>{f.nombre}</strong></span>
            <span className="mt-1 block text-xs text-ink-muted sm:hidden">{liga.origins?.nombre} {f.origins ?? "—"} · {liga.temporada1?.nombre} {f.temporada1 ?? "—"}</span></td>
          <td className={`${TD} ${NUM} hidden sm:table-cell`}>{f.origins ?? "—"}</td>
          <td className={`${TD} ${NUM} hidden sm:table-cell`}>{f.temporada1 ?? "—"}</td>
          <td className={`${TD} ${NUM} font-bold`}>{f.total.toLocaleString("es-ES")}</td>
        </tr>;
      })}</tbody>
    </table></div>
    <p className="mt-2 text-xs text-ink-muted">{total} carreras disputadas entre {liga.origins?.nombre} y {liga.temporada1?.nombre}. Es la suma de los puntos de cada piloto en las dos temporadas; el histórico no tiene clasificación de escuderías porque Origins se corrió por dúos.</p>
  </>;
}

function TablaPalmares({ liga, onVer }: { liga: Liga; onVer: (id: string) => void }) {
  const filas = palmares(liga);
  return <>
    <div className={PANEL}><table className={TABLA}>
      <caption className="sr-only">Palmarés por temporada</caption>
      <thead><tr><th scope="col" className={TH}>Temporada</th><th scope="col" className={TH}>Campeón pilotos</th>
        <th scope="col" className={TH}>Campeón escuderías / dúos</th><th scope="col" className={`${TH} text-right`}>Carreras</th></tr></thead>
      <tbody>{filas.map(f => <tr key={f.temporadaId} className={f.temporadaId.startsWith("split") ? "bg-surface-2/40" : ""}>
        <th scope="row" className={`${TD} text-left`}><button type="button" onClick={() => onVer(f.temporadaId)} className="min-h-11 text-left font-bold hover:underline"
          aria-label={`Ver la clasificación de ${f.nombre}`}>{f.nombre}</button><span className="block text-xs font-normal text-ink-muted">{f.rango}</span></th>
        <td className={TD}>{f.campeonPilotos ?? "—"}{f.provisional && f.campeonPilotos && <small className="block text-xs text-ink-muted">Líder actual</small>}</td>
        <td className={TD}>{f.campeonEquipos ?? "—"}{f.provisional && f.campeonEquipos && <small className="block text-xs text-ink-muted">Líder actual</small>}</td>
        <td className={`${TD} ${NUM}`}>{f.carreras} GP</td>
      </tr>)}</tbody>
    </table></div>
    <p className="mt-2 text-xs text-ink-muted">Toca una temporada para ver su clasificación. Mientras una temporada sigue en curso se muestra quien va primero, no un campeón.</p>
  </>;
}

// ─── CLASIFICACIÓN ───────────────────────────────────────────────────────────

type Modo = "pilotos" | "equipos" | "carreras" | "palmares";
export interface ClasificacionProps {
  liga: Liga;
  temporadaId: string;
  onTemporada: (id: string) => void;
}

/** Selector de temporadas y sus vistas. La usan Campeonato y la pestaña Clasificación de la Portada. */
export function Clasificacion({ liga, temporadaId, onTemporada }: ClasificacionProps) {
  const [modo, setModo] = useState<Modo>("pilotos");
  const [equipoId, setEquipoId] = useState("todas");
  const [cartaId, setCartaId] = useState<string | null>(null);
  const historico = temporadaId === ID_HISTORICO;
  const t = historico ? null : temporadaPorId(liga, temporadaId);
  const grupos = useMemo(() => gruposTemporadas(liga), [liga]);
  const individual = t?.tipo === "individual";

  // El filtro de escudería de una temporada no vale en otra.
  useEffect(() => { setEquipoId("todas"); setCartaId(null); }, [temporadaId]);
  // El histórico solo tiene pilotos y palmarés.
  const modoEfectivo: Modo = historico && (modo === "equipos" || modo === "carreras") ? "pilotos" : modo;

  const ctx: ContextoClasificacion | null = t ? { liga, t, abrirCarta: setCartaId } : null;
  const carta = t && cartaId ? cartaEnTemporada(liga, t, cartaId) : null;
  const equipoCarta = carta && t ? t.equipos.find(e => e.equipoId === carta.equipoId) : undefined;
  const mayus = (t?.nombre ?? "Histórico").toUpperCase();
  const encabezado: Record<Modo, string> = {
    pilotos: `Pilotos · ${mayus}`, equipos: `${individual ? "Dúos" : "Escuderías"} · ${mayus}`,
    carreras: `Carreras · ${mayus}`, palmares: "Palmarés de la liga",
  };
  const subtitulo = historico
    ? "Los puntos de cada piloto en Origins y en la Temporada 1 sumados."
    : individual ? "Temporada previa a la Temporada 1, corrida por dúos: dos pilotos sumaban juntos. Sin escuderías ni economía."
      : t ? `${t.tipo === "agregada" ? "Splits sumados · " : ""}${rangoGp(t)} de la ${liga.temporada1?.nombre ?? "temporada"}${t.enCurso ? " · en curso" : " · cerrado"}` : "";

  return <div className="space-y-4">
    <TemporadasRail grupos={grupos} seleccion={temporadaId} onSeleccionar={onTemporada} />
    <ControlSegmentado<Modo> etiqueta="Vistas de la clasificación" valor={modoEfectivo} onCambiar={setModo} opciones={[
      { valor: "pilotos", etiqueta: "Pilotos" },
      { valor: "equipos", etiqueta: individual ? "Dúos" : "Escuderías", deshabilitada: historico },
      { valor: "carreras", etiqueta: "Carreras", deshabilitada: historico },
      { valor: "palmares", etiqueta: "Palmarés" },
    ]} />
    <div><h2 className={TITULO}>{encabezado[modoEfectivo]}</h2>{modoEfectivo !== "palmares" && subtitulo && <p className={SUB}>{subtitulo}</p>}</div>
    {modoEfectivo === "pilotos" && t && !individual && <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar por escudería">
      <button type="button" className="pill-filter" aria-pressed={equipoId === "todas"} onClick={() => setEquipoId("todas")}>Todas las escuderías</button>
      {t.equipos.map(e => <button type="button" key={e.equipoId} className="pill-filter" aria-pressed={equipoId === e.equipoId} onClick={() => setEquipoId(e.equipoId)}>{e.nombre}</button>)}
    </div>}
    {modoEfectivo === "palmares" ? <TablaPalmares liga={liga} onVer={id => { onTemporada(id); setModo("pilotos"); }} />
      : historico ? <TablaHistorico liga={liga} />
        : !ctx ? <Aviso>No hay datos de esta temporada.</Aviso>
          : modoEfectivo === "pilotos" ? <TablaPilotos ctx={ctx} equipoId={equipoId} />
            : modoEfectivo === "equipos" ? (individual ? <TablaDuos ctx={ctx} /> : <TablaEquipos ctx={ctx} />)
              : <TablaCarreras ctx={ctx} />}
    {carta && <CartaPilotoModal piloto={carta} abierto onCerrar={() => setCartaId(null)}
      apariencia={marcaEquipo(equipoCarta?.nombre ?? "", equipoCarta?.logoUrl)} />}
  </div>;
}

// ─── CARTAS Y CARA A CARA ────────────────────────────────────────────────────

const SELECT = "min-h-11 rounded-lg border border-line bg-surface px-3 text-sm text-ink";

function CartasYComparador({ liga, t }: { liga: Liga; t: Temporada }) {
  const [abierta, setAbierta] = useState<string | null>(null);
  const grupos = useMemo(() => pilotosPorEscuderia(t), [t]);
  const todos = useMemo(() => grupos.flatMap(g => g.pilotos), [grupos]);
  const [a, setA] = useState<string | null>(null);
  const [b, setB] = useState<string | null>(null);
  const idA = a && t.pilotos[a] ? a : todos[0]?.pilotoId ?? null;
  const idB = b && t.pilotos[b] ? b : (todos.find(p => p.pilotoId !== idA) ?? todos[0])?.pilotoId ?? null;
  const cartaA = idA ? cartaEnTemporada(liga, t, idA) : null;
  const cartaB = idB ? cartaEnTemporada(liga, t, idB) : null;
  const abierto = abierta ? cartaEnTemporada(liga, t, abierta) : null;
  const apariencia = (equipoId: string | null) => {
    const e = t.equipos.find(x => x.equipoId === equipoId);
    return marcaEquipo(e?.nombre ?? "", e?.logoUrl);
  };
  if (todos.length === 0) return <Aviso>Esta temporada no tiene pilotos.</Aviso>;
  const nombreEquipo = (c: CartaPiloto | null) => c?.equipoNombre ? ` (${c.equipoNombre})` : "";
  return <div className="space-y-8">
    <section aria-labelledby="cartas-titulo">
      <h2 id="cartas-titulo" className={TITULO}>Pilotos · {t.nombre}</h2>
      <p className={SUB}>Ordenados por escudería. Toca una carta para abrirla y girarla.</p>
      <div className="mt-4 space-y-6">{grupos.map(g => <div key={g.equipo?.equipoId ?? "individual"}>
        {g.equipo && <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-ink-muted">{g.equipo.nombre}</h3>}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">{g.pilotos.map(p => {
          const c = cartaEnTemporada(liga, t, p.pilotoId);
          return c && <TarjetaPiloto key={p.pilotoId} piloto={c} apariencia={apariencia(p.equipoId)} onAbrir={() => setAbierta(p.pilotoId)} />;
        })}</div>
      </div>)}</div>
    </section>
    <section aria-labelledby="duelo-titulo">
      <h2 id="duelo-titulo" className={TITULO}>Cara a cara</h2>
      <div className="mt-3 flex flex-wrap gap-2">
        <label className="flex flex-col gap-1 text-xs font-bold uppercase text-ink-muted">Piloto A
          <select className={SELECT} value={idA ?? ""} onChange={e => setA(e.target.value)}>{todos.map(p => <option key={p.pilotoId} value={p.pilotoId}>{p.nombre}</option>)}</select></label>
        <label className="flex flex-col gap-1 text-xs font-bold uppercase text-ink-muted">Piloto B
          <select className={SELECT} value={idB ?? ""} onChange={e => setB(e.target.value)}>{todos.map(p => <option key={p.pilotoId} value={p.pilotoId}>{p.nombre}</option>)}</select></label>
      </div>
      {cartaA && cartaB && <div className={`${PANEL} mt-4`}><table className={TABLA}>
        <caption className="sr-only">Cara a cara de {cartaA.nombre} y {cartaB.nombre} · {t.nombre}</caption>
        <thead><tr><th scope="col" className={TH}>{cartaA.nombre}{nombreEquipo(cartaA)}</th><th scope="col" className={`${TH} text-center`}>Estadística</th>
          <th scope="col" className={`${TH} text-right`}>{cartaB.nombre}{nombreEquipo(cartaB)}</th></tr></thead>
        <tbody>{caraACara(cartaA, cartaB).map(f => <tr key={f.etiqueta}>
          <td className={`${TD} ${f.mejor === "a" ? "font-bold text-ok" : ""}`}>{f.a}</td>
          <td className={`${TD} text-center text-ink-muted`}>{f.etiqueta}</td>
          <td className={`${TD} text-right ${f.mejor === "b" ? "font-bold text-ok" : ""}`}>{f.b}</td>
        </tr>)}</tbody>
      </table></div>}
      <p className="mt-2 text-xs text-ink-muted">En verde, el mejor de los dos. Las estadísticas se cuentan solo con puestos registrados; sin registro aparece «—».</p>
    </section>
    {abierto && <CartaPilotoModal piloto={abierto} apariencia={apariencia(abierto.equipoId)} abierto onCerrar={() => setAbierta(null)} />}
  </div>;
}

// ─── PANTALLA ────────────────────────────────────────────────────────────────

type Vista = "clasificacion" | "pilotos";

export function Campeonato() {
  const { liga, loading, error, retry } = useLiga();
  const [temporadaId, setTemporadaId] = useTemporadaElegida(liga);
  const [vista, setVista] = useState<Vista>("clasificacion");
  const t = temporadaId === ID_HISTORICO ? null : temporadaPorId(liga, temporadaId);

  if (loading && liga.temporadas.length === 0) return <div role="status" className="p-6 text-ink-muted">Cargando el campeonato…</div>;
  if (error && liga.temporadas.length === 0) return <div role="alert" className="space-y-3 p-6">
    <p>No se ha podido cargar el campeonato.</p><button type="button" className="nui-button" onClick={retry}>Reintentar</button></div>;
  if (liga.temporadas.length === 0) return <Aviso>Todavía no hay temporadas con calendario.</Aviso>;

  const vistaEfectiva: Vista = t ? vista : "clasificacion";
  return <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6">
    <header><span className="nui-eyebrow">Campeonato</span><h1 className="text-3xl font-bold uppercase tracking-tight">Clasificación y pilotos</h1></header>
    <ControlSegmentado<Vista> etiqueta="Secciones del campeonato" valor={vistaEfectiva} onCambiar={setVista} opciones={[
      { valor: "clasificacion", etiqueta: "Clasificación" },
      { valor: "pilotos", etiqueta: "Cartas y cara a cara", deshabilitada: !t },
    ]} />
    {vistaEfectiva === "pilotos" && t
      ? <>
        <TemporadasRail grupos={gruposTemporadas(liga)} seleccion={temporadaId} onSeleccionar={setTemporadaId} />
        <CartasYComparador liga={liga} t={t} />
      </>
      : <Clasificacion liga={liga} temporadaId={temporadaId} onTemporada={setTemporadaId} />}
  </div>;
}

export default Campeonato;
