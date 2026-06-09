import React, { useState, useEffect, useMemo } from "react";
import { UserHeader } from "./Dashboards";
import { useUsuarios, useSplits } from "../hooks/useData";
import { processRace, RaceResult } from "../services/raceProcessor";
import { procesarEconomiaCarrera } from "../services/economyService";
import { db } from "../services/firebase";
import { doc, updateDoc, getDoc, collection, addDoc, setDoc, deleteDoc, getDocs, onSnapshot } from "firebase/firestore";
import { Calendar, AlertCircle, CheckCircle2, Loader2, User as UserIcon } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { isSplitUnlocked } from "../utils/splitResolver";
import { SuggestionsView } from "./SuggestionsView";
import { AdminRivalryControlPanel } from "./RivalryPanels";
import { EconomyAdminPanel } from "./EconomyAdminPanel";
import { StorageImageUpload } from "./StorageImageUpload";

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

export function AdminDashboard() {
  const { usuarios } = useUsuarios();
  const { splits: rawSplits, loading: loadingSplits } = useSplits();
  const splits = rawSplits;
  const [selectedSplitId, setSelectedSplitId] = useState("");

  const currentRawSplit = useMemo(() => rawSplits.find(s => s.id === selectedSplitId), [rawSplits, selectedSplitId]);
  const isSelectedSplitInitialized = useMemo(() => {
    if (!selectedSplitId || selectedSplitId === "split_1") return true;
    if (!currentRawSplit) return false;
    return (currentRawSplit.roster?.length || 0) > 0;
  }, [selectedSplitId, currentRawSplit]);

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [plantilla, setPlantilla] = useState<any[]>([]);
  const [adminTab, setAdminTab] = useState<"championship" | "suggestions" | "economy">("championship");
  const [videoIntroUrl, setVideoIntroUrl] = useState("");
  const [savingVideoIntro, setSavingVideoIntro] = useState(false);
  const [logoEdits, setLogoEdits] = useState<Record<string, string>>({});
  const [savingLogo, setSavingLogo] = useState<string | null>(null);

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

  const paddockUsers = useMemo(() => {
    const mergedByIdentity: Record<string, any> = {};

    const preferUser = (existing: any, candidate: any) => {
      const existingHasEmail = Boolean(existing?.email?.trim());
      const candidateHasEmail = Boolean(candidate?.email?.trim());

      if (existingHasEmail && !candidateHasEmail) return existing;
      if (!existingHasEmail && candidateHasEmail) return candidate;

      if (existing.rol === "piloto" && candidate.rol !== "piloto") return existing;
      if (candidate.rol === "piloto" && existing.rol !== "piloto") return candidate;

      return existing;
    };

    usuarios.forEach((user: any) => {
      const identity = user.piloto_id || user.uid || user.id || "";
      if (!identity) return;

      if (!mergedByIdentity[identity]) {
        mergedByIdentity[identity] = user;
        return;
      }

      mergedByIdentity[identity] = preferUser(mergedByIdentity[identity], user);
    });

    return Object.values(mergedByIdentity);
  }, [usuarios]);

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

  const handleUpdatePilotProps = async (_teamId: string, pilotId: string, props: any) => {
    if (!selectedSplitId) return;
    setLoading(true);
    try {
      await setDoc(doc(db, `splits/${selectedSplitId}/roster`, pilotId), {
        clausula_actual: Number(props.clausula_actual || 0),
        precio_compra: Number(props.precio_compra || props.precio_compra_split || 0),
        puntos_piloto: Number(props.puntos_piloto || 0)
      }, { merge: true });
      await setDoc(doc(db, "pilotos", pilotId), {
        rating_piloto: Number(props.rating_piloto || 0)
      }, { merge: true });
      setEditStates(prev => {
        const copy = { ...prev };
        delete copy[pilotId];
        return copy;
      });
      setMsg(`Piloto actualizado en este Split.`);
      setTimeout(() => {
        setMsg("");
      }, 4000);
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
      const rating = Number(pData.rating_piloto ?? pData.raw?.rating_piloto ?? 70);
      const clause = Number(pData.clausula_actual ?? pData.raw?.clausula_actual ?? Math.round(rating * 0.5));

      const currentSplit = splits.find(s => s.id === selectedSplitId);

      // Adjust team budgets
      if (fromTeamId && fromTeamId !== "agente_libre") {
        const fromTeam = currentSplit?.equipos?.find((e: any) => e.id === fromTeamId);
        const newFromBudget = Number(((fromTeam?.presupuesto ?? 100) + clause).toFixed(1));
        await setDoc(doc(db, `splits/${selectedSplitId}/equipos`, fromTeamId), { presupuesto: newFromBudget }, { merge: true });
      }
      if (toTeamId && toTeamId !== "agente_libre") {
        const toTeam = currentSplit?.equipos?.find((e: any) => e.id === toTeamId);
        const newToBudget = Number(((toTeam?.presupuesto ?? 100) - clause).toFixed(1));
        await setDoc(doc(db, `splits/${selectedSplitId}/equipos`, toTeamId), { presupuesto: newToBudget }, { merge: true });
      }

      // Keep user's escuderia_id in sync
      const matchedUser = usuarios.find(u => u.uid === pilotId || (u.piloto_id && u.piloto_id === pilotId));
      if (matchedUser) {
        await setDoc(doc(db, "usuarios", matchedUser.uid), {
          escuderia_id: toTeamId === "agente_libre" ? "" : toTeamId
        }, { merge: true });
      }

      const existingEntry = currentSplit?.roster.find(r => r.pilotoId === pilotId);
      const isFromFreeAgent = !fromTeamId || fromTeamId === "agente_libre";

      if (toTeamId === "agente_libre") {
        await deleteDoc(doc(db, `splits/${selectedSplitId}/roster`, pilotId));
      } else {
        const precioCompra = existingEntry?.precio_compra ?? pData.precio_compra ?? pData.precio_compra_split ?? 10;
        await setDoc(doc(db, `splits/${selectedSplitId}/roster`, pilotId), {
          pilotoId: pilotId,
          equipoId: toTeamId,
          precio_compra: precioCompra,
          clausula_actual: existingEntry?.clausula_actual ?? clause,
          mantener_actual: existingEntry?.mantener_actual ?? clause,
          clausula_inicial_split: existingEntry?.clausula_inicial_split ?? clause,
          mantener_inicial_split: existingEntry?.mantener_inicial_split ?? clause,
          precio_carrera_anterior: existingEntry?.precio_carrera_anterior ?? precioCompra,
          historial_precios: existingEntry?.historial_precios ?? {},
          puntos_piloto: isFromFreeAgent ? 0 : (existingEntry?.puntos_piloto ?? pData.puntos_piloto ?? 0),
          victorias: isFromFreeAgent ? 0 : (existingEntry?.victorias ?? pData.victorias ?? 0),
          podios: isFromFreeAgent ? 0 : (existingEntry?.podios ?? pData.podios ?? 0),
          poles: isFromFreeAgent ? 0 : (existingEntry?.poles ?? pData.poles ?? 0),
          dnfs: isFromFreeAgent ? 0 : (existingEntry?.dnfs ?? pData.dnfs ?? 0),
          carreras_limpias: isFromFreeAgent ? 0 : (existingEntry?.carreras_limpias ?? pData.carreras_limpias ?? 0),
        }, { merge: true });

        // Ensure pilot exists in global pilotos collection
        await setDoc(doc(db, "pilotos", pilotId), {
          nombre: pilotName || pData.nombre || "Piloto",
          rating_piloto: rating,
        }, { merge: true });
      }

      let budgetStr = "";
      if (fromTeamId !== "agente_libre" && toTeamId !== "agente_libre") {
        budgetStr = ` (${fromTeamId} +${clause}M, ${toTeamId} -${clause}M)`;
      } else if (fromTeamId !== "agente_libre") {
        budgetStr = ` (${fromTeamId} +${clause}M por rescisión)`;
      } else if (toTeamId !== "agente_libre") {
        budgetStr = ` (${toTeamId} -${clause}M por fichaje)`;
      }

      await addDoc(collection(db, `splits/${selectedSplitId}/transfers`), {
        detalles: `Admin transfirió a ${pilotName} de ${fromTeamId} a ${toTeamId}${budgetStr}`,
        timestamp: new Date().toISOString(),
        tipo: "admin"
      });

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
          const sortedSplits = [...splits].sort((a, b) => a.id.localeCompare(b.id));
          const currentIndex = sortedSplits.findIndex(s => s.id === splitId);
          if (currentIndex <= 0) {
            setMsg("Error: No se puede inicializar el Split 1 desde un split anterior.");
            setLoading(false);
            return;
          }
          const prevSplit = sortedSplits[currentIndex - 1];
          setMsg(`Leyendo roster de ${prevSplit.nombre}...`);

          // Copy equipos from prev split (reset budget/points)
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

          // Clear existing roster for this split
          const existingRosterSnap = await getDocs(collection(db, `splits/${splitId}/roster`));
          for (const rDoc of existingRosterSnap.docs) {
            await deleteDoc(doc(db, `splits/${splitId}/roster`, rDoc.id));
          }

          // Read current ratings from global pilotos collection
          const pilotosSnap = await getDocs(collection(db, "pilotos"));
          const pilotMap: Record<string, any> = {};
          pilotosSnap.docs.forEach(d => { pilotMap[d.id] = d.data(); });

          // Copy prev split roster with resetted stats and inherited rating
          const prevRosterSnap = await getDocs(collection(db, `splits/${prevSplit.id}/roster`));
          let pilotsInitialized = 0;

          // Track budget adjustments per team for pending transfers
          const budgetAdjustments: Record<string, number> = {};

          for (const rDoc of prevRosterSnap.docs) {
            const r = rDoc.data();
            const pid = rDoc.id;
            const inheritedRating = pilotMap[pid]?.rating_piloto ?? 70;
            const precioCompra = r.precio_compra ?? 10;
            const currentClausula = r.clausula_actual ?? Math.round(precioCompra * 2 * 10) / 10;
            const mantenerInicial = Math.round(precioCompra * 3 * 10) / 10;
            const clausulaInicial = Math.round(precioCompra * 2 * 10) / 10;

            const nextEquipoId = r.pending_equipoId ?? r.equipoId;
            const nextPrecioCompra = r.pending_precio_compra ?? precioCompra;
            const isFreezeSentinel = nextPrecioCompra === -110;
            const nextMantener = isFreezeSentinel
              ? Math.round((r.mantener_actual ?? precioCompra * 3) * 10) / 10
              : Math.round(Math.abs(nextPrecioCompra) * 3 * 10) / 10;
            const nextClausula = isFreezeSentinel
              ? Math.round((r.clausula_actual ?? precioCompra * 2) * 10) / 10
              : Math.round(Math.abs(nextPrecioCompra) * 2 * 10) / 10;

            // Track budget adjustments for pending transfers
            if (r.pending_equipoId && r.pending_equipoId !== r.equipoId) {
              // Piloto se va del equipo actual: suma cláusula
              budgetAdjustments[r.equipoId] = (budgetAdjustments[r.equipoId] || 0) + currentClausula;
              // Piloto entra al equipo destino: resta precio_compra pendiente
              budgetAdjustments[nextEquipoId] = (budgetAdjustments[nextEquipoId] || 0) - nextPrecioCompra;
            }

            await setDoc(doc(db, `splits/${splitId}/roster`, pid), {
              pilotoId: pid,
              equipoId: nextEquipoId,
              tipo_fichaje: r.pending_tipo_fichaje ?? r.tipo_fichaje,
              puntos_piloto: 0,
              victorias: 0,
              podios: 0,
              poles: 0,
              dnfs: 0,
              carreras_limpias: 0,
              precio_compra: nextPrecioCompra,
              mantener_actual: nextMantener,
              clausula_actual: nextClausula,
              mantener_inicial_split: nextMantener,
              clausula_inicial_split: nextClausula,
              precio_carrera_anterior: nextMantener,
              historial_precios: {},
              congelado: isFreezeSentinel,
              congelado_en: undefined,
            });

            // Persist inherited rating back to global pilotos
            if (pilotMap[pid]) {
              await setDoc(doc(db, "pilotos", pid), { rating_piloto: inheritedRating }, { merge: true });
            }

            pilotsInitialized++;
          }

          // Apply budget adjustments for pending transfers
          for (const [teamId, delta] of Object.entries(budgetAdjustments)) {
            if (delta !== 0) {
              const newBudget = Math.round((100 + delta) * 10) / 10;
              await setDoc(doc(db, `splits/${splitId}/equipos`, teamId), {
                presupuesto: newBudget,
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
    const splitPilots = currentSplit?.roster || [];

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
    <div className="min-h-screen bg-[#0a0a0a] text-slate-100 p-8 pb-24">
      <div className="max-w-7xl mx-auto">
        <UserHeader title="Panel de Administración" />

        {/* Navigation Tabs */}
        <div className="flex flex-wrap border-b border-white/10 mb-8 gap-2">
          <button
            onClick={() => setAdminTab("championship")}
            className={`px-5 py-3 font-mono font-bold text-xs uppercase tracking-wider transition-all relative cursor-pointer ${
              adminTab === "championship"
                ? "text-white bg-white/5"
                : "text-white/40 hover:text-white/80 hover:bg-white/[0.02]"
            }`}
          >
            🏁 Gestión Carreras y Mercado
            {adminTab === "championship" && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#e10600]" />
            )}
          </button>
          <button
            onClick={() => setAdminTab("suggestions")}
            className={`px-5 py-3 font-mono font-bold text-xs uppercase tracking-wider transition-all relative cursor-pointer ${
              adminTab === "suggestions"
                ? "text-white bg-white/5 animate-pulse"
                : "text-white/40 hover:text-white/80 hover:bg-white/[0.02]"
            }`}
          >
            💡 Buzón de Mejoras
            {adminTab === "suggestions" && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#e10600]" />
            )}
          </button>
          <button
            onClick={() => setAdminTab("economy")}
            className={`px-5 py-3 font-mono font-bold text-xs uppercase tracking-wider transition-all relative cursor-pointer ${
              adminTab === "economy"
                ? "text-white bg-white/5"
                : "text-white/40 hover:text-white/80 hover:bg-white/[0.02]"
            }`}
          >
            💰 Economía
            {adminTab === "economy" && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#e10600]" />
            )}
          </button>
        </div>

        {adminTab === "suggestions" ? (
          <SuggestionsView isAdmin={true} />
        ) : adminTab === "economy" ? (
          <EconomyAdminPanel splits={splits} />
        ) : (
          <>
            {/* Navegación de Splits */}
        <div className="flex flex-wrap gap-2 mb-6">
          {splits.filter(s => isSplitUnlocked(s.id, splits)).map(s => (
            <button
              key={s.id}
              onClick={() => {
                setSelectedSplitId(s.id);
                const next = getNextCircuitOfSplit(s.circuitos) || s.circuitos[s.circuitos.length - 1];
                if (next) setSelectedCircuitoId(next.id);
              }}
              className={`px-4 py-2 rounded-sm font-black text-[10px] uppercase tracking-widest transition-all ${
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white/[0.03] border border-white/10 rounded-sm p-4 flex items-center gap-4">
            <div className="p-2 bg-[#e10600]/10 rounded-sm">
              <Calendar className="w-5 h-5 text-[#e10600]" />
            </div>
            <div className="flex-1">
              <p className="text-[10px] text-white/40 uppercase tracking-widest font-mono">Circuito Seleccionado</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="font-bold text-sm tracking-tight">{getCircuitName()}</span>
                {isActaCerrada ? (
                  <span className="flex items-center gap-1 text-[10px] bg-red-500/20 text-red-500 px-2 py-0.5 rounded-full font-bold uppercase tracking-tighter">
                    Acta Cerrada
                  </span>
                ) : isEditingFinished ? (
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                ) : null}
              </div>
            </div>
          </div>

          <div className="col-span-2 bg-white/[0.03] border border-white/10 rounded-sm p-4">
            <div className="flex items-center gap-4">
               <div className="flex-1">
                  <p className="text-[10px] text-white/40 uppercase tracking-widest font-mono mb-2 text-center md:text-left">Carga un nuevo GP o corrige uno Finalizado</p>
                  <select
                    style={{ colorScheme: "dark", backgroundColor: "#0d0d0d", color: "#fff" }}
                    className="w-full border border-white/10 py-2.5 px-3 text-xs outline-none focus:border-[#e10600] transition-colors cursor-pointer"
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
                        <optgroup label={`${s.nombre} · Pendientes`}>
                          {s.circuitos.filter((c: any) => !c.completado).map((c: any) => (
                            <option key={`${s.id}-${c.id}`} value={`${s.id}|${c.id}`}>
                              {c.nombre}
                            </option>
                          ))}
                        </optgroup>
                        <optgroup label={`${s.nombre} · Finalizados`}>
                          {s.circuitos.filter((c: any) => c.completado).map((c: any) => (
                            <option key={`${s.id}-${c.id}`} value={`${s.id}|${c.id}`}>
                              ✓ {c.nombre}
                            </option>
                          ))}
                        </optgroup>
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
        <div className="bg-white/[0.03] border border-white/10 rounded-sm p-5 mb-8">
          <div className="flex items-center gap-2 mb-4 border-b border-white/5 pb-2">
            <Calendar className="w-4 h-4 text-[#e10600]" />
            <h3 className="font-extrabold text-xs uppercase tracking-wider text-white">Programación de Carrera para {getCircuitName()}</h3>
          </div>
          
          <div className="grid grid-cols-1 max-w-xl gap-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-[10px] text-white/40 uppercase font-mono mb-1.5 font-bold">Nº Carrera en Split</label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={numeroCarrera}
                  onChange={(e) => setNumeroCarrera(parseInt(e.target.value) || 1)}
                  className="w-full bg-white/[0.02] border border-white/10 rounded-sm py-2 px-3 text-xs text-white outline-none focus:border-[#e10600] transition-colors text-center"
                />
              </div>
              <div>
                <label className="block text-[10px] text-white/40 uppercase font-mono mb-1.5 font-bold">Fecha de Carrera</label>
                <input
                  type="date"
                  value={fechaVal}
                  onChange={(e) => setFechaVal(e.target.value)}
                  className="w-full bg-white/[0.02] border border-white/10 rounded-sm py-2 px-3 text-xs text-white outline-none focus:border-[#e10600] transition-colors"
                />
              </div>
              <div>
                <label className="block text-[10px] text-white/40 uppercase font-mono mb-1.5 font-bold">Hora de Carrera</label>
                <input
                  type="time"
                  value={horaVal}
                  onChange={(e) => setHoraVal(e.target.value)}
                  className="w-full bg-white/[0.02] border border-white/10 rounded-sm py-2 px-3 text-xs text-white outline-none focus:border-[#e10600] transition-colors"
                />
              </div>
            </div>
            <div>
              <label className="block text-[10px] text-white/40 uppercase font-mono mb-1.5 font-bold">URL Hotlap del Circuito (YouTube)</label>
              <input
                type="url"
                value={hotlapUrl}
                onChange={(e) => setHotlapUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
                className="w-full bg-white/[0.02] border border-white/10 rounded-sm py-2 px-3 text-xs text-white outline-none focus:border-[#e10600] transition-colors font-mono"
              />
              <p className="text-[9px] text-white/30 mt-1 font-mono">Se mostrará a los pilotos durante la semana del GP (7 días antes de la carrera).</p>
            </div>
          </div>
          
          <div className="mt-4 flex justify-end">
            <button
              onClick={handleSaveSchedule}
              disabled={isSavingSchedule}
              className="bg-zinc-850 hover:bg-zinc-700 hover:text-white border border-white/10 text-white/95 text-[10px] font-bold uppercase tracking-wider py-2 px-6 rounded-sm transition-all flex items-center justify-center gap-1.5 shadow cursor-pointer"
            >
              {isSavingSchedule ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Guardar Programación"}
            </button>
          </div>
        </div>
        
        {currentRawSplit && (
          <AdminRivalryControlPanel split={currentRawSplit} />
        )}

        <section className="bg-white/[0.03] border border-white/10  p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#e10600]/5 blur-[100px] -mr-32 -mt-32 rounded-full" />
          
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
            <div>
              <h2 className="text-2xl font-black italic tracking-tighter text-white flex items-center gap-3 lowercase">
                <span className="w-1.5 h-8 bg-[#e10600] block" />
                {isActaCerrada ? "ACTA CERRADA" : isEditingFinished ? "CORREGIR RESULTADOS" : "CARGA DE RESULTADOS"}
              </h2>
              <p className="text-xs text-white/40 uppercase tracking-widest mt-2 font-mono">
                {isActaCerrada 
                  ? "Este acta no se puede modificar" 
                  : isEditingFinished ? `Edición GP: ${getCircuitName()}` : `Registro GP: ${getCircuitName()}`}
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              {((Object.values(qualyCount) as number[]).some(c => c > 1) || (Object.values(raceCount) as number[]).some(c => c > 1)) && (
                <div className="text-[10px] text-amber-400 font-mono flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-sm mr-2 max-w-xs">
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>Posiciones duplicadas (en ámbar)</span>
                </div>
              )}

              {isEditingFinished && !isActaCerrada && (
                <button
                  onClick={handleCerrarActa}
                  className="px-6 py-3 rounded-sm border border-red-500/30 text-red-500 text-xs font-black uppercase hover:bg-red-500/10 transition-all"
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
                  className="px-6 py-3 rounded-sm border border-amber-500/40 text-amber-400 text-xs font-black uppercase hover:bg-amber-500/10 transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  {procesandoEconomia ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                  {procesandoEconomia ? "Procesando..." : "Procesar Economía"}
                </button>
              )}

              <button
                onClick={handleSubmit}
                disabled={loading || isActaCerrada}
                className="group relative bg-[#e10600] px-8 py-3 rounded-sm font-black text-xs uppercase hover:bg-red-700 transition-all shadow-xl shadow-red-900/30 overflow-hidden active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                <span className="relative z-10 flex items-center gap-2">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : (isEditingFinished ? "Guardar Corrección" : "Procesar Carrera")}
                </span>
                <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
              </button>
            </div>
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
                className={`mb-6 overflow-hidden`}
              >
                <div className={`p-4 border rounded-sm flex items-center gap-3 text-sm ${
                  msg.toLowerCase().includes("error") 
                  ? "bg-red-500/10 border-red-500/20 text-red-400" 
                  : "bg-green-500/10 border-green-500/20 text-green-400"
                }`}>
                  {msg.toLowerCase().includes("error") ? <AlertCircle className="w-5 h-5 flex-shrink-0" /> : <CheckCircle2 className="w-5 h-5 flex-shrink-0" />}
                  <span className="font-medium">{msg}</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="overflow-x-auto -mx-6 px-6">
            <table className="w-full text-sm text-left border-collapse">
              <thead>
                <tr className="text-[10px] text-white/30 uppercase tracking-[0.2em] font-mono border-b border-white/10 pb-4">
                  <th className="pb-4 pl-4 font-normal">Piloto</th>
                  <th className="pb-4 font-normal">Qualy</th>
                  <th className="pb-4 font-normal">Race</th>
                  <th className="pb-4 text-center font-normal">DNF</th>
                  <th className="pb-4 text-center font-normal">SANC</th>
                  <th className="pb-4 text-center font-normal">ADEL</th>
                  <th className="pb-4 text-center font-normal">DOTD</th>
                  <th className="pb-4 text-center font-normal">MVP</th>
                  <th className="pb-4 text-center font-normal">V.R</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {(splits.find(s => s.id === selectedSplitId)?.roster || []).map((p: any, i: number) => {
                  const isPilotDnf = results[p.pilotoId]?.isDnfOwnError || false;
                  const qPosVal = results[p.pilotoId]?.qualyPos;
                  const isQualyDuplicated = typeof qPosVal === "number" && (qualyCount[qPosVal] || 0) > 1;
                  const rPosVal = results[p.pilotoId]?.racePos;
                  const isRaceDuplicated = !isPilotDnf && typeof rPosVal === "number" && (raceCount[rPosVal] || 0) > 1;
                  return (
                    <tr key={`pilot-row-${p.pilotoId}-${i}`} className="group border-b border-white/5 hover:bg-white/5 transition-colors">
                      <td className="py-4 pl-4">
                        <div className="flex items-center gap-3">
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
                      <td className="py-4">
                        <input 
                          type="number" 
                          min="1" 
                          max="15" 
                          className={`w-14 bg-[#1a1a1a]/50 border rounded-sm px-2 py-2 text-center outline-none focus:border-[#e10600] transition-colors font-mono text-xs disabled:opacity-40 ${
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
                      <td className="py-4">
                        <input
                          type="number"
                          min="1"
                          max="15"
                          className={`w-14 bg-[#1a1a1a]/50 border rounded-sm px-2 py-2 text-center outline-none focus:border-[#e10600] transition-colors font-mono text-xs disabled:opacity-40 ${
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
                      <td className="py-4 text-center">
                        <input type="checkbox" className="w-4 h-4 rounded border-white/10 bg-[#1a1a1a] text-[#e10600] accent-[#e10600] disabled:opacity-40"
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
                      </td>
                      <td className="py-4 text-center">
                        <input type="checkbox" className="w-4 h-4 rounded border-white/10 bg-[#1a1a1a] text-[#e10600] accent-[#e10600] disabled:opacity-40"
                          disabled={isActaCerrada || isPilotDnf}
                          checked={isPilotDnf ? false : !(results[p.pilotoId]?.isClean ?? true)} onChange={e => handleUpdate(p.pilotoId, "isClean", !e.target.checked)} />
                      </td>
                      <td className="py-4 text-center">
                        <input type="checkbox" className="w-4 h-4 rounded border-white/10 bg-[#1a1a1a] text-[#e10600] accent-[#e10600] disabled:opacity-40"
                          disabled={isActaCerrada || isPilotDnf}
                          checked={isPilotDnf ? false : (results[p.pilotoId]?.overtakesBoost || false)} onChange={e => handleUpdate(p.pilotoId, "overtakesBoost", e.target.checked)} />
                      </td>
                      <td className="py-4 text-center">
                        <input type="checkbox" className="w-4 h-4 rounded border-white/10 bg-[#1a1a1a] text-[#e10600] accent-[#e10600] disabled:opacity-40"
                          disabled={isActaCerrada || isPilotDnf}
                          checked={isPilotDnf ? false : (results[p.pilotoId]?.isDotd || false)} onChange={e => handleUpdate(p.pilotoId, "isDotd", e.target.checked)} />
                      </td>
                      <td className="py-4 text-center">
                        <input type="checkbox" className="w-4 h-4 rounded border-white/10 bg-[#1a1a1a] text-[#e10600] accent-[#e10600] disabled:opacity-40"
                          disabled={isActaCerrada || isPilotDnf}
                          checked={isPilotDnf ? false : (results[p.pilotoId]?.isMvp || false)} onChange={e => handleUpdate(p.pilotoId, "isMvp", e.target.checked)} />
                      </td>
                      <td className="py-4 text-center">
                        <input type="checkbox" className="w-4 h-4 rounded border-white/10 bg-[#1a1a1a] text-[#e10600] accent-[#e10600] disabled:opacity-40"
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
        <section className="mt-12 bg-white/[0.03] border border-white/10 p-6 relative overflow-hidden">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
            <div>
              <h2 className="text-xl font-black italic tracking-tighter text-white flex items-center gap-3 lowercase">
                <span className="w-1.5 h-6 bg-[#e10600] block" />
                Mover Pilotos
              </h2>
              <p className="text-[10px] text-white/40 uppercase tracking-widest mt-1 font-mono">
                Transferencias entre escuderías del split
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 bg-white/[0.02] p-2 border border-white/5">
                <span className="text-[10px] font-mono uppercase text-white/40">MERCADO:</span>
                <span className={`px-2 py-0.5 text-[10px] font-black uppercase tracking-widest ${
                  splits.find(s => s.id === selectedSplitId)?.fichajes_abiertos
                  ? "bg-green-500/20 text-green-400 border border-green-500/30"
                  : "bg-red-500/20 text-red-500 border border-red-500/30"
                }`}>
                  {splits.find(s => s.id === selectedSplitId)?.fichajes_abiertos ? "Abierto" : "Cerrado"}
                </span>
                <button onClick={handleToggleFichajes}
                  className="px-3 py-1 bg-white/10 hover:bg-white/25 text-[10px] uppercase font-bold tracking-wider transition-colors">
                  Cambiar
                </button>
              </div>
              <div className="flex items-center gap-2 bg-white/[0.02] p-2 border border-white/5">
                <span className="text-[10px] font-mono uppercase text-white/40">WEB PÚBLICA:</span>
                <span className={`px-2 py-0.5 text-[10px] font-black uppercase tracking-widest ${
                  splits.find(s => s.id === selectedSplitId)?.activo
                  ? "bg-[#e10600]/20 text-[#e10600] border border-[#e10600]/30"
                  : "bg-white/5 text-white/30 border border-white/10"
                }`}>
                  {splits.find(s => s.id === selectedSplitId)?.activo ? "Activo" : "Oculto"}
                </span>
                <button onClick={handleSetSplitActivo}
                  className="px-3 py-1 bg-white/10 hover:bg-white/25 text-[10px] uppercase font-bold tracking-wider transition-colors">
                  {splits.find(s => s.id === selectedSplitId)?.activo ? "Desactivar" : "Activar"}
                </button>
              </div>
            </div>
          </div>

          {/* Video Intro del Split */}
          <div className="mb-4 flex flex-col sm:flex-row items-start sm:items-center gap-3 border-t border-white/[0.04] pt-5">
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
          <div className="mb-6 pb-6 border-b border-white/[0.04] space-y-2">
            <p className="text-[9px] font-mono uppercase tracking-[0.4em] text-white/20 mb-3">Logos de escuderías</p>
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

          {!isSelectedSplitInitialized && selectedSplitId !== "split_1" && (
            <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/30 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h4 className="text-sm font-bold text-amber-400 uppercase tracking-wider">⚠️ Split No Inicializado</h4>
                <p className="text-xs text-white/60 mt-1 max-w-2xl">
                  Este split hereda dinámicamente el plantel del anterior. Inicialízalo para poder mover pilotos de forma independiente.
                </p>
              </div>
              <button onClick={() => handleSyncSplitRosters(selectedSplitId)}
                className="bg-amber-500 hover:bg-amber-600 text-black px-4 py-2 text-xs font-black uppercase tracking-wider shrink-0 transition-colors cursor-pointer">
                Inicializar Split
              </button>
            </div>
          )}

          {/* Tabla de pilotos con mover */}
          <div className="overflow-x-auto border border-white/[0.06]">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="border-b border-white/[0.06] text-[9px] uppercase tracking-[0.25em] text-white/25 font-normal">
                  <th className="py-3 px-4 text-left font-normal">Piloto</th>
                  <th className="py-3 px-4 text-left font-normal">Equipo actual</th>
                  <th className="py-3 px-4 text-left font-normal">Precio next split</th>
                  <th className="py-3 px-4 text-left font-normal">Mover a</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {(currentRawSplit?.roster || [])
                  .slice()
                  .sort((a: any, b: any) => (a.equipoId || "").localeCompare(b.equipoId || "") || (a.nombre || "").localeCompare(b.nombre || ""))
                  .map((p: any) => {
                    const teamNombre = (currentRawSplit?.equipos || []).find((e: any) => e.id === p.equipoId)?.nombre || p.equipoId || "Agente Libre";
                    return (
                      <tr key={p.pilotoId} className="hover:bg-white/[0.02] transition-colors">
                        <td className="py-3 px-4 font-bold text-white/90">{p.nombre}</td>
                        <td className="py-3 px-4 text-white/40 font-mono text-[10px]">{teamNombre}</td>
                      <td className="py-3 px-4 text-white/40 font-mono text-[10px]">
                        {typeof p.pending_precio_compra === "number" ? `${p.pending_precio_compra}M` : `${p.precio_compra ?? 0}M`}
                        {p.pending_precio_compra != null && <span className="block text-[9px] text-white/30">siguiente split</span>}
                      </td>
                        <td className="py-3 px-4">
                          <select
                            style={{ colorScheme: "dark", backgroundColor: "#0d0d0d" }}
                            className="border border-white/10 px-2 py-1.5 text-[10px] text-white outline-none focus:border-[#e10600] transition-colors cursor-pointer"
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

          {/* Añadir piloto no asignado */}
          {allPossiblePilots.filter((u: any) => {
            const rosterIds = (currentRawSplit?.roster || []).map((r: any) => r.pilotoId);
            return !rosterIds.some((id: string) => id === u.uid || id === u.piloto_id);
          }).length > 0 && (
            <div className="mt-6 border-t border-white/[0.06] pt-6">
              <p className="text-[9px] font-mono uppercase tracking-[0.4em] text-white/20 mb-3">Añadir piloto sin equipo</p>
              <div className="flex items-center gap-3">
                <select
                  style={{ colorScheme: "dark", backgroundColor: "#0d0d0d" }}
                  className="border border-white/10 px-3 py-2 text-[10px] text-white outline-none focus:border-[#e10600] transition-colors"
                  value=""
                  onChange={e => {
                    const targetUser = allPossiblePilots.find(u => u.uid === e.target.value);
                    if (targetUser) {
                      const firstTeam = (currentRawSplit?.equipos || [])[0];
                      if (firstTeam) handleMovePilotOriginal(targetUser.uid, targetUser.nombre, "agente_libre", firstTeam.id, targetUser.raw);
                    }
                  }}
                >
                  <option value="">— Seleccionar piloto —</option>
                  {allPossiblePilots.filter((u: any) => {
                    const rosterIds = (currentRawSplit?.roster || []).map((r: any) => r.pilotoId);
                    return !rosterIds.some((id: string) => id === u.uid || id === u.piloto_id);
                  }).map((u: any) => (
                    <option key={u.uid} value={u.uid}>{u.nombre}</option>
                  ))}
                </select>
                <span className="text-[9px] text-white/20 font-mono">se añadirá al primer equipo disponible</span>
              </div>
            </div>
          )}
        </section>

        {/* Gestión de Usuarios */}
        <section className="mt-12 bg-white/[0.03] border border-white/10  p-6 relative overflow-hidden">
          <div className="mb-6">
            <h2 className="text-xl font-black italic tracking-tighter text-white flex items-center gap-3 lowercase">
              <span className="w-1.5 h-6 bg-[#e10600] block" />
              Gestión de Paddock
            </h2>
            <p className="text-[10px] text-white/40 uppercase tracking-widest mt-2 font-mono">
              Usuarios registrados y vinculación con pilotos
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left border-collapse">
              <thead>
                <tr className="text-[10px] text-white/30 uppercase tracking-[0.2em] font-mono border-b border-white/10 pb-4">
                  <th className="pb-4 pl-4 font-normal">Usuario App</th>
                  <th className="pb-4 font-normal">Email</th>
                  <th className="pb-4 font-normal">Identidad Real</th>
                  <th className="pb-4 font-normal">Rol</th>
                  <th className="pb-4 font-normal">Escudería</th>
                </tr>
              </thead>
              <tbody>
                {paddockUsers.map((p, i) => {
                  const getPilotTeamLabel = (user: any) => {
                    if (user.rol === "jeque") {
                      return user.escuderia_id ? `Jeque (${user.escuderia_id.replace('_', ' ')})` : "Jeque (Sin asignar)";
                    }
                    if (user.rol === "admin") {
                      return "Administrador";
                    }
                    if (user.rol === "piloto") {
                      const splitView = splits.find(s => s.id === selectedSplitId);
                      const rosterEntry = (splitView?.roster || []).find(
                        (r: any) => r.pilotoId === user.uid || (user.piloto_id && r.pilotoId === user.piloto_id)
                      );
                      if (!rosterEntry || rosterEntry.equipoId === "agente_libre") return "Agente Libre";
                      const team = (splitView?.equipos || []).find((eq: any) => eq.id === rosterEntry.equipoId);
                      return team ? team.nombre : rosterEntry.equipoId;
                    }
                    return "N/A";
                  };

                  return (
                    <tr key={`paddock-user-${p.uid}-${i}`} className="border-b border-white/5 hover:bg-white/5 transition-colors group">
                      <td className="py-4 pl-4">
                        <EditableName
                          pilotId={p.uid}
                          initialName={p.nombre}
                          className="font-bold text-white"
                          onSave={handleUpdatePilotName}
                        />
                        <p className="text-[10px] text-white/20 font-mono">{p.uid}</p>
                      </td>
                      <td className="py-4 font-mono text-xs">{p.email}</td>
                      <td className="py-4">
                        <div className="flex items-center gap-2">
                          <UserIcon className="w-3 h-3 text-[#e10600]" />
                          <span className="font-medium text-xs">{p.piloto_id || p.id || "N/A"}</span>
                        </div>
                      </td>
                      <td className="py-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest ${
                          p.rol === 'admin' ? 'bg-red-500/20 text-red-500' : 
                          p.rol === 'jeque' ? 'bg-amber-500/20 text-amber-500' : 
                          'bg-blue-500/20 text-blue-500'
                        }`}>
                          {p.rol}
                        </span>
                      </td>
                      <td className="py-4 capitalize font-mono text-xs text-white/60">
                        {getPilotTeamLabel(p)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>


          </>
        )}

        {confirmModal && confirmModal.isOpen && (
          <div className="fixed inset-0 bg-black/85 z-50 flex items-center justify-center p-4">
            <div className="bg-[#0a0a0a] border border-white/10  p-6 max-w-sm w-full relative text-left">
              <h3 className="text-lg font-black text-white uppercase tracking-tight mb-2 flex items-center gap-2">
                <span className="w-1.5 h-4 bg-[#e10600]" />
                {confirmModal.title}
              </h3>
              <p className="text-xs text-white/60 leading-relaxed mb-6">{confirmModal.message}</p>
              <div className="flex justify-end gap-3 font-semibold text-[10px] uppercase tracking-wider">
                <button
                  onClick={() => setConfirmModal(null)}
                  className="px-4 py-2.5 bg-white/5 hover:bg-white/10 text-white rounded-sm transition-colors border border-white/5"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    confirmModal.onConfirm();
                    setConfirmModal(null);
                  }}
                  className="px-4 py-2.5 bg-[#e10600] text-white rounded-sm hover:bg-red-700 transition-colors shadow-lg shadow-red-900/30"
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