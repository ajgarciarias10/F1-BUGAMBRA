import React, { useState, useMemo, useEffect, useRef } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../services/firebase";
import { compressAndConvertImage } from "../utils/imageHelper";
import { useUsuarios, useSplits } from "../hooks/useData";
import { useAuth } from "../contexts/AuthContext";
import { ShieldAlert, Award, Sparkles, UploadCloud, Camera, X, TrendingUp, MonitorPlay, Crown, Snowflake, Trophy, Loader2, Users } from "lucide-react";
import { isSplitUnlocked } from "../utils/splitResolver";
import { pointsForRaceResult } from "../utils/economyRules";
import { PilotRivalryPanel } from "./RivalryPanels";
import { NextRaceWidget } from "./NextRaceWidget";
import { PilotCardF1 } from "./PilotCardF1";
import { TotalStandings } from "./TotalStandings";
import { useSingleFlight } from "../hooks/useSingleFlight";
import { Badge, Button, Card, EmptyState, Notice, buttonClass } from "./ui";

const SECTION_TITLE = "mb-4 flex items-center gap-2.5 text-lg font-semibold tracking-tight text-ink md:text-xl";
const SELECT_CLASS = "min-h-11 w-full rounded-lg border border-line-strong bg-surface/90 px-3 text-sm font-semibold text-ink shadow-fluent-1 transition-colors hover:border-info/60 focus:border-info";
const SEG_TAB = "min-h-11 rounded-t-lg border-b-2 px-4 text-sm font-semibold transition-colors";

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className={SECTION_TITLE}>
      <span aria-hidden="true" className="h-5 w-1 rounded-full bg-brand" />
      {children}
    </h2>
  );
}

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
      <div className="space-y-6" role="status" aria-label="Cargando campeonato">
        <div className="flex flex-wrap gap-2">
          {[1, 2, 3, 4].map(item => <div key={item} className="h-11 w-28 rounded-full bg-surface-3/70 motion-safe:animate-pulse" />)}
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-8">
          {[1, 2].map(item => (
            <Card key={item} tone="muted" className="space-y-3">
              <div className="h-5 w-48 rounded bg-surface-3/70 motion-safe:animate-pulse" />
              {[1, 2, 3, 4, 5].map(row => <div key={row} className="h-12 rounded-lg bg-surface-3/70 motion-safe:animate-pulse" />)}
            </Card>
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
      <div className="w-full space-y-3 md:flex md:flex-wrap md:items-center md:justify-between md:gap-x-4 md:gap-y-3 md:space-y-0">
        <div className="m-rail hide-scrollbar gap-2" role="group" aria-label="Temporadas">
          <button
            onClick={() => setActiveSplitId("global")}
            className={`fluent-press min-h-11 rounded-full px-4 text-sm font-semibold ${
              activeSplitId === "global" ? "btn-primary-fluent bg-brand text-brand-ink shadow-fluent-1" : "border border-line bg-surface/80 text-ink-2 hover:border-info/50 hover:bg-surface"
            }`}
          >
            Mundial Global
          </button>
          {splits.filter(s => isSplitUnlocked(s.id, splits)).map(s => (
            <button
              key={s.id}
              onClick={() => setActiveSplitId(s.id)}
              className={`fluent-press min-h-11 rounded-full px-4 text-sm font-semibold ${
                activeSplitId === s.id ? "btn-primary-fluent bg-brand text-brand-ink shadow-fluent-1" : "border border-line bg-surface/80 text-ink-2 hover:border-info/50 hover:bg-surface"
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
            className={buttonClass()}
          >
            <TrendingUp aria-hidden="true" className="h-4 w-4 shrink-0 text-info" />
            <span className="truncate">Comparador</span>
          </button>
          {onOpenTv && (
            <button
              onClick={onOpenTv}
              className={buttonClass()}
            >
              <MonitorPlay aria-hidden="true" className="h-4 w-4 shrink-0 text-brand" />
              <span className="truncate">F1 Bugambra TV</span>
            </button>
          )}
        </div>
      </div>

      {activeSplitId !== "global" && currentSplit && currentSplit.circuitos?.some((c: any) => !c.completado) && (
        <div><NextRaceWidget currentSplit={currentSplit} /></div>
      )}

      <Card as="section" aria-label="Paddock Club, Hall of Fame" pad="sm" className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg border border-warn/30 bg-warn-soft text-warn">
            <Award aria-hidden="true" className="h-6 w-6" />
          </span>
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-ink">Paddock Club · Hall of Fame</h2>
            <p className="text-sm text-ink-muted">Campeones oficiales de F1 Bugambra</p>
          </div>
        </div>
        {championshipsTimeline.some(t => t.completed) ? (
          <div className="flex w-full flex-col gap-2.5 sm:flex-row sm:flex-wrap lg:w-auto">
            {championshipsTimeline.filter(t => t.completed).map((t: any) => (
              <div key={t.splitId} className="flex flex-col gap-2.5 sm:flex-row">
                {/* Etiqueta arriba / campeón abajo: en una sola línea el nombre se comprimía. */}
                <div className="rounded-lg border border-line bg-surface-2/70 px-4 py-2.5">
                  <span className="block text-xs text-warn">{t.splitName} · Pilotos</span>
                  <span className="mt-0.5 block text-sm font-semibold text-ink">{t.winnerPilot}{t.winnerPilotTeam ? ` · ${t.winnerPilotTeam}` : ""}</span>
                </div>
                <div className="rounded-lg border border-line bg-surface-2/70 px-4 py-2.5">
                  <span className="block text-xs text-brand">{t.splitName} · Escuderías</span>
                  <span className="mt-0.5 block text-sm font-semibold text-ink">{t.winnerTeam}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-ink-muted">Aún no hay campeonatos cerrados.</p>
        )}
      </Card>

      {activeSplitId === "global" && (
        <TotalStandings splits={splits} getPilotPhoto={getPilotPhoto} />
      )}

      {activeSplitId !== "global" && currentSplit?.tipo !== "individual" && miEscuderia && (
        <Card as="section" aria-label="Tu escudería" accent="var(--c-brand)" pad="lg" className="relative overflow-hidden bg-[image:var(--grad-info)]">
          {miEscuderia ? (
            <div className="relative z-10 flex flex-col items-stretch justify-between gap-6 md:flex-row md:items-center">
            <div className="flex items-center gap-5 w-full md:w-auto">
              {canViewBudget ? (
                <div
                  onDragEnter={handleLogoDrag} onDragOver={handleLogoDrag} onDragLeave={handleLogoDrag} onDrop={handleLogoDrop} onClick={() => teamLogoInputRef.current?.click()}
                  role="button" tabIndex={0} aria-label="Subir o cambiar el logo de la escudería"
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); teamLogoInputRef.current?.click(); } }}
                  className={`group relative flex h-20 w-20 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-xl border-2 border-dashed transition-colors ${logoDragActive ? "border-brand bg-brand-soft" : "border-line-strong bg-surface-2 hover:border-brand"}`}
                >
                  <input type="file" ref={teamLogoInputRef} onChange={(e) => { if (e.target.files && e.target.files[0]) handleUpdateTeamLogo(e.target.files[0]); }} accept="image/*" className="hidden" />
                  {(miEscuderia as any).logo_url ? (
                    <img src={(miEscuderia as any).logo_url} alt={miEscuderia.nombre} referrerPolicy="no-referrer" className="w-full h-full object-cover group-hover:opacity-40 transition-opacity" />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-center p-2">
                      <UploadCloud aria-hidden="true" className="h-6 w-6 text-ink-muted transition-colors group-hover:text-ink-2" />
                      <span className="mt-1 text-xs text-ink-muted">Subir logo</span>
                    </div>
                  )}
                  <div className="absolute inset-0 flex select-none flex-col items-center justify-center gap-1 bg-surface/85 text-xs font-semibold text-ink opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                    <Camera aria-hidden="true" className="h-4 w-4 text-brand" /><span>Editar logo</span>
                  </div>
                  {updatingLogo && <div role="status" className="absolute inset-0 flex items-center justify-center gap-1.5 bg-surface/90 text-xs text-ink"><Loader2 aria-hidden="true" className="h-4 w-4 motion-safe:animate-spin" />Subiendo…</div>}
                </div>
              ) : (
                <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-line bg-surface-2">
                  {(miEscuderia as any).logo_url ? <img src={(miEscuderia as any).logo_url} alt={miEscuderia.nombre} referrerPolicy="no-referrer" className="w-full h-full object-cover" /> : <div className="flex h-full w-full items-center justify-center text-lg font-semibold uppercase text-ink-muted">{miEscuderia.nombre ? miEscuderia.nombre.substring(0, 2).toUpperCase() : 'EQ'}</div>}
                </div>
              )}
              <div>
                <span className="mb-1 block text-xs font-semibold text-brand">{canViewBudget ? "Escudería oficial del jeque" : "Tu equipo para este split"}</span>
                <h3 className="text-2xl font-semibold tracking-tight text-ink">{miEscuderia.nombre}</h3>
                <p className="mt-0.5 text-sm text-ink-muted">{currentSplit?.nombre || activeSplitId}</p>
                {logoError && (
                  <p role="alert" className="mt-1.5 max-w-xs text-sm leading-relaxed text-danger">{logoError}</p>
                )}
              </div>
            </div>
            <div className="flex w-full items-center justify-between gap-8 border-t border-line pt-4 md:w-auto md:justify-end md:border-t-0 md:pt-0">
              {canViewBudget && (
                <div>
                  <h4 className="mb-1 text-xs font-semibold text-ink-muted">Presupuesto disponible</h4>
                  <div className="flex items-baseline gap-0.5">
                    <span className="money text-4xl font-semibold leading-none text-ink">{miEscuderia.presupuesto == null ? "—" : miEscuderia.presupuesto.toFixed(1)}</span><span className="text-xl font-semibold text-ink-muted">M</span>
                  </div>
                </div>
              )}
              <div className="text-right">
                <p className="mb-1 text-xs font-semibold text-ink-muted">Valor total de plantilla</p>
                <div className="flex items-baseline justify-end gap-0.5">
                  <span className="money text-2xl font-semibold leading-none text-ink">{miEscuderia.valor_total.toFixed(1)}</span><span className="text-sm font-semibold text-ink-muted">M</span>
                </div>
              </div>
            </div>
          </div>
          ) : null}
        </Card>
      )}

      {activeSplitId !== "global" && currentSplit?.tipo !== "individual" && (miEscuderia || soyAgenteLibre) && (
        <section>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <SectionTitle>Mi equipo</SectionTitle>
            {currentSplit?.fichajes_abiertos && (
              <Badge tone="ok" dot className="mb-4">
                <Sparkles aria-hidden="true" className="h-3.5 w-3.5" /> Ventana de fichajes abierta
              </Badge>
            )}
          </div>
          
          {soyAgenteLibre && !miEscuderia ? (
            <Card tone="muted" className="flex flex-col items-start justify-between gap-6 border-warn/40 bg-warn-soft/60 md:flex-row md:items-center">
              <div>
                <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-warn"><ShieldAlert aria-hidden="true" className="h-4 w-4" /> Agencia libre · estado independiente</div>
                <h3 className="text-xl font-semibold tracking-tight text-ink">Actualmente estás sin equipo en {currentSplit?.nombre || "este Split"}</h3>
                <p className="text-sm text-ink-muted mt-1 max-w-xl">Tu perfil está disponible en el mercado para este Split. Las escuderías con presupuesto te pueden incorporar mediante la sección de "Agentes Libres Bolsa", o el Administrador puede asignarte de forma manual a una escudería desde el Panel de Control.</p>
              </div>
              <div className="w-full shrink-0 rounded-lg border border-warn/30 bg-surface/70 p-3 text-center md:w-auto">
                <span className="mb-1 block text-xs font-semibold text-warn">Valor de compra</span>
                <span className="money text-2xl font-semibold text-ink">10M</span>
              </div>
            </Card>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {misPilotos.map((p: any, i: number) => {
                const team = currentSplit?.equipos?.find((e: any) => e.id === p.equipoId);
                return (
                  <div
                    key={`mis-pilotos-${p.pilotoId}-${i}`}
                    className={canOpenPilotProfile ? "cursor-pointer rounded-lg fluent-press" : ""}
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
                        <div className="space-y-1.5 rounded-b-lg border border-t-0 border-line bg-surface-2/80 px-2.5 py-2">
                          {p.congelado ? (
                            <div className="flex justify-between text-xs text-ink-muted">
                              <span>Estado</span>
                              <span className="inline-flex items-center gap-1 font-semibold text-info"><Snowflake aria-hidden="true" className="h-3 w-3" />Congelado</span>
                            </div>
                          ) : (
                            <div className="flex justify-between text-xs text-ink-muted">
                              <span>Cláusula</span>
                              <span className="font-semibold tabular-nums text-ink">{p.clausula_actual || 0}M</span>
                            </div>
                          )}
                        </div>
                      ) : undefined}
                    />
                  </div>
                );
              })}
              {misPilotos.length === 0 && (
                <EmptyState className="col-span-full py-8" icon={Users} title="Sin pilotos contratados" description="Cuando ficheres a un piloto aparecerá aquí." />
              )}
            </div>
          )}
        </section>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-8">
        <section>
          <SectionTitle>{activeSplitId === "global" ? "Palmarés histórico de pilotos" : `Mundial de pilotos${currentSplit?.nombre ? ` · ${currentSplit.nombre}` : ""}`}</SectionTitle>
          <Card pad="sm" className="overflow-hidden">
            {standings.length === 0 ? (
              <EmptyState icon={Users} title="Sin clasificación todavía" description="Los puntos aparecerán cuando se cierre la primera carrera." className="border-0 bg-transparent py-8" />
            ) : (
            <table className="w-full text-left text-sm">
              <caption className="sr-only">{activeSplitId === "global" ? "Títulos de pilotos por temporada" : "Clasificación de pilotos"}</caption>
              <thead>
                <tr className="border-b border-line text-xs font-semibold text-ink-muted">
                  <th scope="col" className="w-10 pb-2.5 pl-2 font-semibold">Pos</th>
                  <th scope="col" className="pb-2.5 font-semibold">Piloto</th>
                  <th scope="col" className="pb-2.5 pr-2 text-right font-semibold">{activeSplitId === "global" ? "Títulos" : "Pts"}</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {standings.map((p: any, i: number) => {
                  const pilotPhoto = getPilotPhoto(p.id);
                  const tone = i === 0 ? "text-warn" : "text-ink";
                  return (
                    <tr
                      key={`standings-${p.id || p.name}-${i}`}
                      onClick={canOpenPilotProfile ? () => { setSelectedPilotForProfileId(p.id); setActiveProfileTab("profile"); setIsCompareViewOpen(true); } : undefined}
                      className={`border-b border-line last:border-0 transition-colors ${canOpenPilotProfile ? "cursor-pointer hover:bg-info/10" : ""}`} title={canOpenPilotProfile ? "Haz clic para ver la ficha estadística del piloto" : undefined}
                    >
                      <td className={`w-10 py-2.5 pl-2 text-base font-semibold tabular-nums ${i < 3 ? "text-warn" : "text-ink-muted"}`}>{i + 1}</td>
                      <td className="min-h-11 py-2.5 font-semibold">
                        <div className="flex min-w-0 items-center gap-3">
                          {pilotPhoto ? (
                            <img src={pilotPhoto} alt="" referrerPolicy="no-referrer" className="h-9 w-9 shrink-0 rounded-full border border-line-strong object-cover" />
                          ) : (
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line bg-surface-2 text-xs font-semibold uppercase text-ink-muted">
                              {p.name ? p.name.substring(0, 2).toUpperCase() : '??'}
                            </div>
                          )}
                          <div className="flex min-w-0 flex-col">
                            <span className={`truncate ${tone}`}>{p.name}</span>
                            <span className="truncate text-xs font-normal text-ink-muted">{p.escuderia}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-2.5 pr-2 text-right font-semibold tabular-nums">
                        {activeSplitId === "global"
                          ? <span className="inline-flex items-center gap-1 text-warn"><Trophy aria-hidden="true" className="h-4 w-4" />{p.points}</span>
                          : <span className={tone}>{p.points}</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            )}
          </Card>
        </section>

        <section>
          <SectionTitle>{activeSplitId === "global" ? "Palmarés histórico de escuderías" : currentSplit?.tipo === "individual" ? "Mundial de dúos" : "Mundial de escuderías"}</SectionTitle>
          <Card pad="sm" className="overflow-hidden">
            {teamStandings.length === 0 ? (
              <EmptyState icon={Users} title="Sin clasificación todavía" description="Los puntos aparecerán cuando se cierre la primera carrera." className="border-0 bg-transparent py-8" />
            ) : (
            <table className="w-full text-left text-sm">
              <caption className="sr-only">{activeSplitId === "global" ? "Títulos de escuderías por temporada" : "Clasificación de escuderías"}</caption>
              <thead>
                <tr className="border-b border-line text-xs font-semibold text-ink-muted">
                  <th scope="col" className="w-10 pb-2.5 pl-2 font-semibold">Pos</th>
                  <th scope="col" className="pb-2.5 font-semibold">Escudería</th>
                  <th scope="col" className="pb-2.5 pr-2 text-right font-semibold">{activeSplitId === "global" ? "Títulos" : "Pts"}</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {teamStandings.map((t: any, i: number) => {
                  const logo = getTeamLogo(t.id);
                  return (
                    <tr key={t.id} className="border-b border-line transition-colors last:border-0 hover:bg-info/5">
                      <td className={`w-10 py-2.5 pl-2 text-base font-semibold tabular-nums ${i < 3 ? "text-warn" : "text-ink-muted"}`}>{i + 1}</td>
                      <td className="py-2.5 font-semibold">
                        <div className="flex min-w-0 items-center gap-3">
                          {logo ? (
                            <img src={logo} alt="" referrerPolicy="no-referrer" className="h-9 w-9 shrink-0 rounded-lg border border-line object-cover" />
                          ) : (
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-line bg-surface-2 text-xs font-semibold uppercase text-ink-muted">
                              {t.nombre ? t.nombre.substring(0, 2).toUpperCase() : '??'}
                            </div>
                          )}
                          <span className="truncate">{t.nombre}</span>
                          {i === 0 && <Crown aria-label="Líder" className="h-4 w-4 shrink-0 text-warn" />}
                        </div>
                      </td>
                      <td className="py-2.5 pr-2 text-right font-semibold tabular-nums">
                        {activeSplitId === "global"
                          ? <span className="inline-flex items-center gap-1 text-warn"><Trophy aria-hidden="true" className="h-4 w-4" />{t.puntos}</span>
                          : t.puntos}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            )}
          </Card>
        </section>
      </div>

      {activeSplitId === "global" && championshipsTimeline && championshipsTimeline.length > 0 && (
        <section>
          <SectionTitle>Palmarés histórico por splits</SectionTitle>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            {championshipsTimeline.map((item) => (
              <Card key={item.splitId} tone={item.completed ? "solid" : "muted"} accent={item.completed ? "var(--c-warn)" : undefined} className={`reveal relative ${item.completed ? "" : "opacity-80"}`}>
                <div className="mb-4 flex items-start justify-between gap-2">
                  <h3 className="text-sm font-semibold text-ink">{item.splitName}</h3>
                  {item.completed ? <Badge tone="warn">Oficial</Badge> : <Badge>Próximo</Badge>}
                </div>
                <div className="space-y-4">
                  <div>
                    <div className="mb-1 text-xs text-ink-muted">Campeón de pilotos</div>
                    {item.completed ? (
                      <div>
                        <p className="text-sm font-semibold text-ink">{item.winnerPilot}</p>
                        <p className="mt-0.5 text-xs text-ink-muted">{item.winnerPilotTeam} ({item.winnerPilotPoints} pts)</p>
                      </div>
                    ) : (
                      <p className="text-sm text-ink-muted">Pendiente de inicio</p>
                    )}
                  </div>
                  <div className="border-t border-line pt-3">
                    <div className="mb-1 text-xs text-ink-muted">Campeón de escuderías</div>
                    {item.completed ? (
                      <div>
                        <p className="text-sm font-semibold text-ink">{item.winnerTeam}</p>
                        <p className="mt-0.5 text-xs text-ink-muted">({item.winnerTeamPoints} pts)</p>
                      </div>
                    ) : (
                      <p className="text-sm text-ink-muted">Pendiente de inicio</p>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </section>
      )}

      {activeSplitId !== "global" && raceResults.length > 0 && (
        <section>
          <SectionTitle>Puntos por carrera</SectionTitle>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 md:gap-6">
            {raceResults.map((gp, i) => (
              <Card key={i} as="article" tone="solid" pad="sm" className="overflow-hidden">
                <h3 className="mb-3 border-b border-line pb-2 text-sm font-semibold text-brand">{gp.circuitName}</h3>
                <ul className="space-y-1">
                  {gp.pilots.sort((a: any, b: any) => b.pts - a.pts).map((rp: any, idx: number) => (
                    <li
                      key={idx}
                      onClick={canOpenPilotProfile ? () => { setSelectedPilotForProfileId(rp.id); setActiveProfileTab("profile"); setIsCompareViewOpen(true); } : undefined}
                      className={`flex min-h-11 items-center justify-between gap-3 rounded-lg px-2 py-1 text-sm transition-colors ${canOpenPilotProfile ? "cursor-pointer hover:bg-info/10" : ""}`} title={canOpenPilotProfile ? "Haz clic para ver la ficha estadística detallada de este piloto" : undefined}
                    >
                      <div className="flex min-w-0 flex-col">
                        <span className="truncate font-semibold text-ink">{rp.name}</span>
                        <span className="truncate text-xs text-ink-muted">{rp.team.replace('_', ' ')}</span>
                      </div>
                      <span className="shrink-0 font-semibold tabular-nums text-ink">{rp.pts} <span className="text-xs font-normal text-ink-muted">pts</span></span>
                    </li>
                  ))}
                </ul>
              </Card>
            ))}
          </div>
        </section>
      )}

      {(activeSplitId !== "global" && currentSplit?.tipo !== "individual" && miEscuderia && currentUserPilotId) && (
        <PilotRivalryPanel split={currentSplit} miEscuderia={miEscuderia} userPilotId={currentUserPilotId} />
      )}


      {confirmModal && confirmModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/60 p-0 sm:items-center sm:p-4">
          <div role="alertdialog" aria-modal="true" aria-label={confirmModal.title} className="acrylic relative w-full max-w-sm rounded-t-2xl bg-surface p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] text-left shadow-fluent-3 sm:rounded-card sm:p-6 sm:pb-6">
            <h3 className="mb-2 flex items-center gap-2 text-lg font-semibold tracking-tight text-ink"><span aria-hidden="true" className="h-4 w-1 rounded-full bg-brand" /> {confirmModal.title}</h3>
            <p className="mb-6 text-sm leading-relaxed text-ink-muted">{confirmModal.message}</p>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3">
              {confirmModal.showCancel !== false && (<Button onClick={() => setConfirmModal(null)}>Cancelar</Button>)}
              <Button variant="primary" onClick={() => { confirmModal.onConfirm(); setConfirmModal(null); }}>Confirmar</Button>
            </div>
          </div>
        </div>
      )}

      {isCompareViewOpen && (
        <div
          className="fixed inset-0 z-50 overflow-y-auto overscroll-contain bg-ink/60 p-0 text-left md:p-6"
          onClick={() => { setIsCompareViewOpen(false); setSelectedPilotForProfileId(null); }}
        >
          <div role="dialog" aria-modal="true" aria-label="Rivalidad y rendimiento" className="relative mx-auto my-0 min-h-[100dvh] max-w-5xl bg-surface p-4 pb-[max(2rem,env(safe-area-inset-bottom))] shadow-fluent-3 md:my-4 md:min-h-0 md:rounded-card md:border md:border-line md:p-6" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 z-10 -mx-4 mb-5 flex items-start justify-between gap-3 border-b border-line bg-surface px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 md:static md:mx-0 md:mb-6 md:px-0 md:pt-0 md:pb-4">
              <div className="min-w-0">
                <span className="block text-xs font-semibold text-brand">Central de telemetría GP</span>
                <h2 className="mt-0.5 flex items-center gap-2 text-lg font-semibold tracking-tight text-ink md:text-2xl"><TrendingUp aria-hidden="true" className="h-5 w-5 shrink-0 text-info md:h-6 md:w-6" /> <span className="truncate">Rivalidad & rendimiento</span></h2>
              </div>
              <button aria-label="Cerrar" onClick={() => { setIsCompareViewOpen(false); setSelectedPilotForProfileId(null); }} className="fluent-press grid h-11 w-11 shrink-0 place-items-center rounded-full border border-line text-ink-muted hover:bg-info/10 hover:text-ink"><X aria-hidden="true" className="h-5 w-5" /></button>
            </div>

            <div role="tablist" className="mb-5 grid grid-cols-2 gap-2 border-b border-line md:mb-6 md:flex">
              <button onClick={() => { setActiveProfileTab("profile"); if (!selectedPilotForProfileId && allPaddockPilots.length > 0) setSelectedPilotForProfileId(allPaddockPilots[0].id); }} role="tab" aria-selected={activeProfileTab === "profile"} className={`${SEG_TAB} md:px-6 ${activeProfileTab === "profile" ? "border-brand bg-info/5 text-ink" : "border-transparent text-ink-muted hover:bg-info/10 hover:text-ink"}`}><span className="md:hidden">Ficha</span><span className="hidden md:inline">Ficha individual de piloto</span></button>
              <button onClick={() => { setActiveProfileTab("compare"); if (!comparePilotIdA && allPaddockPilots.length > 0) setComparePilotIdA(selectedPilotForProfileId || allPaddockPilots[0].id); if (!comparePilotIdB && allPaddockPilots.length > 0) { const firstId = selectedPilotForProfileId || allPaddockPilots[0].id; const other = allPaddockPilots.filter(p => p.id !== firstId)[0]; setComparePilotIdB(other?.id || firstId); } }} role="tab" aria-selected={activeProfileTab === "compare"} className={`${SEG_TAB} md:px-6 ${activeProfileTab === "compare" ? "border-brand bg-info/5 text-ink" : "border-transparent text-ink-muted hover:bg-info/10 hover:text-ink"}`}><span className="md:hidden">Comparar</span><span className="hidden md:inline">Comparador cara a cara</span></button>
            </div>

            {activeProfileTab === "profile" && currentSplit?.id !== "origins" && (
              <div className="space-y-6">
                <Card tone="muted" pad="sm" className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
                  <div>
                    <label htmlFor="sd-profile-pilot" className="mb-1.5 block text-sm font-semibold text-ink-2">Explorar ficha de piloto</label>
                    <select id="sd-profile-pilot" value={selectedPilotForProfileId || ""} onChange={(e) => setSelectedPilotForProfileId(e.target.value)} className={`${SELECT_CLASS} md:w-72`}>
                      <option value="" disabled>Selecciona un piloto</option>
                      {allPaddockPilots.map((p) => (<option key={p.id} value={p.id}>{p.name} ({p.team})</option>))}
                    </select>
                  </div>
                  {selectedPilotForProfileId && (
                    <button onClick={() => { setComparePilotIdA(selectedPilotForProfileId); const other = allPaddockPilots.filter(p => p.id !== selectedPilotForProfileId)[0]; if (other) setComparePilotIdB(other.id); setActiveProfileTab("compare"); }} className={buttonClass()}>
                      <TrendingUp aria-hidden="true" className="h-4 w-4 text-info" /> Comparar este piloto
                    </button>
                  )}
                </Card>

                {pilotProfileStats ? (
                  <div className="space-y-6">
                    <div className="flex flex-col lg:flex-row gap-6">
                      {activeSplitId !== "global" && currentSplit?.id === "origins" ? (
                        <div className="relative w-full max-w-[288px] mx-auto lg:mx-0 shrink-0 min-h-[360px] overflow-hidden rounded-card border border-line bg-surface-2 flex flex-col justify-end p-6 shadow-fluent-2">
                          <div className="absolute inset-x-0 top-0 h-1.5 bg-brand" />
                          <div className="absolute inset-0 flex items-center justify-center opacity-90">
                            {pilotProfileStats.fotoUrl ? (
                              <img src={pilotProfileStats.fotoUrl} alt={pilotProfileStats.name} className="max-w-[80%] max-h-[70%] object-contain" />
                            ) : (
                              <span className="text-7xl font-semibold text-ink-muted">{pilotProfileStats.name?.substring(0, 2).toUpperCase()}</span>
                            )}
                          </div>
                          <div className="relative z-10 bg-gradient-to-t from-surface via-surface/90 to-transparent -mx-6 -mb-6 px-6 pb-6 pt-20">
                            <span className="text-xs font-semibold text-brand">Origins</span>
                            <h3 className="mt-1 text-2xl font-semibold text-ink">{pilotProfileStats.name}</h3>
                            <p className="mt-3 text-sm text-ink-muted">{pilotProfileStats.totalPoints} puntos · {pilotProfileStats.participaciones} carreras</p>
                          </div>
                        </div>
                      ) : (
                      <div className="relative w-full max-w-[288px] mx-auto lg:mx-0 shrink-0 h-[440px] overflow-hidden rounded-card border border-line bg-surface-2 shadow-fluent-2 group">
                        <div className="absolute top-0 left-0 w-full h-1.5 bg-brand"></div>
                        <div className="pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full bg-brand/15"></div>
                        <div className="absolute top-5 left-5 flex flex-col items-center z-20 drop-shadow-md">
                          <span className="text-[42px] font-semibold leading-none tracking-tight text-ink">{pilotProfileStats.rating}</span>
                          <span className="mt-1 text-xs font-semibold text-ink-2">OVR</span>
                          <div className="my-2.5 h-[2px] w-8 bg-line-strong"></div>
                          <div className="text-[11px] font-semibold text-ink-muted" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>{pilotProfileStats.escuderiaName ? pilotProfileStats.escuderiaName.substring(0, 16) : 'EQ'}</div>
                        </div>
                        <div className="absolute bottom-28 left-1/2 -translate-x-1/2 w-[220px] h-[220px] z-10 flex items-end justify-center ">
                          {pilotProfileStats.fotoUrl ? (
                            <img src={pilotProfileStats.fotoUrl} alt={pilotProfileStats.name} className="max-w-full max-h-full object-contain drop-shadow-card" />
                          ) : (
                            <div className="w-32 h-32 rounded-full bg-surface border border-line flex items-center justify-center font-semibold text-5xl text-ink-muted mb-6">{pilotProfileStats.name ? pilotProfileStats.name.substring(0, 2).toUpperCase() : '??'}</div>
                          )}
                        </div>
                        <div className="absolute bottom-0 w-full bg-gradient-to-t from-surface to-transparent pt-16 pb-6 px-6 z-20">
                          <h3 className="overflow-hidden text-ellipsis whitespace-nowrap text-center text-2xl font-semibold tracking-tight text-ink">{pilotProfileStats.name}</h3>
                          <div className="my-3.5 h-px w-full bg-line"></div>
                           <div className="grid grid-cols-3 gap-x-4 gap-y-3 px-1">
                             <div className="flex flex-col items-center"><span className="mb-0.5 text-[11px] font-semibold text-ink-muted">PTS</span><span className="text-base font-semibold leading-none tabular-nums text-ink">{pilotProfileStats.totalPoints}</span></div>
                             <div className="flex flex-col items-center"><span className="mb-0.5 text-[11px] font-semibold text-ink-muted">POLE</span><span className="text-base font-semibold leading-none tabular-nums text-ink">{pilotProfileStats.poles}</span></div>
                             <div className="flex flex-col items-center"><span className="mb-0.5 text-[11px] font-semibold text-ink-muted">DOTD</span><span className="text-base font-semibold leading-none tabular-nums text-warn">{pilotProfileStats.dotds}</span></div>
                          </div>
                        </div>
                      </div>
                      )}
                      
                      <div className="flex-1 flex flex-col gap-4">
                        {activeSplitId !== "global" && currentSplit?.id === "origins" ? (
                          <div className="grid grid-cols-2 gap-3 flex-1">
                            <Card tone="muted" className="flex flex-col justify-between"><span className="text-sm text-ink-muted">Media de puntos</span><span className="mt-4 text-4xl font-semibold tabular-nums text-ink">{pilotProfileStats.avgPoints}</span></Card>
                            <Card tone="muted" className="flex flex-col justify-between"><span className="text-sm text-ink-muted">Carreras disputadas</span><span className="mt-4 text-4xl font-semibold tabular-nums text-ink">{pilotProfileStats.participaciones}</span></Card>
                            <Card tone="muted" className="col-span-2 text-sm leading-relaxed text-ink-muted">
                              Origins conserva únicamente los puntos históricos por carrera y por dúo. No se muestran posiciones, rating ni datos de mercado que no figuran en el archivo original.
                            </Card>
                          </div>
                        ) : (
                        <>
                        <Card tone="muted" className="flex flex-col items-center justify-between gap-6 sm:flex-row">
                          <div className="w-full sm:flex-1">
                            <div className="flex justify-between items-end mb-2">
                              <span className="text-sm text-ink-muted">Desarrollo de rating</span>
                              <span className="text-sm font-semibold tabular-nums text-ink">{pilotProfileStats.rating.toFixed(0)} / 99</span>
                            </div>
                            <div className="h-2 w-full overflow-hidden rounded-full bg-surface-3">
                              <div className="h-full rounded-full bg-info" style={{ width: `${Math.min(99, pilotProfileStats.rating)}%` }}></div>
                            </div>
                          </div>
                          {!pilotProfileStats.congelado && (
                            <div className="w-full sm:w-auto text-left sm:text-right border-t sm:border-t-0 sm:border-l border-line pt-4 sm:pt-0 sm:pl-6 shrink-0">
                              <span className="mb-1 block text-sm text-ink-muted">Cláusula de mercado</span>
                              <div className="flex items-baseline gap-1 sm:justify-end">
                                <span className="money text-3xl font-semibold text-ok">{pilotProfileStats.clause.toFixed(1)}</span>
                                <span className="text-sm font-semibold text-ok">M</span>
                              </div>
                            </div>
                          )}
                          {pilotProfileStats.congelado && (
                            <div className="w-full sm:w-auto text-left sm:text-right border-t sm:border-t-0 sm:border-l border-line pt-4 sm:pt-0 sm:pl-6 shrink-0">
                              <span className="mb-1 block text-sm text-ink-muted">Estado</span>
                              <span className="inline-flex items-center gap-1.5 text-xl font-semibold text-info"><Snowflake aria-hidden="true" className="h-5 w-5" />Congelado</span>
                            </div>
                          )}
                        </Card>

                           <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 flex-1">
                           <Card tone="muted" pad="sm" className="flex flex-col justify-between"><span className="text-sm text-ink-muted">Puntos</span><span className="mt-1 text-2xl font-semibold tabular-nums text-ink">{pilotProfileStats.totalPoints}</span></Card>
                           <Card tone="muted" pad="sm" className="flex flex-col justify-between"><span className="text-sm text-ink-muted">Mejor carrera</span><span className="mt-1 text-2xl font-semibold tabular-nums text-ink">{pilotProfileStats.bestRace ? `P${pilotProfileStats.bestRace}` : "-"}</span></Card>
                           <Card tone="muted" pad="sm" className="flex flex-col justify-between"><span className="text-sm text-ink-muted">Poles</span><span className="mt-1 text-2xl font-semibold tabular-nums text-ink">{pilotProfileStats.poles}</span></Card>
                           <Card tone="muted" pad="sm" className="flex flex-col justify-between"><span className="text-sm text-ink-muted">Driver of the Day</span><span className="mt-1 text-2xl font-semibold tabular-nums text-warn">{pilotProfileStats.dotds}</span></Card>
                        </div>
                        </>
                        )}
                      </div>
                    </div>

                    <div>
                      <h4 className="mb-3 text-sm font-semibold text-ink">Historial cronológico de carreras</h4>
                      {pilotProfileStats.history && pilotProfileStats.history.length > 0 ? (
                        <>
                        {/* Móvil: una tarjeta por carrera. Escritorio: tabla. */}
                        <ul className="space-y-2 md:hidden">
                          {pilotProfileStats.history.map((h: any, idx: number) => {
                            const esDnf = h.splitTipo !== "individual" && h.isDnf === true;
                            const indiv = h.splitTipo === "individual";
                            return (
                              <li key={`gp-card-${h.splitId}-${h.circuitId}-${idx}`} className={`rounded-lg border bg-surface-2/60 p-3 ${esDnf ? "border-danger/40" : "border-line"}`}>
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0">
                                    <p className="truncate text-sm font-semibold text-ink">{h.circuitName}</p>
                                    <p className="text-xs text-brand">{h.splitName}</p>
                                  </div>
                                  <span className="shrink-0 text-base font-semibold tabular-nums text-ink">{h.points} <span className="text-xs font-normal text-ink-muted">pts</span></span>
                                </div>
                                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                                  {indiv ? <Badge>Posición N/D</Badge> : esDnf ? <Badge tone="danger">DNF</Badge> : <Badge tone={h.racePos === 1 ? "warn" : "neutral"}>{h.racePos === 99 ? "Pos. —" : `P${h.racePos}`}</Badge>}
                                  {!indiv && h.qualyPos === 1 && <Badge tone="info">Pole</Badge>}
                                  {h.isDotd && <Badge tone="warn">Piloto del día</Badge>}
                                </div>
                              </li>
                            );
                          })}
                        </ul>
                        <Card pad="none" className="hidden overflow-hidden md:block">
                          <div className="table-scroll">
                          <table className="w-full text-left text-sm text-ink-muted">
                            <thead>
                              <tr className="border-b border-line bg-surface-2/70 text-xs font-semibold text-ink-muted">
                                 <th scope="col" className="p-3 font-semibold">Split</th><th scope="col" className="p-3 font-semibold">Gran Premio / circuito</th><th scope="col" className="p-3 text-center font-semibold">Pole</th><th scope="col" className="p-3 text-center font-semibold">Pos. carrera</th><th scope="col" className="p-3 text-center font-semibold">Puntos GP</th><th scope="col" className="p-3 text-center font-semibold">Piloto del día</th>
                              </tr>
                            </thead>
                            <tbody>
                              {pilotProfileStats.history.map((h: any, idx: number) => {
                                const esDnf = h.splitTipo !== "individual" && h.isDnf === true;
                                return (
                                <tr key={`gp-hist-${h.splitId}-${h.circuitId}-${idx}`} className={`border-b border-line transition-colors last:border-0 ${esDnf ? "bg-danger-soft/60 hover:bg-danger-soft" : "hover:bg-info/5"}`}>
                                  <td className={`p-3 font-semibold text-brand ${esDnf ? "border-l-2 border-danger/70" : ""}`}>{h.splitName}</td>
                                  <td className={`p-3 font-semibold ${esDnf ? "text-ink-muted" : "text-ink"}`}>{h.circuitName}</td>
                                  <td className="p-3 text-center">{h.splitTipo === "individual" ? "N/D" : h.qualyPos === 1 ? "Sí" : "-"}</td>
                                  <td className={`p-3 text-center font-semibold ${h.splitTipo === "individual" ? "text-ink-muted" : esDnf ? "" : h.racePos === 1 ? 'text-warn' : 'text-ink'}`}>
                                    {h.splitTipo === "individual" ? "N/D" : esDnf ? (
                                      <Badge tone="danger" title="No terminó la carrera">DNF</Badge>
                                    ) : h.racePos === 99 ? "—" : `P${h.racePos}`}
                                  </td>
                                  <td className={`p-3 text-center font-semibold tabular-nums ${esDnf ? "text-ink-muted" : "text-ink"}`}>{h.points} pts</td>
                                  <td className="p-3 text-center">{h.isDotd ? <Badge tone="warn">Sí</Badge> : <span className="text-ink-muted">-</span>}</td>
                                </tr>
                                );
                              })}
                            </tbody>
                          </table>
                          </div>
                        </Card>
                        </>
                      ) : (
                        <EmptyState title="Sin carreras registradas" description="Aún no hay carreras completadas para este piloto en este split." className="py-8" />
                      )}
                    </div>
                  </div>
                ) : (
                  <EmptyState icon={Users} title="Selecciona un piloto" description="Explora su telemetría e historial de rendimiento." />
                )}
              </div>
            )}

            {activeProfileTab === "compare" && (
              <div className="space-y-6">
                <Card tone="muted" className="grid grid-cols-1 items-end gap-4 md:grid-cols-11">
                  <div className="md:col-span-5 flex flex-col">
                    <label htmlFor="sd-cmp-a" className="mb-1.5 text-sm font-semibold text-warn">Piloto A</label>
                    <select id="sd-cmp-a" value={comparePilotIdA} onChange={(e) => setComparePilotIdA(e.target.value)} className={SELECT_CLASS}>
                      <option value="" disabled>Elige el primer piloto</option>
                      {allPaddockPilots.map((p) => (<option key={p.id} value={p.id} disabled={p.id === comparePilotIdB}>{p.name} ({p.team})</option>))}
                    </select>
                  </div>
                  <div aria-hidden="true" className="py-2 text-center text-sm font-semibold text-ink-muted md:col-span-1 md:pb-3">VS</div>
                  <div className="md:col-span-5 flex flex-col">
                    <label htmlFor="sd-cmp-b" className="mb-1.5 text-sm font-semibold text-brand">Piloto B</label>
                    <select id="sd-cmp-b" value={comparePilotIdB} onChange={(e) => setComparePilotIdB(e.target.value)} className={SELECT_CLASS}>
                      <option value="" disabled>Elige el segundo piloto</option>
                      {allPaddockPilots.map((p) => (<option key={p.id} value={p.id} disabled={p.id === comparePilotIdA}>{p.name} ({p.team})</option>))}
                    </select>
                  </div>
                </Card>

                {statsA && statsB ? (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Card tone="muted" pad="sm" className="flex items-center gap-4 border-warn/40">
                        {statsA.fotoUrl ? (
                          <img src={statsA.fotoUrl} alt={statsA.name} className="h-16 w-16 rounded-lg object-cover border border-warn/40" />
                        ) : (
                          <div className="h-16 w-16 rounded-lg bg-surface border border-line flex items-center justify-center font-semibold text-lg text-ink-muted uppercase">{statsA.name ? statsA.name.substring(0, 2).toUpperCase() : '??'}</div>
                        )}
                        <div className="flex-1 min-w-0">
                          <Badge tone="warn">{statsA.escuderiaName}</Badge>
                          <h4 className="mt-1 truncate text-lg font-semibold text-ink">{statsA.name}</h4>
                          <p className="mt-0.5 text-sm text-ink-muted">Rating: <span className="text-ink">{statsA.rating.toFixed(0)}</span> · Cláusula: <span className="text-ink">{statsA.clause.toFixed(1)}M</span></p>
                        </div>
                      </Card>
                      <Card tone="muted" pad="sm" className="flex items-center gap-4 border-brand/40">
                        {statsB.fotoUrl ? (
                          <img src={statsB.fotoUrl} alt={statsB.name} className="h-16 w-16 rounded-lg object-cover border border-brand/40" />
                        ) : (
                          <div className="h-16 w-16 rounded-lg bg-surface border border-line flex items-center justify-center font-semibold text-lg text-ink-muted uppercase">{statsB.name ? statsB.name.substring(0, 2).toUpperCase() : '??'}</div>
                        )}
                        <div className="flex-1 min-w-0">
                          <Badge tone="brand">{statsB.escuderiaName}</Badge>
                          <h4 className="mt-1 truncate text-lg font-semibold text-ink">{statsB.name}</h4>
                          <p className="mt-0.5 text-sm text-ink-muted">Rating: <span className="text-ink">{statsB.rating.toFixed(0)}</span> · Cláusula: <span className="text-ink">{statsB.clause.toFixed(1)}M</span></p>
                        </div>
                      </Card>
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
                          <Card tone="muted" className="text-center">
                            <span className="block text-xs font-semibold text-brand">Cara a cara en coexistencia</span>
                            <h4 className="mb-4 mt-1 text-sm font-semibold text-ink">Se han disputado la pista en <span className="text-warn tabular-nums">{commonRaces} GPs</span> directos</h4>
                            <div className="space-y-4 max-w-xl mx-auto">
                              <div>
                                <div className="mb-1.5 flex flex-wrap justify-between gap-x-3 text-xs">
                                  <span className="font-semibold text-warn">{statsA.name}: {aheadA} veces</span><span className="text-ink-muted">Acabó por delante</span><span className="font-semibold text-brand">{aheadB} veces: {statsB.name}</span>
                                </div>
                                <div className="h-4 w-full overflow-hidden rounded-full bg-surface-3 flex text-[11px] font-semibold text-brand-ink">
                                  <div className="bg-warn h-full flex items-center justify-center text-ink" style={{ width: `${(aheadA / commonRaces) * 100}%` }}>{aheadA > 0 && `${((aheadA / commonRaces) * 100).toFixed(0)}%`}</div>
                                  <div className="bg-brand h-full flex items-center justify-center transition-all" style={{ width: `${(aheadB / commonRaces) * 100}%` }}>{aheadB > 0 && `${((aheadB / commonRaces) * 100).toFixed(0)}%`}</div>
                                </div>
                              </div>
                              <div>
                                <div className="mb-1.5 flex flex-wrap justify-between gap-x-3 text-xs">
                                  <span className="font-semibold text-warn">{qualyA} veces</span><span className="text-ink-muted">Mejor posición de clasificación</span><span className="font-semibold text-brand">{qualyB} veces</span>
                                </div>
                                <div className="h-4 w-full overflow-hidden rounded-full bg-surface-3 flex text-[11px] font-semibold text-brand-ink">
                                  <div className="bg-warn h-full flex items-center justify-center text-ink" style={{ width: `${((qualyA) / ((qualyA + qualyB) || 1)) * 100}%` }}>{qualyA > 0 && `${((qualyA / ((qualyA + qualyB) || 1)) * 100).toFixed(0)}%`}</div>
                                  <div className="bg-brand h-full flex items-center justify-center transition-all" style={{ width: `${((qualyB) / ((qualyA + qualyB) || 1)) * 100}%` }}>{qualyB > 0 && `${((qualyB / ((qualyA + qualyB) || 1)) * 100).toFixed(0)}%`}</div>
                                </div>
                              </div>
                            </div>
                          </Card>
                        );
                      } else {
                        return <Notice tone="info">No constan GPs cerrados disputados de forma simultánea en la temporada de este split.</Notice>;
                      }
                    })()}

                    <Card pad="sm" className="space-y-4">
                      <h4 className="mb-2 block text-sm font-semibold text-ink">Análisis comparativo de telemetría mundial</h4>
                      {[
                        { label: "Valoración general (rating)", valA: statsA.rating, valB: statsB.rating, format: (v: number) => v.toFixed(0), higherIsBetter: true },
                        { label: "Puntos globales sumados", valA: statsA.totalPoints, valB: statsB.totalPoints, format: (v: number) => `${v} pts`, higherIsBetter: true },
                        { label: "Media de puntos por GP", valA: statsA.avgPoints, valB: statsB.avgPoints, format: (v: number) => `${v.toFixed(1)} pts`, higherIsBetter: true },
                        { label: "Victorias en carrera", valA: statsA.victorias, valB: statsB.victorias, format: (v: number) => `${v}`, higherIsBetter: true },
                        { label: "Podios obtenidos", valA: statsA.podiums, valB: statsB.podiums, format: (v: number) => `${v}`, higherIsBetter: true },
                        { label: "Pole positions", valA: statsA.poles, valB: statsB.poles, format: (v: number) => `${v}`, higherIsBetter: true },
                        { label: "Media de clasificación (qualy)", valA: statsA.avgQualy, valB: statsB.avgQualy, format: (v: number) => v > 0 ? `P${v}` : "N/D", higherIsBetter: false },
                        { label: "Media de posición en carrera", valA: statsA.avgRace, valB: statsB.avgRace, format: (v: number) => v > 0 ? `P${v}` : "N/D", higherIsBetter: false },
                        { label: "Carreras limpias (sin incidentes)", valA: statsA.cleanRaces, valB: statsB.cleanRaces, format: (v: number) => `${v}`, higherIsBetter: true },
                        { label: "Vueltas rápidas", valA: statsA.fastestLaps, valB: statsB.fastestLaps, format: (v: number) => `${v}`, higherIsBetter: true },
                        { label: "Abandonos (DNF)", valA: statsA.dnfs, valB: statsB.dnfs, format: (v: number) => `${v}`, higherIsBetter: false }
                      ].map((metric, mIdx) => {
                        const isABetter = metric.higherIsBetter ? metric.valA > metric.valB : metric.valA < metric.valB && metric.valA > 0;
                        const isBBetter = metric.higherIsBetter ? metric.valB > metric.valA : metric.valB < metric.valA && metric.valB > 0;
                        return (
                          <div key={`comp-metric-${mIdx}`} className="border-b border-line last:border-0 pb-3 last:pb-0">
                            <div className="mb-1 flex items-center justify-between gap-2 text-sm tabular-nums text-ink-muted">
                              <span className={isABetter ? "font-semibold text-warn" : "text-ink-muted"}>{metric.format(metric.valA)}</span>
                              <span className="text-center text-xs">{metric.label}</span>
                              <span className={isBBetter ? "font-semibold text-brand" : "text-ink-muted"}>{metric.format(metric.valB)}</span>
                            </div>
                            <div className="grid grid-cols-2 gap-1 rounded-full bg-surface-3/60 p-0.5">
                              <div className="relative flex h-2 justify-end overflow-hidden rounded-l-full bg-surface-3">
                                <div className={`h-full rounded-l-full bg-warn`} style={{ width: `${metric.higherIsBetter ? (metric.valA || 0) + (metric.valB || 0) > 0 ? (metric.valA / (metric.valA + metric.valB || 1)) * 100 : 0 : (metric.valA || 0) + (metric.valB || 0) > 0 ? (1 - (metric.valA / (metric.valA + metric.valB || 1))) * 100 : 0}%` }}></div>
                              </div>
                              <div className="relative flex h-2 justify-start overflow-hidden rounded-r-full bg-surface-3">
                                <div className={`h-full rounded-r-full bg-brand`} style={{ width: `${metric.higherIsBetter ? (metric.valA || 0) + (metric.valB || 0) > 0 ? (metric.valB / (metric.valA + metric.valB || 1)) * 100 : 0 : (metric.valA || 0) + (metric.valB || 0) > 0 ? (1 - (metric.valB / (metric.valA + metric.valB || 1))) * 100 : 0}%` }}></div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </Card>
                  </div>
                ) : (
                  <EmptyState icon={TrendingUp} title="Elige a los dos pilotos" description="Configura ambos rivales en los selectores de arriba para ver la comparación." />
                )}
              </div>
            )}

            <div className="border-t border-line pt-4 mt-6 flex justify-end">
              <Button onClick={() => { setIsCompareViewOpen(false); setSelectedPilotForProfileId(null); }}>Cerrar telemetría</Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
