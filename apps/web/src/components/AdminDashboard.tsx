import React, { lazy, Suspense, useState, useEffect, useMemo } from "react";
import { Link } from "react-router";
import { UserHeader } from "./Dashboards";
import { useUsuarios, useSplits, usePilotos } from "../hooks/useData";
import { processRace, RaceResult, revertirCarreraCompleta, recalcSplitPoints } from "../services/raceProcessor";
import { procesarEconomiaCarrera, revertirEconomiaCarrera, mantenerInicialDe, clausulaInicialDe } from "../services/economyService";
import { db } from "../services/firebase";
import { doc, updateDoc, getDoc, collection, addDoc, setDoc, deleteDoc, getDocs, onSnapshot, writeBatch } from "firebase/firestore";
import { Calendar, AlertCircle, CheckCircle2, Loader2, User as UserIcon, FileText } from "lucide-react";
import { RaceReportModal } from "./RaceReportModal";
import { motion, AnimatePresence } from "motion/react";
import { isSplitUnlocked } from "../utils/splitResolver";
import { SuggestionsView } from "./SuggestionsView";
import { EconomyAdminPanel } from "./EconomyAdminPanel";
import { SaldosHistoricosPanel } from "./SaldosHistoricosPanel";
import { StorageImageUpload } from "./StorageImageUpload";
import { AuctionRoom } from "./AuctionRoom";
import { comenzarTemporada } from "../services/auctionService";
import { useAuth } from "../contexts/AuthContext";
import { AdminUsersPanel } from "./AdminUsersPanel";
import { AdminTeamManager } from "./AdminTeamManager";
import { StatusBanner } from "./Feedback";
import { canPilotParticipateInRace } from "../services/readModels";
import { programarCarrera, setFastestLapVideo } from "../services/readModelService";
import { runAuditedAdminMutation, runAuditedAdminBatch } from "../services/adminMutationService";
import { mergeDoc, planActaCerrada, planBooleanFlag, planNameEdit, planPhotoEdit } from "../utils/adminMutationPlans";
import { slug } from "../services/splitBuilder";
import { AdminRivalriesPanel } from "./AdminRivalriesPanel";
import { SplitIntroPanel } from "./SplitIntroPanel";
import { useMarketLifecycleStatus } from "./MarketLifecycleProvider";
import { RaceWinnersImagePanel } from "./RaceWinnersImagePanel";
import { buildHistoricalRaceCorrectionPlan, HistoricalRaceCorrectionPlan } from "../utils/historicalRaceCorrectionPlan";
import { resultadosDelActa } from "../utils/actaResultados";

import { useSingleFlight } from "../hooks/useSingleFlight";
const SplitBuilderPanel = lazy(() => import("./SplitBuilderPanel").then(module => ({ default: module.SplitBuilderPanel })));

type AdminTab = "results" | "economy" | "balances" | "rivalries" | "roster" | "production" | "suggestions" | "tools";

const ADMIN_TABS: Array<{ id: AdminTab; label: string; description: string }> = [
  { id: "results", label: "Carreras", description: "Programa la carrera, introduce los resultados y cierra el acta para liquidar su economía. Tras cerrarla, aquí puedes generar y descargar con Gemini un borrador de imagen del podio." },
  { id: "economy", label: "Economía y fichajes", description: "Gestiona los traspasos, contratos y presupuestos de cada split." },
  { id: "balances", label: "Saldos por GP", description: "Reconstruye desde el libro el saldo de cada escudería tras los GP ya liquidados y lo guarda solo si cuadra." },
  { id: "rivalries", label: "Rivalidades", description: "Define los grupos de pilotos que compiten por los premios de rivalidad." },
  { id: "roster", label: "Equipos y usuarios", description: "Gestiona las escuderías, las cuentas y sus roles." },
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

export function AdminDashboard() {
  const { run: runOnce, pending: pendingOnce } = useSingleFlight();
  const { userData } = useAuth();
  const { usuarios } = useUsuarios();
  const { pilotos } = usePilotos();
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
  const [historicalCorrectionPlan, setHistoricalCorrectionPlan] = useState<
    (HistoricalRaceCorrectionPlan & { splitId: string }) | null
  >(null);

  // Form State
  const [results, setResults] = useState<Record<string, Partial<RaceResult>>>({});
  // Pilotos marcados como «no corrió»: no se guardan en resultados (sin puntos, sin DNF,
  // sin economía y el rating se arrastra intacto).
  const [noCorrieron, setNoCorrieron] = useState<Set<string>>(new Set());

  // Real-time counts of positions to detect duplicates during editing
  const qualyCount = useMemo(() => {
    const counts: Record<number, number> = {};
    (Object.values(results) as Partial<RaceResult>[]).forEach(res => {
      const q = res.qualyPos;
      if (q !== undefined && q !== null && typeof q === "number" && !isNaN(q) && q !== 99) {
        counts[q] = (counts[q] || 0) + 1;
      }
    });
    return counts;
  }, [results]);

  const raceCount = useMemo(() => {
    const counts: Record<number, number> = {};
    (Object.values(results) as Partial<RaceResult>[]).forEach(res => {
      const r = res.racePos;
      const isPilotDnf = res.isDnf === true;
      if (!isPilotDnf && r !== undefined && r !== null && typeof r === "number" && !isNaN(r) && r !== 99) {
        counts[r] = (counts[r] || 0) + 1;
      }
    });
    return counts;
  }, [results]);

  const raceImageWinners = useMemo(() => {
    const roster = currentRawSplit?.roster ?? [];
    return Object.entries(results)
      .filter(([pilotId, result]) => !noCorrieron.has(pilotId) && result.isDnf !== true
        && Number.isSafeInteger(result.racePos) && Number(result.racePos) >= 1 && Number(result.racePos) <= 3)
      .map(([pilotId, result]) => {
        const rosterPilot = roster.find((pilot: any) => pilot.pilotoId === pilotId);
        const inPlantilla = plantilla.find((p: any) => p.id === pilotId);
        const pilotName = (rosterPilot?.nombre || inPlantilla?.nombre || pilotId).toLowerCase().trim();
        const globalPilot = (pilotos || []).find((p: any) => p.id === pilotId || p.nombre?.toLowerCase().trim() === pilotName);
        const usuario = (usuarios || []).find((u: any) =>
          u.uid === pilotId ||
          u.piloto_id === pilotId ||
          (u.nombre && (u.nombre.toLowerCase().trim() === pilotName || u.nombre.toLowerCase().trim().startsWith(pilotName)))
        );
        // Prioridad 1: foto del usuario registrado (perfil activo del piloto en este split)
        // Prioridad 2: foto en plantilla
        // Prioridad 3: foto del roster
        // Prioridad 4: foto global histórica del piloto
        const photoUrl = usuario?.foto_url || inPlantilla?.foto_url || rosterPilot?.foto_url || globalPilot?.foto_url || undefined;
        return {
          pilotId,
          name: rosterPilot?.nombre || inPlantilla?.nombre || globalPilot?.nombre || pilotId,
          position: Number(result.racePos),
          photoUrl: photoUrl || undefined,
        };
      })
      .sort((a, b) => a.position - b.position)
      .slice(0, 3)
      .map(({ name, position, photoUrl }) => ({ name, position, ...(photoUrl ? { photoUrl } : {}) }));
  }, [results, currentRawSplit, noCorrieron, plantilla, usuarios, pilotos]);

  const poleImageWinner = useMemo(() => {
    const roster = currentRawSplit?.roster ?? [];
    const poleEntry = Object.entries(results).find(
      ([pilotId, result]) => !noCorrieron.has(pilotId) && Number(result.qualyPos) === 1
    );
    if (!poleEntry) return null;
    const [pilotId] = poleEntry;
    const rosterPilot = roster.find((pilot: any) => pilot.pilotoId === pilotId);
    const inPlantilla = plantilla.find((p: any) => p.id === pilotId);
    const pilotName = (rosterPilot?.nombre || inPlantilla?.nombre || pilotId).toLowerCase().trim();
    const globalPilot = (pilotos || []).find((p: any) => p.id === pilotId || p.nombre?.toLowerCase().trim() === pilotName);
    const usuario = (usuarios || []).find((u: any) =>
      u.uid === pilotId ||
      u.piloto_id === pilotId ||
      (u.nombre && (u.nombre.toLowerCase().trim() === pilotName || u.nombre.toLowerCase().trim().startsWith(pilotName)))
    );
    const photoUrl = usuario?.foto_url || inPlantilla?.foto_url || rosterPilot?.foto_url || globalPilot?.foto_url || undefined;
    return {
      name: rosterPilot?.nombre || inPlantilla?.nombre || globalPilot?.nombre || pilotId,
      position: 1,
      photoUrl,
    };
  }, [results, currentRawSplit, noCorrieron, plantilla, usuarios, pilotos]);

  // Schedule State
  const [fechaVal, setFechaVal] = useState("");
  const [horaVal, setHoraVal] = useState("");
  const [hotlapUrl, setHotlapUrl] = useState("");
  const [numeroCarrera, setNumeroCarrera] = useState<number>(1);
  const [nombreCircuito, setNombreCircuito] = useState("");
  const [nuevaCarrera, setNuevaCarrera] = useState("");
  const [isAddingRace, setIsAddingRace] = useState(false);
  const [isSavingSchedule, setIsSavingSchedule] = useState(false);
  const [showRaceReport, setShowRaceReport] = useState(false);

  // Los borradores de imagen pertenecen únicamente al split seleccionado.
  useEffect(() => {
    setLogoEdits({});
    setPhotoEdits({});
    setJequePhotoEdits({});
  }, [selectedSplitId]);

  const handleSaveTeamLogo = async (teamId: string, logoUrl: string) => {
    return runOnce(async () => {
    if (!selectedSplitId) return;
    setSavingLogo(teamId);
    try {
      await runAuditedAdminMutation({
        ref: doc(db, `splits/${selectedSplitId}/equipos`, teamId),
        action: "team_logo_update",
        summary: `Logo de la escudería ${teamId}`,
        apply: current => {
          if (!current) throw new Error("La escudería no existe. No se aplicó ningún cambio.");
          return mergeDoc(current, { logo_url: logoUrl.trim() || null });
        },
      });
      setMsg("Logo actualizado.");
      setTimeout(() => setMsg(""), 2500);
    } catch (err: any) {
      setMsg("Error: " + err.message + " (no se aplicó ningún cambio)");
    } finally {
      setSavingLogo(null);
    }
  });
};

  const handleSavePilotPhoto = async (pilotoId: string, photoUrl: string) => {
    return runOnce(async () => {
    setSavingPhoto(pilotoId);
    try {
      const trimmed = photoUrl.trim() || null;
      const usuario = (usuarios || []).find((u: any) => u.uid === pilotoId || u.piloto_id === pilotoId);
      const targets: { ref: ReturnType<typeof doc>; mode: "update" | "merge"; required?: boolean }[] = [];
      if (usuario) {
        targets.push({ ref: doc(db, "usuarios", usuario.uid), mode: "update", required: true });
      } else {
        // Piloto sin cuenta: guardar en colección global pilotos
        targets.push({ ref: doc(db, "pilotos", pilotoId), mode: "merge" });
        // También en plantilla para que la foto se transfiera al registrarse
        if (plantilla.find((p: any) => p.id === pilotoId)) {
          targets.push({ ref: doc(db, "plantilla", pilotoId), mode: "update" });
        }
      }

      // Guardar también directamente en el split seleccionado para que este split tenga su foto asociada
      if (selectedSplitId) {
        const rosterPilot = (currentRawSplit?.roster || []).find((p: any) => p.pilotoId === pilotoId);
        const equipoId = rosterPilot?.equipoId;
        if (equipoId && equipoId !== "agente_libre" && equipoId !== "individual") {
          targets.push({ ref: doc(db, `splits/${selectedSplitId}/equipos/${equipoId}/pilotos`, pilotoId), mode: "merge" });
        }
        targets.push({ ref: doc(db, `splits/${selectedSplitId}/roster`, pilotoId), mode: "merge" });
      }

      // Todos los documentos de esta edición y su registro de auditoría van en una sola transacción.
      await runAuditedAdminBatch({
        refs: targets.map(t => t.ref),
        action: "pilot_photo_update",
        summary: `Foto del piloto ${pilotoId}`,
        apply: currents => ({
          writes: planPhotoEdit(currents, targets.map(t => ({ path: t.ref.path, mode: t.mode, required: t.required })), trimmed),
        }),
      });

      setPhotoEdits(prev => { const n = { ...prev }; delete n[pilotoId]; return n; });
      setMsg("Foto de piloto actualizada para este split.");
      setTimeout(() => setMsg(""), 2500);
    } catch (err: any) {
      setMsg("Error foto: " + err.message + " (no se aplicó ningún cambio)");
    } finally {
      setSavingPhoto(null);
    }
  });
};

  const handleSaveJequePhoto = async (uid: string, photoUrl: string) => {
    return runOnce(async () => {
    setSavingJequePhoto(uid);
    try {
      const photo = photoUrl.trim() || null;
      await runAuditedAdminMutation({
        ref: doc(db, "usuarios", uid),
        action: "jeque_photo_update",
        summary: `Foto del jeque ${uid}`,
        apply: current => {
          if (!current) throw new Error("El usuario no existe. No se aplicó ningún cambio.");
          return mergeDoc(current, { foto_url: photo });
        },
      });
      setJequePhotoEdits(prev => { const next = { ...prev }; delete next[uid]; return next; });
      setMsg("Foto de jeque actualizada.");
      setTimeout(() => setMsg(""), 2500);
    } catch (err: any) {
      setMsg("Error foto: " + err.message + " (no se aplicó ningún cambio)");
    } finally {
      setSavingJequePhoto(null);
    }
  });
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
      setNombreCircuito(circuito?.nombre || "");
      
      if (circuito?.completado && circuito.resultados) {
        setIsEditingFinished(true);
        setIsActaCerrada(!!circuito.acta_cerrada);
        setIsEconomiaProcesada(!!circuito.economia_procesada);
        const savedResults: Record<string, Partial<RaceResult>> = {};
        circuito.resultados.forEach((res: RaceResult) => {
          savedResults[res.pilotoId] = res;
        });
        setResults(savedResults);
        const raceSequence = Number(circuito.numero_carrera ?? 1);
        setNoCorrieron(new Set(
          (split?.roster || [])
            .filter((pilot: any) => canPilotParticipateInRace(pilot, raceSequence) && !savedResults[pilot.pilotoId])
            .map((pilot: any) => pilot.pilotoId)
        ));
      } else {
        setIsEditingFinished(false);
        setIsActaCerrada(false);
        setIsEconomiaProcesada(false);
        setResults({});
        setNoCorrieron(new Set());
      }
    }
  }, [selectedSplitId, selectedCircuitoId, splits]);

  // Añade una carrera al calendario del split elegido. Numera seguido: tras la última del split o,
  // si aún no tiene ninguna, tras la última de los splits anteriores de la liga.
  const handleAddRace = async () => {
    if (isAddingRace) return;
    const nombre = nuevaCarrera.trim();
    const split = splits.find(s => s.id === selectedSplitId);
    if (!split || !nombre) return;
    const numeros = (lista: any[]) => lista.map((c: any) => Number(c.numero_carrera)).filter(Number.isFinite);
    const previos = splits.filter(s => s.tipo !== "individual" && Number(s.orden ?? 0) < Number(split.orden ?? 0)).flatMap(s => s.circuitos);
    const numero = Math.max(0, ...numeros(split.circuitos.length ? split.circuitos : previos)) + 1;
    const id = slug(nombre);
    if (!id) { setMsg("Escribe un nombre de carrera válido."); return; }
    setIsAddingRace(true);
    setMsg("");
    try {
      await runAuditedAdminMutation({
        ref: doc(db, `splits/${split.id}/circuitos`, id),
        action: "race_add",
        summary: `Añadir ${nombre} al calendario de ${split.nombre}`,
        apply: current => {
          if (current) throw new Error(`${split.nombre} ya tiene una carrera «${current.nombre || id}». Usa otro nombre, por ejemplo el del circuito.`);
          return { nombre, numero_carrera: numero, completado: false, acta_cerrada: false, economia_procesada: false, resultados: [] };
        },
      });
      setNuevaCarrera("");
      setMsg(`${nombre} añadida a ${split.nombre} como GP ${numero}.`);
    } catch (err: any) {
      setMsg("Error añadiendo la carrera: " + err.message + " (no se aplicó ningún cambio)");
    } finally {
      setIsAddingRace(false);
    }
  };

  const handleSaveSchedule = async () => {
    return runOnce(async () => {
    if (!selectedSplitId || !selectedCircuitoId) return;
    const nombre = nombreCircuito.trim();
    if (!nombre) { setMsg("Escribe el nombre del circuito. No se aplicó ningún cambio."); return; }
    setIsSavingSchedule(true);
    setMsg("");
    try {
      await programarCarrera(selectedSplitId, selectedCircuitoId, { nombre, fecha: fechaVal, hora: horaVal, numero_carrera: numeroCarrera });
      // El vídeo se guarda por el servicio auditado (transacción + registro antes/después).
      const storedHotlap = splits.find(s => s.id === selectedSplitId)?.circuitos.find((c: any) => c.id === selectedCircuitoId)?.hotlap_url || "";
      if (hotlapUrl.trim() !== storedHotlap) {
        try {
          await setFastestLapVideo(selectedSplitId, selectedCircuitoId, hotlapUrl);
        } catch (videoErr: any) {
          setMsg("Programación guardada, pero el vídeo NO se guardó: " + videoErr.message);
          return;
        }
      }
      setMsg("Programación de la carrera guardada correctamente.");
      setTimeout(() => setMsg(""), 4000);
    } catch (err: any) {
      setMsg("Error guardando programación: " + err.message + " (no se aplicó ningún cambio)");
    } finally {
      setIsSavingSchedule(false);
    }
  });
};

  // Management State
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  const handleUpdatePilotName = async (pilotId: string, newName: string) => {
    return runOnce(async () => {
    if (!newName || !newName.trim()) return;
    const trimmedName = newName.trim();

    try {
      // usuarios, plantilla y pilotos: una sola transacción y una sola entrada de auditoría.
      const refs = [doc(db, "usuarios", pilotId), doc(db, "plantilla", pilotId), doc(db, "pilotos", pilotId)];
      await runAuditedAdminBatch({
        refs,
        action: "pilot_name_update",
        summary: `Nombre del piloto ${pilotId}: "${trimmedName}"`,
        apply: currents => ({ writes: planNameEdit(currents, trimmedName) }),
      });

      setMsg(`Nombre de piloto actualizado a "${trimmedName}"`);
      setTimeout(() => {
        setMsg("");
      }, 3000);
    } catch (err: any) {
      setMsg("Error al actualizar nombre: " + err.message + " (no se aplicó ningún cambio)");
    }
  });
};

  const handleToggleFichajes = async () => {
    return runOnce(async () => {
    if (!selectedSplitId) return;
    setLoading(true);
    try {
      const currentSplit = splits.find(s => s.id === selectedSplitId);
      const expected = !!currentSplit?.fichajes_abiertos;
      const finalVal = !expected;
      const ref = doc(db, "splits", selectedSplitId);
      // Se valida contra el valor guardado dentro de la transacción; si difiere del panel, no se aplica nada.
      await runAuditedAdminBatch({
        refs: [ref],
        action: "fichajes_abiertos_toggle",
        summary: `Ventana de fichajes ${finalVal ? "abierta" : "cerrada"} en ${selectedSplitId}`,
        apply: currents => ({
          writes: { [ref.path]: planBooleanFlag(currents[ref.path], "fichajes_abiertos", expected, { mercado_cerrado_por_plantillas: false }).after },
        }),
      });
      setMsg(`Ventana de fichajes ${finalVal ? "ABIERTA" : "CERRADA"} para ${currentSplit?.nombre || "Split"}.`);
      setTimeout(() => setMsg(""), 4000);
    } catch (err: any) {
      setMsg("Error: " + err.message + " (no se aplicó ningún cambio)");
    } finally {
      setLoading(false);
    }
  });
};

  // El interruptor vivía en la vista del jeque, donde no servía de nada: las reglas de
  // Firestore solo dejan escribir el documento del split al admin, así que la casilla se
  // revertía sola y sin mensaje. Aquí, junto al resto de interruptores del split, sí manda.
  const handleToggleSubasta = async () => {
    return runOnce(async () => {
    if (!selectedSplitId) return;
    setLoading(true);
    try {
      const currentSplit = splits.find(s => s.id === selectedSplitId);
      const expected = !!currentSplit?.mercado_subasta_activado;
      const finalVal = !expected;
      const splitRef = doc(db, "splits", selectedSplitId);
      await runAuditedAdminBatch({
        refs: [splitRef],
        action: "mercado_subasta_toggle",
        summary: `Subasta en vivo ${finalVal ? "activada" : "desactivada"} en ${selectedSplitId}`,
        apply: currents => ({
          writes: { [splitRef.path]: planBooleanFlag(currents[splitRef.path], "mercado_subasta_activado", expected).after },
        }),
      });
      setMsg(finalVal
        ? `Subasta en vivo ACTIVADA en ${currentSplit?.nombre || "el split"}: la pestaña Mercado abre la sala de pujas.`
        : `Subasta en vivo DESACTIVADA en ${currentSplit?.nombre || "el split"}: los jeques fichan directamente desde Mercado.`);
      setTimeout(() => setMsg(""), 5000);
    } catch (err: any) {
      setMsg("Error: " + err.message + " (no se aplicó ningún cambio)");
    } finally {
      setLoading(false);
    }
  });
};

  const handleSetSplitActivo = async () => {
    return runOnce(async () => {
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
  });
};

  const handleStartSplit = () => {
    if (!currentRawSplit || loading) return;
    const splitId = currentRawSplit.id;
    setConfirmModal({
      isOpen: true,
      title: `Comenzar ${currentRawSplit.nombre}`,
      message: "Se cerrará el mercado de este split y pasará a ser el split activo de la liga.",
      onConfirm: async () => {
    return runOnce(async () => {
        setLoading(true);
        try {
          const result = await comenzarTemporada(splitId);
          setMsg(result.ok ? result.message : `Error: ${result.message}`);
        } catch (error: any) {
          setMsg(`Error al comenzar el split: ${error.message}`);
        } finally { setLoading(false); }
      });
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
    return runOnce(async () => {
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

          // Preparar y validar toda la sustitución antes de escribir para evitar un split
          // medio vacío si falta un precio manual o una escudería de destino.
          const prevTeamsSnap = await getDocs(collection(db, `splits/${prevSplit.id}/equipos`));
          const existingTeamsSnap = await getDocs(collection(db, `splits/${splitId}/equipos`));
          const [previousRosters, existingRosters] = await Promise.all([
            Promise.all(prevTeamsSnap.docs.map(team => getDocs(collection(db, `splits/${prevSplit.id}/equipos/${team.id}/pilotos`)))),
            Promise.all(existingTeamsSnap.docs.map(team => getDocs(collection(db, `splits/${splitId}/equipos/${team.id}/pilotos`)))),
          ]);
          const teamIds = new Set(prevTeamsSnap.docs.map(team => team.id));
          const writes = new Map<string, { ref: any; kind: "set" | "delete"; data?: any }>();
          const planSet = (ref: any, data: any, merge = false) => writes.set(ref.path, { ref, kind: "set", data: merge ? { ...data, __merge: true } : data });
          const planDelete = (ref: any) => writes.set(ref.path, { ref, kind: "delete" });

          prevTeamsSnap.docs.forEach(team => {
            const data = team.data();
            const budget = Number(data.presupuesto);
            if (!Number.isFinite(budget)) throw new Error(`${data.nombre || team.id} no tiene un presupuesto válido; corrígelo antes de crear el siguiente split.`);
            planSet(doc(db, `splits/${splitId}/equipos`, team.id), {
              id: team.id, nombre: data.nombre || team.id, presupuesto: budget,
              presupuesto_inicial: budget, presupuesto_arrastre: budget,
              presupuesto_origen_splitId: prevSplit.id, puntos_constructores: 0,
            }, true);
          });
          planSet(doc(db, `splits/${splitId}/equipos`, "agente_libre"), {
            id: "agente_libre", nombre: "Agentes libres", presupuesto: 0, puntos_constructores: 0,
          }, true);
          existingRosters.forEach(roster => roster.docs.forEach(pilot => planDelete(pilot.ref)));

          let pilotsInitialized = 0;
          previousRosters.forEach(roster => roster.docs.forEach(previousPilot => {
            const r = previousPilot.data();
            if (r.participa_hasta != null) return;
            const pid = previousPilot.id;
            const inheritedRating = r.rating_piloto ?? 70;
            const estado = r.estado_siguiente_split || (
              r.pending_tipo_fichaje === "mantener" ? "mantener" :
              r.pending_tipo_fichaje === "clausula" ? "clausula" :
              r.pending_equipoId ? "subasta" : "agente_libre"
            );
            if (estado === "agente_libre") {
              planSet(doc(db, `splits/${splitId}/equipos/agente_libre/pilotos`, pid), {
                ...r, pilotoId: pid, equipoId: "agente_libre", precio_compra: 0,
                mantener_actual: 0, clausula_actual: 0, tipo_fichaje: "subasta",
                participa_desde: 1, participa_hasta: null,
              });
              pilotsInitialized++;
              return;
            }
            const nextTeamId = r.pending_equipoId ?? r.equipoId;
            if (!nextTeamId || nextTeamId === "agente_libre") return;
            if (!teamIds.has(nextTeamId)) throw new Error(`La escudería ${nextTeamId} de ${r.nombre || pid} no existe en el split anterior.`);
            const price = Number(r.precio_inicio_siguiente_split);
            if (!Number.isFinite(price)) throw new Error(`Falta el precio inicial manual del siguiente split para ${r.nombre || pid}.`);
            const priceRules = splits.find(s => s.id === splitId)?.economia_config;
            const keep = mantenerInicialDe(price, priceRules);
            const clause = clausulaInicialDe(price, priceRules);
            planSet(doc(db, `splits/${splitId}/equipos/${nextTeamId}/pilotos`, pid), {
              pilotoId: pid, equipoId: nextTeamId, rating_piloto: inheritedRating,
              rating_base: inheritedRating, participa_desde: 1, participa_hasta: null,
              tipo_fichaje: estado === "subasta" ? "subasta" : estado,
              puntos_piloto: 0, victorias: 0, podios: 0, poles: 0, dnfs: 0, carreras_limpias: 0,
              precio_compra: price, mantener_actual: keep, clausula_actual: clause,
              mantener_inicial_split: keep, clausula_inicial_split: clause,
              precio_carrera_anterior: keep, historial_precios: {}, congelado: false,
            });
            pilotsInitialized++;
          }));

          const logRef = doc(collection(db, `splits/${splitId}/transfers`));
          planSet(logRef, {
            detalles: `⚙️ Admin inicializó los rosters del ${currentSplitName} desde ${prevSplit.nombre}. ${pilotsInitialized} pilotos copiados con precio inicial manual. Los no renovados quedan libres para subasta.`,
            timestamp: new Date().toISOString(), tipo: "admin",
          });
          if (writes.size > 500) throw new Error(`La inicialización requiere ${writes.size} escrituras y supera el límite de 500 de una operación atómica. No se realizó ningún cambio.`);
          const batch = writeBatch(db);
          writes.forEach(write => {
            if (write.kind === "delete") batch.delete(write.ref);
            else {
              const data = { ...write.data };
              const merge = data.__merge === true;
              delete data.__merge;
              if (merge) batch.set(write.ref, data, { merge: true });
              else batch.set(write.ref, data);
            }
          });
          await batch.commit();

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
      });
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
    return runOnce(async () => {
        setLoading(true);
        try {
          const ref = doc(db, `splits/${selectedSplitId}/circuitos`, selectedCircuitoId);
          const res = await runAuditedAdminBatch({
            refs: [ref],
            action: "acta_cerrada_close",
            summary: `Acta cerrada en ${selectedCircuitoId}`,
            apply: currents => ({ writes: { [ref.path]: planActaCerrada(currents[ref.path], true).after } }),
          });
          setIsActaCerrada(true);
          setMsg(res.changed ? "Acta cerrada correctamente. Resultados bloqueados." : "El acta ya estaba cerrada. No se cambió nada.");
          setTimeout(() => {
            setMsg("");
          }, 4000);
        } catch (err: any) {
          setMsg("Error al cerrar acta: " + err.message + " (no se aplicó ningún cambio)");
        } finally {
          setLoading(false);
        }
      });
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

  const planForSelectedRace = useMemo(
    () => buildHistoricalRaceCorrectionPlan(currentRawSplit?.circuitos ?? [], selectedCircuitoId),
    [currentRawSplit, selectedCircuitoId],
  );

  useEffect(() => {
    if (historicalCorrectionPlan && historicalCorrectionPlan.splitId !== selectedSplitId) {
      setHistoricalCorrectionPlan(null);
    }
  }, [historicalCorrectionPlan, selectedSplitId]);

  const handleRevertirEconomia = () => {
    if (!selectedSplitId || !selectedCircuitoId) return;
    setConfirmModal({
      isOpen: true,
      title: "Revertir economía de la carrera",
      message: "Devuelve a cada equipo lo que se le ingresó por esta carrera, borra sus transacciones y restaura el precio de cada piloto a como estaba antes. ¿Continuar?",
      onConfirm: async () => {
    return runOnce(async () => {
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
      });
}
    });
  };

  const handleReabrirActa = () => {
    if (!selectedSplitId || !selectedCircuitoId) return;
    setConfirmModal({
      isOpen: true,
      title: isEconomiaProcesada ? "Reabrir acta y revertir economía" : "Reabrir acta de carrera",
      message: isEconomiaProcesada
        ? "Esta carrera ya tiene la economía procesada. Para editar los resultados (como desmarcar carrera limpia a Carlos), se revertirá primero su liquidación económica para evitar descuadres. Una vez guardados los cambios, podrás volver a cerrar el acta y procesar la economía. ¿Continuar?"
        : "Vuelve a permitir editar los resultados de esta carrera. ¿Continuar?",
      onConfirm: async () => {
    return runOnce(async () => {
        setReabriendoActa(true);
        try {
          if (isEconomiaProcesada) {
            const rev = await revertirEconomiaCarrera(selectedSplitId, selectedCircuitoId);
            if (!rev.ok) {
              setMsg("Error al revertir economía: " + rev.message);
              return;
            }
            setIsEconomiaProcesada(false);
          }
          const ref = doc(db, `splits/${selectedSplitId}/circuitos`, selectedCircuitoId);
          const res = await runAuditedAdminBatch({
            refs: [ref],
            action: "acta_cerrada_reopen",
            summary: `Acta reabierta en ${selectedCircuitoId}`,
            apply: currents => ({ writes: { [ref.path]: planActaCerrada(currents[ref.path], false).after } }),
          });
          setIsActaCerrada(false);
          if (!res.changed && !isEconomiaProcesada) setMsg("El acta ya estaba abierta. No se cambió nada.");
          else setMsg(isEconomiaProcesada ? "Economía revertida y acta reabierta: ya puedes modificar los resultados." : "Acta reabierta: ya se pueden corregir los resultados.");
          setTimeout(() => setMsg(""), 4000);
        } catch (err: any) {
          setMsg("Error al reabrir acta: " + err.message + " (no se aplicó ningún cambio)");
        } finally {
          setReabriendoActa(false);
        }
      });
}
    });
  };

  const handleDeshacerCarrera = () => {
    if (!selectedSplitId || !selectedCircuitoId) return;
    setConfirmModal({
      isOpen: true,
      title: "Deshacer esta carrera por completo",
      message: "Borra los resultados, reabre el acta y corrige puntos y rating en una sola operación. Si esta carrera o una posterior tiene economía aplicada, revierte primero esa economía. ¿Continuar?",
      onConfirm: async () => {
    return runOnce(async () => {
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
      });
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
    return runOnce(async () => {
    if (!selectedSplitId || !selectedCircuitoId) {
      setMsg("Selecciona un circuito primero.");
      return;
    }

    const currentSplit = splits.find(s => s.id === selectedSplitId);
    const selectedRace = currentSplit?.circuitos.find((race: any) => race.id === selectedCircuitoId);
    const selectedRaceSequence = Number(selectedRace?.numero_carrera ?? 1);
    const splitPilots = (currentSplit?.roster || []).filter((pilot: any) =>
      canPilotParticipateInRace(pilot, selectedRaceSequence) && !noCorrieron.has(pilot.pilotoId)
    );

    if (splitPilots.length === 0) {
      setMsg("No hay pilotos que hayan corrido esta carrera.");
      return;
    }

    setLoading(true);
    setMsg("");
    try {
       const finalResults = resultadosDelActa(splitPilots.map((p: any) => ({ ...results[p.pilotoId], pilotoId: p.pilotoId, nombre: p.nombre })));

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
  });
};

  const getCircuitName = () => {
    const s = splits.find(sp => sp.id === selectedSplitId);
    const c = s?.circuitos.find((ci: any) => ci.id === selectedCircuitoId);
    return c?.nombre || "CARRERA";
  };

  if (loadingSplits) return (
    <div className="min-h-[100dvh] bg-bg flex items-center justify-center">
      <div className="text-center font-mono animate-pulse text-ink-2">
        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-brand" />
        Cargando temporada...
      </div>
    </div>
  );

  return (
    <div className="min-h-[100dvh] bg-bg text-ink px-3 md:px-4 pt-3 md:pt-4 pb-10 safe-x">
      <div className="max-w-7xl mx-auto">
          <UserHeader
            title="Panel de Administración"
            action={(
              <Link
                to="/piloto"
                className="flex min-h-11 w-full items-center justify-center rounded-xl border border-line bg-surface-3 px-4 text-xs font-bold uppercase tracking-[0.12em] text-ink transition-colors hover:border-brand/50 hover:bg-brand/10 hover:text-ink sm:w-auto sm:rounded-sm sm:text-[10px]"
              >
                {userData?.piloto_id ? "Ir a mi panel de piloto" : "Acceder a la web"}
              </Link>
            )}
          />

        {/* Navigation Tabs */}
         <nav aria-label="Secciones de administración" className="mb-4 grid grid-cols-2 gap-1 rounded-2xl border border-line bg-surface p-1 sm:grid-cols-3 lg:grid-cols-8">
          {ADMIN_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setAdminTab(tab.id)}
              aria-current={adminTab === tab.id ? "page" : undefined}
              className={`min-h-12 cursor-pointer rounded-xl px-3 py-2 text-sm font-bold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-focus ${
                adminTab === tab.id
                  ? "text-brand-ink bg-brand shadow-lg"
                   : "text-ink-2 hover:text-ink hover:bg-surface-3"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        <p className="mb-5 text-sm leading-relaxed text-ink-2">{ADMIN_TABS.find(tab => tab.id === adminTab)?.description}</p>

        {adminTab === "rivalries" ? (
          <AdminRivalriesPanel splits={splits} />
        ) : adminTab === "economy" ? (
          <EconomyAdminPanel splits={splits} />
        ) : adminTab === "balances" ? (
          <SaldosHistoricosPanel splits={splits} />
        ) : adminTab === "roster" ? (
          <div className="space-y-6">
            <AdminTeamManager splitId={selectedSplitId} teams={currentRawSplit?.equipos || []} roster={currentRawSplit?.roster || []} splits={splits} onSelectSplit={(id: string) => setSelectedSplitId(id)} />
            <AdminUsersPanel />
            {msg && <StatusBanner message={msg} tone={msg.toLowerCase().includes("error") ? "error" : "exito"} onDismiss={() => setMsg("")} />}
          <details className="bg-surface-2 border border-line rounded-xl p-4">
            <summary className="min-h-8 cursor-pointer text-sm font-bold">Fotos de pilotos y escudos de {currentRawSplit?.nombre || "este split"}</summary>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-3">
              <div>
                <p className="mt-2 text-sm text-ink-2">Sube una imagen o pega su enlace para actualizar la ficha.</p>
              </div>
            </div>

            {/* Logos de escuderías */}
            <div className="mb-4 pb-4 border-b border-line space-y-1.5">
              <p className="text-[9px] font-mono uppercase tracking-[0.4em] text-ink-muted mb-2">Logos de escuderías</p>
              {(currentRawSplit?.equipos || []).map((team: any) => {
                const editVal = logoEdits[team.id] ?? (team.logo_url ?? "");
                const isSavingL = savingLogo === team.id;
                return (
                  <div key={team.id} className="flex items-center gap-2">
                    <span className="text-[10px] text-ink-2 w-28 shrink-0 truncate font-mono">{team.nombre}</span>
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
                      className="flex-1 min-w-0 bg-surface-2 border border-line px-2.5 py-1.5 text-[10px] text-ink outline-none focus:border-brand transition-colors font-mono"
                    />
                    <button aria-busy={pendingOnce || undefined}
                      onClick={() => handleSaveTeamLogo(team.id, editVal)}
                      disabled={(isSavingL) || pendingOnce}
                      className="px-3 py-1.5 bg-surface-3 hover:bg-surface-3 text-[10px] uppercase font-bold tracking-wider transition-colors disabled:opacity-50 shrink-0 flex items-center gap-1"
                    >
                      {isSavingL ? <Loader2 className="w-3 h-3 animate-spin" /> : "OK"}
                    </button>
                  </div>
                );
              })}
              {(currentRawSplit?.equipos || []).length === 0 && (
                <p className="text-[9px] font-mono text-ink-muted">Sin escuderías en este split</p>
              )}
            </div>

            {/* Fotos de pilotos */}
            <div className="mb-4 pb-4 border-b border-line space-y-1.5">
              <p className="text-[9px] font-mono uppercase tracking-[0.4em] text-ink-muted mb-2">Fotos de pilotos</p>
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
                      <div className="w-8 h-8 rounded-full overflow-hidden border border-line shrink-0 bg-surface-2 flex items-center justify-center">
                        {currentPhoto ? (
                          <img src={currentPhoto} className="w-full h-full object-cover" />
                        ) : (
                          <UserIcon className="w-4 h-4 text-ink-muted" />
                        )}
                      </div>
                      <span className="text-[10px] text-ink-2 w-24 shrink-0 truncate font-mono">{p.nombre}</span>
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
                        className="flex-1 min-w-0 bg-surface-2 border border-line px-2.5 py-1.5 text-[10px] text-ink outline-none focus:border-brand transition-colors font-mono"
                      />
                      <button aria-busy={pendingOnce || undefined}
                        onClick={() => handleSavePilotPhoto(p.pilotoId, editVal)}
                        disabled={(isSaving) || pendingOnce}
                        className="px-3 py-1.5 bg-surface-3 hover:bg-surface-3 text-[10px] uppercase font-bold tracking-wider transition-colors disabled:opacity-50 shrink-0 flex items-center gap-1"
                      >
                        {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : "OK"}
                      </button>
                    </div>
                  );
                })}
             {(currentRawSplit?.roster || []).length === 0 && (
               <p className="text-[9px] font-mono text-ink-muted">Sin pilotos en este split</p>
             )}
             </div>

             {/* Fotos de jeques */}
             <div className="space-y-1.5">
               <p className="text-[9px] font-mono uppercase tracking-[0.4em] text-ink-muted mb-2">Fotos de jeques y directores deportivos</p>
               <p className="mb-3 text-[10px] text-ink-muted">Estas fotos aparecerán junto a los pilotos en la sección Equipos.</p>
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
                       <div className="w-8 h-8 rounded-full overflow-hidden border border-warn/40 shrink-0 bg-surface-2 flex items-center justify-center">
                         {editVal ? <img src={editVal} alt="" className="w-full h-full object-cover" /> : <UserIcon className="w-4 h-4 text-ink-muted" />}
                       </div>
                       <div className="w-32 shrink-0 min-w-0">
                         <span className="block truncate text-[10px] text-ink-2 font-mono">{jeque.nombre || "Sin nombre"}</span>
                         <span className="block truncate text-[9px] text-warn">{team?.nombre || jeque.escuderia_id || "Sin escudería"}</span>
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
                         className="flex-1 min-w-0 bg-surface-2 border border-line px-2.5 py-1.5 text-[10px] text-ink outline-none focus:border-brand transition-colors font-mono"
                       />
                       <button aria-busy={pendingOnce || undefined}
                         onClick={() => handleSaveJequePhoto(jeque.uid, editVal)}
                         disabled={(isSaving) || pendingOnce}
                         className="px-3 py-1.5 bg-surface-3 hover:bg-surface-3 text-[10px] uppercase font-bold tracking-wider transition-colors disabled:opacity-50 shrink-0 flex items-center gap-1"
                       >
                         {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : "OK"}
                       </button>
                     </div>
                   );
                 })}
               {(usuarios || []).filter((usuario: any) => usuario.rol === "jeque" || usuario.rol === "director_deportivo").length === 0 && (
                 <p className="text-[9px] font-mono text-ink-muted">Sin jeques ni directores deportivos registrados</p>
               )}
             </div>

           </details>
            {!isSelectedSplitInitialized && selectedSplitId !== "split_1" && (
              <div className="mb-4 p-3 bg-warn-soft border border-warn/40 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                <div>
                  <h4 className="text-sm font-bold text-warn">Este split todavía no tiene pilotos</h4>
                  <p className="text-[10px] text-ink-2 mt-0.5 max-w-2xl">
                    Copia la plantilla del split anterior para empezar a gestionar sus fichajes.
                  </p>
                </div>
                  <button onClick={() => handleSyncSplitRosters(selectedSplitId)} disabled={loading}
                    className="min-h-11 rounded-lg bg-warn-soft border border-warn/40 hover:bg-warn-soft/20 text-warn px-3 text-sm font-bold shrink-0 transition-colors cursor-pointer disabled:opacity-40">
                    Copiar plantilla anterior
                </button>
              </div>
            )}

          </div>
        ) : adminTab === "production" ? (
          <SplitIntroPanel splits={splits} />
        ) : adminTab === "suggestions" ? (
          <SuggestionsView isAdmin={true} />
        ) : adminTab === "tools" ? (
          <div className="space-y-6">
            <section className="rounded-2xl border border-line bg-surface-3 p-5 space-y-5">
              <div>
                <h2 className="text-lg font-bold">Mercado y subasta</h2>
                <p className="mt-1 text-sm text-ink-2">1. Elige el split. 2. Abre los fichajes. 3. Activa la subasta si quieres usar pujas.</p>
              </div>
              <label className="block text-sm font-bold">Split que quieres gestionar
                <select value={selectedSplitId} onChange={event => setSelectedSplitId(event.target.value)} disabled={loading} className="mt-2 block min-h-12 w-full rounded-xl border border-line bg-surface px-3 text-ink">
                  {splits.filter(split => split.id !== "global").map(split => <option key={split.id} value={split.id}>{split.nombre}</option>)}
                </select>
              </label>
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
                <div>
                  <p className="text-sm font-bold">{currentRawSplit?.activo ? "Split destacado en la web" : "Este split no es el destacado"}</p>
                  <p className="mt-1 text-sm text-ink-2">El split destacado es el que se muestra primero al entrar.</p>
                </div>
                <button aria-busy={pendingOnce || undefined} type="button" onClick={handleSetSplitActivo} disabled={(loading || !currentRawSplit) || pendingOnce} className="min-h-11 rounded-xl border border-line px-4 text-sm font-bold hover:bg-surface-3 disabled:opacity-40">
                  {currentRawSplit?.activo ? "Quitar destacado" : "Destacar este split"}
                </button>
              </div>
              {currentRawSplit?.tipo !== "individual" && !currentRawSplit?.completado && !currentRawSplit?.temporada_iniciada ? <div className="grid gap-3 sm:grid-cols-2">
                {[
                  { label: "Ventana de fichajes", checked: currentRawSplit?.fichajes_abiertos === true, action: handleToggleFichajes, description: "Permite las operaciones de mercado de este split." },
                  { label: "Subasta en vivo", checked: currentRawSplit?.mercado_subasta_activado === true, action: handleToggleSubasta, description: "Activada: sala de pujas. Desactivada: fichaje directo." },
                ].map(control => <button key={control.label} type="button" role="switch" aria-checked={control.checked} aria-label={control.label} disabled={loading || !currentRawSplit || currentRawSplit.tipo === "individual"} onClick={control.action} className="rounded-xl border border-line p-4 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-info disabled:opacity-40">
                  <span className="flex items-center justify-between gap-3"><span className="font-bold">{control.label}</span><span aria-hidden="true" className={`flex h-7 w-12 shrink-0 items-center rounded-full p-1 transition-colors ${control.checked ? "bg-ok" : "bg-surface-3"}`}><span className={`h-5 w-5 rounded-full bg-surface transition-transform ${control.checked ? "translate-x-5" : ""}`} /></span></span>
                  <span className="mt-2 block text-sm text-ink-2">{control.checked ? "Activada" : "Desactivada"} · {control.description}</span>
                </button>)}
              </div> : <p className="text-sm text-ink-2">{currentRawSplit?.tipo === "individual" ? "Este split individual no utiliza mercado de equipos." : "El mercado de preparación ya está cerrado para este split."}</p>}
              <p className="text-sm text-ink-2">Con tu sesión de admin abierta, las bienvenidas y el cierre por plantillas completas se gestionan automáticamente.</p>
              {currentRawSplit?.mercado_cerrado_por_plantillas && <StatusBanner tone="exito" message="Todas las plantillas están completas. Mercado cerrado para este split." />}
              {msg && <StatusBanner message={msg} tone={msg.startsWith("Error") ? "error" : "exito"} onDismiss={() => setMsg("")} />}
              {marketLifecycleError && <StatusBanner message={marketLifecycleError} tone="error" />}
            </section>
            {currentRawSplit?.mercado_subasta_activado && currentRawSplit.tipo !== "individual" && !currentRawSplit.completado && !currentRawSplit.temporada_iniciada && (
              <AuctionRoom key={selectedSplitId} splits={splits} splitId={selectedSplitId} />
            )}
            <section className="rounded-2xl border border-line p-5 space-y-4">
              <h2 className="text-lg font-bold">Temporada</h2>
              {currentRawSplit && currentRawSplit.tipo !== "individual" && !currentRawSplit.completado && !currentRawSplit.temporada_iniciada && (
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm text-ink-2">Cuando termine el mercado, comienza {currentRawSplit.nombre}.</p>
                  <button type="button" disabled={loading} onClick={handleStartSplit} className="min-h-11 rounded-xl bg-brand px-4 text-sm font-bold disabled:opacity-40">Comenzar split</button>
                </div>
              )}
              {currentRawSplit?.temporada_iniciada && <p className="text-sm text-ok">{currentRawSplit.nombre} ya ha comenzado. Gestiona sus carreras desde «Carreras».</p>}
              <button type="button" aria-expanded={showSplitBuilder} aria-controls="admin-split-builder" onClick={() => setShowSplitBuilder(true)} disabled={showSplitBuilder} className="min-h-11 rounded-xl border border-line px-4 text-sm font-bold hover:bg-surface-3 disabled:opacity-40">Preparar siguiente split o temporada</button>
              {showSplitBuilder && <div id="admin-split-builder">
                <Suspense fallback={<p role="status" className="py-4 text-sm text-ink-2">Cargando preparación del split…</p>}>
                  <SplitBuilderPanel splits={splits} onClose={() => setShowSplitBuilder(false)} />
                </Suspense>
              </div>}
            </section>
          </div>
         ) : (
           <>
             {/* Navegación de Splits */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {splits.map(s => (
            <button
              key={s.id}
              onClick={() => {
                setSelectedSplitId(s.id);
                const next = getNextCircuitOfSplit(s.circuitos) || s.circuitos[s.circuitos.length - 1];
                if (next) setSelectedCircuitoId(next.id);
              }}
              className={`px-3 py-1.5 rounded-sm font-bold text-[10px] uppercase tracking-widest transition-all ${
                selectedSplitId === s.id
                ? "bg-brand text-brand-ink shadow-lg"
                : "bg-surface-2 text-ink-muted border border-line hover:border-line"
              }`}
            >
              {s.nombre}
            </button>
          ))}
        </div>

        {/* Selector de Circuito */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
          <div className="bg-surface-2 border border-line rounded-sm p-3 flex items-center gap-3">
            <div className="p-1.5 bg-brand/10 rounded-sm">
              <Calendar className="w-4 h-4 text-brand" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[9px] text-ink-muted uppercase tracking-widest font-mono">Circuito activo</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="font-bold text-xs tracking-tight truncate">{getCircuitName()}</span>
                {isActaCerrada ? (
                  <span className="flex items-center gap-1 text-[9px] bg-danger-soft text-danger px-1.5 py-0.5 font-bold uppercase tracking-tighter shrink-0">
                    Cerrada
                  </span>
                ) : isEditingFinished ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-ok shrink-0" />
                ) : null}
              </div>
            </div>
          </div>

          <div className="col-span-2 bg-surface-2 border border-line rounded-sm p-3">
            <div className="flex items-center gap-3">
               <div className="flex-1">
                  <p className="text-[9px] text-ink-muted uppercase tracking-widest font-mono mb-1.5">Seleccionar GP</p>
                  <select
                    className="w-full bg-surface text-ink border border-line py-1.5 px-2.5 text-xs outline-none focus:border-brand transition-colors cursor-pointer"
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
                     {splits.filter(s => s.id === selectedSplitId).map(s => (
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
                      {splits.filter(s => s.id !== selectedSplitId).map(s => (
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

        {/* AÑADIR CARRERA AL CALENDARIO (p. ej. un split creado al pactar, que nace sin calendario) */}
        {selectedSplitId && (
          <div className="bg-white/[0.03] border border-white/10 rounded-sm p-3 mb-4">
            <label className="block text-[9px] text-white/40 uppercase font-mono mb-1 font-bold">
              Añadir carrera a {splits.find(s => s.id === selectedSplitId)?.nombre ?? selectedSplitId}
            </label>
            <div className="flex gap-2 max-w-2xl">
              <input type="text" value={nuevaCarrera} onChange={(e) => setNuevaCarrera(e.target.value)} placeholder="Nombre del circuito"
                className="flex-1 bg-white/[0.02] border border-white/10 min-h-11 rounded-lg px-2.5 text-white outline-none md:min-h-0 md:rounded-sm md:py-1.5 md:text-xs focus:border-[#e10600] transition-colors"
              />
              <button type="button" onClick={handleAddRace} disabled={!nuevaCarrera.trim() || isAddingRace} aria-busy={isAddingRace || undefined}
                className="border border-white/10 text-white/80 min-h-11 rounded-lg px-3 text-[12px] font-bold md:min-h-0 md:rounded-sm md:py-1.5 md:text-[9px] md:uppercase md:tracking-wider transition-all flex items-center justify-center gap-1.5 hover:bg-white/[0.06] cursor-pointer disabled:opacity-40"
              >
                {isAddingRace ? <Loader2 className="w-3 h-3 animate-spin" /> : "Añadir"}
              </button>
            </div>
          </div>
        )}

        {/* PROGRAMACIÓN DEL CIRCUITO */}
        <div className="bg-surface-2 border border-line rounded-sm p-3 mb-4">
          <div className="flex items-center gap-2 mb-3 border-b border-line pb-2">
            <Calendar className="w-3.5 h-3.5 text-brand" />
            <h3 className="font-bold text-[10px] uppercase tracking-wider text-ink">Programación — {getCircuitName()}</h3>
          </div>
          <div className="grid grid-cols-1 max-w-2xl gap-3">
            <div>
              <label className="block text-[9px] text-white/40 uppercase font-mono mb-1 font-bold">Nombre del circuito</label>
              <input type="text" value={nombreCircuito} onChange={(e) => setNombreCircuito(e.target.value)}
                className="w-full bg-white/[0.02] border border-white/10 min-h-11 rounded-lg px-2.5 text-white outline-none md:min-h-0 md:rounded-sm md:py-1.5 md:text-xs focus:border-[#e10600] transition-colors"
              />
            </div>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <div>
                <label className="block text-[9px] text-ink-muted uppercase font-mono mb-1 font-bold">Nº carrera</label>
                <input type="number" min={1} max={20} value={numeroCarrera}
                  onChange={(e) => setNumeroCarrera(parseInt(e.target.value) || 1)}
                  className="w-full bg-surface-2 border border-line min-h-11 rounded-lg px-2.5 text-ink outline-none md:min-h-0 md:rounded-sm md:py-1.5 md:text-xs focus:border-brand transition-colors text-center"
                />
              </div>
              <div>
                <label className="block text-[9px] text-ink-muted uppercase font-mono mb-1 font-bold">Fecha</label>
                <input type="date" value={fechaVal} onChange={(e) => setFechaVal(e.target.value)}
                  className="w-full bg-surface-2 border border-line min-h-11 rounded-lg px-2.5 text-ink outline-none md:min-h-0 md:rounded-sm md:py-1.5 md:text-xs focus:border-brand transition-colors"
                />
              </div>
              <div>
                <label className="block text-[9px] text-ink-muted uppercase font-mono mb-1 font-bold">Hora</label>
                <input type="time" value={horaVal} onChange={(e) => setHoraVal(e.target.value)}
                  className="w-full bg-surface-2 border border-line min-h-11 rounded-lg px-2.5 text-ink outline-none md:min-h-0 md:rounded-sm md:py-1.5 md:text-xs focus:border-brand transition-colors"
                />
              </div>
              <div className="flex items-end">
                <button aria-busy={pendingOnce || undefined} onClick={handleSaveSchedule} disabled={(isSavingSchedule) || pendingOnce}
                  className="w-full border border-line text-ink min-h-11 rounded-lg px-3 text-[12px] font-bold md:min-h-0 md:rounded-sm md:py-1.5 md:text-[9px] md:uppercase md:tracking-wider transition-all flex items-center justify-center gap-1.5 hover:bg-surface-3 cursor-pointer disabled:opacity-40"
                >
                  {isSavingSchedule ? <Loader2 className="w-3 h-3 animate-spin" /> : "Guardar"}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-[9px] text-ink-muted uppercase font-mono mb-1 font-bold">URL Hotlap (YouTube)</label>
              <input type="url" value={hotlapUrl} onChange={(e) => setHotlapUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
                className="w-full bg-surface-2 border border-line min-h-11 rounded-lg px-2.5 text-ink outline-none md:min-h-0 md:rounded-sm md:py-1.5 md:text-xs focus:border-brand transition-colors font-mono"
              />
            </div>
          </div>
        </div>
        
        <section className="bg-surface-2 border border-line p-4 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-brand/5 blur-[100px] -mr-32 -mt-32 rounded-full" />

          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-3">
            <div>
              <h2 className="text-base font-bold italic tracking-tighter text-ink flex items-center gap-2.5">
                <span className="w-1 h-5 bg-brand block" />
                {isActaCerrada ? "Acta cerrada" : isEditingFinished ? "Corrección de resultados" : "Carga de resultados"}
              </h2>
              <p className="text-[10px] text-ink-muted uppercase tracking-widest mt-1 font-mono">
                {isActaCerrada
                  ? "Este acta no se puede modificar"
                  : isEditingFinished ? `Edición GP: ${getCircuitName()}` : `Registro GP: ${getCircuitName()}`}
              </p>
            </div>

            <div className="flex items-center gap-2">
              {isActaCerrada && raceImageWinners.length > 0 && (
                <a href="#race-winners-image" className="min-h-10 inline-flex items-center rounded-sm border border-violet/40 px-3 text-[10px] font-bold uppercase text-violet hover:bg-violet-soft">
                  Crear imagen con Gemini
                </a>
              )}
              {isEditingFinished && (
                <button
                  type="button"
                  onClick={() => setShowRaceReport(true)}
                  className="min-h-10 inline-flex items-center gap-1.5 rounded-sm border border-warn/40 px-3 text-[10px] font-bold uppercase text-warn hover:bg-warn-soft"
                >
                  <FileText className="w-3.5 h-3.5 text-warn" />
                  Informe Oficial GP
                </button>
              )}
              {((Object.values(qualyCount) as number[]).some(c => c > 1) || (Object.values(raceCount) as number[]).some(c => c > 1)) && (
                <div className="text-[9px] text-warn font-mono flex items-center gap-1 bg-warn-soft border border-warn/40 px-2.5 py-1 mr-1 max-w-xs">
                  <AlertCircle className="w-3 h-3 flex-shrink-0" />
                  <span>Posiciones duplicadas (en ámbar)</span>
                </div>
              )}

              {isEditingFinished && !isActaCerrada && (
                <button
                  onClick={handleCerrarActa}
                  className="px-4 py-1.5 rounded-sm border border-danger/40 text-danger text-[10px] font-bold uppercase hover:bg-danger-soft transition-all"
                >
                  Cerrar Acta
                </button>
              )}

              {isActaCerrada && (
                <button
                  type="button"
                  disabled={reabriendoActa || revirtiendoEconomia}
                  onClick={handleReabrirActa}
                  className="px-4 py-1.5 rounded-sm border border-info/40 text-info text-[10px] font-bold uppercase hover:bg-info-soft transition-all disabled:opacity-50 flex items-center gap-1.5"
                  title={isEconomiaProcesada ? "Reabrir acta (revertirá primero la economía para poder corregir resultados)" : "Reabrir acta"}
                >
                  {reabriendoActa ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                  {reabriendoActa ? "Reabriendo..." : "Reabrir Acta"}
                </button>
              )}

              {isActaCerrada && !isEconomiaProcesada && (
                <button aria-busy={pendingOnce || undefined}
                  disabled={(procesandoEconomia) || pendingOnce}
                  onClick={async () => {
    return runOnce(async () => {
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
                  });
}}
                  className="px-4 py-1.5 rounded-sm border border-warn/40 text-warn text-[10px] font-bold uppercase hover:bg-warn-soft transition-all disabled:opacity-50 flex items-center gap-1.5"
                >
                  {procesandoEconomia ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                  {procesandoEconomia ? "Procesando..." : "Procesar Economía"}
                </button>
              )}

              <button aria-busy={pendingOnce || undefined}
                onClick={handleSubmit}
                disabled={(loading || isActaCerrada) || pendingOnce}
                className="group relative bg-brand px-5 py-1.5 rounded-sm font-bold text-[10px] uppercase hover:bg-danger-soft transition-all shadow-lg overflow-hidden active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                <span className="relative z-10 flex items-center gap-1.5">
                  {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin text-ink" /> : (isEditingFinished ? "Guardar Corrección" : "Procesar Carrera")}
                </span>
                <div className="absolute inset-0 bg-surface-3 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
              </button>
            </div>
          </div>

          <details className="mt-3 rounded-xl border border-line p-3">
            <summary className="min-h-8 cursor-pointer text-sm font-bold text-ink-2">Corregir una carrera o recalcular el split</summary>
            <p className="mt-2 text-sm text-ink-2">Para editar un acta cerrada, revierte primero su economía y después reabre el acta.</p>
            {isEditingFinished && (planForSelectedRace?.laterProcessedNewestFirst.length ?? 0) > 0 && (
              <div className="mt-3 rounded-lg border border-warn/40 bg-warn-soft p-3">
                <p className="text-sm font-bold text-warn">Esta carrera es histórica y hay liquidaciones posteriores.</p>
                <p className="mt-1 text-xs text-ink-2">Prepara una guía para revertir las carreras posteriores en orden seguro antes de editar este acta.</p>
                <button
                  type="button"
                  onClick={() => planForSelectedRace && setHistoricalCorrectionPlan({ ...planForSelectedRace, splitId: selectedSplitId })}
                  className="mt-2 min-h-10 rounded-lg border border-warn/40 px-3 text-xs font-bold text-warn hover:bg-warn-soft"
                >Preparar plan de corrección histórica</button>
              </div>
            )}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {isEconomiaProcesada && <button
                disabled={revirtiendoEconomia || !esUltimaCarreraProcesada}
                title={esUltimaCarreraProcesada ? "" : "Hay una carrera posterior con economía procesada: revierte primero esa."}
                onClick={handleRevertirEconomia}
                className="min-h-11 rounded-lg border border-warn/40 px-3 text-sm font-bold text-warn disabled:opacity-40"
              >{revirtiendoEconomia ? "Revirtiendo…" : "Revertir economía"}</button>}
              {isActaCerrada && <button
                disabled={reabriendoActa || revirtiendoEconomia} onClick={handleReabrirActa}
                className="min-h-11 rounded-lg border border-info/40 px-3 text-sm font-bold text-info disabled:opacity-40"
              >{reabriendoActa ? "Reabriendo…" : "Reabrir acta"}</button>}
              {isEditingFinished && (!isEconomiaProcesada || esUltimaCarreraProcesada) && <button
                disabled={deshaciendoCarrera} onClick={handleDeshacerCarrera}
                className="min-h-11 rounded-lg border border-danger/40 px-3 text-sm font-bold text-danger disabled:opacity-40"
              >{deshaciendoCarrera ? "Deshaciendo…" : "Deshacer carrera"}</button>}
            <button aria-busy={pendingOnce || undefined}
              onClick={async () => {
    return runOnce(async () => {
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
              });
}}
              disabled={(recalculandoPuntos || !selectedSplitId) || pendingOnce}
              title="Rehace puntos, rating y puntos de constructor desde cero a partir de los circuitos que sigan completados. Úsalo si un split se queda con cifras desincronizadas."
              className="min-h-11 rounded-lg border border-info/40 px-3 text-sm font-bold text-info disabled:opacity-40 flex items-center gap-1"
            >
              {recalculandoPuntos ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : null}
              Recalcular puntos y rating
            </button>
            </div>
          </details>

          {historicalCorrectionPlan?.splitId === selectedSplitId && (
            <section className="mt-3 rounded-xl border border-warn/40 bg-warn-soft p-4" aria-live="polite">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-warn">Plan manual: corregir {historicalCorrectionPlan.target.nombre || "carrera histórica"}</h3>
                  <p className="mt-1 text-xs text-ink-2">El plan solo guía la navegación. Cada reversión y liquidación sigue siendo una acción individual.</p>
                </div>
                <button type="button" onClick={() => setHistoricalCorrectionPlan(null)} className="min-h-10 rounded-lg border border-line px-3 text-xs text-ink-2">Cerrar plan</button>
              </div>

              <div className="mt-3 grid gap-3 md:grid-cols-3">
                <div className="rounded-lg border border-line p-3">
                  <h4 className="text-xs font-bold uppercase tracking-wide text-warn">1. Revertir posteriores, de más nueva a más antigua</h4>
                  {historicalCorrectionPlan.laterProcessedNewestFirst.length ? (
                    <ol className="mt-2 space-y-2">
                      {historicalCorrectionPlan.laterProcessedNewestFirst.map((race, index) => (
                        <li key={race.id} className="flex items-center justify-between gap-2 text-xs text-ink">
                          <span>{index + 1}. {race.nombre || `Carrera ${race.numero_carrera ?? ""}`}</span>
                          <button type="button" onClick={() => setSelectedCircuitoId(race.id)} className="min-h-9 rounded border border-warn/40 px-2 text-warn">Ir</button>
                        </li>
                      ))}
                    </ol>
                  ) : <p className="mt-2 text-xs text-ok">No quedan economías posteriores por revertir.</p>}
                </div>

                <div className="rounded-lg border border-line p-3">
                  <h4 className="text-xs font-bold uppercase tracking-wide text-info">2. Corregir la carrera objetivo</h4>
                  <p className="mt-2 text-xs leading-relaxed text-ink-2">Vuelve al objetivo, revierte su economía, reabre el acta, guarda las posiciones, sanciones y DNFs correctos, y cierra el acta otra vez.</p>
                  <button type="button" onClick={() => setSelectedCircuitoId(historicalCorrectionPlan.target.id)} className="mt-2 min-h-9 rounded border border-info/40 px-2 text-xs text-info">Ir al objetivo: {historicalCorrectionPlan.target.nombre || `Carrera ${historicalCorrectionPlan.target.numero_carrera ?? ""}`}</button>
                </div>

                <div className="rounded-lg border border-line p-3">
                  <h4 className="text-xs font-bold uppercase tracking-wide text-ok">3. Reprocesar en orden cronológico</h4>
                  <ol className="mt-2 space-y-2">
                    {historicalCorrectionPlan.replayChronological.map((race, index) => (
                      <li key={race.id} className="flex items-center justify-between gap-2 text-xs text-ink">
                        <span>{index + 1}. {race.nombre || `Carrera ${race.numero_carrera ?? ""}`}</span>
                        <button type="button" onClick={() => setSelectedCircuitoId(race.id)} className="min-h-9 rounded border border-ok/40 px-2 text-ok">Ir</button>
                      </li>
                    ))}
                    {!historicalCorrectionPlan.replayChronological.length && <li className="text-xs text-ink-2">La carrera objetivo no tenía economía procesada al preparar el plan; procésala después de cerrarla y luego continúa con las posteriores.</li>}
                  </ol>
                </div>
              </div>
              <p className="mt-3 text-xs leading-relaxed text-warn">Límite actual: las ganancias y los cambios de precio se revierten y aplican una carrera cada vez. Este plan solo vive en esta pantalla; no es una operación duradera, no se reanuda automáticamente y una interrupción puede dejar el split a medio corregir. Comprueba cada mensaje de éxito antes de seguir.</p>
            </section>
          )}

          {economiaMsg && (
            <div className="mt-3 px-4 py-2.5 bg-warn-soft border border-warn/40 rounded-sm text-xs text-warn font-mono">
              {economiaMsg}
            </div>
          )}

          {isActaCerrada && raceImageWinners.length > 0 && (
            <RaceWinnersImagePanel
              key={`${selectedSplitId}-${selectedCircuitoId}`}
              raceName={getCircuitName()}
              splitName={currentRawSplit?.nombre || selectedSplitId}
              winners={raceImageWinners}
              poleWinner={poleImageWinner || undefined}
            />
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
                  ? "bg-danger-soft border-danger/40 text-danger"
                  : "bg-ok-soft border-ok/40 text-ok"
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
                <tr className="text-[9px] text-ink-muted uppercase tracking-[0.2em] font-mono border-b border-line pb-2">
                   <th className="pb-2 pl-3 font-normal">Piloto</th>
                   <th className="pb-2 text-center font-normal">No corrió</th>
                   <th className="pb-2 text-center font-normal">Qualy</th>
                   <th className="pb-2 text-center font-normal">V. rápida</th>
                   <th className="pb-2 text-center font-normal">Limpio</th>
                   <th className="pb-2 text-center font-normal">DNF</th>
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
                   const isPilotDnf = results[p.pilotoId]?.isDnf === true;
                   const isRaceDuplicated = !isPilotDnf && typeof rPosVal === "number" && rPosVal !== 99 && (raceCount[rPosVal] || 0) > 1;
                   const didNotRace = noCorrieron.has(p.pilotoId);
                  return (
                    <tr key={`pilot-row-${p.pilotoId}-${i}`} className="group border-b border-line hover:bg-surface-3 transition-colors">
                      <td className="py-2.5 pl-3">
                        <div className="flex items-center gap-2.5">
                          <span className="text-[10px] font-mono text-ink-muted w-4">{i+1}</span>
                          <div>
                            <EditableName
                              pilotId={p.pilotoId}
                              initialName={p.nombre}
                              className="font-bold tracking-tight group-hover:text-brand"
                              onSave={handleUpdatePilotName}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="py-2.5 text-center">
                        <input type="checkbox" checked={didNotRace} disabled={isActaCerrada} title="Marcar si el piloto no corrió esta carrera"
                          className="w-4 h-4 accent-brand disabled:opacity-40"
                          onChange={e => {
                            const skip = e.target.checked;
                            setNoCorrieron(prev => {
                              const next = new Set(prev);
                              if (skip) next.add(p.pilotoId); else next.delete(p.pilotoId);
                              return next;
                            });
                            if (skip) {
                              setResults(prev => {
                                const { [p.pilotoId]: _removed, ...rest } = prev;
                                return rest;
                              });
                            }
                          }} />
                      </td>
                      {didNotRace ? (
                        <td colSpan={5} className="py-2.5 text-center font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted">
                          No corrió · sin puntos ni cambios de rating
                        </td>
                      ) : (
                      <>
                       <td className="py-2.5 text-center">
                         <input type="number" min="1" max="20" disabled={isActaCerrada}
                           value={qPosVal ?? ""} title={isQualyDuplicated ? "¡Posición de clasificación duplicada!" : qPosVal === 1 ? "Pole position" : undefined}
                           className={`w-12 bg-surface-2 border rounded-sm px-2 py-1.5 text-center outline-none focus:border-brand transition-colors font-mono text-xs disabled:opacity-40 ${isQualyDuplicated ? "border-warn/40 text-warn bg-warn-soft" : "border-line text-ink"}`}
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
                           className="w-4 h-4 accent-ok disabled:opacity-40"
                           onChange={e => handleUpdate(p.pilotoId, "isClean", e.target.checked)} />
                       </td>
                       <td className="py-2.5 text-center">
                         <input type="checkbox" checked={isPilotDnf} disabled={isActaCerrada} title="Marcar si el piloto no terminó la carrera (DNF)"
                           className="w-4 h-4 accent-brand disabled:opacity-40"
                           onChange={e => {
                             const dnf = e.target.checked;
                             setResults(prev => ({
                               ...prev,
                               [p.pilotoId]: {
                                 ...prev[p.pilotoId],
                                 pilotoId: p.pilotoId,
                                 isDnf: dnf,
                                 isDnfOwnError: false,
                                 racePos: dnf ? 99 : ("" as any),
                               }
                             }));
                           }} />
                       </td>
                       <td className="py-2.5">
                        {isPilotDnf ? (
                          <span className="inline-block w-12 rounded-sm border border-danger/40 bg-danger-soft px-2 py-1.5 text-center font-mono text-xs font-bold text-danger">DNF</span>
                        ) : (
                        <input
                          type="number"
                          min="1"
                          max="20"
                          className={`w-12 bg-surface-2 border rounded-sm px-2 py-1.5 text-center outline-none focus:border-brand transition-colors font-mono text-xs disabled:opacity-40 ${
                            isRaceDuplicated
                              ? "border-warn/40 text-warn bg-warn-soft"
                              : "border-line text-ink"
                          }`}
                          title={isRaceDuplicated ? "¡Posición de carrera duplicada!" : undefined}
                           disabled={isActaCerrada}
                           value={rPosVal ?? ""}
                          onChange={e => {
                            const val = parseInt(e.target.value);
                            handleUpdate(p.pilotoId, "racePos", isNaN(val) ? "" : val);
                          }}
                        />
                        )}
                      </td>
                      </>
                      )}
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
          <div className="fixed inset-0 bg-ink/60 z-50 flex items-center justify-center p-4">
            <div className="bg-surface border border-line p-4 max-w-sm w-full relative text-left">
              <h3 className="text-sm font-bold text-ink uppercase tracking-tight mb-2 flex items-center gap-2">
                <span className="w-1 h-4 bg-brand" />
                {confirmModal.title}
              </h3>
              <p className="text-xs text-ink-2 leading-relaxed mb-4">{confirmModal.message}</p>
              <div className="flex justify-end gap-2 font-semibold text-[10px] uppercase tracking-wider">
                <button
                  onClick={() => setConfirmModal(null)}
                  className="px-3 py-2 bg-surface-3 hover:bg-surface-3 text-ink rounded-sm transition-colors border border-line"
                >
                  Cancelar
                </button>
                <button aria-busy={pendingOnce || undefined} disabled={pendingOnce}
                  onClick={() => {
                    confirmModal.onConfirm();
                    setConfirmModal(null);
                  }}
                  className="px-3 py-2 bg-brand text-brand-ink rounded-sm hover:bg-danger-soft transition-colors shadow-lg"
                >
                  Confirmar
                </button>
              </div>
            </div>
          </div>
        )}

        {showRaceReport && (
          <RaceReportModal
            isOpen={showRaceReport}
            onClose={() => setShowRaceReport(false)}
            circuito={splits.find(s => s.id === selectedSplitId)?.circuitos.find((c: any) => c.id === selectedCircuitoId) || {
              id: selectedCircuitoId,
              nombre: getCircuitName(),
              completado: true,
              acta_cerrada: isActaCerrada,
              economia_procesada: isEconomiaProcesada,
              resultados: Object.values(results) as any,
            }}
            splitName={currentRawSplit?.nombre || selectedSplitId}
            splitId={selectedSplitId}
            currentSplit={currentRawSplit}
          />
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
        className="bg-surface text-ink font-bold px-2 py-0.5 rounded border border-brand outline-none text-xs w-32 font-sans focus:ring-1 focus:ring-brand"
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
      className={`${className} cursor-pointer hover:underline decoration-dashed decoration-brand hover:text-ink px-1 py-0.5 rounded transition-all inline-flex items-center gap-1`}
    >
      {name}
      <span className="opacity-0 group-hover:opacity-60 text-[9px] text-brand font-mono select-none">✏️</span>
    </span>
  );
}
