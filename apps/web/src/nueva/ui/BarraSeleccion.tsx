import type { ReactNode } from "react";
export interface BarraSeleccionProps { resumen: string; detalle: string; acciones: ReactNode }
export function BarraSeleccion({ resumen, detalle, acciones }: BarraSeleccionProps) {
  return <div className="nui-selection-bar"><div role="status" aria-live="polite"><strong>{resumen}</strong><small>{detalle}</small></div><div className="nui-selection-actions">{acciones}</div></div>;
}
