// Reconstrucción del saldo de cada escudería tras los GP liquidados antes de que la
// liquidación guardara `economia_saldos`. Se ancla en el saldo vivo (`presupuesto`) y se
// recorre el libro hacia atrás restando solo asientos guardados, así que cada saldo
// reconstruido sale de datos reales. La prueba es el saldo justo antes del primer GP
// liquidado: tiene que cuadrar con `presupuesto_inicial` + el mercado de la plantilla.
// Si algo no se puede demostrar (asiento sin fecha, GP sin asientos, desvío) no se escribe.
import { collection, doc, getDocs, query, where } from "firebase/firestore";
import { db } from "./firebase";
import { runAuditedAdminBatch } from "./adminMutationService";
import { matchesTeamLedgerEntry } from "./readModels";
import { cargoPorPrecio } from "../utils/presupuesto";
import { sumEconomyMarketTransactions } from "../utils/economyIncomeBreakdown";
import type { Transaccion } from "../types";

/** Desvío máximo, en millones, para considerar demostrado el saldo antes del primer GP. */
export const TOLERANCIA_SALDOS = 0.1;

const r2 = (n: number) => Math.round(n * 100) / 100;
const finito = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);

export type SaldoGuardado = { antes: number; ingresos: number; despues: number; origen?: string };

export interface CircuitoFuente {
  id: string;
  nombre?: string;
  numero_carrera?: number;
  fecha?: unknown;
  economia_procesada?: boolean;
  economia_version?: number;
  economia_saldos?: Record<string, SaldoGuardado>;
}

export interface EquipoFuente {
  id: string;
  nombre?: string;
  presupuesto?: unknown;
  presupuesto_inicial?: unknown;
  pilotos: Array<{ pilotoId?: string; nombre?: string; precio_compra?: unknown; restaurado_desde?: unknown }>;
}

export interface FuenteSaldos {
  splitId: string;
  circuitos: CircuitoFuente[];
  equipos: EquipoFuente[];
  asientos: Transaccion[];
  /** Nombre global de cada piloto, para señalar fichajes de pilotos que ya no están en la plantilla. */
  nombresPilotos?: Record<string, string>;
}

export interface TramoSaldo {
  circuitoId: string;
  antes: number;
  ingresos: number;
  despues: number;
  /** Saldo que ya guardó la liquidación, si existe; el reconstruido debe coincidir. */
  guardado: SaldoGuardado | null;
}

export interface SaldosEquipo {
  id: string;
  nombre: string;
  presupuesto: number | null;
  presupuestoInicial: number | null;
  mercado: number;
  /** Asientos de mercado posteriores al primer GP: su cargo no está en el saldo de antes. */
  mercadoPosterior: number;
  /** presupuesto_inicial + mercado de la plantilla − mercado posterior al primer GP. */
  apertura: number | null;
  saldoAntesPrimerGp: number | null;
  desvio: number | null;
  referencia: number | null;
  desvioReferencia: number | null;
  tramos: TramoSaldo[];
  /** Si hay desvío: pilotos con asiento de mercado en este equipo que ya no están en su plantilla. */
  pilotosFuera: string[];
}

export interface CarreraSaldos {
  id: string;
  nombre: string;
  estado: "reconstruible" | "ya_guardado" | "sin_liquidar";
}

export interface VistaSaldosHistoricos {
  splitId: string;
  carreras: CarreraSaldos[];
  equipos: SaldosEquipo[];
  /** Impiden escribir: el split no es demostrable. */
  problemas: string[];
  avisos: string[];
  escribible: boolean;
}

function aMilisegundos(value: unknown): number | null {
  if (value == null) return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (value instanceof Date) return value.getTime();
  const v = value as { toMillis?: () => number; seconds?: number };
  if (typeof v.toMillis === "function") return v.toMillis();
  if (typeof v.seconds === "number") return v.seconds * 1000;
  return null;
}

// Mismo orden de calendario que procesar y revertir la economía de una carrera.
function ordenarCalendario(circuitos: CircuitoFuente[]): CircuitoFuente[] {
  return [...circuitos].sort((a, b) => {
    const oa = Number(a.numero_carrera ?? 0), ob = Number(b.numero_carrera ?? 0);
    if (oa && ob) return oa - ob;
    if (oa) return -1;
    if (ob) return 1;
    const fa = aMilisegundos(a.fecha) ?? 0, fb = aMilisegundos(b.fecha) ?? 0;
    return fa !== fb ? fa - fb : a.id.localeCompare(b.id);
  });
}

/** Mercado de la plantilla: lo que mueven sus fichas. Una ficha restaurada no se cobró. */
export function mercadoPlantilla(pilotos: EquipoFuente["pilotos"]): number {
  return r2(pilotos.reduce((total, ficha) => {
    if (typeof ficha.restaurado_desde === "string" && ficha.restaurado_desde) return total;
    const precio = Number(ficha.precio_compra ?? 0);
    return Number.isFinite(precio) && precio !== 0 ? total + cargoPorPrecio(precio) : total;
  }, 0));
}

/**
 * Calcula, sin escribir nada, el saldo de cada escudería tras cada GP liquidado.
 * `referencias` son saldos de control que introduce el administrador (p. ej. el checkpoint
 * del Excel oficial antes del primer GP); se muestran como desvío pero no deciden la escritura.
 */
export function reconstruirSaldosSplit(fuente: FuenteSaldos, referencias: Record<string, number> = {}): VistaSaldosHistoricos {
  const { splitId } = fuente;
  const problemas: string[] = [];
  const avisos: string[] = [];
  const calendario = ordenarCalendario(fuente.circuitos);
  const liquidadas = calendario.filter(c => c.economia_procesada === true);
  const nombreDe = (c: CircuitoFuente) => c.nombre || c.id;

  const carreras: CarreraSaldos[] = calendario.map(c => ({
    id: c.id, nombre: nombreDe(c),
    estado: c.economia_procesada !== true ? "sin_liquidar" : c.economia_saldos ? "ya_guardado" : "reconstruible",
  }));
  const ultimaLiquidada = calendario.findIndex(c => c.id === liquidadas.at(-1)?.id);
  calendario.slice(0, Math.max(0, ultimaLiquidada)).filter(c => c.economia_procesada !== true)
    .forEach(c => avisos.push(`${nombreDe(c)} no está liquidado aunque hay GP posteriores liquidados.`));
  if (!liquidadas.length) problemas.push("El split no tiene ningún GP liquidado.");

  const equipos = fuente.equipos.filter(e => e.id !== "agente_libre");
  const libres = fuente.equipos.find(e => e.id === "agente_libre");

  // Cada asiento del split se atribuye a una escudería y se fecha; si no, el split no es demostrable.
  type Asiento = { id: string; equipoId: string; ms: number; importe: number; circuitoId?: string; tx: Transaccion };
  const asientos: Asiento[] = [];
  for (const tx of fuente.asientos) {
    if (tx.splitId !== splitId) continue;
    if (libres && matchesTeamLedgerEntry(tx, splitId, { id: libres.id, nombre: libres.nombre })) continue;
    const equipo = equipos.find(e => matchesTeamLedgerEntry(tx, splitId, { id: e.id, nombre: e.nombre }));
    const ms = aMilisegundos(tx.fecha);
    const cantidad = Number(tx.cantidad);
    if (!equipo) { problemas.push(`El asiento ${tx.id} no corresponde a ninguna escudería del split.`); continue; }
    if (ms === null) { problemas.push(`El asiento ${tx.id} no tiene fecha: no se puede ordenar.`); continue; }
    if (!Number.isFinite(cantidad)) { problemas.push(`El asiento ${tx.id} no tiene un importe válido.`); continue; }
    asientos.push({ id: tx.id ?? "", equipoId: equipo.id, ms, importe: tx.esIngreso ? cantidad : -cantidad, circuitoId: tx.circuitoId, tx });
  }

  const sinLiquidar = new Set(calendario.filter(c => c.economia_procesada !== true).map(c => c.id));
  asientos.filter(a => a.circuitoId && sinLiquidar.has(a.circuitoId))
    .forEach(a => problemas.push(`El asiento ${a.id} es de un GP sin liquidar.`));

  // Fin de cada GP liquidado: su último asiento. Tienen que avanzar en el orden del calendario.
  const finDe = new Map<string, number>();
  for (const c of liquidadas) {
    const propios = asientos.filter(a => a.circuitoId === c.id);
    if (!propios.length) { problemas.push(`${nombreDe(c)} está liquidado pero no tiene asientos en el libro.`); continue; }
    finDe.set(c.id, Math.max(...propios.map(a => a.ms)));
  }
  liquidadas.forEach((c, i) => {
    const previa = liquidadas[i - 1];
    if (previa && finDe.has(c.id) && finDe.has(previa.id) && finDe.get(c.id)! <= finDe.get(previa.id)!) {
      problemas.push(`Los asientos de ${nombreDe(c)} son anteriores a los de ${nombreDe(previa)}: el orden no es demostrable.`);
    }
  });

  const recorrible = liquidadas.length > 0 && liquidadas.every(c => finDe.has(c.id));
  const filas: SaldosEquipo[] = equipos.map(e => {
    const presupuesto = finito(e.presupuesto) ? e.presupuesto : null;
    const presupuestoInicial = finito(e.presupuesto_inicial) ? e.presupuesto_inicial : null;
    const nombre = e.nombre || e.id;
    if (presupuesto === null) problemas.push(`${nombre} no tiene saldo registrado.`);
    if (presupuestoInicial === null) problemas.push(`${nombre} no tiene presupuesto inicial: no se puede comprobar.`);
    const propios = asientos.filter(a => a.equipoId === e.id);
    const mercado = mercadoPlantilla(e.pilotos);
    const finPrimera = recorrible ? finDe.get(liquidadas[0].id)! : Infinity;
    const mercadoPosterior = r2(sumEconomyMarketTransactions(propios.filter(a => a.ms > finPrimera).map(a => a.tx)));
    const apertura = presupuestoInicial === null ? null : r2(presupuestoInicial + mercado - mercadoPosterior);
    const referencia = finito(referencias[e.id]) ? referencias[e.id] : null;
    const fila: SaldosEquipo = {
      id: e.id, nombre, presupuesto, presupuestoInicial, mercado, mercadoPosterior, apertura,
      saldoAntesPrimerGp: null, desvio: null, referencia, desvioReferencia: null, tramos: [], pilotosFuera: [],
    };
    if (!recorrible || presupuesto === null) return fila;

    const suma = (lista: Asiento[]) => lista.reduce((total, a) => total + a.importe, 0);
    const finUltima = finDe.get(liquidadas.at(-1)!.id)!;
    let despues = r2(presupuesto - suma(propios.filter(a => a.ms > finUltima)));
    const tramos: TramoSaldo[] = [];
    for (let i = liquidadas.length - 1; i >= 0; i--) {
      const c = liquidadas[i];
      const ingresos = r2(suma(propios.filter(a => a.circuitoId === c.id)));
      const antes = r2(despues - ingresos);
      tramos.unshift({ circuitoId: c.id, antes, ingresos, despues, guardado: c.economia_saldos?.[e.id] ?? null });
      // Fichajes, pactos y ajustes entre el GP anterior y este ya estaban en `antes`.
      if (i > 0) {
        const desde = finDe.get(liquidadas[i - 1].id)!, hasta = finDe.get(c.id)!;
        despues = r2(antes - suma(propios.filter(a => a.circuitoId !== c.id && a.ms > desde && a.ms <= hasta)));
      }
    }
    fila.tramos = tramos;
    fila.saldoAntesPrimerGp = tramos[0].antes;
    if (apertura !== null) fila.desvio = r2(fila.saldoAntesPrimerGp - apertura);
    if (fila.desvio !== null && Math.abs(fila.desvio) > TOLERANCIA_SALDOS + 1e-9) {
      // Liberar no devuelve el cargo: la ficha sale del mercado de la plantilla pero su asiento sigue.
      const enPlantilla = new Set(e.pilotos.map(p => (p.pilotoId && fuente.nombresPilotos?.[p.pilotoId]) || p.nombre).filter(Boolean));
      fila.pilotosFuera = [...new Set(propios
        .filter(a => sumEconomyMarketTransactions([a.tx]) !== 0 && a.tx.piloto && !enPlantilla.has(a.tx.piloto))
        .map(a => a.tx.piloto!))];
    }
    if (referencia !== null) fila.desvioReferencia = r2(fila.saldoAntesPrimerGp - referencia);
    for (const tramo of tramos) {
      if (!tramo.guardado) continue;
      if (Math.abs(r2(tramo.guardado.despues - tramo.despues)) > 0.01 || Math.abs(r2(tramo.guardado.ingresos - tramo.ingresos)) > 0.01) {
        const gp = calendario.find(c => c.id === tramo.circuitoId);
        problemas.push(`${nombre}: el saldo guardado tras ${gp ? nombreDe(gp) : tramo.circuitoId} (${tramo.guardado.despues}M) no coincide con el reconstruido (${tramo.despues}M).`);
      }
    }
    return fila;
  });

  const cuadra = filas.every(f => f.desvio !== null && Math.abs(f.desvio) <= TOLERANCIA_SALDOS + 1e-9);
  const pendientes = carreras.some(c => c.estado === "reconstruible");
  return {
    splitId, carreras, equipos: filas, problemas, avisos,
    escribible: recorrible && problemas.length === 0 && cuadra && pendientes,
  };
}

/** Lee todo lo que necesita la reconstrucción. No escribe nada. */
export async function cargarFuenteSaldos(splitId: string): Promise<FuenteSaldos> {
  const [circuitosSnap, equiposSnap, asientosSnap, pilotosSnap] = await Promise.all([
    getDocs(collection(db, `splits/${splitId}/circuitos`)),
    getDocs(collection(db, `splits/${splitId}/equipos`)),
    getDocs(query(collection(db, "transacciones"), where("splitId", "==", splitId))),
    getDocs(collection(db, "pilotos")),
  ]);
  const equipos = await Promise.all(equiposSnap.docs.map(async equipo => {
    const pilotos = equipo.id === "agente_libre" ? [] : (await getDocs(collection(db, `splits/${splitId}/equipos/${equipo.id}/pilotos`))).docs.map(p => ({ pilotoId: p.id, ...p.data() }));
    return { id: equipo.id, ...(equipo.data() as Omit<EquipoFuente, "id" | "pilotos">), pilotos };
  }));
  return {
    splitId,
    circuitos: circuitosSnap.docs.map(c => ({ id: c.id, ...(c.data() as Omit<CircuitoFuente, "id">) })),
    equipos,
    asientos: asientosSnap.docs.map(t => ({ id: t.id, ...t.data() }) as Transaccion),
    nombresPilotos: Object.fromEntries(pilotosSnap.docs.map(p => [p.id, String(p.data().nombre ?? p.id)])),
  };
}

/**
 * Escribe `economia_saldos` con `origen: "reconstruido"` en los GP liquidados que no lo tenían,
 * todos o ninguno, con una entrada de auditoría. Rechaza la escritura si algún saldo o GP ha
 * cambiado desde la vista previa (se relee dentro de la transacción).
 */
export async function guardarSaldosReconstruidos(fuente: FuenteSaldos, vista: VistaSaldosHistoricos): Promise<{ circuitos: number }> {
  if (!vista.escribible || vista.splitId !== fuente.splitId) throw new Error("La reconstrucción no está demostrada: no se escribe nada.");
  const { splitId } = fuente;
  const objetivo = vista.carreras.filter(c => c.estado === "reconstruible");
  const pathEquipo = (id: string) => `splits/${splitId}/equipos/${id}`;
  const pathCircuito = (id: string) => `splits/${splitId}/circuitos/${id}`;
  const refs = [
    ...vista.equipos.map(e => doc(db, `splits/${splitId}/equipos`, e.id)),
    ...objetivo.map(c => doc(db, `splits/${splitId}/circuitos`, c.id)),
  ];
  const versiones = new Map(fuente.circuitos.map(c => [c.id, c.economia_version ?? null]));
  const { result } = await runAuditedAdminBatch({
    refs,
    action: "economy_balances_rebuild",
    summary: `Saldos reconstruidos desde el libro en ${objetivo.map(c => c.nombre).join(", ")}`,
    apply: currents => {
      for (const equipo of vista.equipos) {
        if (currents[pathEquipo(equipo.id)]?.presupuesto !== equipo.presupuesto) {
          throw new Error(`El saldo de ${equipo.nombre} ha cambiado desde la vista previa. Vuelve a calcularla.`);
        }
      }
      const writes: Record<string, Record<string, any>> = {};
      for (const carrera of objetivo) {
        const actual = currents[pathCircuito(carrera.id)];
        if (!actual || actual.economia_procesada !== true || actual.economia_saldos || (actual.economia_version ?? null) !== versiones.get(carrera.id)) {
          throw new Error(`${carrera.nombre} ha cambiado desde la vista previa. Vuelve a calcularla.`);
        }
        const saldos: Record<string, SaldoGuardado> = {};
        for (const equipo of vista.equipos) {
          const tramo = equipo.tramos.find(t => t.circuitoId === carrera.id)!;
          saldos[equipo.id] = { antes: tramo.antes, ingresos: tramo.ingresos, despues: tramo.despues, origen: "reconstruido" };
        }
        writes[pathCircuito(carrera.id)] = { ...actual, economia_saldos: saldos };
      }
      return { writes, result: objetivo.length };
    },
  });
  return { circuitos: result ?? 0 };
}
