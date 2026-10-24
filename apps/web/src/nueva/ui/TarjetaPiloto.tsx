import type { CSSProperties } from "react";
import type { CartaPiloto } from "../datos/cartas";

export interface AparienciaEquipo { color: string; fondo: string; logoUrl?: string }
export interface TarjetaPilotoProps {
  piloto: CartaPiloto;
  apariencia: AparienciaEquipo;
  onAbrir?: () => void;
}
export function TarjetaPiloto({ piloto: p, apariencia: a, onAbrir }: TarjetaPilotoProps) {
  const contenido = <>
    <div className="nui-driver-copy">
      <span className="nui-driver-name">{p.nombre}</span>
      <span className="nui-driver-team">{p.equipoNombre === null ? "Individual" : p.equipoNombre}</span>
      <span className="nui-driver-season">{p.temporada}</span>
      <span className="nui-driver-rating">{p.rating === null ? <span className="nui-tier">Sin valoración</span> : <>
        <span className="nui-ovr" aria-label={`OVR ${p.rating}`}>{p.rating}</span>{p.nivel && <span className="nui-tier">{p.nivel}</span>}
      </>}</span>
      <span className="nui-driver-footer">{a.logoUrl && <img className="nui-team-logo" src={a.logoUrl} alt="" />}<strong>{p.puntos} PTS</strong></span>
    </div>
    {p.fotoUrl ? <img className="nui-driver-photo" src={p.fotoUrl} alt="" loading="lazy" /> : <span className="nui-driver-no-photo">Sin foto</span>}
  </>;
  const style = { "--equipo": a.color, "--equipo-fondo": a.fondo } as CSSProperties;
  return onAbrir ? <button type="button" className="nui-driver nui-team-surface" style={style} onClick={onAbrir}
    aria-label={`Abrir carta de ${p.nombre} · ${p.temporada}`}>{contenido}</button>
    : <article className="nui-driver nui-team-surface" style={style} aria-label={`Carta de ${p.nombre} · ${p.temporada}`}>{contenido}</article>;
}
