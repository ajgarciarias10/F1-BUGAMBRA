import type { ColumnaGp } from "../datos/temporadas";
import type { SaldoGp } from "../datos/evolucion";

/** Geometría de presentación; nunca reconstruye un valor ausente. */
export function escalaEvolucion(valores: readonly (number | null)[], desdeCero: boolean) {
  const finitos = valores.filter((v): v is number => v !== null && Number.isFinite(v));
  const min = finitos.length ? Math.min(...finitos, ...(desdeCero ? [0] : [])) : 0;
  const max = finitos.length ? Math.max(...finitos, ...(desdeCero ? [0] : [])) : 1;
  const amplitud = max === min ? 1 : max - min;
  const pasoBase = amplitud / 4;
  const magnitud = 10 ** Math.floor(Math.log10(pasoBase));
  const factor = [1, 2, 2.5, 5, 10].find(n => n * magnitud >= pasoBase)!;
  const paso = factor * magnitud;
  const lo = Math.floor(min / paso) * paso;
  const hi = Math.ceil((max === min ? max + 1 : max) / paso) * paso;
  const ticks = Array.from({ length: Math.round((hi - lo) / paso) + 1 }, (_, i) => Number((lo + i * paso).toPrecision(12)));
  return { ticks, y: (v: number) => 6 + (1 - (v - lo) / (hi - lo)) * 88 };
}

export function tramosEvolucion(columnas: readonly ColumnaGp[], valores: readonly (number | null)[], unirGrupos: boolean) {
  const tramos: Array<Array<{ indice: number; valor: number }>> = [];
  let actual: Array<{ indice: number; valor: number }> = [];
  columnas.forEach((columna, indice) => {
    const valor = valores[indice];
    const corte = indice > 0 && columna.grupo !== columnas[indice - 1].grupo && !unirGrupos;
    const ausente = columna.pendiente || valor == null || !Number.isFinite(valor);
    if (corte || ausente) {
      if (actual.length) tramos.push(actual);
      actual = [];
    }
    if (!ausente) actual.push({ indice, valor });
  });
  if (actual.length) tramos.push(actual);
  return tramos;
}

export function etiquetaSaldo(saldo: SaldoGp): string {
  if (saldo.estado === "guardado" && saldo.reconstruido) return "reconstruido";
  return saldo.estado;
}
