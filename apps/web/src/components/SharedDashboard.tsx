import React, { useState, useMemo, useEffect, useRef } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../services/firebase";
import { compressAndConvertImage } from "../utils/imageHelper";
import { useUsuarios, useSplits } from "../hooks/useData";
import { useAuth } from "../contexts/AuthContext";
import { ShieldAlert, Award, Sparkles, UploadCloud, Camera, X, TrendingUp, MonitorPlay, Crown } from "lucide-react";
import { isSplitUnlocked } from "../utils/splitResolver";
import { pointsForRaceResult } from "../utils/economyRules";
import { PilotRivalryPanel } from "./RivalryPanels";
import { NextRaceWidget } from "./NextRaceWidget";
import { PilotCardF1 } from "./PilotCardF1";
import { TotalStandings } from "./TotalStandings";
import { useSingleFlight } from "../hooks/useSingleFlight";

export function SharedDashboardView({ canViewBudget, escuderiaId, onOpenTv }: { canViewBudget: boolean, escuderiaId?: string, onOpenTv?: () => void }) {
  const { userData } = useAuth();
  const { usuarios } = useUsuarios();
  const { splits: rawSplits, loading: loadingSplits } = useSplits();
  const splits = rawSplits;
  const [activeSplitId, setActiveSplitId] = useState<string>("global");
  const [selectedPilotForProfileId, setSelectedPilotForProfileId] = useState<string | null>(null);
  const [comparePilotIdA, setComparePilotIdA] = useState<string>("");
  const [comparePilotIdB, setComparePilotIdB] = useState<string>("");
  const [isCompareViewOpen, setIsCompareViewOpen] = useState(false);
  const [activeProfileTab, setActiveProfileTab] = useState<"profile" | "compare">("profile");
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
  const [logoError, setLogoError] = useState("");

  const getPilotPhoto = (pilotId: string) => {
    const matched = usuarios.find((u: any) => u.uid === pilotId || u.piloto_id === pilotId);
    if (matched?.foto_url) return matched.foto_url;
    for (const s of splits || []) {
      const p = (s.roster || []).find((r: any) => r.pilotoId === pilotId);
      if (p?.foto_url) return p.foto_url;
    }
    return "";
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

  const { run: runOnce } = useSingleFlight();
  const handleUpdateTeamLogo = async (file: File) => {
    return runOnce(async () => {
    if (!activeSplitId || !escuderiaId || !miEscuderia) return;
    setLogoError("");
    setUpdatingLogo(true);
    try {
      const compressed = await compressAndConvertImage(file, 256, 256, 0.75);
      
      const teamRef = doc(db, `splits/${activeSplitId}/equipos`, escuderiaId);
      await updateDoc(teamRef, { logo_url: compressed });
    } catch (err: any) {
      console.error("Error updating team logo:", err);
      setLogoError(`No se ha podido actualizar el logo: ${err.message}`);
    } finally {
      setUpdatingLogo(false);
    }
    });
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

  const currentSplit = useMemo(
    () => activeSplitId === "global" ? null : splits.find(split => split.id === activeSplitId) || null,
    [activeSplitId, splits]
  );

  const currentUserPilotId = useMemo(() => {
    if (!userData) return null;
    const candidateIds = [userData.piloto_id, userData.uid].filter((id): id is string => Boolean(id));
    const participant = splits.flatMap(split => split.roster || [])
      .find(entry => candidateIds.includes(entry.pilotoId));
    return participant?.pilotoId || userData.piloto_id || null;
  }, [splits, userData]);

  const miEscuderia = useMemo(() => {
    if (!currentSplit || currentSplit.tipo === "individual") return null;
    let teamId: string | null = null;

    if (currentUserPilotId) {
      const rosterEntry = currentSplit.roster.find((p: any) => p.pilotoId === currentUserPilotId && p.participa_hasta == null);
      teamId = rosterEntry?.equipoId || null;
    }

    if (!teamId && escuderiaId) {
      teamId = escuderiaId;
    }

    if (!teamId) return null;

    const equipo = (currentSplit.equipos || []).find((e: any) => e.id === teamId);
    if (!equipo) return null;

    const pilotosDelEquipo = currentSplit.roster.filter((p: any) => p.equipoId === teamId && p.participa_hasta == null);
    const pilotsVal = pilotosDelEquipo.reduce((sum: number, p: any) => sum + (p.clausula_actual || (p.rating_piloto ?? 0) * 0.5), 0);

    return {
      ...equipo,
      valor_total: equipo.presupuesto == null ? null : equipo.presupuesto + pilotsVal,
    };
  }, [currentSplit, currentUserPilotId, escuderiaId]);

  const misPilotos = useMemo(() => {
    if (!currentSplit || !miEscuderia) return [];
    return currentSplit.roster.filter((p: any) => p.equipoId === miEscuderia.id && p.participa_hasta == null);
  }, [currentSplit, miEscuderia]);

  // Sólo es "agente libre" quien corre este Split sin escudería. Un admin o un usuario
  // de a pie no está en la parrilla, así que no debe ver el aviso de SIN EQUIPO.
  const soyAgenteLibre = useMemo(() => {
    if (!currentSplit || currentSplit.tipo === "individual" || !currentUserPilotId) return false;
    if (userData?.rol !== "piloto" && userData?.rol !== "jeque") return false;
    const rosterEntry = currentSplit.roster?.find(
      (p: any) => p.pilotoId === currentUserPilotId && p.participa_hasta == null
    );
    return !!rosterEntry && !rosterEntry.equipoId;
  }, [currentSplit, currentUserPilotId, userData?.rol]);



  const { standings, teamStandings, raceResults, championshipsTimeline } = useMemo(() => {
    if (activeSplitId === "global") {
      const pilotTitles: Record<string, { id: string; name: string; count: number; escuderia: string }> = {};
      const teamTitles: Record<string, { id: string; nombre: string; count: number }> = {};

      splits.filter(s => s.tipo !== "individual").forEach(s => {
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

      const timeline = splits.filter(s => s.tipo !== "individual").map(s => {
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

    const ts = (currentSplit.tipo === "individual" ? currentSplit.duos || [] : currentSplit.equipos)
      .map(e => ({ id: e.id, nombre: e.nombre, puntos: "puntos" in e ? e.puntos : e.puntos_constructores || 0 }))
      .sort((a, b) => b.puntos - a.puntos);

    const rRes: any[] = [];
    currentSplit.circuitos.filter((c: any) => c.completado && c.resultados).forEach((c: any) => {
      rRes.push({
        circuitName: c.nombre,
         pilots: c.resultados.map((r: any) => ({
           id: r.pilotoId,
           name: r.pilotoNombre || currentSplit.roster.find((p: any) => p.pilotoId === r.pilotoId)?.nombre || r.pilotoId,
           racePos: r.racePos,
           pole: r.qualyPos === 1,
           pts: pointsForRaceResult(r, currentSplit.economia_config),
          team: currentSplit.tipo === "individual" ? "Individual" : equipoNombreMap[r.equipoId ?? r.escuderiaId] || "",
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
    const splitsToSearch = isGlobalView ? splits : splits.filter(s => s.id === activeSplitId);

    splitsToSearch.forEach((s: any) => {
      const equipoNombreMap = Object.fromEntries((s.equipos || []).map((e: any) => [e.id, e.nombre]));
      const rosterEntry = (s.roster || []).find((p: any) => p.pilotoId === pilotId);

      s.circuitos?.filter((c: any) => c.completado && c.resultados).forEach((c: any) => {
        const res = c.resultados.find((r: any) => r.pilotoId === pilotId);
        if (res) {
          const isIndividual = s.tipo === "individual";
           const points = pointsForRaceResult(res, s.economia_config);
          totalPoints += points;
          if (!isIndividual) {
            if (res.racePos === 1) victories++;
            if (res.racePos >= 1 && res.racePos <= 3) podiums++;
            if (res.qualyPos === 1) poles++;
            if (res.isDnf === true) dnfs++;
            if (res.isClean) cleanRaces++;
            if (res.isDotd) dotds++;
            if (res.isMvp) mvps++;
            if (res.fastestLap) fastestLaps++;
          }

          const teamName = isIndividual
            ? "Individual"
            : equipoNombreMap[res.equipoId ?? res.escuderiaId ?? rosterEntry?.equipoId] ?? "N/A";

          history.push({ splitId: s.id, splitName: s.nombre, splitTipo: s.tipo, circuitId: c.id, circuitName: c.nombre, qualyPos: res.qualyPos, racePos: res.racePos, isDnf: res.isDnf, isClean: res.isClean, overtakesBoost: res.overtakesBoost, isDotd: res.isDotd, isMvp: res.isMvp, fastestLap: res.fastestLap, points, teamName });
        }
      });
    });

    const participaciones = history.length;
    const avgPoints = participaciones > 0 ? Number((totalPoints / participaciones).toFixed(1)) : 0;
    const validQualyPos = history.filter(h => h.qualyPos >= 1 && h.qualyPos <= 20).map(h => h.qualyPos);
    const avgQualy = validQualyPos.length > 0 ? Number((validQualyPos.reduce((a, b) => a + b, 0) / validQualyPos.length).toFixed(1)) : 0;
    const validRacePos = history.filter(h => h.racePos >= 1 && h.racePos <= 12).map(h => h.racePos);
    const avgRace = validRacePos.length > 0 ? Number((validRacePos.reduce((a, b) => a + b, 0) / validRacePos.length).toFixed(1)) : 0;

    let finalRating = 0, baseClause = 10, escuderiaName = "Sin equipo", isCongelado = false;

    if (isGlobalView) {
      const latestSplit = [...splits].reverse().find(s => (s.roster || []).some((p: any) => p.pilotoId === pilotId));
      if (latestSplit) {
        const entry = latestSplit.roster.find((p: any) => p.pilotoId === pilotId);
        if (entry) {
          const eMap = Object.fromEntries(latestSplit.equipos.map(e => [e.id, e.nombre]));
          escuderiaName = eMap[entry.equipoId] ?? entry.equipoId;
           finalRating = Number(entry.rating_piloto ?? 0);
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
           finalRating = Number(entry.rating_piloto ?? 0);
          baseClause = entry.clausula_actual ?? (finalRating * 0.5);
          isCongelado = !!entry.congelado;
        } else {
          // Sin ficha en este split: se cae al rating del usuario.
          finalRating = Number(pilotUser?.rating_piloto ?? 0);
        }
      }
    }

    return { pilotId, name: pilotName, fotoUrl: getPilotPhoto(pilotId), rating: finalRating, clause: baseClause, congelado: isCongelado, escuderiaName, totalPoints, victorias: victories, podiums, poles, dnfs, cleanRaces, dotds, mvps, fastestLaps, participaciones, avgPoints, avgQualy, avgRace, bestRace: validRacePos.length ? Math.min(...validRacePos) : 0, history: history.sort((a, b) => b.splitId.localeCompare(a.splitId) || a.circuitId.localeCompare(b.circuitId)) };
  };

  const pilotProfileStats = useMemo(() => {
    if (!selectedPilotForProfileId) return null;
    return getPilotStats(selectedPilotForProfileId, activeSplitId === "global");
  }, [selectedPilotForProfileId, splits, usuarios, activeSplitId]);
  const canOpenPilotProfile = activeSplitId !== "origins" && currentSplit?.tipo !== "individual";

  const allPaddockPilots = useMemo(() => {
    const list: { id: string; name: string; rtg: number; team: string }[] = [];
    const seen = new Set<string>();

    if (activeSplitId !== "global" && currentSplit) {
      currentSplit.roster.forEach((p: any) => {
        if (!seen.has(p.pilotoId)) {
          seen.add(p.pilotoId);
          const teamName = currentSplit.equipos.find((e: any) => e.id === p.equipoId)?.nombre ?? p.equipoId;
           list.push({ id: p.pilotoId, name: p.nombre, rtg: Number(p.rating_piloto) > 0 ? Number(p.rating_piloto) : 70, team: teamName });
        }
      });
    } else {
      splits.forEach(s => {
        s.roster.forEach((p: any) => {
          if (!seen.has(p.pilotoId)) {
            seen.add(p.pilotoId);
            const teamName = s.equipos.find((e: any) => e.id === p.equipoId)?.nombre ?? p.equipoId;
             list.push({ id: p.pilotoId, name: p.nombre, rtg: Number(p.rating_piloto) > 0 ? Number(p.rating_piloto) : 70, team: teamName });
          }
        });
      });

      usuarios.filter((u: any) => u.piloto_id).forEach((u: any) => {
        const pId = u.piloto_id;
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

  if (loadingSplits && splits.length === 0) {
    return (
      <div className="space-y-6" aria-label="Cargando campeonato">
        <div className="flex flex-wrap gap-2 border border-line p-2">
          {[1, 2, 3, 4].map(item => <div key={item} className="h-9 w-24 bg-surface-2 animate-pulse" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {[1, 2].map(item => (
            <div key={item} className="border border-line bg-surface-2 p-5 space-y-4">
              <div className="h-5 w-48 bg-surface-2 animate-pulse" />
              {[1, 2, 3, 4, 5].map(row => <div key={row} className="h-12 bg-surface-2 animate-pulse" />)}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-7 md:space-y-8">
      {/* Barra de temporada y accesos rápidos. En móvil las temporadas son un
          carrusel y las dos acciones ocupan una fila propia a ancho completo:
          apiladas y en mayúsculas de 10px eran casi imposibles de pulsar. */}
      <div className="space-y-3 md:flex md:flex-wrap md:items-center md:justify-between md:gap-y-3 md:space-y-0 w-full md:p-1.5 md:rounded-sm md:border md:border-line">
        <div className="m-rail hide-scrollbar gap-2">
          <button
            onClick={() => setActiveSplitId("global")}
            className={`min-h-11 rounded-full md:rounded-sm px-4 text-[12px] font-bold md:text-xs md:font-black md:uppercase md:tracking-widest transition-all ${
              activeSplitId === "global" ? "bg-brand text-brand-ink" : "bg-surface-2 text-ink-muted border border-line hover:border-line-strong"
            }`}
          >
            Mundial Global
          </button>
          {splits.filter(s => isSplitUnlocked(s.id, splits)).map(s => (
            <button
              key={s.id}
              onClick={() => setActiveSplitId(s.id)}
              className={`min-h-11 rounded-full md:rounded-sm px-4 text-[12px] font-bold md:text-xs md:font-black md:uppercase md:tracking-widest transition-all ${
                activeSplitId === s.id ? "bg-brand text-brand-ink" : "bg-surface-2 text-ink-muted border border-line hover:border-line-strong"
              }`}
            >
              {s.nombre}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-2 md:flex md:items-center">
          <button
            onClick={() => {
              setIsCompareViewOpen(true);
              setActiveProfileTab("compare");
              if (allPaddockPilots.length > 0) {
                const defaultA = currentUserPilotId && allPaddockPilots.some(p => p.id === currentUserPilotId) ? currentUserPilotId : (misPilotos[0]?.pilotoId || allPaddockPilots[0].id);
                setComparePilotIdA(defaultA);
                const otherPilots = allPaddockPilots.filter(p => p.id !== defaultA);
                if (otherPilots.length > 0) setComparePilotIdB(otherPilots[0].id);
                else if (allPaddockPilots.length > 1) setComparePilotIdB(allPaddockPilots[1].id);
                else setComparePilotIdB(allPaddockPilots[0].id);
              }
            }}
            className="flex min-h-12 items-center justify-center gap-2 rounded-xl md:rounded-sm border border-warn/45 px-3 text-[12px] font-bold text-warn transition-all hover:border-warn hover:text-ink active:scale-95 md:min-h-0 md:px-4 md:py-2 md:text-xs md:font-black md:uppercase md:tracking-wider"
          >
            <TrendingUp className="w-4 h-4 shrink-0 md:w-3.5 md:h-3.5" />
            <span className="truncate">Comparador</span>
          </button>
          {onOpenTv && (
            <button
              onClick={onOpenTv}
              className="flex min-h-12 items-center justify-center gap-2 rounded-xl md:rounded-sm border border-brand/50 px-3 text-[12px] font-bold text-danger transition-all hover:border-brand hover:text-ink active:scale-95 md:min-h-0 md:px-4 md:py-2 md:text-xs md:font-black md:uppercase md:tracking-wider"
            >
              <MonitorPlay className="w-4 h-4 shrink-0 md:w-3.5 md:h-3.5" />
              <span className="truncate">F1 Bugambra TV</span>
            </button>
          )}
        </div>
      </div>

      {activeSplitId !== "global" && currentSplit && currentSplit.circuitos?.some((c: any) => !c.completado) && (
        <div className="mb-8"><NextRaceWidget currentSplit={currentSplit} /></div>
      )}

      <div className="m-card bg-surface-2 border border-line p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Award className="w-8 h-8 text-warn shrink-0" />
          <div className="min-w-0">
            <span className="block text-[13px] font-black text-brand md:text-[11px] md:uppercase md:tracking-[0.08em]">Paddock Club · Hall of Fame</span>
            <span className="text-[12px] text-ink-muted md:text-xs md:uppercase md:font-mono">Campeones oficiales de F1 Bugambra</span>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-2.5 w-full lg:w-auto flex-wrap">
          {championshipsTimeline.filter(t => t.completed).map((t: any) => (
            <div key={t.splitId} className="flex flex-col sm:flex-row gap-2.5">
              {/* Cada palmarés es etiqueta arriba / campeón abajo en móvil: en una
                  sola línea el nombre se comprimía hasta ser ilegible. */}
              <div className="rounded-xl md:rounded-sm border border-line bg-surface-2 px-4 py-2.5 sm:flex sm:items-center sm:justify-start sm:gap-4">
                <span className="block text-[11px] text-warn/90 md:font-mono md:uppercase md:tracking-widest md:text-[11px]">🏆 {t.splitName} · Pilotos</span>
                <span className="mt-0.5 block text-[13px] font-extrabold uppercase tracking-tight text-ink sm:mt-0 md:text-xs">{t.winnerPilot} [{t.winnerPilotTeam}]</span>
              </div>
              <div className="rounded-xl md:rounded-sm border border-line bg-surface-2 px-4 py-2.5 sm:flex sm:items-center sm:justify-start sm:gap-4">
                <span className="block text-[11px] text-brand/90 md:font-mono md:uppercase md:tracking-widest md:text-[11px]">🏎️ {t.splitName} · Escuderías</span>
                <span className="mt-0.5 block text-[13px] font-extrabold uppercase tracking-tight text-ink sm:mt-0 md:text-xs">{t.winnerTeam}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {activeSplitId === "global" && (
        <TotalStandings splits={splits} getPilotPhoto={getPilotPhoto} />
      )}

      {activeSplitId !== "global" && currentSplit?.tipo !== "individual" && miEscuderia && (
        <section className="bg-surface-2 border border-line-strong  p-6 relative overflow-hidden">
          <div className="absolute -right-4 -top-4 w-32 h-32 bg-brand/10 rounded-full pointer-events-none"></div>
          {miEscuderia ? (
            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-5 w-full md:w-auto">
              {canViewBudget ? (
                <div
                  onDragEnter={handleLogoDrag} onDragOver={handleLogoDrag} onDragLeave={handleLogoDrag} onDrop={handleLogoDrop} onClick={() => teamLogoInputRef.current?.click()}
                  className={`relative w-20 h-20 rounded-sm overflow-hidden border-2 cursor-pointer transition-all shrink-0 flex items-center justify-center group ${logoDragActive ? "border-brand bg-brand/15" : "border-line hover:border-brand bg-surface-2"}`}
                >
                  <input type="file" ref={teamLogoInputRef} onChange={(e) => { if (e.target.files && e.target.files[0]) handleUpdateTeamLogo(e.target.files[0]); }} accept="image/*" className="hidden" />
                  {(miEscuderia as any).logo_url ? (
                    <img src={(miEscuderia as any).logo_url} alt={miEscuderia.nombre} referrerPolicy="no-referrer" className="w-full h-full object-cover group-hover:opacity-40 transition-opacity" />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-center p-2">
                      <UploadCloud className="w-6 h-6 text-ink-muted group-hover:text-ink-2 transition-colors" />
                      <span className="text-[11px] font-mono text-ink-muted uppercase tracking-tighter mt-1 group-hover:text-ink-muted">SUBIR LOGO</span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-surface-2 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-ink text-[11px] font-mono uppercase tracking-widest gap-1 select-none">
                    <Camera className="w-4 h-4 text-brand" /><span>EDITAR LOGO</span>
                  </div>
                  {updatingLogo && <div className="absolute inset-0 bg-bg flex items-center justify-center text-xs font-mono text-ink">Cargando...</div>}
                </div>
              ) : (
                <div className="w-20 h-20 rounded-sm overflow-hidden border border-line bg-surface-2 shrink-0 flex items-center justify-center">
                  {(miEscuderia as any).logo_url ? <img src={(miEscuderia as any).logo_url} alt={miEscuderia.nombre} referrerPolicy="no-referrer" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-xs font-black uppercase text-ink-muted font-mono">{miEscuderia.nombre ? miEscuderia.nombre.substring(0, 2).toUpperCase() : 'EQ'}</div>}
                </div>
              )}
              <div>
                <span className="text-[11px] font-mono uppercase tracking-[0.08em] text-brand font-black block mb-1">{canViewBudget ? "ESCUDERÍA OFICIAL DEL JEQUE" : "TU EQUIPO PARA ESTE SPLIT"}</span>
                <h3 className="text-2xl font-black italic text-ink uppercase tracking-tight">{miEscuderia.nombre}</h3>
                <p className="text-xs text-ink-muted uppercase font-mono mt-0.5">Visualizando logo oficial del {currentSplit?.nombre || activeSplitId}</p>
                {logoError && (
                  <p role="alert" className="mt-1.5 max-w-xs text-xs leading-relaxed text-brand">{logoError}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-8 w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 border-line pt-4 md:pt-0">
              {canViewBudget && (
                <div>
                  <h4 className="text-[11px] uppercase font-bold tracking-[0.08em] text-brand mb-1">Presupuesto Disponible</h4>
                  <div className="flex items-baseline gap-0.5">
                    <span className="text-4xl font-extrabold italic text-ink leading-none">{miEscuderia.presupuesto == null ? "—" : miEscuderia.presupuesto.toFixed(1)}</span><span className="text-xl font-bold text-ink-muted">M</span>
                  </div>
                </div>
              )}
              <div className="text-right">
                <p className="text-[11px] text-brand uppercase font-bold tracking-[0.08em] mb-1">Valor Total de Plantilla</p>
                <div className="flex items-baseline justify-end gap-0.5">
                  <span className="text-2xl font-black italic text-ink leading-none">{miEscuderia.valor_total.toFixed(1)}</span><span className="text-sm font-bold text-ink-muted">M</span>
                </div>
              </div>
            </div>
          </div>
          ) : null}
        </section>
      )}

      {activeSplitId !== "global" && currentSplit?.tipo !== "individual" && (miEscuderia || soyAgenteLibre) && (
        <section>
          <div className="flex justify-between items-center mb-4 border-b border-line pb-2">
            <h2 className="text-xl font-bold italic tracking-tight lowercase flex items-center gap-2"><span className="w-1 h-5 bg-brand" />mi equipo</h2>
            {currentSplit?.fichajes_abiertos && (
              <span className="bg-ok/20 border border-ok/30 text-ok font-bold font-mono text-xs uppercase px-2.5 py-1 rounded-full animate-pulse tracking-wide flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" /> VENTANA DE FICHAJES ABIERTA (MERCADO ACTIVO)
              </span>
            )}
          </div>
          
          {soyAgenteLibre && !miEscuderia ? (
            <div className="bg-warn/5 border border-warn/20  p-6 relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
              <div className="absolute right-0 top-0 w-32 h-32 bg-warn/5 rounded-full "></div>
              <div>
                <div className="flex items-center gap-2 text-warn font-black text-xs uppercase tracking-widest mb-2"><ShieldAlert className="w-4 h-4 animate-bounce" /> Agencia Libre / Estado Independiente</div>
                <h3 className="text-xl font-extrabold text-ink uppercase tracking-tight">Actualmente estás SIN EQUIPO en {currentSplit?.nombre || "este Split"}</h3>
                <p className="text-sm text-ink-muted mt-1 max-w-xl">Tu perfil está disponible en el mercado para este Split. Las escuderías con presupuesto te pueden incorporar mediante la sección de "Agentes Libres Bolsa", o el Administrador puede asignarte de forma manual a una escudería desde el Panel de Control.</p>
              </div>
              <div className="bg-warn/10 border border-warn/20 rounded-sm p-3 text-center w-full md:w-auto shrink-0">
                <span className="text-xs block text-warn font-mono tracking-wider uppercase font-extrabold mb-1">VALOR DE COMPRA</span>
                <span className="text-2xl font-black font-mono text-ink">10M</span>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {misPilotos.map((p: any, i: number) => {
                const team = currentSplit?.equipos?.find((e: any) => e.id === p.equipoId);
                return (
                  <div
                    key={`mis-pilotos-${p.pilotoId}-${i}`}
                    className={canOpenPilotProfile ? "cursor-pointer" : ""}
                    onClick={canOpenPilotProfile ? () => { setSelectedPilotForProfileId(p.pilotoId); setActiveProfileTab("profile"); setIsCompareViewOpen(true); } : undefined}
                    title={canOpenPilotProfile ? "Clic para ver estadísticas" : undefined}
                  >
                    <PilotCardF1
                      pilot={p}
                      team={team}
                      getPilotPhoto={getPilotPhoto}
                      size="sm"
                      showPrice={canViewBudget && !p.congelado}
                      footer={canViewBudget ? (
                        <div className="bg-surface-2 border border-t-0 border-line px-2.5 py-2 space-y-1.5">
                          {p.congelado ? (
                            <div className="flex justify-between text-[11px] font-mono text-ink-muted">
                              <span>Estado</span>
                              <span className="text-info font-bold">❄ Congelado</span>
                            </div>
                          ) : (
                            <div className="flex justify-between text-[11px] font-mono text-ink-muted">
                              <span>Cláusula</span>
                              <span className="text-brand font-bold">{p.clausula_actual || 0}M</span>
                            </div>
                          )}
                        </div>
                      ) : undefined}
                    />
                  </div>
                );
              })}
              {misPilotos.length === 0 && (
                <div className="col-span-full text-ink-muted italic text-xs uppercase tracking-widest font-mono p-4 border border-line">
                  Sin pilotos contratados.
                </div>
              )}
            </div>
          )}
        </section>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <section>
          <h2 className="text-xl font-bold italic tracking-tight mb-4 border-b border-line pb-2 lowercase flex items-center gap-2">
            <span className="w-1 h-5 bg-brand" />
            {activeSplitId === "global" ? "PALMARÉS HISTÓRICO PILOTOS" : `MUNDIAL ${currentSplit?.nombre || 'PILOTOS'}`}
          </h2>
          <div className="m-card bg-surface-2 border border-line overflow-hidden p-2 md:p-4">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="text-xs text-ink-muted uppercase tracking-wider border-b border-line">
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
                       onClick={canOpenPilotProfile ? () => { setSelectedPilotForProfileId(p.id); setActiveProfileTab("profile"); setIsCompareViewOpen(true); } : undefined}
                       className={`border-b border-line last:border-0 transition-all group ${canOpenPilotProfile ? "hover:bg-brand/10 cursor-pointer" : ""}`} title={canOpenPilotProfile ? "Haz clic para ver la ficha estadística del piloto" : undefined}
                    >
                      <td className={`py-3 pl-2 font-black italic text-lg w-8 ${i === 0 ? "text-warn" : i === 1 ? "text-ink-muted" : i === 2 ? "text-warn" : "text-ink-muted"}`}>{i + 1}</td>
                      <td className="py-3.5 font-bold">
                        <div className="flex items-center gap-3">
                          {pilotPhoto ? (
                            <img src={pilotPhoto} alt={p.name} referrerPolicy="no-referrer" className="w-8 h-8 rounded-full object-cover border border-brand/40" />
                          ) : (
                            <div className="w-8 h-8 rounded-full border border-line bg-surface flex items-center justify-center font-bold text-xs text-ink-muted uppercase font-mono">
                              {p.name ? p.name.substring(0, 2).toUpperCase() : '??'}
                            </div>
                          )}
                          <div className="flex flex-col">
                            <span className={i === 0 ? "text-warn" : i === 1 ? "text-ink-muted" : i === 2 ? "text-warn" : "text-ink"}>{p.name}</span>
                            <span className="text-xs text-ink-muted font-mono uppercase">{p.escuderia}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 text-right pr-2 font-bold tabular-nums">
                        {activeSplitId === "global"
                          ? <span className="text-warn text-base font-black">{p.points} 🏆</span>
                           : <span className={i === 0 ? "text-warn" : i === 1 ? "text-ink-muted" : i === 2 ? "text-warn" : "text-ink"}>{p.points}</span>}
                      </td>
                  </tr>
                );
              })}
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h2 className="text-xl font-bold italic tracking-tight mb-4 border-b border-line pb-2 lowercase flex items-center gap-2">
            <span className="w-1 h-5 bg-brand" />
            {activeSplitId === "global" ? "PALMARÉS HISTÓRICO ESCUDERÍAS" : currentSplit?.tipo === "individual" ? "MUNDIAL DÚOS" : "MUNDIAL ESCUDERÍAS"}
          </h2>
          <div className="m-card bg-surface-2 border border-line overflow-hidden p-2 md:p-4">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="text-xs text-ink-muted uppercase tracking-wider border-b border-line">
                  <th className="pb-3 pl-2">Pos</th>
                  <th className="pb-3">Escudería</th>
                  <th className="pb-3 text-right pr-2">{activeSplitId === "global" ? "Títulos" : "Pts"}</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {teamStandings.map((t: any, i: number) => {
                  const logo = getTeamLogo(t.id);
                  return (
                    <tr key={t.id} className="border-b border-line last:border-0 hover:bg-surface-2 transition-colors">
                      <td className="py-3 pl-2 font-black italic text-ink-muted text-lg w-8">{i + 1}</td>
                      <td className="py-3.5 font-bold flex items-center gap-3">
                        {logo ? (
                          <img src={logo} alt={t.nombre} referrerPolicy="no-referrer" className="w-8 h-8 rounded-sm object-cover border border-line" />
                        ) : (
                          <div className="w-8 h-8 rounded-sm border border-line bg-surface flex items-center justify-center font-bold text-xs text-ink-muted uppercase font-mono">
                            {t.nombre ? t.nombre.substring(0, 2).toUpperCase() : '??'}
                          </div>
                        )}
                         <span className="uppercase tracking-tighter">{t.nombre}</span>
                         {i === 0 && <Crown className="w-4 h-4 text-warn shrink-0" />}
                      </td>
                      <td className="py-3.5 text-right pr-2 font-bold tabular-nums">
                        {activeSplitId === "global"
                          ? <span className="text-warn text-base font-black">{t.puntos} 🏆</span>
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
          <h2 className="text-xl font-bold italic tracking-tight mb-4 border-b border-line pb-2 lowercase flex items-center gap-2">
            <span className="w-1.5 h-5 bg-brand block" /> Palmarés Histórico por Splits (Historial de Campeones)
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {championshipsTimeline.map((item, idx) => (
              <div key={item.splitId} className={`border  p-5 relative overflow-hidden transition-all duration-300 ${item.completed ? "bg-bg border-warn/30 hover:border-warn/50  shadow-warn/20" : "bg-surface-2 border-line opacity-60"}`}>
                {item.completed ? (
                  <div className="absolute top-3 right-3 bg-warn/10 text-warn border border-warn/25 rounded-full px-2 py-0.5 text-[11px] font-black uppercase tracking-wider font-mono">Oficial 🏆</div>
                ) : (
                  <div className="absolute top-3 right-3 bg-surface-2 text-ink-muted border border-line rounded-full px-2 py-0.5 text-[11px] font-mono tracking-wider uppercase">Próximo 🏁</div>
                )}
                <div className="text-xs uppercase font-mono tracking-widest text-brand mb-4 font-black">{item.splitName}</div>
                
                <div className="space-y-4">
                  <div>
                    <div className="text-[11px] text-ink-muted uppercase font-mono mb-1">Campeón de Pilotos:</div>
                    {item.completed ? (
                      <div>
                        <p className="font-extrabold text-brand text-sm tracking-tight">{item.winnerPilot}</p>
                        <p className="text-xs text-ink-muted font-mono mt-0.5 uppercase">{item.winnerPilotTeam} ({item.winnerPilotPoints} pts)</p>
                      </div>
                    ) : (
                      <p className="text-xs text-ink-muted italic font-mono uppercase">Pendiente de inicio</p>
                    )}
                  </div>
                  <div className="border-t border-line pt-3">
                    <div className="text-[11px] text-ink-muted uppercase font-mono mb-1">Campeón de Escuderías:</div>
                    {item.completed ? (
                      <div>
                        <p className="font-extrabold text-ink text-sm tracking-tight uppercase">{item.winnerTeam}</p>
                        <p className="text-xs text-ink-muted font-mono mt-0.5 uppercase">({item.winnerTeamPoints} pts)</p>
                      </div>
                    ) : (
                      <p className="text-xs text-ink-muted italic font-mono uppercase">Pendiente de inicio</p>
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
          <h2 className="text-xl font-bold italic tracking-tight mb-4 border-b border-line pb-2 lowercase flex items-center gap-2">
            <span className="w-1 h-5 bg-brand" /> puntos por carrera
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {raceResults.map((gp, i) => (
              <div key={i} className="bg-surface-2 border border-line  p-4 overflow-hidden relative group">
                <div className="absolute right-0 top-0 text-[40px] font-black italic text-ink-muted pointer-events-none group-hover:text-brand/10 transition-colors uppercase">GP</div>
                <h3 className="text-xs font-mono uppercase tracking-[0.08em] text-brand mb-4 border-b border-line pb-2">{gp.circuitName}</h3>
                <div className="space-y-3">
                  {gp.pilots.sort((a: any, b: any) => b.pts - a.pts).map((rp: any, idx: number) => (
                    <div 
                      key={idx} 
                      onClick={canOpenPilotProfile ? () => { setSelectedPilotForProfileId(rp.id); setActiveProfileTab("profile"); setIsCompareViewOpen(true); } : undefined}
                      className={`flex justify-between items-center text-xs p-1 rounded transition-colors group/row ${canOpenPilotProfile ? "cursor-pointer hover:bg-surface-2" : ""}`} title={canOpenPilotProfile ? "Haz clic para ver la ficha estadística detallada de este piloto" : undefined}
                    >
                      <div className="flex flex-col">
                        <span className="font-bold flex items-center gap-2 text-ink group-hover/row:text-brand transition-colors">
                           <span className="w-1.5 h-1.5 bg-surface-3 rounded-full group-hover/row:bg-brand/80" /> {rp.name}
                        </span>
                        <span className="text-[11px] text-ink-muted uppercase font-mono ml-3.5">{rp.team.replace('_', ' ')}</span>
                      </div>
                      <span className="font-black text-ink tabular-nums group-hover/row:text-brand transition-colors">{rp.pts} <span className="text-[11px] text-ink-muted font-normal">pts</span></span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {(activeSplitId !== "global" && currentSplit?.tipo !== "individual" && miEscuderia && currentUserPilotId) && (
        <PilotRivalryPanel split={currentSplit} miEscuderia={miEscuderia} userPilotId={currentUserPilotId} />
      )}


      {confirmModal && confirmModal.isOpen && (
        <div className="fixed inset-0 bg-surface z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
          <div className="relative w-full max-w-sm rounded-t-2xl border border-line bg-bg p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] text-left sm:rounded-none sm:p-6 sm:pb-6">
            <h3 className="text-lg font-black text-ink uppercase tracking-tight mb-2 flex items-center gap-2"><span className="w-1.5 h-4 bg-brand" /> {confirmModal.title}</h3>
            <p className="text-[13px] text-ink-muted leading-relaxed mb-6">{confirmModal.message}</p>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3">
              {confirmModal.showCancel !== false && (<button onClick={() => setConfirmModal(null)} className="min-h-12 rounded-xl border border-line bg-surface-2 px-4 text-sm font-bold text-ink transition-colors hover:bg-surface-2 sm:min-h-0 sm:rounded-sm sm:py-2.5 sm:text-xs sm:uppercase sm:tracking-wider">Cancelar</button>)}
              <button onClick={() => { confirmModal.onConfirm(); setConfirmModal(null); }} className="min-h-12 rounded-xl bg-brand px-4 text-sm font-bold text-brand-ink transition-colors hover:bg-danger sm:min-h-0 sm:rounded-sm sm:py-2.5 sm:text-xs sm:uppercase sm:tracking-wider">Confirmar</button>
            </div>
          </div>
        </div>
      )}

      {isCompareViewOpen && (
        <div
          className="fixed inset-0 bg-ink/75 z-50 overflow-y-auto overscroll-contain p-0 md:p-6 text-left backdrop-blur-sm"
          onClick={() => { setIsCompareViewOpen(false); setSelectedPilotForProfileId(null); }}
        >
          <div className="relative mx-auto my-0 min-h-[100dvh] max-w-5xl border-line bg-surface p-4 pb-[max(2rem,env(safe-area-inset-bottom))] md:my-4 md:min-h-0 md:border md:p-6" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 z-10 -mx-4 mb-5 flex items-start justify-between gap-3 border-b border-brand/20 bg-surface px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 md:static md:mx-0 md:mb-6 md:px-0 md:pt-0 md:pb-4">
              <div className="min-w-0">
                <span className="block text-[11px] font-black text-brand md:font-mono md:text-xs md:uppercase md:tracking-[0.08em]">Central de telemetría GP</span>
                <h2 className="mt-0.5 flex items-center gap-2 text-lg font-black uppercase italic tracking-tight text-ink md:text-2xl"><TrendingUp className="w-5 h-5 shrink-0 text-warn md:w-6 md:h-6" /> <span className="truncate">Rivalidad & rendimiento</span></h2>
              </div>
              <button aria-label="Cerrar" onClick={() => { setIsCompareViewOpen(false); setSelectedPilotForProfileId(null); }} className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-line text-ink-muted transition-all hover:bg-surface-2 hover:text-ink md:rounded-sm"><X className="w-5 h-5" /></button>
            </div>

            <div className="grid grid-cols-2 gap-2 border-b border-line mb-5 md:flex md:mb-6">
              <button onClick={() => { setActiveProfileTab("profile"); if (!selectedPilotForProfileId && allPaddockPilots.length > 0) setSelectedPilotForProfileId(allPaddockPilots[0].id); }} className={`min-h-12 px-3 md:px-6 md:py-3 font-black text-[12px] md:text-xs md:uppercase tracking-tight md:tracking-wider border-b-2 transition-all cursor-pointer ${activeProfileTab === "profile" ? "border-brand text-ink bg-surface-2" : "border-transparent text-ink-muted hover:text-ink hover:bg-surface-2"}`}><span className="md:hidden">👤 Ficha</span><span className="hidden md:inline">👤 Ficha Individual de Piloto</span></button>
              <button onClick={() => { setActiveProfileTab("compare"); if (!comparePilotIdA && allPaddockPilots.length > 0) setComparePilotIdA(selectedPilotForProfileId || allPaddockPilots[0].id); if (!comparePilotIdB && allPaddockPilots.length > 0) { const firstId = selectedPilotForProfileId || allPaddockPilots[0].id; const other = allPaddockPilots.filter(p => p.id !== firstId)[0]; setComparePilotIdB(other?.id || firstId); } }} className={`min-h-12 px-3 md:px-6 md:py-3 font-black text-[12px] md:text-xs md:uppercase tracking-tight md:tracking-wider border-b-2 transition-all cursor-pointer ${activeProfileTab === "compare" ? "border-brand text-ink bg-surface-2" : "border-transparent text-ink-muted hover:text-ink hover:bg-surface-2"}`}><span className="md:hidden">⚔️ Comparar</span><span className="hidden md:inline">⚔️ Comparador Cara a Cara</span></button>
            </div>

            {activeProfileTab === "profile" && currentSplit?.id !== "origins" && (
              <div className="space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-surface-2 border border-line p-4 rounded-sm">
                  <div>
                    <label className="text-xs text-ink-muted uppercase font-mono tracking-wider mb-1.5 block">Explorar Ficha de Piloto</label>
                    <select value={selectedPilotForProfileId || ""} onChange={(e) => setSelectedPilotForProfileId(e.target.value)} className="bg-surface border border-line rounded-sm text-xs px-3 py-2 text-ink font-bold w-full md:w-64 focus:border-danger hover:border-line-strong transition-all cursor-pointer">
                      <option value="" disabled>-- Selecciona un piloto --</option>
                      {allPaddockPilots.map((p) => (<option key={p.id} value={p.id}>{p.name} ({p.team})</option>))}
                    </select>
                  </div>
                  {selectedPilotForProfileId && (
                    <button onClick={() => { setComparePilotIdA(selectedPilotForProfileId); const other = allPaddockPilots.filter(p => p.id !== selectedPilotForProfileId)[0]; if (other) setComparePilotIdB(other.id); setActiveProfileTab("compare"); }} className="bg-warn/10 hover:bg-warn/20 text-warn border border-warn/30 font-extrabold uppercase text-xs tracking-wider px-4 py-2.5 rounded-sm flex items-center gap-1.5 cursor-pointer transition-all active:scale-95">
                      <TrendingUp className="w-4 h-4" /> Comparar este piloto ⚔️
                    </button>
                  )}
                </div>

                {pilotProfileStats ? (
                  <div className="space-y-6">
                    <div className="flex flex-col lg:flex-row gap-6">
                      {activeSplitId !== "global" && currentSplit?.id === "origins" ? (
                        <div className="relative w-full max-w-[288px] mx-auto lg:mx-0 shrink-0 min-h-[360px] bg-surface-2 border border-line overflow-hidden flex flex-col justify-end p-6">
                          <div className="absolute inset-x-0 top-0 h-1.5 bg-brand" />
                          <div className="absolute inset-0 flex items-center justify-center opacity-90">
                            {pilotProfileStats.fotoUrl ? (
                              <img src={pilotProfileStats.fotoUrl} alt={pilotProfileStats.name} className="max-w-[80%] max-h-[70%] object-contain" />
                            ) : (
                              <span className="text-7xl font-black text-ink-muted">{pilotProfileStats.name?.substring(0, 2).toUpperCase()}</span>
                            )}
                          </div>
                          <div className="relative z-10 bg-gradient-to-t from-surface via-surface/90 to-transparent -mx-6 -mb-6 px-6 pb-6 pt-20">
                            <span className="text-[11px] font-mono uppercase tracking-[0.08em] text-brand">Origins</span>
                            <h3 className="mt-1 text-2xl font-black italic uppercase text-ink">{pilotProfileStats.name}</h3>
                            <p className="mt-3 text-sm font-mono text-ink-muted">{pilotProfileStats.totalPoints} puntos · {pilotProfileStats.participaciones} carreras</p>
                          </div>
                        </div>
                      ) : (
                      <div className="relative w-full max-w-[288px] mx-auto lg:mx-0 shrink-0 h-[440px] bg-surface-2 border border-line shadow-card overflow-hidden group">
                        <div className="absolute top-0 left-0 w-full h-1.5 bg-brand"></div>
                        <div className="absolute -top-20 -right-20 w-48 h-48 bg-brand/20 rounded-full pointer-events-none group-hover:bg-brand/30 transition-all duration-500"></div>
                        <div className="absolute top-5 left-5 flex flex-col items-center z-20 drop-shadow-md">
                          <span className="text-[42px] font-black italic text-ink leading-none tracking-tighter">{pilotProfileStats.rating}</span>
                          <span className="text-xs font-bold text-ink-2 uppercase tracking-widest mt-1">OVR</span>
                          <div className="w-8 h-[2px] bg-surface-3 my-2.5"></div>
                          <div className="text-[11px] font-black text-ink-muted uppercase tracking-widest" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>{pilotProfileStats.escuderiaName ? pilotProfileStats.escuderiaName.substring(0, 16) : 'EQ'}</div>
                        </div>
                        <div className="absolute bottom-28 left-1/2 -translate-x-1/2 w-[220px] h-[220px] z-10 flex items-end justify-center transition-transform duration-500 group-hover:scale-105">
                          {pilotProfileStats.fotoUrl ? (
                            <img src={pilotProfileStats.fotoUrl} alt={pilotProfileStats.name} className="max-w-full max-h-full object-contain drop-shadow-card" />
                          ) : (
                            <div className="w-32 h-32 rounded-full bg-surface border border-line flex items-center justify-center font-black text-5xl text-ink-muted mb-6 drop-">{pilotProfileStats.name ? pilotProfileStats.name.substring(0, 2).toUpperCase() : '??'}</div>
                          )}
                        </div>
                        <div className="absolute bottom-0 w-full bg-gradient-to-t from-surface to-transparent pt-16 pb-6 px-6 z-20">
                          <h3 className="text-2xl font-black italic text-ink uppercase tracking-tighter text-center whitespace-nowrap overflow-hidden text-ellipsis drop-shadow-md">{pilotProfileStats.name}</h3>
                          <div className="w-full h-[1px] bg-surface-2 my-3.5"></div>
                           <div className="grid grid-cols-3 gap-x-4 gap-y-3 px-1">
                             <div className="flex flex-col items-center"><span className="text-[11px] font-bold text-ink-muted uppercase tracking-wider mb-0.5">PTS</span><span className="text-base leading-none font-black text-ink">{pilotProfileStats.totalPoints}</span></div>
                             <div className="flex flex-col items-center"><span className="text-[11px] font-bold text-ink-muted uppercase tracking-wider mb-0.5">POLE</span><span className="text-base leading-none font-black text-ink">{pilotProfileStats.poles}</span></div>
                             <div className="flex flex-col items-center"><span className="text-[11px] font-bold text-ink-muted uppercase tracking-wider mb-0.5">DOTD</span><span className="text-base leading-none font-black text-warn">{pilotProfileStats.dotds}</span></div>
                          </div>
                        </div>
                      </div>
                      )}
                      
                      <div className="flex-1 flex flex-col gap-4">
                        {activeSplitId !== "global" && currentSplit?.id === "origins" ? (
                          <div className="grid grid-cols-2 gap-3 flex-1">
                            <div className="bg-surface-2 border border-line p-6 flex flex-col justify-between"><span className="text-xs text-ink-muted uppercase font-mono tracking-wider">Media de puntos</span><span className="text-4xl font-black text-ink font-mono mt-4 tabular-nums">{pilotProfileStats.avgPoints}</span></div>
                            <div className="bg-surface-2 border border-line p-6 flex flex-col justify-between"><span className="text-xs text-ink-muted uppercase font-mono tracking-wider">Carreras disputadas</span><span className="text-4xl font-black text-ink font-mono mt-4 tabular-nums">{pilotProfileStats.participaciones}</span></div>
                            <div className="col-span-2 border border-line bg-surface-2 p-6 text-sm leading-relaxed text-ink-muted">
                              Origins conserva únicamente los puntos históricos por carrera y por dúo. No se muestran posiciones, rating ni datos de mercado que no figuran en el archivo original.
                            </div>
                          </div>
                        ) : (
                        <>
                        <div className="bg-surface-2 border border-line p-6 flex flex-col sm:flex-row items-center justify-between gap-6">
                          <div className="w-full sm:flex-1">
                            <div className="flex justify-between items-end mb-2">
                              <span className="text-xs text-ink-muted font-mono uppercase tracking-wider">Desarrollo de Rating</span>
                              <span className="text-xs font-black text-ink font-mono">{pilotProfileStats.rating.toFixed(0)} / 99</span>
                            </div>
                            <div className="w-full bg-surface-2 h-2 overflow-hidden">
                              <div className="bg-brand h-full rounded-full transition-all duration-1000" style={{ width: `${Math.min(99, pilotProfileStats.rating)}%` }}></div>
                            </div>
                          </div>
                          {!pilotProfileStats.congelado && (
                            <div className="w-full sm:w-auto text-left sm:text-right border-t sm:border-t-0 sm:border-l border-line pt-4 sm:pt-0 sm:pl-6 shrink-0">
                              <span className="text-xs text-ink-muted font-mono uppercase tracking-wider block mb-1">Cláusula de Mercado</span>
                              <div className="flex items-baseline gap-1 sm:justify-end">
                                <span className="text-3xl font-black font-mono text-ok">{pilotProfileStats.clause.toFixed(1)}</span>
                                <span className="text-sm font-bold text-ok font-mono">M</span>
                              </div>
                            </div>
                          )}
                          {pilotProfileStats.congelado && (
                            <div className="w-full sm:w-auto text-left sm:text-right border-t sm:border-t-0 sm:border-l border-line pt-4 sm:pt-0 sm:pl-6 shrink-0">
                              <span className="text-xs text-ink-muted font-mono uppercase tracking-wider block mb-1">Estado</span>
                              <span className="text-xl font-black text-info">❄ Congelado</span>
                            </div>
                          )}
                        </div>

                           <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 flex-1">
                           <div className="bg-surface-2 border border-line p-4 rounded-sm flex flex-col justify-between"><span className="text-xs text-ink-muted uppercase font-mono tracking-wider">Puntos</span><span className="text-2xl font-black text-ink font-mono mt-1 tabular-nums">{pilotProfileStats.totalPoints}</span></div>
                           <div className="bg-surface-2 border border-line p-4 rounded-sm flex flex-col justify-between"><span className="text-xs text-ink-muted uppercase font-mono tracking-wider">Mejor carrera</span><span className="text-2xl font-black text-ink font-mono mt-1 tabular-nums">{pilotProfileStats.bestRace ? `P${pilotProfileStats.bestRace}` : "-"}</span></div>
                           <div className="bg-surface-2 border border-line p-4 rounded-sm flex flex-col justify-between"><span className="text-xs text-ink-muted uppercase font-mono tracking-wider">Poles</span><span className="text-2xl font-black text-ink font-mono mt-1 tabular-nums">{pilotProfileStats.poles}</span></div>
                           <div className="bg-surface-2 border border-line p-4 rounded-sm flex flex-col justify-between"><span className="text-xs text-ink-muted uppercase font-mono tracking-wider">Driver of the Day</span><span className="text-2xl font-black text-warn font-mono mt-1 tabular-nums">{pilotProfileStats.dotds}</span></div>
                        </div>
                        </>
                        )}
                      </div>
                    </div>

                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-widest text-brand font-mono mb-3 block">HISTORIAL CRONOLÓGICO DE CARRERAS</h4>
                      {pilotProfileStats.history && pilotProfileStats.history.length > 0 ? (
                        <div className="bg-surface border border-line rounded-sm overflow-hidden overflow-x-auto">
                          <table className="w-full text-xs font-mono text-left text-ink-muted">
                            <thead>
                              <tr className="bg-surface-2 text-ink-muted uppercase text-[11px] tracking-wider border-b border-line">
                                 <th className="p-3">Split</th><th className="p-3">Gran Premio / Circuito</th><th className="p-3 text-center">Pole</th><th className="p-3 text-center">Pos. Carrera</th><th className="p-3 text-center">Puntos GP</th><th className="p-3 text-center">Driver of the Day</th>
                              </tr>
                            </thead>
                            <tbody>
                              {pilotProfileStats.history.map((h: any, idx: number) => {
                                const esDnf = h.splitTipo !== "individual" && h.isDnf === true;
                                return (
                                <tr key={`gp-hist-${h.splitId}-${h.circuitId}-${idx}`} className={`border-b border-line last:border-0 transition-colors ${esDnf ? "bg-danger/6 hover:bg-danger/10" : "hover:bg-surface-2"}`}>
                                  <td className={`p-3 text-brand font-bold ${esDnf ? "border-l-2 border-danger/70" : ""}`}>{h.splitName}</td>
                                  <td className={`p-3 font-bold ${esDnf ? "text-ink-muted" : "text-ink"}`}>{h.circuitName}</td>
                                    <td className="p-3 text-center">{h.splitTipo === "individual" ? "N/D" : h.qualyPos === 1 ? "Sí" : "-"}</td>
                                   <td className={`p-3 text-center font-bold ${h.splitTipo === "individual" ? "text-ink-muted" : esDnf ? "" : h.racePos === 1 ? 'text-warn' : h.racePos <= 3 ? 'text-ink-2' : 'text-ink'}`}>
                                     {h.splitTipo === "individual" ? "N/D" : esDnf ? (
                                       <span title="No terminó la carrera" className="inline-block rounded-sm border border-danger/60 bg-danger/20 px-2 py-0.5 text-xs font-black tracking-wider text-danger">DNF</span>
                                     ) : h.racePos === 99 ? "—" : `P${h.racePos}`}
                                  </td>
                                  <td className={`p-3 text-center font-bold text-sm bg-surface-2 tabular-nums ${esDnf ? "text-ink-muted" : "text-ink"}`}>{h.points} pts</td>
                                  <td className="p-3">
                                     <div className="flex justify-center items-center">{h.isDotd ? <span className="bg-warn/15 text-warn px-1.5 py-0.5 rounded text-[11px] font-bold">Sí</span> : <span className="text-ink-muted italic">-</span>}</div>
                                  </td>
                                </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="bg-surface border border-line rounded-sm p-8 text-center text-ink-muted italic text-xs">
                          Sin registros de carreras completadas en las bases de datos de este split.
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="bg-surface border border-line  p-16 text-center text-ink-muted italic">
                    Selecciona un piloto para explorar su telemetría e historial de rendimiento.
                  </div>
                )}
              </div>
            )}

            {activeProfileTab === "compare" && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-11 items-center gap-4 bg-surface-2 border border-line p-5 ">
                  <div className="md:col-span-5 flex flex-col">
                    <label className="text-xs text-warn font-mono tracking-wider mb-1 uppercase font-bold">Piloto A (Derecha / Izquierda)</label>
                    <select value={comparePilotIdA} onChange={(e) => setComparePilotIdA(e.target.value)} className="bg-surface border border-line rounded-sm text-xs px-3 py-2 text-ink font-bold focus:border-warn hover:border-line-strong transition-all cursor-pointer">
                      <option value="" disabled>-- Elige el primer piloto --</option>
                      {allPaddockPilots.map((p) => (<option key={p.id} value={p.id} disabled={p.id === comparePilotIdB}>{p.name} ({p.team})</option>))}
                    </select>
                  </div>
                  <div className="md:col-span-1 text-center font-black italic text-brand font-mono text-sm py-2">VS</div>
                  <div className="md:col-span-5 flex flex-col">
                    <label className="text-xs text-danger font-mono tracking-wider mb-1 uppercase font-bold">Piloto B (Contendiente)</label>
                    <select value={comparePilotIdB} onChange={(e) => setComparePilotIdB(e.target.value)} className="bg-surface border border-line rounded-sm text-xs px-3 py-2 text-ink font-bold focus:border-danger hover:border-line-strong transition-all cursor-pointer">
                      <option value="" disabled>-- Elige el segundo piloto --</option>
                      {allPaddockPilots.map((p) => (<option key={p.id} value={p.id} disabled={p.id === comparePilotIdA}>{p.name} ({p.team})</option>))}
                    </select>
                  </div>
                </div>

                {statsA && statsB ? (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-surface-2 border border-warn/20 p-4 flex items-center gap-4">
                        {statsA.fotoUrl ? (
                          <img src={statsA.fotoUrl} alt={statsA.name} className="w-16 h-16 rounded-sm object-cover border border-warn/40" />
                        ) : (
                          <div className="w-16 h-16 rounded-sm bg-surface border border-line flex items-center justify-center font-bold text-lg text-ink-muted uppercase">{statsA.name ? statsA.name.substring(0, 2).toUpperCase() : '??'}</div>
                        )}
                        <div className="flex-1 min-w-0">
                          <span className="text-[11px] bg-warn/10 text-warn font-bold px-1.5 py-0.5 rounded uppercase font-mono">{statsA.escuderiaName}</span>
                          <h4 className="font-extrabold text-brand text-lg uppercase truncate mt-0.5">{statsA.name}</h4>
                          <p className="text-xs text-ink-muted font-mono uppercase mt-0.5 font-bold">Rating: <span className="text-ink">{statsA.rating.toFixed(0)}</span> | Cláusula: <span className="text-ink">{statsA.clause.toFixed(1)}M</span></p>
                        </div>
                      </div>
                      <div className="bg-surface-2 border border-danger/20  p-4 flex items-center gap-4">
                        {statsB.fotoUrl ? (
                          <img src={statsB.fotoUrl} alt={statsB.name} className="w-16 h-16 rounded-sm object-cover border border-danger/40" />
                        ) : (
                          <div className="w-16 h-16 rounded-sm bg-surface border border-line flex items-center justify-center font-bold text-lg text-ink-muted uppercase">{statsB.name ? statsB.name.substring(0, 2).toUpperCase() : '??'}</div>
                        )}
                        <div className="flex-1 min-w-0">
                          <span className="text-[11px] bg-danger/10 text-danger font-bold px-1.5 py-0.5 rounded uppercase font-mono">{statsB.escuderiaName}</span>
                          <h4 className="font-extrabold text-brand text-lg uppercase truncate mt-0.5">{statsB.name}</h4>
                          <p className="text-xs text-ink-muted font-mono uppercase mt-0.5 font-bold">Rating: <span className="text-ink">{statsB.rating.toFixed(0)}</span> | Cláusula: <span className="text-ink">{statsB.clause.toFixed(1)}M</span></p>
                        </div>
                      </div>
                    </div>

                    {(() => {
                      let commonRaces = 0, aheadA = 0, aheadB = 0, qualyA = 0, qualyB = 0;
                      statsA.history.forEach((hA: any) => {
                        const matchB = statsB.history.find((hB: any) => hB.splitId === hA.splitId && hB.circuitId === hA.circuitId);
                         if (matchB && hA.splitTipo !== "individual" && matchB.splitTipo !== "individual") {
                          commonRaces++;
                          if (hA.qualyPos < matchB.qualyPos) qualyA++;
                          else if (matchB.qualyPos < hA.qualyPos) qualyB++;
                          if (hA.isDnf && !matchB.isDnf) aheadB++;
                          else if (!hA.isDnf && matchB.isDnf) aheadA++;
                          else {
                            if (hA.racePos < matchB.racePos) aheadA++;
                            else if (matchB.racePos < hA.racePos) aheadB++;
                          }
                        }
                      });

                      if (commonRaces > 0) {
                        return (
                          <div className="bg-surface-2 border border-line  p-5 text-center">
                            <span className="text-[11px] font-black tracking-[0.08em] text-brand uppercase font-mono block">MÉTRICAS CARA A CARA EN COEXISTENCIA</span>
                            <h4 className="text-sm font-bold text-ink uppercase italic tracking-tight mt-1 mb-4">Se han disputado la pista en <span className="text-warn font-mono">{commonRaces} GPs</span> directos</h4>
                            <div className="space-y-4 max-w-xl mx-auto">
                              <div>
                                <div className="flex justify-between text-xs font-mono mb-1.5">
                                  <span className="font-extrabold text-warn">{statsA.name}: {aheadA} veces</span><span className="text-ink-muted">Acabó por delante</span><span className="font-extrabold text-danger">{aheadB} veces: {statsB.name}</span>
                                </div>
                                <div className="w-full bg-surface-2 rounded-full h-3 overflow-hidden flex font-mono font-bold text-[11px] text-ink">
                                  <div className="bg-warn h-full flex items-center justify-center transition-all" style={{ width: `${(aheadA / commonRaces) * 100}%` }}>{aheadA > 0 && `${((aheadA / commonRaces) * 100).toFixed(0)}%`}</div>
                                  <div className="bg-brand h-full flex items-center justify-center transition-all" style={{ width: `${(aheadB / commonRaces) * 100}%` }}>{aheadB > 0 && `${((aheadB / commonRaces) * 100).toFixed(0)}%`}</div>
                                </div>
                              </div>
                              <div>
                                <div className="flex justify-between text-xs font-mono mb-1.5">
                                  <span className="font-extrabold text-warn">{qualyA} veces</span><span className="text-ink-muted font-sans">Mejor Posición de Clasificación</span><span className="font-extrabold text-danger">{qualyB} veces</span>
                                </div>
                                <div className="w-full bg-surface-2 rounded-full h-3 overflow-hidden flex font-mono font-bold text-[11px] text-ink">
                                  <div className="bg-warn h-full flex items-center justify-center transition-all" style={{ width: `${((qualyA) / ((qualyA + qualyB) || 1)) * 100}%` }}>{qualyA > 0 && `${((qualyA / ((qualyA + qualyB) || 1)) * 100).toFixed(0)}%`}</div>
                                  <div className="bg-brand h-full flex items-center justify-center transition-all" style={{ width: `${((qualyB) / ((qualyA + qualyB) || 1)) * 100}%` }}>{qualyB > 0 && `${((qualyB / ((qualyA + qualyB) || 1)) * 100).toFixed(0)}%`}</div>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      } else {
                        return <div className="bg-surface border border-line  p-4 text-center text-xs text-ink-muted italic font-mono">No constan GPs cerrados disputados de forma simultánea en la temporada de este split.</div>;
                      }
                    })()}

                    <div className="bg-surface border border-line  p-4 space-y-4">
                      <span className="text-xs font-black tracking-widest text-brand font-mono mb-2 block">ANÁLISIS COMPARATIVO DE TELEMETRÍA MUNDIAL</span>
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
                          <div key={`comp-metric-${mIdx}`} className="border-b border-line last:border-0 pb-3 last:pb-0">
                            <div className="flex justify-between items-center text-xs font-semibold uppercase font-mono tracking-tight text-ink-muted mb-1">
                              <span className={isABetter ? "text-warn font-extrabold" : "text-ink-muted"}>{metric.format(metric.valA)}</span>
                              <span className="text-xs text-center">{metric.label}</span>
                              <span className={isBBetter ? "text-danger font-extrabold" : "text-ink-muted"}>{metric.format(metric.valB)}</span>
                            </div>
                            <div className="grid grid-cols-2 gap-1 bg-surface-2 p-0.5 rounded-sm">
                              <div className="flex justify-end bg-surface-2 rounded-l h-2 overflow-hidden relative">
                                <div className={`h-full rounded-l transition-all duration-500 bg-warn`} style={{ width: `${metric.higherIsBetter ? (metric.valA || 0) + (metric.valB || 0) > 0 ? (metric.valA / (metric.valA + metric.valB || 1)) * 100 : 0 : (metric.valA || 0) + (metric.valB || 0) > 0 ? (1 - (metric.valA / (metric.valA + metric.valB || 1))) * 100 : 0}%` }}></div>
                              </div>
                              <div className="flex justify-start bg-surface-2 rounded-r h-2 overflow-hidden relative">
                                <div className={`h-full rounded-r transition-all duration-500 bg-brand`} style={{ width: `${metric.higherIsBetter ? (metric.valA || 0) + (metric.valB || 0) > 0 ? (metric.valB / (metric.valA + metric.valB || 1)) * 100 : 0 : (metric.valA || 0) + (metric.valB || 0) > 0 ? (1 - (metric.valB / (metric.valA + metric.valB || 1))) * 100 : 0}%` }}></div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="bg-surface border border-line  p-16 text-center text-ink-muted italic">Configura ambos pilotos rivales de la lista del paddock arriba para iniciar la simulación analítica de rivalidad.</div>
                )}
              </div>
            )}

            <div className="border-t border-line pt-4 mt-6 flex justify-end">
              <button onClick={() => { setIsCompareViewOpen(false); setSelectedPilotForProfileId(null); }} className="px-5 py-2.5 bg-surface-2 hover:bg-surface-2 text-ink rounded-sm text-xs uppercase tracking-wider font-extrabold border border-line cursor-pointer active:scale-95 transition-all">Cerrar Telemetría</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
