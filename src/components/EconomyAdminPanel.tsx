import { useState, useEffect } from "react";
import { collection, getDocs, doc, updateDoc, deleteDoc, writeBatch, addDoc, serverTimestamp, increment } from "firebase/firestore";
import { db } from "../services/firebase";
import { procesarEconomiaCarrera } from "../services/economyService";
import { Loader2, Trash2, RefreshCw } from "lucide-react";

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
}

interface TeamRow {
  id: string;
  nombre: string;
  presupuesto: number;
  presupuesto_inicial: number | null;
  puntos_constructores: number;
  poles: number;
  vueltas_rapidas: number;
  sin_sanc: number;
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────

/** Convierte cualquier valor Firestore fecha a epoch ms */
function toMs(fecha: any): number {
  if (!fecha) return 0;
  if (typeof fecha?.toMillis === "function") return fecha.toMillis(); // Firestore Timestamp
  if (typeof fecha === "string") return new Date(fecha).getTime() || 0;
  if (fecha instanceof Date) return fecha.getTime();
  return 0;
}

function r1(n: number | null | undefined): string {
  if (n == null || isNaN(n as number)) return "—";
  return (Math.round((n as number) * 10) / 10).toFixed(1);
}

function cellBg(val: number | null): string {
  if (val == null) return "text-white/15";
  if (val < 0) return "text-[#e10600] font-black";
  if (val > 150) return "text-amber-300 font-bold";
  if (val > 80) return "text-white font-bold";
  return "text-white/60";
}

const LEGACY_PREFIX = "piloto_";

// ─── COMPONENT ────────────────────────────────────────────────────────────────

export function EconomyAdminPanel({ splits }: { splits: any[] }) {
  const [selectedSplitId, setSelectedSplitId] = useState(splits[0]?.id ?? "");
  const [circuits, setCircuits] = useState<CircuitoCol[]>([]);
  const [teams, setTeams] = useState<TeamRow[]>([]);
  const [pilots, setPilots] = useState<PilotRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showLegacy, setShowLegacy] = useState(false);
  const [reprocesando, setReprocesando] = useState<string | null>(null);
  const [savingTipo, setSavingTipo] = useState<string | null>(null);
  const [editingBudget, setEditingBudget] = useState<Record<string, string>>({});
  const [savingBudget, setSavingBudget] = useState<string | null>(null);
  const [processLog, setProcessLog] = useState<string[]>([]);
  // Modal de asignación al congelar piloto
  const [freezeModal, setFreezeModal] = useState<PilotRow | null>(null);
  const [freezeTeamId, setFreezeTeamId] = useState("");
  const [pendingPrecioCompra, setPendingPrecioCompra] = useState("");
  const [confirmingFreeze, setConfirmingFreeze] = useState(false);

  useEffect(() => {
    if (selectedSplitId) loadData(selectedSplitId);
  }, [selectedSplitId]);

  async function reprocesarEconomia(circuit: CircuitoCol) {
    setReprocesando(circuit.id);
    setProcessLog([`Procesando ${circuit.nombre}…`]);
    try {
      await updateDoc(doc(db, `splits/${selectedSplitId}/circuitos`, circuit.id), {
        economia_procesada: false,
      });
      const circuitIndex = circuits.findIndex(c => c.id === circuit.id);
      const previousCircuitIds = circuits.slice(0, circuitIndex).map(c => c.id);
      await procesarEconomiaCarrera(
        selectedSplitId,
        circuit.id,
        circuit.nombre,
        (msg) => setProcessLog(prev => [...prev, msg]),
        previousCircuitIds
      );
      await loadData(selectedSplitId);
    } catch (err: any) {
      setProcessLog(prev => [...prev, `Error: ${err.message}`]);
    } finally {
      setReprocesando(null);
    }
  }

  // Parchea historial_precios para pilotos congelados desde congelado_en en adelante
  async function fixFreezeHistorial(circuit: CircuitoCol) {
    setReprocesando(circuit.id);
    setProcessLog([`Corrigiendo freeze en ${circuit.nombre}…`]);
    try {
      const circuitIndex = circuits.findIndex(c => c.id === circuit.id);
      const previousCircuitIds = circuits.slice(0, circuitIndex).map(c => c.id);
      const equiposSnap = await getDocs(collection(db, `splits/${selectedSplitId}/equipos`));
      const batch = writeBatch(db);
      let fixed = 0;

      for (const equipoDoc of equiposSnap.docs) {
        const pilotosSnap = await getDocs(
          collection(db, `splits/${selectedSplitId}/equipos/${equipoDoc.id}/pilotos`)
        );
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
            batch.update(pd.ref, {
              [`historial_precios.${circuit.id}`]: { carrera: circuit.nombre, mantener: null, clausula: null, congelado: true },
            });
            fixed++;
          }
        }
      }

      await batch.commit();
      setProcessLog([`✓ ${fixed} piloto(s) con ❄ en ${circuit.nombre}`]);
      await loadData(selectedSplitId);
    } catch (err: any) {
      setProcessLog(prev => [...prev, `Error: ${err.message}`]);
    } finally {
      setReprocesando(null);
    }
  }

  async function savePresupuestoInicial(team: TeamRow, rawVal: string) {
    const val = parseFloat(rawVal);
    if (isNaN(val)) return;
    setSavingBudget(team.id);
    await updateDoc(doc(db, `splits/${selectedSplitId}/equipos`, team.id), {
      presupuesto_inicial: val,
      presupuesto: val,
    });
    setEditingBudget(prev => { const n = { ...prev }; delete n[team.id]; return n; });
    await loadData(selectedSplitId);
    setSavingBudget(null);
  }

  async function resetEconomia() {
    if (!confirm(`¿Resetear toda la economía de ${selectedSplitId}? Los precios, historial y congelados quedarán a cero.`)) return;
    setLoading(true);
    setProcessLog([]);
    try {
      const [circSnap, equiposSnap] = await Promise.all([
        getDocs(collection(db, `splits/${selectedSplitId}/circuitos`)),
        getDocs(collection(db, `splits/${selectedSplitId}/equipos`)),
      ]);
      const b1 = writeBatch(db);
      for (const equipoDoc of equiposSnap.docs) {
        const pilotosSnap = await getDocs(
          collection(db, `splits/${selectedSplitId}/equipos/${equipoDoc.id}/pilotos`)
        );
        pilotosSnap.docs.forEach(d => b1.update(d.ref, {
          precio_compra: 0, clausula_actual: 0, mantener_actual: 0,
          clausula_inicial_split: 0, mantener_inicial_split: 0,
          precio_carrera_anterior: 0, historial_precios: {},
          congelado: false, congelado_en: null, tipo_fichaje: null,
          pending_equipoId: null, pending_precio_compra: null, pending_tipo_fichaje: null,
        }));
      }
      equiposSnap.docs.forEach(d => b1.update(d.ref, { presupuesto: 0, presupuesto_inicial: 0 }));
      await b1.commit();
      const b2 = writeBatch(db);
      circSnap.docs.forEach(d => b2.update(d.ref, { economia_procesada: false }));
      await b2.commit();
      setProcessLog(["✓ Reset completo — precios de pilotos y presupuestos de equipos a 0"]);
      await loadData(selectedSplitId);
    } catch (err: any) {
      setProcessLog([`Error: ${err.message}`]);
    } finally {
      setLoading(false);
    }
  }

  async function setTipoFichaje(pilot: PilotRow, tipo: TipoFichaje | null) {
    setSavingTipo(pilot.id);
    await updateDoc(doc(db, `splits/${pilot.splitId}/equipos/${pilot.equipoId}/pilotos`, pilot.id), {
      tipo_fichaje: tipo ?? null,
    });
    await loadData(pilot.splitId);
    setSavingTipo(null);
  }

  // Descongelar directamente; congelar abre el modal de asignación
  function handleClickCongelar(pilot: PilotRow) {
    if (pilot.congelado) {
      descongelar(pilot);
    } else {
      setFreezeTeamId(pilot.equipoId !== "agente_libre" ? pilot.equipoId : (teams[0]?.id ?? ""));
      setPendingPrecioCompra(String(pilot.precio_compra || ""));
      setFreezeModal(pilot);
    }
  }

  function getTeamPresupuesto(teamId: string, overridePilotId?: string, overridePrice?: number): number | null {
    const team = teams.find(t => t.id === teamId);
    if (!team || team.presupuesto_inicial == null) return null;

    const teamCurrentCost = pilots
      .filter(p => p.equipoId === teamId)
      .reduce((sum, p) => {
        const price = overridePilotId === p.id ? (overridePrice ?? 0) : (p.precio_compra || 0);
        return sum + price;
      }, 0);

    const pendingIncomingCost = pilots
      .filter(p => p.pending_equipoId === teamId && p.pending_precio_compra != null && p.pending_equipoId !== p.equipoId)
      .reduce((sum, p) => sum + (p.pending_precio_compra ?? 0), 0);

    return Math.round((team.presupuesto_inicial - teamCurrentCost - pendingIncomingCost) * 10) / 10;
  }

  function pendingBudgetDelta(price: number): number {
    return price < 0 ? Math.abs(price) : -price;
  }

  async function adjustTeamPresupuesto(splitId: string, teamId: string, delta: number) {
    if (!teamId || teamId === "agente_libre" || delta === 0) return;
    await updateDoc(doc(db, `splits/${splitId}/equipos`, teamId), {
      presupuesto: increment(delta),
    });
  }

  async function revertPendingReservation(pilot: PilotRow) {
    const splitId = pilot.splitId;
    if (!pilot.pending_equipoId || pilot.pending_precio_compra == null) return;
    if (pilot.pending_equipoId === pilot.equipoId) return;

    const oldDelta = pendingBudgetDelta(pilot.pending_precio_compra);
    await adjustTeamPresupuesto(splitId, pilot.pending_equipoId, -oldDelta);
  }

  async function descongelar(pilot: PilotRow) {
    await revertPendingReservation(pilot);
    await updateDoc(doc(db, `splits/${pilot.splitId}/equipos/${pilot.equipoId}/pilotos`, pilot.id), {
      congelado: false,
      congelado_en: null,
      pending_equipoId: null,
      pending_precio_compra: null,
      pending_tipo_fichaje: null,
    });
    await loadData(pilot.splitId);
  }

  async function confirmFreeze() {
    if (!freezeModal || !freezeTeamId) return;
    const pendingPrice = parseFloat(pendingPrecioCompra || "0");
    if (Number.isNaN(pendingPrice)) return;

    setConfirmingFreeze(true);
    try {
      const pilot = freezeModal;
      const lastDone = [...circuits].filter(c => c.completado).at(-1);
      const splitId = pilot.splitId;
      const currentTeamId = pilot.equipoId;
      const existingPendingTeam = pilot.pending_equipoId;
      const existingPendingPrice = pilot.pending_precio_compra;
      const existingDelta = existingPendingPrice != null ? pendingBudgetDelta(existingPendingPrice) : 0;
      const newDelta = pendingBudgetDelta(pendingPrice);

      if (existingPendingTeam && existingPendingTeam !== currentTeamId) {
        await adjustTeamPresupuesto(splitId, existingPendingTeam, -existingDelta);
      }

      if (freezeTeamId && freezeTeamId !== currentTeamId) {
        const deltaAdjustment = newDelta - ((existingPendingTeam === freezeTeamId && existingPendingTeam !== currentTeamId) ? existingDelta : 0);
        await adjustTeamPresupuesto(splitId, freezeTeamId, deltaAdjustment);
      }

      await updateDoc(doc(db, `splits/${pilot.splitId}/equipos/${pilot.equipoId}/pilotos`, pilot.id), {
        congelado: true,
        congelado_en: lastDone?.id ?? null,
        pending_equipoId: freezeTeamId,
        pending_precio_compra: pendingPrice,
        pending_tipo_fichaje: "subasta",
      });

      setFreezeModal(null);
      setPendingPrecioCompra("");
      await loadData(pilot.splitId);
    } finally {
      setConfirmingFreeze(false);
    }
  }

  async function loadData(splitId: string) {
    setLoading(true);
    try {
      // ── Circuitos: convertir Timestamp y ordenar cronológicamente ──────────
      const circSnap = await getDocs(collection(db, `splits/${splitId}/circuitos`));
      const rawCircs = circSnap.docs.map(d => {
        const data = d.data() as any;
        return {
          id: d.id,
          nombre: data.nombre || d.id,
          ts: toMs(data.fecha),
          orden: data.numero_carrera ?? 0,
          completado: !!data.completado,
          economia_procesada: !!data.economia_procesada,
          resultados: data.resultados
        };
      });
      // Prioridad: numero_carrera → fecha → id alfabético
      const sortedCircs = [...rawCircs].sort((a, b) => {
        if (a.orden && b.orden) return a.orden - b.orden;
        if (a.orden) return -1;
        if (b.orden) return 1;
        if (a.ts !== b.ts) return a.ts - b.ts;
        return a.id.localeCompare(b.id);
      });
      setCircuits(sortedCircs.map(c => ({ id: c.id, nombre: c.nombre, ts: c.ts, completado: c.completado, economia_procesada: !!c.economia_procesada })));

      // ── Equipos ────────────────────────────────────────────────────────────
      const teamsSnap = await getDocs(collection(db, `splits/${splitId}/equipos`));
      const newTeams: TeamRow[] = [];
      const teamNameMap: Record<string, string> = {};

      for (const teamDoc of teamsSnap.docs) {
        const td = teamDoc.data() as any;
        newTeams.push({
          id: teamDoc.id, nombre: td.nombre || teamDoc.id,
          presupuesto: td.presupuesto ?? 0,
          presupuesto_inicial: td.presupuesto_inicial ?? null,
          puntos_constructores: td.puntos_constructores ?? 0,
          poles: 0, vueltas_rapidas: 0, sin_sanc: 0,
        });
        teamNameMap[teamDoc.id] = td.nombre || teamDoc.id;
      }

      // ── Pilotos anidados + nombres globales ─────────────────────────────────
      const pilotosSnap = await getDocs(collection(db, "pilotos"));
      const pilotGlobalMap: Record<string, any> = {};
      pilotosSnap.docs.forEach(d => { pilotGlobalMap[d.id] = d.data(); });

      const allPilots: PilotRow[] = [];
      for (const teamDoc of teamsSnap.docs) {
        const pilotosSubSnap = await getDocs(
          collection(db, `splits/${splitId}/equipos/${teamDoc.id}/pilotos`)
        );
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
            pending_equipoId:       pd.pending_equipoId,
            pending_precio_compra:  pd.pending_precio_compra,
            pending_tipo_fichaje:   pd.pending_tipo_fichaje,
          });
        }
      }

      // Marcar pilotos legacy: en splits 2+, cualquier piloto con ID piloto_X
      // que tenga un duplicado por nombre en cualquier equipo del mismo split
      if (splitId !== "split_1") {
        const nombreSet = new Set(
          allPilots.filter(p => !p.id.startsWith(LEGACY_PREFIX)).map(p => p.nombre.toLowerCase().trim())
        );
        allPilots.forEach(p => {
          if (p.id.startsWith(LEGACY_PREFIX) && nombreSet.has(p.nombre.toLowerCase().trim())) {
            p.isLegacy = true;
          }
        });
      }

      // ── Agregar stats de circuitos: poles, vuelta rápida, sin sancionados ──
      const pilotTeam: Record<string, string> = {};
      allPilots.forEach(p => { pilotTeam[p.id] = p.equipoId; });

      for (const c of rawCircs) {
        if (!c.completado || !Array.isArray(c.resultados)) continue;
        const pole = c.resultados.find((r: any) => r.qualyPos === 1);
        const fl   = c.resultados.find((r: any) => r.fastestLap);
        const allClean = c.resultados.every((r: any) => r.isClean);

        if (pole) {
          const t = newTeams.find(t => t.id === pilotTeam[pole.pilotoId]);
          if (t) t.poles++;
        }
        if (fl) {
          const t = newTeams.find(t => t.id === pilotTeam[fl.pilotoId]);
          if (t) t.vueltas_rapidas++;
        }
        if (allClean) {
          const teamsInRace = new Set(c.resultados.map((r: any) => pilotTeam[r.pilotoId]).filter(Boolean));
          teamsInRace.forEach(tid => {
            const t = newTeams.find(t => t.id === tid);
            if (t) t.sin_sanc++;
          });
        }
      }

      setTeams(newTeams.sort((a, b) => a.nombre.localeCompare(b.nombre)));
      setPilots(allPilots.sort((a, b) => a.equipoNombre.localeCompare(b.equipoNombre) || a.nombre.localeCompare(b.nombre)));
    } finally {
      setLoading(false);
    }
  }

  async function savePrecio(pilot: PilotRow, rawVal: string) {
    if (pilot.congelado) return;
    const newPrecio = parseFloat(rawVal);
    if (isNaN(newPrecio)) return;
    setSavingId(pilot.id);
    const precioAbs = Math.abs(newPrecio);
    const isNegativo = newPrecio < 0;
    const mantenerInicial = isNegativo
      ? Math.round((precioAbs / 3) * 10) / 10
      : Math.round(newPrecio * 3 * 10) / 10;
    const clausulaInicial = isNegativo
      ? Math.round((precioAbs / 2) * 10) / 10
      : Math.round(newPrecio * 2 * 10) / 10;
    await updateDoc(doc(db, `splits/${pilot.splitId}/equipos/${pilot.equipoId}/pilotos`, pilot.id), {
      precio_compra: newPrecio,
      mantener_actual: mantenerInicial,
      clausula_actual: clausulaInicial,
      mantener_inicial_split: mantenerInicial,
      clausula_inicial_split: clausulaInicial,
      precio_carrera_anterior: mantenerInicial,
      historial_precios: {},
    });

    // Recalcular presupuesto del equipo usando el nuevo precio (el estado local aún es el viejo)
    const newPresupuesto = getTeamPresupuesto(pilot.equipoId, pilot.id, newPrecio);
    if (newPresupuesto != null) {
      await updateDoc(doc(db, `splits/${pilot.splitId}/equipos`, pilot.equipoId), {
        presupuesto: newPresupuesto,
      });
    } else {
      // Sin presupuesto_inicial: ajustar por diferencia respecto al precio anterior
      const team = teams.find(t => t.id === pilot.equipoId);
      if (team) {
        const delta = newPrecio - pilot.precio_compra;
        await updateDoc(doc(db, `splits/${pilot.splitId}/equipos`, pilot.equipoId), {
          presupuesto: Math.round((team.presupuesto - delta) * 10) / 10,
        });
      }
    }

    setEditing(prev => { const n = { ...prev }; delete n[pilot.id]; return n; });
    await loadData(pilot.splitId);
    setSavingId(null);
  }

  async function deleteLegacy(pilot: PilotRow) {
    setDeletingId(pilot.id);
    await deleteDoc(doc(db, `splits/${pilot.splitId}/equipos/${pilot.equipoId}/pilotos`, pilot.id));
    await loadData(pilot.splitId);
    setDeletingId(null);
  }

  const visiblePilots = showLegacy ? pilots : pilots.filter(p => !p.isLegacy);
  const legacyCount = pilots.filter(p => p.isLegacy).length;

  const grouped = visiblePilots.reduce<Record<string, PilotRow[]>>((acc, p) => {
    (acc[p.equipoNombre] = acc[p.equipoNombre] || []).push(p);
    return acc;
  }, {});

  return (
    <div className="space-y-10">

      {/* ── CONTROLES ── */}
      <div className="flex items-center justify-between flex-wrap gap-4 border-b border-white/[0.06] pb-6">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[9px] font-mono uppercase tracking-[0.4em] text-white/20 shrink-0">Split</span>
          <div className="flex gap-0.5">
            {splits.filter((s: any) => s.id !== "global").map((s: any) => (
              <button key={s.id} onClick={() => setSelectedSplitId(s.id)}
                className={`px-5 py-2 text-[10px] font-black tracking-[0.2em] uppercase transition-all ${
                  selectedSplitId === s.id ? "bg-[#e10600] text-white" : "bg-white/[0.04] text-white/35 hover:bg-white/[0.08] hover:text-white/70"
                }`}
              >
                {s.nombre}
              </button>
            ))}
          </div>
          {loading && <Loader2 className="w-4 h-4 animate-spin text-white/30" />}
        </div>

        <div className="flex items-center gap-4 ml-auto">
          {legacyCount > 0 && (
            <button onClick={() => setShowLegacy(!showLegacy)}
              className={`text-[9px] font-mono uppercase tracking-[0.3em] transition-colors ${
                showLegacy ? "text-[#e10600]" : "text-white/25 hover:text-white/50"
              }`}
            >
              {showLegacy ? `Ocultar ${legacyCount} legacy` : `Mostrar ${legacyCount} legacy`}
            </button>
          )}
          <button
            onClick={resetEconomia}
            disabled={loading}
            className="text-[9px] font-mono uppercase tracking-[0.3em] text-[#e10600]/50 hover:text-[#e10600] transition-colors disabled:opacity-30"
          >
            Reset economía
          </button>
        </div>
      </div>

      {processLog.length > 0 && (
        <div className="border border-white/[0.06] bg-white/[0.015]">
          <div className="flex items-center justify-between px-4 py-2 border-b border-white/[0.04]">
            <span className="text-[9px] font-mono uppercase tracking-[0.3em] text-white/25">Log economía</span>
            <button onClick={() => setProcessLog([])}
              className="text-[9px] font-mono text-white/20 hover:text-white/50 transition-colors">✕ cerrar</button>
          </div>
          <div className="px-4 py-3 space-y-0.5 max-h-64 overflow-y-auto">
            {processLog.map((line, i) => {
              if (line.startsWith("equipo:")) {
                const [, nombre, total] = line.split(":");
                return (
                  <div key={i} className="flex items-baseline gap-2 text-[10px] font-mono pl-3">
                    <span className="text-white/35 w-3 shrink-0">→</span>
                    <span className="text-amber-400/80 font-bold">{nombre}</span>
                    <span className="text-amber-400 font-black">+{total}M</span>
                  </div>
                );
              }
              if (line.startsWith("piloto:")) {
                const [, nombre, mantAntes, mantDespues, clauDespues, congelado] = line.split(":");
                const decay = parseFloat(mantAntes) - parseFloat(mantDespues);
                const isCongelado = congelado === "true";
                return (
                  <div key={i} className="flex items-baseline gap-2 text-[10px] font-mono pl-3">
                    <span className="text-white/20 w-3 shrink-0">{isCongelado ? "❄" : "·"}</span>
                    <span className="text-white/60 min-w-[100px]">{nombre}</span>
                    <span className="text-white/30 text-[9px]">mant.</span>
                    <span className="text-white/40 tabular-nums">{mantAntes}→</span>
                    <span className={`tabular-nums font-bold ${parseFloat(mantDespues) < parseFloat(mantAntes) ? "text-[#e10600]/80" : "text-white/70"}`}>{mantDespues}M</span>
                    {!isCongelado && decay > 0 && <span className="text-white/20 text-[9px]">(-{r1(decay)})</span>}
                    <span className="text-white/20 text-[9px] ml-1">claus.</span>
                    <span className="text-white/35 tabular-nums text-[9px]">{clauDespues}M</span>
                  </div>
                );
              }
              const isError = line.startsWith("Error");
              const isDone = line.startsWith("✓");
              return (
                <div key={i} className={`text-[10px] font-mono ${isError ? "text-[#e10600]" : isDone ? "text-emerald-400/80" : "text-white/40"}`}>
                  {line}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── TABLA EQUIPOS ── */}
      <div>
        <div className="flex items-center gap-4 mb-4">
          <p className="text-[9px] font-mono uppercase tracking-[0.4em] text-white/20">Resumen de Escuderías</p>
          <span className="text-[9px] font-mono text-white/15">· clic en inicial para establecer</span>
        </div>
        <div className="overflow-x-auto border border-white/[0.06]">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="border-b border-white/[0.06] text-[9px] uppercase tracking-[0.25em] text-white/25 font-normal">
                <th className="py-3 px-4 text-left font-normal">Escudería</th>
                <th className="py-3 px-4 text-right font-normal">Inicial</th>
                <th className="py-3 px-4 text-right font-normal">Actual</th>
                <th className="py-3 px-4 text-right font-normal">Dif</th>
                <th className="py-3 px-4 text-right font-normal">Pts</th>
                <th className="py-3 px-4 text-right font-normal">Poles</th>
                <th className="py-3 px-4 text-right font-normal">V.R.</th>
                <th className="py-3 px-4 text-right font-normal">Sin S.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {teams.map(t => {
                const ini = t.presupuesto_inicial;
                const act = t.presupuesto;
                const dif = ini != null ? act - ini : null;
                const editVal = editingBudget[t.id];
                const isSavingB = savingBudget === t.id;
                return (
                  <tr key={t.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3 px-4 font-black text-sm text-white tracking-tight">{t.nombre}</td>

                    {/* Inicial — editable */}
                    <td className="py-3 px-4 text-right">
                      {editVal !== undefined ? (
                        <div className="flex items-center justify-end gap-1">
                          <input
                            type="number" step="0.1" value={editVal}
                            onChange={e => setEditingBudget(prev => ({ ...prev, [t.id]: e.target.value }))}
                            className="w-16 bg-black border border-white/20 px-1.5 py-0.5 text-right text-white outline-none focus:border-[#e10600] transition-colors text-[10px] font-mono"
                          />
                          <span className="text-white/30 text-[10px]">M</span>
                          <button disabled={isSavingB} onClick={() => savePresupuestoInicial(t, editVal)}
                            className="text-emerald-400 hover:text-emerald-300 disabled:opacity-50 px-0.5">
                            {isSavingB ? <Loader2 className="w-3 h-3 animate-spin" /> : "✓"}
                          </button>
                          <button onClick={() => setEditingBudget(prev => { const n = { ...prev }; delete n[t.id]; return n; })}
                            className="text-white/25 hover:text-white/60 px-0.5">✕</button>
                        </div>
                      ) : (
                        <span
                          className="cursor-pointer font-mono font-black text-white/40 hover:text-white transition-colors group"
                          onClick={() => setEditingBudget(prev => ({ ...prev, [t.id]: String(ini ?? act) }))}
                        >
                          {ini != null ? `${r1(ini)}M` : <span className="text-white/15 text-[9px]">— set</span>}
                          <span className="ml-1 text-white/15 group-hover:text-white/40 text-[9px]">✎</span>
                        </span>
                      )}
                    </td>

                    {/* Actual */}
                    <td className={`py-3 px-4 text-right font-black font-mono text-sm ${act < 0 ? "text-[#e10600]" : "text-white"}`}>
                      {r1(act)}M
                    </td>

                    {/* Diferencia */}
                    <td className="py-3 px-4 text-right font-mono text-xs tabular-nums">
                      {dif == null
                        ? <span className="text-white/15">—</span>
                        : <span className={dif >= 0 ? "text-emerald-400" : "text-amber-400"}>
                            {dif >= 0 ? "+" : ""}{r1(dif)}M
                          </span>
                      }
                    </td>

                    <td className="py-3 px-4 text-right font-mono text-white/50 text-xs">{t.puntos_constructores}</td>
                    <td className="py-3 px-4 text-right font-mono text-white/50 text-xs">{t.poles}</td>
                    <td className="py-3 px-4 text-right font-mono text-white/50 text-xs">{t.vueltas_rapidas}</td>
                    <td className="py-3 px-4 text-right font-mono text-white/50 text-xs">{t.sin_sanc}</td>
                  </tr>
                );
              })}
              {teams.length === 0 && !loading && (
                <tr><td colSpan={8} className="py-8 text-center text-[10px] font-mono text-white/15 uppercase tracking-widest">Sin escuderías</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── TABLA PILOTOS ── */}
      <div>
        <div className="flex items-center gap-4 mb-4">
          <p className="text-[9px] font-mono uppercase tracking-[0.4em] text-white/20">Evolución de Precios</p>
          <span className="text-[9px] font-mono text-white/15">· clic en precio para editar</span>
        </div>

        <div className="overflow-x-auto border border-white/[0.06]">
          <table className="text-[10px] border-collapse font-mono min-w-full">
            <thead>
              <tr className="border-b border-white/[0.06] text-[9px] uppercase tracking-[0.2em] text-white/25 font-normal">
                <th className="py-3 px-3 text-left font-normal sticky left-0 bg-[#0a0a0a] z-10 min-w-[130px]">Piloto</th>
                <th className="py-3 px-3 text-right font-normal min-w-[80px]">Precio</th>
                <th className="py-3 px-3 text-right font-normal min-w-[80px]">Próximo split</th>
                <th className="py-3 px-2 text-center font-normal min-w-[48px]">Tipo</th>
                {circuits.map(c => (
                  <th key={c.id} className="py-3 px-3 text-right font-normal min-w-[80px] whitespace-nowrap">
                    <span className={c.economia_procesada ? "text-white/70" : c.completado ? "text-white/40" : "text-white/20"}>
                      {c.nombre}
                    </span>
                    <span className="block text-[7px] text-white/15 tracking-normal normal-case font-normal mt-0.5">
                      mant. / claus.
                    </span>
                    {c.completado
                      ? <button
                          onClick={() => c.economia_procesada ? fixFreezeHistorial(c) : reprocesarEconomia(c)}
                          disabled={reprocesando === c.id}
                          className={`flex items-center gap-0.5 text-[7px] tracking-normal normal-case font-normal transition-colors mt-0.5 ${
                            c.economia_procesada
                              ? "text-emerald-500/50 hover:text-amber-300"
                              : "text-amber-400/70 hover:text-amber-300"
                          }`}
                        >
                          {reprocesando === c.id ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <RefreshCw className="w-2.5 h-2.5" />}
                          {reprocesando === c.id ? "..." : c.economia_procesada ? "eco. ok" : "procesar"}
                        </button>
                      : null
                    }
                  </th>
                ))}
                <th className="py-3 px-3 text-right font-normal min-w-[64px]">
                  <span className="block text-white/50">Mant.</span>
                  <span className="block text-white/25 text-[8px] font-normal normal-case tracking-normal">Claus.</span>
                </th>
                {showLegacy && <th className="py-3 px-2 font-normal min-w-[36px]" />}
              </tr>
            </thead>
            <tbody>
              {Object.entries(grouped).map(([equipo, pilotList]) => (
                <>
                  <tr key={`hdr-${equipo}`}>
                    <td colSpan={4 + circuits.length + (showLegacy ? 1 : 0)}
                      className="py-2 px-3 text-[9px] uppercase tracking-[0.3em] text-[#e10600] font-black border-y border-white/[0.04] bg-white/[0.015]">
                      {equipo}
                    </td>
                  </tr>

                  {pilotList.map(pilot => {
                    const editVal = editing[pilot.id];
                    const isSaving = savingId === pilot.id;
                    const isDeleting = deletingId === pilot.id;
                    return (
                      <tr key={pilot.id}
                        className={`border-b border-white/[0.04] hover:bg-white/[0.015] transition-colors ${pilot.isLegacy ? "opacity-35" : ""}`}>

                        {/* Nombre + congelado */}
                        <td className="py-3 px-3 sticky left-0 bg-[#0a0a0a] max-w-[130px]">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-white/90 truncate text-[11px]">{pilot.nombre}</span>
                            <button
                              onClick={() => handleClickCongelar(pilot)}
                              title={pilot.congelado ? "Congelado — clic para descongelar" : "Clic para congelar y asignar equipo"}
                              className={`shrink-0 text-[11px] leading-none transition-colors ${pilot.congelado ? "text-blue-400" : "text-white/15 hover:text-white/40"}`}
                            >❄</button>
                          </div>
                          {pilot.isLegacy && <span className="text-[8px] text-[#e10600]/40">legacy</span>}
                        </td>

                        {/* Precio editable */}
                        <td className="py-3 px-3 text-right">
                          {(pilot.congelado || pilot.pending_equipoId) ? (
                            <div className="space-y-1">
                              <span className="text-white/40">{r1(pilot.precio_compra)}M</span>
                              <span className="text-blue-400 text-[9px] font-mono">vigente</span>
                            </div>
                          ) : editVal !== undefined ? (
                            <div className="flex items-center justify-end gap-1">
                              <input type="number" step="0.1" value={editVal}
                                onChange={e => setEditing(prev => ({ ...prev, [pilot.id]: e.target.value }))}
                                className="w-14 bg-black border border-white/20 px-1.5 py-0.5 text-right text-white outline-none focus:border-[#e10600] transition-colors text-[10px]"
                              />
                              <button disabled={isSaving} onClick={() => savePrecio(pilot, editVal)}
                                className="text-emerald-400 hover:text-emerald-300 disabled:opacity-50 px-0.5">
                                {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : "✓"}
                              </button>
                              <button onClick={() => setEditing(prev => { const n = { ...prev }; delete n[pilot.id]; return n; })}
                                className="text-white/25 hover:text-white/60 px-0.5">✕</button>
                            </div>
                          ) : (
                            <span className="cursor-pointer text-white/40 hover:text-white transition-colors group"
                              onClick={() => setEditing(prev => ({ ...prev, [pilot.id]: String(pilot.precio_compra) }))}
                            >
                              {r1(pilot.precio_compra)}M
                              <span className="ml-1 text-white/20 group-hover:text-white/50 text-[9px]">✎</span>
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right">
                          {pilot.pending_precio_compra != null ? (() => {
                            const pp = pilot.pending_precio_compra;
                            const ppAbs = Math.abs(pp);
                            const nextM  = pp < 0 ? Math.round(ppAbs / 3 * 10) / 10 : Math.round(pp * 3 * 10) / 10;
                            const nextCl = pp < 0 ? Math.round(ppAbs / 2 * 10) / 10 : Math.round(pp * 2 * 10) / 10;
                            return (
                              <div className="space-y-0.5">
                                <span className={`block tabular-nums font-bold text-[10px] ${cellBg(nextM)}`}>{r1(nextM)}</span>
                                <span className={`block tabular-nums text-[9px] ${cellBg(nextCl)}`}>{r1(nextCl)}</span>
                                <span className="block text-blue-400/60 text-[8px] font-mono">({r1(pp)}M)</span>
                              </div>
                            );
                          })() : (
                            <span className="text-white/30">—</span>
                          )}
                        </td>
                        <td className="py-3 px-2 text-center">
                          {savingTipo === pilot.id
                            ? <Loader2 className="w-3 h-3 animate-spin text-white/30 mx-auto" />
                            : pilot.congelado
                              ? (() => {
                                  const t = pilot.pending_tipo_fichaje ?? pilot.tipo_fichaje;
                                  return (
                                    <span className={`text-[8px] uppercase tracking-[0.1em] font-bold ${
                                      t === "clausula" ? "text-orange-400"
                                      : t === "subasta" ? "text-[#e10600]"
                                      : t === "mantener" ? "text-blue-400"
                                      : "text-white/20"
                                    }`}>
                                      {t === "subasta" ? "SUB" : t === "clausula" ? "CL" : t === "mantener" ? "MNT" : "—"}
                                    </span>
                                  );
                                })()
                              : (
                                <div className="flex flex-col gap-0.5 items-center">
                                  {(["subasta", "clausula", "mantener"] as TipoFichaje[]).map(t => (
                                    <button key={t}
                                      onClick={() => setTipoFichaje(pilot, pilot.tipo_fichaje === t ? null : t)}
                                      className={`text-[7px] uppercase tracking-[0.1em] px-1.5 py-0.5 w-full transition-colors leading-none ${
                                        pilot.tipo_fichaje === t
                                          ? t === "clausula" ? "bg-orange-500/80 text-white"
                                          : t === "subasta" ? "bg-[#e10600]/80 text-white"
                                          : "bg-blue-500/50 text-white"
                                          : "text-white/15 hover:text-white/40"
                                      }`}
                                    >
                                      {t === "subasta" ? "SUB" : t === "clausula" ? "CL" : "MNT"}
                                    </button>
                                  ))}
                                </div>
                              )
                          }
                        </td>

                        {/* Historial por carrera — mantener + cláusula apilados */}
                        {circuits.map(c => {
                          const h = pilot.historial[c.id];
                          const m = h?.mantener ?? null;
                          const cl = h?.clausula ?? null;
                          const isCongeladoEnCircuito = h?.congelado ?? false;
                          return (
                            <td key={c.id} className="py-3 px-3 text-right">
                              {isCongeladoEnCircuito ? (
                                <span className="text-blue-400/60 text-[11px]">❄</span>
                              ) : (
                                <>
                                  <span className={`block tabular-nums font-bold ${cellBg(m)}`}>{r1(m)}</span>
                                  <span className={`block tabular-nums text-[9px] mt-0.5 ${cellBg(cl)}`}>{r1(cl)}</span>
                                </>
                              )}
                            </td>
                          );
                        })}

                        {/* Mantener actual + Cláusula actual — ocultos si congelado */}
                        <td className="py-3 px-3 text-right border-l border-white/[0.04]">
                          {pilot.congelado ? (
                            <span className="text-blue-400 text-[11px]">❄</span>
                          ) : (
                            <>
                              <span className={`block tabular-nums font-black text-[11px] ${cellBg(pilot.mantener_actual)}`}>
                                {r1(pilot.mantener_actual)}
                              </span>
                              <span className={`block tabular-nums text-[9px] mt-0.5 ${cellBg(pilot.clausula_actual)}`}>
                                {r1(pilot.clausula_actual)}
                              </span>
                            </>
                          )}
                        </td>

                        {showLegacy && pilot.isLegacy && (
                          <td className="py-3 px-2">
                            <button disabled={isDeleting} onClick={() => deleteLegacy(pilot)}
                              className="text-[#e10600]/40 hover:text-[#e10600] disabled:opacity-40 transition-colors">
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
          <p className="text-[10px] font-mono uppercase tracking-[0.35em] text-white/15 mt-6 text-center py-12">
            Sin pilotos en este split
          </p>
        )}
      </div>

      {/* ── Modal: congelar + asignar equipo ────────────────────────────────── */}
      {freezeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-[#0d0d0d] border border-white/10 rounded-sm w-full max-w-sm mx-4 shadow-2xl">
            {/* Header */}
            <div className="flex items-center gap-2 px-5 py-4 border-b border-white/[0.06]">
              <span className="text-blue-400 text-base">❄</span>
              <h3 className="text-xs font-black uppercase tracking-widest text-white">Congelar piloto</h3>
            </div>

            <div className="px-5 py-4 space-y-4">
              {/* Piloto info */}
              <div className="flex items-baseline justify-between">
                <span className="text-sm font-bold text-white">{freezeModal.nombre}</span>
                <span className="text-[10px] font-mono text-white/40">
                  precio: <span className="text-white/70">{freezeModal.precio_compra}M</span>
                </span>
              </div>

              <div className="space-y-1.5">
                <p className="text-[9px] font-mono uppercase tracking-[0.3em] text-white/30">
                  El piloto queda congelado en este split. En el siguiente split se transferirá al equipo elegido.
                </p>
                <p className="text-[9px] font-mono text-white/20">
                  Precio actual: {freezeModal.precio_compra}M · Mantener: {freezeModal.mantener_actual}M · Cláusula: {freezeModal.clausula_actual}M
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-[9px] font-mono uppercase tracking-[0.3em] text-white/30 block">
                  Precio de fichaje para el próximo split
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="0.1"
                    value={pendingPrecioCompra}
                    onChange={e => setPendingPrecioCompra(e.target.value)}
                    className="flex-1 bg-[#0a0a0a] border border-white/10 text-white text-sm font-black px-3 py-2 outline-none focus:border-[#e10600] transition-colors font-mono text-right"
                    placeholder="0.0"
                  />
                  <span className="text-white/40 font-mono text-sm font-bold shrink-0">M</span>
                </div>
              </div>

              {/* Selector de equipo */}
              <div className="space-y-1.5">
                <label className="text-[9px] font-mono uppercase tracking-[0.3em] text-white/30 block">
                  Asignar al equipo
                </label>
                <select
                  value={freezeTeamId}
                  onChange={e => setFreezeTeamId(e.target.value)}
                  className="w-full bg-[#0a0a0a] border border-white/10 text-white text-[11px] px-3 py-2 outline-none focus:border-[#e10600] transition-colors font-mono"
                >
                  {teams.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.nombre} — presupuesto: {t.presupuesto}M
                    </option>
                  ))}
                </select>
              </div>

              {/* Aviso de congelación */}
              {(() => {
                const team = teams.find(t => t.id === freezeTeamId);
                if (!team) return null;
                return (
                  <p className="text-[9px] font-mono text-white/30">
                    El piloto permanecerá en el equipo actual durante este split y se transferirá a <span className="text-white/50">{team.nombre}</span> en el siguiente split.
                  </p>
                );
              })()}
            </div>

            {/* Acciones */}
            <div className="flex gap-2 px-5 py-4 border-t border-white/[0.06]">
              <button
                onClick={() => { setFreezeModal(null); setPendingPrecioCompra(""); }}
                disabled={confirmingFreeze}
                className="flex-1 py-2 text-[10px] font-mono uppercase tracking-widest text-white/40 hover:text-white/70 border border-white/10 hover:border-white/20 transition-colors disabled:opacity-40"
              >
                Cancelar
              </button>
              <button
                onClick={confirmFreeze}
                disabled={confirmingFreeze || !freezeTeamId || Number.isNaN(parseFloat(pendingPrecioCompra || ""))}
                className="flex-1 py-2 text-[10px] font-black uppercase tracking-widest bg-blue-600 hover:bg-blue-500 text-white transition-colors disabled:opacity-40 flex items-center justify-center gap-1.5"
              >
                {confirmingFreeze ? <Loader2 className="w-3 h-3 animate-spin" /> : "❄"}
                {confirmingFreeze ? "Procesando…" : "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
