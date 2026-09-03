import { useState, useEffect, useRef } from "react";
import { collection, getDocs, getDoc, doc, setDoc, updateDoc, deleteDoc, writeBatch, increment, runTransaction } from "firebase/firestore";
import { db } from "../services/firebase";
import {
  procesarEconomiaCarrera, ficharPiloto, recalcularCurvaPreciosSplit,
  mantenerInicialDe, clausulaInicialDe,
  calcularPuntosPosicion,
  calcularMillonesRivalidadClasificacion, calcularMillonesRivalidadCarrera,
  M_PUNTOS_FACTOR, M_POLE, M_VUELTA_RAPIDA, M_SIN_SANCIONADOS, M_PARTICIPACION,
  M_SOLO_POR_CARRERA,
} from "../services/economyService";
import { aplicarAperturas, derivarAperturas, type AperturaDerivada } from "../services/splitBuilder";
import { Loader2, Trash2, RefreshCw, ArrowRightLeft } from "lucide-react";

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
  presupuesto: number;
  presupuesto_inicial: number | null;
  puntos_constructores: number;
  poles: number;
  vueltas_rapidas: number;
  sin_sanc: number;
  ingresos_rivalidades: number;
  ingresos_premios: number;
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
  if (val == null) return "text-white/15";
  if (val < 0) return "text-[#e10600] font-black";
  if (val > 150) return "text-amber-300 font-bold";
  if (val > 80) return "text-white font-bold";
  return "text-white/60";
}

function ratingColor(r: number): string {
  if (r >= 85) return "text-amber-300 font-black";
  if (r >= 75) return "text-white font-bold";
  if (r >= 65) return "text-white/60";
  return "text-white/30";
}

const TIPO_LABEL: Record<TipoFichaje, string> = { subasta: "SUB", clausula: "CL", mantener: "MNT" };
const TIPO_COLORS: Record<TipoFichaje, string> = {
  subasta: "bg-[#e10600]/20 text-[#e10600]/80",
  clausula: "bg-orange-500/20 text-orange-300/80",
  mantener: "bg-blue-500/20 text-blue-300/80",
};

const LEGACY_PREFIX = "piloto_";

// ─── COMPONENT ────────────────────────────────────────────────────────────────

export function EconomyAdminPanel({ splits }: { splits: any[] }) {
  const activeSplits = splits
    .filter((s: any) => s.id !== "global" && s.id !== "origins" && s.tipo !== "individual")
    .sort((a: any, b: any) => Number(a.orden ?? 999) - Number(b.orden ?? 999));
  const [selectedSplitId, setSelectedSplitId] = useState(activeSplits.find((split: any) => split.id === "split_1")?.id ?? activeSplits[0]?.id ?? "");
  const [circuits, setCircuits] = useState<CircuitoCol[]>([]);
  const [teams, setTeams] = useState<TeamRow[]>([]);
  const [pilots, setPilots] = useState<PilotRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showLegacy, setShowLegacy] = useState(false);
  const [reprocesando, setReprocesando] = useState<string | null>(null);
  const [editingBudget, setEditingBudget] = useState<Record<string, string>>({});
  const [savingBudget, setSavingBudget] = useState<string | null>(null);
  const [processLog, setProcessLog] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<"precios" | "rendimiento">("precios");
  const loadRequestRef = useRef(0);

  // Modal de fichaje
  const [fichajeModal, setFichajeModal] = useState<PilotRow | null>(null);
  const [fichajeEquipoId, setFichajeEquipoId] = useState("");
  const [fichajeTipo, setFichajeTipo] = useState<TipoFichaje>("subasta");
  const [pendingPrecioCompra, setPendingPrecioCompra] = useState("");
  const [confirmingFichaje, setConfirmingFichaje] = useState(false);

  // Apertura derivada del bloque anterior
  const [aperturas, setAperturas] = useState<AperturaDerivada[] | null>(null);
  const [avisosApertura, setAvisosApertura] = useState<string[]>([]);
  const [derivando, setDerivando] = useState(false);
  const [mensajeApertura, setMensajeApertura] = useState("");

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
    setAperturas(null);
    setAvisosApertura([]);
    setMensajeApertura("");
  }, [selectedSplitId]);

  useEffect(() => {
    if (!activeSplits.some((split: any) => split.id === selectedSplitId)) {
      setSelectedSplitId(activeSplits[0]?.id ?? "");
    }
  }, [splits, selectedSplitId]);

  // ─── HELPERS DE PRESUPUESTO ──────────────────────────────────────────────────

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

  // ─── CARGA DE DATOS ──────────────────────────────────────────────────────────

  async function loadData(splitId: string) {
    const requestId = ++loadRequestRef.current;
    setLoading(true);
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
          presupuesto: td.presupuesto ?? 0,
          presupuesto_inicial: td.presupuesto_inicial ?? null,
          puntos_constructores: td.puntos_constructores ?? 0,
          poles: 0, vueltas_rapidas: 0, sin_sanc: 0,
           ingresos_rivalidades: -(td.economia_historica?.ajuste_rivalidades ?? 0),
           ingresos_premios: -(td.economia_historica?.ajuste_premios ?? 0),
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

      // Compute income breakdown directly from processed race results (no transacciones dependency)
      const splitDoc = await getDoc(doc(db, "splits", splitId));
      const rivalries = splitDoc.data()?.rivalries;
      const soloPilotIds = new Set<string>((rivalries?.soloPilots || []).map((p: any) => p.id));
      const rivalryGroups: any[] = rivalries?.groups || [];

      for (const c of rawCircs) {
        if (!c.completado || !c.economia_procesada || !Array.isArray(c.resultados)) continue;
        const resultados: any[] = c.resultados;

        const participatingTeams = new Set<string>();
        const dirtyTeams = new Set<string>();
        for (const r of resultados) {
           const tid = r.equipoId ?? pilotTeam[r.pilotoId];
          if (!tid) continue;
          participatingTeams.add(tid);
          if (!r.isClean) dirtyTeams.add(tid);
        }

        for (const r of resultados) {
           const tid = r.equipoId ?? pilotTeam[r.pilotoId];
          const team = newTeams.find(t => t.id === tid);
          if (!team) continue;

          const isDNF = r.racePos === 99;
           const ptsPos  = isDNF ? 0 : calcularPuntosPosicion(r.racePos);
          const ptsPole = r.qualyPos === 1 ? 2 : 0;
          const totalPts = ptsPos + ptsPole;
          if (totalPts > 0) team.ingresos_premios += parseFloat((totalPts * M_PUNTOS_FACTOR).toFixed(2));

          if (r.qualyPos === 1) team.ingresos_premios += M_POLE;
          if (r.fastestLap)    team.ingresos_premios += M_VUELTA_RAPIDA;
          if (soloPilotIds.has(r.pilotoId)) team.ingresos_rivalidades += M_SOLO_POR_CARRERA;
        }

         for (const tid of participatingTeams) {
           const participatingTeam = newTeams.find(t => t.id === tid);
           if (participatingTeam) participatingTeam.ingresos_premios += M_PARTICIPACION;
           if (!dirtyTeams.has(tid)) {
            const team = newTeams.find(t => t.id === tid);
            if (team) team.ingresos_premios += M_SIN_SANCIONADOS;
          }
        }

        for (const group of rivalryGroups) {
          if (group.type === "solo") continue;
          const members = group.members
            .map((m: any) => {
              const r = resultados.find((res: any) => res.pilotoId === m.id);
               const tid = r?.equipoId ?? pilotTeam[m.id];
              if (!r || !tid) return null;
              return { qualyPos: r.qualyPos, racePos: r.racePos, teamId: tid };
            })
            .filter(Boolean);
          if (members.length < 2) continue;

          [...members].sort((a: any, b: any) => a.qualyPos - b.qualyPos).forEach((member: any, index) => {
            const team = newTeams.find(t => t.id === member.teamId);
            if (team) team.ingresos_rivalidades += calcularMillonesRivalidadClasificacion(index + 1, members.length);
          });
          [...members].sort((a: any, b: any) => a.racePos - b.racePos).forEach((member: any, index) => {
            const team = newTeams.find(t => t.id === member.teamId);
            if (team) team.ingresos_rivalidades += calcularMillonesRivalidadCarrera(index + 1, members.length);
          });
        }
      }

      if (requestId !== loadRequestRef.current) return;
      setGlobalPilots(
        Object.entries(pilotGlobalMap)
          .map(([id, data]) => ({ id, nombre: (data as any).nombre || id }))
          .sort((a, b) => a.nombre.localeCompare(b.nombre))
      );
      setCircuits(nextCircuits);
      setTeams(newTeams.sort((a, b) => a.nombre.localeCompare(b.nombre)));
      setPilots(allPilots.sort((a, b) => a.equipoNombre.localeCompare(b.equipoNombre) || a.nombre.localeCompare(b.nombre)));
    } finally {
      if (requestId === loadRequestRef.current) setLoading(false);
    }
  }

  // ─── ACCIONES ────────────────────────────────────────────────────────────────

  async function procesarEconomia(circuit: CircuitoCol) {
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
  }

  async function fixFichajePricesHistorial(circuit: CircuitoCol) {
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
  }

  async function savePresupuestoInicial(team: TeamRow, rawVal: string) {
    const val = parseFloat(rawVal);
    if (isNaN(val)) return;
    setSavingBudget(team.id);
    const presupuesto = team.presupuesto_inicial == null
      ? val
      : Math.round((team.presupuesto + val - team.presupuesto_inicial) * 10) / 10;
    await updateDoc(doc(db, `splits/${selectedSplitId}/equipos`, team.id), { presupuesto_inicial: val, presupuesto });
    setEditingBudget(prev => { const n = { ...prev }; delete n[team.id]; return n; });
    await loadData(selectedSplitId);
    setSavingBudget(null);
  }

  async function recalcularPrecios() {
    if (!confirm(
      `Recalcula mantener y cláusula de cada carrera de ${selectedSplitId} desde el precio de compra.\n\n` +
      "No toca presupuestos, transacciones ni resultados. Los precios pactados en mercado se respetan.\n\n¿Continuar?"
    )) return;
    setLoading(true);
    setProcessLog([`Recalculando la curva de precios de ${selectedSplitId}…`]);
    try {
      await recalcularCurvaPreciosSplit(selectedSplitId, msg => setProcessLog(prev => [...prev, msg]));
      await loadData(selectedSplitId);
    } catch (err: any) {
      setProcessLog(prev => [...prev, `Error: ${err.message}`]);
    } finally {
      setLoading(false);
    }
  }

  async function resetEconomia() {
    if (!confirm(`¿Resetear toda la economía de ${selectedSplitId}?`)) return;
    setLoading(true);
    setProcessLog([]);
    try {
      const [circSnap, equiposSnap] = await Promise.all([
        getDocs(collection(db, `splits/${selectedSplitId}/circuitos`)),
        getDocs(collection(db, `splits/${selectedSplitId}/equipos`)),
      ]);
      const b1 = writeBatch(db);
      for (const equipoDoc of equiposSnap.docs) {
        const pilotosSnap = await getDocs(collection(db, `splits/${selectedSplitId}/equipos/${equipoDoc.id}/pilotos`));
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
      setProcessLog(["✓ Reset completo"]);
      await loadData(selectedSplitId);
    } catch (err: any) {
      setProcessLog([`Error: ${err.message}`]);
    } finally {
      setLoading(false);
    }
  }

  async function savePrecio(pilot: PilotRow, rawVal: string) {
    if (pilot.congelado) return;
    const newPrecio = parseFloat(rawVal);
    if (isNaN(newPrecio)) return;
    setSavingId(pilot.id);
    // Un precio negativo divide en vez de multiplicar, conservando el signo (Excel T2/T3).
    const isNegativo = newPrecio < 0;
    const mantenerInicial = Math.round((isNegativo ? newPrecio / 3 : newPrecio * 3) * 10) / 10;
    const clausulaInicial = Math.round((isNegativo ? newPrecio / 2 : newPrecio * 2) * 10) / 10;
    await updateDoc(doc(db, `splits/${pilot.splitId}/equipos/${pilot.equipoId}/pilotos`, pilot.id), {
      precio_compra: newPrecio, mantener_actual: mantenerInicial, clausula_actual: clausulaInicial,
      mantener_inicial_split: mantenerInicial, clausula_inicial_split: clausulaInicial,
      precio_carrera_anterior: mantenerInicial, historial_precios: {},
    });
    const newPresupuesto = getTeamPresupuesto(pilot.equipoId, pilot.id, newPrecio);
    if (newPresupuesto != null) {
      await updateDoc(doc(db, `splits/${pilot.splitId}/equipos`, pilot.equipoId), { presupuesto: newPresupuesto });
    } else {
      const team = teams.find(t => t.id === pilot.equipoId);
      if (team) {
        const delta = newPrecio - pilot.precio_compra;
        await updateDoc(doc(db, `splits/${pilot.splitId}/equipos`, pilot.equipoId), { presupuesto: Math.round((team.presupuesto - delta) * 10) / 10 });
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

  // ─── PROPAGACIÓN AL SIGUIENTE SPLIT ─────────────────────────────────────────

  function getNextSplitId(currentSplitId: string): string | null {
    const sorted = splits
      .filter((s: any) => s.id !== "global")
      .sort((a: any, b: any) => (Number(a.orden) || 0) - (Number(b.orden) || 0) || a.id.localeCompare(b.id));
    const idx = sorted.findIndex((s: any) => s.id === currentSplitId);
    if (idx < 0 || idx >= sorted.length - 1) return null;
    return sorted[idx + 1].id;
  }

  async function propagateToNextSplit(
    pilot: PilotRow,
    targetEquipoId: string,
    pendingPrice: number,
    tipo: TipoFichaje
  ) {
    const nextSplitId = getNextSplitId(pilot.splitId);
    if (!nextSplitId) return;

    const isFreeze = pendingPrice === -110;
    // Los tres tipos acaban en la misma puja del día de mercado, así que el precio del
    // siguiente split es lo que se pagó, sin descuentos: mantener no es una renovación
    // privada, es ganar la puja sobre tu propio piloto.
    const nextPrecioCompra = isFreeze ? pilot.precio_compra : pendingPrice;
    // Un precio negativo divide en vez de multiplicar, conservando el signo (Excel T2/T3).
    const nextMantener = isFreeze ? pilot.mantener_actual : mantenerInicialDe(nextPrecioCompra);
    const nextClausula = isFreeze ? pilot.clausula_actual : clausulaInicialDe(nextPrecioCompra);

    // Si el piloto estaba en otro equipo en el siguiente split, borrarlo de allí
    const nextEquiposSnap = await getDocs(collection(db, `splits/${nextSplitId}/equipos`));
    for (const eqDoc of nextEquiposSnap.docs) {
      if (eqDoc.id === targetEquipoId) continue;
      const pRef = doc(db, `splits/${nextSplitId}/equipos/${eqDoc.id}/pilotos`, pilot.id);
      const pSnap = await getDoc(pRef);
      if (pSnap.exists()) { await deleteDoc(pRef); break; }
    }

    // Escribir el piloto en el equipo destino del siguiente split
    const nextRef = doc(db, `splits/${nextSplitId}/equipos/${targetEquipoId}/pilotos`, pilot.id);
    const existingSnap = await getDoc(nextRef);
    const base = existingSnap.exists()
      ? existingSnap.data()
      : {
          pilotoId: pilot.id,
          rating_piloto: pilot.rating_piloto,
          rating_base: pilot.rating_piloto,
          puntos_piloto: 0, victorias: 0, podios: 0,
          poles: 0, dnfs: 0, carreras_limpias: 0,
        };

    await setDoc(nextRef, {
      ...base,
      equipoId:                targetEquipoId,
      tipo_fichaje:            tipo,
      precio_compra:           nextPrecioCompra,
      mantener_actual:         nextMantener,
      clausula_actual:         nextClausula,
      mantener_inicial_split:  nextMantener,
      clausula_inicial_split:  nextClausula,
      precio_carrera_anterior: nextMantener,
      historial_precios:       {},
      congelado:               isFreeze,
      congelado_en:            null,
      pending_equipoId:        null,
      pending_precio_compra:   null,
      pending_tipo_fichaje:    null,
    });
  }

  async function revertFromNextSplit(pilot: PilotRow, prevPendingEquipoId: string) {
    const nextSplitId = getNextSplitId(pilot.splitId);
    if (!nextSplitId) return;

    const fichajedRef = doc(db, `splits/${nextSplitId}/equipos/${prevPendingEquipoId}/pilotos`, pilot.id);
    const fichajedSnap = await getDoc(fichajedRef);
    if (!fichajedSnap.exists()) return;

    if (prevPendingEquipoId !== pilot.equipoId) {
      // Fichaje cross-team: eliminar del nuevo equipo y restaurar en el original.
      // El precio de compra vuelve a ser el del split de origen, así que mantener y
      // cláusula se rederivan de él: arrastrar los valores de cierre dejaría al piloto
      // con una curva que no cuadra con su precio.
      await deleteDoc(fichajedRef);
      await setDoc(doc(db, `splits/${nextSplitId}/equipos/${pilot.equipoId}/pilotos`, pilot.id), {
        pilotoId:                pilot.id,
        equipoId:                pilot.equipoId,
        rating_piloto:           pilot.rating_piloto,
        rating_base:             pilot.rating_piloto,
        tipo_fichaje:            pilot.tipo_fichaje ?? null,
        puntos_piloto: 0, victorias: 0, podios: 0,
        poles: 0, dnfs: 0, carreras_limpias: 0,
        precio_compra:           pilot.precio_compra,
        mantener_actual:         mantenerInicialDe(pilot.precio_compra),
        clausula_actual:         clausulaInicialDe(pilot.precio_compra),
        mantener_inicial_split:  mantenerInicialDe(pilot.precio_compra),
        clausula_inicial_split:  clausulaInicialDe(pilot.precio_compra),
        precio_carrera_anterior: mantenerInicialDe(pilot.precio_compra),
        historial_precios:       {},
        congelado:               false,
        congelado_en:            null,
        pending_equipoId:        null,
        pending_precio_compra:   null,
        pending_tipo_fichaje:    null,
      });
    } else {
      // Renovación same-team: revertir al precio del split actual, con su curva rederivada.
      await updateDoc(fichajedRef, {
        precio_compra:           pilot.precio_compra,
        mantener_actual:         mantenerInicialDe(pilot.precio_compra),
        clausula_actual:         clausulaInicialDe(pilot.precio_compra),
        mantener_inicial_split:  mantenerInicialDe(pilot.precio_compra),
        clausula_inicial_split:  clausulaInicialDe(pilot.precio_compra),
        precio_carrera_anterior: mantenerInicialDe(pilot.precio_compra),
        historial_precios:       {},
        congelado:               false,
        pending_equipoId:        null,
        pending_precio_compra:   null,
        pending_tipo_fichaje:    null,
      });
    }
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
      await loadData(selectedSplitId);
    } finally {
      setConfirmingAlta(false);
    }
  }

  // ─── APERTURA DERIVADA DEL BLOQUE ANTERIOR ───────────────────────────────────

  // El bloque anterior es el inmediatamente por debajo en orden: la apertura de este split
  // sale de su cierre menos lo que costó el mercado, sin teclear ninguna cifra.
  const splitAnteriorId: string | null = (() => {
    const idx = activeSplits.findIndex((split: any) => split.id === selectedSplitId);
    return idx > 0 ? activeSplits[idx - 1].id : null;
  })();

  async function previsualizarAperturas() {
    if (!splitAnteriorId) return;
    setDerivando(true);
    setMensajeApertura("");
    try {
      const { filas, avisos } = await derivarAperturas(selectedSplitId, splitAnteriorId);
      setAperturas(filas);
      setAvisosApertura(avisos);
    } catch (error: any) {
      setMensajeApertura(`Error al derivar: ${error.message}`);
    } finally {
      setDerivando(false);
    }
  }

  async function confirmarAperturas() {
    if (!aperturas) return;
    setDerivando(true);
    try {
      const resultado = await aplicarAperturas(selectedSplitId, aperturas);
      setMensajeApertura(resultado.message);
      if (resultado.ok) {
        setAperturas(null);
        setAvisosApertura([]);
        await loadData(selectedSplitId);
      }
    } finally {
      setDerivando(false);
    }
  }

  // ─── SISTEMA DE FICHAJES ─────────────────────────────────────────────────────

  function handleFichar(pilot: PilotRow) {
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
    const pilotRef = doc(db, `splits/${pilot.splitId}/equipos/${pilot.equipoId}/pilotos`, pilot.id);
    const revertedTeamId = await runTransaction(db, async transaction => {
      const currentPilot = await transaction.get(pilotRef);
      if (!currentPilot.exists()) throw new Error("El piloto ya no existe en este equipo.");
      const data = currentPilot.data();
      const pendingTeamId = data.pending_equipoId as string | undefined;
      const pendingPrice = data.pending_precio_compra as number | undefined;
      const teamRef = pendingTeamId && pendingTeamId !== "agente_libre"
        ? doc(db, `splits/${pilot.splitId}/equipos`, pendingTeamId)
        : null;
      if (teamRef) await transaction.get(teamRef);
      if (teamRef && pendingPrice != null) {
        transaction.update(teamRef, { presupuesto: increment(-pendingBudgetDelta(pendingPrice)) });
      }
      transaction.update(pilotRef, {
        congelado: false, congelado_en: null,
        pending_equipoId: null, pending_precio_compra: null, pending_tipo_fichaje: null,
      });
      return pendingTeamId ?? null;
    });
    if (revertedTeamId) await revertFromNextSplit(pilot, revertedTeamId);
    await loadData(pilot.splitId);
  }

  async function confirmFichaje() {
    if (!fichajeModal || !fichajeEquipoId) return;
    const pendingPrice = parseFloat(pendingPrecioCompra || "0");
    if (Number.isNaN(pendingPrice)) return;

    setConfirmingFichaje(true);
    try {
      const pilot = fichajeModal;
      const lastDone = [...circuits].filter(c => c.completado).at(-1);
      const splitId = pilot.splitId;
      const newDelta = pendingBudgetDelta(pendingPrice);
      const pilotRef = doc(db, `splits/${splitId}/equipos/${pilot.equipoId}/pilotos`, pilot.id);
      await runTransaction(db, async transaction => {
        const currentPilot = await transaction.get(pilotRef);
        if (!currentPilot.exists()) throw new Error("El piloto ya no existe en este equipo.");
        const currentData = currentPilot.data();
        const existingPendingTeam = currentData.pending_equipoId as string | undefined;
        const existingPendingPrice = currentData.pending_precio_compra as number | undefined;
        const teamIds = [...new Set([existingPendingTeam, fichajeEquipoId].filter((id): id is string => !!id && id !== "agente_libre"))];
        const teamRefs = teamIds.map(teamId => doc(db, `splits/${splitId}/equipos`, teamId));
        await Promise.all(teamRefs.map(teamRef => transaction.get(teamRef)));

        const deltas = new Map<string, number>();
        if (existingPendingTeam && existingPendingPrice != null && existingPendingTeam !== "agente_libre") {
          deltas.set(existingPendingTeam, -pendingBudgetDelta(existingPendingPrice));
        }
        if (fichajeEquipoId !== "agente_libre") {
          deltas.set(fichajeEquipoId, (deltas.get(fichajeEquipoId) ?? 0) + newDelta);
        }
        deltas.forEach((delta, teamId) => {
          if (delta !== 0) transaction.update(doc(db, `splits/${splitId}/equipos`, teamId), { presupuesto: increment(delta) });
        });
        transaction.update(pilotRef, {
          congelado: true,
          congelado_en: lastDone?.id ?? null,
          pending_equipoId: fichajeEquipoId,
          pending_precio_compra: pendingPrice,
          pending_tipo_fichaje: fichajeTipo,
        });
      });

      await propagateToNextSplit(pilot, fichajeEquipoId, pendingPrice, fichajeTipo);

      setFichajeModal(null);
      setPendingPrecioCompra("");
    } finally {
      setConfirmingFichaje(false);
    }
    await loadData(fichajeModal!.splitId);
  }

  // ─── DERIVED STATE ───────────────────────────────────────────────────────────

  // Pilotos del catálogo global que aún no tienen ficha en este split.
  const altaCandidates = globalPilots.filter(gp => !pilots.some(p => p.id === gp.id));

  const visiblePilots = showLegacy ? pilots : pilots.filter(p => !p.isLegacy);
  const legacyCount = pilots.filter(p => p.isLegacy).length;
  const grouped = visiblePilots.reduce<Record<string, PilotRow[]>>((acc, p) => {
    (acc[p.equipoNombre] = acc[p.equipoNombre] || []).push(p);
    return acc;
  }, {});

  // ─── RENDER ──────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-10">

      {/* ── CONTROLES ── */}
      <div className="flex items-center justify-between flex-wrap gap-4 border-b border-white/[0.06] pb-6">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[9px] font-mono uppercase tracking-[0.4em] text-white/20 shrink-0">Split</span>
          <div className="flex gap-0.5">
            {activeSplits.map((s: any) => (
              <button key={s.id} onClick={() => setSelectedSplitId(s.id)}
                className={`px-5 py-2 text-[10px] font-black tracking-[0.2em] uppercase transition-all ${
                  selectedSplitId === s.id ? "bg-[#e10600] text-white" : "bg-white/[0.04] text-white/35 hover:bg-white/[0.08] hover:text-white/70"
                }`}>
                {s.nombre}
              </button>
            ))}
          </div>
          {loading && <Loader2 className="w-4 h-4 animate-spin text-white/30" />}
        </div>
        <div className="flex items-center gap-4 ml-auto">
          {legacyCount > 0 && (
            <button onClick={() => setShowLegacy(!showLegacy)}
              className={`text-[9px] font-mono uppercase tracking-[0.3em] transition-colors ${showLegacy ? "text-[#e10600]" : "text-white/25 hover:text-white/50"}`}>
              {showLegacy ? `Ocultar ${legacyCount} legacy` : `Mostrar ${legacyCount} legacy`}
            </button>
          )}
          <button onClick={openAltaModal} disabled={loading || altaCandidates.length === 0 || teams.length === 0}
            className="text-[9px] font-mono uppercase tracking-[0.3em] text-emerald-400/60 hover:text-emerald-300 transition-colors disabled:opacity-30">
            + Añadir piloto
          </button>
          <button onClick={recalcularPrecios} disabled={loading}
            className="text-[9px] font-mono uppercase tracking-[0.3em] text-amber-400/60 hover:text-amber-300 transition-colors disabled:opacity-30">
            Recalcular precios
          </button>
          <button onClick={resetEconomia} disabled={loading}
            className="text-[9px] font-mono uppercase tracking-[0.3em] text-[#e10600]/50 hover:text-[#e10600] transition-colors disabled:opacity-30">
            Reset economía
          </button>
        </div>
      </div>

      {/* ── LOG ── */}
      {processLog.length > 0 && (
        <div className="border border-white/[0.06] bg-white/[0.015]">
          <div className="flex items-center justify-between px-4 py-2 border-b border-white/[0.04]">
            <span className="text-[9px] font-mono uppercase tracking-[0.3em] text-white/25">Log economía</span>
            <button onClick={() => setProcessLog([])} className="text-[9px] font-mono text-white/20 hover:text-white/50">✕ cerrar</button>
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
                const [, nombre, mantAntes, mantDespues, clauDespues, fichado] = line.split(":");
                const decay = parseFloat(mantAntes) - parseFloat(mantDespues);
                const isFichado = fichado === "true";
                return (
                  <div key={i} className="flex items-baseline gap-2 text-[10px] font-mono pl-3">
                    <span className="text-white/20 w-3 shrink-0">{isFichado ? "✦" : "·"}</span>
                    <span className="text-white/60 min-w-[100px]">{nombre}</span>
                    <span className="text-white/30 text-[9px]">mant.</span>
                    <span className="text-white/40 tabular-nums">{mantAntes}→</span>
                    <span className={`tabular-nums font-bold ${parseFloat(mantDespues) < parseFloat(mantAntes) ? "text-[#e10600]/80" : "text-white/70"}`}>{mantDespues}M</span>
                    {!isFichado && decay > 0 && <span className="text-white/20 text-[9px]">(-{r1(decay)})</span>}
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
        <div className="flex items-center gap-4 mb-4 flex-wrap">
          <p className="text-[9px] font-mono uppercase tracking-[0.4em] text-white/20">Resumen de Escuderías</p>
          <span className="text-[9px] font-mono text-white/15">· clic en inicial para establecer</span>
          {splitAnteriorId && (
            <button onClick={previsualizarAperturas} disabled={derivando}
              className="ml-auto flex items-center gap-1.5 border border-white/10 px-2.5 py-1 text-[9px] font-mono uppercase tracking-widest text-white/40 hover:text-emerald-300 hover:border-emerald-300/30 transition-colors disabled:opacity-40">
              {derivando ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
              Derivar apertura desde {splitAnteriorId}
            </button>
          )}
        </div>

        {mensajeApertura && (
          <p className="mb-3 border border-white/10 px-3 py-2 text-[10px] font-mono text-white/50">{mensajeApertura}</p>
        )}

        {/* Previsualización: nada se escribe hasta confirmar. */}
        {aperturas && (
          <div className="mb-4 border border-emerald-300/25 bg-emerald-300/[0.03]">
            <div className="px-4 py-3 border-b border-white/[0.06]">
              <p className="text-[9px] font-mono uppercase tracking-[0.3em] text-emerald-300/70">
                Apertura derivada de {splitAnteriorId}
              </p>
              <p className="mt-1 text-[10px] font-mono text-white/35">
                Cierre del bloque anterior menos lo que costó el mercado, tomado del precio de compra de cada ficha.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="border-b border-white/[0.06] text-[9px] uppercase tracking-[0.2em] text-white/25">
                    <th className="py-2 px-4 text-left font-normal">Escudería</th>
                    <th className="py-2 px-4 text-right font-normal">Cierre {splitAnteriorId}</th>
                    <th className="py-2 px-4 text-right font-normal">Mercado</th>
                    <th className="py-2 px-4 text-right font-normal">Apertura</th>
                    <th className="py-2 px-4 text-right font-normal">Actual</th>
                    <th className="py-2 px-4 text-right font-normal">Desvío</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {aperturas.map(fila => (
                    <tr key={fila.equipoId}>
                      <td className="py-2.5 px-4">
                        <span className="font-black text-white text-sm tracking-tight">{fila.nombre}</span>
                        {fila.detalle.length > 0 && (
                          <span className="block text-[9px] font-mono text-white/25">{fila.detalle.join(" · ")}</span>
                        )}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono tabular-nums text-white/50">{r1(fila.cierreAnterior)}M</td>
                      <td className={`py-2.5 px-4 text-right font-mono tabular-nums ${fila.mercado < 0 ? "text-[#e10600]" : "text-emerald-400/70"}`}>
                        {fila.mercado > 0 ? "+" : ""}{r1(fila.mercado)}M
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono font-black tabular-nums text-white">{r1(fila.apertura)}M</td>
                      <td className="py-2.5 px-4 text-right font-mono tabular-nums text-white/35">
                        {fila.aperturaActual == null ? "—" : `${r1(fila.aperturaActual)}M`}
                      </td>
                      <td className={`py-2.5 px-4 text-right font-mono tabular-nums ${fila.desvio === 0 ? "text-white/20" : "text-amber-300"}`}>
                        {fila.desvio === 0 ? "—" : `${fila.desvio > 0 ? "+" : ""}${r1(fila.desvio)}M`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {avisosApertura.length > 0 && (
              <ul className="px-4 py-3 border-t border-white/[0.06] space-y-1">
                {avisosApertura.map((aviso, i) => (
                  <li key={i} className="text-[10px] font-mono text-amber-300/70">⚠ {aviso}</li>
                ))}
              </ul>
            )}
            <div className="flex gap-2 px-4 py-3 border-t border-white/[0.06]">
              <button onClick={() => { setAperturas(null); setAvisosApertura([]); }} disabled={derivando}
                className="px-3 py-1.5 text-[10px] font-mono uppercase tracking-widest text-white/40 hover:text-white/70 border border-white/10 transition-colors disabled:opacity-40">
                Descartar
              </button>
              <button onClick={confirmarAperturas} disabled={derivando}
                className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest bg-emerald-500 hover:bg-emerald-400 text-black transition-colors disabled:opacity-40">
                {derivando && <Loader2 className="w-3 h-3 animate-spin" />}
                Aplicar aperturas
              </button>
            </div>
          </div>
        )}
        <div className="overflow-x-auto border border-white/[0.06]">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="border-b border-white/[0.06] text-[9px] uppercase tracking-[0.25em] text-white/25 font-normal">
                <th className="py-3 px-4 text-left font-normal">Escudería</th>
                <th className="py-3 px-4 text-right font-normal">Inicial</th>
                <th className="py-3 px-4 text-right font-normal">Fichajes</th>
                <th className="py-3 px-4 text-right font-normal text-emerald-500/50">+ Rival.</th>
                <th className="py-3 px-4 text-right font-normal text-emerald-500/50">+ Premios</th>
                <th className="py-3 px-4 text-right font-normal">Total disp.</th>
                <th className="py-3 px-4 text-right font-normal">Pts</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {teams.map(t => {
                const ini = t.presupuesto_inicial;
                const act = t.presupuesto;
                 const fichajes = act - (ini ?? 0) - t.ingresos_rivalidades - t.ingresos_premios;
                const editVal = editingBudget[t.id];
                const isSavingB = savingBudget === t.id;
                return (
                  <tr key={t.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3 px-4 font-black text-sm text-white tracking-tight">{t.nombre}</td>
                    <td className="py-3 px-4 text-right">
                      {editVal !== undefined ? (
                        <div className="flex items-center justify-end gap-1">
                          <input type="number" step="0.1" value={editVal}
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
                        <span className="cursor-pointer font-mono font-black text-white/40 hover:text-white transition-colors group"
                          onClick={() => setEditingBudget(prev => ({ ...prev, [t.id]: String(ini ?? act) }))}>
                          {ini != null ? `${r1(ini)}M` : <span className="text-white/15 text-[9px]">— set</span>}
                          <span className="ml-1 text-white/15 group-hover:text-white/40 text-[9px]">✎</span>
                        </span>
                      )}
                    </td>
                    <td className={`py-3 px-4 text-right font-black font-mono text-sm tabular-nums ${fichajes < 0 ? "text-[#e10600]" : "text-white/70"}`}>
                      {r1(fichajes)}M
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-emerald-400/70 text-xs tabular-nums">
                      {t.ingresos_rivalidades > 0 ? `+${r1(t.ingresos_rivalidades)}M` : <span className="text-white/15">—</span>}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-emerald-400/70 text-xs tabular-nums">
                      {t.ingresos_premios > 0 ? `+${r1(t.ingresos_premios)}M` : <span className="text-white/15">—</span>}
                    </td>
                    <td className={`py-3 px-4 text-right font-black font-mono text-sm tabular-nums ${act < 0 ? "text-[#e10600]" : "text-white"}`}>
                      {r1(act)}M
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-white/50 text-xs">{t.puntos_constructores}</td>
                  </tr>
                );
              })}
              {teams.length === 0 && !loading && (
                <tr><td colSpan={7} className="py-8 text-center text-[10px] font-mono text-white/15 uppercase tracking-widest">Sin escuderías</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── TABLA PILOTOS ── */}
      <div>
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div className="flex items-center gap-4">
            <p className="text-[9px] font-mono uppercase tracking-[0.4em] text-white/20">Pilotos y Mercado</p>
            <span className="text-[9px] font-mono text-white/15">· clic en precio para editar</span>
          </div>
          {/* Toggle PRECIOS / RENDIMIENTO */}
          <div className="flex gap-0.5">
            {(["precios", "rendimiento"] as const).map(m => (
              <button key={m} onClick={() => setViewMode(m)}
                className={`px-4 py-1.5 text-[9px] font-black uppercase tracking-[0.2em] transition-all ${
                  viewMode === m ? "bg-white/10 text-white" : "text-white/25 hover:text-white/50"
                }`}>
                {m === "precios" ? "Precios" : "Rendimiento"}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto border border-white/[0.06]">
          <table className="text-[10px] border-collapse font-mono min-w-full">
            <thead>
              <tr className="border-b border-white/[0.06] text-[9px] uppercase tracking-[0.2em] text-white/25 font-normal">
                <th className="py-3 px-3 text-left font-normal sticky left-0 bg-[#0a0a0a] z-10 min-w-[160px]">Piloto</th>
                <th className="py-3 px-3 text-right font-normal min-w-[80px]">Precio</th>

                {viewMode === "precios" && (
                  <>
                    <th className="py-3 px-3 text-right font-normal min-w-[80px]">Próx. split</th>
                    {circuits.map(c => (
                      <th key={c.id} className="py-3 px-3 text-right font-normal min-w-[80px] whitespace-nowrap">
                        <span className={c.economia_procesada ? "text-white/70" : c.completado ? "text-white/40" : "text-white/20"}>
                          {c.nombre}
                        </span>
                        <span className="block text-[7px] text-white/15 tracking-normal normal-case font-normal mt-0.5">
                          mant. / claus.
                        </span>
                        {c.completado && (
                          <button
                            onClick={() => c.economia_procesada ? fixFichajePricesHistorial(c) : procesarEconomia(c)}
                            disabled={reprocesando === c.id}
                            className={`flex items-center gap-0.5 text-[7px] tracking-normal normal-case font-normal transition-colors mt-0.5 ${
                              c.economia_procesada ? "text-emerald-500/50 hover:text-amber-300" : "text-amber-400/70 hover:text-amber-300"
                            }`}>
                            {reprocesando === c.id ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <RefreshCw className="w-2.5 h-2.5" />}
                            {reprocesando === c.id ? "..." : c.economia_procesada ? "eco. ok" : "procesar"}
                          </button>
                        )}
                      </th>
                    ))}
                    <th className="py-3 px-3 text-right font-normal min-w-[64px]">
                      <span className="block text-white/50">Mant.</span>
                      <span className="block text-white/25 text-[8px] font-normal normal-case tracking-normal">Claus.</span>
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
                      <span className="block text-white/50">Mant.</span>
                      <span className="block text-white/25 text-[8px] font-normal normal-case tracking-normal">Claus.</span>
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
                      className="py-2 px-3 text-[9px] uppercase tracking-[0.3em] text-[#e10600] font-black border-y border-white/[0.04] bg-white/[0.015]">
                      {equipo}
                    </td>
                  </tr>

                  {pilotList.map(pilot => {
                    const editVal = editing[pilot.id];
                    const isSaving = savingId === pilot.id;
                    const isDeleting = deletingId === pilot.id;
                    const isFichado = pilot.congelado;
                    const destTeamId = pilot.pending_equipoId;
                    const destTeam = destTeamId ? teams.find(t => t.id === destTeamId) : null;
                    const isRenovacion = destTeamId === pilot.equipoId;
                    const tipoActivo = pilot.pending_tipo_fichaje ?? pilot.tipo_fichaje;

                    return (
                      <tr key={pilot.id}
                        className={`border-b border-white/[0.04] hover:bg-white/[0.015] transition-colors ${
                          pilot.isLegacy ? "opacity-35" : ""
                        } ${isFichado ? "bg-amber-500/[0.025]" : ""}`}>

                        {/* ── Nombre + badge de fichaje ── */}
                        <td className="py-2.5 px-3 sticky left-0 bg-inherit max-w-[160px]">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <span className="font-bold text-white/90 truncate text-[11px] block">{pilot.nombre}</span>
                              {pilot.isLegacy && <span className="text-[8px] text-[#e10600]/40">legacy</span>}
                              {isFichado && (
                                <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                                  {isRenovacion ? (
                                    <span className="text-[8px] text-sky-300/70 font-mono">↺ Renovado</span>
                                  ) : (
                                    <>
                                      <span className="text-[8px] text-amber-300/60 font-mono">→</span>
                                      <span className="text-[8px] text-amber-200/80 font-bold truncate max-w-[70px]">
                                        {destTeam?.nombre ?? destTeamId}
                                      </span>
                                    </>
                                  )}
                                  {tipoActivo && (
                                    <span className={`text-[7px] px-1 py-px font-bold uppercase tracking-wide ${TIPO_COLORS[tipoActivo]}`}>
                                      {TIPO_LABEL[tipoActivo]}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>

                            {/* Botón Fichar / Deshacer */}
                            {isFichado ? (
                              <button
                                onClick={() => handleFichar(pilot)}
                                title="Deshacer fichaje"
                                className="shrink-0 text-white/15 hover:text-[#e10600]/70 transition-colors text-[11px] leading-none mt-0.5">
                                ✕
                              </button>
                            ) : (
                              <button
                                onClick={() => handleFichar(pilot)}
                                title="Fichar piloto"
                                className="shrink-0 flex items-center gap-0.5 px-1.5 py-0.5 border border-white/[0.08] text-white/20 hover:text-amber-300 hover:border-amber-300/30 transition-colors text-[7px] uppercase tracking-wide font-bold">
                                <ArrowRightLeft className="w-2.5 h-2.5" />
                                Fichar
                              </button>
                            )}
                          </div>
                        </td>

                        {/* Precio editable */}
                        <td className="py-2.5 px-3 text-right">
                          {isFichado ? (
                            <div className="space-y-0.5">
                              <span className="text-white/40 block">{r1(pilot.precio_compra)}M</span>
                              <span className="text-amber-300/50 text-[8px] font-mono block">pactado</span>
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
                              onClick={() => setEditing(prev => ({ ...prev, [pilot.id]: String(pilot.precio_compra) }))}>
                              {r1(pilot.precio_compra)}M
                              <span className="ml-1 text-white/20 group-hover:text-white/50 text-[9px]">✎</span>
                            </span>
                          )}
                        </td>

                        {/* ── Vista PRECIOS ── */}
                        {viewMode === "precios" && (
                          <>
                            {/* Próx. split */}
                            <td className="py-2.5 px-3 text-right">
                              {pilot.pending_precio_compra != null ? (() => {
                                const pp = pilot.pending_precio_compra;
                                const ppAbs = Math.abs(pp);
                                const nextM  = pp < 0 ? Math.round(ppAbs / 3 * 10) / 10 : Math.round(pp * 3 * 10) / 10;
                                const nextCl = pp < 0 ? Math.round(ppAbs / 2 * 10) / 10 : Math.round(pp * 2 * 10) / 10;
                                return (
                                  <div className="space-y-0.5">
                                    <span className={`block tabular-nums font-bold text-[10px] ${cellBg(nextM)}`}>{r1(nextM)}</span>
                                    <span className={`block tabular-nums text-[9px] ${cellBg(nextCl)}`}>{r1(nextCl)}</span>
                                    <span className="block text-amber-300/50 text-[8px] font-mono">({r1(pp)}M)</span>
                                  </div>
                                );
                              })() : <span className="text-white/30">—</span>}
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
                                      <span className="text-[7px] text-amber-400/50 font-mono tracking-wide">ptdo</span>
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
                            <td className="py-2.5 px-3 text-right border-l border-white/[0.04]">
                              {isFichado ? (
                                <div>
                                  <span className={`block tabular-nums font-black text-[11px] ${cellBg(pilot.mantener_actual)}`}>
                                    {r1(pilot.mantener_actual)}
                                  </span>
                                  <span className={`block tabular-nums text-[9px] mt-0.5 ${cellBg(pilot.clausula_actual)}`}>
                                    {r1(pilot.clausula_actual)}
                                  </span>
                                  <span className="text-[7px] text-amber-400/50 font-mono">ptdo</span>
                                </div>
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
                              <span className="text-white/70 font-bold tabular-nums">{pilot.puntos_piloto}</span>
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <span className={pilot.victorias > 0 ? "text-amber-300 font-black" : "text-white/20"}>
                                {pilot.victorias}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <span className={pilot.podios > 0 ? "text-white/80 font-bold" : "text-white/20"}>
                                {pilot.podios}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <span className={pilot.dnfs > 0 ? "text-[#e10600]/80 font-bold" : "text-white/20"}>
                                {pilot.dnfs}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <span className={pilot.carreras_limpias > 0 ? "text-emerald-400/80" : "text-white/20"}>
                                {pilot.carreras_limpias}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-right border-l border-white/[0.04]">
                              <span className={`block tabular-nums font-black text-[11px] ${cellBg(pilot.mantener_actual)}`}>
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

      {/* ── MODAL DE ALTA MANUAL ── */}
      {altaModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm">
          <div className="bg-[#0d0d0d] border border-white/10 w-full max-w-sm mx-4 shadow-2xl">

            <div className="flex items-center gap-3 px-5 py-4 border-b border-white/[0.06]">
              <ArrowRightLeft className="w-4 h-4 text-emerald-300/70" />
              <div>
                <h3 className="text-xs font-black uppercase tracking-widest text-white">Añadir piloto al split</h3>
                <p className="text-[9px] font-mono text-white/30 mt-0.5">
                  Alta directa con su valor de mercado — se descuenta del presupuesto
                </p>
              </div>
            </div>

            <div className="px-5 py-4 space-y-4">
              <div className="space-y-1.5">
                <label className="text-[9px] font-mono uppercase tracking-[0.3em] text-white/30 block">Piloto</label>
                <select value={altaPilotoId} onChange={e => setAltaPilotoId(e.target.value)}
                  className="w-full bg-[#0a0a0a] border border-white/10 text-white text-[11px] px-3 py-2 outline-none focus:border-[#e10600] transition-colors font-mono">
                  {altaCandidates.map(p => (
                    <option key={p.id} value={p.id}>{p.nombre}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[9px] font-mono uppercase tracking-[0.3em] text-white/30 block">Escudería</label>
                <select value={altaEquipoId} onChange={e => setAltaEquipoId(e.target.value)}
                  className="w-full bg-[#0a0a0a] border border-white/10 text-white text-[11px] px-3 py-2 outline-none focus:border-[#e10600] transition-colors font-mono">
                  {teams.map(t => (
                    <option key={t.id} value={t.id}>{t.nombre} — presup. {t.presupuesto}M</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[9px] font-mono uppercase tracking-[0.3em] text-white/30 block">Valor de mercado</label>
                <div className="flex items-center gap-2">
                  <input type="number" step="0.1" value={altaPrecio} autoFocus
                    onChange={e => setAltaPrecio(e.target.value)}
                    className="flex-1 bg-black border border-white/15 px-3 py-2 text-white outline-none focus:border-[#e10600] transition-colors text-sm font-mono"
                    placeholder="0.0" />
                  <span className="text-white/30 text-xs font-mono">M</span>
                </div>
                {(() => {
                  const precio = parseFloat(altaPrecio || "");
                  if (Number.isNaN(precio)) return null;
                  const destTeam = teams.find(t => t.id === altaEquipoId);
                  const nuevoPresupuesto = destTeam ? destTeam.presupuesto + (precio < 0 ? Math.abs(precio) : -precio) : null;
                  const mantener = Math.round((precio < 0 ? precio / 3 : precio * 3) * 10) / 10;
                  const clausula = Math.round((precio < 0 ? precio / 2 : precio * 2) * 10) / 10;
                  return (
                    <p className="text-[9px] font-mono text-white/30 mt-1">
                      Mantener {mantener}M · cláusula {clausula}M
                      {nuevoPresupuesto != null && destTeam && (
                        <> · {destTeam.nombre} queda en <span className={nuevoPresupuesto < 0 ? "text-[#e10600]" : "text-white/60"}>{nuevoPresupuesto.toFixed(1)}M</span></>
                      )}
                    </p>
                  );
                })()}
              </div>

              {altaMsg && <p className="text-[9px] font-mono text-[#e10600]">{altaMsg}</p>}
            </div>

            <div className="flex gap-2 px-5 py-4 border-t border-white/[0.06]">
              <button onClick={() => setAltaModalOpen(false)} disabled={confirmingAlta}
                className="flex-1 py-2 text-[10px] font-mono uppercase tracking-widest text-white/40 hover:text-white/70 border border-white/10 hover:border-white/20 transition-colors disabled:opacity-40">
                Cancelar
              </button>
              <button onClick={confirmAlta}
                disabled={confirmingAlta || !altaPilotoId || !altaEquipoId || Number.isNaN(parseFloat(altaPrecio || ""))}
                className="flex-1 py-2 text-[10px] font-black uppercase tracking-widest bg-emerald-500 hover:bg-emerald-400 text-black transition-colors disabled:opacity-40 flex items-center justify-center gap-1.5">
                {confirmingAlta && <Loader2 className="w-3 h-3 animate-spin" />}
                Añadir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL DE FICHAJE ── */}
      {fichajeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm">
          <div className="bg-[#0d0d0d] border border-white/10 w-full max-w-sm mx-4 shadow-2xl">

            {/* Header */}
            <div className="flex items-center gap-3 px-5 py-4 border-b border-white/[0.06]">
              <ArrowRightLeft className="w-4 h-4 text-amber-300/70" />
              <div>
                <h3 className="text-xs font-black uppercase tracking-widest text-white">Fichaje</h3>
                <p className="text-[9px] font-mono text-white/30 mt-0.5">
                  El piloto genera para su equipo actual hasta fin de split
                </p>
              </div>
            </div>

            <div className="px-5 py-4 space-y-4">
              {/* Piloto */}
              <div className="flex items-baseline justify-between">
                <span className="text-sm font-black text-white">{fichajeModal.nombre}</span>
                <span className="text-[10px] font-mono text-white/40">
                  {fichajeModal.equipoNombre}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-white/[0.03] border border-white/[0.06] py-2 px-1">
                  <span className="block text-[8px] text-white/30 font-mono uppercase tracking-wide mb-0.5">Precio</span>
                  <span className="text-white/70 font-black text-xs">{fichajeModal.precio_compra}M</span>
                </div>
                <div className="bg-white/[0.03] border border-white/[0.06] py-2 px-1">
                  <span className="block text-[8px] text-white/30 font-mono uppercase tracking-wide mb-0.5">Mant.</span>
                  <span className="text-white/70 font-black text-xs">{fichajeModal.mantener_actual}M</span>
                </div>
                <div className="bg-white/[0.03] border border-white/[0.06] py-2 px-1">
                  <span className="block text-[8px] text-white/30 font-mono uppercase tracking-wide mb-0.5">Cláus.</span>
                  <span className="text-white/70 font-black text-xs">{fichajeModal.clausula_actual}M</span>
                </div>
              </div>

              {/* Tipo de fichaje */}
              <div className="space-y-1.5">
                <label className="text-[9px] font-mono uppercase tracking-[0.3em] text-white/30 block">
                  Tipo de operación
                </label>
                <div className="flex gap-1">
                  {(["subasta", "clausula", "mantener"] as TipoFichaje[]).map(t => (
                    <button key={t} onClick={() => handleFichajeTipoChange(t)}
                      className={`flex-1 py-2 text-[8px] font-black uppercase tracking-wide transition-colors ${
                        fichajeTipo === t
                          ? t === "clausula" ? "bg-orange-500 text-white"
                          : t === "subasta" ? "bg-[#e10600] text-white"
                          : "bg-blue-500 text-white"
                          : "bg-white/[0.04] text-white/30 hover:bg-white/10 hover:text-white/60"
                      }`}>
                      {t === "subasta" ? "Subasta" : t === "clausula" ? "Cláusula" : "Mantener"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Referencia de precio según tipo */}
              <div className="flex items-center gap-2 text-[9px] font-mono text-white/30 bg-white/[0.02] border border-white/[0.05] px-3 py-2">
                {fichajeTipo === "clausula" && (
                  <>
                    <span>Cláusula mínima:</span>
                    <span className="text-orange-300/80 font-black">{fichajeModal.clausula_actual}M</span>
                    <span className="ml-auto text-white/15">el dinero NO va al otro jeque</span>
                  </>
                )}
                {fichajeTipo === "mantener" && (
                  <>
                    <span>Precio mantener:</span>
                    <span className="text-sky-300/80 font-black">{fichajeModal.mantener_actual}M</span>
                  </>
                )}
                {fichajeTipo === "subasta" && (
                  <>
                    <span>Piloto en subasta — precio libre</span>
                    <span className="ml-auto text-white/15">ref. mant. {fichajeModal.mantener_actual}M</span>
                  </>
                )}
              </div>

              {/* Precio acordado */}
              <div className="space-y-1.5">
                <label className="text-[9px] font-mono uppercase tracking-[0.3em] text-white/30 block">
                  Precio acordado (próximo split)
                </label>
                <div className="flex items-center gap-2">
                  <input type="number" step="0.1" value={pendingPrecioCompra}
                    onChange={e => setPendingPrecioCompra(e.target.value)}
                    className="flex-1 bg-[#0a0a0a] border border-white/10 text-white text-sm font-black px-3 py-2 outline-none focus:border-[#e10600] transition-colors font-mono text-right"
                    placeholder="0.0"
                  />
                  <span className="text-white/40 font-mono text-sm font-bold shrink-0">M</span>
                </div>
                {/* Preview mantener/clausula del próximo split */}
                {pendingPrecioCompra && !isNaN(parseFloat(pendingPrecioCompra)) && (() => {
                  const pp = parseFloat(pendingPrecioCompra);
                  const ppAbs = Math.abs(pp);
                  const nextM  = pp < 0 ? Math.round(ppAbs / 3 * 10) / 10 : Math.round(ppAbs * 3 * 10) / 10;
                  const nextCl = pp < 0 ? Math.round(ppAbs / 2 * 10) / 10 : Math.round(ppAbs * 2 * 10) / 10;
                  return (
                    <div className="flex gap-3 text-[9px] font-mono text-white/40 mt-1">
                      <span>Mant. próx. split: <span className="text-white/70 font-bold">{nextM}M</span></span>
                      <span>Claus.: <span className="text-white/70 font-bold">{nextCl}M</span></span>
                    </div>
                  );
                })()}
              </div>

              {/* Equipo destino */}
              <div className="space-y-1.5">
                <label className="text-[9px] font-mono uppercase tracking-[0.3em] text-white/30 block">
                  Equipo destino
                </label>
                <select value={fichajeEquipoId} onChange={e => setFichajeEquipoId(e.target.value)}
                  className="w-full bg-[#0a0a0a] border border-white/10 text-white text-[11px] px-3 py-2 outline-none focus:border-[#e10600] transition-colors font-mono">
                  {teams.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.nombre}{t.id === fichajeModal.equipoId ? " (actual)" : ""} — presup. {t.presupuesto}M
                    </option>
                  ))}
                </select>
                {fichajeEquipoId !== fichajeModal.equipoId && (() => {
                  const pp = parseFloat(pendingPrecioCompra || "0");
                  const destTeam = teams.find(t => t.id === fichajeEquipoId);
                  if (!destTeam || isNaN(pp) || pp === 0) return null;
                  const newBudget = destTeam.presupuesto + (pp < 0 ? Math.abs(pp) : -pp);
                  return (
                    <p className="text-[9px] font-mono text-white/30 mt-1">
                      Presupuesto de <span className="text-white/50">{destTeam.nombre}</span> después del fichaje:{" "}
                      <span className={newBudget < 0 ? "text-[#e10600]" : "text-white/70"}>{newBudget.toFixed(1)}M</span>
                    </p>
                  );
                })()}
              </div>
            </div>

            {/* Acciones */}
            <div className="flex gap-2 px-5 py-4 border-t border-white/[0.06]">
              <button onClick={() => { setFichajeModal(null); setPendingPrecioCompra(""); }}
                disabled={confirmingFichaje}
                className="flex-1 py-2 text-[10px] font-mono uppercase tracking-widest text-white/40 hover:text-white/70 border border-white/10 hover:border-white/20 transition-colors disabled:opacity-40">
                Cancelar
              </button>
              <button onClick={confirmFichaje}
                disabled={confirmingFichaje || !fichajeEquipoId || Number.isNaN(parseFloat(pendingPrecioCompra || ""))}
                className="flex-1 py-2 text-[10px] font-black uppercase tracking-widest bg-amber-500 hover:bg-amber-400 text-black transition-colors disabled:opacity-40 flex items-center justify-center gap-1.5">
                {confirmingFichaje ? <Loader2 className="w-3 h-3 animate-spin" /> : <ArrowRightLeft className="w-3 h-3" />}
                {confirmingFichaje ? "Procesando…" : "Confirmar fichaje"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
