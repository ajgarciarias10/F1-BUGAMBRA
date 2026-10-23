// Pactos: un piloto fichado durante un split para el siguiente. Solo lectura de lo que guarda la
// ficha del split actual (`pending_*`, `congelado`) y, si ya existe, la plantilla del split
// siguiente. La lectura del traspaso es la de `resolveTransferView` (utils/transferView.ts), la
// misma que usa el panel de economía. Escribir o anular un pacto sigue siendo cosa de
// services/transferService.ts.
import type { PilotInRoster, SplitView } from "../../types";
import { resolveTransferView, type TransferPilot, type TransferView } from "../../utils/transferView";

const SIN_EQUIPO = "agente_libre";
const esEquipo = (id?: string | null): id is string => !!id && id !== SIN_EQUIPO && id !== "individual";

type FichaGuardada = PilotInRoster & { pending_splitId?: string | null; restaurado_desde?: string };

export interface PactoPiloto {
  pilotoId: string;
  nombre: string;
  /** Escudería en el split actual; null si es agente libre o no tiene ficha en él. */
  equipoActual: string | null;
  /** Lo guardado tal cual en la ficha del split actual; null si no hay pacto. */
  guardado: { equipoId: string | null; precio: number | null; tipo: string | null; splitId: string | null } | null;
  congelado: boolean;
  /** Lectura del traspaso (`resolveTransferView`); null si no hay traspaso. */
  traspaso: TransferView | null;
  /**
   * Adónde va: la escudería del traspaso, la ficha que ya tiene en el split siguiente sin
   * traspaso (p. ej. restaurada), `agente_libre` si allí quedó libre, o null si aún no se sabe.
   */
  destino: string | null;
  estadoDestino: TransferView["estado"] | "en_plantilla" | "sin_decidir";
}

export interface MovimientoPlantilla {
  pilotoId: string;
  nombre: string;
  /** Para las llegadas: de dónde viene (null = nuevo en la liga o agente libre). Para las
   *  salidas: adónde va (`agente_libre` si queda libre). */
  equipoId: string | null;
  precio: number | null;
  tipo: string | null;
  estado: PactoPiloto["estadoDestino"];
}

export interface PlantillaSiguiente {
  equipoId: string;
  siguen: MovimientoPlantilla[];
  llegan: MovimientoPlantilla[];
  seVan: MovimientoPlantilla[];
  /** De la plantilla actual sin pacto ni ficha en el split siguiente. */
  sinDecidir: MovimientoPlantilla[];
}

export interface PactosSplit {
  splitId: string;
  /** null si el split siguiente aún no existe. */
  siguiente: { id: string; nombre: string } | null;
  porPiloto: Record<string, PactoPiloto>;
  porEquipo: Record<string, PlantillaSiguiente>;
}

/** El split siguiente con el mismo criterio que el panel de economía (orden y luego id, sin
 *  «global»), salvo que las fichas guarden en `pending_splitId` otro destino que sí exista. */
export function splitSiguiente(splits: readonly SplitView[], splitId: string): SplitView | null {
  const actual = splits.find(s => s.id === splitId);
  const guardado = actual?.roster.map(p => (p as FichaGuardada).pending_splitId).find(id => !!id);
  if (guardado) {
    const destino = splits.find(s => s.id === guardado);
    if (destino) return destino;
  }
  const ordenados = splits.filter(s => s.id !== "global")
    .sort((a, b) => (Number(a.orden) || 0) - (Number(b.orden) || 0) || a.id.localeCompare(b.id));
  const i = ordenados.findIndex(s => s.id === splitId);
  return i >= 0 && i < ordenados.length - 1 ? ordenados[i + 1] : null;
}

const numero = (v: unknown): number | null => typeof v === "number" && Number.isFinite(v) ? v : null;

export function pactosDelSplit(splits: readonly SplitView[], splitId: string): PactosSplit | null {
  const actual = splits.find(s => s.id === splitId);
  if (!actual) return null;
  const siguiente = splitSiguiente(splits, splitId);
  const rosterSiguiente = (siguiente?.roster ?? []) as FichaGuardada[];
  const fichaSiguiente = (pilotoId: string) => rosterSiguiente.find(p => p.pilotoId === pilotoId && p.participa_hasta == null);
  const nombres = new Map<string, string>([...rosterSiguiente, ...actual.roster].map(p => [p.pilotoId, p.nombre]));

  const porPiloto: Record<string, PactoPiloto> = {};
  for (const ficha of actual.roster as FichaGuardada[]) {
    const traspaso = resolveTransferView(ficha as TransferPilot, rosterSiguiente as TransferPilot[]);
    const enSiguiente = fichaSiguiente(ficha.pilotoId);
    const hayPacto = ficha.pending_equipoId != null || ficha.pending_precio_compra != null;
    const destino = traspaso?.equipoId ?? enSiguiente?.equipoId ?? null;
    porPiloto[ficha.pilotoId] = {
      pilotoId: ficha.pilotoId,
      nombre: ficha.nombre,
      equipoActual: esEquipo(ficha.equipoId) ? ficha.equipoId : null,
      guardado: hayPacto ? {
        equipoId: ficha.pending_equipoId ?? null, precio: numero(ficha.pending_precio_compra),
        tipo: ficha.pending_tipo_fichaje ?? null, splitId: ficha.pending_splitId ?? null,
      } : null,
      congelado: ficha.congelado === true,
      traspaso,
      destino,
      estadoDestino: traspaso ? traspaso.estado : enSiguiente ? "en_plantilla" : "sin_decidir",
    };
  }

  const equipoIds = [...new Set([
    ...actual.equipos.map(e => e.id),
    ...(siguiente?.equipos.map(e => e.id) ?? []),
  ].filter(esEquipo))];
  const porEquipo: Record<string, PlantillaSiguiente> = Object.fromEntries(equipoIds.map(id => [id, { equipoId: id, siguen: [], llegan: [], seVan: [], sinDecidir: [] }]));

  const movimiento = (pilotoId: string, equipoId: string | null, p: PactoPiloto | null, sig?: FichaGuardada): MovimientoPlantilla => ({
    pilotoId, nombre: nombres.get(pilotoId) ?? pilotoId, equipoId,
    precio: p?.traspaso?.precio ?? numero(sig?.precio_compra),
    tipo: p?.traspaso?.tipo ?? sig?.tipo_fichaje ?? null,
    estado: p?.estadoDestino ?? "en_plantilla",
  });

  for (const p of Object.values(porPiloto)) {
    const origen = p.equipoActual, destino = p.destino;
    if (origen && porEquipo[origen]) {
      if (destino === origen) porEquipo[origen].siguen.push(movimiento(p.pilotoId, origen, p));
      else if (destino === null) porEquipo[origen].sinDecidir.push(movimiento(p.pilotoId, null, p));
      else porEquipo[origen].seVan.push(movimiento(p.pilotoId, destino, p));
    }
    if (esEquipo(destino) && destino !== origen && porEquipo[destino]) {
      porEquipo[destino].llegan.push(movimiento(p.pilotoId, origen, p));
    }
  }
  // Fichas del split siguiente de pilotos que no estaban en el actual: nuevos en la liga.
  for (const sig of rosterSiguiente) {
    if (sig.participa_hasta != null || porPiloto[sig.pilotoId] || !esEquipo(sig.equipoId) || !porEquipo[sig.equipoId]) continue;
    porEquipo[sig.equipoId].llegan.push(movimiento(sig.pilotoId, null, null, sig));
  }

  return { splitId, siguiente: siguiente ? { id: siguiente.id, nombre: siguiente.nombre } : null, porPiloto, porEquipo };
}
