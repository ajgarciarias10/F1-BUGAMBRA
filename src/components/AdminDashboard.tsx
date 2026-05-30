import React, { useState, useEffect, useMemo } from "react";
import { UserHeader } from "./Dashboards";
import { useUsuarios, useSplits } from "../hooks/useData";
import { processRace, RaceResult } from "../services/raceProcessor";
import { auth, db } from "../services/firebase";
import { doc, updateDoc } from "firebase/firestore";
import { updatePassword } from "firebase/auth";
import { ChevronDown, Calendar, AlertCircle, CheckCircle2, Loader2, User as UserIcon, Lock, ShieldAlert } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { resolveAllSplits, isSplitUnlocked } from "../utils/splitResolver";
import { SuggestionsView } from "./SuggestionsView";
import { AdminRivalryControlPanel } from "./RivalryPanels";

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
  const splits = useMemo(() => resolveAllSplits(rawSplits), [rawSplits]);
  const [selectedSplitId, setSelectedSplitId] = useState("");

  const currentRawSplit = useMemo(() => rawSplits.find(s => s.id === selectedSplitId), [rawSplits, selectedSplitId]);
  const isSelectedSplitInitialized = useMemo(() => {
    if (!selectedSplitId || selectedSplitId === "split_1") return true;
    if (!currentRawSplit) return false;
    const totalPilotsInDb = currentRawSplit.equipos?.reduce((sum: number, eq: any) => sum + (eq.pilotos?.length || 0), 0) || 0;
    return totalPilotsInDb > 0;
  }, [selectedSplitId, currentRawSplit]);

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [plantilla, setPlantilla] = useState<any[]>([]);
  const [adminTab, setAdminTab] = useState<"championship" | "suggestions">("championship");

  useEffect(() => {
    let isSubscribed = true;
    let unsubscribe: (() => void) | undefined;
    import("firebase/firestore").then(({ collection, onSnapshot }) => {
      if (!isSubscribed) return;
      const q = collection(db, "plantilla");
      unsubscribe = onSnapshot(q, (snapshot) => {
        if (isSubscribed) {
          const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setPlantilla(data);
        }
      }, (error) => {
        console.warn("Gracefully handled AdminDashboard plantilla snapshot error:", error);
      });
    }).catch(console.error);
    return () => {
      isSubscribed = false;
      if (unsubscribe) unsubscribe();
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
  /*
  const [climaTipoVal, setClimaTipoVal] = useState("despejado");
  const [climaTempVal, setClimaTempVal] = useState(25);
  const [climaProbLluviaVal, setClimaProbLluviaVal] = useState(10);
  const [climaVientoVal, setClimaVientoVal] = useState(15);
  */
  const [isSavingSchedule, setIsSavingSchedule] = useState(false);

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
      /*
      setClimaTipoVal(circuito?.clima_tipo || "despejado");
      setClimaTempVal(circuito?.clima_temp !== undefined ? circuito.clima_temp : 25);
      setClimaProbLluviaVal(circuito?.clima_prob_lluvia !== undefined ? circuito.clima_prob_lluvia : 10);
      setClimaVientoVal(circuito?.clima_viento !== undefined ? circuito.clima_viento : 15);
      */
      
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
        hora: horaVal
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
  const [selectedTeamIdForPilot, setSelectedTeamIdForPilot] = useState("");
  const [selectedUserIdForPilot, setSelectedUserIdForPilot] = useState("");
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
      const { doc, updateDoc, getDoc } = await import("firebase/firestore");
      const { db } = await import("../services/firebase");
      
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
      
      // 3. Update in any split's rosters
      for (const split of splits) {
        if (!split.equipos) continue;
        for (const team of split.equipos) {
          if (team.pilotos && team.pilotos.some((pil: any) => pil.id === pilotId)) {
            const pilotRef = doc(db, `splits/${split.id}/equipos/${team.id}/pilotos`, pilotId);
            await updateDoc(pilotRef, { nombre: trimmedName });
          }
        }
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
      const { collection, addDoc, doc, setDoc } = await import("firebase/firestore");
      const { db } = await import("../services/firebase");
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

  const handleAddPilotToTeam = async () => {
    if (!selectedSplitId || !selectedTeamIdForPilot || !selectedUserIdForPilot) return;
    setLoading(true);
    try {
      const { doc, setDoc } = await import("firebase/firestore");
      const { db } = await import("../services/firebase");
      const user = usuarios.find(u => u.uid === selectedUserIdForPilot);
      await setDoc(doc(db, `splits/${selectedSplitId}/equipos/${selectedTeamIdForPilot}/pilotos`, selectedUserIdForPilot), {
        id: selectedUserIdForPilot,
        nombre: user?.nombre || "Piloto",
        puntos_piloto: 0,
        victorias: 0,
        podios: 0,
        rating_piloto: 70
      });
      setMsg("Piloto vinculado al equipo del split.");
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
      const { doc, updateDoc } = await import("firebase/firestore");
      const currentSplit = splits.find(s => s.id === selectedSplitId);
      const finalVal = !(currentSplit?.fichajes_abiertos);
      const ref = doc(db, "splits", selectedSplitId);
      await updateDoc(ref, { fichajes_abiertos: finalVal });
      setMsg(`Ventana de fichajes ${finalVal ? "ABIERTA" : "CERRADA"} para ${currentSplit?.nombre || "Split"}.`);
      setTimeout(() => {
        setMsg("");
      }, 4000);
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
      const { doc, setDoc } = await import("firebase/firestore");
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
    if (!selectedSplitId) return;
    setLoading(true);
    try {
      const { doc, setDoc } = await import("firebase/firestore");
      const ref = doc(db, `splits/${selectedSplitId}/equipos/${teamId}/pilotos`, pilotId);
      await setDoc(ref, {
        rating_piloto: Number(props.rating_piloto || 0),
        clausula_actual: Number(props.clausula_actual || 0),
        precio_compra_split: Number(props.precio_compra_split || 0),
        puntos_piloto: Number(props.puntos_piloto || 0)
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
      const { doc, setDoc, deleteDoc, addDoc, collection } = await import("firebase/firestore");
      
      let pData = { ...pilotData };
      
      // Calculate clause price
      const rating = Number(pData.rating_piloto || pData.raw?.rating_piloto || 70);
      const clause = Number(pData.clausula_actual || pData.raw?.clausula_actual || (rating * 0.5) || 15);

      const currentSplit = splits.find(s => s.id === selectedSplitId);

      // Adjust budgets in Firestore
      if (fromTeamId && fromTeamId !== "agente_libre") {
        const fromTeam = currentSplit?.equipos?.find((e: any) => e.id === fromTeamId);
        const currentFromBudget = fromTeam ? Number(fromTeam.presupuesto ?? 100) : 100;
        const newFromBudget = Number((currentFromBudget + clause).toFixed(1));
        
        const tFromRef = doc(db, `splits/${selectedSplitId}/equipos`, fromTeamId);
        await setDoc(tFromRef, { presupuesto: newFromBudget }, { merge: true });
      }

      if (toTeamId && toTeamId !== "agente_libre") {
        const toTeam = currentSplit?.equipos?.find((e: any) => e.id === toTeamId);
        const currentToBudget = toTeam ? Number(toTeam.presupuesto ?? 100) : 100;
        const newToBudget = Number((currentToBudget - clause).toFixed(1));
        
        const tToRef = doc(db, `splits/${selectedSplitId}/equipos`, toTeamId);
        await setDoc(tToRef, { presupuesto: newToBudget }, { merge: true });
      }

      // Update global user document escuderia_id to keep Pilot Panel and queries aligned
      // Find matching user in 'usuarios' by uid or registered piloto_id
      const matchedUser = usuarios.find(u => u.uid === pilotId || (u.piloto_id && u.piloto_id === pilotId));
      if (matchedUser) {
        const userRef = doc(db, "usuarios", matchedUser.uid);
        await setDoc(userRef, {
          escuderia_id: toTeamId === "agente_libre" ? "" : toTeamId
        }, { merge: true });
      }

      // To guarantee absolutely no duplicate pilot documents exist across collections/teams in this split,
      // we prepare all deletions to run in parallel using Promise.all for modern, lightning-fast execution.
      const deletePromises: Promise<any>[] = [];

      if (fromTeamId && fromTeamId !== "agente_libre") {
        deletePromises.push(deleteDoc(doc(db, `splits/${selectedSplitId}/equipos/${fromTeamId}/pilotos`, pilotId)));
        if (matchedUser) {
          if (matchedUser.uid !== pilotId) {
            deletePromises.push(deleteDoc(doc(db, `splits/${selectedSplitId}/equipos/${fromTeamId}/pilotos`, matchedUser.uid)));
          }
          if (matchedUser.piloto_id && matchedUser.piloto_id !== pilotId) {
            deletePromises.push(deleteDoc(doc(db, `splits/${selectedSplitId}/equipos/${fromTeamId}/pilotos`, matchedUser.piloto_id)));
          }
        }
      } else {
        const teamsInSplit = splits.find(s => s.id === selectedSplitId)?.equipos || [];
        for (const t of teamsInSplit) {
          deletePromises.push(deleteDoc(doc(db, `splits/${selectedSplitId}/equipos/${t.id}/pilotos`, pilotId)));
          if (matchedUser) {
            if (matchedUser.uid !== pilotId) {
              deletePromises.push(deleteDoc(doc(db, `splits/${selectedSplitId}/equipos/${t.id}/pilotos`, matchedUser.uid)));
            }
            if (matchedUser.piloto_id && matchedUser.piloto_id !== pilotId) {
              deletePromises.push(deleteDoc(doc(db, `splits/${selectedSplitId}/equipos/${t.id}/pilotos`, matchedUser.piloto_id)));
            }
          }
        }
      }

      await Promise.all(deletePromises);
      
      if (toTeamId && toTeamId !== "agente_libre") {
        const newRef = doc(db, `splits/${selectedSplitId}/equipos/${toTeamId}/pilotos`, pilotId);
        await setDoc(newRef, {
          id: pilotId,
          nombre: pilotName || pData.nombre || "Piloto",
          puntos_piloto: fromTeamId === "agente_libre" ? 0 : (pData.puntos_piloto ?? 0),
          victorias: fromTeamId === "agente_libre" ? 0 : (pData.victorias ?? 0),
          podios: fromTeamId === "agente_libre" ? 0 : (pData.podios ?? 0),
          rating_piloto: pData.rating_piloto ?? 70,
          precio_compra_split: pData.precio_compra_split ?? 10,
          clausula_actual: pData.clausula_actual ?? 15,
          mantener_actual: pData.mantener_actual ?? 15,
          precio_carrera_anterior: pData.precio_carrera_anterior ?? 10
        });
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
      setTimeout(() => {
        setMsg("");
      }, 4000);
    } catch (err: any) {
      setMsg("Error al transferir piloto: " + err.message);
    }
  };

  const handleSyncSplitRosters = (splitId: string) => {
    const currentSplitName = splits.find(s => s.id === splitId)?.nombre || splitId;
    setConfirmModal({
      isOpen: true,
      title: `Inicializar ${currentSplitName}`,
      message: `¿Seguro que quieres INICIALIZAR las plantillas, presupuestos y pilotos del ${currentSplitName.toUpperCase()} a partir del Split anterior? Esto establecerá los presupuestos a 100M, copiará el roster del Split anterior con puntos a 0, victorias a 0 y podios a 0.`,
      onConfirm: async () => {
        setLoading(true);
        try {
          const { doc, setDoc, deleteDoc, getDocs, collection, addDoc } = await import("firebase/firestore");
          const { db } = await import("../services/firebase");
          
          const sortedSplits = [...splits].sort((a, b) => a.id.localeCompare(b.id));
          const currentIndex = sortedSplits.findIndex(s => s.id === splitId);
          if (currentIndex <= 0) {
            setMsg("Error: No se puede inicializar el Split 1 desde un split anterior.");
            setLoading(false);
            return;
          }
          const prevSplit = sortedSplits[currentIndex - 1];
          
          setMsg(`Inicializando presupuestos de ${currentSplitName}...`);
          const teamKeys = ["zenith", "roses", "alfa_romero"];
          for (const teamId of teamKeys) {
            const tRef = doc(db, `splits/${splitId}/equipos`, teamId);
            const prevTeamDoc = prevSplit.equipos?.find((e: any) => e.id === teamId);
            
            await setDoc(tRef, {
              id: teamId,
              nombre: prevTeamDoc?.nombre || (teamId.charAt(0).toUpperCase() + teamId.slice(1)),
              presupuesto: 100,
              puntos_constructores: 0
            }, { merge: true });

            const pSnap = await getDocs(collection(db, `splits/${splitId}/equipos/${teamId}/pilotos`));
            for (const pDoc of pSnap.docs) {
              await deleteDoc(doc(db, `splits/${splitId}/equipos/${teamId}/pilotos`, pDoc.id));
            }

            const prevPilots = prevTeamDoc?.pilotos || [];
            for (const p of prevPilots) {
              await setDoc(doc(db, `splits/${splitId}/equipos/${teamId}/pilotos`, p.id), {
                id: p.id,
                nombre: p.nombre,
                puntos_piloto: 0,
                victorias: 0,
                podios: 0,
                rating_piloto: p.rating_piloto ?? 70,
                precio_compra_split: p.precio_compra_split ?? 10,
                clausula_actual: p.clausula_actual ?? 15,
                mantener_actual: p.mantener_actual ?? 15,
                precio_carrera_anterior: p.precio_carrera_anterior ?? 10
              });
            }
          }

          await addDoc(collection(db, `splits/${splitId}/transfers`), {
            detalles: `⚙️ Admin inicializó los rosters del ${currentSplitName} desde ${prevSplit.nombre}.`,
            timestamp: new Date().toISOString(),
            tipo: "admin"
          });

          setMsg(`¡${currentSplitName} inicializado correctamente!`);
          setTimeout(() => setMsg(""), 4000);
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
          const { doc, updateDoc } = await import("firebase/firestore");
          const { db } = await import("../services/firebase");
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
    const splitPilots = currentSplit?.equipos?.flatMap((e: any) => e.pilotos || []) || [];

    if (splitPilots.length === 0) {
      setMsg("No hay pilotos registrados en este split.");
      return;
    }
    
    setLoading(true);
    setMsg("");
    try {
      const finalResults: RaceResult[] = splitPilots.map((p: any, idx: number) => {
        const item = results[p.id] || {};
        const isDnf = !!item.isDnfOwnError;
        
        // Safely parse qualyPos, falling back to a unique row index to avoid bulk duplication
        const enteredQualy = typeof item.qualyPos === "number" ? item.qualyPos : parseInt(item.qualyPos as any);
        const qPos = isDnf ? 99 : ((!isNaN(enteredQualy) && enteredQualy > 0) ? enteredQualy : (idx + 1));

        // Safely parse racePos, returning 99 for DNF, or a unique fallback if blank
        const enteredRace = typeof item.racePos === "number" ? item.racePos : parseInt(item.racePos as any);
        const rPos = isDnf ? 99 : ((!isNaN(enteredRace) && enteredRace > 0) ? enteredRace : (idx + 1));

        return {
          pilotoId: p.id,
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
        </div>

        {adminTab === "suggestions" ? (
          <SuggestionsView isAdmin={true} />
        ) : (
          <>
            {/* Navegación de Splits */}
        <div className="flex flex-wrap gap-2 mb-6">
          {splits.filter(s => isSplitUnlocked(s.id, splits)).map(s => (
            <button
              key={s.id}
              onClick={() => {
                setSelectedSplitId(s.id);
                // Select first circuit naturally
                const next = getNextCircuitOfSplit(s.circuitos) || s.circuitos[s.circuitos.length - 1];
                if (next) setSelectedCircuitoId(next.id);
              }}
              className={`px-4 py-2 rounded-lg font-black text-[10px] uppercase tracking-widest transition-all ${
                selectedSplitId === s.id 
                ? "bg-[#e10600] text-white shadow-lg shadow-red-900/20" 
                : "bg-zinc-900/50 text-white/40 border border-white/5 hover:border-white/20"
              }`}
            >
              {s.nombre}
            </button>
          ))}
        </div>
        
        {/* Selector de Circuito */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-zinc-900/50 border border-white/10 rounded-xl p-4 flex items-center gap-4">
            <div className="p-2 bg-[#e10600]/10 rounded-lg">
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

          <div className="col-span-2 bg-zinc-900/50 border border-white/10 rounded-xl p-4">
            <div className="flex items-center gap-4">
               <div className="flex-1">
                  <p className="text-[10px] text-white/40 uppercase tracking-widest font-mono mb-2 text-center md:text-left">Carga un nuevo GP o corrige uno Finalizado</p>
                  <select 
                    className="w-full bg-black/40 border border-white/10 rounded-lg py-2.5 px-3 text-xs outline-none focus:border-[#e10600] transition-colors appearance-none cursor-pointer"
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
                    {/* Current Split Context */}
                    {splits.filter(s => s.id === selectedSplitId && isSplitUnlocked(s.id, splits)).map(s => (
                      <React.Fragment key={s.id}>
                        <optgroup label={`${s.nombre} - Pendientes`}>
                          {s.circuitos.filter((c: any) => !c.completado).map((c: any) => (
                            <option key={`${s.id}-${c.id}`} value={`${s.id}|${c.id}`}>
                              {c.nombre} (Pendiente)
                            </option>
                          ))}
                        </optgroup>
                        <optgroup label={`${s.nombre} - Finalizados`}>
                          {s.circuitos.filter((c: any) => c.completado).map((c: any) => (
                            <option key={`${s.id}-${c.id}`} value={`${s.id}|${c.id}`}>
                              {c.nombre} (Completada)
                            </option>
                          ))}
                        </optgroup>
                      </React.Fragment>
                    ))}
                    {/* Access other splits hidden easily */}
                    <optgroup label="Cambiar a otro Split">
                       {splits.filter(s => s.id !== selectedSplitId && isSplitUnlocked(s.id, splits)).map(s => (
                         <option key={s.id} value={`${s.id}|`}>
                            --- {s.nombre} ---
                         </option>
                       ))}
                    </optgroup>
                  </select>
               </div>
            </div>
          </div>
        </div>

        {/* PROGRAMACIÓN DEL CIRCUITO (ADMINISTRATOR UI) */}
        <div className="bg-zinc-900/50 border border-white/10 rounded-xl p-5 mb-8">
          <div className="flex items-center gap-2 mb-4 border-b border-white/5 pb-2">
            <Calendar className="w-4 h-4 text-[#e10600]" />
            <h3 className="font-extrabold text-xs uppercase tracking-wider text-white">Programación de Carrera para {getCircuitName()}</h3>
          </div>
          
          <div className="grid grid-cols-1 max-w-xl gap-4">
            <div>
              <label className="block text-[10px] text-white/40 uppercase font-mono mb-1.5 font-bold">Fecha de Carrera</label>
              <input
                type="date"
                value={fechaVal}
                onChange={(e) => setFechaVal(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-lg py-2 px-3 text-xs text-white outline-none focus:border-[#e10600] transition-colors"
              />
            </div>
          </div>
          
          <div className="mt-4 flex justify-end">
            <button
              onClick={handleSaveSchedule}
              disabled={isSavingSchedule}
              className="bg-zinc-850 hover:bg-zinc-700 hover:text-white border border-white/10 text-white/95 text-[10px] font-bold uppercase tracking-wider py-2 px-6 rounded-lg transition-all flex items-center justify-center gap-1.5 shadow cursor-pointer"
            >
              {isSavingSchedule ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Guardar Programación"}
            </button>
          </div>
        </div>
        
        {currentRawSplit && (
          <AdminRivalryControlPanel split={currentRawSplit} />
        )}

        <section className="bg-zinc-900/50 border border-white/10 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
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
              {/* Duplicate warnings */}
              {((Object.values(qualyCount) as number[]).some(c => c > 1) || (Object.values(raceCount) as number[]).some(c => c > 1)) && (
                <div className="text-[10px] text-amber-400 font-mono flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-lg mr-2 max-w-xs">
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>Posiciones duplicadas (en ámbar)</span>
                </div>
              )}

              {isEditingFinished && !isActaCerrada && (
                <button 
                  onClick={handleCerrarActa}
                  className="px-6 py-3 rounded-lg border border-red-500/30 text-red-500 text-xs font-black uppercase hover:bg-red-500/10 transition-all"
                >
                  Cerrar Acta
                </button>
              )}
              
              <button 
                onClick={handleSubmit}
                disabled={loading || isActaCerrada}
                className="group relative bg-[#e10600] px-8 py-3 rounded-lg font-black text-xs uppercase hover:bg-red-700 transition-all shadow-xl shadow-red-900/30 overflow-hidden active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                <span className="relative z-10 flex items-center gap-2">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : (isEditingFinished ? "Guardar Corrección" : "Procesar Carrera")}
                </span>
                <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
              </button>
            </div>
          </div>

          <AnimatePresence>
            {msg && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className={`mb-6 overflow-hidden`}
              >
                <div className={`p-4 border rounded-xl flex items-center gap-3 text-sm ${
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
                {(splits.find(s => s.id === selectedSplitId)?.equipos?.flatMap((e: any) => e.pilotos || []) || []).map((p: any, i: number) => {
                  const isPilotDnf = results[p.id]?.isDnfOwnError || false;
                  const qPosVal = results[p.id]?.qualyPos;
                  const isQualyDuplicated = typeof qPosVal === "number" && (qualyCount[qPosVal] || 0) > 1;
                  const rPosVal = results[p.id]?.racePos;
                  const isRaceDuplicated = !isPilotDnf && typeof rPosVal === "number" && (raceCount[rPosVal] || 0) > 1;
                  return (
                    <tr key={`pilot-row-${p.id}-${i}`} className="group border-b border-white/5 hover:bg-white/5 transition-colors">
                      <td className="py-4 pl-4">
                        <div className="flex items-center gap-3">
                          <span className="text-[10px] font-mono text-white/20 w-4">{i+1}</span>
                          <div>
                            <EditableName
                              pilotId={p.id}
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
                          className={`w-14 bg-zinc-800/50 border rounded-lg px-2 py-2 text-center outline-none focus:border-[#e10600] transition-colors font-mono text-xs disabled:opacity-40 ${
                            isQualyDuplicated
                              ? "border-amber-500/60 text-amber-300 bg-amber-500/5" 
                              : "border-white/10 text-white"
                          }`} 
                          title={isQualyDuplicated ? "¡Posición de Qualy duplicada!" : undefined}
                          disabled={isActaCerrada || isPilotDnf}
                          value={isPilotDnf ? "" : (qPosVal ?? "")} 
                          onChange={e => {
                            const val = parseInt(e.target.value);
                            handleUpdate(p.id, "qualyPos", isNaN(val) ? "" : val);
                          }} 
                        />
                      </td>
                      <td className="py-4">
                        <input 
                          type="number" 
                          min="1" 
                          max="15" 
                          className={`w-14 bg-zinc-800/50 border rounded-lg px-2 py-2 text-center outline-none focus:border-[#e10600] transition-colors font-mono text-xs disabled:opacity-40 ${
                            isRaceDuplicated
                              ? "border-amber-500/60 text-amber-300 bg-amber-500/5" 
                              : "border-white/10 text-white"
                          }`} 
                          title={isRaceDuplicated ? "¡Posición de carrera duplicada!" : undefined}
                          disabled={isActaCerrada || isPilotDnf}
                          value={isPilotDnf ? "" : (rPosVal ?? "")} 
                          onChange={e => {
                            const val = parseInt(e.target.value);
                            handleUpdate(p.id, "racePos", isNaN(val) ? "" : val);
                          }} 
                        />
                      </td>
                      <td className="py-4 text-center">
                        <input type="checkbox" className="w-4 h-4 rounded border-white/10 bg-zinc-800 text-[#e10600] accent-[#e10600] disabled:opacity-40" 
                          disabled={isActaCerrada}
                          checked={results[p.id]?.isDnfOwnError || false} 
                          onChange={e => {
                            const isDnf = e.target.checked;
                            if (isDnf) {
                              setResults(prev => ({
                                ...prev,
                                [p.id]: {
                                  ...prev[p.id],
                                  pilotoId: p.id,
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
                                [p.id]: {
                                  ...prev[p.id],
                                  pilotoId: p.id,
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
                        <input type="checkbox" className="w-4 h-4 rounded border-white/10 bg-zinc-800 text-[#e10600] accent-[#e10600] disabled:opacity-40" 
                          disabled={isActaCerrada || isPilotDnf}
                          checked={isPilotDnf ? false : !(results[p.id]?.isClean ?? true)} onChange={e => handleUpdate(p.id, "isClean", !e.target.checked)} />
                      </td>
                      <td className="py-4 text-center">
                        <input type="checkbox" className="w-4 h-4 rounded border-white/10 bg-zinc-800 text-[#e10600] accent-[#e10600] disabled:opacity-40" 
                          disabled={isActaCerrada || isPilotDnf}
                          checked={isPilotDnf ? false : (results[p.id]?.overtakesBoost || false)} onChange={e => handleUpdate(p.id, "overtakesBoost", e.target.checked)} />
                      </td>
                      <td className="py-4 text-center">
                        <input type="checkbox" className="w-4 h-4 rounded border-white/10 bg-zinc-800 text-[#e10600] accent-[#e10600] disabled:opacity-40" 
                          disabled={isActaCerrada || isPilotDnf}
                          checked={isPilotDnf ? false : (results[p.id]?.isDotd || false)} onChange={e => handleUpdate(p.id, "isDotd", e.target.checked)} />
                      </td>
                      <td className="py-4 text-center">
                        <input type="checkbox" className="w-4 h-4 rounded border-white/10 bg-zinc-800 text-[#e10600] accent-[#e10600] disabled:opacity-40" 
                          disabled={isActaCerrada || isPilotDnf}
                          checked={isPilotDnf ? false : (results[p.id]?.isMvp || false)} onChange={e => handleUpdate(p.id, "isMvp", e.target.checked)} />
                      </td>
                      <td className="py-4 text-center">
                        <input type="checkbox" className="w-4 h-4 rounded border-white/10 bg-zinc-800 text-[#e10600] accent-[#e10600] disabled:opacity-40" 
                          disabled={isActaCerrada || isPilotDnf}
                          checked={isPilotDnf ? false : (results[p.id]?.fastestLap || false)} onChange={e => handleUpdate(p.id, "fastestLap", e.target.checked)} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
        {/* ADMINISTRACIÓN DE ROSTERS, FICHAJES Y MERCADO */}
        <section className="mt-12 bg-zinc-900/50 border border-white/10 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#e10600]/5 blur-[100px] -mr-32 -mt-32 rounded-full" />
          
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
            <div>
              <h2 className="text-xl font-black italic tracking-tighter text-white flex items-center gap-3 lowercase">
                <span className="w-1.5 h-6 bg-[#e10600] block" />
                Gestión Analítica de Rosters y Fichajes
              </h2>
              <p className="text-[10px] text-white/40 uppercase tracking-widest mt-1 font-mono">
                Control total de presupuestos, pilotos, valoraciones y mercado por Split
              </p>
            </div>
            
            <div className="flex items-center gap-3 bg-black/40 p-2 rounded-lg border border-white/5">
              <span className="text-[10px] font-mono uppercase text-white/40">ESTADO MERCADO:</span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest ${
                splits.find(s => s.id === selectedSplitId)?.fichajes_abiertos 
                ? "bg-green-500/20 text-green-400 border border-green-500/30" 
                : "bg-red-500/20 text-red-500 border border-red-500/30"
              }`}>
                {splits.find(s => s.id === selectedSplitId)?.fichajes_abiertos ? "Abierto (Fichajes)" : "Cerrado"}
              </span>
              <button 
                onClick={handleToggleFichajes}
                className="px-3 py-1 bg-white/10 hover:bg-white/25 rounded text-[10px] uppercase font-bold tracking-wider transition-colors"
              >
                Cambiar Estado
              </button>
            </div>
          </div>

          {!isSelectedSplitInitialized && selectedSplitId !== "split_1" && (
            <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mt-6">
              <div>
                <h4 className="text-sm font-bold text-amber-400 uppercase tracking-wider flex items-center gap-2">
                  ⚠️ Split No Inicializado en Base de Datos
                </h4>
                <p className="text-xs text-white/60 mt-1 max-w-2xl select-none">
                  Este Split está heredando dinámicamente el presupuesto y plantel del Split anterior. Para poder realizar movimientos de pilotos, modificar presupuestos de equipos, o editar ratings y cláusulas de este Split de forma manual e independiente, debes inicializar la base de datos de este Split.
                </p>
              </div>
              <button
                onClick={() => handleSyncSplitRosters(selectedSplitId)}
                className="bg-amber-500 hover:bg-amber-600 text-black px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider shrink-0 transition-colors shadow-lg cursor-pointer"
              >
                Inicializar Split
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
            {(splits.find(s => s.id === selectedSplitId)?.equipos || []).map((team: any) => {
              const bInput = teamBudgets[team.id] ?? team.presupuesto?.toString() ?? "100";
              return (
                <div key={team.id} className="bg-black/35 border border-white/5 rounded-xl p-5 flex flex-col hover:border-white/10 transition-all">
                  
                  {/* Team Card Header with Budget config */}
                  <div className="flex justify-between items-start border-b border-white/5 pb-3 mb-4">
                    <div>
                      <h3 className="font-extrabold text-sm uppercase text-[#e10600]">{team.nombre}</h3>
                      <span className="text-[9px] font-mono text-white/20 uppercase">ID: {team.id}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <input 
                        type="text" 
                        className="w-12 bg-zinc-900 border border-white/10 rounded px-1.5 py-0.5 text-xs text-center font-mono font-bold"
                        value={bInput} 
                        onChange={e => setTeamBudgets({ ...teamBudgets, [team.id]: e.target.value })}
                      />
                      <span className="text-xs text-white/50 font-mono">M</span>
                      <button 
                        onClick={() => handleUpdateBudget(team.id, parseFloat(bInput))}
                        className="bg-[#e10600] px-2 py-0.5 rounded text-[10px] uppercase font-bold text-white hover:bg-red-700 transition-colors"
                      >
                        Set
                      </button>
                    </div>
                  </div>

                  {/* Team Roster List */}
                  <div className="space-y-3 mb-4 flex-1">
                    <p className="text-[10px] uppercase font-mono text-white/30 tracking-wider">Pilotos Integrados ({team.pilotos?.length || 0})</p>
                    
                    {team.pilotos?.map((p: any) => {
                      const rIn = getEditVal(p.id, "rating_piloto", p.rating_piloto || 70);
                      const cIn = getEditVal(p.id, "clausula_actual", p.clausula_actual || 15);
                      const pIn = getEditVal(p.id, "precio_compra_split", p.precio_compra_split || 10);
                      const sIn = getEditVal(p.id, "puntos_piloto", p.puntos_piloto || 0);

                      return (
                        <div key={`team-p-${p.id}-${team.id}`} className="p-3 bg-white/5 border border-white/5 rounded-lg text-xs space-y-2.5">
                          <div className="flex justify-between items-center bg-white/5 p-1 px-1.5 rounded">
                            <EditableName
                              pilotId={p.id}
                              initialName={p.nombre}
                              className="font-bold text-white"
                              onSave={handleUpdatePilotName}
                            />
                            <button
                              onClick={() => {
                                setConfirmModal({
                                  isOpen: true,
                                  title: "Confirmar Expulsión",
                                  message: `¿Quieres quitar a ${p.nombre} de ${team.nombre}? Se convertirá en Agente Libre.`,
                                  onConfirm: () => {
                                    handleMovePilotOriginal(p.id, p.nombre, team.id, "agente_libre", p);
                                  }
                                });
                              }}
                              className="text-[10px] font-bold text-red-400 hover:text-red-500 tracking-wider uppercase bg-red-400/5 hover:bg-red-400/10 px-1.5 py-0.5 rounded"
                            >
                              Quitar
                            </button>
                          </div>

                          {/* Editable params */}
                          <div className="grid grid-cols-2 gap-2 text-[10px] font-mono text-white/50">
                            <div>
                              <span>Rating:</span>
                              <input 
                                type="number" 
                                className="w-full bg-zinc-900 border border-white/5 rounded px-1.5 py-0.5 text-white active:border-[#e10600] outline-none"
                                value={rIn} 
                                onChange={e => handleEditChange(p.id, "rating_piloto", e.target.value)}
                              />
                            </div>
                            <div>
                              <span>Puntos Split:</span>
                              <input 
                                type="number" 
                                className="w-full bg-zinc-900 border border-white/5 rounded px-1.5 py-0.5 text-white active:border-[#e10600] outline-none"
                                value={sIn} 
                                onChange={e => handleEditChange(p.id, "puntos_piloto", e.target.value)}
                              />
                            </div>
                            <div>
                              <span>Cláusula (M):</span>
                              <input 
                                type="number" 
                                className="w-full bg-zinc-900 border border-white/5 rounded px-1.5 py-0.5 text-white active:border-[#e10600] outline-none"
                                value={cIn} 
                                onChange={e => handleEditChange(p.id, "clausula_actual", e.target.value)}
                              />
                            </div>
                            <div>
                              <span>Compra (M):</span>
                              <input 
                                type="number" 
                                className="w-full bg-zinc-900 border border-white/5 rounded px-1.5 py-0.5 text-white active:border-[#e10600] outline-none"
                                value={pIn} 
                                onChange={e => handleEditChange(p.id, "precio_compra_split", e.target.value)}
                              />
                            </div>
                          </div>

                          <div className="flex gap-2 justify-between items-center pt-1 border-t border-white/5">
                            <button
                              onClick={() => handleUpdatePilotProps(team.id, p.id, {
                                rating_piloto: rIn,
                                clausula_actual: cIn,
                                precio_compra_split: pIn,
                                puntos_piloto: sIn
                              })}
                              className="bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 px-2 py-1 rounded text-[10px] font-bold uppercase transition-colors"
                            >
                              Guardar Valores
                            </button>

                            <select
                              className="bg-zinc-900 border border-white/10 rounded px-1.5 py-1 text-[10px] outline-none appearance-none cursor-pointer"
                              value={team.id}
                              onChange={e => handleMovePilotOriginal(p.id, p.nombre, team.id, e.target.value, p)}
                            >
                              <option value={team.id}>Reasignar a...</option>
                              {splits.find(s => s.id === selectedSplitId)?.equipos.filter((e: any) => e.id !== team.id).map((e: any) => (
                                <option key={e.id} value={e.id}>Mover a {e.nombre}</option>
                              ))}
                              <option value="agente_libre">Mover a Agente Libre</option>
                            </select>
                          </div>
                        </div>
                      );
                    })}

                    {(!team.pilotos || team.pilotos.length === 0) && (
                      <p className="text-[10px] text-white/20 italic text-center p-3 border border-dashed border-white/5 rounded-xl">Sin pilotos integrados</p>
                    )}
                  </div>

                  {/* Add pilot to this team */}
                  <div className="border-t border-white/5 pt-3">
                    <p className="text-[10px] font-mono text-white/30 mb-1.5 uppercase">Añadir Piloto al Equipo</p>
                    <select
                      className="w-full bg-zinc-900 border border-white/10 rounded px-2 py-1.5 text-xs text-white"
                      value=""
                      onChange={e => {
                        const targetUser = allPossiblePilots.find(u => u.uid === e.target.value);
                        if (targetUser) {
                          handleMovePilotOriginal(targetUser.uid, targetUser.nombre, "agente_libre", team.id, targetUser.raw);
                        }
                      }}
                    >
                      <option value="">-- Seleccionar piloto para incorporar --</option>
                      {allPossiblePilots.filter((u: any) => {
                        // Exclude users already in ANY team of THIS split
                        const currentRosters = splits.find(s => s.id === selectedSplitId)?.equipos.flatMap((eq: any) => eq.pilotos.map((p: any) => p.id)) || [];
                        return !currentRosters.some(id => id === u.uid || id === u.piloto_id);
                      }).map((u: any) => (
                        <option key={u.uid} value={u.uid}>
                          {u.nombre} {u.registered ? "(Registrado)" : "(Sin Registrar)"}
                        </option>
                      ))}
                    </select>
                  </div>

                </div>
              );
            })}
          </div>
        </section>

        {/* Change Admin Password Section */}
        <section className="mt-12 bg-zinc-900/50 border border-white/10 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 blur-[100px] -mr-32 -mt-32 rounded-full" />
          
          <div className="mb-6">
            <h2 className="text-xl font-black italic tracking-tighter text-white flex items-center gap-3 lowercase">
              <span className="w-1.5 h-6 bg-amber-500 block" />
              Seguridad del Administrador
            </h2>
            <p className="text-[10px] text-white/40 uppercase tracking-widest mt-2 font-mono">
              Cambia la contraseña de tu cuenta actual de forma local
            </p>
          </div>

          <form 
            className="max-w-md space-y-4 relative z-10"
            onSubmit={async (e) => {
              e.preventDefault();
              const form = e.target as HTMLFormElement;
              const newPass = (form.elements.namedItem('newPass') as HTMLInputElement).value;
              const confirmPass = (form.elements.namedItem('confirmPass') as HTMLInputElement).value;
              
              if (newPass !== confirmPass) {
                setMsg("Error: Las contraseñas no coinciden");
                return;
              }
              if (newPass.length < 6) {
                setMsg("Error: La contraseña debe tener al menos 6 caracteres");
                return;
              }

              const user = auth.currentUser;
              if (!user) {
                setMsg("Error: No estás autenticado actualmente");
                return;
              }

              setLoading(true);
              try {
                await updatePassword(user, newPass);
                setMsg("¡Contraseña de administrador actualizada con éxito!");
                form.reset();
              } catch (error: any) {
                if (error.code === 'auth/requires-recent-login') {
                  setMsg("Error: Por seguridad, debes cerrar sesión y volver a entrar antes de cambiar la contraseña.");
                } else {
                  setMsg(`Error al cambiar contraseña: ${error.message}`);
                }
              } finally {
                setLoading(false);
              }
            }}
          >
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg flex gap-3 text-amber-500/90 text-xs mb-4">
              <ShieldAlert className="w-5 h-5 flex-shrink-0" />
              <p>Esta acción cambiará la contraseña de la cuenta con la que has iniciado sesión. Asegúrate de guardarla en un lugar seguro.</p>
            </div>
            
            <div>
              <label className="block text-[10px] uppercase tracking-widest text-white/50 mb-1.5 font-bold">Nueva Contraseña</label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-3 text-white/30" />
                <input 
                  type="password" 
                  name="newPass"
                  required
                  placeholder="Mínimo 6 caracteres"
                  className="w-full bg-black/40 border border-white/10 rounded-lg py-2.5 pl-10 pr-4 text-xs outline-none focus:border-amber-500 transition-colors text-white"
                />
              </div>
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-widest text-white/50 mb-1.5 font-bold">Confirmar Nueva Contraseña</label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-3 text-white/30" />
                <input 
                  type="password" 
                  name="confirmPass"
                  required
                  placeholder="Repite la contraseña"
                  className="w-full bg-black/40 border border-white/10 rounded-lg py-2.5 pl-10 pr-4 text-xs outline-none focus:border-amber-500 transition-colors text-white"
                />
              </div>
            </div>
            <button 
              type="submit"
              disabled={loading}
              className="w-full bg-amber-500 hover:bg-amber-600 text-black font-black text-xs uppercase tracking-widest py-3 rounded-lg transition-colors flex justify-center items-center gap-2 mt-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Cambiar Contraseña"}
            </button>
          </form>
        </section>

        {/* Gestión de Usuarios */}
        <section className="mt-12 bg-zinc-900/50 border border-white/10 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
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
                      const splitTeams = splits.find(s => s.id === selectedSplitId)?.equipos || [];
                      const userTeam = splitTeams.find((eq: any) => eq.pilotos?.some((pil: any) => pil.id === user.uid || (user.piloto_id && pil.id === user.piloto_id)));
                      return userTeam ? userTeam.nombre : "Agente Libre";
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
          <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <div className="bg-zinc-950 border border-white/10 rounded-2xl p-6 max-w-sm w-full shadow-2xl relative text-left">
              <h3 className="text-lg font-black text-white uppercase tracking-tight mb-2 flex items-center gap-2">
                <span className="w-1.5 h-4 bg-[#e10600]" />
                {confirmModal.title}
              </h3>
              <p className="text-xs text-white/60 leading-relaxed mb-6">{confirmModal.message}</p>
              <div className="flex justify-end gap-3 font-semibold text-[10px] uppercase tracking-wider">
                <button
                  onClick={() => setConfirmModal(null)}
                  className="px-4 py-2.5 bg-white/5 hover:bg-white/10 text-white rounded-lg transition-colors border border-white/5"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    confirmModal.onConfirm();
                    setConfirmModal(null);
                  }}
                  className="px-4 py-2.5 bg-[#e10600] text-white rounded-lg hover:bg-red-700 transition-colors shadow-lg shadow-red-900/30"
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
        className="bg-zinc-800 text-white font-bold px-2 py-0.5 rounded border border-[#e10600] outline-none text-xs w-32 font-sans focus:ring-1 focus:ring-[#e10600]"
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
