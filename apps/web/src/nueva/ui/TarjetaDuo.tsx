import type { DuoTemporada } from "../datos/tipos";
import type { PilotoAlineacion } from "./TarjetaEquipo";

export interface TarjetaDuoProps { duo: Pick<DuoTemporada, "nombre" | "puntos">; pilotos: readonly PilotoAlineacion[]; puesto: number | null; temporada: string }
export function TarjetaDuo({ duo, pilotos, puesto, temporada }: TarjetaDuoProps) {
  return <article className="nui-team-card nui-duo">
    <div className="nui-team-top"><h3>{duo.nombre}</h3><p>Dúo · {pilotos.map(p => `${p.nombre} ${p.puntos} pts`).join(" · ")}</p></div>
    <div className="nui-lineup">{pilotos.map(p => p.fotoUrl ? <img key={p.pilotoId} src={p.fotoUrl} alt={p.nombre} loading="lazy" /> : <span key={p.pilotoId}>{p.nombre}</span>)}</div>
    <div className="nui-team-bottom"><span>{puesto !== null && `${puesto}.º · `}{duo.puntos} pts</span><span>{temporada}</span></div>
  </article>;
}
