import { useState, useEffect, useRef } from "react";
import { collection, getDocs, getDoc, doc, setDoc, updateDoc, deleteDoc, writeBatch, increment, runTransaction, serverTimestamp, deleteField, query, where } from "firebase/firestore";
import { EconomyRulesPanel } from "./EconomyRulesPanel";
import { db } from "../services/firebase";
import {
  procesarEconomiaCarrera, ficharPiloto,
  ajustarPrecioCompraPiloto,
  mantenerInicialDe, clausulaInicialDe,
} from "../services/economyService";
import { Loader2, Trash2, RefreshCw, ArrowRightLeft, FileText } from "lucide-react";
import { resolveTransferView, type TransferView } from "../utils/transferView";
import { previsualizarAjustePrecio } from "../utils/presupuesto";
import { ECONOMY_INCOME_SOURCES, sumEconomyIncomeTransactions, sumEconomyMarketTransactions, sumClausePriceAdjustments, type EconomyIncomeBreakdown } from "../utils/economyIncomeBreakdown";
import { guardarPacto, anularPacto, deshacerAlta, asegurarSplitSiguiente, liberarPiloto as liberarFicha, ajustarClausula } from "../services/transferService";
import { applyTeamEconomyCorrection } from "../services/adminMutationService";
import { economyRules } from "../utils/economyRules";
import { FiaFinancialReportModal } from "./FiaFinancialReportModal";

import { useSingleFlight } from "../hooks/useSingleFlight";
// ─── TYPES ────────────────────────────────────────────────────────────────────

interface CircuitoCol {
  id: string;
  nombre: string;
  ts: number;
  completado: boolean;
  economia_procesada: boolean;
}

type TipoFichaje = "subasta" | "clausula" | "mantener";

interface PilotRow {
  id: string;
  nombre: string;
  equipoId: string;
  equipoNombre: string;
  splitId: string;
  precio_compra: number;
  mantener_actual: number;
  clausula_actual: number;
  mantener_inicial_split: number;
  clausula_inicial_split: number;
  historial: Record<string, { mantener: number | null; clausula: number | null; congelado?: boolean }>;
  isLegacy: boolean;
  tipo_fichaje?: TipoFichaje;
  congelado: boolean;
  congelado_en?: string;
  pending_equipoId?: string;
  pending_precio_compra?: number;
  pending_tipo_fichaje?: TipoFichaje;
  // Rendimiento
  puntos_piloto: number;
  rating_piloto: number;
  victorias: number;
  podios: number;
  dnfs: number;
  carreras_limpias: number;
}

interface TeamRow {
  id: string;
  nombre: string;
  presupuesto: number | null;
  presupuesto_inicial: number | null;
  puntos_constructores: number;
  poles: number;
  vueltas_rapidas: number;
  sin_sanc: number;
  ingresos: EconomyIncomeBreakdown;
  movimientos_mercado: number;
  asientos_mercado: number;
  ajustes_clausulas: number;
  asientos_clausulas: number;
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function toMs(fecha: any): number {
  if (!fecha) return 0;
  if (typeof fecha?.toMillis === "function") return fecha.toMillis();
  if (typeof fecha === "string") return new Date(fecha).getTime() || 0;
  if (fecha instanceof Date) return fecha.getTime();
  return 0;
}

function r1(n: number | null | undefined): string {
  if (n == null || isNaN(n as number)) return "—";
  return (Math.round((n as number) * 10) / 10).toFixed(1);
}

function cellBg(val: number | null): string {
  if (val == null) return "text-ink-muted";
  if (val < 0) return "text-brand font-bold";
  if (val > 150) return "text-warn font-bold";
  if (val > 80) return "text-ink font-bold";
  return "text-ink-2";
}

function ratingColor(r: number): string {
  if (r >= 85) return "text-warn font-bold";
  if (r >= 75) return "text-ink font-bold";
  if (r >= 65) return "text-ink-2";
  return "text-ink-muted";
}

const TIPO_LABEL: Record<TipoFichaje | "fichaje", string> = { subasta: "SUB", clausula: "CL", mantener: "MNT", fichaje: "FIC" };
// «Pactado» describe solo el pacto que todavía no se ha aplicado. Un traspaso ya
// escrito en el split siguiente también es una operación cerrada, aunque su ficha
// de este split ya no esté congelada.
const OPERACION_LABEL = { pactado: "pactado", registrado: "fichado", pendiente: "pendiente" } as const;
const TIPO_COLORS: Record<TipoFichaje | "fichaje", string> = {
  fichaje: "bg-ok-soft text-ok",
  subasta: "bg-brand/20 text-brand/80",
  clausula: "bg-warn-soft text-warn",
  mantener: "bg-info-soft text-info",
};

const LEGACY_PREFIX = "piloto_";

// ─── COMPONENT ────────────────────────────────────────────────────────────────

export function EconomyAdminPanel({ splits }: { splits: any[] }) {
  const { run: runOnce, pending: pendingOnce } = useSingleFlight();
  const activeSplits = splits
    .filter((s: any) => s.id !== "global" && s.id !== "origins" && s.tipo !== "individual")
    .sort((a: any, b: any) => Number(a.orden ?? 999) - Number(b.orden ?? 999));
  const [selectedSplitId, setSelectedSplitId] = useState(activeSplits.find((split: any) => split.id === "split_1")?.id ?? activeSplits[0]?.id ?? "");
  const [circuits, setCircuits] = useState<CircuitoCol[]>([]);
  const [teams, setTeams] = useState<TeamRow[]>([]);
  const [pilots, setPilots] = useState<PilotRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showLegacy, setShowLegacy] = useState(false);
  const [reprocesando, setReprocesando] = useState<string | null>(null);
  const [editingBudget, setEditingBudget] = useState<Record<string, string>>({});
  const [savingBudget, setSavingBudget] = useState<string | null>(null);
  const [processLog, setProcessLog] = useState<string[]>([]);
  const selectedEconomyRules = economyRules(splits.find((split: any) => split.id === selectedSplitId)?.economia_config);
  const [viewMode, setViewMode] = useState<"precios" | "rendimiento">("precios");
  const [fiaReportOpen, setFiaReportOpen] = useState(false);
  const [rawLedgerEntries, setRawLedgerEntries] = useState<any[]>([]);
  const loadRequestRef = useRef(0);

  // Modal de fichaje
  const [fichajeModal, setFichajeModal] = useState<PilotRow | null>(null);
  const [fichajeEquipoId, setFichajeEquipoId] = useState("");
  const [fichajeTipo, setFichajeTipo] = useState<TipoFichaje>("subasta");
  const [pendingPrecioCompra, setPendingPrecioCompra] = useState("");
  const [confirmingFichaje, setConfirmingFichaje] = useState(false);

  // Apertura derivada del bloque anterior

  // Alta manual de pilotos en el split (liga nueva, debutantes, incorporaciones fuera de mercado)
  const [globalPilots, setGlobalPilots] = useState<Array<{ id: string; nombre: string }>>([]);
  const [altaModalOpen, setAltaModalOpen] = useState(false);
  const [altaPilotoId, setAltaPilotoId] = useState("");
  const [altaEquipoId, setAltaEquipoId] = useState("");
  const [altaPrecio, setAltaPrecio] = useState("");
  const [altaMsg, setAltaMsg] = useState("");
  const [confirmingAlta, setConfirmingAlta] = useState(false);

  useEffect(() => {
    if (selectedSplitId) loadData(selectedSplitId);
  }, [selectedSplitId]);

  useEffect(() => {
    if (!activeSplits.some((split: any) => split.id === selectedSplitId)) {
      setSelectedSplitId(activeSplits[0]?.id ?? "");
    }
  }, [splits, selectedSplitId]);

  // ─── HELPERS DE PRESUPUESTO ──────────────────────────────────────────────────

  /**
   * Presupuesto disponible de una escudería, con el precio de un piloto sustituido.
   *
   * El presupuesto guardado ya refleja TODO lo cobrado: los fichajes de este split
   * y los pactos confirmados, que descuentan en el momento de hacerse. Esta función
   * lo recalculaba desde cero como `inicial − coste de la plantilla − pactos
   * entrantes`, y eso cobraba dos veces: el inicial es el presupuesto heredado, es
   * decir, lo que quedó DESPUÉS de pagar a esa plantilla en el split anterior.
   * El resultado era que el presupuesto «anterior a los acuerdos» aparecía con el
   * coste de cada fichaje restado, y al editar un precio ese cálculo se guardaba.
   *
   * Ahora solo se aplica la diferencia del precio que se está editando.
   */
  // ─── CARGA DE DATOS ──────────────────────────────────────────────────────────

  async function loadData(splitId: string) {
    const requestId = ++loadRequestRef.current;
    setLoading(true);
    setLoadError(null);
    setCircuits([]);
    setTeams([]);
    setPilots([]);
    try {
      const circSnap = await getDocs(collection(db, `splits/${splitId}/circuitos`));
      const rawCircs = circSnap.docs.map(d => {
        const data = d.data() as any;
        return {
          id: d.id, nombre: data.nombre || d.id, ts: toMs(data.fecha),
          orden: data.numero_carrera ?? 0, completado: !!data.completado,
          economia_procesada: !!data.economia_procesada, resultados: data.resultados,
          economia_reglas_aplicadas: data.economia_reglas_aplicadas,
        };
      });
      const sortedCircs = [...rawCircs].sort((a, b) => {
        if (a.orden && b.orden) return a.orden - b.orden;
        if (a.orden) return -1; if (b.orden) return 1;
        if (a.ts !== b.ts) return a.ts - b.ts;
        return a.id.localeCompare(b.id);
      });
      const nextCircuits = sortedCircs.map(c => ({ id: c.id, nombre: c.nombre, ts: c.ts, completado: c.completado, economia_procesada: !!c.economia_procesada }));

      const teamsSnap = await getDocs(collection(db, `splits/${splitId}/equipos`));
      const newTeams: TeamRow[] = [];
      const teamNameMap: Record<string, string> = {};
      for (const teamDoc of teamsSnap.docs) {
        const td = teamDoc.data() as any;
        // La bolsa de agentes libres no es una escudería: sus pilotos sí salen en la
        // tabla de abajo, agrupados como libres, pero aquí no tiene fila.
        if (teamDoc.id === "agente_libre") {
          teamNameMap[teamDoc.id] = "Agente libre";
          continue;
        }
        newTeams.push({
          id: teamDoc.id, nombre: td.nombre || teamDoc.id,
          presupuesto: typeof td.presupuesto === "number" && Number.isFinite(td.presupuesto) ? td.presupuesto : null,
          presupuesto_inicial: td.presupuesto_inicial ?? null,
          puntos_constructores: td.puntos_constructores ?? 0,
          poles: 0, vueltas_rapidas: 0, sin_sanc: 0,
          ingresos: { points: 0, pole: 0, fastestLap: 0, participation: 0, cleanTeam: 0, rivalry: 0, seasonPrize: 0 },
          movimientos_mercado: 0,
          asientos_mercado: 0,
          ajustes_clausulas: 0,
          asientos_clausulas: 0,
        });
        teamNameMap[teamDoc.id] = td.nombre || teamDoc.id;
      }

      const pilotosSnap = await getDocs(collection(db, "pilotos"));
      const pilotGlobalMap: Record<string, any> = {};
      pilotosSnap.docs.forEach(d => { pilotGlobalMap[d.id] = d.data(); });

      const allPilots: PilotRow[] = [];
      for (const teamDoc of teamsSnap.docs) {
        const pilotosSubSnap = await getDocs(collection(db, `splits/${splitId}/equipos/${teamDoc.id}/pilotos`));
        for (const rDoc of pilotosSubSnap.docs) {
          const pd = rDoc.data() as any;
          const pg = pilotGlobalMap[rDoc.id] || {};
          const hist: Record<string, { mantener: number | null; clausula: number | null; congelado?: boolean }> = {};
          sortedCircs.forEach(c => {
            const h = pd.historial_precios?.[c.id];
            hist[c.id] = { mantener: h?.mantener ?? null, clausula: h?.clausula ?? null, congelado: h?.congelado ?? false };
          });
          allPilots.push({
            id: rDoc.id,
            nombre: pg.nombre || rDoc.id,
            equipoId: teamDoc.id,
            equipoNombre: teamNameMap[teamDoc.id] || teamDoc.id,
            splitId,
            precio_compra:          pd.precio_compra ?? 0,
            mantener_actual:        pd.mantener_actual ?? 0,
            clausula_actual:        pd.clausula_actual ?? 0,
            mantener_inicial_split: pd.mantener_inicial_split ?? 0,
            clausula_inicial_split: pd.clausula_inicial_split ?? 0,
            historial:    hist,
            isLegacy:     false,
            tipo_fichaje: pd.tipo_fichaje,
            congelado:    !!pd.congelado,
            congelado_en: pd.congelado_en,
            pending_equipoId:      pd.pending_equipoId,
            pending_precio_compra: pd.pending_precio_compra,
            pending_tipo_fichaje:  pd.pending_tipo_fichaje,
            // Rendimiento
            puntos_piloto:   pd.puntos_piloto   ?? 0,
            rating_piloto:   pd.rating_piloto   ?? 70,
            victorias:       pd.victorias       ?? 0,
            podios:          pd.podios          ?? 0,
            dnfs:            pd.dnfs            ?? 0,
            carreras_limpias: pd.carreras_limpias ?? 0,
          });
        }
      }

      if (splitId !== "split_1") {
        const nombreSet = new Set(
          allPilots.filter(p => !p.id.startsWith(LEGACY_PREFIX)).map(p => p.nombre.toLowerCase().trim())
        );
        allPilots.forEach(p => {
          if (p.id.startsWith(LEGACY_PREFIX) && nombreSet.has(p.nombre.toLowerCase().trim())) p.isLegacy = true;
        });
      }

      const pilotTeam: Record<string, string> = {};
      allPilots.forEach(p => { pilotTeam[p.id] = p.equipoId; });

      for (const c of rawCircs) {
        if (!c.completado || !Array.isArray(c.resultados)) continue;
        const pole = c.resultados.find((r: any) => r.qualyPos === 1);
        const fl   = c.resultados.find((r: any) => r.fastestLap);
        const allClean = c.resultados.every((r: any) => r.isClean);
        if (pole) { const t = newTeams.find(t => t.id === pilotTeam[pole.pilotoId]); if (t) t.poles++; }
        if (fl)   { const t = newTeams.find(t => t.id === pilotTeam[fl.pilotoId]);   if (t) t.vueltas_rapidas++; }
        if (allClean) {
          const teamsInRace = new Set(c.resultados.map((r: any) => pilotTeam[r.pilotoId]).filter(Boolean));
          teamsInRace.forEach(tid => { const t = newTeams.find(t => t.id === tid); if (t) t.sin_sanc++; });
        }
      }

      // Usa los asientos realmente guardados, con el mismo tipo de fuente que
      // registró el cálculo. Así el panel no vuelve a simular reglas por su cuenta.
      const incomeLedger = await getDocs(query(
        collection(db, "transacciones"),
        where("splitId", "==", splitId),
      ));
      for (const team of newTeams) {
        const entries = incomeLedger.docs
          .map(entry => entry.data())
          .filter(data => data.equipoId === team.id) as Array<{ tipo: any; cantidad?: number; esIngreso?: boolean; piloto?: string; descripcion?: string }>;
        team.ingresos = sumEconomyIncomeTransactions(entries);
        team.movimientos_mercado = sumEconomyMarketTransactions(entries);
        team.asientos_mercado = entries.filter(entry => ["fichaje", "clausula", "subasta", "piloto_negativo"].includes(entry.tipo)).length;
        team.ajustes_clausulas = sumClausePriceAdjustments(entries);
        team.asientos_clausulas = entries.filter(entry => entry.tipo === "ajuste" && (
          Boolean(entry.piloto) ||
          Boolean(entry.descripcion?.toLowerCase().includes("precio")) ||
          Boolean(entry.descripcion?.toLowerCase().includes("cláusula")) ||
          Boolean(entry.descripcion?.toLowerCase().includes("clausula"))
        )).length;
      }

      if (requestId !== loadRequestRef.current) return;
      setRawLedgerEntries(incomeLedger.docs.map(entry => ({ id: entry.id, ...entry.data() })));
      setGlobalPilots(
        Object.entries(pilotGlobalMap)
          .map(([id, data]) => ({ id, nombre: (data as any).nombre || id }))
          .sort((a, b) => a.nombre.localeCompare(b.nombre))
      );
      setCircuits(nextCircuits);
      setTeams(newTeams.sort((a, b) => a.nombre.localeCompare(b.nombre)));
      setPilots(allPilots.sort((a, b) => a.equipoNombre.localeCompare(b.equipoNombre) || a.nombre.localeCompare(b.nombre)));
    } catch (error: any) {
      if (requestId === loadRequestRef.current) {
        setLoadError(`No se pudo cargar la economía de ${splitId}: ${error?.message || "error desconocido"}`);
      }
    } finally {
      if (requestId === loadRequestRef.current) setLoading(false);
    }
  }

  // ─── ACCIONES ────────────────────────────────────────────────────────────────

  async function procesarEconomia(circuit: CircuitoCol) {
    return runOnce(async () => {
    if (circuit.economia_procesada) return;
    setReprocesando(circuit.id);
    setProcessLog([`Procesando ${circuit.nombre}…`]);
    try {
      const circuitIndex = circuits.findIndex(c => c.id === circuit.id);
      const previousCircuitIds = circuits.slice(0, circuitIndex).map(c => c.id);
      // Si procesarEconomiaCarrera sale por un guard temprano (acta sin cerrar, ya
      // procesada...) no llama a onProgress ni una vez: el log se quedaría congelado en
      // "Procesando..." si no se pinta también el mensaje final aquí.
      const result = await procesarEconomiaCarrera(selectedSplitId, circuit.id, circuit.nombre, (msg) => setProcessLog(prev => [...prev, msg]), previousCircuitIds);
      setProcessLog(prev => [...prev, result.message]);
      await loadData(selectedSplitId);
    } catch (err: any) {
      setProcessLog(prev => [...prev, `Error: ${err.message}`]);
    } finally {
      setReprocesando(null);
    }
  });
}

  async function fixFichajePricesHistorial(circuit: CircuitoCol) {
    return runOnce(async () => {
    setReprocesando(circuit.id);
    setProcessLog([`Corrigiendo precios pactados en ${circuit.nombre}…`]);
    try {
      const circuitIndex = circuits.findIndex(c => c.id === circuit.id);
      const previousCircuitIds = circuits.slice(0, circuitIndex).map(c => c.id);
      const equiposSnap = await getDocs(collection(db, `splits/${selectedSplitId}/equipos`));
      const batch = writeBatch(db);
      let fixed = 0;
      for (const equipoDoc of equiposSnap.docs) {
        const pilotosSnap = await getDocs(collection(db, `splits/${selectedSplitId}/equipos/${equipoDoc.id}/pilotos`));
        for (const pd of pilotosSnap.docs) {
          const d = pd.data();
          const hasPendingTransfer = d.pending_equipoId != null || d.pending_precio_compra != null;
          if (!d.congelado && !hasPendingTransfer) continue;
          const isFrozenHere = (() => {
            if (!d.congelado_en) return true;
            return previousCircuitIds.includes(d.congelado_en);
          })();
          if (!isFrozenHere) continue;
          const existingEntry = d.historial_precios?.[circuit.id];
          if (existingEntry && (existingEntry.mantener != null || existingEntry.clausula != null)) {
            batch.update(pd.ref, { [`historial_precios.${circuit.id}`]: { carrera: circuit.nombre, mantener: null, clausula: null, congelado: true } });
            fixed++;
          }
        }
      }
      await batch.commit();
      setProcessLog([`✓ ${fixed} piloto(s) corregidos en ${circuit.nombre}`]);
      await loadData(selectedSplitId);
    } catch (err: any) {
      setProcessLog(prev => [...prev, `Error: ${err.message}`]);
    } finally {
      setReprocesando(null);
    }
  });
}

  async function savePresupuestoInicial(team: TeamRow, rawVal: string) {
    return runOnce(async () => {
    const val = Number(rawVal.replace(",", "."));
    if (!rawVal.trim() || !Number.isFinite(val)) return;
    setSavingBudget(team.id);
    try {
    await runTransaction(db, async tx => {
      const ref = doc(db, `splits/${selectedSplitId}/equipos`, team.id);
      const snap = await tx.get(ref);
      if (!snap.exists()) throw new Error("La escudería no existe.");
      const data = snap.data();
      const anterior = typeof data.presupuesto_inicial === "number" ? data.presupuesto_inicial : null;
      // Si falta el metadato histórico se rellena sin volver a ingresar todo el saldo.
      const delta = anterior == null ? 0 : val - anterior;
      tx.update(ref, { presupuesto_inicial: val, ...(delta ? { presupuesto: increment(delta) } : {}) });
      if (delta) tx.set(doc(collection(db, "transacciones")), { splitId: selectedSplitId, equipoId: team.id, equipo: team.nombre,
        tipo: "ajuste", cantidad: Math.abs(delta), esIngreso: delta >= 0, descripcion: "Ajuste administrativo del presupuesto inicial", fecha: serverTimestamp() });
    });
    setEditingBudget(prev => { const n = { ...prev }; delete n[team.id]; return n; });
    await loadData(selectedSplitId);
    } catch (error: any) { setProcessLog([error.message]); }
    finally { setSavingBudget(null); }
  });
}

  async function applyBudgetAdjustment(team: TeamRow, delta: number, reason: string) {
    return runOnce(async () => {
    if (team.presupuesto == null) {
      setProcessLog([`No se puede ajustar ${team.nombre}: falta un saldo registrado.`]);
      return;
    }
    const result = await applyTeamEconomyCorrection({
      splitId: selectedSplitId,
      teamId: team.id,
      expectedBalance: team.presupuesto,
      reason,
      manualBudgetAdjustment: delta,
    });
    if (result.applied) await loadData(selectedSplitId);
    setProcessLog([result.message]);
  });
}

  async function savePrecio(pilot: PilotRow, rawVal: string) {
    return runOnce(async () => {
    const newPrecio = Number(rawVal.replace(",", "."));
    if (!rawVal.trim() || !Number.isFinite(newPrecio)) return;
    const reason = prompt(`Motivo para corregir el precio de ${pilot.nombre} (${pilot.precio_compra}M → ${newPrecio}M):`);
    if (!reason?.trim()) return;
    setSavingId(pilot.id);
    try {
    const team = teams.find(row => row.id === pilot.equipoId);
    if (!team) throw new Error("No se encontró el saldo actual de la escudería. Recarga la tabla.");
    if (team.presupuesto == null) throw new Error(`No se puede corregir el precio: falta el saldo registrado de ${team.nombre}.`);
    const result = await applyTeamEconomyCorrection({
      splitId: pilot.splitId,
      teamId: pilot.equipoId,
      expectedBalance: team.presupuesto,
      reason,
      priceChanges: [{ pilotId: pilot.id, pilotName: pilot.nombre, expectedPrice: pilot.precio_compra, newPrice: newPrecio }],
    });
    if (!result.applied) throw new Error(result.message);
    setEditing(prev => { const n = { ...prev }; delete n[pilot.id]; return n; });
    setProcessLog([result.message]);
    await loadData(pilot.splitId);
    } catch (error: any) { setProcessLog([error.message]); }
    finally { setSavingId(null); }
  });
}

  /**
   * Saca al piloto de su escudería y lo deja como agente libre en ese mismo split.
   *
   * Hasta ahora no había forma de corregir una ficha mal puesta: si el piloto no
   * tenía pacto, el botón de la fila solo llevaba al split siguiente, y la papelera
   * únicamente aparecía en las fichas legacy. Una renovación escrita por error se
   * quedaba ahí para siempre.
   *
   * No toca presupuestos —liberar no devuelve lo invertido— ni ningún otro split.
   */
  /**
   * Saca al piloto de su escudería y lo deja como agente libre en ese mismo split.
   *
   * No mueve dinero, y es deliberado: en este modelo el gasto va atado al PACTO,
   * no a la ficha. Cobrar o devolver aquí el `precio_compra` inventaría un
   * movimiento que nadie hizo —una ficha puede estar mal puesta sin que se haya
   * pagado nunca por ella—. Quien mueve dinero es pactar y deshacer el pacto.
   *
   * Hasta ahora esta acción no existía: si el piloto no tenía pacto pendiente, el
   * botón de la fila solo llevaba al split siguiente y la papelera aparecía únicamente
   * en las fichas legacy, así que una ficha escrita por error se quedaba para siempre.
   */
  async function liberarPiloto(pilot: PilotRow) {
    return runOnce(async () => {
    if (pilot.equipoId === "agente_libre") return;
    const splitNombre = splits.find((s: any) => s.id === pilot.splitId)?.nombre ?? pilot.splitId;
    if (!confirm(
      `¿Sacar a ${pilot.nombre} de ${pilot.equipoNombre} y dejarlo como agente libre en ${splitNombre}?\n\n` +
      `Su ficha pasa a agentes libres con precio 0 y sin pacto.\n` +
      `No se toca ningún presupuesto: el dinero solo se mueve al pactar un fichaje o al deshacerlo.\n` +
      `No se toca ningún otro split.\n\n` +
      `¿Continuar?`
    )) return;

    setDeletingId(pilot.id);
    try {
      await liberarFicha(pilot.splitId, pilot.equipoId, pilot.id, pilot.nombre, pilot.equipoNombre);
      setProcessLog([`${pilot.nombre} ya figura como agente libre en ${splitNombre}. Su ficha en ${pilot.equipoNombre} se ha retirado. Ningún presupuesto se ha movido.`]);
      await loadData(pilot.splitId);
    } catch (err: any) {
      setProcessLog([`No se ha podido liberar a ${pilot.nombre}: ${err.message}`]);
    } finally {
      setDeletingId(null);
    }
  });
}

  async function deleteLegacy(pilot: PilotRow) {
    return runOnce(async () => {
    setDeletingId(pilot.id);
    await deleteDoc(doc(db, `splits/${pilot.splitId}/equipos/${pilot.equipoId}/pilotos`, pilot.id));
    await loadData(pilot.splitId);
    setDeletingId(null);
  });
}

  // ─── PROPAGACIÓN AL SIGUIENTE SPLIT ─────────────────────────────────────────

  function getNextSplitId(currentSplitId: string): string | null {
    const sorted = splits
      .filter((s: any) => s.id !== "global")
      .sort((a: any, b: any) => (Number(a.orden) || 0) - (Number(b.orden) || 0) || a.id.localeCompare(b.id));
    const idx = sorted.findIndex((s: any) => s.id === currentSplitId);
    if (idx < 0 || idx >= sorted.length - 1) return null;
    return sorted[idx + 1].id;
  }

  // ─── ALTA MANUAL EN EL SPLIT ─────────────────────────────────────────────────

  function openAltaModal() {
    setAltaPilotoId(altaCandidates[0]?.id ?? "");
    setAltaEquipoId(teams.find(t => t.id !== "agente_libre")?.id ?? teams[0]?.id ?? "");
    setAltaPrecio("");
    setAltaMsg("");
    setAltaModalOpen(true);
  }

  async function confirmAlta() {
    return runOnce(async () => {
    const precio = parseFloat(altaPrecio);
    if (!altaPilotoId || !altaEquipoId || Number.isNaN(precio)) return;
    setConfirmingAlta(true);
    setAltaMsg("");
    try {
      const result = await ficharPiloto({
        splitId:   selectedSplitId,
        teamId:    altaEquipoId,
        teamName:  teams.find(t => t.id === altaEquipoId)?.nombre ?? altaEquipoId,
        pilotoId:  altaPilotoId,
        pilotName: globalPilots.find(p => p.id === altaPilotoId)?.nombre ?? altaPilotoId,
        tipo:      "fichaje",
        precio,
      });
      if (!result.success) {
        setAltaMsg(result.message);
        return;
      }
      setAltaModalOpen(false);
      try {
        await loadData(selectedSplitId);
      } catch (error: any) {
        setProcessLog([`${result.message}`, `El fichaje se guardó, pero no se pudo actualizar la vista: ${error.message}. Recarga el split para confirmar el saldo y la plantilla.`]);
      }
    } catch (error: any) {
      setAltaMsg(`No se pudo completar el fichaje: ${error.message}`);
    } finally {
      setConfirmingAlta(false);
    }
  });
}

  // ─── SISTEMA DE FICHAJES ─────────────────────────────────────────────────────

  function handleFichar(pilot: PilotRow) {
    const transfer = transferViews.get(pilot.id);
    if (transfer?.origen === "siguiente" && nextSplit) {
      setSelectedSplitId(nextSplit.id);
      return;
    }
    if (pilot.congelado) {
      deshacerFichaje(pilot);
    } else {
      setFichajeEquipoId(pilot.equipoId !== "agente_libre" ? pilot.equipoId : (teams[0]?.id ?? ""));
      setFichajeTipo("subasta");
      // Por defecto, el precio de referencia es mantener_actual (mínimo para pujar)
      setPendingPrecioCompra(String(pilot.mantener_actual || pilot.precio_compra || ""));
      setFichajeModal(pilot);
    }
  }

  function handleFichajeTipoChange(tipo: TipoFichaje) {
    setFichajeTipo(tipo);
    if (!fichajeModal) return;
    // Autocompletar el precio de referencia según el tipo de operación
    if (tipo === "clausula") {
      setPendingPrecioCompra(String(fichajeModal.clausula_actual));
    } else if (tipo === "mantener") {
      setPendingPrecioCompra(String(fichajeModal.mantener_actual));
    }
    // Para subasta, se deja libre (precio de mercado)
  }

  async function deshacerFichaje(pilot: PilotRow) {
    return runOnce(async () => {
    const nextSplitId = getNextSplitId(pilot.splitId);
    const nextSplitNombre = splits.find((s: any) => s.id === nextSplitId)?.nombre ?? "el siguiente split";
    if (!confirm(
      `¿Deshacer el fichaje de ${pilot.nombre}?\n\n` +
      `Se anula el pacto de este split y se devuelve el importe al presupuesto del equipo que fichaba.` +
      (nextSplitId
        ? `\nEn ${nextSplitNombre} vuelve al estado que tenía antes del pacto. Si el pacto es antiguo y no quedó guardado ese estado, se le retirará de ${nextSplitNombre} y se te avisará.`
        : "") +
      `\n\n¿Continuar?`
    )) return;

    setDeletingId(pilot.id);
    try {
      const resultado = await anularPacto(pilot.splitId, pilot.equipoId, pilot.id, nextSplitId);
      setProcessLog([`Pacto de ${pilot.nombre} anulado y movimiento económico compensado.`,
        ...(resultado === "sin-foto" ? ["El pacto antiguo no guardó la ficha anterior: revisa la plantilla del split de destino."] : [])]);
      await loadData(pilot.splitId);
    } catch (error: any) {
      setProcessLog([`No se ha anulado el pacto: ${error.message}`]);
    } finally {
      setDeletingId(null);
    }
  });
}

  async function confirmFichaje() {
    return runOnce(async () => {
    if (!fichajeModal || !fichajeEquipoId) return;
    const pendingPrice = Number(pendingPrecioCompra.replace(",", "."));
    if (!pendingPrecioCompra.trim() || !Number.isFinite(pendingPrice)) return;

    setConfirmingFichaje(true);
    try {
      const pilot = fichajeModal;
      const lastDone = [...circuits].filter(c => c.completado).at(-1);
      let nextSplitId = getNextSplitId(pilot.splitId);
      const avisos: string[] = [];
      if (!nextSplitId) {
        const origenNombre = splits.find((s: any) => s.id === pilot.splitId)?.nombre ?? "este split";
        if (!confirm(
          `Todavía no existe el split siguiente a ${origenNombre}.\n\n` +
          `Se creará vacío, sin calendario, para guardar el pacto de ${pilot.nombre}. ` +
          `Las escuderías parten de su saldo actual. Al terminar ${origenNombre}, usa «Inicializar» para completarlo.\n\n¿Continuar?`
        )) return;
        const siguiente = await asegurarSplitSiguiente(pilot.splitId);
        nextSplitId = siguiente.id;
        if (siguiente.creado) avisos.push(`${siguiente.nombre} creado vacío para guardar el pacto. Añade su calendario cuando lo tengáis.`);
      }
      await guardarPacto({
        splitId: pilot.splitId, nextSplitId, equipoOrigenId: pilot.equipoId,
        pilotoId: pilot.id, equipoDestinoId: fichajeEquipoId, precio: pendingPrice,
        tipo: fichajeTipo, circuitoId: lastDone?.id ?? null,
      });

      if (avisos.length) setProcessLog(avisos);
      setFichajeModal(null);
      setPendingPrecioCompra("");
    } catch (error: any) {
      setProcessLog([`No se ha guardado el pacto: ${error.message}`]);
    } finally {
      setConfirmingFichaje(false);
    }
    await loadData(fichajeModal!.splitId);
  });
}

  // ─── DERIVED STATE ───────────────────────────────────────────────────────────

  // Pilotos del catálogo global que aún no tienen ficha en este split.
  const altaCandidates = globalPilots.filter(gp => !pilots.some(p => p.id === gp.id && p.equipoId !== "agente_libre"));

  const visiblePilots = showLegacy ? pilots : pilots.filter(p => !p.isLegacy);
  const selectedIndex = activeSplits.findIndex(split => split.id === selectedSplitId);
  const nextSplit = selectedIndex >= 0 ? activeSplits[selectedIndex + 1] : undefined;
  const transferViews = new Map<string, TransferView | null>(pilots.map(pilot => [
    pilot.id,
    resolveTransferView({ ...pilot, pilotoId: pilot.id }, nextSplit?.roster ?? []),
  ]));
  const legacyCount = pilots.filter(p => p.isLegacy).length;
  const grouped = visiblePilots.reduce<Record<string, PilotRow[]>>((acc, p) => {
    (acc[p.equipoNombre] = acc[p.equipoNombre] || []).push(p);
    return acc;
  }, {});

  // ─── RENDER ──────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-10">
      {selectedSplitId && <EconomyRulesPanel key={selectedSplitId} splitId={selectedSplitId} />}

      {/* ── CONTROLES ── */}
      <div className="flex items-center justify-between flex-wrap gap-4 border-b border-line pb-6">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[9px] font-mono uppercase tracking-[0.4em] text-ink-muted shrink-0">Split</span>
          <div className="flex gap-0.5">
            {activeSplits.map((s: any) => (
              <button key={s.id} onClick={() => setSelectedSplitId(s.id)}
                className={`px-5 py-2 text-[10px] font-bold tracking-[0.2em] uppercase transition-all ${
                  selectedSplitId === s.id ? "bg-brand text-brand-ink" : "bg-surface-3 text-ink-muted hover:bg-surface-3 hover:text-ink-2"
                }`}>
                {s.nombre}
              </button>
            ))}
          </div>
          {loading && <Loader2 className="w-4 h-4 animate-spin text-ink-muted" />}
        </div>
        <div className="flex items-center gap-4 ml-auto">
          {legacyCount > 0 && (
            <button onClick={() => setShowLegacy(!showLegacy)}
              className={`text-[9px] font-mono uppercase tracking-[0.3em] transition-colors ${showLegacy ? "text-brand" : "text-ink-muted hover:text-ink-2"}`}>
              {showLegacy ? `Ocultar ${legacyCount} legacy` : `Mostrar ${legacyCount} legacy`}
            </button>
          )}
          <button onClick={openAltaModal} disabled={loading || altaCandidates.length === 0 || teams.length === 0}
            className="text-[9px] font-mono uppercase tracking-[0.3em] text-ok hover:text-ok transition-colors disabled:opacity-30">
            + Añadir piloto
          </button>
          <button onClick={() => setFiaReportOpen(true)} disabled={loading || teams.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-warn-soft border border-warn/40 text-[9px] font-mono font-bold uppercase tracking-[0.2em] text-warn hover:bg-warn-soft hover:text-warn transition-colors disabled:opacity-30">
            <FileText className="w-3 h-3" />
            Boletín FIA (PDF)
          </button>

        </div>
      </div>

      {loadError && <div role="alert" className="border border-danger/40 bg-danger-soft px-4 py-3 text-xs text-danger">
        {loadError} No se muestran importes parciales como si fueran datos completos.
        <button type="button" onClick={() => loadData(selectedSplitId)} className="ml-3 underline underline-offset-2">Reintentar</button>
      </div>}

      {/* ── LOG ── */}
      {processLog.length > 0 && (
        <div className="border border-line bg-surface-2">
          <div className="flex items-center justify-between px-4 py-2 border-b border-line">
            <span className="text-[9px] font-mono uppercase tracking-[0.3em] text-ink-muted">Log economía</span>
            <button onClick={() => setProcessLog([])} className="text-[9px] font-mono text-ink-muted hover:text-ink-2">✕ cerrar</button>
          </div>
          <div className="px-4 py-3 space-y-0.5 max-h-64 overflow-y-auto">
            {processLog.map((line, i) => {
              if (line.startsWith("equipo:")) {
                const [, nombre, total] = line.split(":");
                return (
                  <div key={i} className="flex items-baseline gap-2 text-[10px] font-mono pl-3">
                    <span className="text-ink-muted w-3 shrink-0">→</span>
                    <span className="text-warn font-bold">{nombre}</span>
                    <span className="text-warn font-bold">+{total}M</span>
                  </div>
                );
              }
              if (line.startsWith("piloto:")) {
                const [, nombre, mantAntes, mantDespues, clauDespues, fichado] = line.split(":");
                const decay = parseFloat(mantAntes) - parseFloat(mantDespues);
                const isFichado = fichado === "true";
                return (
                  <div key={i} className="flex items-baseline gap-2 text-[10px] font-mono pl-3">
                    <span className="text-ink-muted w-3 shrink-0">{isFichado ? "✦" : "·"}</span>
                    <span className="text-ink-2 min-w-[100px]">{nombre}</span>
                    <span className="text-ink-muted text-[9px]">mant.</span>
                    <span className="text-ink-muted tabular-nums">{mantAntes}→</span>
                    <span className={`tabular-nums font-bold ${parseFloat(mantDespues) < parseFloat(mantAntes) ? "text-brand/80" : "text-ink-2"}`}>{mantDespues}M</span>
                    {!isFichado && decay > 0 && <span className="text-ink-muted text-[9px]">(-{r1(decay)})</span>}
                    <span className="text-ink-muted text-[9px] ml-1">claus.</span>
                    <span className="text-ink-muted tabular-nums text-[9px]">{clauDespues}M</span>
                  </div>
                );
              }
              const isError = line.startsWith("Error");
              const isDone = line.startsWith("✓");
              return (
                <div key={i} className={`text-[10px] font-mono ${isError ? "text-brand" : isDone ? "text-ok" : "text-ink-muted"}`}>
                  {line}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── TABLA EQUIPOS ── */}
      <div>
        <div className="flex items-center gap-4 mb-4 flex-wrap">
          <p className="text-[9px] font-mono uppercase tracking-[0.4em] text-ink-muted">Resumen de Escuderías</p>
          <span className="text-[9px] font-mono text-ink-muted">· clic en inicial para establecer</span>
        </div>

        <div className="overflow-x-auto border border-line">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="border-b border-line text-[9px] uppercase tracking-[0.25em] text-ink-muted font-normal">
                <th className="py-3 px-4 text-left font-normal">Escudería</th>
                <th className="py-3 px-4 text-right font-normal">Inicial</th>
                <th className="py-3 px-4 text-right font-normal">Mercado (ledger)</th>
                <th className="py-3 px-4 text-right font-normal text-warn">Ajuste cláusulas</th>
                {ECONOMY_INCOME_SOURCES.map(source => (
                  <th key={source.key} className="py-3 px-4 text-right font-normal text-ok">+ {source.label}</th>
                ))}
                <th className="py-3 px-4 text-right font-normal">Total disp.</th>
                <th className="py-3 px-4 text-right font-normal">Pts</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {teams.map(t => {
                const ini = t.presupuesto_inicial;
                const act = t.presupuesto;
                const fichajes = t.movimientos_mercado;
                const editVal = editingBudget[t.id];
                const isSavingB = savingBudget === t.id;
                return (
                  <tr key={t.id} className="hover:bg-surface-2 transition-colors">
                    <td className="py-3 px-4 font-bold text-sm text-ink tracking-tight">{t.nombre}</td>
                    <td className="py-3 px-4 text-right">
                      {editVal !== undefined ? (
                        <div className="flex items-center justify-end gap-1">
                          <input type="number" step="0.1" value={editVal}
                            onChange={e => setEditingBudget(prev => ({ ...prev, [t.id]: e.target.value }))}
                            className="w-16 bg-surface border border-line px-1.5 py-0.5 text-right text-ink outline-none focus:border-brand transition-colors text-[10px] font-mono"
                          />
                          <span className="text-ink-muted text-[10px]">M</span>
                          <button aria-busy={pendingOnce || undefined} disabled={(isSavingB) || pendingOnce} onClick={() => savePresupuestoInicial(t, editVal)}
                            className="text-ok hover:text-ok disabled:opacity-50 px-0.5">
                            {isSavingB ? <Loader2 className="w-3 h-3 animate-spin" /> : "✓"}
                          </button>
                          <button onClick={() => setEditingBudget(prev => { const n = { ...prev }; delete n[t.id]; return n; })}
                            className="text-ink-muted hover:text-ink-2 px-0.5">✕</button>
                        </div>
                      ) : (
                        <span className="cursor-pointer font-mono font-bold text-ink-muted hover:text-ink transition-colors group"
                          onClick={() => setEditingBudget(prev => ({ ...prev, [t.id]: String(ini ?? act) }))}>
                          {ini != null ? `${r1(ini)}M` : <span className="text-ink-muted text-[9px]">— set</span>}
                          <span className="ml-1 text-ink-muted group-hover:text-ink-muted text-[9px]">✎</span>
                        </span>
                      )}
                    </td>
                    <td className={`py-3 px-4 text-right font-bold font-mono text-sm tabular-nums ${fichajes < 0 ? "text-brand" : "text-ink-2"}`} title={t.asientos_mercado ? `${t.asientos_mercado} asientos de mercado` : "El ledger no tiene asientos de mercado para este equipo"}>
                      {t.asientos_mercado ? `${r1(fichajes)}M` : <span className="text-ink-muted text-[9px]">Sin registro</span>}
                    </td>
                    <td className={`py-3 px-4 text-right font-mono text-xs tabular-nums ${t.ajustes_clausulas < 0 ? "text-warn" : t.ajustes_clausulas > 0 ? "text-ok" : "text-ink-muted"}`} title={t.asientos_clausulas ? `${t.asientos_clausulas} ajustes de cláusulas/precios` : "Sin ajustes de cláusulas"}>
                      {t.ajustes_clausulas ? `${t.ajustes_clausulas > 0 ? "+" : ""}${r1(t.ajustes_clausulas)}M` : <span className="text-ink-muted">—</span>}
                    </td>
                    {ECONOMY_INCOME_SOURCES.map(source => {
                      const amount = t.ingresos[source.key];
                      return <td key={source.key} className="py-3 px-4 text-right font-mono text-ok text-xs tabular-nums">
                        {amount > 0 ? `+${r1(amount)}M` : <span className="text-ink-muted">—</span>}
                      </td>;
                    })}
                    <td className={`py-3 px-4 text-right font-bold font-mono text-sm tabular-nums ${act < 0 ? "text-brand" : "text-ink"}`}>
                      {r1(act)}M
                      <button aria-busy={pendingOnce || undefined} className="block ml-auto text-[9px] text-info" disabled={(isSavingB) || pendingOnce} onClick={async () => {
                        const raw = prompt("Ajuste del saldo (M): positivo para devolver/ingresar, negativo para descontar.", "0");
                        if (raw === null || !raw.trim()) return;
                        const delta = Number(raw.replace(",", "."));
                        if (!Number.isFinite(delta) || delta === 0) return;
                        const motivo = prompt("Motivo o referencia del movimiento que corriges:");
                        if (!motivo?.trim()) return;
                        setSavingBudget(t.id);
                        try {
                          await applyBudgetAdjustment(t, delta, motivo.trim());
                        } catch (error: any) { setProcessLog([error.message]); }
                        finally { setSavingBudget(null); }
                      }}>Ajustar saldo</button>
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-ink-2 text-xs">{t.puntos_constructores}</td>
                  </tr>
                );
              })}
              {teams.length === 0 && !loading && !loadError && (
                <tr><td colSpan={13} className="py-8 text-center text-[10px] font-mono text-ink-muted uppercase tracking-widest">Sin escuderías</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── TABLA PILOTOS ── */}
      <div>
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div className="flex items-center gap-4">
            <p className="text-[9px] font-mono uppercase tracking-[0.4em] text-ink-muted">Pilotos y Mercado</p>
            <span className="text-[9px] font-mono text-ink-muted">· clic en precio para editar</span>
          </div>
          {/* Toggle PRECIOS / RENDIMIENTO */}
          <div className="flex gap-0.5">
            {(["precios", "rendimiento"] as const).map(m => (
              <button key={m} onClick={() => setViewMode(m)}
                className={`px-4 py-1.5 text-[9px] font-bold uppercase tracking-[0.2em] transition-all ${
                  viewMode === m ? "bg-surface-3 text-ink" : "text-ink-muted hover:text-ink-2"
                }`}>
                {m === "precios" ? "Precios" : "Rendimiento"}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto border border-line">
          <table className="text-[10px] border-collapse font-mono min-w-full">
            <thead>
              <tr className="border-b border-line text-[9px] uppercase tracking-[0.2em] text-ink-muted font-normal">
                <th className="py-3 px-3 text-left font-normal sticky left-0 bg-surface z-10 min-w-[160px]">Piloto</th>
                <th className="py-3 px-3 text-right font-normal min-w-[80px]">Precio</th>

                {viewMode === "precios" && (
                  <>
                    <th className="py-3 px-3 text-right font-normal min-w-[80px]">{nextSplit?.nombre || "Próx. split"}</th>
                    {circuits.map(c => (
                      <th key={c.id} className="py-3 px-3 text-right font-normal min-w-[80px] whitespace-nowrap">
                        <span className={c.economia_procesada ? "text-ink-2" : c.completado ? "text-ink-muted" : "text-ink-muted"}>
                          {c.nombre}
                        </span>
                        <span className="block text-[7px] text-ink-muted tracking-normal normal-case font-normal mt-0.5">
                          mant. / claus.
                        </span>
                        {c.completado && (
                          <button aria-busy={pendingOnce || undefined}
                            onClick={() => c.economia_procesada ? fixFichajePricesHistorial(c) : procesarEconomia(c)}
                            disabled={(reprocesando === c.id) || pendingOnce}
                            className={`flex items-center gap-0.5 text-[7px] tracking-normal normal-case font-normal transition-colors mt-0.5 ${
                              c.economia_procesada ? "text-ok hover:text-warn" : "text-warn hover:text-warn"
                            }`}>
                            {reprocesando === c.id ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <RefreshCw className="w-2.5 h-2.5" />}
                            {reprocesando === c.id ? "..." : c.economia_procesada ? "eco. ok" : "procesar"}
                          </button>
                        )}
                      </th>
                    ))}
                    <th className="py-3 px-3 text-right font-normal min-w-[64px]">
                      <span className="block text-ink-2">Mant.</span>
                      <span className="block text-ink-muted text-[8px] font-normal normal-case tracking-normal">Claus.</span>
                    </th>
                  </>
                )}

                {viewMode === "rendimiento" && (
                  <>
                    <th className="py-3 px-3 text-right font-normal min-w-[56px]">Rating</th>
                    <th className="py-3 px-3 text-right font-normal min-w-[48px]">Pts</th>
                    <th className="py-3 px-3 text-center font-normal min-w-[36px]">V</th>
                    <th className="py-3 px-3 text-center font-normal min-w-[36px]">Pod</th>
                    <th className="py-3 px-3 text-center font-normal min-w-[36px]">DNF</th>
                    <th className="py-3 px-3 text-center font-normal min-w-[52px]">Limpias</th>
                    <th className="py-3 px-3 text-right font-normal min-w-[64px]">
                      <span className="block text-ink-2">Mant.</span>
                      <span className="block text-ink-muted text-[8px] font-normal normal-case tracking-normal">Claus.</span>
                    </th>
                  </>
                )}

                {showLegacy && <th className="py-3 px-2 font-normal min-w-[36px]" />}
              </tr>
            </thead>
            <tbody>
              {Object.entries(grouped).map(([equipo, pilotList]) => (
                <>
                  <tr key={`hdr-${equipo}`}>
                    <td colSpan={99}
                      className="py-2 px-3 text-[9px] uppercase tracking-[0.3em] text-brand font-bold border-y border-line bg-surface-2">
                      {equipo}
                    </td>
                  </tr>

                  {pilotList.map(pilot => {
                    const editVal = editing[pilot.id];
                    const isSaving = savingId === pilot.id;
                    const isDeleting = deletingId === pilot.id;
                    const isFichado = pilot.congelado;
                    const transfer = transferViews.get(pilot.id);
                    const estadoOperacion = transfer?.estado ?? (isFichado ? "pactado" : null);
                    // Pacto que sigue escrito aquí aunque el traspaso ya esté registrado en el
                    // split siguiente: continúa reservando presupuesto en este split.
                    const pactoSinLimpiar = transfer?.origen === "actual" && transfer.estado === "registrado";
                    const destTeamId = transfer?.equipoId;
                    const destTeam = destTeamId ? (nextSplit?.equipos?.find((team: any) => team.id === destTeamId) ?? teams.find(t => t.id === destTeamId)) : null;
                    const isRenovacion = destTeamId === pilot.equipoId;
                    const tipoActivo = transfer?.tipo;

                    return (
                      <tr key={pilot.id}
                        className={`border-b border-line hover:bg-surface-2 transition-colors ${
                          pilot.isLegacy ? "opacity-35" : ""
                        } ${estadoOperacion ? "bg-warn-soft" : ""}`}>

                        {/* ── Nombre + badge de fichaje ── */}
                        <td className="py-2.5 px-3 sticky left-0 bg-inherit max-w-[160px]">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <span className="font-bold text-ink truncate text-[11px] block">{pilot.nombre}</span>
                              {pilot.isLegacy && <span className="text-[8px] text-brand/40">legacy</span>}
                               {transfer && (
                                <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                                  {isRenovacion ? (
                                    <span className="text-[8px] text-info font-mono">↺ Renovado</span>
                                  ) : (
                                    <>
                                      <span className="text-[8px] text-warn font-mono">→</span>
                                      <span className="text-[8px] text-warn font-bold truncate max-w-[70px]">
                                        {destTeam?.nombre ?? destTeamId}
                                      </span>
                                    </>
                                  )}
                                   {tipoActivo && (
                                    <span className={`text-[7px] px-1 py-px font-bold uppercase tracking-wide ${TIPO_COLORS[tipoActivo]}`}>
                                      {TIPO_LABEL[tipoActivo]}
                                    </span>
                                   )}
                                   <span className={`block w-full text-[9px] ${transfer.estado === "pendiente" ? "text-warn" : "text-ok"}`}>
                                     {transfer.estado === "registrado" ? `Registrado en ${nextSplit?.nombre || "el siguiente split"}` : transfer.estado === "pendiente" ? `Pendiente en ${nextSplit?.nombre}` : "Pactado desde este split"}
                                   </span>
                                   {pactoSinLimpiar && (
                                     <span className="block w-full text-[9px] text-warn"
                                       title="El traspaso ya está registrado en el split siguiente, pero esta ficha conserva el pacto: el presupuesto disponible del equipo de destino en este split se sigue calculando con ese importe descontado. Ojo, el aspa de esta fila no limpia el resto: cancela el traspaso y devuelve al piloto a su equipo anterior en el split siguiente.">
                                       Pacto sin limpiar: aún reserva presupuesto aquí
                                     </span>
                                   )}
                                </div>
                              )}
                            </div>

                            {/* Botón Fichar / Deshacer */}
                             {transfer?.origen === "siguiente" ? (
                               <button type="button" onClick={() => nextSplit && setSelectedSplitId(nextSplit.id)} title={`Consultar el fichaje guardado en ${nextSplit?.nombre}`} className="shrink-0 min-h-8 px-1 text-[10px] font-bold text-info">Ver →</button>
                             ) : isFichado ? (
                              <button
                                onClick={() => handleFichar(pilot)}
                                title="Deshacer fichaje"
                                className="shrink-0 text-ink-muted hover:text-brand/70 transition-colors text-[11px] leading-none mt-0.5">
                                ✕
                              </button>
                            ) : (
                              <button
                                onClick={() => handleFichar(pilot)}
                                title="Fichar piloto"
                                className="shrink-0 flex items-center gap-0.5 px-1.5 py-0.5 border border-line text-ink-muted hover:text-warn hover:border-warn/40 transition-colors text-[7px] uppercase tracking-wide font-bold">
                                <ArrowRightLeft className="w-2.5 h-2.5" />
                                Pactar próximo split
                              </button>
                            )}
                          </div>
                          {pilot.equipoId === "agente_libre" && <button type="button" className="block text-[9px] text-ok mt-1" onClick={() => {
                            openAltaModal(); setAltaPilotoId(pilot.id);
                          }}>Fichar en este split</button>}
                          {pilot.equipoId !== "agente_libre" && (
                            <button aria-busy={pendingOnce || undefined} type="button" disabled={(isDeleting) || pendingOnce} onClick={() => liberarPiloto(pilot)}
                              title={`Sacar a ${pilot.nombre} de ${pilot.equipoNombre} y dejarlo como agente libre en este split`}
                              className="mt-0.5 text-[8px] font-mono uppercase tracking-wide text-ink-muted hover:text-brand disabled:opacity-40 transition-colors">
                              {isDeleting ? "liberando…" : "liberar"}
                            </button>
                          )}
                          <button aria-busy={pendingOnce || undefined} type="button" disabled={(isDeleting) || pendingOnce} className="block text-[9px] text-info mt-1"
                            onClick={async () => {
    return runOnce(async () => {
                              if (!confirm(`¿Deshacer el alta de ${pilot.nombre} y compensar su importe?`)) return;
                              setDeletingId(pilot.id);
                              try {
                                await deshacerAlta(pilot.splitId, pilot.equipoId, pilot.id);
                                await loadData(pilot.splitId);
                                setProcessLog(["Fichaje anulado: saldo compensado y ficha anterior restaurada."]);
                              } catch (error: any) { setProcessLog([error.message]); }
                              finally { setDeletingId(null); }
                            });
}}>Deshacer alta</button>
                          <button aria-busy={pendingOnce || undefined} disabled={pendingOnce} type="button" className="block text-[9px] text-info mt-1"
                            onClick={async () => {
    return runOnce(async () => {
                              const raw = prompt("Nueva cláusula (M). Deja el campo vacío para retirar el ajuste manual y recuperar la cláusula automática.", String(pilot.clausula_actual));
                              if (raw === null) return;
                              const importe = Number(raw.replace(",", "."));
                              if (!Number.isFinite(importe)) return;
                              const retirar = !raw.trim();
                              const motivo = prompt("Motivo del ajuste de cláusula:");
                              if (!motivo?.trim()) return;
                              try {
                                await ajustarClausula({ splitId: pilot.splitId, equipoId: pilot.equipoId, equipoNombre: pilot.equipoNombre, pilotoId: pilot.id, nombre: pilot.nombre, importe: retirar ? null : importe, motivo });
                                await loadData(pilot.splitId);
                              } catch (error: any) { setProcessLog([error.message]); }
                            });
}}>Ajustar cláusula</button>
                        </td>

                        {/* Precio editable */}
                        <td className="py-2.5 px-3 text-right">
                          {editVal !== undefined ? (
                            <div className="flex items-center justify-end gap-1">
                              <input type="number" step="0.1" value={editVal}
                                onChange={e => setEditing(prev => ({ ...prev, [pilot.id]: e.target.value }))}
                                className="w-14 bg-surface border border-line px-1.5 py-0.5 text-right text-ink outline-none focus:border-brand transition-colors text-[10px]"
                              />
                              <button aria-busy={pendingOnce || undefined} disabled={(isSaving) || pendingOnce} onClick={() => savePrecio(pilot, editVal)}
                                className="text-ok hover:text-ok disabled:opacity-50 px-0.5">
                                {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : "✓"}
                              </button>
                              <button onClick={() => setEditing(prev => { const n = { ...prev }; delete n[pilot.id]; return n; })}
                                className="text-ink-muted hover:text-ink-2 px-0.5">✕</button>
                              {(() => {
                                const nextPrice = Number(editVal.replace(",", "."));
                                const currentBudget = teams.find(team => team.id === pilot.equipoId)?.presupuesto;
                                if (currentBudget == null || !Number.isFinite(nextPrice)) return null;
                                const preview = previsualizarAjustePrecio(Number(currentBudget), Number(pilot.precio_compra ?? 0), nextPrice);
                                const { presupuestoNuevo: nextBudget, delta, insuficiente: hasInsufficientBudget, faltante } = preview;
                                return delta === 0 ? null : (
                                  <span className="text-[8px] font-mono whitespace-nowrap">
                                    <span className={delta > 0 ? "text-ok" : "text-warn"}>
                                      Saldo tras corregir: {r1(nextBudget)}M ({delta > 0 ? "+" : ""}{r1(delta)}M)
                                    </span>
                                    {hasInsufficientBudget && delta < 0 && <span className="text-danger block">Presupuesto insuficiente: faltan {r1(faltante)}M.</span>}
                                  </span>
                                );
                              })()}
                            </div>
                          ) : (
                            <div className="space-y-0.5">
                              <span className="cursor-pointer text-ink-muted hover:text-ink transition-colors group"
                                onClick={() => setEditing(prev => ({ ...prev, [pilot.id]: String(pilot.precio_compra) }))}>
                                {r1(pilot.precio_compra)}M
                                <span className="ml-1 text-ink-muted group-hover:text-ink-2 text-[9px]">✎</span>
                              </span>
                              {estadoOperacion && <span className="text-warn text-[8px] font-mono block">{OPERACION_LABEL[estadoOperacion]}</span>}
                            </div>
                          )}
                        </td>

                        {/* ── Vista PRECIOS ── */}
                        {viewMode === "precios" && (
                          <>
                            {/* Próx. split */}
                            <td className="py-2.5 px-3 text-right">
                              {transfer ? (() => {
                                const pp = transfer.precio;
                                const nextM = mantenerInicialDe(pp, selectedEconomyRules);
                                const nextCl = clausulaInicialDe(pp, selectedEconomyRules);
                                return (
                                  <div className="space-y-0.5">
                                    <span className={`block tabular-nums font-bold text-[10px] ${cellBg(nextM)}`}>{r1(nextM)}</span>
                                    <span className={`block tabular-nums text-[9px] ${cellBg(nextCl)}`}>{r1(nextCl)}</span>
                                    <span className="block text-warn text-[8px] font-mono">({r1(pp)}M)</span>
                                  </div>
                                );
                              })() : <span className="text-ink-muted text-[9px]">Sin registro</span>}
                            </td>

                            {/* Historial por circuito */}
                            {circuits.map(c => {
                              const h = pilot.historial[c.id];
                              const m = h?.mantener ?? null;
                              const cl = h?.clausula ?? null;
                              const isPactado = h?.congelado ?? false;
                              return (
                                <td key={c.id} className="py-2.5 px-3 text-right">
                                  {isPactado ? (
                                    <div className="opacity-60">
                                      <span className={`block tabular-nums font-bold text-[10px] ${cellBg(pilot.mantener_actual)}`}>
                                        {r1(pilot.mantener_actual)}
                                      </span>
                                      <span className={`block tabular-nums text-[9px] mt-0.5 ${cellBg(pilot.clausula_actual)}`}>
                                        {r1(pilot.clausula_actual)}
                                      </span>
                                      <span className="text-[7px] text-warn font-mono tracking-wide">ptdo</span>
                                    </div>
                                  ) : (
                                    <>
                                      <span className={`block tabular-nums font-bold ${cellBg(m)}`}>{r1(m)}</span>
                                      <span className={`block tabular-nums text-[9px] mt-0.5 ${cellBg(cl)}`}>{r1(cl)}</span>
                                    </>
                                  )}
                                </td>
                              );
                            })}

                            {/* Mant./Claus. actual */}
                            <td className="py-2.5 px-3 text-right border-l border-line">
                              {estadoOperacion ? (
                                <div>
                                  <span className={`block tabular-nums font-bold text-[11px] ${cellBg(pilot.mantener_actual)}`}>
                                    {r1(pilot.mantener_actual)}
                                  </span>
                                  <span className={`block tabular-nums text-[9px] mt-0.5 ${cellBg(pilot.clausula_actual)}`}>
                                    {r1(pilot.clausula_actual)}
                                  </span>
                                  <span className="text-[7px] text-warn font-mono">{OPERACION_LABEL[estadoOperacion]}</span>
                                </div>
                              ) : (
                                <>
                                  <span className={`block tabular-nums font-bold text-[11px] ${cellBg(pilot.mantener_actual)}`}>
                                    {r1(pilot.mantener_actual)}
                                  </span>
                                  <span className={`block tabular-nums text-[9px] mt-0.5 ${cellBg(pilot.clausula_actual)}`}>
                                    {r1(pilot.clausula_actual)}
                                  </span>
                                </>
                              )}
                            </td>
                          </>
                        )}

                        {/* ── Vista RENDIMIENTO ── */}
                        {viewMode === "rendimiento" && (
                          <>
                            <td className="py-2.5 px-3 text-right">
                              <span className={`text-[11px] tabular-nums ${ratingColor(pilot.rating_piloto)}`}>
                                {pilot.rating_piloto.toFixed(0)}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              <span className="text-ink-2 font-bold tabular-nums">{pilot.puntos_piloto}</span>
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <span className={pilot.victorias > 0 ? "text-warn font-bold" : "text-ink-muted"}>
                                {pilot.victorias}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <span className={pilot.podios > 0 ? "text-ink font-bold" : "text-ink-muted"}>
                                {pilot.podios}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <span className={pilot.dnfs > 0 ? "text-brand/80 font-bold" : "text-ink-muted"}>
                                {pilot.dnfs}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <span className={pilot.carreras_limpias > 0 ? "text-ok" : "text-ink-muted"}>
                                {pilot.carreras_limpias}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-right border-l border-line">
                              <span className={`block tabular-nums font-bold text-[11px] ${cellBg(pilot.mantener_actual)}`}>
                                {r1(pilot.mantener_actual)}
                              </span>
                              <span className={`block tabular-nums text-[9px] mt-0.5 ${cellBg(pilot.clausula_actual)}`}>
                                {r1(pilot.clausula_actual)}
                              </span>
                            </td>
                          </>
                        )}

                        {showLegacy && pilot.isLegacy && (
                          <td className="py-2.5 px-2">
                            <button aria-busy={pendingOnce || undefined} disabled={(isDeleting) || pendingOnce} onClick={() => deleteLegacy(pilot)}
                              className="text-brand/40 hover:text-brand disabled:opacity-40 transition-colors">
                              {isDeleting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                            </button>
                          </td>
                        )}
                        {showLegacy && !pilot.isLegacy && <td />}
                      </tr>
                    );
                  })}
                </>
              ))}
            </tbody>
          </table>
        </div>

        {visiblePilots.length === 0 && !loading && (
          <p className="text-[10px] font-mono uppercase tracking-[0.35em] text-ink-muted mt-6 text-center py-12">
            Sin pilotos en este split
          </p>
        )}
      </div>

      {/* ── MODAL DE ALTA MANUAL ── */}
      {altaModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60">
          <div className="bg-surface border border-line w-full max-w-sm mx-4 shadow-2xl">

            <div className="flex items-center gap-3 px-5 py-4 border-b border-line">
              <ArrowRightLeft className="w-4 h-4 text-ok" />
              <div>
                <h3 className="text-xs font-bold uppercase tracking-widest text-ink">Añadir piloto al split</h3>
                <p className="text-[9px] font-mono text-ink-muted mt-0.5">
                  Alta directa con su valor de mercado — se descuenta del presupuesto
                </p>
              </div>
            </div>

            <div className="px-5 py-4 space-y-4">
              <div className="space-y-1.5">
                <label className="text-[9px] font-mono uppercase tracking-[0.3em] text-ink-muted block">Piloto</label>
                <select value={altaPilotoId} onChange={e => setAltaPilotoId(e.target.value)}
                  className="w-full bg-surface border border-line text-ink text-[11px] px-3 py-2 outline-none focus:border-brand transition-colors font-mono">
                  {altaCandidates.map(p => (
                    <option key={p.id} value={p.id}>{p.nombre}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[9px] font-mono uppercase tracking-[0.3em] text-ink-muted block">Escudería</label>
                <select value={altaEquipoId} onChange={e => setAltaEquipoId(e.target.value)}
                  className="w-full bg-surface border border-line text-ink text-[11px] px-3 py-2 outline-none focus:border-brand transition-colors font-mono">
                  {teams.map(t => (
                    <option key={t.id} value={t.id}>{t.nombre} — presup. {r1(t.presupuesto)}M</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[9px] font-mono uppercase tracking-[0.3em] text-ink-muted block">Valor de mercado</label>
                <div className="flex items-center gap-2">
                  <input type="number" step="0.1" value={altaPrecio} autoFocus
                    onChange={e => setAltaPrecio(e.target.value)}
                    className="flex-1 bg-surface border border-line px-3 py-2 text-ink outline-none focus:border-brand transition-colors text-sm font-mono"
                    placeholder="0.0" />
                  <span className="text-ink-muted text-xs font-mono">M</span>
                </div>
                {(() => {
                  const precio = parseFloat(altaPrecio || "");
                  if (Number.isNaN(precio)) return null;
                  const destTeam = teams.find(t => t.id === altaEquipoId);
                  const nuevoPresupuesto = destTeam?.presupuesto == null ? null : destTeam.presupuesto + (precio < 0 ? Math.abs(precio) : -precio);
                  const mantener = mantenerInicialDe(precio, selectedEconomyRules);
                  const clausula = clausulaInicialDe(precio, selectedEconomyRules);
                  return (
                    <p className="text-[9px] font-mono text-ink-muted mt-1">
                      Mantener {mantener}M · cláusula {clausula}M
                      {nuevoPresupuesto != null && destTeam && (
                        <> · {destTeam.nombre} queda en <span className={nuevoPresupuesto < 0 ? "text-brand" : "text-ink-2"}>{nuevoPresupuesto.toFixed(1)}M</span></>
                      )}
                    </p>
                  );
                })()}
              </div>

              {altaMsg && <p className="text-[9px] font-mono text-brand">{altaMsg}</p>}
            </div>

            <div className="flex gap-2 px-5 py-4 border-t border-line">
              <button onClick={() => setAltaModalOpen(false)} disabled={confirmingAlta}
                className="flex-1 py-2 text-[10px] font-mono uppercase tracking-widest text-ink-muted hover:text-ink-2 border border-line hover:border-line transition-colors disabled:opacity-40">
                Cancelar
              </button>
              <button aria-busy={pendingOnce || undefined} onClick={confirmAlta}
                disabled={(confirmingAlta || !altaPilotoId || !altaEquipoId || Number.isNaN(parseFloat(altaPrecio || ""))) || pendingOnce}
                className="flex-1 py-2 text-[10px] font-bold uppercase tracking-widest bg-ok-soft border border-ok/40 hover:bg-ok-soft/20 text-ok transition-colors disabled:opacity-40 flex items-center justify-center gap-1.5">
                {confirmingAlta && <Loader2 className="w-3 h-3 animate-spin" />}
                Añadir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL DE FICHAJE ── */}
      {fichajeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60">
          <div className="bg-surface border border-line w-full max-w-sm mx-4 shadow-2xl">

            {/* Header */}
            <div className="flex items-center gap-3 px-5 py-4 border-b border-line">
              <ArrowRightLeft className="w-4 h-4 text-warn" />
              <div>
                <h3 className="text-xs font-bold uppercase tracking-widest text-ink">Fichaje</h3>
                <p className="text-[9px] font-mono text-ink-muted mt-0.5">
                  El piloto genera para su equipo actual hasta fin de split
                </p>
              </div>
            </div>

            <div className="px-5 py-4 space-y-4">
              {/* Piloto */}
              <div className="flex items-baseline justify-between">
                <span className="text-sm font-bold text-ink">{fichajeModal.nombre}</span>
                <span className="text-[10px] font-mono text-ink-muted">
                  {fichajeModal.equipoNombre}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-surface-2 border border-line py-2 px-1">
                  <span className="block text-[8px] text-ink-muted font-mono uppercase tracking-wide mb-0.5">Precio</span>
                  <span className="text-ink-2 font-bold text-xs">{fichajeModal.precio_compra}M</span>
                </div>
                <div className="bg-surface-2 border border-line py-2 px-1">
                  <span className="block text-[8px] text-ink-muted font-mono uppercase tracking-wide mb-0.5">Mant.</span>
                  <span className="text-ink-2 font-bold text-xs">{fichajeModal.mantener_actual}M</span>
                </div>
                <div className="bg-surface-2 border border-line py-2 px-1">
                  <span className="block text-[8px] text-ink-muted font-mono uppercase tracking-wide mb-0.5">Cláus.</span>
                  <span className="text-ink-2 font-bold text-xs">{fichajeModal.clausula_actual}M</span>
                </div>
              </div>

              {/* Tipo de fichaje */}
              <div className="space-y-1.5">
                <label className="text-[9px] font-mono uppercase tracking-[0.3em] text-ink-muted block">
                  Tipo de operación
                </label>
                <div className="flex gap-1">
                  {(["subasta", "clausula", "mantener"] as TipoFichaje[]).map(t => (
                    <button key={t} onClick={() => handleFichajeTipoChange(t)}
                      className={`flex-1 py-2 text-[8px] font-bold uppercase tracking-wide transition-colors ${
                        fichajeTipo === t
                          ? t === "clausula" ? "bg-warn-soft border border-warn/40 text-warn"
                          : t === "subasta" ? "bg-brand text-brand-ink"
                          : "bg-info-soft border border-info/40 text-info"
                          : "bg-surface-3 text-ink-muted hover:bg-surface-3 hover:text-ink-2"
                      }`}>
                      {t === "subasta" ? "Subasta" : t === "clausula" ? "Cláusula" : "Mantener"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Referencia de precio según tipo */}
              <div className="flex items-center gap-2 text-[9px] font-mono text-ink-muted bg-surface-2 border border-line px-3 py-2">
                {fichajeTipo === "clausula" && (
                  <>
                    <span>Cláusula mínima:</span>
                    <span className="text-warn font-bold">{fichajeModal.clausula_actual}M</span>
                    <span className="ml-auto text-ink-muted">cobro al vendedor según las reglas del split</span>
                  </>
                )}
                {fichajeTipo === "mantener" && (
                  <>
                    <span>Precio mantener:</span>
                    <span className="text-info font-bold">{fichajeModal.mantener_actual}M</span>
                  </>
                )}
                {fichajeTipo === "subasta" && (
                  <>
                    <span>Piloto en subasta — precio libre</span>
                    <span className="ml-auto text-ink-muted">ref. mant. {fichajeModal.mantener_actual}M</span>
                  </>
                )}
              </div>

              {/* Precio acordado */}
              <div className="space-y-1.5">
                <label className="text-[9px] font-mono uppercase tracking-[0.3em] text-ink-muted block">
                  Precio acordado (próximo split)
                </label>
                <div className="flex items-center gap-2">
                  <input type="number" step="0.1" value={pendingPrecioCompra}
                    onChange={e => setPendingPrecioCompra(e.target.value)}
                    className="flex-1 bg-surface border border-line text-ink text-sm font-bold px-3 py-2 outline-none focus:border-brand transition-colors font-mono text-right"
                    placeholder="0.0"
                  />
                  <span className="text-ink-muted font-mono text-sm font-bold shrink-0">M</span>
                </div>
                {/* Preview mantener/clausula del próximo split */}
                {pendingPrecioCompra && !isNaN(parseFloat(pendingPrecioCompra)) && (() => {
                  const pp = parseFloat(pendingPrecioCompra);
                  const nextM  = mantenerInicialDe(pp, selectedEconomyRules);
                  const nextCl = clausulaInicialDe(pp, selectedEconomyRules);
                  return (
                    <div className="flex gap-3 text-[9px] font-mono text-ink-muted mt-1">
                      <span>Mant. próx. split: <span className="text-ink-2 font-bold">{nextM}M</span></span>
                      <span>Claus.: <span className="text-ink-2 font-bold">{nextCl}M</span></span>
                    </div>
                  );
                })()}
              </div>

              {/* Equipo destino */}
              <div className="space-y-1.5">
                <label className="text-[9px] font-mono uppercase tracking-[0.3em] text-ink-muted block">
                  Equipo destino
                </label>
                <select value={fichajeEquipoId} onChange={e => setFichajeEquipoId(e.target.value)}
                  className="w-full bg-surface border border-line text-ink text-[11px] px-3 py-2 outline-none focus:border-brand transition-colors font-mono">
                  {teams.map(t => (
                      <option key={t.id} value={t.id}>
                      {t.nombre}{t.id === fichajeModal.equipoId ? " (actual)" : ""} — presup. {r1(t.presupuesto)}M
                    </option>
                  ))}
                </select>
                {fichajeEquipoId !== fichajeModal.equipoId && (() => {
                  const pp = parseFloat(pendingPrecioCompra || "0");
                  const destTeam = teams.find(t => t.id === fichajeEquipoId);
                  if (!destTeam || destTeam.presupuesto == null || isNaN(pp) || pp === 0) return null;
                  const newBudget = destTeam.presupuesto + (pp < 0 ? Math.abs(pp) : -pp);
                  return (
                    <p className="text-[9px] font-mono text-ink-muted mt-1">
                      Presupuesto de <span className="text-ink-2">{destTeam.nombre}</span> después del fichaje:{" "}
                      <span className={newBudget < 0 ? "text-brand" : "text-ink-2"}>{newBudget.toFixed(1)}M</span>
                    </p>
                  );
                })()}
              </div>
            </div>

            {/* Acciones */}
            <div className="flex gap-2 px-5 py-4 border-t border-line">
              <button onClick={() => { setFichajeModal(null); setPendingPrecioCompra(""); }}
                disabled={confirmingFichaje}
                className="flex-1 py-2 text-[10px] font-mono uppercase tracking-widest text-ink-muted hover:text-ink-2 border border-line hover:border-line transition-colors disabled:opacity-40">
                Cancelar
              </button>
              <button aria-busy={pendingOnce || undefined} onClick={confirmFichaje}
                disabled={(confirmingFichaje || !fichajeEquipoId || Number.isNaN(parseFloat(pendingPrecioCompra || ""))) || pendingOnce}
                className="flex-1 py-2 text-[10px] font-bold uppercase tracking-widest bg-warn-soft border border-warn/40 hover:bg-warn-soft/20 text-warn transition-colors disabled:opacity-40 flex items-center justify-center gap-1.5">
                {confirmingFichaje ? <Loader2 className="w-3 h-3 animate-spin" /> : <ArrowRightLeft className="w-3 h-3" />}
                {confirmingFichaje ? "Procesando…" : "Confirmar fichaje"}
              </button>
            </div>
          </div>
        </div>
      )}

      <FiaFinancialReportModal
        isOpen={fiaReportOpen}
        onClose={() => setFiaReportOpen(false)}
        splitId={selectedSplitId}
        splitName={splits.find((s: any) => s.id === selectedSplitId)?.nombre || selectedSplitId}
        teams={teams}
        pilots={pilots}
        ledgerEntries={rawLedgerEntries}
      />
    </div>
  );
}
