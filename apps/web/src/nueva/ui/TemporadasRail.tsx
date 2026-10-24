import type { Temporada } from "../datos/tipos";

export type OpcionTemporada = Pick<Temporada, "id" | "nombre" | "tipo" | "enCurso"> & { detalle: string };
export interface GrupoTemporadas { id: string; nombre: string; temporadas: readonly OpcionTemporada[] }
export interface TemporadasRailProps { grupos: readonly GrupoTemporadas[]; seleccion: string; onSeleccionar: (id: string) => void }

export function TemporadasRail({ grupos, seleccion, onSeleccionar }: TemporadasRailProps) {
  return <nav className="nui-season-rail" aria-label="Temporadas">
    {grupos.map(g => <div className="nui-season-group" key={g.id}>
      <span className="nui-eyebrow">{g.nombre}</span>
      <div className={`nui-season-track${g.temporadas.length > 1 ? " is-linked" : ""}`}>
        {g.temporadas.map(t => <button type="button" key={t.id} className={`nui-season-node${t.enCurso ? " is-live" : ""}${t.tipo === "agregada" ? " is-total" : ""}`}
          aria-pressed={seleccion === t.id} onClick={() => onSeleccionar(t.id)}>
          <span className="nui-season-dot" aria-hidden="true" /><strong>{t.nombre}</strong><small>{t.detalle}</small>
        </button>)}
      </div>
    </div>)}
  </nav>;
}
