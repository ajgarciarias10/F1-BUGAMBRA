import { doc, serverTimestamp, type Transaction } from "firebase/firestore";
import { db } from "./firebase";

type PurchaseChange = { pilotId: string; pilot: Record<string, any>; oldPrice: number; newPrice: number };
const round = (value: number) => Math.round(value * 10) / 10;

/** Read and validate the original receipts before any correction writes occur. */
export async function preparePurchaseCorrections(tx: Transaction, splitId: string, teamId: string, changes: PurchaseChange[]) {
  const receipts = await Promise.all(changes.map(async change => {
    if (change.oldPrice === change.newPrice) return null;
    if (change.pilot.pacto_origen && change.oldPrice !== change.newPrice) {
      throw new Error("Este precio procede de un pacto entre splits. Modifica el pacto de origen para corregir sus saldos y conservar su anulación.");
    }
    const id = change.pilot.ultima_operacion_id;
    if (!id) return null; // Imported purchases have no reversible receipt.
    const snap = await tx.get(doc(db, `splits/${splitId}/transfers`, id));
    const data = snap.data();
    if (!data || data.estado !== "aplicada" || data.teamId !== teamId || data.pilotoId !== change.pilotId) {
      throw new Error("El justificante del fichaje no está activo o no corresponde a esta ficha.");
    }
    if (typeof data.precio !== "number" || round(data.precio) !== round(change.oldPrice)) {
      throw new Error("El precio de la ficha y el justificante no coinciden. Revisa el historial antes de corregirlos.");
    }
    const previousSellerAmount = Number(data.vendedorDelta ?? 0);
    if (!Number.isFinite(previousSellerAmount) || (data.vendedorId && data.vendedorId === teamId)) {
      throw new Error("El justificante del vendedor no es válido.");
    }
    // Preserve the rule applied at purchase, even if league rules have since changed.
    const sellerAmount = data.vendedorId ? Math.max(0, change.newPrice) : 0;
    return { ref: snap.ref, change, sellerId: data.vendedorId as string | null, sellerAmount,
      sellerDelta: round(sellerAmount - previousSellerAmount) };
  }));
  const totals = new Map<string, number>();
  for (const receipt of receipts) if (receipt?.sellerId && receipt.sellerDelta) {
    totals.set(receipt.sellerId, round((totals.get(receipt.sellerId) ?? 0) + receipt.sellerDelta));
  }
  const sellers = await Promise.all([...totals].map(async ([id, delta]) => {
    const snap = await tx.get(doc(db, `splits/${splitId}/equipos`, id));
    const before = snap.data()?.presupuesto;
    if (!snap.exists() || typeof before !== "number" || !Number.isFinite(before)) throw new Error("El vendedor no tiene un saldo válido.");
    const after = round(before + delta);
    if (delta < 0 && after < 0) throw new Error(`Presupuesto insuficiente del vendedor: faltan ${-after}M.`);
    return { ref: snap.ref, name: snap.data()?.nombre ?? id, before, after, delta };
  }));
  return { receipts, sellers };
}

/** Write after all transaction reads; receipt and seller settle alongside buyer. */
export function writePurchaseCorrections(tx: Transaction, splitId: string, operationId: string,
  plan: Awaited<ReturnType<typeof preparePurchaseCorrections>>, reason: string) {
  for (const receipt of plan.receipts) if (receipt && receipt.change.oldPrice !== receipt.change.newPrice) {
    tx.update(receipt.ref, { precio: receipt.change.newPrice, vendedorDelta: receipt.sellerAmount,
      precio_ajuste_revision: Number(receipt.change.pilot.precio_ajuste_revision ?? 0) + 1 });
  }
  for (const seller of plan.sellers) {
    tx.update(seller.ref, { presupuesto: seller.after });
    tx.set(doc(db, "transacciones", `${operationId}__seller__${seller.ref.id}`), {
      splitId, equipoId: seller.ref.id, equipo: seller.name, tipo: "ajuste", operacionId: operationId,
      cantidad: Math.abs(seller.delta), esIngreso: seller.delta > 0,
      saldo_anterior: seller.before, saldo_nuevo: seller.after,
      descripcion: `Corrección de ingreso por cláusula: ${reason}`, fecha: serverTimestamp(),
    });
  }
}
