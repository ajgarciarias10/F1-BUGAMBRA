// Pantalla Portada (ticket 16): la entrada pública de la liga. Hero con el próximo GP y pestañas;
// la Clasificación es la misma de Campeonato. Solo lectura: todo sale de `useLiga()`.
import { lazy, Suspense, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { useAuth } from "../../contexts/AuthContext";
import { useLiga } from "../datos/useLiga";
import { clasificacionEquipos, clasificacionPilotos } from "../datos/temporadas";
import type { GpTemporada, Temporada } from "../datos/tipos";
import { rutaDe } from "../shell/secciones";
import { Clasificacion, proximoGp, useTemporadaElegida } from "./Campeonato";

const Carreras = lazy(() => import("./Carreras"));
const TeamsView = lazy(() => import("../../components/TeamsView").then(m => ({ default: m.TeamsView })));
const FomLive = lazy(() => import("../../components/FomLive").then(m => ({ default: m.FomLive })));

export const PESTANAS = [
  { id: "clasificacion", etiqueta: "Clasificación" },
  { id: "equipos", etiqueta: "Equipos" },
  { id: "resultados", etiqueta: "Resultados" },
  { id: "tv", etiqueta: "TV" },
] as const;
export type PestanaPortada = (typeof PESTANAS)[number]["id"];

/** La pestaña pedida en `?tab=`; cualquier otra cosa es Clasificación. */
export function pestanaDe(valor: string | null): PestanaPortada {
  return PESTANAS.find(p => p.id === valor)?.id ?? "clasificacion";
}

const lista = (nombres: string[]) => nombres.length > 1 ? `${nombres.slice(0, -1).join(", ")} y ${nombres[nombres.length - 1]}` : nombres[0] ?? "";
const puntos = (n: number) => n.toLocaleString("es-ES", { maximumFractionDigits: 2 });

/** Frase del hero: quién lidera y por cuánto, tras qué carreras. Solo con datos disputados. */
export function resumenLiderazgo(t: Temporada): string {
  const jugadas = t.gps.filter(g => g.disputada).map(g => g.nombre);
  if (jugadas.length === 0) return "Aún no se ha disputado ninguna carrera.";
  const pilotos = clasificacionPilotos(t);
  const pilotosTxt = pilotos.length > 1 && pilotos[0].fila.puntos > 0
    ? ` En pilotos manda ${pilotos[0].fila.nombre} con ${puntos(pilotos[0].fila.puntos)}, seguido de ${pilotos[1].fila.nombre} (${puntos(pilotos[1].fila.puntos)}).` : "";
  const equipos = t.tipo === "individual" ? [] : clasificacionEquipos(t);
  if (equipos.length > 1) {
    const [primero, segundo] = equipos;
    const ventaja = primero.fila.puntos - segundo.fila.puntos;
    const cabeza = ventaja === 0
      ? `${primero.fila.nombre} y ${segundo.fila.nombre} empatan a ${puntos(primero.fila.puntos)} puntos`
      : `${primero.fila.nombre} lidera con ${puntos(primero.fila.puntos)} puntos, ${puntos(ventaja)} más que ${segundo.fila.nombre}`;
    return `${cabeza}, tras ${lista(jugadas)}.${pilotosTxt}`;
  }
  return `Tras ${lista(jugadas)}.${pilotosTxt}`.trim();
}

export function tituloHero(t: Temporada, proximo: GpTemporada | null): string {
  const nombre = t.nombre.toUpperCase();
  if (proximo) return `${nombre} · RUMBO A ${proximo.nombre.toUpperCase()}`;
  return t.enCurso ? `${nombre} · EN CURSO` : `${nombre} · TEMPORADA CERRADA`;
}

export interface FechaGp {
  /** «sábado, 25 de octubre» o «Fecha por confirmar». */
  texto: string;
  hora: string | null;
  /** Instante de la carrera; null si la liga no ha fijado fecha. */
  objetivo: number | null;
}

/** Fecha real del GP, o «Fecha por confirmar» si no hay. La hora ausente cuenta como las 00:00 para la cuenta atrás. */
export function fechaDeGp(g: Pick<GpTemporada, "fecha" | "hora">): FechaGp {
  const sinFecha = { texto: "Fecha por confirmar", hora: null, objetivo: null };
  if (!g.fecha) return sinFecha;
  const dia = new Date(`${g.fecha}T12:00:00`);
  const objetivo = new Date(`${g.fecha}T${g.hora || "00:00"}:00`).getTime();
  if (Number.isNaN(dia.getTime()) || Number.isNaN(objetivo)) return sinFecha;
  return {
    texto: new Intl.DateTimeFormat("es-ES", { weekday: "long", day: "numeric", month: "long" }).format(dia),
    hora: g.hora || null, objetivo,
  };
}

export interface CuentaAtras { dias: number; horas: number; minutos: number; segundos: number }

/** Lo que falta hasta `objetivo`; null si ya ha llegado. */
export function cuentaAtras(objetivo: number, ahora: number): CuentaAtras | null {
  const resto = objetivo - ahora;
  if (!Number.isFinite(resto) || resto <= 0) return null;
  return {
    dias: Math.floor(resto / 86400000), horas: Math.floor(resto % 86400000 / 3600000),
    minutos: Math.floor(resto % 3600000 / 60000), segundos: Math.floor(resto % 60000 / 1000),
  };
}

function Reloj({ objetivo }: { objetivo: number }) {
  const [ahora, setAhora] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setAhora(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);
  const resto = cuentaAtras(objetivo, ahora);
  if (!resto) return <p className="mt-4 text-sm text-ink-muted">La carrera ya ha empezado o ha terminado. Los resultados llegan cuando la liga los cierra.</p>;
  const cajas: Array<[string, number]> = [["Días", resto.dias], ["Horas", resto.horas], ["Min", resto.minutos], ["Seg", resto.segundos]];
  return <div className="mt-4 grid grid-cols-4 gap-2" role="timer" aria-label="Cuenta atrás para la carrera">
    {cajas.map(([etiqueta, n]) => <div key={etiqueta} className="rounded-lg border border-line bg-surface-2 p-2 text-center">
      <span className="block text-2xl font-bold tabular-nums">{String(n).padStart(2, "0")}</span>
      <span className="block text-xs uppercase text-ink-muted">{etiqueta}</span>
    </div>)}
  </div>;
}

function ProximoGp({ t, gp }: { t: Temporada; gp: GpTemporada }) {
  const fecha = fechaDeGp(gp);
  return <aside className="rounded-lg border border-line bg-surface p-5" aria-label="Próximo gran premio">
    <div className="flex items-center justify-between gap-2">
      <span className="text-xs font-extrabold uppercase text-warn">Próximo evento · GP {gp.numero}</span>
      <span className="rounded-full border border-line px-2 py-0.5 text-xs font-bold">Carrera {gp.enSplit} de {gp.splitTotal}</span>
    </div>
    <p className="mt-2 text-xl font-black uppercase">GP de {gp.nombre}</p>
    <p className="mt-1 text-sm text-ink-muted">{fecha.texto}{fecha.hora ? ` · ${fecha.hora}` : ""} · {t.nombre}</p>
    {fecha.objetivo === null
      ? <p className="mt-4 text-sm text-ink-muted">La liga aún no ha fijado fecha. Se anunciará por WhatsApp.</p>
      : <Reloj objetivo={fecha.objetivo} />}
  </aside>;
}

function EquiposPublicos() {
  const { liga, splits } = useLiga();
  const [splitId, setSplitId] = useState<string | null>(null);
  const split = splits.find(s => s.id === splitId) ?? splits.find(s => s.id === liga.actual?.id) ?? splits[0];
  if (!split) return <p>No hay escuderías publicadas.</p>;
  // La misma vista pública existente: las fichas no muestran precios privados.
  return <TeamsView validSplits={splits} currentSplitId={split.id} onSelectSplit={setSplitId} currentSplit={split}
    getPilotPhoto={id => split.roster.find(p => p.pilotoId === id)?.foto_url ?? ""} />;
}

export function Portada() {
  const { liga, loading, error, retry } = useLiga();
  const { user, userData } = useAuth();
  const [params, setParams] = useSearchParams();
  const pestana = pestanaDe(params.get("tab"));
  const [temporadaId, setTemporadaId] = useTemporadaElegida(liga);
  const t = liga.actual;
  const conSesion = Boolean(user && userData);

  if (loading && !t) return <div role="status" className="p-6 text-ink-muted">Cargando la liga…</div>;
  if (error && !t) return <div role="alert" className="space-y-3 p-6">
    <p>No se ha podido cargar la liga.</p><button type="button" className="nui-button" onClick={retry}>Reintentar</button></div>;
  if (!t) return <p role="status" className="p-6 text-ink-muted">Todavía no hay temporadas con calendario.</p>;

  const proximo = proximoGp(t);
  const estado = t.enCurso ? "En curso" : "Cerrada";
  return <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6">
    <section className="grid gap-6 lg:grid-cols-[1.4fr_1fr] lg:items-start" aria-labelledby="portada-titulo">
      <div>
        <div className="flex flex-wrap gap-2 text-xs font-bold uppercase">
          <span className="rounded-full border border-line px-2 py-0.5">En portada · {t.nombre}</span>
          <span className="rounded-full border border-line px-2 py-0.5">{estado}</span>
        </div>
        <h1 id="portada-titulo" className="mt-3 text-3xl font-black uppercase leading-tight sm:text-4xl">{tituloHero(t, proximo)}</h1>
        <p className="mt-3 max-w-2xl text-ink-2">{resumenLiderazgo(t)}</p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link to={conSesion ? rutaDe("inicio") : rutaDe("entrar")} className="nui-button nui-button--primary inline-flex items-center justify-center no-underline">
            {conSesion ? "Ir a mi liga" : "Entrar a la liga"}</Link>
          <button type="button" className="nui-button" onClick={() => setParams({ tab: "resultados" })}>Ver resultados</button>
        </div>
      </div>
      {proximo && <ProximoGp t={t} gp={proximo} />}
    </section>

    <div role="tablist" aria-label="Secciones de la portada" className="flex gap-1 overflow-x-auto border-b border-line">
      {PESTANAS.map(p => <button type="button" role="tab" key={p.id} id={`portada-tab-${p.id}`} aria-selected={pestana === p.id}
        aria-controls="portada-panel" onClick={() => setParams({ tab: p.id })}
        className={`min-h-11 shrink-0 border-b-2 px-4 text-sm font-bold ${pestana === p.id ? "border-brand text-ink" : "border-transparent text-ink-muted hover:text-ink"}`}>{p.etiqueta}</button>)}
    </div>

    <div id="portada-panel" role="tabpanel" aria-labelledby={`portada-tab-${pestana}`}>
      <Suspense fallback={<p role="status">Cargando sección…</p>}>
        {pestana === "clasificacion" && <Clasificacion liga={liga} temporadaId={temporadaId} onTemporada={setTemporadaId} />}
        {pestana === "equipos" && <EquiposPublicos />}
        {pestana === "resultados" && <Carreras />}
        {pestana === "tv" && <FomLive />}
      </Suspense>
    </div>
  </div>;
}

export default Portada;
