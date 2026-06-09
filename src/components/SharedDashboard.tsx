import React, { useState, useMemo, useEffect, useRef } from "react";
import { doc, updateDoc, runTransaction, collection } from "firebase/firestore";
import { db } from "../services/firebase";
import { compressAndConvertImage } from "../utils/imageHelper";
import { useUsuarios, useSplits } from "../hooks/useData";
import { useAuth } from "../contexts/AuthContext";
import { UserMinus, ShieldAlert, Award, Sparkles, UploadCloud, Camera, X, TrendingUp, MonitorPlay } from "lucide-react";
import { isSplitUnlocked } from "../utils/splitResolver";
import { POINTS_BY_POSITION } from "../services/economyService";
import { PilotRivalryPanel } from "./RivalryPanels";
import { NextRaceWidget } from "./NextRaceWidget";
import { PilotCardF1 } from "./PilotCardF1";

export function SharedDashboardView({ canViewBudget, escuderiaId }: { canViewBudget: boolean, escuderiaId?: string }) {
  const { userData } = useAuth();
  const { usuarios } = useUsuarios();
  const { splits: rawSplits } = useSplits();
  const splits = rawSplits;
  const [activeSplitId, setActiveSplitId] = useState<string>("global");
  const [selectedPilotForProfileId, setSelectedPilotForProfileId] = useState<string | null>(null);
  const [comparePilotIdA, setComparePilotIdA] = useState<string>("");
  const [comparePilotIdB, setComparePilotIdB] = useState<string>("");
  const [isCompareViewOpen, setIsCompareViewOpen] = useState(false);
  const [isF1TVOpen, setIsF1TVOpen] = useState(false);
  const [activeProfileTab, setActiveProfileTab] = useState<"profile" | "compare">("profile");
  const [transacting, setTransacting] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    showCancel?: boolean;
  } | null>(null);

  const teamLogoInputRef = useRef<HTMLInputElement>(null);
  const [updatingLogo, setUpdatingLogo] = useState(false);
  const [logoDragActive, setLogoDragActive] = useState(false);

  const getPilotPhoto = (pilotId: string) => {
    const matched = usuarios.find((u: any) => u.uid === pilotId || u.piloto_id === pilotId);
    return matched?.foto_url || "";
  };

  const getTeamLogo = (teamId: string) => {
    if (activeSplitId !== "global" && currentSplit) {
      const match = currentSplit.equipos?.find((eq: any) => eq.id === teamId);
      return match?.logo_url || "";
    }
    for (const split of splits) {
      const match = split.equipos?.find((eq: any) => eq.id === teamId);
      if (match?.logo_url) return match.logo_url;
    }
    return "";
  };

  const handleUpdateTeamLogo = async (file: File) => {
    if (!activeSplitId || !escuderiaId || !miEscuderia) return;
    setUpdatingLogo(true);
    try {
      const compressed = await compressAndConvertImage(file, 256, 256, 0.75);
      
      const teamRef = doc(db, `splits/${activeSplitId}/equipos`, escuderiaId);
      await updateDoc(teamRef, { logo_url: compressed });
    } catch (err: any) {
      console.error("Error updating team logo:", err);
      alert("Error al actualizar el logo: " + err.message);
    } finally {
      setUpdatingLogo(false);
    }
  };

  const handleLogoDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setLogoDragActive(true);
    } else if (e.type === "dragleave") {
      setLogoDragActive(false);
    }
  };

  const handleLogoDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setLogoDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleUpdateTeamLogo(e.dataTransfer.files[0]);
    }
  };


  useEffect(() => {
    if (activeSplitId !== "global" && splits.length > 0) {
      if (!isSplitUnlocked(activeSplitId, splits)) {
        setActiveSplitId("global");
      }
    }
  }, [splits, activeSplitId]);

  const handleDespedirPiloto = async (pilot: any) => {
    if (!activeSplitId || !escuderiaId || !miEscuderia) return;
    const pilotoId = pilot.pilotoId || pilot.id;
    const refund = (pilot.precio_compra || pilot.precio_compra_split || 10) * 0.5;
    setConfirmModal({
      isOpen: true,
      title: "Despedir Piloto",
      message: `¿Quieres despedir a ${pilot.nombre}? Recibirás un reembolso del 50% (${refund.toFixed(1)}M).`,
      onConfirm: async () => {
        setTransacting(true);
        try {
          await runTransaction(db, async (trans) => {
            const teamRef = doc(db, `splits/${activeSplitId}/equipos`, escuderiaId);
            const rosterRef = doc(db, `splits/${activeSplitId}/roster`, pilotoId);

            const teamDoc = await trans.get(teamRef);
            const tData = teamDoc.data();

            trans.update(teamRef, { presupuesto: (tData?.presupuesto || 0) + refund });
            trans.update(rosterRef, { equipoId: "agente_libre" });

            const transferRef = doc(collection(db, `splits/${activeSplitId}/transfers`));
            trans.set(transferRef, {
              detalles: `❌ ${miEscuderia.nombre} despidió a ${pilot.nombre}, obteniendo un reembolso de ${refund.toFixed(1)}M.`,
              timestamp: new Date().toISOString(),
              tipo: "despido"
            });
          });

          setConfirmModal({
            isOpen: true,
            title: "Despido Procesado",
            message: `Has despedido a ${pilot.nombre}.`,
            showCancel: false,
            onConfirm: () => { setConfirmModal(null); }
          });
        } catch (err: any) {
          setConfirmModal({
            isOpen: true,
            title: "Error",
            message: "Error al despedir: " + err.message,
            showCancel: false,
            onConfirm: () => {}
          });
        } finally {
          setTransacting(false);
        }
      }
    });
  };

  const currentSplit = useMemo(() => splits.find(s => s.id === activeSplitId) || splits[0], [activeSplitId, splits]);

  const miEscuderia = useMemo(() => {
    if (!currentSplit) return null;
    let teamId: string | null = null;

    if (userData?.rol === "piloto") {
      const myPilotoId = userData.piloto_id || userData.uid;
      const rosterEntry = currentSplit.roster.find((p: any) => p.pilotoId === myPilotoId);
      teamId = rosterEntry?.equipoId || null;
    }

    if (!teamId && escuderiaId) {
      teamId = escuderiaId;
    }

    if (!teamId) return null;

    const equipo = (currentSplit.equipos || []).find((e: any) => e.id === teamId);
    if (!equipo) return null;

    const pilotosDelEquipo = currentSplit.roster.filter((p: any) => p.equipoId === teamId);
    const pilotsVal = pilotosDelEquipo.reduce((sum: number, p: any) => sum + (p.clausula_actual || (p.rating_piloto || 70) * 0.5), 0);

    return {
      ...equipo,
      valor_total: (equipo.presupuesto || 0) + pilotsVal,
    };
  }, [currentSplit, escuderiaId, userData]);

  const misPilotos = useMemo(() => {
    if (!currentSplit || !miEscuderia) return [];
    return currentSplit.roster.filter((p: any) => p.equipoId === miEscuderia.id);
  }, [currentSplit, miEscuderia]);



  const { standings, teamStandings, raceResults, championshipsTimeline } = useMemo(() => {
    if (activeSplitId === "global") {
      const pilotTitles: Record<string, { id: string; name: string; count: number; escuderia: string }> = {};
      const teamTitles: Record<string, { id: string; nombre: string; count: number }> = {};

      splits.forEach(s => {
        const isCompleted = s.circuitos.length > 0 && s.circuitos.every((c: any) => c.completado);
        if (!isCompleted) return;

        const equipoNombreMap = Object.fromEntries(s.equipos.map(e => [e.id, e.nombre]));
        let topPilotId = "", topPilotName = "", topPilotEscuderia = "";
        let maxPilotPts = -1;
        s.roster.forEach((p: any) => {
          const pts = p.puntos_piloto || 0;
          if (pts > maxPilotPts) {
            maxPilotPts = pts;
            topPilotId = p.pilotoId;
            topPilotName = p.nombre;
            topPilotEscuderia = equipoNombreMap[p.equipoId] ?? p.equipoId;
          }
        });
        if (topPilotId && maxPilotPts > 0) {
          if (!pilotTitles[topPilotId]) pilotTitles[topPilotId] = { id: topPilotId, name: topPilotName, count: 0, escuderia: topPilotEscuderia };
          pilotTitles[topPilotId].count++;
          pilotTitles[topPilotId].name = topPilotName;
          pilotTitles[topPilotId].escuderia = topPilotEscuderia;
        }

        let topTeamId = "", topTeamName = "";
        let maxTeamPts = -1;
        s.equipos.forEach(eq => {
          const pts = eq.puntos_constructores || 0;
          if (pts > maxTeamPts) { maxTeamPts = pts; topTeamId = eq.id; topTeamName = eq.nombre; }
        });
        if (topTeamId && maxTeamPts > 0) {
          if (!teamTitles[topTeamId]) teamTitles[topTeamId] = { id: topTeamId, nombre: topTeamName, count: 0 };
          teamTitles[topTeamId].count++;
          teamTitles[topTeamId].nombre = topTeamName;
        }
      });

      const ps = Object.values(pilotTitles).sort((a, b) => b.count - a.count)
        .map(p => ({ id: p.id, name: p.name, points: p.count, escuderia: p.escuderia, isGlobal: true }));
      const ts = Object.values(teamTitles).sort((a, b) => b.count - a.count)
        .map(t => ({ id: t.id, nombre: t.nombre, puntos: t.count, isGlobal: true }));

      const timeline = splits.map(s => {
        const allCompleted = s.circuitos.length > 0 && s.circuitos.every((c: any) => c.completado);
        const equipoNombreMap = Object.fromEntries(s.equipos.map(e => [e.id, e.nombre]));
        if (allCompleted) {
          let topTeamName = ""; let maxTeamPts = -1;
          s.equipos.forEach(eq => { if ((eq.puntos_constructores || 0) > maxTeamPts) { maxTeamPts = eq.puntos_constructores || 0; topTeamName = eq.nombre; } });
          let topPilotName = "", topPilotTeamName = ""; let maxPilotPts = -1;
          s.roster.forEach((p: any) => { if ((p.puntos_piloto || 0) > maxPilotPts) { maxPilotPts = p.puntos_piloto || 0; topPilotName = p.nombre; topPilotTeamName = equipoNombreMap[p.equipoId] ?? p.equipoId; } });
          return { splitId: s.id, splitName: s.nombre, completed: true, winnerPilot: topPilotName || "Desconocido", winnerPilotTeam: topPilotTeamName, winnerPilotPoints: maxPilotPts, winnerTeam: topTeamName || "Desconocido", winnerTeamPoints: maxTeamPts };
        }
        return { splitId: s.id, splitName: s.nombre, completed: false, winnerPilot: "En curso / Pendiente", winnerPilotTeam: "", winnerPilotPoints: 0, winnerTeam: "Pendiente", winnerTeamPoints: 0 };
      });

      return { standings: ps, teamStandings: ts, raceResults: [], championshipsTimeline: timeline };
    }

    if (!currentSplit) return { standings: [], teamStandings: [], raceResults: [], championshipsTimeline: [] };

    const equipoNombreMap = Object.fromEntries(currentSplit.equipos.map(e => [e.id, e.nombre]));
    const ps = currentSplit.roster
      .map((p: any) => ({ id: p.pilotoId, name: p.nombre, points: p.puntos_piloto || 0, escuderia: equipoNombreMap[p.equipoId] ?? "Sin equipo" }))
      .sort((a: any, b: any) => b.points - a.points);

    const ts = currentSplit.equipos
      .map(e => ({ id: e.id, nombre: e.nombre, puntos: e.puntos_constructores || 0 }))
      .sort((a, b) => b.puntos - a.puntos);

    const localPOINTS_SCALE = POINTS_BY_POSITION;
    const rRes: any[] = [];
    currentSplit.circuitos.filter((c: any) => c.completado && c.resultados).forEach((c: any) => {
      rRes.push({
        circuitName: c.nombre,
        pilots: c.resultados.map((r: any) => ({
          id: r.pilotoId,
          name: r.pilotoNombre || currentSplit.roster.find((p: any) => p.pilotoId === r.pilotoId)?.nombre || r.pilotoId,
          pts: (r.racePos >= 1 && r.racePos <= 12 ? localPOINTS_SCALE[r.racePos - 1] : 0) + (r.qualyPos === 1 ? 2 : 0),
          team: r.escuderiaId || "",
        })),
      });
    });

    return { standings: ps, teamStandings: ts, raceResults: rRes, championshipsTimeline: [] };
  }, [activeSplitId, currentSplit, splits]);

  const getPilotStats = (pilotId: string, isGlobalView: boolean = false) => {
    const pilotUser = usuarios.find((u: any) => u.uid === pilotId || (u.piloto_id && u.piloto_id === pilotId));
    let pilotName = pilotUser?.nombre || pilotId;

    let totalPoints = 0, victories = 0, podiums = 0, poles = 0, dnfs = 0;
    let cleanRaces = 0, dotds = 0, mvps = 0, fastestLaps = 0;
    const history: any[] = [];
    const localPOINTS_SCALE = POINTS_BY_POSITION;

    const splitsToSearch = isGlobalView ? splits : splits.filter(s => s.id === activeSplitId);

    splitsToSearch.forEach((s: any) => {
      const equipoNombreMap = Object.fromEntries((s.equipos || []).map((e: any) => [e.id, e.nombre]));
      const rosterEntry = (s.roster || []).find((p: any) => p.pilotoId === pilotId);

      s.circuitos?.filter((c: any) => c.completado && c.resultados).forEach((c: any) => {
        const res = c.resultados.find((r: any) => r.pilotoId === pilotId);
        if (res) {
          const points = (res.racePos >= 1 && res.racePos <= 12 ? localPOINTS_SCALE[res.racePos - 1] : 0) + (res.qualyPos === 1 ? 2 : 0);
          totalPoints += points;
          if (res.racePos === 1) victories++;
          if (res.racePos >= 1 && res.racePos <= 3) podiums++;
          if (res.qualyPos === 1) poles++;
          if (res.isDnfOwnError || res.racePos > 12) dnfs++;
          if (res.isClean) cleanRaces++;
          if (res.isDotd) dotds++;
          if (res.isMvp) mvps++;
          if (res.fastestLap) fastestLaps++;

          const teamName = rosterEntry
            ? (equipoNombreMap[rosterEntry.equipoId] ?? "N/A")
            : (equipoNombreMap[res.escuderiaId] ?? "N/A");

          history.push({ splitId: s.id, splitName: s.nombre, circuitId: c.id, circuitName: c.nombre, qualyPos: res.qualyPos, racePos: res.racePos, isDnfOwnError: res.isDnfOwnError, isClean: res.isClean, overtakesBoost: res.overtakesBoost, isDotd: res.isDotd, isMvp: res.isMvp, fastestLap: res.fastestLap, points, teamName });
        }
      });
    });

    const participaciones = history.length;
    const avgPoints = participaciones > 0 ? Number((totalPoints / participaciones).toFixed(1)) : 0;
    const validQualyPos = history.filter(h => h.qualyPos >= 1 && h.qualyPos <= 20).map(h => h.qualyPos);
    const avgQualy = validQualyPos.length > 0 ? Number((validQualyPos.reduce((a, b) => a + b, 0) / validQualyPos.length).toFixed(1)) : 0;
    const validRacePos = history.filter(h => h.racePos >= 1 && h.racePos <= 12).map(h => h.racePos);
    const avgRace = validRacePos.length > 0 ? Number((validRacePos.reduce((a, b) => a + b, 0) / validRacePos.length).toFixed(1)) : 0;

    let finalRating = 70, baseClause = 10, escuderiaName = "Sin equipo";

    if (isGlobalView) {
      const latestSplit = [...splits].reverse().find(s => (s.roster || []).some((p: any) => p.pilotoId === pilotId));
      if (latestSplit) {
        const entry = latestSplit.roster.find((p: any) => p.pilotoId === pilotId);
        if (entry) {
          const eMap = Object.fromEntries(latestSplit.equipos.map(e => [e.id, e.nombre]));
          escuderiaName = eMap[entry.equipoId] ?? entry.equipoId;
          finalRating = entry.rating_piloto ?? 70;
        }
      } else if (pilotUser?.rating_piloto) {
        finalRating = pilotUser.rating_piloto;
      }
      if (!pilotName) pilotName = "Desconocido";
      baseClause = finalRating * 0.5;
    } else {
      const activeSp = splits.find(s => s.id === activeSplitId);
      if (activeSp) {
        const entry = activeSp.roster.find((p: any) => p.pilotoId === pilotId);
        if (entry) {
          const eMap = Object.fromEntries(activeSp.equipos.map(e => [e.id, e.nombre]));
          escuderiaName = eMap[entry.equipoId] ?? "Sin equipo";
          finalRating = entry.rating_piloto ?? pilotUser?.rating_piloto ?? 70;
          baseClause = entry.clausula_actual ?? (finalRating * 0.5);
        } else {
          finalRating = pilotUser?.rating_piloto ?? 70;
        }
      }
    }

    return { pilotId, name: pilotName, fotoUrl: getPilotPhoto(pilotId), rating: finalRating, clause: baseClause, escuderiaName, totalPoints, victorias: victories, podiums, poles, dnfs, cleanRaces, dotds, mvps, fastestLaps, participaciones, avgPoints, avgQualy, avgRace, history: history.sort((a, b) => b.splitId.localeCompare(a.splitId) || a.circuitId.localeCompare(b.circuitId)) };
  };

  const pilotProfileStats = useMemo(() => {
    if (!selectedPilotForProfileId) return null;
    return getPilotStats(selectedPilotForProfileId, activeSplitId === "global");
  }, [selectedPilotForProfileId, splits, usuarios, activeSplitId]);

  const allPaddockPilots = useMemo(() => {
    const list: { id: string; name: string; rtg: number; team: string }[] = [];
    const seen = new Set<string>();

    if (activeSplitId !== "global" && currentSplit) {
      currentSplit.roster.forEach((p: any) => {
        if (!seen.has(p.pilotoId)) {
          seen.add(p.pilotoId);
          const teamName = currentSplit.equipos.find((e: any) => e.id === p.equipoId)?.nombre ?? p.equipoId;
          list.push({ id: p.pilotoId, name: p.nombre, rtg: p.rating_piloto || 70, team: teamName });
        }
      });
    } else {
      splits.forEach(s => {
        s.roster.forEach((p: any) => {
          if (!seen.has(p.pilotoId)) {
            seen.add(p.pilotoId);
            const teamName = s.equipos.find((e: any) => e.id === p.equipoId)?.nombre ?? p.equipoId;
            list.push({ id: p.pilotoId, name: p.nombre, rtg: p.rating_piloto || 70, team: teamName });
          }
        });
      });

      usuarios.filter((u: any) => u.rol === "piloto").forEach((u: any) => {
        const pId = u.piloto_id || u.uid;
        if (!seen.has(pId)) {
          seen.add(pId);
          list.push({ id: pId, name: u.nombre, rtg: 70, team: "Sin equipo" });
        }
      });
    }

    return list.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  }, [activeSplitId, currentSplit, splits, usuarios]);

  const statsA = useMemo(() => {
    if (!comparePilotIdA) return null;
    return getPilotStats(comparePilotIdA, activeSplitId === "global");
  }, [comparePilotIdA, splits, usuarios, activeSplitId]);

  const statsB = useMemo(() => {
    if (!comparePilotIdB) return null;
    return getPilotStats(comparePilotIdB, activeSplitId === "global");
  }, [comparePilotIdB, splits, usuarios, activeSplitId]);

  return (
    <div className="space-y-8 pb-32">
      <div className="flex flex-wrap items-center justify-between gap-y-3 w-full p-1.5 rounded-sm border border-white/5">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveSplitId("global")}
            className={`px-4 py-2 rounded-sm font-black text-[10px] uppercase tracking-widest transition-all ${
              activeSplitId === "global" ? "bg-[#e10600] text-white " : "bg-white/[0.03] text-white/40 border border-white/5 hover:border-white/10"
            }`}
          >
            Mundial Global
          </button>
          {splits.filter(s => isSplitUnlocked(s.id, splits)).map(s => (
            <button
              key={s.id}
              onClick={() => setActiveSplitId(s.id)}
              className={`px-4 py-2 rounded-sm font-black text-[10px] uppercase tracking-widest transition-all ${
                activeSplitId === s.id ? "bg-[#e10600] text-white " : "bg-white/[0.03] text-white/40 border border-white/5 hover:border-white/10"
              }`}
            >
              {s.nombre}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setIsCompareViewOpen(true);
              setActiveProfileTab("compare");
              if (allPaddockPilots.length > 0) {
                const defaultA = (userData?.rol === "piloto" && userData?.uid) ? (userData.piloto_id || userData.uid) : (misPilotos[0]?.pilotoId || allPaddockPilots[0].id);
                setComparePilotIdA(defaultA);
                const otherPilots = allPaddockPilots.filter(p => p.id !== defaultA);
                if (otherPilots.length > 0) setComparePilotIdB(otherPilots[0].id);
                else if (allPaddockPilots.length > 1) setComparePilotIdB(allPaddockPilots[1].id);
                else setComparePilotIdB(allPaddockPilots[0].id);
              }
            }}
            className="px-4 py-2 border border-amber-500/45 hover:border-amber-400 text-amber-300 hover:text-white rounded-sm font-black text-[10px] uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer  active:scale-95"
          >
            <TrendingUp className="w-3.5 h-3.5" />
            perfiles y comparador ⚔️
          </button>
          <button
            onClick={() => setIsF1TVOpen(true)}
            className="px-4 py-2 border border-[#e10600]/50 hover:border-[#e10600] text-red-100 hover:text-white rounded-sm font-black text-[10px] uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
          >
            <MonitorPlay className="w-3.5 h-3.5" />
            F1 TV EN DIRECTO 🔴
          </button>
        </div>
      </div>

      {activeSplitId !== "global" && currentSplit && currentSplit.circuitos?.some((c: any) => !c.completado) && (
        <div className="mb-8"><NextRaceWidget currentSplit={currentSplit} /></div>
      )}

      <div className="bg-white/[0.02]border border-white/10  p-4 flex flex-col lg:flex-row items-center justify-between gap-4 ">
        <div className="flex items-center gap-3">
          <Award className="w-8 h-8 text-amber-400 shrink-0" />
          <div>
            <span className="text-[9px] uppercase tracking-[0.25em] text-[#e10600] font-black block">PADDOCK CLUB HALL OF FAME</span>
            <span className="text-xs text-white/40 uppercase font-mono">Historial de Campeones Oficiales F1 Bugambra</span>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-2.5 w-full lg:w-auto flex-wrap">
          {championshipsTimeline.filter(t => t.completed).map((t: any) => (
            <div key={t.splitId} className="flex flex-col sm:flex-row gap-2.5">
              <div className="bg-white/5 border border-white/5 rounded-sm px-4 py-2 flex items-center justify-between sm:justify-start gap-4">
                <span className="text-[9px] text-amber-400/80 font-mono uppercase tracking-widest">🏆 {t.splitName} Pilotos:</span>
                <span className="font-extrabold text-xs text-white uppercase tracking-tight">{t.winnerPilot} [{t.winnerPilotTeam}]</span>
              </div>
              <div className="bg-white/5 border border-white/5 rounded-sm px-4 py-2 flex items-center justify-between sm:justify-start gap-4">
                <span className="text-[9px] text-[#e10600]/85 font-mono uppercase tracking-widest">🏎️ {t.splitName} Escuderías:</span>
                <span className="font-extrabold text-xs text-white uppercase tracking-tight">{t.winnerTeam}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {activeSplitId !== "global" && (miEscuderia || userData?.rol === "piloto") && (
        <section className="bg-white/[0.02]border border-white/20  p-6 relative overflow-hidden">
          <div className="absolute -right-4 -top-4 w-32 h-32 bg-[#e10600]/10 rounded-full pointer-events-none"></div>
          {miEscuderia ? (
            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-5 w-full md:w-auto">
              {canViewBudget ? (
                <div
                  onDragEnter={handleLogoDrag} onDragOver={handleLogoDrag} onDragLeave={handleLogoDrag} onDrop={handleLogoDrop} onClick={() => teamLogoInputRef.current?.click()}
                  className={`relative w-20 h-20 rounded-sm overflow-hidden border-2 cursor-pointer transition-all shrink-0 flex items-center justify-center group ${logoDragActive ? "border-[#e10600] bg-[#e10600]/15" : "border-white/10 hover:border-[#e10600] bg-white/[0.02]"}`}
                >
                  <input type="file" ref={teamLogoInputRef} onChange={(e) => { if (e.target.files && e.target.files[0]) handleUpdateTeamLogo(e.target.files[0]); }} accept="image/*" className="hidden" />
                  {(miEscuderia as any).logo_url ? (
                    <img src={(miEscuderia as any).logo_url} alt={miEscuderia.nombre} referrerPolicy="no-referrer" className="w-full h-full object-cover group-hover:opacity-40 transition-opacity" />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-center p-2">
                      <UploadCloud className="w-6 h-6 text-white/30 group-hover:text-white/80 transition-colors" />
                      <span className="text-[8px] font-mono text-white/20 uppercase tracking-tighter mt-1 group-hover:text-white/60">SUBIR LOGO</span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-white/[0.02]opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white text-[8px] font-mono uppercase tracking-widest gap-1 select-none">
                    <Camera className="w-4 h-4 text-[#e10600]" /><span>EDITAR LOGO</span>
                  </div>
                  {updatingLogo && <div className="absolute inset-0 bg-[#0a0a0a]flex items-center justify-center text-xs font-mono text-white">Cargando...</div>}
                </div>
              ) : (
                <div className="w-20 h-20 rounded-sm overflow-hidden border border-white/10 bg-white/[0.02]shrink-0 flex items-center justify-center">
                  {(miEscuderia as any).logo_url ? <img src={(miEscuderia as any).logo_url} alt={miEscuderia.nombre} referrerPolicy="no-referrer" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-xs font-black uppercase text-white/20 font-mono">{miEscuderia.nombre ? miEscuderia.nombre.substring(0, 2).toUpperCase() : 'EQ'}</div>}
                </div>
              )}
              <div>
                <span className="text-[8px] font-mono uppercase tracking-[0.25em] text-[#e10600] font-black block mb-1">{canViewBudget ? "ESCUDERÍA OFICIAL DEL JEQUE" : "TU EQUIPO PARA ESTE SPLIT"}</span>
                <h3 className="text-2xl font-black italic text-white uppercase tracking-tight">{miEscuderia.nombre}</h3>
                <p className="text-[10px] text-white/40 uppercase font-mono mt-0.5">Visualizando logo oficial del {currentSplit?.nombre || activeSplitId}</p>
              </div>
            </div>
            <div className="flex items-center gap-8 w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 border-white/5 pt-4 md:pt-0">
              {canViewBudget && (
                <div>
                  <h4 className="text-[9px] uppercase font-bold tracking-[0.15em] text-[#e10600] mb-1">Presupuesto Disponible</h4>
                  <div className="flex items-baseline gap-0.5">
                    <span className="text-4xl font-extrabold italic text-white leading-none">{miEscuderia.presupuesto.toFixed(1)}</span><span className="text-xl font-bold text-white/50">M</span>
                  </div>
                </div>
              )}
              <div className="text-right">
                <p className="text-[9px] text-[#e10600] uppercase font-bold tracking-[0.15em] mb-1">Valor Total de Plantilla</p>
                <div className="flex items-baseline justify-end gap-0.5">
                  <span className="text-2xl font-black italic text-white leading-none">{miEscuderia.valor_total.toFixed(1)}</span><span className="text-sm font-bold text-white/50">M</span>
                </div>
              </div>
            </div>
          </div>
          ) : null}
        </section>
      )}

      {activeSplitId !== "global" && (
        <section>
          <div className="flex justify-between items-center mb-4 border-b border-white/10 pb-2">
            <h2 className="text-xl font-bold italic tracking-tight lowercase flex items-center gap-2"><span className="w-1 h-5 bg-[#e10600]" />mi equipo</h2>
            {currentSplit?.fichajes_abiertos && (
              <span className="bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 font-bold font-mono text-[10px] uppercase px-2.5 py-1 rounded-full animate-pulse tracking-wide flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" /> VENTANA DE FICHAJES ABIERTA (MERCADO ACTIVO)
              </span>
            )}
          </div>
          
          {userData?.rol === "piloto" && !miEscuderia ? (
            <div className="bg-amber-500/5border border-amber-500/20  p-6 relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
              <div className="absolute right-0 top-0 w-32 h-32 bg-amber-500/5 rounded-full "></div>
              <div>
                <div className="flex items-center gap-2 text-amber-500 font-black text-xs uppercase tracking-widest mb-2"><ShieldAlert className="w-4 h-4 animate-bounce" /> Agencia Libre / Estado Independiente</div>
                <h3 className="text-xl font-extrabold text-white uppercase tracking-tight">Actualmente estás SIN EQUIPO en {currentSplit?.nombre || "este Split"}</h3>
                <p className="text-sm text-white/60 mt-1 max-w-xl">Tu perfil está disponible en el mercado para este Split. Las escuderías con presupuesto te pueden incorporar mediante la sección de "Agentes Libres Bolsa", o el Administrador puede asignarte de forma manual a una escudería desde el Panel de Control.</p>
              </div>
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-sm p-3 text-center w-full md:w-auto shrink-0">
                <span className="text-[10px] block text-amber-400 font-mono tracking-wider uppercase font-extrabold mb-1">VALOR DE COMPRA</span>
                <span className="text-2xl font-black font-mono text-white">10M</span>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {misPilotos.map((p: any, i: number) => {
                const team = currentSplit?.equipos?.find((e: any) => e.id === p.equipoId);
                return (
                  <div
                    key={`mis-pilotos-${p.pilotoId}-${i}`}
                    className="cursor-pointer"
                    onClick={() => { setSelectedPilotForProfileId(p.pilotoId); setActiveProfileTab("profile"); setIsCompareViewOpen(true); }}
                    title="Clic para ver estadísticas"
                  >
                    <PilotCardF1
                      pilot={p}
                      team={team}
                      getPilotPhoto={getPilotPhoto}
                      size="sm"
                      showPrice={canViewBudget && !p.congelado}
                      footer={canViewBudget ? (
                        <div className="bg-white/[0.02] border border-t-0 border-white/[0.06] px-2.5 py-2 space-y-1.5">
                          <div className="flex justify-between text-[9px] font-mono text-white/40">
                            <span>Cláusula</span>
                            <span className="text-[#e10600] font-bold">{p.clausula_actual || 0}M</span>
                          </div>
                          {currentSplit?.fichajes_abiertos && (
                            <button
                              disabled={transacting}
                              onClick={e => { e.stopPropagation(); handleDespedirPiloto(p); }}
                              className="w-full bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 py-1.5 text-[9px] font-bold uppercase tracking-wider flex items-center justify-center gap-1 transition-all disabled:opacity-40"
                            >
                              <UserMinus className="w-3 h-3" />
                              Despedir ({((p.precio_compra || 10) * 0.5).toFixed(1)}M)
                            </button>
                          )}
                        </div>
                      ) : undefined}
                    />
                  </div>
                );
              })}
              {misPilotos.length === 0 && (
                <div className="col-span-full text-white/20 italic text-xs uppercase tracking-widest font-mono p-4 border border-white/5">
                  Sin pilotos contratados.
                </div>
              )}
            </div>
          )}
        </section>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <section>
          <h2 className="text-xl font-bold italic tracking-tight mb-4 border-b border-white/10 pb-2 lowercase flex items-center gap-2">
            <span className="w-1 h-5 bg-[#e10600]" />
            {activeSplitId === "global" ? "PALMARÉS HISTÓRICO PILOTOS" : `MUNDIAL ${currentSplit?.nombre || 'PILOTOS'}`}
          </h2>
          <div className="bg-white/[0.03] border border-white/10  overflow-hidden p-4">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="text-[10px] text-white/30 uppercase tracking-wider border-b border-white/5">
                  <th className="pb-3 pl-2">Pos</th>
                  <th className="pb-3">Piloto</th>
                  <th className="pb-3 text-right pr-2">{activeSplitId === "global" ? "Títulos" : "Pts"}</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {standings.map((p: any, i: number) => {
                  const pilotPhoto = getPilotPhoto(p.id);
                  return (
                    <tr 
                      key={`standings-${p.id || p.name}-${i}`} 
                      onClick={() => { setSelectedPilotForProfileId(p.id); setActiveProfileTab("profile"); setIsCompareViewOpen(true); }}
                      className="border-b border-white/5 last:border-0 hover:bg-[#e10600]/10 transition-all cursor-pointer group" title="Haz clic para ver la ficha estadística del piloto"
                    >
                      <td className="py-3 pl-2 font-black italic text-white/30 text-lg w-8">{i + 1}</td>
                      <td className="py-3 font-bold">
                        <div className="flex items-center gap-3">
                          {pilotPhoto ? (
                            <img src={pilotPhoto} alt={p.name} referrerPolicy="no-referrer" className="w-8 h-8 rounded-full object-cover border border-[#e10600]/40" />
                          ) : (
                            <div className="w-8 h-8 rounded-full border border-white/5 bg-[#111] flex items-center justify-center font-bold text-[10px] text-white/30 uppercase font-mono">
                              {p.name ? p.name.substring(0, 2).toUpperCase() : '??'}
                            </div>
                          )}
                          <div className="flex flex-col">
                            <span>{p.name}</span>
                            <span className="text-[10px] text-white/20 font-mono uppercase">{p.escuderia}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 text-right pr-2 font-bold tabular-nums">
                        {activeSplitId === "global"
                          ? <span className="text-amber-400 text-base font-black">{p.points} 🏆</span>
                          : p.points}
                      </td>
                  </tr>
                );
              })}
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h2 className="text-xl font-bold italic tracking-tight mb-4 border-b border-white/10 pb-2 lowercase flex items-center gap-2">
            <span className="w-1 h-5 bg-[#e10600]" />
            {activeSplitId === "global" ? "PALMARÉS HISTÓRICO ESCUDERÍAS" : "MUNDIAL ESCUDERÍAS"}
          </h2>
          <div className="bg-white/[0.03] border border-white/10  overflow-hidden p-4">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="text-[10px] text-white/30 uppercase tracking-wider border-b border-white/5">
                  <th className="pb-3 pl-2">Pos</th>
                  <th className="pb-3">Escudería</th>
                  <th className="pb-3 text-right pr-2">{activeSplitId === "global" ? "Títulos" : "Pts"}</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {teamStandings.map((t: any, i: number) => {
                  const logo = getTeamLogo(t.id);
                  return (
                    <tr key={t.id} className="border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors">
                      <td className="py-3 pl-2 font-black italic text-white/30 text-lg w-8">{i + 1}</td>
                      <td className="py-3 font-bold flex items-center gap-3">
                        {logo ? (
                          <img src={logo} alt={t.nombre} referrerPolicy="no-referrer" className="w-8 h-8 rounded-sm object-cover border border-white/10" />
                        ) : (
                          <div className="w-8 h-8 rounded-sm border border-white/5 bg-[#111] flex items-center justify-center font-bold text-[10px] text-white/40 uppercase font-mono">
                            {t.nombre ? t.nombre.substring(0, 2).toUpperCase() : '??'}
                          </div>
                        )}
                        <span className="uppercase tracking-tighter">{t.nombre}</span>
                      </td>
                      <td className="py-3 text-right pr-2 font-bold tabular-nums">
                        {activeSplitId === "global"
                          ? <span className="text-amber-400 text-base font-black">{t.puntos} 🏆</span>
                          : t.puntos}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {activeSplitId === "global" && championshipsTimeline && championshipsTimeline.length > 0 && (
        <section className="mt-8">
          <h2 className="text-xl font-bold italic tracking-tight mb-4 border-b border-white/10 pb-2 lowercase flex items-center gap-2">
            <span className="w-1.5 h-5 bg-[#e10600] block" /> Palmarés Histórico por Splits (Historial de Campeones)
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {championshipsTimeline.map((item, idx) => (
              <div key={item.splitId} className={`border  p-5 relative overflow-hidden transition-all duration-300 ${item.completed ? "bg-[#0a0a0a]border-amber-500/30 hover:border-amber-500/50  shadow-amber-950/20" : "bg-white/[0.02] border-white/5 opacity-60"}`}>
                {item.completed ? (
                  <div className="absolute top-3 right-3 bg-amber-500/10 text-amber-400 border border-amber-500/25 rounded-full px-2 py-0.5 text-[8px] font-black uppercase tracking-wider font-mono">Oficial 🏆</div>
                ) : (
                  <div className="absolute top-3 right-3 bg-white/5 text-white/40 border border-white/10 rounded-full px-2 py-0.5 text-[8px] font-mono tracking-wider uppercase">Próximo 🏁</div>
                )}
                <div className="text-[10px] uppercase font-mono tracking-widest text-[#e10600] mb-4 font-black">{item.splitName}</div>
                
                <div className="space-y-4">
                  <div>
                    <div className="text-[9px] text-white/30 uppercase font-mono mb-1">Campeón de Pilotos:</div>
                    {item.completed ? (
                      <div>
                        <p className="font-extrabold text-[#e10600] text-sm tracking-tight">{item.winnerPilot}</p>
                        <p className="text-[10px] text-white/50 font-mono mt-0.5 uppercase">{item.winnerPilotTeam} ({item.winnerPilotPoints} pts)</p>
                      </div>
                    ) : (
                      <p className="text-xs text-white/20 italic font-mono uppercase">Pendiente de inicio</p>
                    )}
                  </div>
                  <div className="border-t border-white/5 pt-3">
                    <div className="text-[9px] text-white/30 uppercase font-mono mb-1">Campeón de Escuderías:</div>
                    {item.completed ? (
                      <div>
                        <p className="font-extrabold text-white text-sm tracking-tight uppercase">{item.winnerTeam}</p>
                        <p className="text-[10px] text-white/50 font-mono mt-0.5 uppercase">({item.winnerTeamPoints} pts)</p>
                      </div>
                    ) : (
                      <p className="text-xs text-white/20 italic font-mono uppercase">Pendiente de inicio</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {activeSplitId !== "global" && raceResults.length > 0 && (
        <section>
          <h2 className="text-xl font-bold italic tracking-tight mb-4 border-b border-white/10 pb-2 lowercase flex items-center gap-2">
            <span className="w-1 h-5 bg-[#e10600]" /> puntos por carrera
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {raceResults.map((gp, i) => (
              <div key={i} className="bg-white/[0.03] border border-white/10  p-4 overflow-hidden relative group">
                <div className="absolute right-0 top-0 text-[40px] font-black italic text-white/5 pointer-events-none group-hover:text-[#e10600]/10 transition-colors uppercase">GP</div>
                <h3 className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#e10600] mb-4 border-b border-white/5 pb-2">{gp.circuitName}</h3>
                <div className="space-y-3">
                  {gp.pilots.sort((a: any, b: any) => b.pts - a.pts).map((rp: any, idx: number) => (
                    <div 
                      key={idx} 
                      onClick={() => { setSelectedPilotForProfileId(rp.id); setActiveProfileTab("profile"); setIsCompareViewOpen(true); }}
                      className="flex justify-between items-center text-xs cursor-pointer hover:bg-white/5 p-1 rounded transition-colors group/row" title="Haz clic para ver la ficha estadística detallada de este piloto"
                    >
                      <div className="flex flex-col">
                        <span className="font-bold flex items-center gap-2 text-white group-hover/row:text-[#e10600] transition-colors">
                           <span className="w-1.5 h-1.5 bg-white/20 rounded-full group-hover/row:bg-[#e10600]/80" /> {rp.name}
                        </span>
                        <span className="text-[9px] text-white/20 uppercase font-mono ml-3.5">{rp.team.replace('_', ' ')}</span>
                      </div>
                      <span className="font-black text-white tabular-nums group-hover/row:text-[#e10600] transition-colors">{rp.pts} <span className="text-[9px] text-white/40 font-normal text-white/40">pts</span></span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {(activeSplitId !== "global" && userData?.rol === "piloto") && (
        <PilotRivalryPanel split={currentSplit} miEscuderia={miEscuderia} userPilotId={userData.uid || userData.piloto_id} />
      )}


      {confirmModal && confirmModal.isOpen && (
        <div className="fixed inset-0 bg-black/90z-50 flex items-center justify-center p-4">
          <div className="bg-[#0a0a0a] border border-white/10  p-6 max-w-sm w-full relative text-left">
            <h3 className="text-lg font-black text-white uppercase tracking-tight mb-2 flex items-center gap-2"><span className="w-1.5 h-4 bg-[#e10600]" /> {confirmModal.title}</h3>
            <p className="text-xs text-white/60 leading-relaxed mb-6">{confirmModal.message}</p>
            <div className="flex justify-end gap-3 font-semibold text-[10px] uppercase tracking-wider">
              {confirmModal.showCancel !== false && (<button onClick={() => setConfirmModal(null)} className="px-4 py-2.5 bg-white/5 hover:bg-white/10 text-white rounded-sm transition-colors border border-white/5">Cancelar</button>)}
              <button onClick={() => { confirmModal.onConfirm(); setConfirmModal(null); }} className="px-4 py-2.5 bg-[#e10600] text-white rounded-sm hover:bg-red-700 transition-colors ">Confirmar</button>
            </div>
          </div>
        </div>
      )}

      {isCompareViewOpen && (
        <div className="fixed inset-0 bg-[#0a0a0a]/95z-50 overflow-y-auto p-4 md:p-6 text-left">
          <div className="max-w-5xl mx-auto bg-[#0a0a0a] border border-white/10  p-6 relative my-4">
            <div className="flex justify-between items-start border-b border-[#e10600]/20 pb-4 mb-6">
              <div>
                <span className="text-[10px] font-black tracking-[0.2em] text-[#e10600] uppercase font-mono block">CENTRAL DE TELEMETRÍA GP</span>
                <h2 className="text-xl md:text-2xl font-black italic tracking-tight text-white uppercase flex items-center gap-2 mt-0.5"><TrendingUp className="w-6 h-6 text-amber-500" /> RIVALIDAD & RENDIMIENTO PADDOCK</h2>
              </div>
              <button onClick={() => { setIsCompareViewOpen(false); setSelectedPilotForProfileId(null); }} className="p-2 hover:bg-white/5 text-white/50 hover:text-white rounded-sm transition-all border border-white/5 hover:border-white/10 cursor-pointer"><X className="w-5 h-5" /></button>
            </div>

            <div className="flex border-b border-white/5 mb-6 gap-2">
              <button onClick={() => { setActiveProfileTab("profile"); if (!selectedPilotForProfileId && allPaddockPilots.length > 0) setSelectedPilotForProfileId(allPaddockPilots[0].id); }} className={`flex-1 md:flex-initial px-6 py-3 font-black text-xs uppercase tracking-wider border-b-2 transition-all cursor-pointer ${activeProfileTab === "profile" ? "border-[#e10600] text-white bg-white/[0.02]" : "border-transparent text-white/40 hover:text-white hover:bg-white/[0.01]"}`}>👤 Ficha Individual de Piloto</button>
              <button onClick={() => { setActiveProfileTab("compare"); if (!comparePilotIdA && allPaddockPilots.length > 0) setComparePilotIdA(selectedPilotForProfileId || allPaddockPilots[0].id); if (!comparePilotIdB && allPaddockPilots.length > 0) { const firstId = selectedPilotForProfileId || allPaddockPilots[0].id; const other = allPaddockPilots.filter(p => p.id !== firstId)[0]; setComparePilotIdB(other?.id || firstId); } }} className={`flex-1 md:flex-initial px-6 py-3 font-black text-xs uppercase tracking-wider border-b-2 transition-all cursor-pointer ${activeProfileTab === "compare" ? "border-[#e10600] text-white bg-white/[0.02]" : "border-transparent text-white/40 hover:text-white hover:bg-white/[0.01]"}`}>⚔️ Comparador Cara a Cara</button>
            </div>

            {activeProfileTab === "profile" && (
              <div className="space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/[0.02] border border-white/5 p-4 rounded-sm">
                  <div>
                    <label className="text-[10px] text-white/40 uppercase font-mono tracking-wider mb-1.5 block">Explorar Ficha de Piloto</label>
                    <select value={selectedPilotForProfileId || ""} onChange={(e) => setSelectedPilotForProfileId(e.target.value)} className="bg-[#111] border border-white/10 rounded-sm text-xs px-3 py-2 text-white font-bold w-full md:w-64 focus:border-red-500 hover:border-white/20 transition-all cursor-pointer">
                      <option value="" disabled>-- Selecciona un piloto --</option>
                      {allPaddockPilots.map((p) => (<option key={p.id} value={p.id}>{p.name} ({p.team})</option>))}
                    </select>
                  </div>
                  {selectedPilotForProfileId && (
                    <button onClick={() => { setComparePilotIdA(selectedPilotForProfileId); const other = allPaddockPilots.filter(p => p.id !== selectedPilotForProfileId)[0]; if (other) setComparePilotIdB(other.id); setActiveProfileTab("compare"); }} className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 font-extrabold uppercase text-[10px] tracking-wider px-4 py-2.5 rounded-sm flex items-center gap-1.5 cursor-pointer transition-all active:scale-95">
                      <TrendingUp className="w-4 h-4" /> Comparar este piloto ⚔️
                    </button>
                  )}
                </div>

                {pilotProfileStats ? (
                  <div className="space-y-6">
                    <div className="flex flex-col lg:flex-row gap-6">
                      <div className="relative w-full max-w-[288px] mx-auto lg:mx-0 shrink-0 h-[440px] bg-white/[0.02]border border-white/10 shadow-[0_15px_40px_rgba(225,6,0,0.15)] overflow-hidden group">
                        <div className="absolute top-0 left-0 w-full h-1.5 bg-[#e10600]"></div>
                        <div className="absolute -top-20 -right-20 w-48 h-48 bg-[#e10600]/20 rounded-full pointer-events-none group-hover:bg-[#e10600]/30 transition-all duration-500"></div>
                        <div className="absolute top-5 left-5 flex flex-col items-center z-20 drop-shadow-md">
                          <span className="text-[42px] font-black italic text-white leading-none tracking-tighter">{pilotProfileStats.rating}</span>
                          <span className="text-[10px] font-bold text-white/70 uppercase tracking-widest mt-1">OVR</span>
                          <div className="w-8 h-[2px] bg-white/20 my-2.5"></div>
                          <div className="text-[11px] font-black text-white/50 uppercase tracking-widest" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>{pilotProfileStats.escuderiaName ? pilotProfileStats.escuderiaName.substring(0, 16) : 'EQ'}</div>
                        </div>
                        <div className="absolute bottom-28 left-1/2 -translate-x-1/2 w-[220px] h-[220px] z-10 flex items-end justify-center transition-transform duration-500 group-hover:scale-105">
                          {pilotProfileStats.fotoUrl ? (
                            <img src={pilotProfileStats.fotoUrl} alt={pilotProfileStats.name} className="max-w-full max-h-full object-contain drop-shadow-[0_10px_20px_rgba(0,0,0,0.8)]" />
                          ) : (
                            <div className="w-32 h-32 rounded-full bg-[#1a1a1a] border border-white/5 flex items-center justify-center font-black text-5xl text-white/10 mb-6 drop-">{pilotProfileStats.name ? pilotProfileStats.name.substring(0, 2).toUpperCase() : '??'}</div>
                          )}
                        </div>
                        <div className="absolute bottom-0 w-full bg-gradient-to-t from-black to-transparentpt-16 pb-6 px-6 z-20">
                          <h3 className="text-2xl font-black italic text-white uppercase tracking-tighter text-center whitespace-nowrap overflow-hidden text-ellipsis drop-shadow-md">{pilotProfileStats.name}</h3>
                          <div className="w-full h-[1px] bg-white/10my-3.5"></div>
                          <div className="grid grid-cols-3 gap-x-4 gap-y-3 px-1">
                            <div className="flex flex-col items-center"><span className="text-[9px] font-bold text-white/40 uppercase tracking-wider mb-0.5">PTS</span><span className="text-base leading-none font-black text-white">{pilotProfileStats.totalPoints}</span></div>
                            <div className="flex flex-col items-center"><span className="text-[9px] font-bold text-white/40 uppercase tracking-wider mb-0.5">WIN</span><span className="text-base leading-none font-black text-white">{pilotProfileStats.victorias}</span></div>
                            <div className="flex flex-col items-center"><span className="text-[9px] font-bold text-white/40 uppercase tracking-wider mb-0.5">POD</span><span className="text-base leading-none font-black text-white">{pilotProfileStats.podiums}</span></div>
                            <div className="flex flex-col items-center"><span className="text-[9px] font-bold text-white/40 uppercase tracking-wider mb-0.5">POL</span><span className="text-base leading-none font-black text-white">{pilotProfileStats.poles}</span></div>
                            <div className="flex flex-col items-center"><span className="text-[9px] font-bold text-white/40 uppercase tracking-wider mb-0.5">VR</span><span className="text-base leading-none font-black text-white">{pilotProfileStats.fastestLaps}</span></div>
                            <div className="flex flex-col items-center"><span className="text-[9px] font-bold text-white/40 uppercase tracking-wider mb-0.5">DNF</span><span className="text-base leading-none font-black text-red-400">{pilotProfileStats.dnfs}</span></div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex-1 flex flex-col gap-4">
                        <div className="bg-white/[0.02]border border-white/5 p-6  flex flex-col sm:flex-row items-center justify-between gap-6">
                          <div className="w-full sm:flex-1">
                            <div className="flex justify-between items-end mb-2">
                              <span className="text-[10px] text-white/40 font-mono uppercase tracking-wider">Desarrollo de Rating</span>
                              <span className="text-xs font-black text-white font-mono">{pilotProfileStats.rating.toFixed(0)} / 99</span>
                            </div>
                            <div className="w-full bg-white/5 h-2 overflow-hidden bg-white/[0.04]">
                              <div className="bg-[#e10600]h-full rounded-full transition-all duration-1000" style={{ width: `${Math.min(99, pilotProfileStats.rating)}%` }}></div>
                            </div>
                          </div>
                          <div className="w-full sm:w-auto text-left sm:text-right border-t sm:border-t-0 sm:border-l border-white/5 pt-4 sm:pt-0 sm:pl-6 shrink-0">
                            <span className="text-[10px] text-white/40 font-mono uppercase tracking-wider block mb-1">Cláusula de Mercado</span>
                            <div className="flex items-baseline gap-1 sm:justify-end">
                              <span className="text-3xl font-black font-mono text-emerald-400">{pilotProfileStats.clause.toFixed(1)}</span>
                              <span className="text-sm font-bold text-emerald-500 font-mono">M</span>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 flex-1">
                          <div className="bg-white/5 border border-white/5 p-4 rounded-sm flex flex-col justify-between"><span className="text-[10px] text-white/40 uppercase font-mono tracking-wider">Media Puntos</span><span className="text-2xl font-black text-white font-mono mt-1 tabular-nums">{pilotProfileStats.avgPoints}</span></div>
                          <div className="bg-white/5 border border-white/5 p-4 rounded-sm flex flex-col justify-between"><span className="text-[10px] text-white/40 uppercase font-mono tracking-wider">Media Qualy</span><span className="text-2xl font-black text-white font-mono mt-1 tabular-nums">P{pilotProfileStats.avgQualy}</span></div>
                          <div className="bg-white/5 border border-white/5 p-4 rounded-sm flex flex-col justify-between"><span className="text-[10px] text-white/40 uppercase font-mono tracking-wider">Media Carrera</span><span className="text-2xl font-black text-white font-mono mt-1 tabular-nums">P{pilotProfileStats.avgRace}</span></div>
                          <div className="bg-white/5 border border-white/5 p-4 rounded-sm flex flex-col justify-between"><span className="text-[10px] text-white/40 uppercase font-mono tracking-wider">Carreras Limpias</span><span className="text-2xl font-black text-teal-400 font-mono mt-1 tabular-nums">{pilotProfileStats.cleanRaces}</span></div>
                          <div className="bg-white/5 border border-white/5 p-4 rounded-sm flex flex-col justify-between"><span className="text-[10px] text-white/40 uppercase font-mono tracking-wider">Piloto del Día</span><span className="text-2xl font-black text-amber-400 font-mono mt-1 tabular-nums">{pilotProfileStats.dotds}</span></div>
                          <div className="bg-white/5 border border-white/5 p-4 rounded-sm flex flex-col justify-between"><span className="text-[10px] text-white/40 uppercase font-mono tracking-wider">GPs Disputados</span><span className="text-2xl font-black text-white font-mono mt-1 tabular-nums">{pilotProfileStats.participaciones}</span></div>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-widest text-[#e10600] font-mono mb-3 block">HISTORIAL CRONOLÓGICO DE CARRERAS</h4>
                      {pilotProfileStats.history && pilotProfileStats.history.length > 0 ? (
                        <div className="bg-[#111] border border-white/5 rounded-sm overflow-hidden overflow-x-auto">
                          <table className="w-full text-xs font-mono text-left text-gray-300">
                            <thead>
                              <tr className="bg-white/[0.03] text-white/30 uppercase text-[9px] tracking-wider border-b border-white/5">
                                <th className="p-3">Split</th><th className="p-3">Gran Premio / Circuito</th><th className="p-3 text-center">Pos. Qualy</th><th className="p-3 text-center">Pos. Carrera</th><th className="p-3 text-center">Puntos GP</th><th className="p-3 text-center">Detalles</th>
                              </tr>
                            </thead>
                            <tbody>
                              {pilotProfileStats.history.map((h: any, idx: number) => (
                                <tr key={`gp-hist-${h.splitId}-${h.circuitId}-${idx}`} className="border-b border-white/5 hover:bg-white/5 last:border-0 transition-colors">
                                  <td className="p-3 text-[#e10600] font-bold">{h.splitName}</td>
                                  <td className="p-3 text-white font-bold">{h.circuitName}</td>
                                  <td className="p-3 text-center">{h.qualyPos ? `P${h.qualyPos}` : "N/D"}</td>
                                  <td className={`p-3 text-center font-bold ${h.racePos === 1 ? 'text-amber-400' : h.racePos <= 3 ? 'text-yellow-500' : h.isDnfOwnError ? 'text-red-500' : 'text-white'}`}>
                                    {h.isDofOwnError || h.isDnfOwnError ? "DNF 💥" : `P${h.racePos}`}
                                  </td>
                                  <td className="p-3 text-center text-white font-bold text-sm bg-white/[0.02]tabular-nums">{h.points} pts</td>
                                  <td className="p-3">
                                    <div className="flex gap-1.5 justify-center items-center">
                                      {h.isClean && <span className="bg-teal-500/10 text-teal-400 px-1.5 py-0.5 rounded text-[8px] font-bold" title="Limpio de incidentes">Limpio</span>}
                                      {h.fastestLap && <span className="bg-purple-500/10 text-purple-400 px-1.5 py-0.5 rounded text-[8px] font-bold" title="Vuelta rápida">⚡ VR</span>}
                                      {h.isDotd && <span className="bg-amber-500/15 text-amber-400 px-1.5 py-0.5 rounded text-[8px] font-bold" title="Piloto del Día">DotD</span>}
                                      {h.isMvp && <span className="bg-sky-500/10 text-sky-400 px-1.5 py-0.5 rounded text-[8px] font-bold" title="MVP">MVP</span>}
                                      {!h.isClean && !h.fastestLap && !h.isDotd && !h.isMvp && <span className="text-white/20 italic">-</span>}
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="bg-[#111] border border-white/5 rounded-sm p-8 text-center text-white/30 italic text-xs">
                          Sin registros de carreras completadas en las bases de datos de este split.
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="bg-[#111] border border-white/5  p-16 text-center text-white/30 italic">
                    Selecciona un piloto para explorar su telemetría e historial de rendimiento.
                  </div>
                )}
              </div>
            )}

            {activeProfileTab === "compare" && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-11 items-center gap-4 bg-white/[0.02] border border-white/5 p-5 ">
                  <div className="md:col-span-5 flex flex-col">
                    <label className="text-[10px] text-amber-300 font-mono tracking-wider mb-1 uppercase font-bold">Piloto A (Derecha / Izquierda)</label>
                    <select value={comparePilotIdA} onChange={(e) => setComparePilotIdA(e.target.value)} className="bg-[#111] border border-white/10 rounded-sm text-xs px-3 py-2 text-white font-bold focus:border-amber-500 hover:border-white/20 transition-all cursor-pointer">
                      <option value="" disabled>-- Elige el primer piloto --</option>
                      {allPaddockPilots.map((p) => (<option key={p.id} value={p.id} disabled={p.id === comparePilotIdB}>{p.name} ({p.team})</option>))}
                    </select>
                  </div>
                  <div className="md:col-span-1 text-center font-black italic text-[#e10600] font-mono text-sm py-2">VS</div>
                  <div className="md:col-span-5 flex flex-col">
                    <label className="text-[10px] text-red-400 font-mono tracking-wider mb-1 uppercase font-bold">Piloto B (Contendiente)</label>
                    <select value={comparePilotIdB} onChange={(e) => setComparePilotIdB(e.target.value)} className="bg-[#111] border border-white/10 rounded-sm text-xs px-3 py-2 text-white font-bold focus:border-red-500 hover:border-white/20 transition-all cursor-pointer">
                      <option value="" disabled>-- Elige el segundo piloto --</option>
                      {allPaddockPilots.map((p) => (<option key={p.id} value={p.id} disabled={p.id === comparePilotIdA}>{p.name} ({p.team})</option>))}
                    </select>
                  </div>
                </div>

                {statsA && statsB ? (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-white/[0.02]border border-amber-500/20  p-4 flex items-center gap-4">
                        {statsA.fotoUrl ? (
                          <img src={statsA.fotoUrl} alt={statsA.name} className="w-16 h-16 rounded-sm object-cover border border-amber-500/40" />
                        ) : (
                          <div className="w-16 h-16 rounded-sm bg-[#111] border border-white/5 flex items-center justify-center font-bold text-lg text-white/30 uppercase">{statsA.name ? statsA.name.substring(0, 2).toUpperCase() : '??'}</div>
                        )}
                        <div className="flex-1 min-w-0">
                          <span className="text-[9px] bg-amber-500/10 text-amber-400 font-bold px-1.5 py-0.5 rounded uppercase font-mono">{statsA.escuderiaName}</span>
                          <h4 className="font-extrabold text-[#e10600] text-lg uppercase truncate mt-0.5">{statsA.name}</h4>
                          <p className="text-[10px] text-white/40 font-mono uppercase mt-0.5 font-bold">Rating: <span className="text-white">{statsA.rating.toFixed(0)}</span> | Cláusula: <span className="text-white">{statsA.clause.toFixed(1)}M</span></p>
                        </div>
                      </div>
                      <div className="bg-white/[0.02]border border-red-500/20  p-4 flex items-center gap-4">
                        {statsB.fotoUrl ? (
                          <img src={statsB.fotoUrl} alt={statsB.name} className="w-16 h-16 rounded-sm object-cover border border-red-500/40" />
                        ) : (
                          <div className="w-16 h-16 rounded-sm bg-[#111] border border-white/5 flex items-center justify-center font-bold text-lg text-white/30 uppercase">{statsB.name ? statsB.name.substring(0, 2).toUpperCase() : '??'}</div>
                        )}
                        <div className="flex-1 min-w-0">
                          <span className="text-[9px] bg-red-500/10 text-red-400 font-bold px-1.5 py-0.5 rounded uppercase font-mono">{statsB.escuderiaName}</span>
                          <h4 className="font-extrabold text-[#e10600] text-lg uppercase truncate mt-0.5">{statsB.name}</h4>
                          <p className="text-[10px] text-white/40 font-mono uppercase mt-0.5 font-bold">Rating: <span className="text-white">{statsB.rating.toFixed(0)}</span> | Cláusula: <span className="text-white">{statsB.clause.toFixed(1)}M</span></p>
                        </div>
                      </div>
                    </div>

                    {(() => {
                      let commonRaces = 0, aheadA = 0, aheadB = 0, qualyA = 0, qualyB = 0;
                      statsA.history.forEach((hA: any) => {
                        const matchB = statsB.history.find((hB: any) => hB.splitId === hA.splitId && hB.circuitId === hA.circuitId);
                        if (matchB) {
                          commonRaces++;
                          if (hA.qualyPos < matchB.qualyPos) qualyA++;
                          else if (matchB.qualyPos < hA.qualyPos) qualyB++;
                          if (hA.isDnfOwnError && !matchB.isDnfOwnError) aheadB++;
                          else if (!hA.isDnfOwnError && matchB.isDnfOwnError) aheadA++;
                          else {
                            if (hA.racePos < matchB.racePos) aheadA++;
                            else if (matchB.racePos < hA.racePos) aheadB++;
                          }
                        }
                      });

                      if (commonRaces > 0) {
                        return (
                          <div className="bg-white/[0.03] border border-white/5  p-5 text-center">
                            <span className="text-[9px] font-black tracking-[0.25em] text-[#e10600] uppercase font-mono block">MÉTRICAS CARA A CARA EN COEXISTENCIA</span>
                            <h4 className="text-sm font-bold text-white uppercase italic tracking-tight mt-1 mb-4">Se han disputado la pista en <span className="text-amber-400 font-mono">{commonRaces} GPs</span> directos</h4>
                            <div className="space-y-4 max-w-xl mx-auto">
                              <div>
                                <div className="flex justify-between text-xs font-mono mb-1.5">
                                  <span className="font-extrabold text-amber-400">{statsA.name}: {aheadA} veces</span><span className="text-white/40">Acabó por delante</span><span className="font-extrabold text-red-500">{aheadB} veces: {statsB.name}</span>
                                </div>
                                <div className="w-full bg-white/5 rounded-full h-3 overflow-hidden flex font-mono font-bold text-[9px] text-black">
                                  <div className="bg-amber-400 h-full flex items-center justify-center transition-all" style={{ width: `${(aheadA / commonRaces) * 100}%` }}>{aheadA > 0 && `${((aheadA / commonRaces) * 100).toFixed(0)}%`}</div>
                                  <div className="bg-[#e10600] h-full flex items-center justify-center transition-all" style={{ width: `${(aheadB / commonRaces) * 100}%` }}>{aheadB > 0 && `${((aheadB / commonRaces) * 100).toFixed(0)}%`}</div>
                                </div>
                              </div>
                              <div>
                                <div className="flex justify-between text-xs font-mono mb-1.5">
                                  <span className="font-extrabold text-amber-400">{qualyA} veces</span><span className="text-white/40 font-sans">Mejor Posición de Clasificación</span><span className="font-extrabold text-red-500">{qualyB} veces</span>
                                </div>
                                <div className="w-full bg-white/5 rounded-full h-3 overflow-hidden flex font-mono font-bold text-[9px] text-black">
                                  <div className="bg-amber-400 h-full flex items-center justify-center transition-all" style={{ width: `${((qualyA) / ((qualyA + qualyB) || 1)) * 100}%` }}>{qualyA > 0 && `${((qualyA / ((qualyA + qualyB) || 1)) * 100).toFixed(0)}%`}</div>
                                  <div className="bg-[#e10600] h-full flex items-center justify-center transition-all" style={{ width: `${((qualyB) / ((qualyA + qualyB) || 1)) * 100}%` }}>{qualyB > 0 && `${((qualyB / ((qualyA + qualyB) || 1)) * 100).toFixed(0)}%`}</div>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      } else {
                        return <div className="bg-[#111] border border-white/5  p-4 text-center text-xs text-white/40 italic font-mono">No constan GPs cerrados disputados de forma simultánea en la temporada de este split.</div>;
                      }
                    })()}

                    <div className="bg-[#111] border border-white/5  p-4 space-y-4">
                      <span className="text-[10px] font-black tracking-widest text-[#e10600] font-mono mb-2 block">ANÁLISIS COMPARATIVO DE TELEMETRÍA MUNDIAL</span>
                      {[
                        { label: "VALORACIÓN GENERAL (RATING)", valA: statsA.rating, valB: statsB.rating, format: (v: number) => v.toFixed(0), higherIsBetter: true },
                        { label: "PUNTOS GLOBALES SUMADOS", valA: statsA.totalPoints, valB: statsB.totalPoints, format: (v: number) => `${v} pts`, higherIsBetter: true },
                        { label: "MEDIA DE PUNTOS POR GP", valA: statsA.avgPoints, valB: statsB.avgPoints, format: (v: number) => `${v.toFixed(1)} pts`, higherIsBetter: true },
                        { label: "VICTORIAS EN CARRERA", valA: statsA.victorias, valB: statsB.victorias, format: (v: number) => `${v} 🏆`, higherIsBetter: true },
                        { label: "PODIOS OBTENIDOS", valA: statsA.podiums, valB: statsB.podiums, format: (v: number) => `${v}`, higherIsBetter: true },
                        { label: "POLE POSITIONS GRABADAS", valA: statsA.poles, valB: statsB.poles, format: (v: number) => `${v}`, higherIsBetter: true },
                        { label: "MEDIA DE CLASIFICACIÓN (QUALY)", valA: statsA.avgQualy, valB: statsB.avgQualy, format: (v: number) => v > 0 ? `P${v}` : "N/D", higherIsBetter: false },
                        { label: "MEDIA DE INTEGRACIÓN EN CARRERA", valA: statsA.avgRace, valB: statsB.avgRace, format: (v: number) => v > 0 ? `P${v}` : "N/D", higherIsBetter: false },
                        { label: "CARRERAS LIMPIAS (SIN INCIDENTES)", valA: statsA.cleanRaces, valB: statsB.cleanRaces, format: (v: number) => `${v}`, higherIsBetter: true },
                        { label: "VUELTAS RÁPIDAS (FASTEST LAPS)", valA: statsA.fastestLaps, valB: statsB.fastestLaps, format: (v: number) => `${v}`, higherIsBetter: true },
                        { label: "INCIDENTES / ABANDONOS (DNF)", valA: statsA.dnfs, valB: statsB.dnfs, format: (v: number) => `${v} 💥`, higherIsBetter: false }
                      ].map((metric, mIdx) => {
                        const isABetter = metric.higherIsBetter ? metric.valA > metric.valB : metric.valA < metric.valB && metric.valA > 0;
                        const isBBetter = metric.higherIsBetter ? metric.valB > metric.valA : metric.valB < metric.valA && metric.valB > 0;
                        return (
                          <div key={`comp-metric-${mIdx}`} className="border-b border-white/5 last:border-0 pb-3 last:pb-0">
                            <div className="flex justify-between items-center text-xs font-semibold uppercase font-mono tracking-tight text-white/40 mb-1">
                              <span className={isABetter ? "text-amber-400 font-extrabold" : "text-white/60"}>{metric.format(metric.valA)}</span>
                              <span className="text-[10px] text-center">{metric.label}</span>
                              <span className={isBBetter ? "text-red-400 font-extrabold" : "text-white/60"}>{metric.format(metric.valB)}</span>
                            </div>
                            <div className="grid grid-cols-2 gap-1 bg-white/[0.02]p-0.5 rounded-sm">
                              <div className="flex justify-end bg-white/[0.01] rounded-l h-2 overflow-hidden relative">
                                <div className={`h-full rounded-l transition-all duration-500 bg-amber-400`} style={{ width: `${metric.higherIsBetter ? (metric.valA || 0) + (metric.valB || 0) > 0 ? (metric.valA / (metric.valA + metric.valB || 1)) * 100 : 0 : (metric.valA || 0) + (metric.valB || 0) > 0 ? (1 - (metric.valA / (metric.valA + metric.valB || 1))) * 100 : 0}%` }}></div>
                              </div>
                              <div className="flex justify-start bg-white/[0.01] rounded-r h-2 overflow-hidden relative">
                                <div className={`h-full rounded-r transition-all duration-500 bg-[#e10600]`} style={{ width: `${metric.higherIsBetter ? (metric.valA || 0) + (metric.valB || 0) > 0 ? (metric.valB / (metric.valA + metric.valB || 1)) * 100 : 0 : (metric.valA || 0) + (metric.valB || 0) > 0 ? (1 - (metric.valB / (metric.valA + metric.valB || 1))) * 100 : 0}%` }}></div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="bg-[#111] border border-white/5  p-16 text-center text-white/30 italic">Configura ambos pilotos rivales de la lista del paddock arriba para iniciar la simulación analítica de rivalidad.</div>
                )}
              </div>
            )}

            <div className="border-t border-white/5 pt-4 mt-6 flex justify-end">
              <button onClick={() => { setIsCompareViewOpen(false); setSelectedPilotForProfileId(null); }} className="px-5 py-2.5 bg-white/5 hover:bg-white/10 text-white rounded-sm text-xs uppercase tracking-wider font-extrabold border border-white/5 cursor-pointer active:scale-95 transition-all">Cerrar Telemetría</button>
            </div>
          </div>
        </div>
      )}

      {isF1TVOpen && (
        <div className="fixed inset-0 bg-[#0a0a0a]/95z-[60] overflow-y-auto p-4 md:p-6 text-left">
          <div className="max-w-7xl mx-auto bg-[#0a0a0a] border border-[#e10600]/30  shadow-[0_0_50px_rgba(225,6,0,0.15)] p-4 md:p-6 relative my-4 overflow-hidden">
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#e10600]/10 rounded-full pointer-events-none" />
            <div className="flex justify-between items-center border-b border-[#e10600]/20 pb-4 mb-6 relative z-10">
              <div className="flex items-center gap-4">
                <div className="bg-[#e10600] text-white font-black italic tracking-tighter text-3xl px-3 py-1 rounded-sm">F1 TV</div>
                <div>
                  <span className="text-[10px] font-black tracking-[0.2em] text-[#e10600] uppercase font-mono block animate-pulse">🔴 EN DIRECTO</span>
                  <h2 className="text-xl font-bold uppercase tracking-tight text-white mt-0.5">On-Boards & Transmisiones</h2>
                </div>
              </div>
              <button onClick={() => setIsF1TVOpen(false)} className="p-2 bg-white/5 hover:bg-white/10 text-white rounded-sm transition-all border border-white/10"><X className="w-6 h-6" /></button>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 relative z-10">
              <div className="bg-white/[0.02]border border-white/10  overflow-hidden flex flex-col group ">
                <div className="bg-[#111] border-b border-white/5 px-4 py-3 flex justify-between items-center">
                  <div className="flex items-center gap-3"><div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" /><span className="font-bold text-white uppercase tracking-tight">Cámara: Piloto Toni</span></div>
                  <span className="text-[10px] font-mono text-white/40 uppercase bg-white/[0.02]px-2 py-1 rounded">@tonicotitular</span>
                </div>
                <div className="aspect-video w-full bg-black relative"><iframe src={`https://player.twitch.tv/?channel=tonicotitular&parent=${window.location.hostname || 'localhost'}`} height="100%" width="100%" allowFullScreen className="absolute inset-0" /></div>
              </div>
              <div className="bg-white/[0.02]border border-white/10  overflow-hidden flex flex-col group ">
                <div className="bg-[#111] border-b border-white/5 px-4 py-3 flex justify-between items-center">
                  <div className="flex items-center gap-3"><div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" /><span className="font-bold text-white uppercase tracking-tight">Cámara: Piloto Fabi</span></div>
                  <span className="text-[10px] font-mono text-white/40 uppercase bg-white/[0.02]px-2 py-1 rounded">@fabiml_204</span>
                </div>
                <div className="aspect-video w-full bg-black relative"><iframe src={`https://player.twitch.tv/?channel=fabiml_204&parent=${window.location.hostname || 'localhost'}`} height="100%" width="100%" allowFullScreen className="absolute inset-0" /></div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

