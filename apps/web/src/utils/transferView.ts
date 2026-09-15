type TransferType = "subasta" | "clausula" | "mantener" | "fichaje";

export interface TransferPilot {
  pilotoId: string;
  equipoId: string;
  precio_compra?: number | null;
  tipo_fichaje?: TransferType;
  restaurado_desde?: string;
  participa_hasta?: number | null;
  pending_equipoId?: string | null;
  pending_precio_compra?: number | null;
  pending_tipo_fichaje?: TransferType | null;
}

export interface TransferView {
  equipoId: string;
  precio: number;
  tipo?: TransferType;
  estado: "registrado" | "pactado" | "pendiente";
  origen: "actual" | "siguiente";
}

const isTeam = (id?: string | null) => !!id && id !== "agente_libre" && id !== "individual";
const validPrice = (price?: number | null): price is number => price != null && Number.isFinite(price);

// Modelo de lectura: nunca reconstruir pending_* en Firestore para pintar la tabla.
// Esos campos también controlan los cargos y devoluciones del presupuesto.
export function resolveTransferView(pilot: TransferPilot, nextRoster: TransferPilot[]): TransferView | null {
  const next = nextRoster.find(entry => entry.pilotoId === pilot.pilotoId && entry.participa_hasta == null);
  if (isTeam(pilot.pending_equipoId) && validPrice(pilot.pending_precio_compra)) {
    const registered = next?.equipoId === pilot.pending_equipoId && next.precio_compra === pilot.pending_precio_compra;
    return {
      equipoId: pilot.pending_equipoId!, precio: pilot.pending_precio_compra,
      tipo: pilot.pending_tipo_fichaje ?? undefined,
      estado: registered ? "registrado" : "pactado", origen: "actual",
    };
  }
  if (!next) return null;
  if (next.restaurado_desde) return null;
  if (isTeam(next.equipoId) && validPrice(next.precio_compra)) {
    return { equipoId: next.equipoId, precio: next.precio_compra, tipo: next.tipo_fichaje, estado: "registrado", origen: "siguiente" };
  }
  if (next.equipoId === "agente_libre" && isTeam(next.pending_equipoId) && validPrice(next.pending_precio_compra)) {
    return {
      equipoId: next.pending_equipoId!, precio: next.pending_precio_compra,
      tipo: next.pending_tipo_fichaje ?? undefined, estado: "pendiente", origen: "siguiente",
    };
  }
  return null;
}
