import type { ReactNode } from "react";
export interface KpiProps { etiqueta: string; valor: ReactNode; unidad?: string; detalle?: ReactNode; tono?: "normal" | "positivo" | "aviso" }
export function Kpi({ etiqueta, valor, unidad, detalle, tono = "normal" }: KpiProps) {
  return <div className={`nui-kpi nui-tone-${tono}`}><span className="nui-eyebrow">{etiqueta}</span><p className="nui-kpi-value">{valor} {unidad && <small>{unidad}</small>}</p>{detalle && <div className="nui-muted">{detalle}</div>}</div>;
}
