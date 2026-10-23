// Evolución de cada escudería GP a GP, dentro de un split y de un split a otro, con la forma del
// gráfico alineado del prototipo: columnas = GP agrupados por split, series = escuderías.
//
// Qué es real y qué no. Los puntos por GP salen de los resultados guardados. El saldo de salida
// (`presupuesto_inicial`), el de cierre (`economia_historica.presupuesto_cierre`) y el actual
// (`presupuesto`) están guardados. Desde el ticket 27, liquidar un GP guarda en el circuito
// `economia_saldos[equipoId] = { antes, ingresos, despues }`: ese es el saldo real tras el GP y
// lo abonado (el ticket 28 lo rellenará en carreras antiguas con `origen: "reconstruido"`). Si
// falta (carrera antigua o revertida), el saldo solo se da si un asiento del libro de ese GP
// guardó `saldo_nuevo`; si no, queda «desconocido». Nunca se estima repartiendo el saldo actual
// hacia atrás: entre GP hay fichajes, pactos y ajustes.
import type { Circuito, SplitView, Transaccion } from "../../types";
import { sumEconomyIncomeTransactions, totalEconomyIncome, type EconomyIncomeBreakdown } from "../../utils/economyIncomeBreakdown";
import { buildLedgerView } from "../../services/readModels";
import { desgloseCircuito } from "./ingresos";
import { evolucionEquipos, type ColumnaGp } from "./temporadas";
import type { Liga, Temporada } from "./tipos";

const r2 = (n: number) => Math.round(n * 100) / 100;

export interface IngresoGp {
  /** null si el GP no se ha disputado. */
  importe: number | null;
  /**
   * «guardado»: `economia_saldos[equipo].ingresos` del circuito, guardado al liquidar;
   * «libro»: suma de los asientos guardados de ese GP (como el panel de economía);
   * «calculado»: GP procesado sin libro a mano, recalculado con las reglas que se aplicaron;
   * «previsto»: GP disputado sin procesar, aún no abonado.
   */
  origen: "guardado" | "libro" | "calculado" | "previsto" | null;
  /** Reparto por fuente: del libro si se pasa; si no, recalculado. Con origen «guardado» el
   *  total manda y el reparto es orientativo. */
  porFuente: EconomyIncomeBreakdown | null;
}

export interface SaldoGp {
  saldo: number | null;
  /**
   * «guardado»: `economia_saldos[equipo].despues` del circuito; «registrado»: `saldo_nuevo` de un
   * asiento del libro; «desconocido»: GP procesado sin ninguno de los dos; «pendiente»: aún no
   * procesado (o revertido).
   */
  estado: "guardado" | "registrado" | "desconocido" | "pendiente";
  /** Solo con «guardado»: saldo antes de liquidar el GP. */
  antes?: number;
  /** Solo con «guardado»: el ticket 28 lo rellenó a posteriori (`origen: "reconstruido"`). */
  reconstruido?: boolean;
}

type SaldoGuardado = { antes: number; ingresos: number; despues: number; origen?: string };
const finito = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

/** `economia_saldos` de un equipo, solo si el circuito está procesado y las cifras son números.
 *  Un saldo negativo es un dato válido y se enseña tal cual. */
export function saldoGuardado(circuito: Circuito | undefined, equipoId: string): SaldoGuardado | null {
  if (!circuito || circuito.economia_procesada !== true) return null;
  const s = circuito.economia_saldos?.[equipoId] as SaldoGuardado | undefined;
  return s && finito(s.antes) && finito(s.ingresos) && finito(s.despues) ? s : null;
}

export interface SerieEscuderia {
  equipoId: string;
  nombre: string;
  puntosPorGp: Array<number | null>;
  /** En la Temporada 1 sigue de un split a otro; en un split empieza en cero. */
  puntosAcumulados: Array<number | null>;
  ingresosPorGp: IngresoGp[];
  saldoTrasGp: SaldoGp[];
}

export interface TramoSplit {
  splitId: string;
  nombre: string;
  /** Índices de columna (incluidos) que ocupa el split. */
  desde: number;
  hasta: number;
  enCurso: boolean;
  /** Saldos guardados de cada escudería en ese split. */
  saldos: Record<string, { apertura: number | null; cierre: number | null; actual: number | null }>;
}

export interface EvolucionEscuderias {
  columnas: ColumnaGp[];
  tramos: TramoSplit[];
  series: SerieEscuderia[];
}

/**
 * @param splitViews los mismos `SplitView` de los que salió la liga (resultados y reglas).
 * @param libro asientos de `transacciones` si la pantalla los tiene (exigen sesión); sin ellos,
 *   los ingresos de GP procesados se recalculan y el saldo tras cada GP queda desconocido.
 */
export function evolucionEscuderias(
  liga: Liga, splitViews: readonly SplitView[], temporada: Temporada, libro: readonly Transaccion[] = [],
): EvolucionEscuderias {
  const splits = temporada.tipo === "agregada" ? liga.splits.filter(s => temporada.splitIds.includes(s.id))
    : temporada.tipo === "split" ? [temporada] : [];
  const { columnas, series: puntos } = evolucionEquipos(temporada.tipo === "individual" ? { ...temporada, gps: [] } : temporada);
  const vistas = new Map(splitViews.map(s => [s.id, s]));

  const tramos: TramoSplit[] = [];
  let desde = 0;
  for (const s of splits) {
    tramos.push({
      splitId: s.id, nombre: s.nombre, desde, hasta: desde + s.gps.length - 1, enCurso: s.enCurso,
      saldos: Object.fromEntries(s.equipos.map(e => [e.equipoId, { apertura: e.saldoApertura, cierre: e.saldoCierre, actual: e.saldoActual }])),
    });
    desde += s.gps.length;
  }

  // Desglose calculado de cada GP disputado, por si no hay libro.
  const gps = temporada.gps;
  const circuitos = gps.map(g => vistas.get(g.splitId)?.circuitos.find(c => c.id === g.circuitoId));
  const calculados = gps.map((g, i) => {
    const vista = vistas.get(g.splitId), circuito = circuitos[i];
    return g.disputada && vista && circuito ? desgloseCircuito(vista, circuito) : null;
  });

  const series = temporada.equipos.map(e => {
    const p = puntos.find(x => x.id === e.equipoId)!;
    const ingresosPorGp: IngresoGp[] = [];
    const saldoTrasGp: SaldoGp[] = [];
    gps.forEach((g, i) => {
      if (!g.disputada) {
        ingresosPorGp.push({ importe: null, origen: null, porFuente: null });
        saldoTrasGp.push({ saldo: null, estado: "pendiente" });
        return;
      }
      const asientos = libro.filter(t => t.splitId === g.splitId && t.circuitoId === g.circuitoId && t.equipoId === e.equipoId);
      const guardado = saldoGuardado(circuitos[i], e.equipoId);
      if (guardado) {
        const calc = calculados[i]?.porEquipo[e.equipoId];
        const porFuente = asientos.length ? sumEconomyIncomeTransactions(asientos) : calc ? { ...calc.porFuente, seasonPrize: 0 } : null;
        ingresosPorGp.push({ importe: guardado.ingresos, origen: "guardado", porFuente });
        saldoTrasGp.push({
          saldo: guardado.despues, estado: "guardado", antes: guardado.antes,
          ...(guardado.origen === "reconstruido" ? { reconstruido: true } : {}),
        });
        return;
      }
      if (g.economiaProcesada && asientos.length) {
        const porFuente = sumEconomyIncomeTransactions(asientos);
        ingresosPorGp.push({ importe: r2(totalEconomyIncome(porFuente)), origen: "libro", porFuente });
      } else {
        const calc = calculados[i]?.porEquipo[e.equipoId];
        const porFuente = calc ? { ...calc.porFuente, seasonPrize: 0 } : null;
        ingresosPorGp.push({ importe: calc ? calc.total : 0, origen: g.economiaProcesada ? "calculado" : "previsto", porFuente });
      }
      if (!g.economiaProcesada) { saldoTrasGp.push({ saldo: null, estado: "pendiente" }); return; }
      // El asiento más reciente de ese GP que guardó su saldo (orden y lectura de buildLedgerView).
      const ultimo = buildLedgerView(asientos, null).entries.find(a => a.balanceAfter !== null);
      saldoTrasGp.push(ultimo ? { saldo: ultimo.balanceAfter, estado: "registrado" } : { saldo: null, estado: "desconocido" });
    });
    return {
      equipoId: e.equipoId, nombre: e.nombre, puntosPorGp: p.porGp, puntosAcumulados: p.acumulado,
      ingresosPorGp, saldoTrasGp,
    };
  });
  return { columnas, tramos, series };
}
