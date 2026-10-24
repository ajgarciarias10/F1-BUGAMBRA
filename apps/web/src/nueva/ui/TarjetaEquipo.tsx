import type { CSSProperties } from "react";
import type { EquipoTemporada, PilotoTemporada } from "../datos/tipos";
import type { AparienciaEquipo } from "./TarjetaPiloto";

export type PilotoAlineacion = Pick<PilotoTemporada, "pilotoId" | "nombre" | "fotoUrl" | "puntos">;
export interface TarjetaEquipoProps {
  equipo: Pick<EquipoTemporada, "equipoId" | "nombre" | "puntos" | "logoUrl">;
  pilotos: readonly PilotoAlineacion[];
  apariencia: AparienciaEquipo;
  puesto: number | null;
  mediaOvr: number | null;
  responsables: string;
  onAbrir?: () => void;
  onPiloto?: (id: string) => void;
}
export function TarjetaEquipo({ equipo, pilotos, apariencia, puesto, mediaOvr, responsables, onAbrir, onPiloto }: TarjetaEquipoProps) {
  return <article className="nui-team-card nui-team-surface" style={{ "--equipo": apariencia.color, "--equipo-fondo": apariencia.fondo } as CSSProperties}>
    <div className="nui-team-top">
      <div className="nui-team-heading"><div><h3>{onAbrir ? <button type="button" onClick={onAbrir} aria-label={`Ver escudería ${equipo.nombre}`}>{equipo.nombre}</button> : equipo.nombre}</h3>
        <p>{responsables}</p></div>{equipo.logoUrl && <img className="nui-team-logo" src={equipo.logoUrl} alt="" />}</div>
      <div className="nui-team-drivers">{pilotos.map(p => onPiloto ? <button type="button" key={p.pilotoId} onClick={() => onPiloto(p.pilotoId)} aria-label={`Abrir carta de ${p.nombre}`}>
        {p.fotoUrl && <img src={p.fotoUrl} alt="" />}<span>{p.nombre}</span>
      </button> : <span key={p.pilotoId}>{p.nombre}</span>)}</div>
    </div>
    <div className="nui-lineup">{pilotos.map(p => p.fotoUrl ? <img key={p.pilotoId} src={p.fotoUrl} alt={p.nombre} loading="lazy" /> : <span key={p.pilotoId}>{p.nombre}</span>)}</div>
    <div className="nui-team-bottom"><span>{puesto !== null && `${puesto}.º · `}{equipo.puntos} pts</span><span>Media OVR {mediaOvr === null ? "—" : mediaOvr}</span></div>
  </article>;
}
