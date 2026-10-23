import { useEffect, useId, useRef, useState } from "react";
import type { CartaPiloto, CarreraCarta } from "../datos/cartas";
import { TarjetaPiloto, type AparienciaEquipo } from "./TarjetaPiloto";

export interface CartaPilotoModalProps { piloto: CartaPiloto; apariencia: AparienciaEquipo; abierto: boolean; onCerrar: () => void }
function puestoTexto(carrera: CarreraCarta) {
  switch (carrera.estado) {
    case "dnf": return "DNF";
    case "no_corrio": return "No corrió";
    case "desconocida": return "Desconocido";
    case "rango_11_20": return "P11–P20";
    case "clasificado": return carrera.puesto === null ? "Desconocido" : `P${carrera.puesto}`;
  }
}
export function CartaPilotoModal({ piloto, apariencia, abierto, onCerrar }: CartaPilotoModalProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [girada, setGirada] = useState(false);
  const id = useId();
  useEffect(() => {
    const el = dialog.current;
    if (!el || !abierto) return;
    const anterior = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const overflow = document.body.style.overflow;
    setGirada(false);
    el.showModal();
    document.body.style.overflow = "hidden";
    return () => { el.close(); document.body.style.overflow = overflow; anterior?.focus(); };
  }, [abierto, piloto.pilotoId, piloto.temporadaId]);
  const estadisticas = [
    ["Victorias", piloto.victorias], ["Podios", piloto.podios], ["Poles", piloto.poles],
    ["V. rápidas", piloto.vueltasRapidas], ["DNF", piloto.dnfs], ["Limpias", piloto.limpias],
    ["Carreras", piloto.carreras], ["Media carrera", piloto.mediaCarrera], ["Media puntos", piloto.mediaPuntos],
  ];
  return <dialog ref={dialog} className="nui-modal" aria-labelledby={`${id}-title`} onCancel={e => { e.preventDefault(); onCerrar(); }}>
    <header className="nui-modal-header"><h2 id={`${id}-title`}>{piloto.nombre} · {piloto.temporada}</h2>
      <button type="button" className="nui-button" aria-label="Cerrar carta" onClick={onCerrar}>✕</button></header>
    <button type="button" className="nui-button nui-flip-toggle" aria-pressed={girada} onClick={() => setGirada(!girada)}>
      {girada ? "Volver al anverso" : "Ver estadísticas y carrera a carrera"}
    </button>
    <div className="nui-flip-scene"><div className={`nui-flip-inner${girada ? " is-flipped" : ""}`}>
      <div className="nui-card-face nui-card-front" aria-hidden={girada} inert={girada}>
        <TarjetaPiloto piloto={piloto} apariencia={apariencia} />
        <p className="nui-card-summary">{piloto.puntos} PTS · {piloto.victorias} victorias · {piloto.podios} podios</p>
      </div>
      <div className="nui-card-face nui-card-back" aria-hidden={!girada} inert={!girada}>
        <h3>Estadísticas de {piloto.nombre}</h3>
        <dl className="nui-card-stats">{estadisticas.map(([nombre, valor]) => <div key={nombre}><dt>{nombre}</dt><dd>{valor === null ? "—" : valor}</dd></div>)}</dl>
        <table className="nui-card-results"><caption>Carrera a carrera · {piloto.temporada}</caption>
          <thead><tr><th scope="col">GP</th><th scope="col">Pos.</th><th scope="col">Pts</th><th scope="col">Extra</th></tr></thead>
          <tbody>{piloto.evolucion.map(c => <tr key={`${c.numero}-${c.circuitoId}`}><th scope="row">GP {c.numero} · {c.nombre}</th><td>{puestoTexto(c)}</td><td>{c.puntos}</td><td>{c.vueltaRapida ? "V. rápida" : "—"}</td></tr>)}</tbody>
        </table>
        {piloto.evolucion.length === 0 && <p className="nui-muted">Sin carreras registradas.</p>}
      </div>
    </div></div>
  </dialog>;
}
