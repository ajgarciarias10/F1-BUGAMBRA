import React, { useState, useEffect, useMemo } from "react";
import { UserHeader } from "./Dashboards";
import { useUsuarios, useSplits } from "../hooks/useData";
import { processRace, RaceResult } from "../services/raceProcessor";
import { procesarEconomiaCarrera } from "../services/economyService";
import { db } from "../services/firebase";
import { doc, updateDoc, getDoc, collection, addDoc, setDoc, deleteDoc, getDocs, onSnapshot, writeBatch, increment, runTransaction } from "firebase/firestore";
import { Calendar, AlertCircle, CheckCircle2, Loader2, User as UserIcon } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { isSplitUnlocked, buildRivalryTable, resolveInitialPilotRating } from "../utils/splitResolver";
import { SuggestionsView } from "./SuggestionsView";
import { AdminRivalryControlPanel } from "./RivalryPanels";
import { EconomyAdminPanel } from "./EconomyAdminPanel";
import { StorageImageUpload } from "./StorageImageUpload";
import { DatabaseExplorer } from "./DatabaseExplorer";
import { AdminControlPanel } from "./AdminControlPanel";
import { useAuth } from "../contexts/AuthContext";
import { SeasonReviewPanel } from "./SeasonReviewPanel";
import { AdminUsersPanel } from "./AdminUsersPanel";
import { AdminTeamManager } from "./AdminTeamManager";

type AdminTab = "season-review" | "teams" | "results" | "users" | "suggestions" | "tools";

const ADMIN_TABS: Array<{ id: AdminTab; label: string; pulse?: boolean }> = [
  { id: "season-review", label: "Revisión temporadas" },
  { id: "teams", label: "Administración de equipos" },
  { id: "results", label: "Circuitos y resultados" },
  { id: "users", label: "Administración de usuarios" },
  { id: "suggestions", label: "Buzón de mejoras", pulse: true },
  { id: "tools", label: "Herramientas técnicas" },
];

const getNextCircuitOfSplit = (circuitos: any[] | undefined) => {
  if (!circuitos || circuitos.length === 0) return null;
  const pending = circuitos.filter((c: any) => !c.completado);
  if (pending.length > 0) {
    const now = new Date();
    let best = pending[0];
    let minDiff = Infinity;
    for (const c of pending) {
      if (c.fecha) {
        const dateStr = c.fecha + (c.hora ? `T${c.hora}` : "T00:00:00");
        const cDate = new Date(dateStr);
        if (!isNaN(cDate.getTime())) {
          const diff = Math.abs(cDate.getTime() - now.getTime());
          if (diff < minDiff) {
            minDiff = diff;
            best = c;
          }
        }
      }
    }
    return best;
  }
  return circuitos[circuitos.length - 1]; // Fallback to last one
};

const canPilotParticipateInRace = (pilot: any, raceSequence: number) => {
  const startsAt = Number(pilot.participa_desde ?? 1);
  const endsAt = pilot.participa_hasta == null ? null : Number(pilot.participa_hasta);
  return raceSequence >= startsAt && (endsAt == null || raceSequence <= endsAt);
};

  const getLastCompletedRaceNumber = (split: any) => Math.max(
    0,
    ...(split?.circuitos || [])
      .filter((race: any) => race.completado)
      .map((race: any) => Number(race.numero_carrera ?? 0)),
  );

  const getRosterDocRef = (splitId: string, teamId: string, pilotId: string) => {
    return teamId && teamId !== "agente_libre"
      ? doc(db, `splits/${splitId}/equipos/${teamId}/pilotos`, pilotId)
      : doc(db, `splits/${splitId}/roster`, pilotId);
  };

  const getFreeAgentDocRef = (splitId: string, pilotId: string) => {
    return doc(db, `splits/${splitId}/roster`, pilotId);
  };

export function AdminDashboard() {
  const { userData } = useAuth();
  const { usuarios } = useUsuarios();
  const { splits: rawSplits, loading: loadingSplits } = useSplits();
  const splits = rawSplits;
  const [selectedSplitId, setSelectedSplitId] = useState("");

  const currentRawSplit = useMemo(() => rawSplits.find(s => s.id === selectedSplitId), [rawSplits, selectedSplitId]);
  const isSelectedSplitInitialized = useMemo(() => {
    if (!selectedSplitId || selectedSplitId === "split_1") return true;
    if (!currentRawSplit) return false;
    if (currentRawSplit.tipo === "individual") return true;
    return (currentRawSplit.roster?.length || 0) > 0;
  }, [selectedSplitId, currentRawSplit]);

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [plantilla, setPlantilla] = useState<any[]>([]);
  const [adminTab, setAdminTab] = useState<AdminTab>("teams");
  const [videoIntroUrl, setVideoIntroUrl] = useState("");
  const [savingVideoIntro, setSavingVideoIntro] = useState(false);
  const [logoEdits, setLogoEdits] = useState<Record<string, string>>({});
  const [savingLogo, setSavingLogo] = useState<string | null>(null);
  const [photoEdits, setPhotoEdits] = useState<Record<string, string>>({});
  const [savingPhoto, setSavingPhoto] = useState<string | null>(null);
  const [resetPointsLoading, setResetPointsLoading] = useState(false);
  const [savingRivalries, setSavingRivalries] = useState(false);
  const [rivalriesMsg, setRivalriesMsg] = useState("");
  const [pilotUserToAssign, setPilotUserToAssign] = useState("");
  const [pilotTeamToAssign, setPilotTeamToAssign] = useState("");
  const [assigningPilot, setAssigningPilot] = useState(false);
  const [endingPilotId, setEndingPilotId] = useState<string | null>(null);

  // ─── MIGRACIONES AUTOMÁTICAS AL MONTAR ───────────────────────────────────────
  // Se ejecutan UNA SOLA VEZ. Cada función tiene su propia guardia interna
  // y se omite silenciosamente si ya no es necesaria.
  // ─────────────────────────────────────────────────────────────────────────────
  // ─────────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    let isSubscribed = true;
    const q = collection(db, "plantilla");
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (isSubscribed) {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setPlantilla(data);
      }
    }, (error) => {
      console.warn("Gracefully handled AdminDashboard plantilla snapshot error:", error);
    });
    return () => {
      isSubscribed = false;
      unsubscribe();
    };
  }, []);

  const allPossiblePilots = useMemo(() => {
    const uPilots = usuarios.filter((u: any) => u.rol === "piloto").map((u: any) => ({
      uid: u.uid,
      piloto_id: u.piloto_id || u.uid,
      nombre: u.nombre,
      registered: true,
      raw: u
    }));

    const pPilots = plantilla.filter((p: any) => p.rol === "piloto").map((p: any) => ({
      uid: p.id,
      piloto_id: p.id,
      nombre: p.nombre,
      registered: false,
      raw: p
    }));

    const seenPilotIds = new Set(uPilots.map(p => p.piloto_id));
    const uniquePPilots = pPilots.filter(p => !seenPilotIds.has(p.piloto_id));

    return [...uPilots, ...uniquePPilots];
  }, [usuarios, plantilla]);

  const assignableUsers = useMemo(() => {
    const rosterIds = new Set((currentRawSplit?.roster || []).map((pilot: any) => pilot.pilotoId));
    return (usuarios || [])
      .filter((user: any) => !rosterIds.has(user.piloto_id || user.uid))
      .sort((a: any, b: any) => (a.nombre || a.email || "").localeCompare(b.nombre || b.email || ""));
  }, [usuarios, currentRawSplit]);

  const assignmentPreview = useMemo(() => {
    const user = assignableUsers.find((candidate: any) => candidate.uid === pilotUserToAssign);
    if (!user || !currentRawSplit) return null;
    return resolveInitialPilotRating(user.piloto_id || user.uid, currentRawSplit, rawSplits);
  }, [assignableUsers, pilotUserToAssign, currentRawSplit, rawSplits]);


  const [selectedCircuitoId, setSelectedCircuitoId] = useState("");
  const [isEditingFinished, setIsEditingFinished] = useState(false);
  const [isActaCerrada, setIsActaCerrada] = useState(false);
  const [procesandoEconomia, setProcesandoEconomia] = useState(false);
  const [economiaMsg, setEconomiaMsg] = useState("");

  // Form State
  const [results, setResults] = useState<Record<string, Partial<RaceResult>>>({});

  // Real-time counts of positions to detect duplicates during editing
  const qualyCount = useMemo(() => {
    const counts: Record<number, number> = {};
    (Object.values(results) as Partial<RaceResult>[]).forEach(res => {
      const q = res.qualyPos;
      const isPilotDnf = res.isDnfOwnError || false;
      if (!isPilotDnf && q !== undefined && q !== null && typeof q === "number" && !isNaN(q) && q !== 99) {
        counts[q] = (counts[q] || 0) + 1;
      }
    });
    return counts;
  }, [results]);

  const raceCount = useMemo(() => {
    const counts: Record<number, number> = {};
    (Object.values(results) as Partial<RaceResult>[]).forEach(res => {
      const r = res.racePos;
      const isPilotDnf = res.isDnfOwnError || false;
      if (!isPilotDnf && r !== undefined && r !== null && typeof r === "number" && !isNaN(r) && r !== 99) {
        counts[r] = (counts[r] || 0) + 1;
      }
    });
    return counts;
  }, [results]);

  // Schedule State
  const [fechaVal, setFechaVal] = useState("");
  const [horaVal, setHoraVal] = useState("");
  const [hotlapUrl, setHotlapUrl] = useState("");
  const [numeroCarrera, setNumeroCarrera] = useState<number>(1);
  const [isSavingSchedule, setIsSavingSchedule] = useState(false);

  // Sync video intro URL + clear logo edits when selected split changes
  useEffect(() => {
    const split = splits.find(s => s.id === selectedSplitId);
    setVideoIntroUrl(split?.video_intro ?? "");
    setLogoEdits({});
  }, [selectedSplitId, splits]);

  useEffect(() => {
    const firstTeam = currentRawSplit?.equipos?.[0]?.id || "individual";
    setPilotTeamToAssign(firstTeam);
    setPilotUserToAssign("");
  }, [selectedSplitId]);

  const handleSaveTeamLogo = async (teamId: string, logoUrl: string) => {
    if (!selectedSplitId) return;
    setSavingLogo(teamId);
    try {
      await updateDoc(doc(db, `splits/${selectedSplitId}/equipos`, teamId), {
        logo_url: logoUrl.trim() || null,
      });
      setMsg("Logo actualizado.");
      setTimeout(() => setMsg(""), 2500);
    } catch (err: any) {
      setMsg("Error: " + err.message);
    } finally {
      setSavingLogo(null);
    }
  };

  const handleSavePilotPhoto = async (pilotoId: string, photoUrl: string) => {
    setSavingPhoto(pilotoId);
    try {
      const trimmed = photoUrl.trim() || null;
      const usuario = (usuarios || []).find((u: any) => u.uid === pilotoId || u.piloto_id === pilotoId);
      if (usuario) {
        await updateDoc(doc(db, "usuarios", usuario.uid), { foto_url: trimmed });
      } else {
        // Piloto sin cuenta: guardar en colección global pilotos
        await setDoc(doc(db, "pilotos", pilotoId), { foto_url: trimmed }, { merge: true });
        // También en plantilla para que la foto se transfiera al registrarse
        const inPlantilla = plantilla.find((p: any) => p.id === pilotoId);
        if (inPlantilla) {
          await updateDoc(doc(db, "plantilla", pilotoId), { foto_url: trimmed });
        }
      }
      setPhotoEdits(prev => { const n = { ...prev }; delete n[pilotoId]; return n; });
      setMsg("Foto de piloto actualizada.");
      setTimeout(() => setMsg(""), 2500);
    } catch (err: any) {
      setMsg("Error foto: " + err.message);
    } finally {
      setSavingPhoto(null);
    }
  };

  const handleSaveVideoIntro = async () => {
    if (!selectedSplitId) return;
    setSavingVideoIntro(true);
    try {
      await updateDoc(doc(db, "splits", selectedSplitId), {
        video_intro: videoIntroUrl.trim() || null,
      });
      setMsg("Video de introducción guardado.");
      setTimeout(() => setMsg(""), 3000);
    } catch (err: any) {
      setMsg("Error: " + err.message);
    } finally {
      setSavingVideoIntro(false);
    }
  };

  const handleAssignUserAsPilot = async () => {
    const targetUser = assignableUsers.find((user: any) => user.uid === pilotUserToAssign);
    if (!targetUser || !currentRawSplit || !pilotTeamToAssign || !assignmentPreview) return;

    setAssigningPilot(true);
    setMsg("");
    try {
      const pilotId = targetUser.piloto_id || targetUser.uid;
      const sourceSplit = assignmentPreview.sourceSplitId
        ? rawSplits.find(split => split.id === assignmentPreview.sourceSplitId)
        : null;
      const previousEntry = sourceSplit?.roster.find((pilot: any) => pilot.pilotoId === pilotId);
      const pendingRaces = [...(currentRawSplit.circuitos || [])]
        .filter((race: any) => !race.completado)
        .sort((a: any, b: any) => (a.numero_carrera ?? 999) - (b.numero_carrera ?? 999));
      const startsAt = pendingRaces[0]?.numero_carrera ?? 1;
      const isIndividual = currentRawSplit.tipo === "individual" || currentRawSplit.equipos.length === 0;
      const teamId = isIndividual ? "individual" : pilotTeamToAssign;
      const pilotData = {
        pilotoId: pilotId,
        nombre: targetUser.nombre || targetUser.email || "Piloto",
        equipoId: teamId,
        rating_piloto: assignmentPreview.rating,
        rating_base: assignmentPreview.rating,
         // A pilot with any previous split entry inherits that rating and is never a rookie.
         rookie: assignmentPreview.rookie && !previousEntry,
        participa_desde: startsAt,
        participa_hasta: null,
        puntos_piloto: 0,
        victorias: 0,
        podios: 0,
        poles: 0,
        dnfs: 0,
        carreras_limpias: 0,
        precio_compra: previousEntry?.precio_compra ?? 10,
        clausula_actual: previousEntry?.clausula_actual ?? 20,
        mantener_actual: previousEntry?.mantener_actual ?? 30,
        clausula_inicial_split: previousEntry?.clausula_actual ?? 20,
        mantener_inicial_split: previousEntry?.mantener_actual ?? 30,
        precio_carrera_anterior: previousEntry?.precio_compra ?? 10,
        historial_precios: {},
      };

      const batch = writeBatch(db);
      batch.set(doc(db, "pilotos", pilotId), {
        nombre: pilotData.nombre,
        foto_url: targetUser.foto_url || null,
        rating_piloto: assignmentPreview.rating,
      }, { merge: true });
      batch.set(doc(db, "usuarios", targetUser.uid), {
        piloto_id: pilotId,
        rol: targetUser.rol === "jeque" ? "jeque" : "usuario",
      }, { merge: true });
      const rosterRef = isIndividual
        ? doc(db, `splits/${currentRawSplit.id}/roster`, pilotId)
        : doc(db, `splits/${currentRawSplit.id}/equipos/${teamId}/pilotos`, pilotId);
      batch.set(rosterRef, pilotData);
      await batch.commit();

      setPilotUserToAssign("");
      setMsg(`${pilotData.nombre} inscrito en ${currentRawSplit.nombre} como ${assignmentPreview.rookie ? "Rookie (70 OVR)" : `${assignmentPreview.rating} OVR heredado`}.`);
      setTimeout(() => setMsg(""), 5000);
    } catch (err: any) {
      setMsg("Error al inscribir piloto: " + err.message);
    } finally {
      setAssigningPilot(false);
    }
  };

  const handleEndPilotParticipation = async (pilot: any) => {
    if (!currentRawSplit) return;
    setEndingPilotId(pilot.pilotoId);
    setMsg("");
    try {
      let rosterRef = getRosterDocRef(currentRawSplit.id, pilot.equipoId, pilot.pilotoId);
      const matchedUser = usuarios.find((user: any) => user.piloto_id === pilot.pilotoId || user.uid === pilot.pilotoId);

      let sourceSnap = await getDoc(rosterRef);
      // El roster enriquecido puede conservar el equipo antiguo mientras se
      // propaga una transferencia. Buscar el documento real evita bloquear
      // el cierre del contrato por una ruta desactualizada.
      if (!sourceSnap.exists()) {
        for (const team of currentRawSplit.equipos || []) {
          const candidateRef = doc(db, `splits/${currentRawSplit.id}/equipos/${team.id}/pilotos`, pilot.pilotoId);
          const candidateSnap = await getDoc(candidateRef);
          if (candidateSnap.exists()) {
            rosterRef = candidateRef;
            sourceSnap = candidateSnap;
            break;
          }
        }
      }
      if (!sourceSnap.exists()) {
        const flatRef = getFreeAgentDocRef(currentRawSplit.id, pilot.pilotoId);
        const flatSnap = await getDoc(flatRef);
        if (flatSnap.exists()) {
          rosterRef = flatRef;
          sourceSnap = flatSnap;
        }
      }
      if (!sourceSnap.exists()) throw new Error("No se encontró el piloto en el roster actual.");

      const batch = writeBatch(db);
      // Finalizar saca al piloto completamente del roster de esta temporada.
      // No es una transferencia de mercado: vuelve a ser un usuario normal.
      batch.delete(rosterRef);
       if (matchedUser && matchedUser.rol !== "jeque") {
         batch.set(doc(db, "usuarios", matchedUser.uid), {
           rol: "usuario",
           escuderia_id: "",
         }, { merge: true });
      }
      batch.set(doc(collection(db, `splits/${currentRawSplit.id}/transfers`)), {
        detalles: `Admin finalizó la participación de ${pilot.nombre} en ${currentRawSplit.nombre}`,
        timestamp: new Date().toISOString(),
        tipo: "admin",
        pilotoId: pilot.pilotoId,
        equipoOrigenId: pilot.equipoId,
         equipoDestinoId: null,
      });
      await batch.commit();
       setMsg(`${pilot.nombre} eliminado del equipo y devuelto a usuario.`);
      setTimeout(() => setMsg(""), 4500);
    } catch (err: any) {
      setMsg("Error al finalizar participación: " + err.message);
    } finally {
      setEndingPilotId(null);
    }
  };

  // Auto-select next circuit on load or when splits change
  useEffect(() => {
    if (splits.length > 0 && !selectedCircuitoId) {
      for (const split of splits) {
        const next = getNextCircuitOfSplit(split.circuitos);
        if (next) {
          setSelectedSplitId(split.id);
          setSelectedCircuitoId(next.id);
          setIsEditingFinished(false);
          break;
        }
      }
    }
  }, [splits]);

  // Load existing results if editing
  useEffect(() => {
    if (selectedSplitId && selectedCircuitoId) {
      const split = splits.find(s => s.id === selectedSplitId);
      const circuito = split?.circuitos.find((c: any) => c.id === selectedCircuitoId);
      
      setFechaVal(circuito?.fecha || "");
      setHoraVal(circuito?.hora || "");
      setHotlapUrl(circuito?.hotlap_url || "");
      setNumeroCarrera(circuito?.numero_carrera ?? 1);
      
      if (circuito?.completado && circuito.resultados) {
        setIsEditingFinished(true);
        setIsActaCerrada(!!circuito.acta_cerrada);
        const savedResults: Record<string, Partial<RaceResult>> = {};
        circuito.resultados.forEach((res: RaceResult) => {
          savedResults[res.pilotoId] = res;
        });
        setResults(savedResults);
      } else {
        setIsEditingFinished(false);
        setIsActaCerrada(false);
        setResults({});
      }
    }
  }, [selectedSplitId, selectedCircuitoId, splits]);

  const handleSaveSchedule = async () => {
    if (!selectedSplitId || !selectedCircuitoId) return;
    setIsSavingSchedule(true);
    setMsg("");
    try {
      const ref = doc(db, `splits/${selectedSplitId}/circuitos`, selectedCircuitoId);
      await updateDoc(ref, {
        fecha: fechaVal,
        hora: horaVal,
        hotlap_url: hotlapUrl.trim() || null,
        numero_carrera: numeroCarrera
      });
      setMsg("Programación de la carrera guardada correctamente.");
      setTimeout(() => setMsg(""), 4000);
    } catch (err: any) {
      setMsg("Error guardando programación: " + err.message);
    } finally {
      setIsSavingSchedule(false);
    }
  };

  // Management State
  const [newTeamName, setNewTeamName] = useState("");
  const [editStates, setEditStates] = useState<Record<string, any>>({});
  const [teamBudgets, setTeamBudgets] = useState<Record<string, string>>({});
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  const getEditVal = (pilotId: string, field: string, defaultVal: any) => {
    if (editStates[pilotId]?.hasOwnProperty(field)) {
      return editStates[pilotId][field];
    }
    return defaultVal;
  };

  const handleEditChange = (pilotId: string, field: string, val: any) => {
    setEditStates(prev => ({
      ...prev,
      [pilotId]: {
        ...prev[pilotId],
        [field]: val
      }
    }));
  };

  const handleUpdatePilotName = async (pilotId: string, newName: string) => {
    if (!newName || !newName.trim()) return;
    const trimmedName = newName.trim();

    try {
      // 1. Update in "usuarios"
      const userRef = doc(db, "usuarios", pilotId);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        await updateDoc(userRef, { nombre: trimmedName });
      }
      
      // 2. Update in "plantilla"
      const plantillaRef = doc(db, "plantilla", pilotId);
      const plantillaSnap = await getDoc(plantillaRef);
      if (plantillaSnap.exists()) {
        await updateDoc(plantillaRef, { nombre: trimmedName });
      }
      
      // 3. Update in global pilotos collection
      const pilotoRef = doc(db, "pilotos", pilotId);
      const pilotoSnap = await getDoc(pilotoRef);
      if (pilotoSnap.exists()) {
        await updateDoc(pilotoRef, { nombre: trimmedName });
      }
      
      setMsg(`Nombre de piloto actualizado a "${trimmedName}"`);
      setTimeout(() => {
        setMsg("");
      }, 3000);
    } catch (err: any) {
      setMsg("Error al actualizar nombre: " + err.message);
    }
  };

  const handleCreateTeam = async () => {
    if (!selectedSplitId || !newTeamName) return;
    setLoading(true);
    try {
      const teamId = newTeamName.toLowerCase().replace(/\s+/g, '_');
      await setDoc(doc(db, `splits/${selectedSplitId}/equipos`, teamId), {
        nombre: newTeamName,
        presupuesto: 100,
        puntos_constructores: 0
      });
      setNewTeamName("");
      setMsg("Equipo creado en el split.");
    } catch (err: any) {
      setMsg("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };


  const handleToggleFichajes = async () => {
    if (!selectedSplitId) return;
    setLoading(true);
    try {
      const currentSplit = splits.find(s => s.id === selectedSplitId);
      const finalVal = !(currentSplit?.fichajes_abiertos);
      const ref = doc(db, "splits", selectedSplitId);
      await updateDoc(ref, { fichajes_abiertos: finalVal });
      setMsg(`Ventana de fichajes ${finalVal ? "ABIERTA" : "CERRADA"} para ${currentSplit?.nombre || "Split"}.`);
      setTimeout(() => setMsg(""), 4000);
    } catch (err: any) {
      setMsg("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSetSplitActivo = async () => {
    if (!selectedSplitId) return;
    setLoading(true);
    try {
      const currentSplit = splits.find(s => s.id === selectedSplitId);
      const isActivo = currentSplit?.activo ?? false;
      // Si se va a activar, desactivar todos los demás primero
      if (!isActivo) {
        const batch = splits.filter(s => s.id !== "global" && s.activo);
        for (const s of batch) {
          await updateDoc(doc(db, "splits", s.id), { activo: false });
        }
      }
      await updateDoc(doc(db, "splits", selectedSplitId), { activo: !isActivo });
      setMsg(`Split ${currentSplit?.nombre} ${!isActivo ? "ACTIVADO" : "DESACTIVADO"} en la web pública.`);
      setTimeout(() => setMsg(""), 4000);
    } catch (err: any) {
      setMsg("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateBudget = async (teamId: string, budget: number) => {
    if (!selectedSplitId || isNaN(budget)) return;
    setLoading(true);
    try {
      const ref = doc(db, `splits/${selectedSplitId}/equipos`, teamId);
      await setDoc(ref, { presupuesto: budget }, { merge: true });
      setTeamBudgets(prev => {
        const copy = { ...prev };
        delete copy[teamId];
        return copy;
      });
      setMsg(`Presupuesto de ${teamId} actualizado a ${budget}M.`);
      setTimeout(() => {
        setMsg("");
      }, 4000);
    } catch (err: any) {
      setMsg("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePilotProps = async (teamId: string, pilotId: string, props: any) => {
    if (!selectedSplitId || !teamId) return;
    setLoading(true);
    try {
      const pilotRef = doc(db, `splits/${selectedSplitId}/equipos/${teamId}/pilotos`, pilotId);
      const pilotSnap = await getDoc(pilotRef);
      const oldPrecio = Number(pilotSnap.data()?.precio_compra ?? 0);
      const newPrecio = Number(props.precio_compra || props.precio_compra_split || 0);

      await setDoc(pilotRef, {
        clausula_actual: Number(props.clausula_actual || 0),
        precio_compra:   newPrecio,
        puntos_piloto:   Number(props.puntos_piloto || 0),
        rating_piloto:   Number(props.rating_piloto || 0),
      }, { merge: true });

      // Ajustar presupuesto por diferencia de precio
      if (newPrecio !== oldPrecio) {
        const teamRef = doc(db, `splits/${selectedSplitId}/equipos`, teamId);
        const teamSnap = await getDoc(teamRef);
        const currentBudget = Number(teamSnap.data()?.presupuesto ?? 0);
        const delta = newPrecio - oldPrecio;
        await setDoc(teamRef, { presupuesto: Number((currentBudget - delta).toFixed(1)) }, { merge: true });
      }

      setEditStates(prev => { const copy = { ...prev }; delete copy[pilotId]; return copy; });
      setMsg(`Piloto actualizado en este Split.`);
      setTimeout(() => setMsg(""), 4000);
    } catch (err: any) {
      setMsg("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleMovePilotOriginal = async (pilotId: string, pilotName: string, fromTeamId: string, toTeamId: string, pilotData?: any) => {
    if (!selectedSplitId || fromTeamId === toTeamId) return;
    try {
      const pData = { ...pilotData };
      const currentSplit = splits.find(s => s.id === selectedSplitId);
      const existingEntry = currentSplit?.roster.find(r => r.pilotoId === pilotId);
      const precioCompra = Number(existingEntry?.precio_compra ?? pData.precio_compra ?? pData.raw?.precio_compra ?? 10);
      const sourceRef = getRosterDocRef(selectedSplitId, fromTeamId, pilotId);
      const destinationRef = toTeamId === "agente_libre"
        ? getFreeAgentDocRef(selectedSplitId, pilotId)
        : doc(db, `splits/${selectedSplitId}/equipos/${toTeamId}/pilotos`, pilotId);
      const matchedUser = usuarios.find(u => u.uid === pilotId || (u.piloto_id && u.piloto_id === pilotId));
      const auditRef = doc(collection(db, `splits/${selectedSplitId}/transfers`));

      const sourceSnap = await getDoc(sourceRef);
      if (!sourceSnap.exists()) {
        throw new Error("No se encontró la participación de origen del piloto.");
      }

      const sourceData = sourceSnap.data();

      if (toTeamId === "agente_libre") {
        const batch = writeBatch(db);
        batch.set(destinationRef, {
          ...sourceData,
          pilotoId: pilotId,
          nombre: pilotName || pData.nombre || sourceData.nombre || "Piloto",
          equipoId: "agente_libre",
          participa_hasta: getLastCompletedRaceNumber(currentSplit),
          congelado: false,
          congelado_en: null,
          pending_equipoId: null,
          pending_precio_compra: null,
          pending_tipo_fichaje: null,
        }, { merge: true });
        if (sourceRef.path !== destinationRef.path) {
          batch.delete(sourceRef);
        }
         if (matchedUser && matchedUser.rol !== "jeque") {
           batch.set(doc(db, "usuarios", matchedUser.uid), {
             rol: "usuario",
            escuderia_id: "",
          }, { merge: true });
        }
        batch.set(auditRef, {
          detalles: `Admin finalizó la participación de ${pilotName} en ${currentSplit?.nombre || selectedSplitId}`,
          timestamp: new Date().toISOString(),
          tipo: "admin",
          pilotoId: pilotId,
          equipoOrigenId: fromTeamId,
          equipoDestinoId: toTeamId,
        });
        await batch.commit();
      } else {
        await runTransaction(db, async transaction => {
          transaction.update(doc(db, `splits/${selectedSplitId}/equipos`, toTeamId), {
            presupuesto: increment(-precioCompra),
          });
          transaction.set(destinationRef, {
            ...sourceData,
            pilotoId: pilotId,
            equipoId: toTeamId,
          });
          transaction.delete(sourceRef);
          if (matchedUser) {
            transaction.set(doc(db, "usuarios", matchedUser.uid), {
              escuderia_id: toTeamId,
            }, { merge: true });
          }
          transaction.set(doc(db, "pilotos", pilotId), {
            nombre: pilotName || pData.nombre || "Piloto",
          }, { merge: true });
          transaction.set(auditRef, {
            detalles: `Admin transfirió a ${pilotName} de ${fromTeamId} a ${toTeamId} (${toTeamId} -${precioCompra}M)`,
            timestamp: new Date().toISOString(),
            tipo: "admin",
            pilotoId: pilotId,
            equipoOrigenId: fromTeamId,
            equipoDestinoId: toTeamId,
          });
        });
      }

      setMsg(`Piloto ${pilotName} transferido.`);
      setTimeout(() => setMsg(""), 4000);
    } catch (err: any) {
      setMsg("Error al transferir piloto: " + err.message);
    }
  };

  const handleSyncSplitRosters = (splitId: string) => {
    const currentSplitName = splits.find(s => s.id === splitId)?.nombre || splitId;
    setConfirmModal({
      isOpen: true,
      title: `Inicializar ${currentSplitName}`,
      message: `¿Seguro que quieres INICIALIZAR las plantillas del ${currentSplitName.toUpperCase()} a partir del Split anterior? Los presupuestos se resetearán a 100M, los puntos a 0, victorias a 0 y podios a 0. El RATING de cada piloto se heredará del valor final que tenga en el split anterior.`,
      onConfirm: async () => {
        setLoading(true);
        try {
          const sortedSplits = splits
            .filter(split => split.tipo !== "individual")
            .sort((a, b) => Number(a.orden ?? 0) - Number(b.orden ?? 0) || a.id.localeCompare(b.id));
          const currentIndex = sortedSplits.findIndex(s => s.id === splitId);
          if (currentIndex <= 0) {
            setMsg("Error: No se puede inicializar el Split 1 desde un split anterior.");
            setLoading(false);
            return;
          }
          const prevSplit = sortedSplits[currentIndex - 1];
          setMsg(`Leyendo roster de ${prevSplit.nombre}...`);

          // Copiar equipos del split anterior (reset presupuesto/puntos)
          const prevTeamsSnap = await getDocs(collection(db, `splits/${prevSplit.id}/equipos`));
          for (const prevTeamDoc of prevTeamsSnap.docs) {
            const teamData = prevTeamDoc.data();
            await setDoc(doc(db, `splits/${splitId}/equipos`, prevTeamDoc.id), {
              id: prevTeamDoc.id,
              nombre: teamData.nombre || prevTeamDoc.id,
              presupuesto: 100,
              puntos_constructores: 0
            }, { merge: true });
          }

          // Borrar pilotos anidados existentes en este split
          const existingEquiposSnap = await getDocs(collection(db, `splits/${splitId}/equipos`));
          for (const equipoDoc of existingEquiposSnap.docs) {
            const pilotsSnap = await getDocs(
              collection(db, `splits/${splitId}/equipos/${equipoDoc.id}/pilotos`)
            );
            for (const pd of pilotsSnap.docs) {
              await deleteDoc(pd.ref);
            }
          }

          // Leer pilotos anidados del split anterior y copiarlos al nuevo
          let pilotsInitialized = 0;
          const budgetAdjustments: Record<string, number> = {};

          for (const prevEquipoDoc of prevTeamsSnap.docs) {
            const prevPilotosSnap = await getDocs(
              collection(db, `splits/${prevSplit.id}/equipos/${prevEquipoDoc.id}/pilotos`)
            );
            for (const prevPd of prevPilotosSnap.docs) {
              const r = prevPd.data();
              if (r.participa_hasta != null) continue;
              const pid = prevPd.id;
              const inheritedRating = r.rating_piloto ?? 70;
              const precioCompra = r.precio_compra ?? 10;
              const nextEquipoId = r.pending_equipoId ?? r.equipoId;
              if (!nextEquipoId || nextEquipoId === "agente_libre") continue;
              const pendingPrecio = r.pending_precio_compra;
              const isMantener = r.pending_tipo_fichaje === "mantener";
              // Mantener: descuenta la cuota de renovación del valor del jugador
              const nextPrecioCompra = pendingPrecio == null
                ? precioCompra
                : isMantener
                  ? Math.round((precioCompra - pendingPrecio) * 10) / 10
                  : pendingPrecio;
              const isFreezeSentinel = pendingPrecio === -110;
              const nextPrecioAbs = Math.abs(nextPrecioCompra);
              const nextMantener = isFreezeSentinel
                ? Math.round((r.mantener_actual ?? precioCompra * 3) * 10) / 10
                : nextPrecioCompra < 0
                  ? Math.round(nextPrecioAbs / 3 * 10) / 10
                  : Math.round(nextPrecioAbs * 3 * 10) / 10;
              const nextClausula = isFreezeSentinel
                ? Math.round((r.clausula_actual ?? precioCompra * 2) * 10) / 10
                : nextPrecioCompra < 0
                  ? Math.round(nextPrecioAbs / 2 * 10) / 10
                  : Math.round(nextPrecioAbs * 2 * 10) / 10;

              if (r.pending_equipoId && pendingPrecio != null && !isFreezeSentinel) {
                // Both renewals and transfers affect the destination team's
                // opening budget. Negative prices represent team income.
                const budgetDelta = pendingPrecio < 0 ? Math.abs(pendingPrecio) : -pendingPrecio;
                budgetAdjustments[nextEquipoId] = (budgetAdjustments[nextEquipoId] || 0) + budgetDelta;
              }

              await setDoc(doc(db, `splits/${splitId}/equipos/${nextEquipoId}/pilotos`, pid), {
                pilotoId:               pid,
                equipoId:               nextEquipoId,
                rating_piloto:          inheritedRating,
                rating_base:            inheritedRating,
                participa_desde:        1,
                participa_hasta:        null,
                tipo_fichaje:           r.pending_tipo_fichaje ?? r.tipo_fichaje,
                puntos_piloto: 0, victorias: 0, podios: 0,
                poles: 0, dnfs: 0, carreras_limpias: 0,
                precio_compra:           nextPrecioCompra,
                mantener_actual:         nextMantener,
                clausula_actual:         nextClausula,
                mantener_inicial_split:  nextMantener,
                clausula_inicial_split:  nextClausula,
                precio_carrera_anterior: nextMantener,
                historial_precios:       {},
                congelado:               isFreezeSentinel,
                congelado_en:            undefined,
              });

              pilotsInitialized++;
            }
          }

          // Aplicar ajustes de presupuesto por transferencias pendientes
          for (const [teamId, delta] of Object.entries(budgetAdjustments)) {
            if (delta !== 0) {
              await setDoc(doc(db, `splits/${splitId}/equipos`, teamId), {
                presupuesto: Math.round((100 + delta) * 10) / 10,
              }, { merge: true });
            }
          }

          await addDoc(collection(db, `splits/${splitId}/transfers`), {
            detalles: `⚙️ Admin inicializó los rosters del ${currentSplitName} desde ${prevSplit.nombre}. ${pilotsInitialized} pilotos copiados con rating heredado. Presupuestos ajustados por transferencias pendientes.`,
            timestamp: new Date().toISOString(),
            tipo: "admin"
          });

          setMsg(`¡${currentSplitName} inicializado! ${pilotsInitialized} pilotos copiados. Recarguemos para ver presupuestos...`);
          
          // Forzar reload para que useSplits recargue los datos con los presupuestos ajustados
          setTimeout(() => {
            window.location.reload();
          }, 1500);
          setTimeout(() => setMsg(""), 6000);
        } catch (err: any) {
          setMsg("Error al inicializar split: " + err.message);
        } finally {
          setLoading(false);
        }
      }
    });
  };

  const handleCerrarActa = () => {
    if (!selectedSplitId || !selectedCircuitoId) return;
    setConfirmModal({
      isOpen: true,
      title: "Cerrar Acta de Carrera",
      message: "¿Seguro que quieres CERRAR EL ACTA? Esto impedirá cualquier modificación posterior de resultados.",
      onConfirm: async () => {
        setLoading(true);
        try {
          const ref = doc(db, `splits/${selectedSplitId}/circuitos`, selectedCircuitoId);
          await updateDoc(ref, { acta_cerrada: true });
          setIsActaCerrada(true);
          setMsg("Acta cerrada correctamente. Resultados bloqueados.");
          setTimeout(() => {
            setMsg("");
          }, 4000);
        } catch (err: any) {
          setMsg("Error al cerrar acta: " + err.message);
        } finally {
          setLoading(false);
        }
      }
    });
  };

  const handleUpdate = (uid: string, field: keyof RaceResult, value: any) => {
    setResults(prev => ({
      ...prev,
      [uid]: {
        ...prev[uid],
        pilotoId: uid,
        [field]: value
      }
    }));
  };

  const handleSubmit = async () => {
    if (!selectedSplitId || !selectedCircuitoId) {
      setMsg("Selecciona un circuito primero.");
      return;
    }

    const currentSplit = splits.find(s => s.id === selectedSplitId);
    const selectedRace = currentSplit?.circuitos.find((race: any) => race.id === selectedCircuitoId);
    const selectedRaceSequence = Number(selectedRace?.numero_carrera ?? 1);
    const splitPilots = (currentSplit?.roster || []).filter((pilot: any) =>
      canPilotParticipateInRace(pilot, selectedRaceSequence)
    );

    if (splitPilots.length === 0) {
      setMsg("No hay pilotos registrados en este split.");
      return;
    }

    setLoading(true);
    setMsg("");
    try {
      const finalResults: RaceResult[] = splitPilots.map((p: any, idx: number) => {
        const item = results[p.pilotoId] || {};
        const isDnf = !!item.isDnfOwnError;

        const enteredQualy = typeof item.qualyPos === "number" ? item.qualyPos : parseInt(item.qualyPos as any);
        const qPos = isDnf ? 99 : ((!isNaN(enteredQualy) && enteredQualy > 0) ? enteredQualy : (idx + 1));

        const enteredRace = typeof item.racePos === "number" ? item.racePos : parseInt(item.racePos as any);
        const rPos = isDnf ? 99 : ((!isNaN(enteredRace) && enteredRace > 0) ? enteredRace : (idx + 1));

        return {
          pilotoId: p.pilotoId,
          pilotoNombre: p.nombre,
          qualyPos: qPos,
          racePos: rPos,
          isDnfOwnError: isDnf,
          isClean: item.isClean ?? true,
          overtakesBoost: !isDnf && !!item.overtakesBoost,
          isDotd: !isDnf && !!item.isDotd,
          isMvp: !isDnf && !!item.isMvp,
          fastestLap: !isDnf && !!item.fastestLap
        } as RaceResult;
      });

      await processRace(selectedSplitId, selectedCircuitoId, finalResults);
      setMsg(isEditingFinished ? "Resultados corregidos exitosamente." : "Resultados procesados exitosamente.");
      setTimeout(() => {
        setMsg("");
      }, 4000);
    } catch(err: any) {
      setMsg(err.message || "Error procesando carrera");
    } finally {
      setLoading(false);
    }
  };

  const getCircuitName = () => {
    const s = splits.find(sp => sp.id === selectedSplitId);
    const c = s?.circuitos.find((ci: any) => ci.id === selectedCircuitoId);
    return c?.nombre || "CARRERA";
  };

  if (loadingSplits) return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
      <div className="text-center font-mono animate-pulse text-white/50">
        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-[#e10600]" />
        Cargando temporada...
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-slate-100 px-3 md:px-4 pt-3 md:pt-4 pb-10">
      <div className="max-w-7xl mx-auto">
         <div className="flex items-center justify-between gap-3">
           <UserHeader title="Panel de Administración" />
           {userData?.piloto_id && (
             <button
               onClick={() => { window.location.href = "/piloto"; }}
               className="shrink-0 px-3 py-2 border border-amber-500/30 text-amber-300 hover:bg-amber-500/10 text-[10px] font-black uppercase tracking-wider"
             >
               Ir a mi panel de piloto
             </button>
           )}
         </div>

        {/* Navigation Tabs */}
        <div className="sticky top-2 z-40 flex overflow-x-auto border border-white/10 bg-zinc-950/85 backdrop-blur-xl rounded-3xl mb-4 gap-1 p-1 shadow-2xl shadow-black/30">
          {ADMIN_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setAdminTab(tab.id)}
              className={`shrink-0 min-h-11 rounded-2xl px-4 py-2 font-mono font-bold text-[10px] uppercase tracking-wider transition-all relative cursor-pointer ${
                adminTab === tab.id
                  ? `text-white bg-[#e10600] shadow-lg shadow-red-950/30 ${tab.pulse ? "animate-pulse" : ""}`
                  : "text-white/40 hover:text-white/80 hover:bg-white/[0.02]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {adminTab === "season-review" ? (
          <SeasonReviewPanel splits={splits} />
        ) : adminTab === "teams" ? (
          <AdminTeamManager splitId={selectedSplitId} teams={currentRawSplit?.equipos || []} roster={currentRawSplit?.roster || []} splits={splits} onSelectSplit={(id: string) => setSelectedSplitId(id)} />
        ) : adminTab === "users" ? (
          <AdminUsersPanel />
        ) : adminTab === "suggestions" ? (
          <SuggestionsView isAdmin={true} />
        ) : adminTab === "tools" ? (
          <div className="space-y-6"><AdminControlPanel /><EconomyAdminPanel splits={splits} /><DatabaseExplorer /></div>
         ) : (
           <>
             {/* Navegación de Splits */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {splits.filter(s => isSplitUnlocked(s.id, splits)).map(s => (
            <button
              key={s.id}
              onClick={() => {
                setSelectedSplitId(s.id);
                const next = getNextCircuitOfSplit(s.circuitos) || s.circuitos[s.circuitos.length - 1];
                if (next) setSelectedCircuitoId(next.id);
              }}
              className={`px-3 py-1.5 rounded-sm font-black text-[10px] uppercase tracking-widest transition-all ${
                selectedSplitId === s.id
                ? "bg-[#e10600] text-white shadow-lg shadow-red-900/20"
                : "bg-white/[0.03] text-white/40 border border-white/5 hover:border-white/20"
              }`}
            >
              {s.nombre}
            </button>
          ))}
        </div>

        {/* Selector de Circuito */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
          <div className="bg-white/[0.03] border border-white/10 rounded-sm p-3 flex items-center gap-3">
            <div className="p-1.5 bg-[#e10600]/10 rounded-sm">
              <Calendar className="w-4 h-4 text-[#e10600]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[9px] text-white/40 uppercase tracking-widest font-mono">Circuito activo</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="font-bold text-xs tracking-tight truncate">{getCircuitName()}</span>
                {isActaCerrada ? (
                  <span className="flex items-center gap-1 text-[9px] bg-red-500/20 text-red-500 px-1.5 py-0.5 font-bold uppercase tracking-tighter shrink-0">
                    Cerrada
                  </span>
                ) : isEditingFinished ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0" />
                ) : null}
              </div>
            </div>
          </div>

          <div className="col-span-2 bg-white/[0.03] border border-white/10 rounded-sm p-3">
            <div className="flex items-center gap-3">
               <div className="flex-1">
                  <p className="text-[9px] text-white/40 uppercase tracking-widest font-mono mb-1.5">Seleccionar GP</p>
                  <select
                    style={{ colorScheme: "dark", backgroundColor: "#0d0d0d", color: "#fff" }}
                    className="w-full border border-white/10 py-1.5 px-2.5 text-xs outline-none focus:border-[#e10600] transition-colors cursor-pointer"
                    value={`${selectedSplitId}|${selectedCircuitoId}`}
                    onChange={(e) => {
                      const [sid, cid] = e.target.value.split("|");
                      setSelectedSplitId(sid);
                      if (cid) {
                        setSelectedCircuitoId(cid);
                      } else {
                        const s = splits.find(x => x.id === sid);
                        const next = getNextCircuitOfSplit(s?.circuitos) || s?.circuitos[0];
                        if (next) setSelectedCircuitoId(next.id);
                      }
                    }}
                  >
                     {splits.filter(s => s.id === selectedSplitId && isSplitUnlocked(s.id, splits)).map(s => (
                       <React.Fragment key={s.id}>
                         {s.circuitos.some((c: any) => !c.completado) && (
                           <optgroup label={`${s.nombre} · Pendientes`}>
                             {s.circuitos.filter((c: any) => !c.completado).map((c: any) => (
                               <option key={`${s.id}-${c.id}`} value={`${s.id}|${c.id}`}>
                                 {c.nombre}
                               </option>
                             ))}
                           </optgroup>
                         )}
                         {s.circuitos.some((c: any) => c.completado) && (
                           <optgroup label={`${s.nombre} · Finalizados`}>
                             {s.circuitos.filter((c: any) => c.completado).map((c: any) => (
                               <option key={`${s.id}-${c.id}`} value={`${s.id}|${c.id}`}>
                                 ✓ {c.nombre}
                               </option>
                             ))}
                           </optgroup>
                         )}
                       </React.Fragment>
                     ))}
                    <optgroup label="── Cambiar Split ──">
                      {splits.filter(s => s.id !== selectedSplitId && isSplitUnlocked(s.id, splits)).map(s => (
                        <option key={s.id} value={`${s.id}|`}>
                          {s.nombre}
                        </option>
                      ))}
                    </optgroup>
                  </select>
               </div>
            </div>
          </div>
        </div>

        {/* PROGRAMACIÓN DEL CIRCUITO */}
        <div className="bg-white/[0.03] border border-white/10 rounded-sm p-3 mb-4">
          <div className="flex items-center gap-2 mb-3 border-b border-white/5 pb-2">
            <Calendar className="w-3.5 h-3.5 text-[#e10600]" />
            <h3 className="font-bold text-[10px] uppercase tracking-wider text-white">Programación — {getCircuitName()}</h3>
          </div>
          <div className="grid grid-cols-1 max-w-2xl gap-3">
            <div className="grid grid-cols-4 gap-3">
              <div>
                <label className="block text-[9px] text-white/40 uppercase font-mono mb-1 font-bold">Nº carrera</label>
                <input type="number" min={1} max={20} value={numeroCarrera}
                  onChange={(e) => setNumeroCarrera(parseInt(e.target.value) || 1)}
                  className="w-full bg-white/[0.02] border border-white/10 rounded-sm py-1.5 px-2.5 text-xs text-white outline-none focus:border-[#e10600] transition-colors text-center"
                />
              </div>
              <div>
                <label className="block text-[9px] text-white/40 uppercase font-mono mb-1 font-bold">Fecha</label>
                <input type="date" value={fechaVal} onChange={(e) => setFechaVal(e.target.value)}
                  className="w-full bg-white/[0.02] border border-white/10 rounded-sm py-1.5 px-2.5 text-xs text-white outline-none focus:border-[#e10600] transition-colors"
                />
              </div>
              <div>
                <label className="block text-[9px] text-white/40 uppercase font-mono mb-1 font-bold">Hora</label>
                <input type="time" value={horaVal} onChange={(e) => setHoraVal(e.target.value)}
                  className="w-full bg-white/[0.02] border border-white/10 rounded-sm py-1.5 px-2.5 text-xs text-white outline-none focus:border-[#e10600] transition-colors"
                />
              </div>
              <div className="flex items-end">
                <button onClick={handleSaveSchedule} disabled={isSavingSchedule}
                  className="w-full border border-white/10 text-white/80 text-[9px] font-bold uppercase tracking-wider py-1.5 px-3 rounded-sm transition-all flex items-center justify-center gap-1.5 hover:bg-white/[0.06] cursor-pointer disabled:opacity-40"
                >
                  {isSavingSchedule ? <Loader2 className="w-3 h-3 animate-spin" /> : "Guardar"}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-[9px] text-white/40 uppercase font-mono mb-1 font-bold">URL Hotlap (YouTube)</label>
              <input type="url" value={hotlapUrl} onChange={(e) => setHotlapUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
                className="w-full bg-white/[0.02] border border-white/10 rounded-sm py-1.5 px-2.5 text-xs text-white outline-none focus:border-[#e10600] transition-colors font-mono"
              />
            </div>
          </div>
        </div>
        
        {currentRawSplit && (
          <div>
            <AdminRivalryControlPanel split={currentRawSplit} />
            <div className="mt-3 flex items-center gap-3">
              <button
                onClick={async () => {
                  if (!currentRawSplit || !selectedSplitId) return;
                  setSavingRivalries(true);
                  setRivalriesMsg("");
                  try {
                    const rivalries = buildRivalryTable(currentRawSplit);
                    await updateDoc(doc(db, "splits", selectedSplitId), { rivalries });
                    setRivalriesMsg("Rivalidades guardadas correctamente.");
                  } catch (e: any) {
                    setRivalriesMsg(`Error: ${e.message}`);
                  } finally {
                    setSavingRivalries(false);
                  }
                }}
                disabled={savingRivalries}
                className="px-4 py-2 bg-[#e10600] hover:bg-[#c10500] disabled:opacity-50 text-white text-xs font-bold uppercase tracking-widest transition-colors"
              >
                {savingRivalries ? "Guardando…" : "Guardar Rivalidades"}
              </button>
              {rivalriesMsg && (
                <span className="text-xs font-mono text-white/60">{rivalriesMsg}</span>
              )}
            </div>
          </div>
        )}

        <section className="bg-white/[0.03] border border-white/10 p-4 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#e10600]/5 blur-[100px] -mr-32 -mt-32 rounded-full" />

          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-3">
            <div>
              <h2 className="text-base font-black italic tracking-tighter text-white flex items-center gap-2.5">
                <span className="w-1 h-5 bg-[#e10600] block" />
                {isActaCerrada ? "Acta cerrada" : isEditingFinished ? "Corrección de resultados" : "Carga de resultados"}
              </h2>
              <p className="text-[10px] text-white/40 uppercase tracking-widest mt-1 font-mono">
                {isActaCerrada
                  ? "Este acta no se puede modificar"
                  : isEditingFinished ? `Edición GP: ${getCircuitName()}` : `Registro GP: ${getCircuitName()}`}
              </p>
            </div>

            <div className="flex items-center gap-2">
              {((Object.values(qualyCount) as number[]).some(c => c > 1) || (Object.values(raceCount) as number[]).some(c => c > 1)) && (
                <div className="text-[9px] text-amber-400 font-mono flex items-center gap-1 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 mr-1 max-w-xs">
                  <AlertCircle className="w-3 h-3 flex-shrink-0" />
                  <span>Posiciones duplicadas (en ámbar)</span>
                </div>
              )}

              {isEditingFinished && !isActaCerrada && (
                <button
                  onClick={handleCerrarActa}
                  className="px-4 py-1.5 rounded-sm border border-red-500/30 text-red-500 text-[10px] font-black uppercase hover:bg-red-500/10 transition-all"
                >
                  Cerrar Acta
                </button>
              )}

              {isActaCerrada && (
                <button
                  disabled={procesandoEconomia}
                  onClick={async () => {
                    setProcesandoEconomia(true);
                    setEconomiaMsg("");
                    const currentSplit = splits.find(s => s.id === selectedSplitId);
                    const sortedCircs = [...(currentSplit?.circuitos ?? [])]
                      .sort((a: any, b: any) => (a.numero_carrera ?? 9999) - (b.numero_carrera ?? 9999));
                    const circIdx = sortedCircs.findIndex((c: any) => c.id === selectedCircuitoId);
                    const prevIds = circIdx > 0 ? sortedCircs.slice(0, circIdx).map((c: any) => c.id) : [];
                    const result = await procesarEconomiaCarrera(
                      selectedSplitId,
                      selectedCircuitoId,
                      getCircuitName(),
                      undefined,
                      prevIds
                    );
                    setEconomiaMsg(result.message);
                    setProcesandoEconomia(false);
                  }}
                  className="px-4 py-1.5 rounded-sm border border-amber-500/40 text-amber-400 text-[10px] font-black uppercase hover:bg-amber-500/10 transition-all disabled:opacity-50 flex items-center gap-1.5"
                >
                  {procesandoEconomia ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                  {procesandoEconomia ? "Procesando..." : "Procesar Economía"}
                </button>
              )}

              <button
                onClick={handleSubmit}
                disabled={loading || isActaCerrada}
                className="group relative bg-[#e10600] px-5 py-1.5 rounded-sm font-black text-[10px] uppercase hover:bg-red-700 transition-all shadow-lg shadow-red-900/30 overflow-hidden active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                <span className="relative z-10 flex items-center gap-1.5">
                  {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin text-white" /> : (isEditingFinished ? "Guardar Corrección" : "Procesar Carrera")}
                </span>
                <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
              </button>
            </div>
          </div>

          {/* Acciones sobre puntos del split */}
          <div className="flex flex-wrap items-center gap-2 border-t border-white/[0.04] pt-3 mt-2">
            <span className="text-[9px] font-mono text-white/20 uppercase tracking-widest mr-1">Split:</span>
            <button
              onClick={async () => {
                if (!selectedSplitId) return;
                if (!confirm(`¿Resetear puntos y circuitos de ${selectedSplitId}? Los resultados se conservan.`)) return;
                setResetPointsLoading(true);
                try {
                  const [equiposSnap, circSnap] = await Promise.all([
                    getDocs(collection(db, `splits/${selectedSplitId}/equipos`)),
                    getDocs(collection(db, `splits/${selectedSplitId}/circuitos`)),
                  ]);
                  const b1 = writeBatch(db);
                  for (const equipoDoc of equiposSnap.docs) {
                    const pilotosSnap = await getDocs(
                      collection(db, `splits/${selectedSplitId}/equipos/${equipoDoc.id}/pilotos`)
                    );
                    pilotosSnap.docs.forEach(d => b1.update(d.ref, {
                      puntos_piloto: 0, victorias: 0, podios: 0,
                      poles: 0, dnfs: 0, carreras_limpias: 0,
                    }));
                  }
                  await b1.commit();
                  const b2 = writeBatch(db);
                  circSnap.docs.forEach(d => b2.update(d.ref, {
                    completado: false, economia_procesada: false,
                  }));
                  await b2.commit();
                  setMsg("Puntos y circuitos reseteados. Resultados conservados.");
                  setTimeout(() => setMsg(""), 5000);
                } catch (err: any) {
                  setMsg("Error reset: " + err.message);
                } finally {
                  setResetPointsLoading(false);
                }
              }}
              disabled={resetPointsLoading || !selectedSplitId}
              className="px-3 py-1 bg-[#e10600]/[0.06] hover:bg-[#e10600]/15 border border-[#e10600]/20 text-[9px] uppercase font-bold tracking-wider text-[#e10600]/60 hover:text-[#e10600] transition-colors disabled:opacity-40 flex items-center gap-1"
            >
              {resetPointsLoading ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : null}
              Reset circuitos
            </button>
          </div>

          {economiaMsg && (
            <div className="mt-3 px-4 py-2.5 bg-amber-500/10 border border-amber-500/20 rounded-sm text-xs text-amber-400 font-mono">
              {economiaMsg}
            </div>
          )}

          <AnimatePresence>
            {msg && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-3 overflow-hidden"
              >
                <div className={`p-3 border rounded-sm flex items-center gap-2.5 text-xs ${
                  msg.toLowerCase().includes("error")
                  ? "bg-red-500/10 border-red-500/20 text-red-400"
                  : "bg-green-500/10 border-green-500/20 text-green-400"
                }`}>
                  {msg.toLowerCase().includes("error") ? <AlertCircle className="w-4 h-4 flex-shrink-0" /> : <CheckCircle2 className="w-4 h-4 flex-shrink-0" />}
                  <span className="font-medium">{msg}</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="overflow-x-auto -mx-4 px-4">
            <table className="w-full text-sm text-left border-collapse">
              <thead>
                <tr className="text-[9px] text-white/30 uppercase tracking-[0.2em] font-mono border-b border-white/10 pb-2">
                  <th className="pb-2 pl-3 font-normal">Piloto</th>
                  <th className="pb-2 font-normal">Qualy</th>
                  <th className="pb-2 font-normal">Race</th>
                  <th className="pb-2 text-center font-normal">DNF</th>
                  <th className="pb-2 text-center font-normal">SANC</th>
                  {selectedSplitId !== "split_3" && <th className="pb-2 text-center font-normal">ADEL</th>}
                  {selectedSplitId !== "split_3" && <th className="pb-2 text-center font-normal">DOTD</th>}
                  <th className="pb-2 text-center font-normal">MVP</th>
                  <th className="pb-2 text-center font-normal">V.R</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {(splits.find(s => s.id === selectedSplitId)?.roster || [])
                  .filter((pilot: any) => canPilotParticipateInRace(pilot, numeroCarrera))
                  .map((p: any, i: number) => {
                  const isPilotDnf = results[p.pilotoId]?.isDnfOwnError || false;
                  const qPosVal = results[p.pilotoId]?.qualyPos;
                  const isQualyDuplicated = typeof qPosVal === "number" && (qualyCount[qPosVal] || 0) > 1;
                  const rPosVal = results[p.pilotoId]?.racePos;
                  const isRaceDuplicated = !isPilotDnf && typeof rPosVal === "number" && (raceCount[rPosVal] || 0) > 1;
                  return (
                    <tr key={`pilot-row-${p.pilotoId}-${i}`} className="group border-b border-white/5 hover:bg-white/5 transition-colors">
                      <td className="py-2.5 pl-3">
                        <div className="flex items-center gap-2.5">
                          <span className="text-[10px] font-mono text-white/20 w-4">{i+1}</span>
                          <div>
                            <EditableName
                              pilotId={p.pilotoId}
                              initialName={p.nombre}
                              className="font-bold tracking-tight group-hover:text-[#e10600]"
                              onSave={handleUpdatePilotName}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="py-2.5">
                        <input
                          type="number"
                          min="1"
                          max="15"
                          className={`w-12 bg-[#1a1a1a]/50 border rounded-sm px-2 py-1.5 text-center outline-none focus:border-[#e10600] transition-colors font-mono text-xs disabled:opacity-40 ${
                            isQualyDuplicated
                              ? "border-amber-500/60 text-amber-300 bg-amber-500/5"
                              : "border-white/10 text-white"
                          }`}
                          title={isQualyDuplicated ? "¡Posición de Qualy duplicada!" : undefined}
                          disabled={isActaCerrada || isPilotDnf}
                          value={isPilotDnf ? "" : (qPosVal ?? "")} 
                          onChange={e => {
                            const val = parseInt(e.target.value);
                            handleUpdate(p.pilotoId, "qualyPos", isNaN(val) ? "" : val);
                          }}
                        />
                      </td>
                      <td className="py-2.5">
                        <input
                          type="number"
                          min="1"
                          max="15"
                          className={`w-12 bg-[#1a1a1a]/50 border rounded-sm px-2 py-1.5 text-center outline-none focus:border-[#e10600] transition-colors font-mono text-xs disabled:opacity-40 ${
                            isRaceDuplicated
                              ? "border-amber-500/60 text-amber-300 bg-amber-500/5"
                              : "border-white/10 text-white"
                          }`}
                          title={isRaceDuplicated ? "¡Posición de carrera duplicada!" : undefined}
                          disabled={isActaCerrada || isPilotDnf}
                          value={isPilotDnf ? "" : (rPosVal ?? "")}
                          onChange={e => {
                            const val = parseInt(e.target.value);
                            handleUpdate(p.pilotoId, "racePos", isNaN(val) ? "" : val);
                          }}
                        />
                      </td>
                      {selectedSplitId !== "split_3" && <td className="py-2.5 text-center">
                        <input type="checkbox" className="w-3.5 h-3.5 rounded border-white/10 bg-[#1a1a1a] text-[#e10600] accent-[#e10600] disabled:opacity-40"
                          disabled={isActaCerrada}
                          checked={results[p.pilotoId]?.isDnfOwnError || false}
                          onChange={e => {
                            const isDnf = e.target.checked;
                            if (isDnf) {
                              setResults(prev => ({
                                ...prev,
                                [p.pilotoId]: {
                                  ...prev[p.pilotoId],
                                  pilotoId: p.pilotoId,
                                  isDnfOwnError: true,
                                  racePos: 99,
                                  qualyPos: 99,
                                  isClean: true,
                                  overtakesBoost: false,
                                  isDotd: false,
                                  isMvp: false,
                                  fastestLap: false
                                }
                              }));
                            } else {
                              setResults(prev => ({
                                ...prev,
                                [p.pilotoId]: {
                                  ...prev[p.pilotoId],
                                  pilotoId: p.pilotoId,
                                  isDnfOwnError: false,
                                  racePos: undefined,
                                  qualyPos: undefined,
                                  isClean: true,
                                  overtakesBoost: false,
                                  isDotd: false,
                                  isMvp: false,
                                  fastestLap: false
                                }
                              }));
                            }
                          }}
                        />
                      </td>}
                      {selectedSplitId !== "split_3" && <td className="py-2.5 text-center">
                        <input type="checkbox" className="w-3.5 h-3.5 rounded border-white/10 bg-[#1a1a1a] text-[#e10600] accent-[#e10600] disabled:opacity-40"
                          disabled={isActaCerrada || isPilotDnf}
                          checked={isPilotDnf ? false : !(results[p.pilotoId]?.isClean ?? true)} onChange={e => handleUpdate(p.pilotoId, "isClean", !e.target.checked)} />
                      </td>}
                      <td className="py-2.5 text-center">
                        <input type="checkbox" className="w-3.5 h-3.5 rounded border-white/10 bg-[#1a1a1a] text-[#e10600] accent-[#e10600] disabled:opacity-40"
                          disabled={isActaCerrada || isPilotDnf}
                          checked={isPilotDnf ? false : (results[p.pilotoId]?.overtakesBoost || false)} onChange={e => handleUpdate(p.pilotoId, "overtakesBoost", e.target.checked)} />
                      </td>
                      <td className="py-2.5 text-center">
                        <input type="checkbox" className="w-3.5 h-3.5 rounded border-white/10 bg-[#1a1a1a] text-[#e10600] accent-[#e10600] disabled:opacity-40"
                          disabled={isActaCerrada || isPilotDnf}
                          checked={isPilotDnf ? false : (results[p.pilotoId]?.isDotd || false)} onChange={e => handleUpdate(p.pilotoId, "isDotd", e.target.checked)} />
                      </td>
                      <td className="py-2.5 text-center">
                        <input type="checkbox" className="w-3.5 h-3.5 rounded border-white/10 bg-[#1a1a1a] text-[#e10600] accent-[#e10600] disabled:opacity-40"
                          disabled={isActaCerrada || isPilotDnf}
                          checked={isPilotDnf ? false : (results[p.pilotoId]?.isMvp || false)} onChange={e => handleUpdate(p.pilotoId, "isMvp", e.target.checked)} />
                      </td>
                      <td className="py-2.5 text-center">
                        <input type="checkbox" className="w-3.5 h-3.5 rounded border-white/10 bg-[#1a1a1a] text-[#e10600] accent-[#e10600] disabled:opacity-40"
                          disabled={isActaCerrada || isPilotDnf}
                          checked={isPilotDnf ? false : (results[p.pilotoId]?.fastestLap || false)} onChange={e => handleUpdate(p.pilotoId, "fastestLap", e.target.checked)} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>


        {/* MOVER PILOTOS */}
        <section className="mt-5 bg-white/[0.03] border border-white/10 p-4 relative overflow-hidden">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-3">
            <div>
              <h2 className="text-sm font-black italic tracking-tighter text-white flex items-center gap-2.5">
                <span className="w-1 h-5 bg-[#e10600] block" />
                Edición de equipos y pilotos
              </h2>
              <p className="text-[9px] text-white/40 uppercase tracking-widest mt-1 font-mono">
                Gestión de transferencias, logos y fotos del split
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 bg-white/[0.02] p-1.5 border border-white/5">
                <span className="text-[9px] font-mono uppercase text-white/40">MERCADO:</span>
                <span className={`px-1.5 py-0.5 text-[9px] font-black uppercase tracking-widest ${
                  splits.find(s => s.id === selectedSplitId)?.fichajes_abiertos
                  ? "bg-green-500/20 text-green-400 border border-green-500/30"
                  : "bg-red-500/20 text-red-500 border border-red-500/30"
                }`}>
                  {splits.find(s => s.id === selectedSplitId)?.fichajes_abiertos ? "Abierto" : "Cerrado"}
                </span>
                <button onClick={handleToggleFichajes}
                  className="px-2.5 py-0.5 bg-white/10 hover:bg-white/25 text-[9px] uppercase font-bold tracking-wider transition-colors">
                  Cambiar
                </button>
              </div>
              <div className="flex items-center gap-1.5 bg-white/[0.02] p-1.5 border border-white/5">
                <span className="text-[9px] font-mono uppercase text-white/40">WEB PÚBLICA:</span>
                <span className={`px-1.5 py-0.5 text-[9px] font-black uppercase tracking-widest ${
                  splits.find(s => s.id === selectedSplitId)?.activo
                  ? "bg-[#e10600]/20 text-[#e10600] border border-[#e10600]/30"
                  : "bg-white/5 text-white/30 border border-white/10"
                }`}>
                  {splits.find(s => s.id === selectedSplitId)?.activo ? "Activo" : "Oculto"}
                </span>
                <button onClick={handleSetSplitActivo}
                  className="px-2.5 py-0.5 bg-white/10 hover:bg-white/25 text-[9px] uppercase font-bold tracking-wider transition-colors">
                  {splits.find(s => s.id === selectedSplitId)?.activo ? "Desactivar" : "Activar"}
                </button>
              </div>
            </div>
          </div>

          {/* Video Intro del Split */}
          <div className="mb-3 flex flex-col sm:flex-row items-start sm:items-center gap-2.5 border-t border-white/[0.04] pt-3">
            <span className="text-[10px] font-mono uppercase text-white/40 shrink-0 w-20">Video Intro</span>
            <input
              type="url"
              value={videoIntroUrl}
              onChange={e => setVideoIntroUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
              className="flex-1 min-w-0 bg-white/[0.02] border border-white/10 px-3 py-1.5 text-[10px] text-white outline-none focus:border-[#e10600] transition-colors font-mono"
            />
            <button
              onClick={handleSaveVideoIntro}
              disabled={savingVideoIntro}
              className="px-4 py-1.5 bg-white/10 hover:bg-white/20 text-[10px] uppercase font-bold tracking-wider transition-colors disabled:opacity-50 shrink-0 flex items-center gap-1.5"
            >
              {savingVideoIntro ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
              Guardar
            </button>
          </div>

          {/* Logos de escuderías */}
          <div className="mb-4 pb-4 border-b border-white/[0.04] space-y-1.5">
            <p className="text-[9px] font-mono uppercase tracking-[0.4em] text-white/20 mb-2">Logos de escuderías</p>
            {(currentRawSplit?.equipos || []).map((team: any) => {
              const editVal = logoEdits[team.id] ?? (team.logo_url ?? "");
              const isSavingL = savingLogo === team.id;
              return (
                <div key={team.id} className="flex items-center gap-2">
                  <span className="text-[10px] text-white/50 w-28 shrink-0 truncate font-mono">{team.nombre}</span>
                  <StorageImageUpload
                    storagePath={`logos/${selectedSplitId}/${team.id}`}
                    currentUrl={editVal || undefined}
                    onUpload={url => {
                      setLogoEdits(prev => ({ ...prev, [team.id]: url }));
                      handleSaveTeamLogo(team.id, url);
                    }}
                    size="sm"
                  />
                  <input
                    type="url"
                    value={editVal}
                    onChange={e => setLogoEdits(prev => ({ ...prev, [team.id]: e.target.value }))}
                    placeholder="o pega URL aquí"
                    className="flex-1 min-w-0 bg-white/[0.02] border border-white/10 px-2.5 py-1.5 text-[10px] text-white outline-none focus:border-[#e10600] transition-colors font-mono"
                  />
                  <button
                    onClick={() => handleSaveTeamLogo(team.id, editVal)}
                    disabled={isSavingL}
                    className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-[10px] uppercase font-bold tracking-wider transition-colors disabled:opacity-50 shrink-0 flex items-center gap-1"
                  >
                    {isSavingL ? <Loader2 className="w-3 h-3 animate-spin" /> : "OK"}
                  </button>
                </div>
              );
            })}
            {(currentRawSplit?.equipos || []).length === 0 && (
              <p className="text-[9px] font-mono text-white/15">Sin escuderías en este split</p>
            )}
          </div>

          {/* Fotos de pilotos */}
          <div className="mb-4 pb-4 border-b border-white/[0.04] space-y-1.5">
            <p className="text-[9px] font-mono uppercase tracking-[0.4em] text-white/20 mb-2">Fotos de pilotos</p>
            {(currentRawSplit?.roster || [])
              .slice()
              .sort((a: any, b: any) => (a.nombre || "").localeCompare(b.nombre || ""))
              .map((p: any) => {
                const usuario = (usuarios || []).find((u: any) => u.uid === p.pilotoId || u.piloto_id === p.pilotoId);
                const currentPhoto = usuario?.foto_url || p.foto_url || "";
                const editVal = photoEdits[p.pilotoId] ?? currentPhoto;
                const isSaving = savingPhoto === p.pilotoId;
                return (
                  <div key={p.pilotoId} className="flex items-center gap-2">
                    {/* Preview */}
                    <div className="w-8 h-8 rounded-full overflow-hidden border border-white/10 shrink-0 bg-white/[0.02] flex items-center justify-center">
                      {currentPhoto ? (
                        <img src={currentPhoto} className="w-full h-full object-cover" />
                      ) : (
                        <UserIcon className="w-4 h-4 text-white/10" />
                      )}
                    </div>
                    <span className="text-[10px] text-white/50 w-24 shrink-0 truncate font-mono">{p.nombre}</span>
                    <StorageImageUpload
                      storagePath={`fotos/pilotos/${p.pilotoId}`}
                      currentUrl={currentPhoto || undefined}
                      onUpload={url => handleSavePilotPhoto(p.pilotoId, url)}
                      size="sm"
                    />
                    <input
                      type="url"
                      value={editVal}
                      onChange={e => setPhotoEdits(prev => ({ ...prev, [p.pilotoId]: e.target.value }))}
                      placeholder="o pega URL aquí"
                      className="flex-1 min-w-0 bg-white/[0.02] border border-white/10 px-2.5 py-1.5 text-[10px] text-white outline-none focus:border-[#e10600] transition-colors font-mono"
                    />
                    <button
                      onClick={() => handleSavePilotPhoto(p.pilotoId, editVal)}
                      disabled={isSaving}
                      className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-[10px] uppercase font-bold tracking-wider transition-colors disabled:opacity-50 shrink-0 flex items-center gap-1"
                    >
                      {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : "OK"}
                    </button>
                  </div>
                );
              })}
            {(currentRawSplit?.roster || []).length === 0 && (
              <p className="text-[9px] font-mono text-white/15">Sin pilotos en este split</p>
            )}
          </div>

          {!isSelectedSplitInitialized && selectedSplitId !== "split_1" && (
            <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/30 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
              <div>
                <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider">⚠️ Split no inicializado</h4>
                <p className="text-[10px] text-white/60 mt-0.5 max-w-2xl">
                  Este split hereda dinámicamente el plantel del anterior. Inicialízalo para poder mover pilotos de forma independiente.
                </p>
              </div>
              <button onClick={() => handleSyncSplitRosters(selectedSplitId)}
                className="bg-amber-500 hover:bg-amber-600 text-black px-3 py-1.5 text-[10px] font-black uppercase tracking-wider shrink-0 transition-colors cursor-pointer">
                Inicializar Split
              </button>
            </div>
          )}

          {/* Inscribir usuario como piloto */}
          <div className="mb-4 border border-white/[0.08] bg-[#08090c] p-4">
            <div className="flex flex-col lg:flex-row lg:items-end gap-3">
              <div className="flex-1 min-w-0">
                <label className="block text-[9px] font-mono uppercase tracking-[0.3em] text-white/35 mb-2">Usuario registrado</label>
                <select
                  value={pilotUserToAssign}
                  onChange={event => setPilotUserToAssign(event.target.value)}
                  style={{ colorScheme: "dark", backgroundColor: "#0d0d0f" }}
                  className="w-full border border-white/10 px-3 py-2.5 text-xs text-white outline-none focus:border-[#e10600]"
                >
                  <option value="">Seleccionar usuario</option>
                  {assignableUsers.map((user: any) => (
                    <option key={user.uid} value={user.uid}>{user.nombre || user.email} · {user.email}</option>
                  ))}
                </select>
              </div>

              {currentRawSplit?.tipo !== "individual" && (currentRawSplit?.equipos || []).length > 0 && (
                <div className="w-full lg:w-56">
                  <label className="block text-[9px] font-mono uppercase tracking-[0.3em] text-white/35 mb-2">Escudería</label>
                  <select
                    value={pilotTeamToAssign}
                    onChange={event => setPilotTeamToAssign(event.target.value)}
                    style={{ colorScheme: "dark", backgroundColor: "#0d0d0f" }}
                    className="w-full border border-white/10 px-3 py-2.5 text-xs text-white outline-none focus:border-[#e10600]"
                  >
                    {(currentRawSplit?.equipos || []).map((team: any) => (
                      <option key={team.id} value={team.id}>{team.nombre}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="w-full lg:w-48 border border-white/[0.08] bg-white/[0.03] px-3 py-2">
                <span className="block text-[8px] font-mono uppercase tracking-[0.25em] text-white/30">Media inicial automática</span>
                <strong className={`block mt-1 text-sm ${assignmentPreview?.rookie ? "text-sky-300" : "text-white"}`}>
                  {assignmentPreview
                    ? assignmentPreview.rookie
                      ? "Rookie · 70 OVR"
                      : `${assignmentPreview.rating} OVR · heredada`
                    : "Selecciona usuario"}
                </strong>
              </div>

              <button
                onClick={handleAssignUserAsPilot}
                disabled={!pilotUserToAssign || !pilotTeamToAssign || assigningPilot}
                className="min-h-11 px-5 bg-[#e10600] hover:bg-[#ff241c] text-white text-[10px] font-black uppercase tracking-[0.18em] disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {assigningPilot && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Inscribir piloto
              </button>
            </div>
            <p className="mt-3 text-[9px] font-mono text-white/25">
              La media se hereda de la última temporada disputada. Sin historial, el piloto debuta como Rookie con 70 OVR.
            </p>
          </div>

          {/* Tabla de pilotos con mover */}
          <div className="overflow-x-auto border border-white/[0.06]">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="border-b border-white/[0.06] text-[9px] uppercase tracking-[0.25em] text-white/25 font-normal">
                  <th className="py-2 px-3 text-left font-normal">Piloto</th>
                  <th className="py-2 px-3 text-left font-normal">Equipo actual</th>
                  <th className="py-2 px-3 text-left font-normal">Precio next split</th>
                   <th className="py-2 px-3 text-left font-normal">Mover a</th>
                   <th className="py-2 px-3 text-right font-normal">Participación</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {(currentRawSplit?.roster || [])
                  .slice()
                  .sort((a: any, b: any) => (a.equipoId || "").localeCompare(b.equipoId || "") || (a.nombre || "").localeCompare(b.nombre || ""))
                  .map((p: any) => {
                        const teamNombre = p.equipoId === "agente_libre"
                          ? "Agente Libre"
                          : (currentRawSplit?.equipos || []).find((e: any) => e.id === p.equipoId)?.nombre || p.equipoId || "Agente Libre";
                    return (
                      <tr key={p.pilotoId} className="hover:bg-white/[0.02] transition-colors">
                        <td className="py-2 px-3 font-bold text-white/90">{p.nombre}</td>
                        <td className="py-2 px-3 text-white/40 font-mono text-[10px]">{teamNombre}</td>
                      <td className="py-2 px-3 text-white/40 font-mono text-[10px]">
                        {typeof p.pending_precio_compra === "number" ? `${p.pending_precio_compra}M` : `${p.precio_compra ?? 0}M`}
                        {p.pending_precio_compra != null && <span className="block text-[9px] text-white/30">siguiente split</span>}
                      </td>
                        <td className="py-2 px-3">
                          {currentRawSplit?.tipo === "individual" ? (
                            <span className="text-[9px] font-mono uppercase text-white/25">Sin equipos</span>
                          ) : (
                            <select
                              style={{ colorScheme: "dark", backgroundColor: "#0d0d0d" }}
                              className="border border-white/10 px-2 py-1 text-[10px] text-white outline-none focus:border-[#e10600] transition-colors cursor-pointer"
                              value={p.equipoId || "agente_libre"}
                              onChange={e => {
                                const dest = e.target.value;
                                if (dest !== p.equipoId) {
                                  handleMovePilotOriginal(p.pilotoId, p.nombre, p.equipoId || "agente_libre", dest, p);
                                }
                              }}
                            >
                              {(currentRawSplit?.equipos || []).map((e: any) => (
                                <option key={e.id} value={e.id}>{e.nombre}</option>
                              ))}
                              <option value="agente_libre">Agente Libre</option>
                            </select>
                          )}
                        </td>
                        <td className="py-2 px-3 text-right">
                           {p.participa_hasta != null && p.equipoId !== "agente_libre" ? (
                            <span className="text-[9px] font-mono uppercase tracking-wider text-white/25">Hasta C{p.participa_hasta}</span>
                          ) : (
                            <button
                              onClick={() => setConfirmModal({
                                isOpen: true,
                                title: "Finalizar participación",
                                message: `${p.nombre} dejará de participar en ${currentRawSplit?.nombre}. Sus resultados anteriores se conservarán.`,
                                onConfirm: () => handleEndPilotParticipation(p),
                              })}
                              disabled={endingPilotId === p.pilotoId}
                              className="px-3 py-1.5 border border-red-500/25 bg-red-500/10 text-red-300 hover:bg-red-500/20 text-[9px] font-black uppercase tracking-wider disabled:opacity-40"
                            >
                              {endingPilotId === p.pilotoId ? "Procesando" : "Finalizar"}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                {(currentRawSplit?.roster || []).length === 0 && (
                  <tr><td colSpan={3} className="py-8 text-center text-[10px] font-mono text-white/15 uppercase tracking-widest">Sin pilotos en este split</td></tr>
                )}
              </tbody>
            </table>
          </div>

        </section>

        {/* Paddock */}

          </>
        )}

        {confirmModal && confirmModal.isOpen && (
          <div className="fixed inset-0 bg-black/85 z-50 flex items-center justify-center p-4">
            <div className="bg-[#0a0a0a] border border-white/10 p-4 max-w-sm w-full relative text-left">
              <h3 className="text-sm font-black text-white uppercase tracking-tight mb-2 flex items-center gap-2">
                <span className="w-1 h-4 bg-[#e10600]" />
                {confirmModal.title}
              </h3>
              <p className="text-xs text-white/60 leading-relaxed mb-4">{confirmModal.message}</p>
              <div className="flex justify-end gap-2 font-semibold text-[10px] uppercase tracking-wider">
                <button
                  onClick={() => setConfirmModal(null)}
                  className="px-3 py-2 bg-white/5 hover:bg-white/10 text-white rounded-sm transition-colors border border-white/5"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    confirmModal.onConfirm();
                    setConfirmModal(null);
                  }}
                  className="px-3 py-2 bg-[#e10600] text-white rounded-sm hover:bg-red-700 transition-colors shadow-lg shadow-red-900/30"
                >
                  Confirmar
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

interface EditableNameProps {
  pilotId: string;
  initialName: string;
  className?: string;
  onSave: (id: string, name: string) => Promise<void>;
}

function EditableName({ pilotId, initialName, className = "", onSave }: EditableNameProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(initialName);

  useEffect(() => {
    setName(initialName);
  }, [initialName]);

  const handleBlurOrSubmit = () => {
    setIsEditing(false);
    if (name.trim() && name.trim() !== initialName.trim()) {
      onSave(pilotId, name.trim());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleBlurOrSubmit();
    } else if (e.key === "Escape") {
      setName(initialName);
      setIsEditing(false);
    }
  };

  if (isEditing) {
    return (
      <input
        type="text"
        className="bg-[#1a1a1a] text-white font-bold px-2 py-0.5 rounded border border-[#e10600] outline-none text-xs w-32 font-sans focus:ring-1 focus:ring-[#e10600]"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onBlur={handleBlurOrSubmit}
        onKeyDown={handleKeyDown}
        onClick={(e) => e.stopPropagation()}
        autoFocus
      />
    );
  }

  return (
    <span
      onClick={(e) => {
        e.stopPropagation();
        setIsEditing(true);
      }}
      title="Click para editar nombre de piloto"
      className={`${className} cursor-pointer hover:underline decoration-dashed decoration-[#e10600] hover:text-white px-1 py-0.5 rounded transition-all inline-flex items-center gap-1`}
    >
      {name}
      <span className="opacity-0 group-hover:opacity-60 text-[9px] text-[#e10600] font-mono select-none">✏️</span>
    </span>
  );
}
