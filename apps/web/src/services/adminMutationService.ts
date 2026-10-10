import { collection, doc, getDocs, runTransaction, serverTimestamp, type DocumentReference } from "firebase/firestore";
import { db } from "./firebase";
import { auth } from "./auth";
import {
  clausulaInicialDe,
  mantenerInicialDe,
  precioPilotoEnCarrera,
} from "./economyService";
import { previsualizarCorreccionEconomica } from "../utils/presupuesto";
import { economyRules } from "../utils/economyRules";
import { PRE_HUNGARY_RECONCILIATION, validatePreHungaryPlan } from "../utils/preHungaryReconciliation";

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

/** Temporary, audited, idempotent balance reconciliation for the Split 3 Hungary test. */
export async function applyPreHungaryReconciliation(expectedBalances: Record<string, number>) {
  const plan = validatePreHungaryPlan();
  const { splitId, raceId, operationId, source } = PRE_HUNGARY_RECONCILIATION;
  const splitRef = doc(db, "splits", splitId);
  const raceRef = doc(db, `splits/${splitId}/circuitos`, raceId);
  const markerRef = doc(db, `splits/${splitId}/adminOperations`, operationId);
  const auditRef = doc(db, "admin_audit", operationId);
  const teamRefs = plan.map(team => doc(db, `splits/${splitId}/equipos`, team.id));
  const ledgerRefs = plan.map(team => doc(db, "transacciones", `${operationId}_${team.id}`));

  return runTransaction(db, async transaction => {
    const marker = await transaction.get(markerRef);
    if (marker.exists()) return { applied: false as const, message: "La conciliación pre-Hungría ya se aplicó." };

    const [splitSnap, raceSnap, teamSnaps, ledgerSnaps] = await Promise.all([
      transaction.get(splitRef), transaction.get(raceRef),
      Promise.all(teamRefs.map(ref => transaction.get(ref))),
      Promise.all(ledgerRefs.map(ref => transaction.get(ref))),
    ]);
    if (!splitSnap.exists()) throw new Error("No existe Split 3.");
    if (!raceSnap.exists()) throw new Error("No existe la carrera de Hungría en Split 3.");
    if (raceSnap.data()?.economia_procesada === true) {
      throw new Error("Hungría ya tiene la economía liquidada. Revierte esa liquidación antes de conciliar el saldo pre-carrera.");
    }
    if (teamSnaps.some(snap => !snap.exists())) throw new Error("Falta una escudería del plan. No se modificó ningún saldo.");
    if (ledgerSnaps.some(snap => snap.exists())) throw new Error("Hay movimientos previos con el identificador de esta conciliación. Revisa el ledger antes de continuar.");

    const beforeAfter = plan.map((team, index) => {
      const data = teamSnaps[index].data()!;
      const current = data.presupuesto;
      const opening = data.presupuesto_inicial;
      if (typeof current !== "number" || !Number.isFinite(current)) {
        throw new Error(`El saldo de ${team.name} no es válido; no se modificó ningún equipo.`);
      }
      if (typeof opening !== "number" || Math.round(opening * 10) !== Math.round(team.opening * 10)) {
        throw new Error(`El presupuesto inicial de ${team.name} cambió respecto al Excel revisado. No se aplicó la conciliación.`);
      }
      const expected = expectedBalances[team.id];
      if (!Number.isFinite(expected) || Math.round(current * 10) !== Math.round(expected * 10)) {
        throw new Error(`El saldo actual de ${team.name} cambió desde la vista previa. Recarga y vuelve a revisar.`);
      }
      return { id: team.id, name: team.name, before: current, after: team.target, delta: Math.round((team.target - current) * 10) / 10 };
    });

    for (const [index, balance] of beforeAfter.entries()) {
      transaction.update(teamRefs[index], { presupuesto: balance.after });
      if (balance.delta !== 0) transaction.set(ledgerRefs[index], {
        splitId, equipoId: balance.id, equipo: balance.name, tipo: "ajuste",
        cantidad: Math.abs(balance.delta), esIngreso: balance.delta > 0,
        fecha: serverTimestamp(), descripcion: `Conciliación temporal del saldo pre-Hungría · ${source}`,
        conciliacionId: operationId, saldoAntes: balance.before, saldoDespues: balance.after,
      });
    }
    transaction.set(markerRef, {
      tipo: "conciliacion_pre_hungria", splitId, raceId, source,
      balances: beforeAfter, actorUid: auth.currentUser?.uid ?? null, createdAt: serverTimestamp(),
    });
    transaction.set(auditRef, {
      action: "economy.pre_hungary_reconciliation", target: splitId, summary: source,
      beforeAfter, actorUid: auth.currentUser?.uid ?? null, createdAt: serverTimestamp(),
    });
    const summary = beforeAfter
      .map(balance => `${balance.name} ${balance.before.toFixed(1)}→${balance.after.toFixed(1)}M (${balance.delta > 0 ? "+" : ""}${balance.delta.toFixed(1)}M)`)
      .join(" · ");
    return {
      applied: true as const,
      message: `Conciliación pre-Hungría aplicada y auditada: ${summary}.`,
      balances: beforeAfter,
    };
  });
}
