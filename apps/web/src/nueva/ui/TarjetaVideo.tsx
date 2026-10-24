import type { ReactNode } from "react";
export interface TarjetaVideoProps { titulo: string; miniatura?: string; duracion: string; tipo: string; autor: string; detalle: string; abierto: boolean; onAlternar: () => void; reproductor?: ReactNode }
/** El reproductor y sus URLs proceden de la pantalla de TV; aquí no se consulta Twitch. */
export function TarjetaVideo({ titulo, miniatura, duracion, tipo, autor, detalle, abierto, onAlternar, reproductor }: TarjetaVideoProps) {
  return <article className={`nui-video${abierto ? " is-open" : ""}`}>
    {abierto ? <><div className="nui-video-player">{reproductor}</div><button type="button" className="nui-button" onClick={onAlternar}>Cerrar vídeo</button></> :
      <button type="button" className="nui-video-thumb" aria-label={`Ver ${titulo}`} onClick={onAlternar}>
        {miniatura && <img src={miniatura} alt="" loading="lazy" />}<span className="nui-video-play" aria-hidden="true">▶</span><span className="nui-video-duration">{duracion}</span>
      </button>}
    <div className="nui-video-meta"><span className="nui-eyebrow">{tipo} · {autor}</span><h3>{titulo}</h3><small>{detalle}</small></div>
  </article>;
}
