import { Segment, SegmentedControl } from "../../components/ui/SegmentedControl";
export interface OpcionSegmento<T extends string> { valor: T; etiqueta: string; deshabilitada?: boolean }
export interface ControlSegmentadoProps<T extends string> { etiqueta: string; opciones: readonly OpcionSegmento<T>[]; valor: T; onCambiar: (valor: T) => void }
export function ControlSegmentado<T extends string>({ etiqueta, opciones, valor, onCambiar }: ControlSegmentadoProps<T>) {
  return <SegmentedControl className="nui-segmented" role="group" aria-label={etiqueta}>
    {opciones.map(o => <Segment key={o.valor} selected={o.valor === valor} disabled={o.deshabilitada} onClick={() => onCambiar(o.valor)}>{o.etiqueta}</Segment>)}
  </SegmentedControl>;
}
