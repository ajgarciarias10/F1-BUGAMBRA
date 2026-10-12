import { useState, useEffect, useMemo } from "react";
import { Printer, X, FileText, CheckCircle2, Trophy, Award, Zap, Users } from "lucide-react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../services/firebase";
import type { Circuito, RaceResult } from "../types";
import { DEFAULT_ECONOMY_RULES } from "../utils/economyRules";

interface RaceReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  circuito: Circuito;
  splitName: string;
  splitId: string;
  currentSplit?: any;
  ledgerEntries?: any[];
}

function r1(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return "—";
  return (Math.round(n * 10) / 10).toFixed(1);
}

export function RaceReportModal({
  isOpen,
  onClose,
  circuito,
  splitName,
  splitId,
  currentSplit,
  ledgerEntries = [],
}: RaceReportModalProps) {
  const [fetchedTxs, setFetchedTxs] = useState<any[]>([]);

  useEffect(() => {
    if (!isOpen || !splitId || !circuito.id) return;
    if (ledgerEntries.length > 0) return;

    // Cargar los asientos de transacciones oficiales directamente desde Firestore
    const q = query(
      collection(db, "transacciones"),
      where("splitId", "==", splitId),
      where("circuitoId", "==", circuito.id)
    );
    getDocs(q)
      .then(snap => {
        if (!snap.empty) {
          setFetchedTxs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        }
      })
      .catch(console.error);
  }, [isOpen, splitId, circuito.id, ledgerEntries.length]);

  if (!isOpen) return null;

  const now = new Date();
  const docRef = `FIA-F1B-GP-${circuito.id.toUpperCase().replace(/[^A-Z0-9]/g, "")}-${splitId.toUpperCase().replace(/[^A-Z0-9]/g, "")}`;
  const currentDateFormatted = now.toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  const getPilotName = (pilotoId: string) => {
    return currentSplit?.roster?.find((p: any) => p.pilotoId === pilotoId)?.nombre || pilotoId;
  };

  const getTeamName = (teamId?: string, pilotoId?: string) => {
    if (teamId) {
      const t = currentSplit?.equipos?.find((eq: any) => eq.id === teamId);
      if (t) return t.nombre;
    }
    if (pilotoId) {
      const p = currentSplit?.roster?.find((r: any) => r.pilotoId === pilotoId);
      if (p?.equipoId) {
        const t = currentSplit?.equipos?.find((eq: any) => eq.id === p.equipoId);
        if (t) return t.nombre;
      }
    }
    return teamId || "—";
  };

  // Resultados ordenados por posición de carrera
  const resultados = [...(circuito.resultados || [])].sort((a, b) => {
    if (a.isDnf && !b.isDnf) return 1;
    if (!a.isDnf && b.isDnf) return -1;
    return (a.racePos || 99) - (b.racePos || 99);
  });

  const allTxs = ledgerEntries.length > 0 ? ledgerEntries : fetchedTxs;
  const circuitTransactions = allTxs.filter(
    e => (e.circuitoId === circuito.id || e.carrera?.toLowerCase() === circuito.nombre?.toLowerCase()) && e.esIngreso
  );

  // Mapeo de escuderías
  const teamsMap = new Map<string, {
    id: string;
    nombre: string;
    puntosF1: number;
    points: number;
    pole: number;
    fastestLap: number;
    participation: number;
    cleanTeam: number;
    rivalry: number;
    total: number;
  }>();

  (currentSplit?.equipos || []).forEach((eq: any) => {
    if (eq.id !== "agente_libre") {
      teamsMap.set(eq.id, {
        id: eq.id,
        nombre: eq.nombre,
        puntosF1: 0,
        points: 0,
        pole: 0,
        fastestLap: 0,
        participation: 0,
        cleanTeam: 0,
        rivalry: 0,
        total: 0,
      });
    }
  });

  // Puntos F1 por escudería
  resultados.forEach(r => {
    const p = currentSplit?.roster?.find((rost: any) => rost.pilotoId === r.pilotoId);
    const eqId = r.equipoId || p?.equipoId;
    if (eqId && teamsMap.has(eqId)) {
      teamsMap.get(eqId)!.puntosF1 += (r.puntos || 0);
    }
  });

  // Cálculo o lectura de desglose de rivalidades
  const rivalryBreakdown: Array<{
    groupName: string;
    type: string;
    details: Array<{
      pilotName: string;
      teamName: string;
      teamId: string;
      qualyPos: number | string;
      racePos: number | string;
      qualyPrize: number;
      racePrize: number;
      totalPrize: number;
    }>;
  }> = [];

  // Helper para normalizar posiciones
  const parsePos = (val: any): number => {
    const n = Number(val);
    return !isNaN(n) && n > 0 && n !== 99 ? n : 999;
  };

  if (circuitTransactions.length > 0) {
    // Si hay transacciones del ledger, las sumamos para la liquidación financiera
    circuitTransactions.forEach(tx => {
      const eqId = tx.equipoId;
      if (!eqId) return;
      if (!teamsMap.has(eqId)) {
        teamsMap.set(eqId, {
          id: eqId,
          nombre: tx.equipo || eqId,
          puntosF1: 0,
          points: 0,
          pole: 0,
          fastestLap: 0,
          participation: 0,
          cleanTeam: 0,
          rivalry: 0,
          total: 0,
        });
      }
      const item = teamsMap.get(eqId)!;
      const cant = Number(tx.cantidad || 0);
      item.total += cant;
      if (tx.tipo === "ingreso_puntos") item.points += cant;
      else if (tx.tipo === "pole") item.pole += cant;
      else if (tx.tipo === "vuelta_rapida") item.fastestLap += cant;
      else if (tx.tipo === "premio_carrera") item.participation += cant;
      else if (tx.tipo === "sin_sancionados") item.cleanTeam += cant;
      else if (tx.tipo === "rivalidad") item.rivalry += cant;
    });
  } else {
    // Cálculo de liquidación si aún no se procesó en el ledger o se está previsualizando
    const participatingTeams = new Set<string>();
    const dirtyTeams = new Set<string>();

    resultados.forEach(r => {
      const p = currentSplit?.roster?.find((rost: any) => rost.pilotoId === r.pilotoId);
      const eqId = r.equipoId || p?.equipoId;
      if (!eqId || eqId === "agente_libre") return;
      participatingTeams.add(eqId);
      if (r.isClean === false) dirtyTeams.add(eqId);

      const teamEntry = teamsMap.get(eqId);
      if (teamEntry) {
        if (r.puntos && r.puntos > 0) {
          const ptsIncome = Math.round(r.puntos * 0.1 * 10) / 10;
          teamEntry.points += ptsIncome;
          teamEntry.total += ptsIncome;
        }
        if (Number(r.qualyPos) === 1) {
          teamEntry.pole += 2.0;
          teamEntry.total += 2.0;
        }
        if (r.fastestLap) {
          teamEntry.fastestLap += 1.0;
          teamEntry.total += 1.0;
        }
      }
    });

    participatingTeams.forEach(eqId => {
      const teamEntry = teamsMap.get(eqId);
      if (teamEntry) {
        teamEntry.participation += 4.0;
        teamEntry.total += 4.0;
        if (!dirtyTeams.has(eqId)) {
          teamEntry.cleanTeam += 3.0;
          teamEntry.total += 3.0;
        }
      }
    });
  }

  // Desglose de rivalidades (se computa SIEMPRE para mostrar la tabla explicativa)
  const rivalries = currentSplit?.rivalries;
  const rules = { ...DEFAULT_ECONOMY_RULES, ...(currentSplit?.economia_config || {}) };
  const soloPilotIds = new Set<string>((rivalries?.soloPilots || []).map((p: any) => p.id));

  // Pilotos en solitario
  resultados.forEach(r => {
    if (soloPilotIds.has(r.pilotoId)) {
      const p = currentSplit?.roster?.find((rost: any) => rost.pilotoId === r.pilotoId);
      const eqId = r.equipoId || p?.equipoId;
      if (eqId && circuitTransactions.length === 0 && teamsMap.has(eqId)) {
        teamsMap.get(eqId)!.rivalry += 3.0;
        teamsMap.get(eqId)!.total += 3.0;
      }
    }
  });

  // Grupos de rivalidades
  for (const group of rivalries?.groups || []) {
    if (group.type === "solo") continue;
    const isPair = group.type === "pair" || (group.members || []).length === 2;
    const qPrizes = isPair
      ? (rules.rivalidad_duo_clasificacion || [1, 0])
      : (rules.rivalidad_clasificacion || [1, 0.5, 0]);
    const rPrizes = isPair
      ? (rules.rivalidad_duo_carrera || [2, 0])
      : (rules.rivalidad_carrera || [2, 1, 0]);

    const groupMembers = (group.members || []).map((m: any) => {
      const res = resultados.find(entry => entry.pilotoId === m.id);
      const p = currentSplit?.roster?.find((rost: any) => rost.pilotoId === m.id);
      const teamId = res?.equipoId || p?.equipoId || m.equipoId;
      const qPos = parsePos(res?.qualyPos);
      const isDnf = !!res?.isDnf;
      const rPos = isDnf ? 999 : parsePos(res?.racePos);
      return {
        id: m.id,
        nombre: m.nombre || getPilotName(m.id),
        teamId,
        teamName: getTeamName(teamId, m.id),
        qPos,
        rPos,
        isDnf,
      };
    });

    // Ordenar clasificación
    const sortedQualy = [...groupMembers]
      .filter(m => m.qPos < 999)
      .sort((a, b) => a.qPos - b.qPos);

    // Ordenar carrera (los no DNF)
    const sortedRace = [...groupMembers]
      .filter(m => !m.isDnf && m.rPos < 999)
      .sort((a, b) => a.rPos - b.rPos);

    const memberPayouts = groupMembers.map(m => {
      const qIdx = sortedQualy.findIndex(sq => sq.id === m.id);
      const rIdx = sortedRace.findIndex(sr => sr.id === m.id);
      const qualyPrize = qIdx !== -1 ? (qPrizes[qIdx] ?? 0) : 0;
      const racePrize = rIdx !== -1 ? (rPrizes[rIdx] ?? 0) : 0;
      const totalPrize = qualyPrize + racePrize;

      if (circuitTransactions.length === 0 && totalPrize > 0 && teamsMap.has(m.teamId)) {
        teamsMap.get(m.teamId)!.rivalry += totalPrize;
        teamsMap.get(m.teamId)!.total += totalPrize;
      }

      return {
        pilotName: m.nombre,
        teamName: m.teamName,
        teamId: m.teamId,
        qualyPos: m.qPos < 999 ? `Q${m.qPos}` : "—",
        racePos: m.isDnf ? "DNF" : m.rPos < 999 ? `P${m.rPos}` : "—",
        qualyPrize,
        racePrize,
        totalPrize,
      };
    });

    rivalryBreakdown.push({
      groupName: group.name || (isPair ? "Dúo de Rivalidad" : "Grupo de Rivalidad"),
      type: isPair ? "duo" : "trio",
      details: memberPayouts,
    });
  }

  const teamsFinancialList = Array.from(teamsMap.values()).filter(t => t.total > 0 || t.puntosF1 > 0);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-2 sm:p-4 backdrop-blur-sm overflow-y-auto">
      {/* Estilos A4 para impresión */}
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #race-report-container, #race-report-container * {
            visibility: visible !important;
          }
          #race-report-container {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            color: #000000 !important;
            box-shadow: none !important;
            border: none !important;
          }
          .no-print {
            display: none !important;
          }
          @page {
            size: A4 portrait;
            margin: 10mm 12mm;
          }
        }
      `}</style>

      <div className="relative w-full max-w-5xl rounded-lg bg-surface border border-line shadow-2xl flex flex-col max-h-[92vh]">
        {/* Barra superior de acciones */}
        <div className="no-print flex items-center justify-between border-b border-line px-5 py-3 bg-surface-2">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded bg-brand/20 text-brand">
              <FileText className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-ink">
                Informe Oficial de Gran Premio
              </h2>
              <p className="text-[10px] text-ink-2">{circuito.nombre} · {splitName} · Resultados y Economía</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 rounded bg-warn-soft border border-warn/40 px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider text-warn transition-colors hover:bg-warn-soft/20"
            >
              <Printer className="h-3.5 w-3.5" />
              Descargar PDF / Imprimir
            </button>
            <button
              onClick={onClose}
              className="rounded p-1.5 text-ink-muted hover:bg-surface-3 hover:text-ink transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Contenedor del informe imprimible */}
        <div className="overflow-y-auto p-4 sm:p-8 space-y-6 text-zinc-900 bg-white" id="race-report-container">
          
          {/* CABECERA OFICIAL FIA */}
          <div className="border-b-2 border-zinc-900 pb-4">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-12 bg-zinc-900 text-white font-black flex items-center justify-center text-xs tracking-widest border border-zinc-800">
                    FIA
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600">
                    Fédération Internationale de l'Automobile
                  </span>
                </div>
                <h1 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-zinc-950 font-serif">
                  Official Race & Economic Report · GP de {circuito.nombre}
                </h1>
                <p className="text-xs font-semibold text-zinc-700 uppercase tracking-wider">
                  Campeonato F1 Bugambra · {splitName}
                </p>
              </div>

              <div className="border border-zinc-400 bg-zinc-50 p-2 text-right text-[10px] font-mono shrink-0">
                <p className="font-bold text-zinc-900">DOC: {docRef}</p>
                <p className="text-zinc-600">FECHA: {currentDateFormatted}</p>
                <div className="mt-1 inline-flex items-center gap-1 font-bold text-emerald-800 text-[9px] uppercase">
                  <CheckCircle2 className="h-2.5 w-2.5" /> {circuito.acta_cerrada ? "Acta Cerrada" : "En Revisión"}
                </div>
              </div>
            </div>
          </div>

          {/* SECCIÓN 1: CLASIFICACIÓN DE LA CARRERA */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xs font-black uppercase tracking-wider text-zinc-900 flex items-center gap-2">
                <Trophy className="h-3.5 w-3.5 text-zinc-700" />
                1. Clasificación Oficial y Resultados
              </h2>
              <span className="text-[10px] text-zinc-500 font-mono">
                {resultados.length} participantes registrados
              </span>
            </div>

            <table className="w-full text-[11px] border-collapse border border-zinc-300">
              <thead>
                <tr className="bg-zinc-100 text-zinc-800 font-bold uppercase tracking-wider border-b border-zinc-300 text-[10px]">
                  <th className="p-1.5 text-center w-10">Pos</th>
                  <th className="p-1.5 text-left">Piloto</th>
                  <th className="p-1.5 text-left">Escudería</th>
                  <th className="p-1.5 text-center w-14">Qualy</th>
                  <th className="p-1.5 text-center w-14">Puntos</th>
                  <th className="p-1.5 text-center w-16">V. Rápida</th>
                  <th className="p-1.5 text-center w-16">Limpio</th>
                  <th className="p-1.5 text-center w-16">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200">
                {resultados.map((r) => {
                  const pName = getPilotName(r.pilotoId);
                  const tName = getTeamName(r.equipoId, r.pilotoId);
                  const isWinner = r.racePos === 1;
                  const isPodium = r.racePos >= 1 && r.racePos <= 3;
                  return (
                    <tr
                      key={r.pilotoId}
                      className={`hover:bg-zinc-50 ${isWinner ? "bg-amber-50/70 font-semibold" : isPodium ? "bg-zinc-50/60" : ""}`}
                    >
                      <td className="p-1.5 text-center font-bold">
                        {r.isDnf ? (
                          <span className="text-red-700 font-black">DNF</span>
                        ) : (
                          <span>P{r.racePos}</span>
                        )}
                      </td>
                      <td className="p-1.5 font-bold text-zinc-950">
                        {pName}
                        {circuito.piloto_dia_ganador === r.pilotoId && (
                          <span className="ml-1 text-[9px] px-1 py-0.2 bg-amber-100 border border-amber-300 text-amber-900 rounded font-black">DOTD</span>
                        )}
                      </td>
                      <td className="p-1.5 text-zinc-700">{tName}</td>
                      <td className="p-1.5 text-center font-mono">
                        {r.qualyPos === 1 ? (
                          <span className="font-bold text-emerald-800">Q1 (Pole)</span>
                        ) : (
                          `Q${r.qualyPos}`
                        )}
                      </td>
                      <td className="p-1.5 text-center font-bold font-mono text-zinc-950">
                        {r.puntos || 0}
                      </td>
                      <td className="p-1.5 text-center">
                        {r.fastestLap ? (
                          <span className="font-black text-purple-800 text-[10px]">Sí (1:00)</span>
                        ) : (
                          <span className="text-zinc-400">—</span>
                        )}
                      </td>
                      <td className="p-1.5 text-center">
                        {r.isClean !== false ? (
                          <span className="text-emerald-700 font-bold">✓ Limpio</span>
                        ) : (
                          <span className="text-red-600 font-bold">✕ Sanción</span>
                        )}
                      </td>
                      <td className="p-1.5 text-center text-[10px]">
                        {r.isDnf ? (
                          <span className="text-red-700 font-bold">Abandono</span>
                        ) : (
                          <span className="text-emerald-800">Finalizado</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* SECCIÓN 2: DESGLOSE ECONÓMICO GENERADO POR ESCUDERÍA */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xs font-black uppercase tracking-wider text-zinc-900 flex items-center gap-2">
                <Award className="h-3.5 w-3.5 text-zinc-700" />
                2. Balance Económico Generado en el Gran Premio (Millones de Euros)
              </h2>
              <span className="text-[10px] text-zinc-500 font-mono">
                {circuito.economia_procesada ? "Liquidación Oficial Aplicada" : "Liquidación en Borrador"}
              </span>
            </div>

            <table className="w-full text-[11px] border-collapse border border-zinc-300">
              <thead>
                <tr className="bg-zinc-100 text-zinc-800 font-bold uppercase tracking-wider border-b border-zinc-300 text-[10px]">
                  <th className="p-1.5 text-left">Escudería</th>
                  <th className="p-1.5 text-center">Pts F1</th>
                  <th className="p-1.5 text-right">Pts (€)</th>
                  <th className="p-1.5 text-right">Pole</th>
                  <th className="p-1.5 text-right">V. Rápida</th>
                  <th className="p-1.5 text-right">Participación</th>
                  <th className="p-1.5 text-right">Sin Sanción</th>
                  <th className="p-1.5 text-right font-bold text-violet-900 bg-violet-50/60">Rivalidades</th>
                  <th className="p-1.5 text-right font-black bg-zinc-200">Total GP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200">
                {teamsFinancialList.map((t) => (
                  <tr key={t.id} className="hover:bg-zinc-50">
                    <td className="p-1.5 font-bold text-zinc-950">{t.nombre}</td>
                    <td className="p-1.5 text-center font-mono font-bold text-zinc-700">{t.puntosF1}</td>
                    <td className="p-1.5 text-right font-mono text-zinc-900">+{r1(t.points)}M</td>
                    <td className="p-1.5 text-right font-mono text-zinc-900">{t.pole > 0 ? `+${r1(t.pole)}M` : "—"}</td>
                    <td className="p-1.5 text-right font-mono text-zinc-900">{t.fastestLap > 0 ? `+${r1(t.fastestLap)}M` : "—"}</td>
                    <td className="p-1.5 text-right font-mono text-zinc-900">+{r1(t.participation)}M</td>
                    <td className="p-1.5 text-right font-mono text-zinc-900">{t.cleanTeam > 0 ? `+${r1(t.cleanTeam)}M` : "0.0M"}</td>
                    <td className="p-1.5 text-right font-mono font-bold text-violet-900 bg-violet-50/40">
                      +{r1(t.rivalry)}M
                    </td>
                    <td className="p-1.5 text-right font-mono font-black text-emerald-950 bg-emerald-50/60">
                      +{r1(t.total)}M
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-zinc-100 font-bold border-t-2 border-zinc-400 text-zinc-950">
                  <td className="p-1.5">TOTAL GENERADO</td>
                  <td className="p-1.5 text-center font-mono">
                    {teamsFinancialList.reduce((acc, t) => acc + t.puntosF1, 0)}
                  </td>
                  <td className="p-1.5 text-right font-mono">
                    +{r1(teamsFinancialList.reduce((acc, t) => acc + t.points, 0))}M
                  </td>
                  <td className="p-1.5 text-right font-mono">
                    +{r1(teamsFinancialList.reduce((acc, t) => acc + t.pole, 0))}M
                  </td>
                  <td className="p-1.5 text-right font-mono">
                    +{r1(teamsFinancialList.reduce((acc, t) => acc + t.fastestLap, 0))}M
                  </td>
                  <td className="p-1.5 text-right font-mono">
                    +{r1(teamsFinancialList.reduce((acc, t) => acc + t.participation, 0))}M
                  </td>
                  <td className="p-1.5 text-right font-mono">
                    +{r1(teamsFinancialList.reduce((acc, t) => acc + t.cleanTeam, 0))}M
                  </td>
                  <td className="p-1.5 text-right font-mono font-bold text-violet-900 bg-violet-100/50">
                    +{r1(teamsFinancialList.reduce((acc, t) => acc + t.rivalry, 0))}M
                  </td>
                  <td className="p-1.5 text-right font-mono font-black text-emerald-900 bg-emerald-100/60">
                    +{r1(teamsFinancialList.reduce((acc, t) => acc + t.total, 0))}M
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* SECCIÓN 3: DESGLOSE DETALLADO DE RIVALIDADES */}
          {rivalryBreakdown.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-xs font-black uppercase tracking-wider text-zinc-900 flex items-center gap-2">
                  <Users className="h-3.5 w-3.5 text-violet-700" />
                  3. Desglose Detallado de Premios por Rivalidades
                </h2>
                <span className="text-[10px] text-zinc-500 font-mono">
                  {rivalryBreakdown.length} grupos en competición
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px]">
                {rivalryBreakdown.map((group, gIdx) => (
                  <div key={gIdx} className="border border-violet-200 bg-violet-50/20 rounded p-2.5">
                    <p className="font-black text-violet-950 uppercase text-[10px] tracking-wider mb-1.5">
                      {group.groupName} #{gIdx + 1}
                    </p>
                    <table className="w-full border-collapse text-[10px]">
                      <thead>
                        <tr className="text-zinc-500 border-b border-violet-200/60 pb-1 font-bold">
                          <th className="text-left pb-1">Piloto</th>
                          <th className="text-left pb-1">Equipo</th>
                          <th className="text-center pb-1">Q</th>
                          <th className="text-center pb-1">R</th>
                          <th className="text-right pb-1">Premio (€)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-violet-100/60">
                        {group.details.map((m, mIdx) => (
                          <tr key={mIdx} className="py-1">
                            <td className="py-1 font-bold text-zinc-900">{m.pilotName}</td>
                            <td className="py-1 text-zinc-600">{m.teamName}</td>
                            <td className="py-1 text-center font-mono">{m.qualyPos}</td>
                            <td className="py-1 text-center font-mono">{m.racePos}</td>
                            <td className="py-1 text-right font-mono font-bold text-violet-900">
                              {m.totalPrize > 0 ? `+${r1(m.totalPrize)}M` : "0.0M"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SECCIÓN 4: REGISTRO DE ASIENTOS OFICIALES EN LEDGER */}
          {circuitTransactions.length > 0 && (
            <div>
              <h2 className="text-xs font-black uppercase tracking-wider text-zinc-900 mb-2 flex items-center gap-2">
                <Zap className="h-3.5 w-3.5 text-zinc-700" />
                4. Asientos Oficiales en el Libro Diario
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[10px]">
                {circuitTransactions.map((tx, idx) => (
                  <div key={idx} className="border border-zinc-200 bg-zinc-50 p-2 rounded flex justify-between items-start">
                    <div>
                      <p className="font-bold text-zinc-900">{tx.equipo}: <span className="font-normal text-zinc-700">{tx.descripcion || tx.tipo}</span></p>
                      {tx.piloto && <p className="text-zinc-500">Piloto: {tx.piloto}</p>}
                    </div>
                    <span className="font-mono font-bold text-emerald-800 shrink-0 ml-2">
                      +{r1(tx.cantidad)}M
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* PIE DE FIRMA FIA */}
          <div className="border-t border-zinc-300 pt-4 text-[10px] text-zinc-500 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <div>
              <p className="font-semibold text-zinc-700">F1 Bugambra Championship · FIA Administrative Panel</p>
              <p>Este informe constituye la certificación oficial de puntos, posiciones y premios financieros del GP.</p>
            </div>
            <div className="text-right font-mono text-[9px]">
              <p>AUTORIZADO POR: FIA RACE STEWARDS</p>
              <p>HASH REF: {docRef}</p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
