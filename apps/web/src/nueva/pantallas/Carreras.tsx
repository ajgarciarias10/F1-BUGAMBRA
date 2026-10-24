// Carreras (ticket 18): calendario por split y detalle de cada GP (podio, acta publicada, decisiones
// FIA y vídeo de la vuelta rápida). Solo lectura: todo sale de `useLiga()` y de los servicios que ya
// existen; aquí no se escribe nada ni se vota (el piloto del día está fuera, decisiones.md).
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { fastestLapVideoOf } from "../../services/readModels";
import type { Circuito, SplitView } from "../../types";
import { useLiga } from "../datos/useLiga";
import type { EstadoResultado, GpTemporada, ResultadoGp, Temporada } from "../datos/tipos";
import { ControlSegmentado } from "../ui/ControlSegmentado";
import { Kpi } from "../ui/Kpi";
import { TablaAdmin } from "../ui/TablaAdmin";
import { TarjetaVideo } from "../ui/TarjetaVideo";

// ─── Modelo puro ─────────────────────────────────────────────────────────────

export type EstadoCalendario = "disputada" | "proxima" | "pendiente";

/** El acta solo se enseña cuando el GP está disputado y el admin la ha cerrado. */
export const actaPublicada = (gp: Pick<GpTemporada, "disputada" | "actaCerrada">): boolean => gp.disputada && gp.actaCerrada;

/** Disputadas, la primera por disputar como «próxima» y el resto pendientes. */
export function estadosCalendario(t: Temporada): Map<string, EstadoCalendario> {
  let proxima = false;
  return new Map(t.gps.map(g => {
    if (g.disputada) return [g.circuitoId, "disputada"] as const;
    if (!proxima) { proxima = true; return [g.circuitoId, "proxima"] as const; }
    return [g.circuitoId, "pendiente"] as const;
  }));
}

export interface FilaActa {
  pilotoId: string;
  nombre: string;
  equipoNombre: string | null;
  estado: EstadoResultado;
  /** Solo con puesto registrado (o deducido en Origins); null en el resto. */
  puesto: number | null;
  /** «P3», «DNF», «No corrió», «Posición desconocida» o «P11–P20»: cada estado con su texto. */
  etiqueta: string;
  qualy: number | null;
  /** Los puntos guardados; «—» si el piloto no corrió. */
  puntos: string;
  vueltaRapida: boolean;
}

const ORDEN_ESTADO: Record<EstadoResultado, number> = { clasificado: 0, rango_11_20: 1, desconocida: 2, dnf: 3, no_corrio: 4 };

function etiquetaDe(r: ResultadoGp): string {
  switch (r.estado) {
    case "clasificado": return r.puesto === null ? "Posición desconocida" : `P${r.puesto}`;
    case "rango_11_20": return "P11–P20";
    case "dnf": return "DNF";
    case "no_corrio": return "No corrió";
    default: return "Posición desconocida";
  }
}

const numeroPuntos = (n: number) => String(Math.round(n * 100) / 100).replace(".", ",");

/** Acta de un GP: clasificados por puesto y, después, desconocida, DNF y no corrió, sin mezclarlos. */
export function filasActa(t: Temporada, gp: GpTemporada): FilaActa[] {
  const equipos = new Map(t.equipos.map(e => [e.equipoId, e.nombre]));
  return Object.values(gp.resultados).map(r => ({
    pilotoId: r.pilotoId,
    nombre: t.pilotos[r.pilotoId]?.nombre ?? r.pilotoId,
    equipoNombre: r.equipoId ? equipos.get(r.equipoId) ?? null : null,
    estado: r.estado,
    puesto: r.estado === "clasificado" ? r.puesto : null,
    etiqueta: etiquetaDe(r),
    qualy: r.qualy,
    puntos: r.estado === "no_corrio" ? "—" : numeroPuntos(r.puntos),
    vueltaRapida: r.vueltaRapida,
  })).sort((a, b) => ORDEN_ESTADO[a.estado] - ORDEN_ESTADO[b.estado]
    || (a.puesto ?? 0) - (b.puesto ?? 0) || a.nombre.localeCompare(b.nombre, "es"));
}

/** Los tres primeros con puesto registrado; nunca se deducen de los puntos ni se enseñan sin acta publicada. */
export function podioDelGp(t: Temporada, gp: GpTemporada): FilaActa[] {
  if (!actaPublicada(gp)) return [];
  return filasActa(t, gp).filter(f => f.puesto !== null && f.puesto <= 3);
}

export interface TarjetaCalendario {
  circuitoId: string;
  numero: number;
  nombre: string;
  fecha: string;
  estado: EstadoCalendario;
  podio: FilaActa[];
}

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

/** «18 oct 2026 · 21:00», o «Fecha por confirmar». */
export function fechaGp(gp: Pick<GpTemporada, "fecha" | "hora">): string {
  const m = gp.fecha?.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return "Fecha por confirmar";
  return `${Number(m[3])} ${MESES[Number(m[2]) - 1]} ${m[1]}${gp.hora ? ` · ${gp.hora}` : ""}`;
}

export function tarjetasCalendario(t: Temporada): TarjetaCalendario[] {
  const estados = estadosCalendario(t);
  return t.gps.map(g => ({
    circuitoId: g.circuitoId, numero: g.numero, nombre: g.nombre, fecha: fechaGp(g),
    estado: estados.get(g.circuitoId)!, podio: podioDelGp(t, g),
  }));
}

export interface DecisionVista {
  id: string;
  afectado: string;
  tipo: string;
  efecto: string | null;
  motivo: string;
  multaAprobada: boolean;
}

/** Decisiones FIA tal como las registró el admin; sin circuito guardado no hay ninguna. */
export function decisionesDelGp(t: Temporada, circuito: Pick<Circuito, "decisiones_fia"> | undefined): DecisionVista[] {
  const equipos = new Map(t.equipos.map(e => [e.equipoId, e.nombre]));
  return (circuito?.decisiones_fia ?? []).map(d => ({
    id: d.id,
    afectado: [d.pilotoId ? t.pilotos[d.pilotoId]?.nombre ?? d.pilotoId : null, d.equipoId ? equipos.get(d.equipoId) ?? d.equipoId : null]
      .filter(Boolean).join(" · ") || "Sin afectado indicado",
    tipo: d.tipo,
    efecto: d.efecto_deportivo ?? null,
    motivo: d.motivo,
    multaAprobada: !!d.transaccionId,
  }));
}

export interface VideoVista {
  estado: "publicado" | "pendiente";
  miniatura: string | null;
  /** null hasta que se pulsa Play: el iframe no existe antes. */
  embedUrl: string | null;
}

export function reproductorVideo(circuito: Pick<Circuito, "hotlap_url">, reproduciendo: boolean): VideoVista {
  const v = fastestLapVideoOf(circuito);
  return {
    estado: v.status === "available" ? "publicado" : "pendiente",
    miniatura: v.thumbnailUrl,
    embedUrl: reproduciendo && v.status === "available" ? v.embedUrl : null,
  };
}

/** GP que se abre al entrar: el último con acta publicada o, si no hay, la próxima. */
export function gpInicial(t: Temporada): string | null {
  const publicados = t.gps.filter(actaPublicada);
  if (publicados.length) return publicados[publicados.length - 1].circuitoId;
  const estados = estadosCalendario(t);
  return t.gps.find(g => estados.get(g.circuitoId) === "proxima")?.circuitoId ?? t.gps[0]?.circuitoId ?? null;
}

// ─── Pantalla ────────────────────────────────────────────────────────────────

const TEXTO_ESTADO: Record<EstadoCalendario, string> = { disputada: "Disputada", proxima: "Próxima", pendiente: "Pendiente" };
const pildora = (resaltada: boolean): CSSProperties => ({
  display: "inline-block", padding: "2px 10px", borderRadius: "var(--radius-pill)", fontSize: "var(--fs-xs)", fontWeight: 700,
  border: "1px solid var(--border-color)", background: resaltada ? "var(--accent-f1)" : "var(--bg-elevated)",
  color: resaltada ? "#fff" : "var(--text-muted)",
});
const gridCalendario: CSSProperties = { display: "grid", gap: "var(--sp-3)", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 240px), 1fr))" };
const silencio: CSSProperties = { color: "var(--text-muted)", fontSize: "var(--fs-sm)" };

function VideoVueltaRapida({ circuito, nombre }: { circuito: Circuito | undefined; nombre: string }) {
  const [reproduciendo, setReproduciendo] = useState(false);
  useEffect(() => { setReproduciendo(false); }, [circuito?.id]);
  const video = reproductorVideo(circuito ?? {}, reproduciendo);
  if (video.estado === "pendiente") {
    return <p style={silencio}>Vídeo de la vuelta rápida pendiente de publicación: el administrador lo sube cuando lo tiene.</p>;
  }
  return <div style={{ maxWidth: 560 }}>
    <TarjetaVideo titulo={`Vuelta rápida · GP de ${nombre}`} miniatura={video.miniatura ?? undefined} duracion="VR" tipo="Vuelta rápida" autor="Liga"
      detalle="El vídeo se carga al pulsar Play." abierto={reproduciendo} onAlternar={() => setReproduciendo(v => !v)}
      reproductor={video.embedUrl && <iframe src={video.embedUrl} title={`Vuelta rápida · GP de ${nombre}`} allowFullScreen
        allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture" />} />
  </div>;
}

function DetalleGp({ t, gp, circuito }: { t: Temporada; gp: GpTemporada; circuito: Circuito | undefined }) {
  const publicada = actaPublicada(gp);
  const filas = useMemo(() => filasActa(t, gp), [t, gp]);
  const podio = podioDelGp(t, gp);
  const decisiones = decisionesDelGp(t, circuito);
  const vr = filas.filter(f => f.vueltaRapida).map(f => f.nombre);
  return <section aria-labelledby="carreras-detalle" style={{ display: "grid", gap: "var(--sp-4)" }}>
    <header>
      <span className="nui-eyebrow">GP {gp.numero} · {gp.splitNombre}</span>
      <h2 id="carreras-detalle" style={{ fontSize: "var(--fs-lg)", fontWeight: 700 }}>GP de {gp.nombre}</h2>
      <p style={silencio}>{fechaGp(gp)} · {publicada ? "Acta publicada" : gp.disputada ? "Disputada, acta sin cerrar" : "Por disputar"}</p>
    </header>

    {publicada ? <>
      <div style={{ display: "grid", gap: "var(--sp-3)", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))" }}>
        {[1, 2, 3].map(p => {
          const f = podio.find(x => x.puesto === p);
          return <Kpi key={p} etiqueta={`${p}.º puesto`} valor={f ? f.nombre : "—"} detalle={f?.equipoNombre ?? "Sin registrar"} />;
        })}
      </div>
      <p style={silencio}>Vuelta rápida: {vr.length ? vr.join(", ") : "No registrada"}</p>

      <TablaAdmin titulo={`Acta del GP de ${gp.nombre}`} variante="acta"
        cabecera={<tr><th scope="col">Pos.</th><th scope="col">Piloto</th><th scope="col">Escudería</th><th scope="col">Clasif.</th><th scope="col">Pts</th></tr>}>
        {filas.map(f => <tr key={f.pilotoId}>
          <td><strong>{f.etiqueta}</strong></td>
          <th scope="row" className="sticky-col">{f.nombre}{f.vueltaRapida && <small>Vuelta rápida</small>}</th>
          <td>{f.equipoNombre ?? "—"}</td>
          <td>{f.qualy ?? "—"}</td>
          <td><strong>{f.puntos}</strong></td>
        </tr>)}
      </TablaAdmin>
      <p className="nui-note nui-muted">«—» significa dato no registrado. Cero puntos no implica retirada: solo el acta marca DNF o «No corrió».</p>
    </> : <p style={silencio}>
      {gp.disputada ? "El administrador todavía no ha cerrado el acta de esta carrera. Las posiciones y los puntos se verán cuando se publique."
        : "Los resultados y el acta se publicarán tras la carrera."}
    </p>}

    <div>
      <h3 style={{ fontWeight: 700, marginBottom: "var(--sp-2)" }}>Decisiones FIA</h3>
      {decisiones.length === 0 ? <p style={silencio}>No hay decisiones FIA registradas para esta carrera.</p> :
        <ul style={{ listStyle: "none", padding: 0, display: "grid", gap: "var(--sp-2)" }}>
          {decisiones.map(d => <li key={d.id} style={{ padding: "var(--sp-3)", borderRadius: "var(--radius-md)", background: "var(--bg-surface)", border: "1px solid var(--border-color)" }}>
            <strong>{d.afectado}</strong> <span style={pildora(false)}>{d.tipo}</span>{d.multaAprobada && <> <span style={pildora(false)}>Multa aprobada</span></>}
            {d.efecto && <p style={{ fontSize: "var(--fs-sm)" }}><span style={silencio}>Efecto: </span>{d.efecto}</p>}
            <p style={{ fontSize: "var(--fs-sm)" }}><span style={silencio}>Motivo: </span>{d.motivo}</p>
          </li>)}
        </ul>}
    </div>

    <div>
      <h3 style={{ fontWeight: 700, marginBottom: "var(--sp-2)" }}>Vídeo de la vuelta rápida</h3>
      <VideoVueltaRapida circuito={circuito} nombre={gp.nombre} />
    </div>
  </section>;
}

export function Carreras() {
  const { liga, splitPorId, loading, error, retry } = useLiga();
  const temporadas = useMemo(() => liga.temporadas.filter(t => t.tipo !== "agregada"), [liga]);
  const [temporadaId, setTemporadaId] = useState<string | null>(null);
  const [circuitoId, setCircuitoId] = useState<string | null>(null);
  const t = temporadas.find(x => x.id === temporadaId) ?? (liga.actual && temporadas.includes(liga.actual) ? liga.actual : temporadas[temporadas.length - 1]) ?? null;

  if (loading && !t) return <div role="status" className="ns-obra"><p>Cargando…</p></div>;
  if (!t) return <section className="ns-obra">
    <h1>Carreras</h1>
    <p>{error ? "No se ha podido cargar el calendario." : "Todavía no hay calendario."}</p>
    {error && <button type="button" className="nui-button" onClick={retry}>Reintentar</button>}
  </section>;

  const gp = t.gps.find(g => g.circuitoId === circuitoId) ?? t.gps.find(g => g.circuitoId === gpInicial(t)) ?? null;
  const vista: SplitView | undefined = gp ? splitPorId.get(gp.splitId) : undefined;
  const circuito = gp ? vista?.circuitos.find(c => c.id === gp.circuitoId) : undefined;
  const tarjetas = tarjetasCalendario(t);

  return <div style={{ display: "grid", gap: "var(--sp-5)" }}>
    <header>
      <span className="nui-eyebrow">Actas y FIA</span>
      <h1 style={{ fontSize: "var(--fs-xl)", fontWeight: 700, lineHeight: 1.1 }}>Carreras</h1>
    </header>
    <ControlSegmentado etiqueta="Temporada" valor={t.id} onCambiar={id => { setTemporadaId(id); setCircuitoId(null); }}
      opciones={temporadas.map(x => ({ valor: x.id, etiqueta: x.nombre }))} />
    <div style={gridCalendario} role="list" aria-label={`Calendario de ${t.nombre}`}>
      {tarjetas.map(c => {
        const activa = c.circuitoId === gp?.circuitoId;
        return <button key={c.circuitoId} type="button" role="listitem" aria-pressed={activa} onClick={() => setCircuitoId(c.circuitoId)}
          style={{ textAlign: "left", minHeight: 44, padding: "var(--sp-3)", borderRadius: "var(--radius-md)", color: "var(--text-main)", background: "var(--bg-surface)",
            border: `2px solid ${activa ? "var(--accent-f1)" : "var(--border-color)"}`, display: "grid", gap: 4 }}>
          <span className="nui-eyebrow">GP {c.numero}</span>
          <strong>{c.nombre}</strong>
          <span style={silencio}>{c.fecha}</span>
          <span><span style={pildora(c.estado === "proxima")}>{TEXTO_ESTADO[c.estado]}</span></span>
          {c.podio.length > 0 && <span style={{ fontSize: "var(--fs-xs)" }}>{c.podio.map(f => `${f.puesto}.º ${f.nombre}`).join(" · ")}</span>}
        </button>;
      })}
    </div>
    {gp && <DetalleGp t={t} gp={gp} circuito={circuito} />}
  </div>;
}

export default Carreras;
