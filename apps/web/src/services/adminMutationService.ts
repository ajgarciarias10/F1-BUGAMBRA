import { collection, doc, getDocs, increment, runTransaction, serverTimestamp, type DocumentReference } from "firebase/firestore";
import { db } from "./firebase";
import { auth } from "./auth";
import {
  clausulaInicialDe,
  mantenerInicialDe,
  precioPilotoEnCarrera,
  historialPreciosTrasCorreccion,
} from "./economyService";
import { previsualizarCorreccionEconomica } from "../utils/presupuesto";
import { economyRules } from "../utils/economyRules";
import { preparePurchaseCorrections, writePurchaseCorrections } from "./purchaseCorrection";

type AuditedMutation = {
  ref: DocumentReference;
  action: string;
  summary: string;
  apply: (current: Record<string, any> | null) => Record<string, any> | null;
};

/** Apply one admin edit atomically and retain its before/after values for review. */
export async function runAuditedAdminMutation({ ref, action, summary, apply }: AuditedMutation) {
  const auditRef = doc(collection(db, "admin_audit"));
  await runTransaction(db, async transaction => {
    const snapshot = await transaction.get(ref);
    const before = snapshot.exists() ? snapshot.data() : null;
    const after = apply(before);
    if (after === null) {
      if (snapshot.exists()) transaction.delete(ref);
    } else if (snapshot.exists()) {
      transaction.set(ref, after);
    } else transaction.set(ref, after);
    transaction.set(auditRef, {
      action,
      target: ref.path,
      summary,
      before,
      after,
      actorUid: auth.currentUser?.uid ?? null,
      createdAt: serverTimestamp(),
    });
  });
}

type AuditedBatchMutation<T> = {
  refs: DocumentReference[];
  action: string;
  summary: string;
  /**
   * Receives the documents read inside the transaction, keyed by path. Return the
   * full "after" document per path (null deletes), or writes=null for a no-op.
   */
  apply: (currents: Record<string, Record<string, any> | null>) => {
    writes: Record<string, Record<string, any> | null> | null;
    result?: T;
  };
};

/**
 * Multi-document variant: all documents of one edit and ONE audit entry (with the
 * before/after of every touched document) are committed in a single transaction.
 */
export async function runAuditedAdminBatch<T = undefined>({ refs, action, summary, apply }: AuditedBatchMutation<T>) {
  const unique = new Map(refs.map(ref => [ref.path, ref]));
  const auditRef = doc(collection(db, "admin_audit"));
  return runTransaction(db, async transaction => {
    const currents: Record<string, Record<string, any> | null> = {};
    for (const [path, ref] of unique) {
      const snapshot = await transaction.get(ref);
      currents[path] = snapshot.exists() ? snapshot.data() : null;
    }
    const { writes, result } = apply(currents);
    if (!writes || !Object.keys(writes).length) return { changed: false as const, result };
    const before: Record<string, any> = {};
    const after: Record<string, any> = {};
    for (const [path, data] of Object.entries(writes)) {
      const ref = unique.get(path);
      if (!ref) throw new Error(`El documento ${path} no estaba en la operación.`);
      before[path] = currents[path];
      after[path] = data;
      if (data === null) {
        if (currents[path]) transaction.delete(ref);
      } else transaction.set(ref, data);
    }
    transaction.set(auditRef, {
      action,
      target: Object.keys(writes).join(", "),
      summary,
      before,
      after,
      actorUid: auth.currentUser?.uid ?? null,
      createdAt: serverTimestamp(),
    });
    return { changed: true as const, result };
  });
}

export type TeamPriceCorrection = {
  pilotId: string;
  pilotName: string;
  /** Price shown in the preview; the transaction rejects stale snapshots. */
  expectedPrice: number;
  newPrice: number;
};

export type TeamEconomyCorrectionInput = {
  splitId: string;
  teamId: string;
  reason: string;
  /** Balance used to prepare the preview; the transaction rejects a stale value. */
  expectedBalance: number;
  /** Signed adjustment for an already reflected historical discrepancy. */
  manualBudgetAdjustment?: number;
  priceChanges?: TeamPriceCorrection[];
};

/** @deprecated Use TeamEconomyCorrectionInput. */
export type TeamEconomyCorrection = TeamEconomyCorrectionInput;

async function correctionOperationId(input: TeamEconomyCorrectionInput): Promise<string> {
  if (!globalThis.crypto?.subtle) throw new Error("No está disponible el generador seguro de identificadores.");
  const canonical = JSON.stringify({
    splitId: input.splitId,
    teamId: input.teamId,
    reason: input.reason.trim(),
    expectedBalance: input.expectedBalance,
    priceChanges: [...(input.priceChanges ?? [])]
      .sort((a, b) => a.pilotId.localeCompare(b.pilotId))
      .map(change => ({
        pilotId: change.pilotId,
        expectedPrice: change.expectedPrice,
        newPrice: change.newPrice,
      })),
    manualBudgetAdjustment: input.manualBudgetAdjustment ?? 0,
  });
  const digest = await globalThis.crypto.subtle.digest("SHA-256", new TextEncoder().encode(canonical));
  const hex = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
  return `economy_${hex}`;
}

/**
 * Atomically reconcile a team's balance and any transfer prices. This is generic
 * admin plumbing: the caller supplies reviewed prices and any separate manual
 * historical adjustment; the purchase-price deltas are derived from fresh reads.
 *
 * The operation marker makes retries safe, while the audit record captures the
 * complete before/after state in the same transaction as the balance, pilot
 * prices, and ledger entry.
 */
export async function applyTeamEconomyCorrection(input: TeamEconomyCorrectionInput) {
  const { splitId, teamId, reason } = input;
  const priceChanges = input.priceChanges ?? [];
  const manualBudgetAdjustment = input.manualBudgetAdjustment ?? 0;
  if (!splitId || !teamId) {
    throw new Error("Split y equipo son obligatorios.");
  }
  if (!reason.trim()) throw new Error("Indica el motivo de la corrección.");
  if (!Number.isFinite(input.expectedBalance)) throw new Error("El saldo de la vista previa no es válido.");
  if (!Number.isFinite(manualBudgetAdjustment)) throw new Error("El ajuste manual debe ser un número válido.");
  if (priceChanges.some(change => !change.pilotId || change.pilotId.includes("/") || !Number.isFinite(change.expectedPrice) || !Number.isFinite(change.newPrice))) {
    throw new Error("Cada precio corregido debe tener un piloto y precios válidos.");
  }
  if (new Set(priceChanges.map(change => change.pilotId)).size !== priceChanges.length) {
    throw new Error("No repitas el mismo piloto en una corrección.");
  }
  if (manualBudgetAdjustment === 0 && priceChanges.every(change => change.expectedPrice === change.newPrice)) {
    throw new Error("La corrección no contiene cambios.");
  }
  const operationId = await correctionOperationId(input);

  const teamRef = doc(db, `splits/${splitId}/equipos`, teamId);
  const splitRef = doc(db, "splits", splitId);
  const circuitCollection = collection(db, `splits/${splitId}/circuitos`);
  const circuits = await getDocs(circuitCollection);
  const calendarRefs = circuits.docs.map(circuit => circuit.ref);
  const pilotRefs = priceChanges.map(change => doc(
    db,
    `splits/${splitId}/equipos/${teamId}/pilotos`,
    change.pilotId,
  ));
  const operationRef = doc(db, `splits/${splitId}/adminOperations`, operationId);
  const manualLedgerRef = doc(db, "transacciones", `admin_economy__${splitId}__${operationId}__manual`);
  const priceLedgerRefs = priceChanges.map(change => doc(
    db,
    "transacciones",
    `admin_economy__${splitId}__${operationId}__price__${change.pilotId}`,
  ));
  const auditRef = doc(db, "admin_audit", `economy__${splitId}__${operationId}`);

  return runTransaction(db, async transaction => {
    const operationSnap = await transaction.get(operationRef);
    if (operationSnap.exists()) return { applied: false as const, message: "Esta corrección ya se había aplicado." };

    const [teamSnap, splitSnap, circuitSnaps, pilotSnaps] = await Promise.all([
      transaction.get(teamRef),
      transaction.get(splitRef),
      Promise.all(calendarRefs.map(ref => transaction.get(ref))),
      Promise.all(pilotRefs.map(ref => transaction.get(ref))),
    ]);
    if (!teamSnap.exists()) throw new Error("La escudería no existe.");
    if (!splitSnap.exists()) throw new Error("El split no existe.");
    const priceRules = economyRules(splitSnap.data()?.economia_config);
    if (pilotSnaps.some(snap => !snap.exists())) throw new Error("Uno de los pilotos ya no pertenece a esa plantilla.");
    if (pilotSnaps.some(snap => snap.data()?.pending_equipoId || snap.data()?.pending_precio_compra != null)) {
      throw new Error("Deshaz primero el pacto pendiente antes de corregir precios.");
    }

    const teamData = teamSnap.data();
    const oldBalance = teamData.presupuesto;
    if (typeof oldBalance !== "number" || !Number.isFinite(oldBalance)) {
      throw new Error("La escudería no tiene un saldo válido guardado. No se aplicó ningún cambio.");
    }
    if (Math.round(oldBalance * 10) !== Math.round(input.expectedBalance * 10)) {
      throw new Error("El saldo cambió desde la vista previa. Recarga los datos y vuelve a revisar la corrección.");
    }

    const calendar = circuitSnaps.map((snap, index) => ({
      id: snap.id,
      data: snap.data() ?? {},
      fallbackIndex: index,
    })).sort((a, b) => {
      const aOrder = Number(a.data.numero_carrera ?? 0);
      const bOrder = Number(b.data.numero_carrera ?? 0);
      if (aOrder && bOrder) return aOrder - bOrder;
      if (aOrder) return -1;
      if (bOrder) return 1;
      const aDate = a.data.fecha?.toMillis?.() ?? 0;
      const bDate = b.data.fecha?.toMillis?.() ?? 0;
      return aDate !== bDate ? aDate - bDate : a.id.localeCompare(b.id);
    });
    if (!calendar.length) throw new Error("No se puede corregir el precio: este split no tiene carreras configuradas.");
    const firstUnprocessed = calendar.findIndex(circuit => !circuit.data.economia_procesada);
    if (firstUnprocessed >= 0 && calendar.slice(firstUnprocessed + 1).some(circuit => circuit.data.economia_procesada)) {
      throw new Error("Hay carreras posteriores procesadas. Revierte primero la economía desde la última.");
    }
    const nextRaceIndex = firstUnprocessed < 0 ? Math.max(0, calendar.length - 1) : firstUnprocessed;
    const previousRaceIndex = firstUnprocessed < 0 ? nextRaceIndex : nextRaceIndex - 1;

    const beforePilots = pilotSnaps.map((snap, index) => {
      const change = priceChanges[index];
      const data = snap.data()!;
      const oldPrice = Number(data.precio_compra ?? 0);
      if (!Number.isFinite(oldPrice)) throw new Error(`El precio actual de ${change.pilotName} no es válido.`);
      if (Math.round(oldPrice * 10) !== Math.round(change.expectedPrice * 10)) {
        throw new Error(`El precio de ${change.pilotName} cambió desde la vista previa. Recarga antes de aplicar; no se hizo ningún cambio.`);
      }
      return {
        pilotId: change.pilotId,
        pilotName: change.pilotName,
        price: oldPrice,
        mantenerInicial: data.mantener_inicial_split ?? null,
        clausulaInicial: data.clausula_inicial_split ?? null,
        mantenerActual: data.mantener_actual ?? null,
        clausulaActual: data.clausula_actual ?? null,
      };
    });
    const plan = previsualizarCorreccionEconomica(
      oldBalance,
      priceChanges.map((change, index) => ({
        pilotId: change.pilotId,
        pilotName: change.pilotName,
        antes: beforePilots[index].price,
        despues: change.newPrice,
      })),
      manualBudgetAdjustment,
    );
    if (plan.insuficiente) {
      throw new Error(`Presupuesto insuficiente: faltan ${plan.faltante}M.`);
    }
    const newBalance = plan.presupuestoNuevo;
    const budgetDelta = plan.delta;
    const afterPilots = priceChanges.map((change, index) => {
      const pilot = pilotSnaps[index].data()!;
      const carreras = calendar.length;
      const current = precioPilotoEnCarrera(change.newPrice, nextRaceIndex, carreras, priceRules);
      return {
        pilotId: change.pilotId,
        pilotName: change.pilotName,
        price: change.newPrice,
        mantenerInicial: mantenerInicialDe(change.newPrice, priceRules),
        clausulaInicial: clausulaInicialDe(change.newPrice, priceRules),
        mantenerActual: current.mantener,
        clausulaActual: pilot.clausula_manual ?? current.clausula,
      };
    });

    const purchasePlan = await preparePurchaseCorrections(transaction, splitId, teamId, priceChanges.map((change, index) => ({
      pilotId: change.pilotId, pilot: pilotSnaps[index].data()!, oldPrice: beforePilots[index].price, newPrice: change.newPrice,
    })));
    writePurchaseCorrections(transaction, splitId, operationId, purchasePlan, reason.trim());
    transaction.update(teamRef, { presupuesto: newBalance });
    pilotSnaps.forEach((snap, index) => {
      const change = priceChanges[index];
      const pilot = snap.data()!;
      const carreras = calendar.length;
      const currentPrices = precioPilotoEnCarrera(change.newPrice, nextRaceIndex, carreras, priceRules);
      const previousPrices = precioPilotoEnCarrera(change.newPrice, Math.max(0, previousRaceIndex), carreras, priceRules);
      const revision = Number(pilot.precio_ajuste_revision ?? 0) + 1;
      const update: Record<string, unknown> = {
        precio_compra: change.newPrice,
        mantener_inicial_split: mantenerInicialDe(change.newPrice, priceRules),
        clausula_inicial_split: clausulaInicialDe(change.newPrice, priceRules),
        mantener_actual: currentPrices.mantener,
        clausula_actual: pilot.clausula_manual ?? currentPrices.clausula,
        precio_carrera_anterior: previousPrices.mantener,
        precio_ajuste_revision: revision,
      };
      if (pilot.clausula_manual != null) update.clausula_sin_ajuste = currentPrices.clausula;
      Object.assign(update, historialPreciosTrasCorreccion(pilot, change.newPrice, calendar, priceRules));
      transaction.update(snap.ref, update);
    });

    let ledgerBalance = oldBalance;
    plan.cambios.forEach((change, index) => {
      if (change.delta === 0) return;
      const balanceAfter = Math.round((ledgerBalance + change.delta) * 10) / 10;
      transaction.set(priceLedgerRefs[index], {
        splitId,
        equipoId: teamId,
        equipo: teamData.nombre ?? teamId,
        piloto: change.pilotName ?? change.pilotId,
        tipo: "ajuste",
        cantidad: Math.abs(change.delta),
        esIngreso: change.delta > 0,
        saldo_anterior: ledgerBalance,
        saldo_nuevo: balanceAfter,
        descripcion: `Corrección de precio ${change.antes}M → ${change.despues}M. ${reason.trim()}`,
        fecha: serverTimestamp(),
      });
      ledgerBalance = balanceAfter;
    });
    if (plan.ajusteManual !== 0) {
      const balanceAfter = Math.round((ledgerBalance + plan.ajusteManual) * 10) / 10;
      transaction.set(manualLedgerRef, {
        splitId,
        equipoId: teamId,
        equipo: teamData.nombre ?? teamId,
        tipo: "ajuste",
        cantidad: Math.abs(plan.ajusteManual),
        esIngreso: plan.ajusteManual > 0,
        saldo_anterior: ledgerBalance,
        saldo_nuevo: balanceAfter,
        descripcion: `Ajuste histórico manual: ${reason.trim()}`,
        fecha: serverTimestamp(),
      });
    }

    const before = { balance: oldBalance, pilots: beforePilots };
    const after = { balance: newBalance, pilots: afterPilots };
    transaction.set(auditRef, {
      action: "team_economy_correction",
      target: `splits/${splitId}/equipos/${teamId}`,
      summary: reason.trim(),
      before,
      after,
      actorUid: auth.currentUser?.uid ?? null,
      createdAt: serverTimestamp(),
    });
    transaction.set(operationRef, {
      status: "applied",
      splitId,
      teamId,
      operationId,
      reason: reason.trim(),
      priceAdjustments: plan.cambios,
      manualBudgetAdjustment: plan.ajusteManual,
      budgetDelta,
      before,
      after,
      createdAt: serverTimestamp(),
      actorUid: auth.currentUser?.uid ?? null,
    });
    return { applied: true as const, message: "Corrección aplicada.", before, after };
  });
}


/**
 * Fija el presupuesto inicial de una escudería en un split. La diferencia con el anterior se
 * suma al saldo y queda en el libro; si faltaba el dato histórico, solo se rellena.
 */
export async function fijarPresupuestoInicial(splitId: string, teamId: string, teamNombre: string, val: number) {
  if (!Number.isFinite(val)) throw new Error("Importe no válido.");
  await runTransaction(db, async tx => {
    const ref = doc(db, `splits/${splitId}/equipos`, teamId);
    const snap = await tx.get(ref);
    if (!snap.exists()) throw new Error("La escudería no existe.");
    const data = snap.data();
    const anterior = typeof data.presupuesto_inicial === "number" ? data.presupuesto_inicial : null;
    // Si falta el metadato histórico se rellena sin volver a ingresar todo el saldo.
    const delta = anterior == null ? 0 : val - anterior;
    tx.update(ref, { presupuesto_inicial: val, ...(delta ? { presupuesto: increment(delta) } : {}) });
    if (delta) tx.set(doc(collection(db, "transacciones")), { splitId, equipoId: teamId, equipo: teamNombre,
      tipo: "ajuste", cantidad: Math.abs(delta), esIngreso: delta >= 0, descripcion: "Ajuste administrativo del presupuesto inicial", fecha: serverTimestamp() });
  });
}
