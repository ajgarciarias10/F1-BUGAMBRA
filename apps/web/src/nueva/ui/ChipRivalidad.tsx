import type { PilotoAlineacion } from "./TarjetaEquipo";
export interface ChipRivalidadProps { piloto: Pick<PilotoAlineacion, "nombre" | "fotoUrl">; detalle: string; seleccionado: boolean; deshabilitado?: boolean; onSeleccionar: () => void }
export function ChipRivalidad({ piloto, detalle, seleccionado, deshabilitado = false, onSeleccionar }: ChipRivalidadProps) {
  return <button type="button" className="nui-rival-chip" aria-pressed={seleccionado} disabled={deshabilitado} onClick={onSeleccionar}>
    <span className="nui-avatar">{piloto.fotoUrl ? <img src={piloto.fotoUrl} alt="" /> : <span aria-hidden="true">{piloto.nombre.slice(0, 1)}</span>}</span>
    <span><strong>{piloto.nombre}</strong><small>{detalle}</small></span><span className="nui-rival-check" aria-hidden="true">{seleccionado ? "✓" : "+"}</span>
  </button>;
}
