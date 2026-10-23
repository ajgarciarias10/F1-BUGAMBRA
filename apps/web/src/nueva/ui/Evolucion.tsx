import { useEffect, useId, useRef, useState, type CSSProperties, type ReactNode } from "react";
import type { ColumnaGp } from "../datos/temporadas";
import type { SaldoGp } from "../datos/evolucion";
import { escalaEvolucion, etiquetaSaldo, tramosEvolucion } from "./evolucionModelo";

export interface SerieGrafico {
  id: string;
  nombre: string;
  color: string;
  dash?: string;
  valores: readonly (number | null)[];
  /** Contenido ya preparado por la pantalla, con un elemento por columna. */
  celdas?: readonly ReactNode[];
  saldos?: readonly SaldoGp[];
}
export interface FilaEvolucion { id: string; etiqueta: string; celdas: readonly ReactNode[] }
export interface EvolucionProps {
  titulo: string;
  columnas: readonly ColumnaGp[];
  series: readonly SerieGrafico[];
  filasExtra?: readonly FilaEvolucion[];
  cabeceraFilas?: string;
  nota?: ReactNode;
  desdeCero?: boolean;
  unirGrupos?: boolean;
  formato?: (valor: number) => string;
  formatoEje?: (valor: number) => string;
}
const numero = (valor: number) => valor.toLocaleString("es-ES", { maximumFractionDigits: 2 });

export function Evolucion({ titulo, columnas, series, filasExtra = [], cabeceraFilas = "Escudería", nota,
  desdeCero = true, unirGrupos = false, formato = numero, formatoEje = formato }: EvolucionProps) {
  const id = useId();
  const scroll = useRef<HTMLDivElement>(null);
  const [activa, setActiva] = useState<number | null>(null);
  const ultima = columnas.map(c => !c.pendiente).lastIndexOf(true);
  const identidad = columnas.map(c => `${c.grupo}:${c.circuitoId}`).join("|");
  useEffect(() => {
    setActiva(null);
    const el = scroll.current;
    if (!el || !window.matchMedia("(max-width: 720px)").matches) return;
    const celda = el.querySelector<HTMLElement>(`[data-columna="${ultima}"]`);
    if (!celda) return;
    el.scrollLeft = Math.max(0, celda.offsetLeft + 2 * celda.offsetWidth - el.clientWidth);
  }, [identidad, ultima]);
  const escala = escalaEvolucion(series.flatMap(s => columnas.map((c, i) => c.pendiente ? null : s.valores[i])), desdeCero);
  const grupos: Array<{ nombre: string; sub?: string; desde: number; hasta: number }> = [];
  columnas.forEach((c, i) => {
    const anterior = grupos.at(-1);
    if (anterior && anterior.nombre === c.grupo) anterior.hasta = i;
    else grupos.push({ nombre: c.grupo, sub: c.grupoSub, desde: i, hasta: i });
  });
  const claseColumna = (i: number) => `${columnas[i].pendiente ? " is-pendiente" : ""}${i > 0 && columnas[i].grupo !== columnas[i - 1].grupo ? " is-corte" : ""}`;
  const valorTexto = (s: SerieGrafico, i: number) => {
    if (columnas[i].pendiente) return "Pendiente";
    const valor = s.valores[i];
    return valor == null || !Number.isFinite(valor) ? "—" : formato(valor);
  };
  return <figure className="nui-evo" aria-labelledby={`${id}-titulo`}>
    <figcaption id={`${id}-titulo`}>{titulo}</figcaption>
    {columnas.length === 0 ? <p className="nui-muted">No hay grandes premios en esta temporada.</p> :
      <div className="nui-evo-scroll" ref={scroll} tabIndex={0} role="region" aria-label={`${titulo}. Desplaza para ver todos los GP`}>
        <div className="nui-evo-grid" style={{ "--evo-n": columnas.length } as CSSProperties}>
          <div className="nui-evo-sticky nui-evo-group-empty" />
          {grupos.map(g => <div key={g.desde} className="nui-evo-group" style={{ gridColumn: `${g.desde + 2} / ${g.hasta + 3}` }}>
            {g.nombre}<small>{g.sub}</small>
          </div>)}
          <div className="nui-evo-sticky nui-evo-axis" aria-hidden="true">
            {escala.ticks.map(t => <span key={t} style={{ top: `${escala.y(t)}%` }}>{formatoEje(t)}</span>)}
          </div>
          <div className="nui-evo-plot" style={{ gridColumn: `2 / ${columnas.length + 2}` }}>
            {columnas.map((c, i) => c.pendiente && <span key={i} className="nui-evo-pending" style={{ left: `${i / columnas.length * 100}%`, width: `${100 / columnas.length}%` }} />)}
            {escala.ticks.map(t => <span key={t} className="nui-evo-gridline" style={{ top: `${escala.y(t)}%` }} />)}
            {grupos.slice(1).map(g => <span key={g.desde} className="nui-evo-cut" style={{ left: `${g.desde / columnas.length * 100}%` }} />)}
            <svg viewBox={`0 0 ${columnas.length * 100} 100`} preserveAspectRatio="none" aria-hidden="true">
              {series.flatMap(s => tramosEvolucion(columnas, s.valores, unirGrupos).map((tramo, i) => <polyline key={`${s.id}-${i}`}
                points={tramo.map(p => `${p.indice * 100 + 50},${escala.y(p.valor)}`).join(" ")}
                fill="none" stroke={s.color} strokeWidth="2" strokeDasharray={s.dash} vectorEffect="non-scaling-stroke" />))}
            </svg>
            {series.flatMap(s => columnas.map((c, i) => {
              const valor = s.valores[i];
              if (c.pendiente || valor == null || !Number.isFinite(valor)) return null;
              const saldo = s.saldos?.[i];
              return <span key={`${s.id}-${i}`} className={`nui-evo-point${saldo?.reconstruido ? " is-reconstructed" : ""}`} aria-hidden="true"
                style={{ left: `${(i + .5) / columnas.length * 100}%`, top: `${escala.y(valor)}%`, "--serie": s.color } as CSSProperties} />;
            }))}
            {columnas.map((c, i) => <button type="button" key={`${c.grupo}-${c.circuitoId}`} className="nui-evo-zone"
              style={{ left: `${i / columnas.length * 100}%`, width: `${100 / columnas.length}%` }}
              aria-label={`GP ${c.numero} · ${c.nombre}`} aria-describedby={activa === i ? `${id}-tip` : undefined}
              onPointerEnter={() => setActiva(i)} onPointerLeave={() => setActiva(null)} onFocus={() => setActiva(i)}
              onBlur={() => setActiva(null)} onClick={() => setActiva(i)} onKeyDown={e => { if (e.key === "Escape") setActiva(null); }} />)}
            {activa !== null && <div role="tooltip" id={`${id}-tip`} className="nui-evo-tip" style={{ left: `clamp(0px, calc(${(activa + .5) / columnas.length * 100}% - 100px), calc(100% - 200px))` }}>
              <strong>GP {columnas[activa].numero} · {columnas[activa].nombre}</strong>
              {series.map(s => <div key={s.id}><span>{s.nombre}</span><b>{valorTexto(s, activa)}</b>
                {s.saldos?.[activa] && <small>{etiquetaSaldo(s.saldos[activa])}</small>}</div>)}
            </div>}
          </div>
          <div className="nui-evo-table" role="table" aria-label={titulo}>
            <div className="nui-evo-row" role="row">
              <div className="nui-evo-sticky nui-evo-name" role="columnheader">{cabeceraFilas}</div>
              {columnas.map((c, i) => <div role="columnheader" key={i} data-columna={i} className={`nui-evo-column${claseColumna(i)}`}>
                <b>GP {c.numero}</b><span>{c.nombre}</span>
              </div>)}
            </div>
            {series.map(s => <div key={s.id} role="row" className="nui-evo-row">
              <div role="rowheader" className="nui-evo-sticky nui-evo-name">
                <svg viewBox="0 0 22 8" aria-hidden="true"><line x1="1" y1="4" x2="21" y2="4" stroke={s.color} strokeWidth="2" strokeDasharray={s.dash} /></svg><span>{s.nombre}</span>
              </div>
              {columnas.map((_, i) => <div role="cell" key={i} className={`nui-evo-cell${claseColumna(i)}`}>
                {s.celdas === undefined ? <strong>{valorTexto(s, i)}</strong> : s.celdas[i]}
                {s.saldos?.[i] && <small>{etiquetaSaldo(s.saldos[i])}</small>}
              </div>)}
            </div>)}
            {filasExtra.map(f => <div role="row" className="nui-evo-row" key={f.id}>
              <div role="rowheader" className="nui-evo-sticky nui-evo-name nui-muted">{f.etiqueta}</div>
              {columnas.map((_, i) => <div role="cell" key={i} className={`nui-evo-cell${claseColumna(i)}`}>{f.celdas[i]}</div>)}
            </div>)}
          </div>
        </div>
      </div>}
    {nota && <div className="nui-note">{nota}</div>}
  </figure>;
}
