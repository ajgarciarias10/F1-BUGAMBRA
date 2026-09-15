import React, { lazy, Suspense, useState, useEffect, useMemo } from "react";
import { UserHeader } from "./Dashboards";
import { useUsuarios, useSplits } from "../hooks/useData";
import { processRace, RaceResult, revertirCarreraCompleta, recalcSplitPoints } from "../services/raceProcessor";
import { procesarEconomiaCarrera, revertirEconomiaCarrera } from "../services/economyService";
import { db } from "../services/firebase";
import { doc, updateDoc, getDoc, collection, addDoc, setDoc, deleteDoc, getDocs, onSnapshot, writeBatch } from "firebase/firestore";
import { Calendar, AlertCircle, CheckCircle2, Loader2, User as UserIcon } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { isSplitUnlocked } from "../utils/splitResolver";
import { SuggestionsView } from "./SuggestionsView";
import { EconomyAdminPanel } from "./EconomyAdminPanel";
import { StorageImageUpload } from "./StorageImageUpload";
import { AuctionRoom } from "./AuctionRoom";
import { comenzarTemporada } from "../services/auctionService";
import { useAuth } from "../contexts/AuthContext";
import { AdminUsersPanel } from "./AdminUsersPanel";
import { AdminTeamManager } from "./AdminTeamManager";
import { StatusBanner } from "./Feedback";
import { AdminRivalriesPanel } from "./AdminRivalriesPanel";
import { SplitIntroPanel } from "./SplitIntroPanel";
import { useMarketLifecycleStatus } from "./MarketLifecycleProvider";
import { PaddockAdminPanel } from "./PaddockAdminPanel";

const SplitBuilderPanel = lazy(() => import("./SplitBuilderPanel").then(module => ({ default: module.SplitBuilderPanel })));

type AdminTab = "results" | "economy" | "rivalries" | "roster" | "paddock" | "production" | "suggestions" | "tools";

const ADMIN_TABS: Array<{ id: AdminTab; label: string; description: string }> = [
  { id: "results", label: "Carreras", description: "Programa la carrera, introduce los resultados y cierra el acta para liquidar su economía." },
  { id: "economy", label: "Economía y fichajes", description: "Gestiona los traspasos, contratos y presupuestos de cada split." },
  { id: "rivalries", label: "Rivalidades", description: "Define los grupos de pilotos que compiten por los premios de rivalidad." },
  { id: "roster", label: "Equipos y usuarios", description: "Gestiona las escuderías, las cuentas y sus roles." },
  { id: "paddock", label: "Paddock", description: "Revisa el OK completo y publica las bienvenidas oficiales con una foto." },
  { id: "production", label: "Vídeos", description: "Publica o cambia el vídeo de presentación de cada split." },
  { id: "suggestions", label: "Sugerencias", description: "Revisa las propuestas de la comunidad y actualiza su estado." },
  { id: "tools", label: "Datos y mantenimiento", description: "Controla el split destacado, los fichajes, la subasta y el inicio de temporada." },
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

export function AdminDashboard() {
  const { userData } = useAuth();
  const { usuarios } = useUsuarios();
  const { splits: rawSplits, loading: loadingSplits } = useSplits();
  const splits = rawSplits;
  const marketLifecycleError = useMarketLifecycleStatus();
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
  const [adminTab, setAdminTab] = useState<AdminTab>("results");
  const [showSplitBuilder, setShowSplitBuilder] = useState(false);
  const [logoEdits, setLogoEdits] = useState<Record<string, string>>({});
  const [savingLogo, setSavingLogo] = useState<string | null>(null);
  const [photoEdits, setPhotoEdits] = useState<Record<string, string>>({});
  const [savingPhoto, setSavingPhoto] = useState<string | null>(null);
  const [jequePhotoEdits, setJequePhotoEdits] = useState<Record<string, string>>({});
  const [savingJequePhoto, setSavingJequePhoto] = useState<string | null>(null);

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

  const [selectedCircuitoId, setSelectedCircuitoId] = useState("");
  const [isEditingFinished, setIsEditingFinished] = useState(false);
  const [isActaCerrada, setIsActaCerrada] = useState(false);
  const [procesandoEconomia, setProcesandoEconomia] = useState(false);
  const [economiaMsg, setEconomiaMsg] = useState("");
  const [isEconomiaProcesada, setIsEconomiaProcesada] = useState(false);
  const [revirtiendoEconomia, setRevirtiendoEconomia] = useState(false);
  const [reabriendoActa, setReabriendoActa] = useState(false);
  const [deshaciendoCarrera, setDeshaciendoCarrera] = useState(false);
  const [recalculandoPuntos, setRecalculandoPuntos] = useState(false);

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

  // Los borradores de imagen pertenecen únicamente al split seleccionado.
  useEffect(() => {
    setLogoEdits({});
    setPhotoEdits({});
    setJequePhotoEdits({});
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

  const handleSaveJequePhoto = async (uid: string, photoUrl: string) => {
    setSavingJequePhoto(uid);
    try {
      await updateDoc(doc(db, "usuarios", uid), { foto_url: photoUrl.trim() || null });
      setJequePhotoEdits(prev => { const next = { ...prev }; delete next[uid]; return next; });
      setMsg("Foto de jeque actualizada.");
      setTimeout(() => setMsg(""), 2500);
    } catch (err: any) {
      setMsg("Error foto: " + err.message);
    } finally {
      setSavingJequePhoto(null);
    }
  };

  // Auto-select next circuit on load or when splits change
  useEffect(() => {
    if (selectedSplitId || !splits.length) return;
    const initialSplit = splits.find(split => split.activo && split.id !== "global")
      || splits.find(split => split.id !== "global" && !split.completado)
      || splits.find(split => split.id !== "global");
    if (initialSplit) setSelectedSplitId(initialSplit.id);
  }, [splits, selectedSplitId]);

  useEffect(() => {
    if (!currentRawSplit || currentRawSplit.circuitos.some(circuit => circuit.id === selectedCircuitoId)) return;
    setSelectedCircuitoId(getNextCircuitOfSplit(currentRawSplit.circuitos)?.id || "");
  }, [currentRawSplit, selectedCircuitoId]);

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
        setIsEconomiaProcesada(!!circuito.economia_procesada);
        const savedResults: Record<string, Partial<RaceResult>> = {};
        circuito.resultados.forEach((res: RaceResult) => {
          savedResults[res.pilotoId] = res;
        });
        setResults(savedResults);
      } else {
        setIsEditingFinished(false);
        setIsActaCerrada(false);
        setIsEconomiaProcesada(false);
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
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

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

  const handleToggleFichajes = async () => {
    if (!selectedSplitId) return;
    setLoading(true);
    try {
      const currentSplit = splits.find(s => s.id === selectedSplitId);
      const finalVal = !(currentSplit?.fichajes_abiertos);
      const ref = doc(db, "splits", selectedSplitId);
      await updateDoc(ref, { fichajes_abiertos: finalVal, mercado_cerrado_por_plantillas: false });
      setMsg(`Ventana de fichajes ${finalVal ? "ABIERTA" : "CERRADA"} para ${currentSplit?.nombre || "Split"}.`);
      setTimeout(() => setMsg(""), 4000);
    } catch (err: any) {
      setMsg("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // El interruptor vivía en la vista del jeque, donde no servía de nada: las reglas de
  // Firestore solo dejan escribir el documento del split al admin, así que la casilla se
  // revertía sola y sin mensaje. Aquí, junto al resto de interruptores del split, sí manda.
  const handleToggleSubasta = async () => {
    if (!selectedSplitId) return;
    setLoading(true);
    try {
      const currentSplit = splits.find(s => s.id === selectedSplitId);
      const finalVal = !(currentSplit?.mercado_subasta_activado);
      await updateDoc(doc(db, "splits", selectedSplitId), { mercado_subasta_activado: finalVal });
      setMsg(finalVal
        ? `Subasta en vivo ACTIVADA en ${currentSplit?.nombre || "el split"}: la pestaña Mercado abre la sala de pujas.`
        : `Subasta en vivo DESACTIVADA en ${currentSplit?.nombre || "el split"}: los jeques fichan directamente desde Mercado.`);
      setTimeout(() => setMsg(""), 5000);
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
      const batch = writeBatch(db);
      if (!isActivo) {
        for (const s of splits.filter(s => s.id !== "global" && s.activo)) {
          batch.update(doc(db, "splits", s.id), { activo: false });
        }
      }
      batch.update(doc(db, "splits", selectedSplitId), { activo: !isActivo });
      await batch.commit();
      setMsg(`Split ${currentSplit?.nombre} ${!isActivo ? "ACTIVADO" : "DESACTIVADO"} en la web pública.`);
      setTimeout(() => setMsg(""), 4000);
    } catch (err: any) {
      setMsg("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleStartSplit = () => {
    if (!currentRawSplit || loading) return;
    const splitId = currentRawSplit.id;
    setConfirmModal({
      isOpen: true,
      title: `Comenzar ${currentRawSplit.nombre}`,
      message: "Se cerrará el mercado de este split y pasará a ser el split activo de la liga.",
      onConfirm: async () => {
        setLoading(true);
        try {
          const result = await comenzarTemporada(splitId);
          setMsg(result.ok ? result.message : `Error: ${result.message}`);
        } catch (error: any) {
          setMsg(`Error al comenzar el split: ${error.message}`);
        } finally { setLoading(false); }
      },
    });
  };

  const handleSyncSplitRosters = (splitId: string) => {
    const currentSplitName = splits.find(s => s.id === splitId)?.nombre || splitId;
    setConfirmModal({
      isOpen: true,
      title: `Inicializar ${currentSplitName}`,
       message: `¿Seguro que quieres INICIALIZAR las plantillas del ${currentSplitName.toUpperCase()} a partir del Split anterior? Los presupuestos heredarán el saldo conciliado, mientras que los puntos, victorias y podios empezarán en 0. El RATING de cada piloto se heredará del valor final que tenga en el split anterior.`,
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

           for (const previousSplit of sortedSplits.slice(0, currentIndex)) {
             const previousCircuits = await getDocs(collection(db, `splits/${previousSplit.id}/circuitos`));
             if (previousCircuits.empty) {
               throw new Error(`${previousSplit.nombre} no tiene carreras registradas.`);
             }
             const pendingCircuits = previousCircuits.docs.filter(circuitDoc => {
               const circuit = circuitDoc.data();
               return !circuit.completado
                 || !circuit.acta_cerrada
                 || !circuit.economia_procesada
                 || !Array.isArray(circuit.resultados)
                 || circuit.resultados.length === 0;
             });
             if (pendingCircuits.length) {
               throw new Error(`${previousSplit.nombre} tiene carreras sin resultados cerrados o sin economía procesada: ${pendingCircuits.map(circuit => circuit.data().nombre || circuit.id).join(", ")}.`);
             }
           }

           // Copiar equipos del split anterior conservando el saldo ya conciliado.
           const prevTeamsSnap = await getDocs(collection(db, `splits/${prevSplit.id}/equipos`));
           for (const prevTeamDoc of prevTeamsSnap.docs) {
             const teamData = prevTeamDoc.data();
             const inheritedBudget = Number(teamData.presupuesto ?? 100);
             await setDoc(doc(db, `splits/${splitId}/equipos`, prevTeamDoc.id), {
               id: prevTeamDoc.id,
               nombre: teamData.nombre || prevTeamDoc.id,
               presupuesto: inheritedBudget,
                presupuesto_inicial: inheritedBudget,
                presupuesto_arrastre: inheritedBudget,
                presupuesto_origen_splitId: prevSplit.id,
                puntos_constructores: 0
            }, { merge: true });
          }
          await setDoc(doc(db, `splits/${splitId}/equipos`, "agente_libre"), {
            id: "agente_libre", nombre: "Agentes libres", presupuesto: 0, puntos_constructores: 0,
          }, { merge: true });

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
           for (const prevEquipoDoc of prevTeamsSnap.docs) {
            const prevPilotosSnap = await getDocs(
              collection(db, `splits/${prevSplit.id}/equipos/${prevEquipoDoc.id}/pilotos`)
            );
            for (const prevPd of prevPilotosSnap.docs) {
              const r = prevPd.data();
              if (r.participa_hasta != null) continue;
               const pid = prevPd.id;
               const inheritedRating = r.rating_piloto ?? 70;
               const estado = r.estado_siguiente_split || (
                 r.pending_tipo_fichaje === "mantener" ? "mantener" :
                 r.pending_tipo_fichaje === "clausula" ? "clausula" :
                 r.pending_equipoId ? "subasta" : "agente_libre"
               );
                if (estado === "agente_libre") {
                  await setDoc(doc(db, `splits/${splitId}/equipos/agente_libre/pilotos`, pid), {
                    ...r,
                    pilotoId: pid,
                    equipoId: "agente_libre",
                    precio_compra: 0,
                    mantener_actual: 0,
                    clausula_actual: 0,
                    tipo_fichaje: "subasta",
                    participa_desde: 1,
                    participa_hasta: null,
                  });
                  pilotsInitialized++;
                  continue;
                }
               const nextEquipoId = r.pending_equipoId ?? r.equipoId;
               if (!nextEquipoId || nextEquipoId === "agente_libre") continue;
               const nextPrecioCompra = Number(r.precio_inicio_siguiente_split);
               if (!Number.isFinite(nextPrecioCompra)) {
                 throw new Error(`Falta el precio inicial manual del siguiente split para ${r.nombre || pid}.`);
               }
               // Un precio negativo divide en vez de multiplicar, conservando el signo (Excel T2/T3).
               const nextMantener = Math.round((nextPrecioCompra < 0 ? nextPrecioCompra / 3 : nextPrecioCompra * 3) * 10) / 10;
               const nextClausula = Math.round((nextPrecioCompra < 0 ? nextPrecioCompra / 2 : nextPrecioCompra * 2) * 10) / 10;

              await setDoc(doc(db, `splits/${splitId}/equipos/${nextEquipoId}/pilotos`, pid), {
                pilotoId:               pid,
                equipoId:               nextEquipoId,
                rating_piloto:          inheritedRating,
                rating_base:            inheritedRating,
                participa_desde:        1,
                participa_hasta:        null,
                 tipo_fichaje:           estado === "subasta" ? "subasta" : estado,
                puntos_piloto: 0, victorias: 0, podios: 0,
                poles: 0, dnfs: 0, carreras_limpias: 0,
                precio_compra:           nextPrecioCompra,
                mantener_actual:         nextMantener,
                clausula_actual:         nextClausula,
                mantener_inicial_split:  nextMantener,
                clausula_inicial_split:  nextClausula,
                precio_carrera_anterior: nextMantener,
                historial_precios:       {},
                 congelado:               false,
                congelado_en:            undefined,
              });

              pilotsInitialized++;
            }
          }

           await addDoc(collection(db, `splits/${splitId}/transfers`), {
             detalles: `⚙️ Admin inicializó los rosters del ${currentSplitName} desde ${prevSplit.nombre}. ${pilotsInitialized} pilotos copiados con precio inicial manual. Los no renovados quedan libres para subasta.`,
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

  // Solo se puede revertir la economía de la carrera procesada más reciente del split:
  // revertir una intermedia desordenaría la curva de precios de las que vinieron después.
  const esUltimaCarreraProcesada = useMemo(() => {
    if (!selectedSplitId || !selectedCircuitoId) return false;
    const split = splits.find(s => s.id === selectedSplitId);
    const circuitos = [...(split?.circuitos ?? [])].sort(
      (a: any, b: any) => (a.numero_carrera ?? 9999) - (b.numero_carrera ?? 9999)
    );
    const idx = circuitos.findIndex((c: any) => c.id === selectedCircuitoId);
    if (idx < 0) return false;
    return !circuitos.slice(idx + 1).some((c: any) => c.economia_procesada);
  }, [splits, selectedSplitId, selectedCircuitoId]);

  const handleRevertirEconomia = () => {
    if (!selectedSplitId || !selectedCircuitoId) return;
    setConfirmModal({
      isOpen: true,
      title: "Revertir economía de la carrera",
      message: "Devuelve a cada equipo lo que se le ingresó por esta carrera, borra sus transacciones y restaura el precio de cada piloto a como estaba antes. ¿Continuar?",
      onConfirm: async () => {
        setRevirtiendoEconomia(true);
        try {
          const result = await revertirEconomiaCarrera(selectedSplitId, selectedCircuitoId);
          setEconomiaMsg(result.message);
          if (result.ok) setIsEconomiaProcesada(false);
        } catch (err: any) {
          setEconomiaMsg("Error al revertir la economía: " + err.message);
        } finally {
          setRevirtiendoEconomia(false);
        }
      }
    });
  };

  const handleReabrirActa = () => {
    if (!selectedSplitId || !selectedCircuitoId) return;
    setConfirmModal({
      isOpen: true,
      title: "Reabrir acta de carrera",
      message: "Vuelve a permitir editar los resultados de esta carrera. Solo tiene sentido si ya has revertido su economía. ¿Continuar?",
      onConfirm: async () => {
        setReabriendoActa(true);
        try {
          const ref = doc(db, `splits/${selectedSplitId}/circuitos`, selectedCircuitoId);
          await updateDoc(ref, { acta_cerrada: false });
          setIsActaCerrada(false);
          setMsg("Acta reabierta: ya se pueden corregir los resultados.");
          setTimeout(() => setMsg(""), 4000);
        } catch (err: any) {
          setMsg("Error al reabrir acta: " + err.message);
        } finally {
          setReabriendoActa(false);
        }
      }
    });
  };

  const handleDeshacerCarrera = () => {
    if (!selectedSplitId || !selectedCircuitoId) return;
    setConfirmModal({
      isOpen: true,
      title: "Deshacer esta carrera por completo",
      message: "Revierte economía (si estaba procesada), borra los resultados, reabre el acta y recalcula puntos y rating del split entero desde lo que quede. Es como si esta carrera no se hubiera disputado. ¿Continuar?",
      onConfirm: async () => {
        setDeshaciendoCarrera(true);
        try {
          const result = await revertirCarreraCompleta(selectedSplitId, selectedCircuitoId);
          setMsg(result.message);
          if (result.ok) {
            setIsEconomiaProcesada(false);
            setIsActaCerrada(false);
            setIsEditingFinished(false);
            setResults({});
          }
        } catch (err: any) {
          setMsg("Error al deshacer la carrera: " + err.message);
        } finally {
          setDeshaciendoCarrera(false);
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
       const finalResults: RaceResult[] = splitPilots.map((p: any) => {
         const item = results[p.pilotoId] || {};
         const enteredQualy = typeof item.qualyPos === "number" ? item.qualyPos : parseInt(item.qualyPos as any);
         const enteredRace = typeof item.racePos === "number" ? item.racePos : parseInt(item.racePos as any);
         if (isNaN(enteredQualy) || enteredQualy <= 0) {
           throw new Error(`Falta la posición de clasificación de ${p.nombre}.`);
         }
         if (isNaN(enteredRace) || enteredRace <= 0) {
          throw new Error(`Falta la posición de carrera de ${p.nombre}.`);
        }
        const isDnf = enteredRace === 99;

         return {
           pilotoId: p.pilotoId,
           pilotoNombre: p.nombre,
           qualyPos: enteredQualy,
           racePos: enteredRace,
           isDnfOwnError: isDnf,
           fastestLap: item.fastestLap === true,
           isClean: !isDnf && item.isClean !== false,
         } as RaceResult;
       });

       if (finalResults.filter(result => result.qualyPos === 1).length !== 1) {
         throw new Error("Debe seleccionarse exactamente una pole.");
       }
       if (finalResults.filter(result => result.fastestLap).length !== 1) {
         throw new Error("Debe seleccionarse exactamente una vuelta rápida.");
       }

      const duplicatePositions = (field: "qualyPos" | "racePos") => {
        const counts = new Map<number, number>();
        finalResults.forEach(result => {
          const position = result[field];
          if (position !== 99) counts.set(position, (counts.get(position) || 0) + 1);
        });
        return [...counts.entries()].filter(([, count]) => count > 1).map(([position]) => position);
      };
       const duplicateQualy = duplicatePositions("qualyPos");
      const duplicateRace = duplicatePositions("racePos");
      if (duplicateQualy.length || duplicateRace.length) {
        throw new Error(`Hay posiciones duplicadas: ${duplicateQualy.length ? `qualy ${duplicateQualy.join(", ")}` : ""}${duplicateQualy.length && duplicateRace.length ? " y " : ""}${duplicateRace.length ? `carrera ${duplicateRace.join(", ")}` : ""}.`);
      }

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
    <div className="dark min-h-[100dvh] bg-[#0a0a0a] flex items-center justify-center">
      <div className="text-center font-mono animate-pulse text-white/50">
        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-[#e10600]" />
        Cargando temporada...
      </div>
    </div>
  );

  return (
    <div className="dark min-h-[100dvh] bg-[#0a0a0a] text-slate-100 px-3 md:px-4 pt-3 md:pt-4 pb-10 safe-x">
      <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between gap-3">
            <UserHeader title="Panel de Administración" />
            <div className="flex shrink-0 items-center gap-2">
              <a
                href="/ruleta-split-3.html"
                target="_blank"
                rel="noreferrer"
                className="border border-red-500/30 px-2.5 py-2 text-[10px] font-black uppercase tracking-wider text-red-300 hover:bg-red-500/10"
              >
                Ruleta
              </a>
              {userData?.piloto_id && (
                <button
                  onClick={() => { window.location.href = "/piloto"; }}
                  className="shrink-0 px-3 py-2 border border-amber-500/30 text-amber-300 hover:bg-amber-500/10 text-[10px] font-black uppercase tracking-wider"
                >
                  Ir a mi panel de piloto
                </button>
              )}
            </div>
          </div>

        {/* Navigation Tabs */}
         <nav aria-label="Secciones de administración" className="mb-4 grid grid-cols-2 gap-1 rounded-2xl border border-white/10 bg-zinc-950 p-1 sm:grid-cols-3 lg:grid-cols-8">
          {ADMIN_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setAdminTab(tab.id)}
              aria-current={adminTab === tab.id ? "page" : undefined}
              className={`min-h-12 cursor-pointer rounded-xl px-3 py-2 text-sm font-bold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-white ${
                adminTab === tab.id
                  ? "text-white bg-[#e10600] shadow-lg shadow-red-950/30"
                   : "text-white/65 hover:text-white hover:bg-white/[0.04]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        <p className="mb-5 text-sm leading-relaxed text-white/60">{ADMIN_TABS.find(tab => tab.id === adminTab)?.description}</p>

        {adminTab === "rivalries" ? (
          <AdminRivalriesPanel splits={splits} />
        ) : adminTab === "economy" ? (
          <EconomyAdminPanel splits={splits} />
        ) : adminTab === "roster" ? (
          <div className="space-y-6">
            <AdminTeamManager splitId={selectedSplitId} teams={currentRawSplit?.equipos || []} roster={currentRawSplit?.roster || []} splits={splits} onSelectSplit={(id: string) => setSelectedSplitId(id)} />
            <AdminUsersPanel />
            {msg && <StatusBanner message={msg} tone={msg.toLowerCase().includes("error") ? "error" : "exito"} onDismiss={() => setMsg("")} />}
          <details className="bg-white/[0.03] border border-white/10 rounded-xl p-4">
            <summary className="min-h-8 cursor-pointer text-sm font-bold">Fotos de pilotos y escudos de {currentRawSplit?.nombre || "este split"}</summary>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-3">
              <div>
                <p className="mt-2 text-sm text-white/60">Sube una imagen o pega su enlace para actualizar la ficha.</p>
              </div>
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

             {/* Fotos de jeques */}
             <div className="space-y-1.5">
               <p className="text-[9px] font-mono uppercase tracking-[0.4em] text-white/20 mb-2">Fotos de jeques y directores deportivos</p>
               <p className="mb-3 text-[10px] text-white/35">Estas fotos aparecerán junto a los pilotos en la sección Equipos.</p>
               {(usuarios || [])
                 .filter((usuario: any) => usuario.rol === "jeque" || usuario.rol === "director_deportivo")
                 .slice()
                 .sort((a: any, b: any) => (a.nombre || "").localeCompare(b.nombre || ""))
                 .map((jeque: any) => {
                   const currentPhoto = jeque.foto_url || "";
                   const editVal = jequePhotoEdits[jeque.uid] ?? currentPhoto;
                   const isSaving = savingJequePhoto === jeque.uid;
                   const team = (currentRawSplit?.equipos || []).find((item: any) => item.id === jeque.escuderia_id);
                   return (
                     <div key={jeque.uid} className="flex items-center gap-2">
                       <div className="w-8 h-8 rounded-full overflow-hidden border border-amber-300/20 shrink-0 bg-white/[0.02] flex items-center justify-center">
                         {editVal ? <img src={editVal} alt="" className="w-full h-full object-cover" /> : <UserIcon className="w-4 h-4 text-white/10" />}
                       </div>
                       <div className="w-32 shrink-0 min-w-0">
                         <span className="block truncate text-[10px] text-white/60 font-mono">{jeque.nombre || "Sin nombre"}</span>
                         <span className="block truncate text-[9px] text-amber-200/45">{team?.nombre || jeque.escuderia_id || "Sin escudería"}</span>
                       </div>
                       <StorageImageUpload
                         storagePath={`fotos/jeques/${jeque.uid}`}
                         currentUrl={editVal || undefined}
                         onUpload={url => handleSaveJequePhoto(jeque.uid, url)}
                         size="sm"
                       />
                       <input
                         type="url"
                         value={editVal}
                         onChange={event => setJequePhotoEdits(prev => ({ ...prev, [jeque.uid]: event.target.value }))}
                         placeholder="o pega URL aquí"
                         className="flex-1 min-w-0 bg-white/[0.02] border border-white/10 px-2.5 py-1.5 text-[10px] text-white outline-none focus:border-[#e10600] transition-colors font-mono"
                       />
                       <button
                         onClick={() => handleSaveJequePhoto(jeque.uid, editVal)}
                         disabled={isSaving}
                         className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-[10px] uppercase font-bold tracking-wider transition-colors disabled:opacity-50 shrink-0 flex items-center gap-1"
                       >
                         {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : "OK"}
                       </button>
                     </div>
                   );
                 })}
               {(usuarios || []).filter((usuario: any) => usuario.rol === "jeque" || usuario.rol === "director_deportivo").length === 0 && (
                 <p className="text-[9px] font-mono text-white/15">Sin jeques ni directores deportivos registrados</p>
               )}
             </div>

           </details>
            {!isSelectedSplitInitialized && selectedSplitId !== "split_1" && (
              <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/30 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                <div>
                  <h4 className="text-sm font-bold text-amber-400">Este split todavía no tiene pilotos</h4>
                  <p className="text-[10px] text-white/60 mt-0.5 max-w-2xl">
                    Copia la plantilla del split anterior para empezar a gestionar sus fichajes.
                  </p>
                </div>
                  <button onClick={() => handleSyncSplitRosters(selectedSplitId)} disabled={loading}
                    className="min-h-11 rounded-lg bg-amber-500 hover:bg-amber-600 text-black px-3 text-sm font-bold shrink-0 transition-colors cursor-pointer disabled:opacity-40">
                    Copiar plantilla anterior
                </button>
              </div>
            )}

          </div>
        ) : adminTab === "paddock" ? (
          <PaddockAdminPanel splits={splits} />
        ) : adminTab === "production" ? (
          <SplitIntroPanel splits={splits} />
        ) : adminTab === "suggestions" ? (
          <SuggestionsView isAdmin={true} />
        ) : adminTab === "tools" ? (
          <div className="space-y-6">
            <section className="rounded-2xl border border-white/15 bg-white/[0.04] p-5 space-y-5">
              <div>
                <h2 className="text-lg font-black">Mercado y subasta</h2>
                <p className="mt-1 text-sm text-white/60">1. Elige el split. 2. Abre los fichajes. 3. Activa la subasta si quieres usar pujas.</p>
              </div>
              <label className="block text-sm font-bold">Split que quieres gestionar
                <select value={selectedSplitId} onChange={event => setSelectedSplitId(event.target.value)} disabled={loading} className="mt-2 block min-h-12 w-full rounded-xl border border-white/20 bg-[#151515] px-3 text-white">
                  {splits.filter(split => split.id !== "global").map(split => <option key={split.id} value={split.id}>{split.nombre}</option>)}
                </select>
              </label>
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
                <div>
                  <p className="text-sm font-bold">{currentRawSplit?.activo ? "Split destacado en la web" : "Este split no es el destacado"}</p>
                  <p className="mt-1 text-sm text-white/60">El split destacado es el que se muestra primero al entrar.</p>
                </div>
                <button type="button" onClick={handleSetSplitActivo} disabled={loading || !currentRawSplit} className="min-h-11 rounded-xl border border-white/20 px-4 text-sm font-bold hover:bg-white/10 disabled:opacity-40">
                  {currentRawSplit?.activo ? "Quitar destacado" : "Destacar este split"}
                </button>
              </div>
              {currentRawSplit?.tipo !== "individual" && !currentRawSplit?.completado && !currentRawSplit?.temporada_iniciada ? <div className="grid gap-3 sm:grid-cols-2">
                {[
                  { label: "Ventana de fichajes", checked: currentRawSplit?.fichajes_abiertos === true, action: handleToggleFichajes, description: "Permite las operaciones de mercado de este split." },
                  { label: "Subasta en vivo", checked: currentRawSplit?.mercado_subasta_activado === true, action: handleToggleSubasta, description: "Activada: sala de pujas. Desactivada: fichaje directo." },
                ].map(control => <button key={control.label} type="button" role="switch" aria-checked={control.checked} aria-label={control.label} disabled={loading || !currentRawSplit || currentRawSplit.tipo === "individual"} onClick={control.action} className="rounded-xl border border-white/15 p-4 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400 disabled:opacity-40">
                  <span className="flex items-center justify-between gap-3"><span className="font-bold">{control.label}</span><span aria-hidden="true" className={`flex h-7 w-12 shrink-0 items-center rounded-full p-1 transition-colors ${control.checked ? "bg-emerald-500" : "bg-white/20"}`}><span className={`h-5 w-5 rounded-full bg-white transition-transform ${control.checked ? "translate-x-5" : ""}`} /></span></span>
                  <span className="mt-2 block text-sm text-white/65">{control.checked ? "Activada" : "Desactivada"} · {control.description}</span>
                </button>)}
              </div> : <p className="text-sm text-white/60">{currentRawSplit?.tipo === "individual" ? "Este split individual no utiliza mercado de equipos." : "El mercado de preparación ya está cerrado para este split."}</p>}
              <p className="text-sm text-white/60">Con tu sesión de admin abierta, las bienvenidas y el cierre por plantillas completas se gestionan automáticamente.</p>
              {currentRawSplit?.mercado_cerrado_por_plantillas && <StatusBanner tone="exito" message="Todas las plantillas están completas. Mercado cerrado para este split." />}
              {msg && <StatusBanner message={msg} tone={msg.startsWith("Error") ? "error" : "exito"} onDismiss={() => setMsg("")} />}
              {marketLifecycleError && <StatusBanner message={marketLifecycleError} tone="error" />}
            </section>
            {currentRawSplit?.mercado_subasta_activado && currentRawSplit.tipo !== "individual" && !currentRawSplit.completado && !currentRawSplit.temporada_iniciada && (
              <AuctionRoom key={selectedSplitId} splits={splits} splitId={selectedSplitId} />
            )}
            <section className="rounded-2xl border border-white/10 p-5 space-y-4">
              <h2 className="text-lg font-black">Temporada</h2>
              {currentRawSplit && currentRawSplit.tipo !== "individual" && !currentRawSplit.completado && !currentRawSplit.temporada_iniciada && (
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm text-white/60">Cuando termine el mercado, comienza {currentRawSplit.nombre}.</p>
                  <button type="button" disabled={loading} onClick={handleStartSplit} className="min-h-11 rounded-xl bg-[#e10600] px-4 text-sm font-bold disabled:opacity-40">Comenzar split</button>
                </div>
              )}
              {currentRawSplit?.temporada_iniciada && <p className="text-sm text-emerald-300">{currentRawSplit.nombre} ya ha comenzado. Gestiona sus carreras desde «Carreras».</p>}
              <button type="button" aria-expanded={showSplitBuilder} aria-controls="admin-split-builder" onClick={() => setShowSplitBuilder(true)} disabled={showSplitBuilder} className="min-h-11 rounded-xl border border-white/20 px-4 text-sm font-bold hover:bg-white/10 disabled:opacity-40">Preparar siguiente split o temporada</button>
              {showSplitBuilder && <div id="admin-split-builder">
                <Suspense fallback={<p role="status" className="py-4 text-sm text-white/60">Cargando preparación del split…</p>}>
                  <SplitBuilderPanel splits={splits} onClose={() => setShowSplitBuilder(false)} />
                </Suspense>
              </div>}
            </section>
          </div>
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
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <div>
                <label className="block text-[9px] text-white/40 uppercase font-mono mb-1 font-bold">Nº carrera</label>
                <input type="number" min={1} max={20} value={numeroCarrera}
                  onChange={(e) => setNumeroCarrera(parseInt(e.target.value) || 1)}
                  className="w-full bg-white/[0.02] border border-white/10 min-h-11 rounded-lg px-2.5 text-white outline-none md:min-h-0 md:rounded-sm md:py-1.5 md:text-xs focus:border-[#e10600] transition-colors text-center"
                />
              </div>
              <div>
                <label className="block text-[9px] text-white/40 uppercase font-mono mb-1 font-bold">Fecha</label>
                <input type="date" value={fechaVal} onChange={(e) => setFechaVal(e.target.value)}
                  className="w-full bg-white/[0.02] border border-white/10 min-h-11 rounded-lg px-2.5 text-white outline-none md:min-h-0 md:rounded-sm md:py-1.5 md:text-xs focus:border-[#e10600] transition-colors"
                />
              </div>
              <div>
                <label className="block text-[9px] text-white/40 uppercase font-mono mb-1 font-bold">Hora</label>
                <input type="time" value={horaVal} onChange={(e) => setHoraVal(e.target.value)}
                  className="w-full bg-white/[0.02] border border-white/10 min-h-11 rounded-lg px-2.5 text-white outline-none md:min-h-0 md:rounded-sm md:py-1.5 md:text-xs focus:border-[#e10600] transition-colors"
                />
              </div>
              <div className="flex items-end">
                <button onClick={handleSaveSchedule} disabled={isSavingSchedule}
                  className="w-full border border-white/10 text-white/80 min-h-11 rounded-lg px-3 text-[12px] font-bold md:min-h-0 md:rounded-sm md:py-1.5 md:text-[9px] md:uppercase md:tracking-wider transition-all flex items-center justify-center gap-1.5 hover:bg-white/[0.06] cursor-pointer disabled:opacity-40"
                >
                  {isSavingSchedule ? <Loader2 className="w-3 h-3 animate-spin" /> : "Guardar"}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-[9px] text-white/40 uppercase font-mono mb-1 font-bold">URL Hotlap (YouTube)</label>
              <input type="url" value={hotlapUrl} onChange={(e) => setHotlapUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
                className="w-full bg-white/[0.02] border border-white/10 min-h-11 rounded-lg px-2.5 text-white outline-none md:min-h-0 md:rounded-sm md:py-1.5 md:text-xs focus:border-[#e10600] transition-colors font-mono"
              />
            </div>
          </div>
        </div>
        
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

              {isActaCerrada && !isEconomiaProcesada && (
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
                    // processed puede salir en 0 por un guard interno (resultados
                    // inválidos, sin pole/vuelta rápida...): en ese caso no se aplicó
                    // nada y no hay que marcar la economía como procesada.
                    if (result.processed > 0) setIsEconomiaProcesada(true);
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

          <details className="mt-3 rounded-xl border border-white/10 p-3">
            <summary className="min-h-8 cursor-pointer text-sm font-bold text-white/70">Corregir una carrera o recalcular el split</summary>
            <p className="mt-2 text-sm text-white/60">Para editar un acta cerrada, revierte primero su economía y después reabre el acta.</p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {isEconomiaProcesada && <button
                disabled={revirtiendoEconomia || !esUltimaCarreraProcesada}
                title={esUltimaCarreraProcesada ? "" : "Hay una carrera posterior con economía procesada: revierte primero esa."}
                onClick={handleRevertirEconomia}
                className="min-h-11 rounded-lg border border-orange-500/40 px-3 text-sm font-bold text-orange-300 disabled:opacity-40"
              >{revirtiendoEconomia ? "Revirtiendo…" : "Revertir economía"}</button>}
              {isActaCerrada && !isEconomiaProcesada && <button
                disabled={reabriendoActa} onClick={handleReabrirActa}
                className="min-h-11 rounded-lg border border-sky-500/40 px-3 text-sm font-bold text-sky-300 disabled:opacity-40"
              >{reabriendoActa ? "Reabriendo…" : "Reabrir acta"}</button>}
              {isEditingFinished && (!isEconomiaProcesada || esUltimaCarreraProcesada) && <button
                disabled={deshaciendoCarrera} onClick={handleDeshacerCarrera}
                className="min-h-11 rounded-lg border border-red-500/40 px-3 text-sm font-bold text-red-300 disabled:opacity-40"
              >{deshaciendoCarrera ? "Deshaciendo…" : "Deshacer carrera"}</button>}
            <button
              onClick={async () => {
                if (!selectedSplitId) return;
                setRecalculandoPuntos(true);
                try {
                  const result = await recalcSplitPoints(selectedSplitId);
                  setMsg(result.message);
                  setTimeout(() => setMsg(""), 6000);
                } catch (err: any) {
                  setMsg("Error al recalcular: " + err.message);
                } finally {
                  setRecalculandoPuntos(false);
                }
              }}
              disabled={recalculandoPuntos || !selectedSplitId}
              title="Rehace puntos, rating y puntos de constructor desde cero a partir de los circuitos que sigan completados. Úsalo si un split se queda con cifras desincronizadas."
              className="min-h-11 rounded-lg border border-sky-500/40 px-3 text-sm font-bold text-sky-300 disabled:opacity-40 flex items-center gap-1"
            >
              {recalculandoPuntos ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : null}
              Recalcular puntos y rating
            </button>
            </div>
          </details>

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

          <div className="-mx-3 overflow-x-auto px-3 md:-mx-4 md:px-4">
            <table className="w-full text-sm text-left border-collapse">
              <thead>
                <tr className="text-[9px] text-white/30 uppercase tracking-[0.2em] font-mono border-b border-white/10 pb-2">
                   <th className="pb-2 pl-3 font-normal">Piloto</th>
                   <th className="pb-2 text-center font-normal">Qualy</th>
                   <th className="pb-2 text-center font-normal">V. rápida</th>
                   <th className="pb-2 text-center font-normal">Limpio</th>
                   <th className="pb-2 font-normal">Race</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {(splits.find(s => s.id === selectedSplitId)?.roster || [])
                  .filter((pilot: any) => canPilotParticipateInRace(pilot, numeroCarrera))
                  .map((p: any, i: number) => {
                   const qPosVal = results[p.pilotoId]?.qualyPos;
                    const isQualyDuplicated = typeof qPosVal === "number" && qPosVal !== 99 && (qualyCount[qPosVal] || 0) > 1;
                  const rPosVal = results[p.pilotoId]?.racePos;
                   const isRaceDuplicated = typeof rPosVal === "number" && rPosVal !== 99 && (raceCount[rPosVal] || 0) > 1;
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
                       <td className="py-2.5 text-center">
                         <input type="number" min="1" max="20" disabled={isActaCerrada}
                           value={qPosVal ?? ""} title={isQualyDuplicated ? "¡Posición de clasificación duplicada!" : qPosVal === 1 ? "Pole position" : undefined}
                           className={`w-12 bg-[#1a1a1a]/50 border rounded-sm px-2 py-1.5 text-center outline-none focus:border-[#e10600] transition-colors font-mono text-xs disabled:opacity-40 ${isQualyDuplicated ? "border-amber-500/60 text-amber-300 bg-amber-500/5" : "border-white/10 text-white"}`}
                           onChange={e => {
                             const val = parseInt(e.target.value);
                             handleUpdate(p.pilotoId, "qualyPos", isNaN(val) ? "" : val);
                           }} />
                       </td>
                       <td className="py-2.5 text-center">
                         <input type="checkbox" checked={results[p.pilotoId]?.fastestLap === true} disabled={isActaCerrada} title="Vuelta rápida"
                           className="w-4 h-4 accent-fuchsia-500"
                           onChange={e => handleUpdate(p.pilotoId, "fastestLap", e.target.checked)} />
                       </td>
                       <td className="py-2.5 text-center">
                         <input type="checkbox" checked={results[p.pilotoId]?.isClean !== false} disabled={isActaCerrada} title="Desmarcar si el piloto fue sancionado"
                           className="w-4 h-4 accent-emerald-500"
                           onChange={e => handleUpdate(p.pilotoId, "isClean", e.target.checked)} />
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
                           disabled={isActaCerrada}
                           value={rPosVal ?? ""}
                          onChange={e => {
                            const val = parseInt(e.target.value);
                            handleUpdate(p.pilotoId, "racePos", isNaN(val) ? "" : val);
                          }}
                        />
                      </td>
                    </tr>
                  );
                })}
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
