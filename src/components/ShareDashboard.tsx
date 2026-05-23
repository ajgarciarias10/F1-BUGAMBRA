import React, { useState, useMemo, useEffect, useRef } from "react";
import { useUsuarios, useSplits } from "../hooks/useData";
import { useAuth } from "../contexts/AuthContext";
import { Flame, Coins, History, ArrowRight, UserMinus, UserPlus, ShieldAlert, Award, Clock, Sparkles, UploadCloud, Camera, X, Trophy, TrendingUp, Gauge, Zap, CheckCircle2 } from "lucide-react";
import { resolveAllSplits, isSplitUnlocked } from "../utils/splitResolver";

export function SharedDashboardView({ canViewBudget, escuderiaId }: { canViewBudget: boolean, escuderiaId?: string }) {
  const { user, userData } = useAuth();
  const { usuarios } = useUsuarios();
  const { splits: rawSplits } = useSplits();
  
  const splits = useMemo(() => resolveAllSplits(rawSplits), [rawSplits]);
  const [activeSplitId, setActiveSplitId] = useState<string>("global");
  const [selectedPilotForProfileId, setSelectedPilotForProfileId] = useState<string | null>(null);
  const [transfers, setTransfers] = useState<any[]>([]);
  const [transacting, setTransacting] = useState(false);
  const [plantilla, setPlantilla] = useState<any[]>([]);
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
  const [recommenderStrategy, setRecommenderStrategy] = useState<"balanced" | "momentum" | "budget" | "premium">("balanced");

  const getPilotPhoto = (pilotId: string) => {
    const matched = usuarios.find((u: any) => u.uid === pilotId || u.piloto_id === pilotId);
    return matched?.foto_url || "";
  };

  const getTeamLogo = (teamId: string) => {
    if (activeSplitId !== "global" && currentSplit) {
      const match = currentSplit.equipos?.find((eq: any) => eq.id === teamId);
      return match?.logo_url || "";
    }
    // In global view, find first split containing a logo for this team
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
      const { compressAndConvertImage } = await import("../utils/imageHelper");
      const { doc, updateDoc } = await import("firebase/firestore");
      const { db } = await import("../services/firebase");
      
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
    if (!user) {
      setPlantilla([]);
      return;
    }
    let unsub = () => {};
    import("firebase/firestore").then(({ collection, onSnapshot, query }) => {
      import("../services/firebase").then(({ db }) => {
        const q = query(collection(db, "plantilla"));
        unsub = onSnapshot(q, (snapshot) => {
          setPlantilla(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        }, (error) => {
          console.warn("Gracefully handled plantilla snapshot error:", error);
        });
      });
    });
    return () => unsub();
  }, [user]);

  useEffect(() => {
    if (!user) {
      setTransfers([]);
      return;
    }
    if (activeSplitId && activeSplitId !== "global") {
      let unsub = () => {};
      import("firebase/firestore").then(({ collection, query, orderBy, onSnapshot }) => {
        import("../services/firebase").then(({ db }) => {
          const q = query(collection(db, `splits/${activeSplitId}/transfers`), orderBy("timestamp", "desc"));
          unsub = onSnapshot(q, (snapshot) => {
            const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            setTransfers(list);
          }, (error) => {
            console.warn("Gracefully handled transfers snapshot error:", error);
          });
        });
      });
      return () => unsub();
    } else {
      setTransfers([]);
    }
  }, [activeSplitId, user]);

  useEffect(() => {
    if (activeSplitId !== "global" && splits.length > 0) {
      if (!isSplitUnlocked(activeSplitId, splits)) {
        setActiveSplitId("global");
      }
    }
  }, [splits, activeSplitId]);

  const handleClausulazo = async (pilot: any, ownerTeamId: string, ownerTeamName: string) => {
    if (!activeSplitId || !escuderiaId || !miEscuderia) return;
    const clausePrice = pilot.clausula_actual || (pilot.rating_piloto || 70) * 0.5;
    if (miEscuderia.presupuesto < clausePrice) {
      setConfirmModal({
        isOpen: true,
        title: "Presupuesto Insuficiente",
        message: `No tienes suficiente presupuesto. Requieres ${clausePrice.toFixed(1)}M pero solo tienes ${miEscuderia.presupuesto.toFixed(1)}M.`,
        showCancel: false,
        onConfirm: () => {}
      });
      return;
    }
    setConfirmModal({
      isOpen: true,
      title: "Confirmar Clausulazo",
      message: `¿Seguro que quieres hacer un CLAUSULAZO a ${pilot.nombre}? Se descontarán ${clausePrice.toFixed(1)}M de tu presupuesto, y se entregarán a ${ownerTeamName}.`,
      onConfirm: async () => {
        setTransacting(true);
        try {
          const { doc, runTransaction, collection } = await import("firebase/firestore");
          const { db } = await import("../services/firebase");

          await runTransaction(db, async (trans) => {
            const buyerRef = doc(db, `splits/${activeSplitId}/equipos`, escuderiaId);
            const sellerRef = doc(db, `splits/${activeSplitId}/equipos`, ownerTeamId);
            
            const buyerPilotRef = doc(db, `splits/${activeSplitId}/equipos/${escuderiaId}/pilotos`, pilot.id);
            const sellerPilotRef = doc(db, `splits/${activeSplitId}/equipos/${ownerTeamId}/pilotos`, pilot.id);

            const buyerDoc = await trans.get(buyerRef);
            const sellerDoc = await trans.get(sellerRef);

            const bData = buyerDoc.data();
            const sData = sellerDoc.data();

            if (!bData || bData.presupuesto < clausePrice) {
              throw new Error("Presupuesto insuficiente.");
            }

            // Adjust budgets
            trans.update(buyerRef, { presupuesto: bData.presupuesto - clausePrice });
            trans.update(sellerRef, { presupuesto: (sData?.presupuesto || 0) + clausePrice });

            // Delete from seller
            trans.delete(sellerPilotRef);

            // Put in buyer
            trans.set(buyerPilotRef, {
              ...pilot,
              puntos_piloto: pilot.puntos_piloto || 0
            });

            // Update global user document escuderia_id if found in usuarios snapshot
            const matchedUser = usuarios.find(u => u.uid === pilot.id || (u.piloto_id && u.piloto_id === pilot.id));
            if (matchedUser) {
              const userRef = doc(db, "usuarios", matchedUser.uid);
              trans.update(userRef, { escuderia_id: escuderiaId });
            }

            // Add history log
            const transferRef = doc(collection(db, `splits/${activeSplitId}/transfers`));
            trans.set(transferRef, {
              detalles: `🚨 ¡CLAUSULAZO! ${miEscuderia.nombre} ha fichado a ${pilot.nombre} de ${ownerTeamName} pagando su cláusula de ${clausePrice.toFixed(1)}M.`,
              timestamp: new Date().toISOString(),
              tipo: "clausulazo"
            });
          });

          setConfirmModal({
            isOpen: true,
            title: "¡Clausulazo Exitoso!",
            message: `¡Has fichado a ${pilot.nombre}!`,
            showCancel: false,
            onConfirm: () => {
              setConfirmModal(null);
            }
          });
        } catch (err: any) {
          setConfirmModal({
            isOpen: true,
            title: "Error",
            message: "Error al procesar clausulazo: " + err.message,
            showCancel: false,
            onConfirm: () => {}
          });
        } finally {
          setTransacting(false);
        }
      }
    });
  };

  const handleFicharFreeAgent = async (pilot: any) => {
    if (!activeSplitId || !escuderiaId || !miEscuderia) return;
    const price = pilot.precio_compra_split || 10;
    if (miEscuderia.presupuesto < price) {
      setConfirmModal({
        isOpen: true,
        title: "Presupuesto Insuficiente",
        message: `Presupuesto insuficiente. El coste es de ${price.toFixed(1)}M pero tienes ${miEscuderia.presupuesto.toFixed(1)}M.`,
        showCancel: false,
        onConfirm: () => {}
      });
      return;
    }
    setConfirmModal({
      isOpen: true,
      title: "Confirmar Fichaje",
      message: `¿Quieres contratar al agente libre ${pilot.nombre || "Piloto"} por ${price.toFixed(1)}M?`,
      onConfirm: async () => {
        setTransacting(true);
        try {
          const { doc, runTransaction, collection } = await import("firebase/firestore");
          const { db } = await import("../services/firebase");

          const pilotId = pilot.uid || pilot.id;

          await runTransaction(db, async (trans) => {
            const buyerRef = doc(db, `splits/${activeSplitId}/equipos`, escuderiaId);
            const buyerPilotRef = doc(db, `splits/${activeSplitId}/equipos/${escuderiaId}/pilotos`, pilotId);

            const buyerDoc = await trans.get(buyerRef);
            const bData = buyerDoc.data();

            if (!bData || bData.presupuesto < price) {
              throw new Error("Presupuesto insuficiente.");
            }

            trans.update(buyerRef, { presupuesto: bData.presupuesto - price });
            trans.set(buyerPilotRef, {
              id: pilotId,
              nombre: pilot.nombre,
              puntos_piloto: 0,
              victorias: 0,
              podios: 0,
              rating_piloto: pilot.rating_piloto || 70,
              precio_compra_split: price,
              clausula_actual: pilot.clausula_actual || price * 1.5,
              mantener_actual: pilot.mantener_actual || price * 1.5,
              precio_carrera_anterior: pilot.precio_carrera_anterior || price
            });

            // Update global user document escuderia_id if found in usuarios snapshot
            const matchedUser = usuarios.find(u => u.uid === pilotId || (u.piloto_id && u.piloto_id === pilotId));
            if (matchedUser) {
              const userRef = doc(db, "usuarios", matchedUser.uid);
              trans.update(userRef, { escuderia_id: escuderiaId });
            }

            // Add history log
            const transferRef = doc(collection(db, `splits/${activeSplitId}/transfers`));
            trans.set(transferRef, {
              detalles: `✍️ ${miEscuderia.nombre} firmó al piloto ${pilot.nombre} por ${price.toFixed(1)}M.`,
              timestamp: new Date().toISOString(),
              tipo: "fichaje"
            });
          });

          setConfirmModal({
            isOpen: true,
            title: "Fichaje Completado",
            message: `¡Has fichado a ${pilot.nombre}!`,
            showCancel: false,
            onConfirm: () => {
              setConfirmModal(null);
            }
          });
        } catch (err: any) {
          setConfirmModal({
            isOpen: true,
            title: "Error",
            message: "Error al completar fichaje: " + err.message,
            showCancel: false,
            onConfirm: () => {}
          });
        } finally {
          setTransacting(false);
        }
      }
    });
  };

  const handleDespedirPiloto = async (pilot: any) => {
    if (!activeSplitId || !escuderiaId || !miEscuderia) return;
    const refund = (pilot.precio_compra_split || 10) * 0.5;
    setConfirmModal({
      isOpen: true,
      title: "Despedir Piloto",
      message: `¿Quieres despedir a ${pilot.nombre}? Se liberará de tu plantilla y recibirás un reembolso de indemnización del 50% (${refund.toFixed(1)}M).`,
      onConfirm: async () => {
        setTransacting(true);
        try {
          const { doc, runTransaction, collection } = await import("firebase/firestore");
          const { db } = await import("../services/firebase");

          await runTransaction(db, async (trans) => {
            const teamRef = doc(db, `splits/${activeSplitId}/equipos`, escuderiaId);
            const pilotRef = doc(db, `splits/${activeSplitId}/equipos/${escuderiaId}/pilotos`, pilot.id);

            const teamDoc = await trans.get(teamRef);
            const tData = teamDoc.data();

            trans.update(teamRef, { presupuesto: (tData?.presupuesto || 0) + refund });
            trans.delete(pilotRef);

            // Update global user document escuderia_id to keep Pilot Panel and queries aligned
            const matchedUser = usuarios.find(u => u.uid === pilot.id || (u.piloto_id && u.piloto_id === pilot.id));
            if (matchedUser) {
              const userRef = doc(db, "usuarios", matchedUser.uid);
              trans.update(userRef, { escuderia_id: "" });
            }

            // Add history log
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
            onConfirm: () => {
              setConfirmModal(null);
            }
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
    let found = null;
    
    if (userData?.rol === "piloto" && userData?.uid) {
      // Find team in this split that has this pilot in its roster
      found = currentSplit.equipos.find((e: any) => e.pilotos?.some((p: any) => p.id === userData.uid || (userData.piloto_id && p.id === userData.piloto_id)));
    }
    
    // If not found yet (or if jeque/admin), fall back to checking team ID / jeque_id
    if (!found && escuderiaId) {
      found = currentSplit.equipos.find((e: any) => e.id === escuderiaId || e.jeque_id === escuderiaId);
    }

    if (!found) return null;

    const budget = found.presupuesto || 0;
    const pilotsVal = found.pilotos?.reduce((sum: number, p: any) => sum + (p.clausula_actual || (p.rating_piloto || 70) * 0.5), 0) || 0;

    return {
      ...found,
      valor_total: found.valor_total ?? (budget + pilotsVal)
    };
  }, [currentSplit, escuderiaId, userData]);

  const misPilotos = useMemo(() => {
    if (!miEscuderia) return [];
    return miEscuderia.pilotos || [];
  }, [miEscuderia]);

  const freeAgentsList = useMemo(() => {
    if (!currentSplit) return [];
    
    // Active team roster pilot IDs in this split
    const rosterUids = currentSplit.equipos.flatMap((eq: any) => (eq.pilotos || []).map((p: any) => p.id));
    
    // 1. All registered user pilots
    const registeredPilots = usuarios.filter((u: any) => u.rol === "piloto");
    
    // 2. All paddock/plantilla pilots that are not linked to a registered user
    const unlinkedPlantillaPilots = plantilla.filter((p: any) => {
      if (p.rol !== "piloto") return false;
      // Check if any registered user is linked to this plantilla doc
      const isLinked = registeredPilots.some((u: any) => u.piloto_id === p.id || u.uid === p.id);
      return !isLinked;
    });

    // Combine both list of systems pilots
    const allSystemPilots = [
      ...registeredPilots.map((u: any) => ({
        id: u.uid,
        nombre: u.nombre,
        rating_piloto: u.rating_piloto || 70,
        precio_compra_split: u.precio_compra_split || 10,
        clausula_actual: u.clausula_actual || (u.rating_piloto || 70) * 0.5,
        precio_carrera_anterior: u.precio_carrera_anterior || 10,
        piloto_id: u.piloto_id || u.uid
      })),
      ...unlinkedPlantillaPilots.map((p: any) => ({
        id: p.id,
        nombre: p.nombre,
        rating_piloto: p.rating_piloto || 70,
        precio_compra_split: p.precio_compra_split || 10,
        clausula_actual: p.clausula_actual || (p.rating_piloto || 70) * 0.5,
        precio_carrera_anterior: p.precio_carrera_anterior || 10,
        piloto_id: p.id
      }))
    ];

    // Filter out pilots that are already in a team for the current split
    return allSystemPilots
      .filter((p: any) => {
        const isAssigned = rosterUids.some(rId => rId === p.id || rId === p.piloto_id);
        return !isAssigned;
      })
      .map((p: any) => ({
        id: p.id,
        nombre: p.nombre,
        rating_piloto: p.rating_piloto,
        precio_compra_split: p.precio_compra_split,
        clausula_actual: p.clausula_actual
      }));
  }, [currentSplit, usuarios, plantilla]);

  const recommendedPilots = useMemo(() => {
    if (!currentSplit || !miEscuderia) return [];

    // 1. Gather all pilots in this split: signed + free agents
    const signed = currentSplit.equipos.flatMap((eq: any) => 
      (eq.pilotos || []).map((p: any) => ({
        id: p.id,
        nombre: p.nombre,
        rating_piloto: p.rating_piloto || 70,
        puntos_piloto: p.puntos_piloto || 0,
        teamId: eq.id,
        teamNombre: eq.nombre,
        coste: p.clausula_actual || (p.rating_piloto || 70) * 0.5,
        clausula_actual: p.clausula_actual || (p.rating_piloto || 70) * 0.5,
        isFreeAgent: false
      }))
    );

    const free = freeAgentsList.map((p: any) => ({
      id: p.id,
      nombre: p.nombre,
      rating_piloto: p.rating_piloto || 70,
      puntos_piloto: 0,
      teamId: "",
      teamNombre: "Agente Libre (Bolsa)",
      coste: p.precio_compra_split || p.clausula_actual || (p.rating_piloto || 70) * 0.5 || 10,
      precio_compra_split: p.precio_compra_split || p.clausula_actual || (p.rating_piloto || 70) * 0.5 || 10,
      isFreeAgent: true
    }));

    const allPilots = [...signed, ...free];

    // 2. Compute points history for each pilot across completed circuits in the current split
    const completedCircuits = currentSplit.circuitos?.filter((c: any) => c.completado) || [];

    return allPilots.map((p: any) => {
      // Find race points history in results
      const historyScore: number[] = [];
      completedCircuits.forEach((c: any) => {
        const row = c.resultados?.find((r: any) => 
          r.pilotoId === p.id || 
          r.pilotoNombre?.toLowerCase() === p.nombre?.toLowerCase() ||
          r.name?.toLowerCase() === p.nombre?.toLowerCase()
        );
        historyScore.push(row ? (row.puntosTotales || 0) : 0);
      });

      // Calculate total points from actual points or history
      const totalPoints = p.puntos_piloto || historyScore.reduce((sum, val) => sum + val, 0);

      // Calculations for Trend: Recent momentum (last 1-2 races) vs earlier history
      let trendScore = 0;
      if (historyScore.length >= 2) {
        const lastRacePts = historyScore[historyScore.length - 1];
        const prevRecentPts = historyScore[historyScore.length - 2];
        const recentAv = (lastRacePts + prevRecentPts) / 2;
        
        const priorRaces = historyScore.slice(0, historyScore.length - 1);
        const priorAv = priorRaces.length > 0 
          ? priorRaces.reduce((sum, val) => sum + val, 0) / priorRaces.length 
          : recentAv;
        
        trendScore = recentAv - priorAv;
      } else if (historyScore.length === 1) {
        trendScore = 0; // neutral
      }

      // Calculate score for each strategy
      let recoScore = 0;
      const rtg = p.rating_piloto || 70;
      const price = p.coste;
      const ptsOverPrice = price > 0 ? (totalPoints / price) : 0;

      if (recommenderStrategy === "balanced") {
        // Balanced: solid ROI + solid Rating + non-negative Trend
        recoScore = (rtg * 0.45) + (ptsOverPrice * 18) + (trendScore * 1.5);
      } else if (recommenderStrategy === "momentum") {
        // Momentum: heaviest focus on trend score + rating
        recoScore = (trendScore * 8.0) + (ptsOverPrice * 6) + (rtg * 0.15);
      } else if (recommenderStrategy === "budget") {
        // Budget: favor low cost, super high ROI
        recoScore = (ptsOverPrice * 35.0) - (price * 0.7) + (trendScore * 1.0);
      } else if (recommenderStrategy === "premium") {
        // Premium: highest ratings, top raw score, regardless of budget (as long as it fits)
        recoScore = (rtg * 4.0) + (totalPoints * 1.8) + (trendScore * 2.5);
      }

      // Compose personalized, highly engaging analytical justification
      let justification = "";
      if (recommenderStrategy === "momentum") {
        if (trendScore > 5) {
          justification = `¡En racha espectacular! Viene de subir su promedio de puntos en +${trendScore.toFixed(1)} puntos. Un activo con momentum positivo impecable.`;
        } else if (trendScore < -3) {
          justification = `Detección de tendencia irregular (baja de ${Math.abs(trendScore).toFixed(1)} pts). Se encuentra en un bache temporal de resultados. ¡Opción de riesgo!`;
        } else {
          justification = `Estadísticas estables en los últimos circuitos. Mantiene una trayectoria regular y segura para aportar consistencia a tu casillero semanal.`;
        }
      } else if (recommenderStrategy === "budget") {
        if (price < 12) {
          justification = `Ganga absoluta a tan solo ${price.toFixed(1)}M. Presenta un coeficiente ROI altamente favorable, liberando presupuesto para realizar otras contrataciones de peso.`;
        } else {
          justification = `Excelente rendimiento costo-beneficio de ${ptsOverPrice.toFixed(1)} Pts/M. Una adquisición inteligente para equilibrar las finanzas de tu escudería.`;
        }
      } else if (recommenderStrategy === "premium") {
        justification = `Piloto franquicia con un Rating de ${rtg}. Lidera en potencial neto de puntos y su contratación asegura tener a una superestrella de primera línea.`;
      } else {
        // Balanced defaults
        if (ptsOverPrice > 4.5) {
          justification = `Oportunidad recomendada por su increíble eficiencia (${ptsOverPrice.toFixed(1)} pts por millón invertido). Una inversión óptima y segura para el Split.`;
        } else if (trendScore < -4) {
          justification = `Aviso: Ha tenido altibajos en el último circuito (bajando de media ${Math.abs(trendScore).toFixed(1)} pts). Aun así, por ${price.toFixed(1)}M puede representar un pilar competitivo excelente.`;
        } else {
          justification = `Opción balanceada ideal. Responde con garantías a su costo de ${price.toFixed(1)}M y encaja perfectamente en cualquier estrategia competitiva.`;
        }
      }

      return {
        ...p,
        history: historyScore,
        trendScore,
        ptsOverPrice,
        recoScore,
        justification
      };
    })
    .sort((a, b) => b.recoScore - a.recoScore)
    // Select top 4 recommendations
    .slice(0, 4);

  }, [currentSplit, miEscuderia, freeAgentsList, recommenderStrategy]);

  const { standings, teamStandings, raceResults, allPilotsForScouting, championshipsTimeline } = useMemo(() => {
    // 1. All Pilots for Scouting (Global list from current split or all potential)
    const scoutingList: any[] = [];
    if (currentSplit) {
      currentSplit.equipos.forEach((e: any) => {
        e.pilotos.forEach((p: any) => {
          scoutingList.push({ ...p, teamName: e.nombre });
        });
      });
    }

    if (activeSplitId === "global") {
      // 1. Initialize championships with Split 1 Historical Winners
      const pilotTitles: Record<string, { id: string, name: string, championships: number, team: string }> = {
        "piloto_jose": { id: "piloto_jose", name: "Jose (I)", championships: 1, team: "Zenith" }
      };
      const teamTitles: Record<string, { id: string, nombre: string, championships: number }> = {
        "roses": { id: "roses", nombre: "Roses", championships: 1 }
      };

      // 2. Initialize all other registered users & plantilla pilots at 0
      usuarios.filter((u: any) => u.rol === "piloto").forEach((u: any) => {
        if (!pilotTitles[u.uid]) {
          pilotTitles[u.uid] = { id: u.uid, name: u.nombre, championships: 0, team: u.escuderia_id ? u.escuderia_id.replace('_', ' ') : "Sin equipo" };
        }
      });
      plantilla.forEach((p: any) => {
        if (p.rol === "piloto" && !pilotTitles[p.id]) {
          pilotTitles[p.id] = { id: p.id, name: p.nombre, championships: 0, team: p.escuderia_id ? p.escuderia_id.replace('_', ' ') : "Sin equipo" };
        }
      });

      // 3. Pre-seed known teams at 0
      const predefinedTeams = ["zenith", "roses", "alfa_romero"];
      predefinedTeams.forEach(tId => {
        if (!teamTitles[tId]) {
          teamTitles[tId] = { id: tId, nombre: tId.replace('_', ' '), championships: 0 };
        }
      });

      // 4. Trace subsequent splits dynamically if they are completed
      splits.forEach(s => {
        if (s.id === "split_1") return; // Split 1 is already pre-seeded as completed above
        
        // Count if all circuits in the split are completed
        const hasCircuits = s.circuitos && s.circuitos.length > 0;
        const allCompleted = hasCircuits && s.circuitos.every((c: any) => c.completado);
        if (!allCompleted) return; // ignore uncompleted splits

        // Find winner team
        let topTeamId = "";
        let maxTeamPts = -1;
        s.equipos.forEach((eq: any) => {
          const pts = eq.puntos_constructores || 0;
          if (pts > maxTeamPts) {
            maxTeamPts = pts;
            topTeamId = eq.id;
          }
        });
        if (topTeamId && maxTeamPts >= 0) {
          if (!teamTitles[topTeamId]) {
            teamTitles[topTeamId] = { id: topTeamId, nombre: topTeamId.replace('_', ' '), championships: 0 };
          }
          teamTitles[topTeamId].championships += 1;
        }

        // Find winner pilot
        let topPilotId = "";
        let maxPilotPts = -1;
        let pTeamName = "";
        s.equipos.forEach((eq: any) => {
          (eq.pilotos || []).forEach((p: any) => {
            const pts = p.puntos_piloto || 0;
            if (pts > maxPilotPts) {
              maxPilotPts = pts;
              topPilotId = p.id;
              pTeamName = eq.nombre;
            }
          });
        });
        if (topPilotId && maxPilotPts >= 0) {
          // Find or create in pilotTitles
          const matchedUser = usuarios.find(u => u.uid === topPilotId || (u.piloto_id && u.piloto_id === topPilotId));
          const canonId = matchedUser ? matchedUser.uid : topPilotId;
          const canonName = matchedUser ? matchedUser.nombre : (pilotTitles[canonId]?.name || topPilotId);
          if (!pilotTitles[canonId]) {
            pilotTitles[canonId] = { id: canonId, name: canonName, championships: 0, team: pTeamName };
          }
          pilotTitles[canonId].championships += 1;
          pilotTitles[canonId].team = pTeamName;
        }
      });

      const ps = Object.values(pilotTitles)
        .map((p: any) => ({
          id: p.id,
          name: p.name,
          points: p.championships,
          escuderia: p.team,
          isGlobal: true
        }))
        .sort((a, b) => b.points - a.points);

      const ts = Object.values(teamTitles)
        .map((t: any) => ({
          id: t.id,
          nombre: t.nombre,
          puntos: t.championships,
          isGlobal: true
        }))
        .sort((a, b) => b.puntos - a.puntos);

      // Build dynamic championship timeline for the global splits history selector
      const timeline: any[] = [];
      
      // Split 1 is seeded/completed baseline
      timeline.push({
        splitId: "split_1",
        splitName: "Split 1",
        completed: true,
        winnerPilot: "Jose (I)",
        winnerPilotTeam: "Zenith",
        winnerPilotPoints: 87,
        winnerTeam: "Roses",
        winnerTeamPoints: 185
      });

      // Subsequent splits (2, 3, 4)
      splits.forEach(s => {
        if (s.id === "split_1") return;

        const hasCircuits = s.circuitos && s.circuitos.length > 0;
        const allCompleted = hasCircuits && s.circuitos.every((c: any) => c.completado);

        if (allCompleted) {
          // Find winner team
          let topTeamName = "";
          let maxTeamPts = -1;
          s.equipos.forEach((eq: any) => {
            const pts = eq.puntos_constructores || 0;
            if (pts > maxTeamPts) {
              maxTeamPts = pts;
              topTeamName = eq.nombre;
            }
          });

          // Find winner pilot
          let topPilotName = "";
          let topPilotTeamName = "";
          let maxPilotPts = -1;
          s.equipos.forEach((eq: any) => {
            (eq.pilotos || []).forEach((p: any) => {
              const pts = p.puntos_piloto || 0;
              if (pts > maxPilotPts) {
                maxPilotPts = pts;
                topPilotName = p.nombre;
                topPilotTeamName = eq.nombre;
              }
            });
          });

          timeline.push({
            splitId: s.id,
            splitName: s.nombre,
            completed: true,
            winnerPilot: topPilotName || "Desconocido",
            winnerPilotTeam: topPilotTeamName,
            winnerPilotPoints: maxPilotPts,
            winnerTeam: topTeamName || "Desconocido",
            winnerTeamPoints: maxTeamPts
          });
        } else {
          timeline.push({
            splitId: s.id,
            splitName: s.nombre,
            completed: false,
            winnerPilot: "En curso / Pendiente",
            winnerPilotTeam: "",
            winnerPilotPoints: 0,
            winnerTeam: "Pendiente",
            winnerTeamPoints: 0
          });
        }
      });

      return { standings: ps, teamStandings: ts, raceResults: [], allPilotsForScouting: scoutingList, championshipsTimeline: timeline };
    }

    if (!currentSplit) return { standings: [], teamStandings: [], raceResults: [], allPilotsForScouting: [], championshipsTimeline: [] };

    // Roster of active teams in this split
    const activeRosterDocs = currentSplit.equipos.flatMap((e: any) => 
      e.pilotos.map((p: any) => ({
        id: p.id,
        name: p.nombre,
        points: p.puntos_piloto || 0,
        escuderia: e.nombre
      }))
    );

    // Any registered pilot not currently in a team is added as "Sin equipo"
    const activeRosterIds = activeRosterDocs.map(d => d.id);
    const freeAgentsInStandings = usuarios
      .filter((u: any) => u.rol === "piloto" && !activeRosterIds.some(id => id === u.uid || (u.piloto_id && id === u.piloto_id)))
      .map((u: any) => ({
        id: u.uid,
        name: u.nombre,
        points: 0,
        escuderia: "Sin equipo"
      }));

    const ps = [...activeRosterDocs, ...freeAgentsInStandings].sort((a: any, b: any) => b.points - a.points);

    const ts = currentSplit.equipos.map((e: any) => ({
      id: e.id,
      nombre: e.nombre,
      puntos: e.puntos_constructores || 0
    })).sort((a, b) => b.puntos - a.puntos);

    const rRes: any[] = [];
    currentSplit.circuitos.filter((c: any) => c.completado && c.resultados).forEach((c: any) => {
      rRes.push({
        circuitName: c.nombre,
        pilots: c.resultados.map((r: any) => ({
          id: r.pilotoId,
          name: r.pilotoNombre,
          pts: r.puntosTotales,
          team: r.escuderiaId || ""
        }))
      });
    });

    return { standings: ps, teamStandings: ts, raceResults: rRes, allPilotsForScouting: scoutingList, championshipsTimeline: [] };
  }, [activeSplitId, currentSplit, splits, usuarios, plantilla]);

  const pilotProfileStats = useMemo(() => {
    if (!selectedPilotForProfileId) return null;
    
    const pilotUser = usuarios.find((u: any) => u.uid === selectedPilotForProfileId || (u.piloto_id && u.piloto_id === selectedPilotForProfileId));
    let pilotName = pilotUser?.nombre || selectedPilotForProfileId;
    
    if (!pilotUser) {
      for (const s of splits) {
        for (const e of s.equipos) {
          const match = e.pilotos?.find((p: any) => p.id === selectedPilotForProfileId);
          if (match) {
            pilotName = match.nombre;
            break;
          }
        }
      }
    }

    let totalPoints = 0;
    let victories = 0;
    let podiums = 0;
    let poles = 0;
    let dnfs = 0;
    let cleanRaces = 0;
    let dotds = 0;
    let mvps = 0;
    let fastestLaps = 0;
    
    let rating = pilotUser?.rating_piloto || 70;
    let clause = pilotUser?.clausula_actual || (rating * 0.5);
    let escuderiaName = "Sin equipo";

    const localPOINTS_SCALE = [16, 13, 11, 9, 8, 7, 6, 5, 4, 3, 2, 1];

    const splitsToSearch = activeSplitId === "global" 
      ? splits 
      : splits.filter(s => s.id === activeSplitId);

    if (activeSplitId !== "global") {
      const activeSp = splits.find(s => s.id === activeSplitId);
      if (activeSp) {
        const teamWithPilot = activeSp.equipos?.find((e: any) => 
          e.pilotos?.some((p: any) => p.id === selectedPilotForProfileId)
        );
        if (teamWithPilot) {
          escuderiaName = teamWithPilot.nombre;
          const pilotInTeam = teamWithPilot.pilotos.find((p: any) => p.id === selectedPilotForProfileId);
          if (pilotInTeam) {
            rating = pilotInTeam.rating_piloto ?? rating;
            clause = pilotInTeam.clausula_actual ?? (rating * 0.5);
          }
        }
      }
    } else {
      const sortedCompletedSplits = [...splits]
        .filter(s => s.circuitos?.some((c: any) => c.completado))
        .sort((a, b) => b.id.localeCompare(a.id));
      const latestSplit = sortedCompletedSplits[0] || splits[splits.length - 1];
      if (latestSplit) {
        const teamWithPilot = latestSplit.equipos?.find((e: any) => 
          e.pilotos?.some((p: any) => p.id === selectedPilotForProfileId)
        );
        if (teamWithPilot) {
          escuderiaName = teamWithPilot.nombre;
          const pilotInTeam = teamWithPilot.pilotos.find((p: any) => p.id === selectedPilotForProfileId);
          if (pilotInTeam) {
            rating = pilotInTeam.rating_piloto ?? rating;
            clause = pilotInTeam.clausula_actual ?? (rating * 0.5);
          }
        }
      }
    }

    const history: any[] = [];
    
    splitsToSearch.forEach((s: any) => {
      s.circuitos?.filter((c: any) => c.completado && c.resultados).forEach((c: any) => {
        const res = c.resultados.find((r: any) => r.pilotoId === selectedPilotForProfileId);
        if (res) {
          const points = res.racePos >= 1 && res.racePos <= 12 ? localPOINTS_SCALE[res.racePos - 1] : 0;
          totalPoints += points;
          
          if (res.racePos === 1) victories++;
          if (res.racePos >= 1 && res.racePos <= 3) podiums++;
          if (res.qualyPos === 1) poles++;
          if (res.isDnfOwnError || res.racePos > 12) dnfs++;
          if (res.isClean) cleanRaces++;
          if (res.isDotd) dotds++;
          if (res.isMvp) mvps++;
          if (res.fastestLap) fastestLaps++;

          const drivingTeam = s.equipos.find((eq: any) => eq.id === res.escuderiaId || eq.pilotos?.some((p: any) => p.id === selectedPilotForProfileId));
          
          history.push({
            splitId: s.id,
            splitName: s.nombre,
            circuitId: c.id,
            circuitName: c.nombre,
            qualyPos: res.qualyPos,
            racePos: res.racePos,
            isDnfOwnError: res.isDnfOwnError,
            isClean: res.isClean,
            overtakesBoost: res.overtakesBoost,
            isDotd: res.isDotd,
            isMvp: res.isMvp,
            fastestLap: res.fastestLap,
            points,
            teamName: drivingTeam?.nombre || "N/A"
          });
        }
      });
    });

    const participaciones = history.length;
    const avgPoints = participaciones > 0 ? Number((totalPoints / participaciones).toFixed(1)) : 0;
    
    const validQualyPos = history.filter(h => h.qualyPos >= 1 && h.qualyPos <= 20).map(h => h.qualyPos);
    const avgQualy = validQualyPos.length > 0 ? Number((validQualyPos.reduce((a, b) => a + b, 0) / validQualyPos.length).toFixed(1)) : 0;

    const validRacePos = history.filter(h => h.racePos >= 1 && h.racePos <= 12).map(h => h.racePos);
    const avgRace = validRacePos.length > 0 ? Number((validRacePos.reduce((a, b) => a + b, 0) / validRacePos.length).toFixed(1)) : 0;

    return {
      pilotId: selectedPilotForProfileId,
      name: pilotName,
      fotoUrl: getPilotPhoto(selectedPilotForProfileId),
      rating,
      clause,
      escuderiaName,
      totalPoints,
      victorias,
      podiums,
      poles,
      dnfs,
      cleanRaces,
      dotds,
      mvps,
      fastestLaps,
      participaciones,
      avgPoints,
      avgQualy,
      avgRace,
      history: history.sort((a, b) => b.splitId.localeCompare(a.splitId) || a.circuitId.localeCompare(b.circuitId))
    };
  }, [selectedPilotForProfileId, activeSplitId, splits, usuarios]);

  return (
    <div className="space-y-8 pb-32">
      {/* Selector de Split */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setActiveSplitId("global")}
          className={`px-4 py-2 rounded-lg font-black text-[10px] uppercase tracking-widest transition-all ${
            activeSplitId === "global" 
            ? "bg-[#e10600] text-white shadow-lg shadow-red-900/20" 
            : "bg-zinc-900/50 text-white/40 border border-white/5 hover:border-white/20"
          }`}
        >
          Mundial Global
        </button>
        {splits.filter(s => isSplitUnlocked(s.id, splits)).map(s => (
          <button
            key={s.id}
            onClick={() => setActiveSplitId(s.id)}
            className={`px-4 py-2 rounded-lg font-black text-[10px] uppercase tracking-widest transition-all ${
              activeSplitId === s.id 
              ? "bg-[#e10600] text-white shadow-lg shadow-red-900/20" 
              : "bg-zinc-900/50 text-white/40 border border-white/5 hover:border-white/20"
            }`}
          >
            {s.nombre}
          </button>
        ))}
      </div>

      {/* CUADRO DE HONOR / PALMARÉS */}
      <div className="bg-gradient-to-r from-zinc-950 via-zinc-900 to-zinc-950 border border-white/10 rounded-2xl p-4 flex flex-col lg:flex-row items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3">
          <Award className="w-8 h-8 text-amber-400 shrink-0" />
          <div>
            <span className="text-[9px] uppercase tracking-[0.25em] text-[#e10600] font-black block">PADDOCK CLUB HALL OF FAME</span>
            <span className="text-xs text-white/40 uppercase font-mono">Historial de Campeones Oficiales F1 Bugambra</span>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-2.5 w-full lg:w-auto">
          <div className="bg-white/5 border border-white/5 rounded-xl px-4 py-2 flex items-center justify-between sm:justify-start gap-4 flex-1 lg:flex-initial">
            <span className="text-[9px] text-amber-400/80 font-mono uppercase tracking-widest">🏆 Campeón Pilotos Split 1:</span>
            <span className="font-extrabold text-xs text-white uppercase tracking-tight">Jose (I) [Zenith]</span>
          </div>
          <div className="bg-white/5 border border-white/5 rounded-xl px-4 py-2 flex items-center justify-between sm:justify-start gap-4 flex-1 lg:flex-initial">
            <span className="text-[9px] text-[#e10600]/85 font-mono uppercase tracking-widest">🏎️ Campeón Escuderías Split 1:</span>
            <span className="font-extrabold text-xs text-white uppercase tracking-tight">Roses</span>
          </div>
        </div>
      </div>

      {activeSplitId !== "global" && miEscuderia && (
        <section className="bg-gradient-to-br from-zinc-800 via-zinc-900 to-zinc-950 border border-white/20 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
          <div className="absolute -right-4 -top-4 w-32 h-32 bg-[#e10600]/10 rounded-full blur-2xl pointer-events-none"></div>
          
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
            
            {/* Logo and branding workspace block */}
            <div className="flex items-center gap-5 w-full md:w-auto">
              {canViewBudget ? (
                <div
                  onDragEnter={handleLogoDrag}
                  onDragOver={handleLogoDrag}
                  onDragLeave={handleLogoDrag}
                  onDrop={handleLogoDrop}
                  onClick={() => teamLogoInputRef.current?.click()}
                  className={`relative w-20 h-20 rounded-xl overflow-hidden border-2 cursor-pointer transition-all shrink-0 flex items-center justify-center group ${
                    logoDragActive 
                      ? "border-[#e10600] bg-[#e10600]/15" 
                      : "border-white/10 hover:border-[#e10600] bg-black/40"
                  }`}
                  title="Arrastra una imagen o haz clic para subir el logo de tu escudería para este split"
                >
                  <input
                    type="file"
                    ref={teamLogoInputRef}
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleUpdateTeamLogo(e.target.files[0]);
                      }
                    }}
                    accept="image/*"
                    className="hidden"
                  />
                  
                  {miEscuderia.logo_url ? (
                    <img
                      src={miEscuderia.logo_url}
                      alt={miEscuderia.nombre}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover group-hover:opacity-40 transition-opacity"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-center p-2">
                      <UploadCloud className="w-6 h-6 text-white/30 group-hover:text-white/80 transition-colors" />
                      <span className="text-[8px] font-mono text-white/20 uppercase tracking-tighter mt-1 group-hover:text-white/60">SUBIR LOGO</span>
                    </div>
                  )}
                  
                  {/* Overlay editing indicators */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white text-[8px] font-mono uppercase tracking-widest gap-1 select-none">
                    <Camera className="w-4 h-4 text-[#e10600]" />
                    <span>EDITAR LOGO</span>
                  </div>
                  
                  {updatingLogo && (
                    <div className="absolute inset-0 bg-black/80 flex items-center justify-center text-xs font-mono text-white">
                      Cargando...
                    </div>
                  )}
                </div>
              ) : (
                <div className="w-20 h-20 rounded-xl overflow-hidden border border-white/10 bg-black/40 shrink-0 flex items-center justify-center">
                  {miEscuderia.logo_url ? (
                    <img
                      src={miEscuderia.logo_url}
                      alt={miEscuderia.nombre}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs font-black uppercase text-white/20 font-mono">
                      {miEscuderia.nombre.substring(0, 2)}
                    </div>
                  )}
                </div>
              )}
              
              <div>
                <span className="text-[8px] font-mono uppercase tracking-[0.25em] text-[#e10600] font-black block mb-1">
                  {canViewBudget ? "ESCUDERÍA OFICIAL DEL JEQUE" : "TU EQUIPO PARA ESTE SPLIT"}
                </span>
                <h3 className="text-2xl font-black italic text-white uppercase tracking-tight">{miEscuderia.nombre}</h3>
                <p className="text-[10px] text-white/40 uppercase font-mono mt-0.5">
                  Visualizando logo oficial del {currentSplit?.nombre || activeSplitId}
                </p>
              </div>
            </div>

            {/* Financial indicators */}
            <div className="flex items-center gap-8 w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 border-white/5 pt-4 md:pt-0">
              {canViewBudget && (
                <div>
                  <h4 className="text-[9px] uppercase font-bold tracking-[0.15em] text-[#e10600] mb-1">Presupuesto Disponible</h4>
                  <div className="flex items-baseline gap-0.5">
                    <span className="text-4xl font-extrabold italic text-white leading-none">{miEscuderia.presupuesto.toFixed(1)}</span>
                    <span className="text-xl font-bold text-white/50">M</span>
                  </div>
                </div>
              )}
              <div className="text-right">
                <p className="text-[9px] text-[#e10600] uppercase font-bold tracking-[0.15em] mb-1">Valor Total de Planta</p>
                <div className="flex items-baseline justify-end gap-0.5">
                  <span className="text-2xl font-black italic text-white leading-none">{miEscuderia.valor_total.toFixed(1)}</span>
                  <span className="text-sm font-bold text-white/50">M</span>
                </div>
              </div>
            </div>

          </div>
        </section>
      )}

      {/* SECCIÓN: RECOMENDADOR DE FICHAJES INTELIGENTE (IA & Eco) */}
      {activeSplitId !== "global" && canViewBudget && miEscuderia && (
        <section className="bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 border border-emerald-500/20 rounded-2xl p-5 shadow-2xl relative overflow-hidden">
          {/* Subtle decoration */}
          <div className="absolute right-0 bottom-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none"></div>
          
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 border-b border-white/5 pb-4">
            <div>
              <span className="text-[9px] uppercase tracking-[0.2em] text-emerald-400 font-extrabold flex items-center gap-1.5 font-mono">
                <Sparkles className="w-4 h-4 text-emerald-400 animate-pulse" />
                ASISTENTE DE FICHAJES INTELIGENTE
              </span>
              <h2 className="text-xl font-black italic uppercase tracking-tight text-white mt-1">Recomendación Personalizada (Modelo de Rendimiento y Presupuesto)</h2>
              <p className="text-xs text-white/40 mt-1 font-mono uppercase">
                Sugerencias óptimas de 4 pilotos que encajan en tu economía libre ({miEscuderia.presupuesto.toFixed(1)}M)
              </p>
            </div>
            
            {/* Strategy Select buttons */}
            <div className="flex flex-wrap gap-2">
              {[
                { id: "balanced", label: "⚖️ Equilibrado", desc: "Mejor relación calidad-precio (ROI)" },
                { id: "momentum", label: "🔥 En Racha", desc: "Pilotos con tendencia ascendente reciente" },
                { id: "budget", label: "💎 Bajo Coste", desc: "Ahorro extremo para la escudería" },
                { id: "premium", label: "👑 Galácticos", desc: "Mejores rating costeables disponibles" }
              ].map((strat) => (
                <button
                  key={strat.id}
                  onClick={() => setRecommenderStrategy(strat.id as any)}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all flex flex-col items-start min-w-[100px] active:scale-95 cursor-pointer ${
                    recommenderStrategy === strat.id
                      ? "bg-emerald-500 text-black border border-emerald-400 shadow-lg shadow-emerald-500/10"
                      : "bg-zinc-900 text-white/50 border border-white/5 hover:border-white/15"
                  }`}
                  title={strat.desc}
                >
                  <span className="font-extrabold leading-none">{strat.label}</span>
                  <span className={`text-[7px] font-mono mt-0.5 uppercase ${recommenderStrategy === strat.id ? "text-black/60" : "text-white/30"}`}>{strat.id === "balanced" ? "ROI Máximo" : strat.id === "momentum" ? "Tendencia Up" : strat.id === "budget" ? "Ahorro" : "Líderes"}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {recommendedPilots.map((p: any, i: number) => {
              const isAlreadyInTeam = miEscuderia.pilotos?.some((mp: any) => mp.id === p.id);
              const isAffordable = miEscuderia.presupuesto >= p.coste;
              const hasNegativeTrend = p.trendScore < -3;
              const hasPositiveTrend = p.trendScore > 3;

              return (
                <div key={`rec-${p.id}-${i}`} className="bg-zinc-900/40 border border-white/5 rounded-xl p-4 flex flex-col hover:bg-white/[0.02] hover:border-white/10 transition-all group relative">
                  {/* Badge corner */}
                  {isAlreadyInTeam && (
                    <span className="absolute top-3 right-3 bg-white/10 text-white/70 border border-white/10 text-[7px] font-mono font-bold uppercase px-1.5 py-0.5 rounded">
                      Contratado
                    </span>
                  )}
                  
                  {/* Top Header info */}
                  <div className="flex gap-3 items-center mb-3">
                    {getPilotPhoto(p.id) ? (
                      <img
                        src={getPilotPhoto(p.id)}
                        alt={p.nombre}
                        referrerPolicy="no-referrer"
                        className="w-10 h-10 rounded-full object-cover border-2 border-emerald-500"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full border border-white/10 bg-zinc-850 flex items-center justify-center font-bold text-xs text-white/30 uppercase font-mono">
                        {p.nombre ? p.nombre.substring(0, 2).toUpperCase() : 'FX'}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-sm truncate text-white group-hover:text-emerald-400 transition-colors uppercase tracking-tight">{p.nombre}</div>
                      <div className="text-[8px] font-mono text-white/40 uppercase tracking-tight truncate">{p.teamNombre}</div>
                    </div>
                  </div>

                  {/* Pricing and points indicators */}
                  <div className="grid grid-cols-3 gap-2 border-y border-white/5 py-2 text-center my-1.5 font-mono">
                    <div>
                      <span className="text-[7px] uppercase text-white/30 block mb-0.5">Precio</span>
                      <span className="text-xs font-black text-white">{p.coste.toFixed(1)}M</span>
                    </div>
                    <div>
                      <span className="text-[7px] uppercase text-white/30 block mb-0.5">Rating</span>
                      <span className="text-xs font-black text-white">{(p.rating_piloto || p.rating || 70).toFixed(0)}</span>
                    </div>
                    <div>
                      <span className="text-[7px] uppercase text-white/30 block mb-0.5">Puntos</span>
                      <span className="text-xs font-black text-emerald-400">{(p.puntos_piloto || p.points || p.puntos || 0)}</span>
                    </div>
                  </div>

                  {/* Trend Indicator */}
                  <div className="mb-2.5">
                    <div className="flex justify-between items-center text-[8px] font-mono mb-1.5">
                      <span className="text-white/40 uppercase">Tendencia de Forma:</span>
                      <span className={`font-bold flex items-center gap-0.5 ${
                        hasNegativeTrend ? "text-red-400 animate-pulse" : hasPositiveTrend ? "text-emerald-400" : "text-white/50"
                      }`}>
                        {p.trendScore > 0 ? `+${p.trendScore.toFixed(1)}` : p.trendScore.toFixed(1)} pts
                        {hasNegativeTrend ? "📉" : hasPositiveTrend ? "📈" : "➖"}
                      </span>
                    </div>
                    
                    {/* Visual performance indicators per race */}
                    {p.history && p.history.length > 0 ? (
                      <div className="flex gap-1 items-center justify-center bg-black/40 p-1 rounded-lg border border-white/5">
                        <span className="text-[6px] font-mono text-white/20 uppercase mr-1 shrink-0">Últimos:</span>
                        {p.history.map((pts: number, idx: number) => (
                          <div key={idx} className="flex-1 text-center py-0.5 rounded text-[8px] font-mono font-bold bg-white/5 text-white/60" title={`Carrera ${idx + 1}: ${pts} pts`}>
                            {pts}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[8px] text-white/20 font-mono uppercase italic text-center py-1">Sin historial de carreras completadas</p>
                    )}
                  </div>

                  {/* Description / Justification */}
                  <p className="text-[10px] text-white/60 leading-relaxed font-sans flex-1 bg-black/30 rounded-lg p-2.5 border border-white/5">
                    {p.justification}
                  </p>

                  {/* Hire action */}
                  <div className="mt-3 border-t border-white/5 pt-3">
                    {isAlreadyInTeam ? (
                      <div className="w-full text-center py-2 text-[10px] uppercase font-bold text-white/30 border border-white/5 bg-white/[0.02] rounded-lg">
                        Ya está en tu equipo
                      </div>
                    ) : currentSplit?.fichajes_abiertos ? (
                      <button
                        type="button"
                        disabled={transacting || !isAffordable}
                        onClick={() => {
                          if (p.isFreeAgent) {
                            handleFicharFreeAgent(p);
                          } else {
                            handleClausulazo(p, p.teamId, p.teamNombre);
                          }
                        }}
                        className={`w-full py-2 rounded-lg text-[10px] font-extrabold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 active:scale-95 ${
                          isAffordable
                            ? "bg-emerald-500 text-black hover:bg-emerald-400 hover:shadow-lg hover:shadow-emerald-500/10 cursor-pointer"
                            : "bg-white/5 text-white/20 border border-white/5 cursor-not-allowed"
                        }`}
                      >
                        <Coins className="w-3.5 h-3.5" />
                        {isAffordable ? `Fichar por ${p.coste.toFixed(1)}M` : `Insuficiente (Faltan ${(p.coste - miEscuderia.presupuesto).toFixed(1)}M)`}
                      </button>
                    ) : (
                      <div className="w-full text-center py-2 text-[10px] uppercase font-medium text-red-500/70 border border-red-500/10 bg-red-400/5 rounded-lg font-mono">
                        Cerrado
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Mi Equipo Section */}
      {activeSplitId !== "global" && (
        <section>
          <div className="flex justify-between items-center mb-4 border-b border-white/10 pb-2">
            <h2 className="text-xl font-bold italic tracking-tight lowercase flex items-center gap-2">
               <span className="w-1 h-5 bg-[#e10600]" />
               mi equipo
            </h2>
            {currentSplit?.fichajes_abiertos && (
              <span className="bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 font-bold font-mono text-[10px] uppercase px-2.5 py-1 rounded-full animate-pulse tracking-wide flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                VENTANA DE FICHAJES ABIERTA (MERCADO ACTIVO)
              </span>
            )}
          </div>
          
          {userData?.rol === "piloto" && !miEscuderia ? (
            <div className="bg-gradient-to-br from-amber-500/10 to-transparent border border-amber-500/20 rounded-2xl p-6 relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
              <div className="absolute right-0 top-0 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl"></div>
              <div>
                <div className="flex items-center gap-2 text-amber-500 font-black text-xs uppercase tracking-widest mb-2">
                  <ShieldAlert className="w-4 h-4 animate-bounce" />
                  Agencia Libre / Estado Independiente
                </div>
                <h3 className="text-xl font-extrabold text-white uppercase tracking-tight">Actualmente estás SIN EQUIPO en {currentSplit?.nombre || "este Split"}</h3>
                <p className="text-sm text-white/60 mt-1 max-w-xl">
                  Tu perfil está disponible en el mercado para este Split. Las escuderías con presupuesto te pueden incorporar mediante la sección de "Agentes Libres Bolsa", o el Administrador puede asignarte de forma manual a una escudería desde el Panel de Control.
                </p>
              </div>
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 text-center w-full md:w-auto shrink-0">
                <span className="text-[10px] block text-amber-400 font-mono tracking-wider uppercase font-extrabold mb-1">VALOR DE COMPRA</span>
                <span className="text-2xl font-black font-mono text-white">10M</span>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {misPilotos.map((p: any, i: number) => (
                <div key={`mis-pilotos-${p.id}-${i}`} className="bg-zinc-900/50 border border-white/10 rounded-xl p-4 flex flex-col hover:bg-white/5 transition-all group">
                  <div className="flex gap-3 items-center mb-4">
                    {getPilotPhoto(p.id) ? (
                      <img 
                        src={getPilotPhoto(p.id)} 
                        alt={p.nombre} 
                        referrerPolicy="no-referrer"
                        className="w-12 h-12 rounded-full object-cover border-2 border-[#e10600]"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full border border-white/10 bg-zinc-800 flex items-center justify-center font-bold text-sm text-white/30 uppercase font-mono">
                        {p.nombre ? p.nombre.substring(0, 2).toUpperCase() : 'FX'}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-base truncate group-hover:text-[#e10600] transition-colors">{p.nombre}</div>
                      <div className="text-[10px] bg-red-500/15 text-red-400 font-mono font-bold px-1.5 py-0.5 rounded inline-block mt-0.5">{(p.rating_piloto || 0).toFixed(0)} RTG</div>
                    </div>
                  </div>
                  <div className="space-y-2 mt-auto text-sm font-mono text-gray-400">
                    <div className="flex justify-between">
                      <span>Puntos:</span>
                      <span className="text-white">{p.puntos_piloto || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Victorias:</span>
                      <span className="text-white">{p.victorias || 0}</span>
                    </div>
                    {canViewBudget && (
                      <div className="flex justify-between text-xs text-white/50 border-t border-white/5 pt-2 mt-2">
                        <span>Val. Cláusula:</span>
                        <span className="text-[#e10600] font-bold">{(p.clausula_actual || (p.rating_piloto || 70) * 0.5)}M</span>
                      </div>
                    )}
                    
                    {canViewBudget && currentSplit?.fichajes_abiertos && (
                      <button
                        disabled={transacting}
                        onClick={() => handleDespedirPiloto(p)}
                        className="mt-4 w-full bg-red-500/10 hover:bg-red-500/25 border border-red-500/20 text-red-500 rounded py-2 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all active:scale-95 disabled:opacity-40"
                      >
                        <UserMinus className="w-3.5 h-3.5" />
                        Despedir / Reembolso ({(p.precio_compra_split || 10) * 0.5}M)
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {misPilotos.length === 0 && <div className="text-gray-500 italic text-xs uppercase tracking-widest font-mono p-4 border border-white/5 rounded-xl">Sin pilotos contratados.</div>}
            </div>
          )}
        </section>
      )}

      {/* Mundial Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <section>
          <h2 className="text-xl font-bold italic tracking-tight mb-4 border-b border-white/10 pb-2 lowercase flex items-center gap-2">
            <span className="w-1 h-5 bg-[#e10600]" />
            {activeSplitId === "global" ? "PALMARÉS HISTÓRICO PILOTOS" : `MUNDIAL ${currentSplit?.nombre || 'PILOTOS'}`}
          </h2>
          <div className="bg-zinc-900/50 border border-white/10 rounded-2xl overflow-hidden p-4">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="text-[10px] text-white/30 uppercase tracking-wider border-b border-white/5">
                  <th className="pb-3 pl-2">Pos</th>
                  <th className="pb-3">Piloto</th>
                  <th className="pb-3 text-right pr-2">{activeSplitId === "global" ? "Mundiales" : "Pts"}</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {standings.map((p: any, i: number) => {
                  const pilotPhoto = getPilotPhoto(p.id);
                  return (
                    <tr key={`standings-${p.id || p.name}-${i}`} className="border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors">
                      <td className="py-3 pl-2 font-black italic text-white/30 text-lg w-8">{i + 1}</td>
                      <td className="py-3 font-bold">
                        <div className="flex items-center gap-3">
                          {pilotPhoto ? (
                            <img
                              src={pilotPhoto}
                              alt={p.name}
                              referrerPolicy="no-referrer"
                              className="w-8 h-8 rounded-full object-cover border border-[#e10600]/40"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full border border-white/5 bg-zinc-850 flex items-center justify-center font-bold text-[10px] text-white/30 uppercase font-mono">
                              {p.name.substring(0, 2).toUpperCase()}
                            </div>
                          )}
                          <div className="flex flex-col">
                            <span>{p.name}</span>
                            <span className="text-[10px] text-white/20 font-mono uppercase">{p.escuderia}</span>
                          </div>
                        </div>
                      </td>
                    <td className="py-3 text-right pr-2 font-bold tabular-nums">
                      {activeSplitId === "global" ? (
                        <span className="text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded border border-amber-500/20 text-xs inline-flex items-center gap-1 font-mono">
                          {p.points} 🏆
                        </span>
                      ) : (
                        p.points
                      )}
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
          <div className="bg-zinc-900/50 border border-white/10 rounded-2xl overflow-hidden p-4">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="text-[10px] text-white/30 uppercase tracking-wider border-b border-white/5">
                  <th className="pb-3 pl-2">Pos</th>
                  <th className="pb-3">Escudería</th>
                  <th className="pb-3 text-right pr-2">{activeSplitId === "global" ? "Mundiales" : "Pts"}</th>
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
                          <img 
                            src={logo}
                            alt={t.nombre}
                            referrerPolicy="no-referrer"
                            className="w-8 h-8 rounded-lg object-cover border border-white/10"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-lg border border-white/5 bg-zinc-850 flex items-center justify-center font-bold text-[10px] text-white/40 uppercase font-mono">
                            {t.nombre.substring(0, 2).toUpperCase()}
                          </div>
                        )}
                        <span className="uppercase tracking-tighter">{t.nombre}</span>
                      </td>
                      <td className="py-3 text-right pr-2 font-bold tabular-nums">
                        {activeSplitId === "global" ? (
                          <span className="text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded border border-amber-500/20 text-xs inline-flex items-center gap-1 font-mono">
                            {t.puntos} 🏆
                          </span>
                        ) : (
                          t.puntos
                        )}
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
            <span className="w-1.5 h-5 bg-[#e10600] block" />
            Palmarés Histórico por Splits (Historial de Campeones)
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {championshipsTimeline.map((item, idx) => (
              <div key={item.splitId} className={`border rounded-2xl p-5 relative overflow-hidden transition-all duration-300 ${
                item.completed 
                ? "bg-gradient-to-br from-zinc-900 via-zinc-950 to-black border-amber-500/30 hover:border-amber-500/50 shadow-lg shadow-amber-950/20" 
                : "bg-zinc-950/20 border-white/5 opacity-60"
              }`}>
                {item.completed ? (
                  <div className="absolute top-3 right-3 bg-amber-500/10 text-amber-400 border border-amber-500/25 rounded-full px-2 py-0.5 text-[8px] font-black uppercase tracking-wider font-mono">
                    Oficial 🏆
                  </div>
                ) : (
                  <div className="absolute top-3 right-3 bg-white/5 text-white/40 border border-white/10 rounded-full px-2 py-0.5 text-[8px] font-mono tracking-wider uppercase">
                    Próximo 🏁
                  </div>
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
            <span className="w-1 h-5 bg-[#e10600]" />
            puntos por carrera
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {raceResults.map((gp, i) => (
              <div key={i} className="bg-zinc-900/50 border border-white/10 rounded-2xl p-4 overflow-hidden relative group">
                <div className="absolute right-0 top-0 text-[40px] font-black italic text-white/5 pointer-events-none group-hover:text-[#e10600]/10 transition-colors uppercase">GP</div>
                <h3 className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#e10600] mb-4 border-b border-white/5 pb-2">{gp.circuitName}</h3>
                <div className="space-y-3">
                  {gp.pilots.sort((a: any, b: any) => b.pts - a.pts).map((rp: any, idx: number) => (
                    <div key={idx} className="flex justify-between items-center text-xs">
                      <div className="flex flex-col">
                        <span className="font-bold flex items-center gap-2">
                           <span className="w-1.5 h-1.5 bg-white/20 rounded-full" />
                           {rp.name}
                        </span>
                        <span className="text-[9px] text-white/20 uppercase font-mono ml-3.5">{rp.team.replace('_', ' ')}</span>
                      </div>
                      <span className="font-black text-white tabular-nums">{rp.pts} <span className="text-[9px] text-white/40 font-normal">pts</span></span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* CENTRAL DE SCOUTING & PORTAL DE TRANSFERENCIAS */}
      {activeSplitId !== "global" && (
        <section className="mt-8 bg-zinc-900/50 border border-white/10 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-[#e10600]/5 blur-[120px] -mr-40 -mt-40 rounded-full" />
          
          <div className="mb-6 border-b border-white/10 pb-4">
            <h2 className="text-xl font-black italic tracking-tighter text-white flex items-center gap-2.5 lowercase">
              <span className="w-1.5 h-6 bg-[#e10600] block" />
              Central de Scouting y Fichajes Activos
            </h2>
            <p className="text-[10px] text-white/40 uppercase tracking-widest mt-1 font-mono">
              Rastrea claúsulas de rivales, contrata agentes libres independientes y visualiza el historial en tiempo real
            </p>
          </div>

          {/* 3-Column Marketplace Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Column 1: Clausulazos / Rivales */}
            <div className="bg-black/45 border border-white/5 rounded-xl p-4 flex flex-col h-[520px]">
              <div className="flex items-center gap-2 mb-4">
                <Flame className="w-4 h-4 text-[#e10600]" />
                <h3 className="font-bold text-sm text-white uppercase tracking-tight">Clausulazos Rivales</h3>
              </div>
              
              <div className="flex-1 overflow-y-auto space-y-3 pr-1 scrollbar-thin">
                {currentSplit?.equipos
                  ?.filter((team: any) => team.id !== escuderiaId)
                  ?.flatMap((team: any) => (team.pilotos || []).map((p: any) => ({ ...p, teamId: team.id, teamNombre: team.nombre })))
                  ?.map((p: any, i: number) => {
                    const clause = p.clausula_actual || (p.rating_piloto || 70) * 0.5;
                    const canBuy = currentSplit?.fichajes_abiertos && canViewBudget && (miEscuderia?.presupuesto >= clause);

                    return (
                      <div key={`clausula-${p.id}-${p.teamId || ''}-${i}`} className="p-3 bg-white/5 border border-white/5 rounded-lg text-xs hover:border-white/15 transition-all">
                        <div className="flex justify-between items-start mb-1.5">
                          <div>
                            <p className="font-extrabold text-white text-sm">{p.nombre}</p>
                            <p className="text-[9px] font-mono text-white/40 uppercase tracking-tight">{p.teamNombre}</p>
                          </div>
                          <span className="text-[10px] bg-red-500/15 text-red-400 font-bold px-1.5 py-0.5 rounded font-mono">
                            {p.rating_piloto || 70} RTG
                          </span>
                        </div>
                        
                        <div className="flex justify-between items-center text-[10px] font-mono border-t border-white/5 pt-2 mt-2">
                          <div>
                            <span className="text-white/40">Cláusula:</span>
                            <span className="text-white font-bold ml-1">{clause.toFixed(1)}M</span>
                          </div>
                          
                          {currentSplit?.fichajes_abiertos ? (
                            canViewBudget ? (
                              <button
                                disabled={transacting || !canBuy}
                                onClick={() => handleClausulazo(p, p.teamId, p.teamNombre)}
                                className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase transition-all flex items-center gap-1 active:scale-95 ${
                                  canBuy 
                                  ? "bg-[#e10600] text-white hover:bg-red-700 shadow-md shadow-red-900/30" 
                                  : "bg-white/10 text-white/30 cursor-not-allowed"
                                }`}
                              >
                                <Coins className="w-3.5 h-3.5" />
                                Pagar Cláusula
                              </button>
                            ) : (
                              <span className="text-[9px] text-white/20 italic">Solo Jeques</span>
                            )
                          ) : (
                            <span className="text-[9px] bg-red-500/10 text-red-500/80 px-1.5 py-0.5 rounded uppercase font-bold tracking-wider font-mono">Cerrado</span>
                          )}
                        </div>
                      </div>
                    );
                  })}

                {(!currentSplit?.equipos || currentSplit.equipos.filter((team: any) => team.id !== escuderiaId).flatMap((team: any) => team.pilotos || []).length === 0) && (
                  <div className="text-center py-12 text-white/25 italic text-xs uppercase font-mono tracking-widest">Sin pilotos rivales contratados</div>
                )}
              </div>
            </div>

            {/* Column 2: Free Agents Bolsa */}
            <div className="bg-black/45 border border-white/5 rounded-xl p-4 flex flex-col h-[520px]">
              <div className="flex items-center gap-2 mb-4">
                <UserPlus className="w-4 h-4 text-emerald-400" />
                <h3 className="font-bold text-sm text-white uppercase tracking-tight">Agentes Libres Bolsa</h3>
              </div>
              
              <div className="flex-1 overflow-y-auto space-y-3 pr-1 scrollbar-thin">
                {freeAgentsList.map((p: any, i: number) => {
                  const cost = p.precio_compra_split || 10;
                  const canBuy = currentSplit?.fichajes_abiertos && canViewBudget && (miEscuderia?.presupuesto >= cost);

                  return (
                    <div key={`freeagent-${p.id}-${i}`} className="p-3 bg-white/5 border border-white/5 rounded-lg text-xs hover:border-white/15 transition-all">
                      <div className="flex justify-between items-start mb-1.5">
                        <div>
                          <p className="font-extrabold text-white text-sm">{p.nombre}</p>
                          <p className="text-[9px] font-mono text-emerald-400 uppercase tracking-widest">Bolsa Independiente</p>
                        </div>
                        <span className="text-[10px] bg-emerald-500/15 text-emerald-400 font-bold px-1.5 py-0.5 rounded font-mono">
                          {p.rating_piloto || 70} RTG
                        </span>
                      </div>
                      
                      <div className="flex justify-between items-center text-[10px] font-mono border-t border-white/5 pt-2 mt-2">
                        <div>
                          <span className="text-white/40">Fichaje:</span>
                          <span className="text-white font-bold ml-1">{cost.toFixed(1)}M</span>
                        </div>
                        
                        {currentSplit?.fichajes_abiertos ? (
                          canViewBudget ? (
                            <button
                              disabled={transacting || !canBuy}
                              onClick={() => handleFicharFreeAgent(p)}
                              className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase transition-all flex items-center gap-1 active:scale-95 ${
                                canBuy 
                                ? "bg-emerald-500 text-black font-black hover:bg-emerald-400 shadow-md shadow-emerald-950/20" 
                                : "bg-white/10 text-white/30 cursor-not-allowed"
                              }`}
                            >
                              <UserPlus className="w-3.5 h-3.5" />
                              Contratar
                            </button>
                          ) : (
                            <span className="text-[9px] text-white/20 italic">Solo Jeques</span>
                          )
                        ) : (
                          <span className="text-[9px] bg-red-500/10 text-red-500/80 px-1.5 py-0.5 rounded uppercase font-bold tracking-wider font-mono">Cerrado</span>
                        )}
                      </div>
                    </div>
                  );
                })}

                {freeAgentsList.length === 0 && (
                  <div className="text-center py-12 text-white/25 italic text-xs uppercase font-mono tracking-widest">Todos los pilotos registrados están en escuderías</div>
                )}
              </div>
            </div>

            {/* Column 3: Timeline history */}
            <div className="bg-black/45 border border-white/5 rounded-xl p-4 flex flex-col h-[520px]">
              <div className="flex items-center gap-2 mb-4 border-b border-white/5 pb-2">
                <History className="w-4 h-4 text-white/60" />
                <h3 className="font-bold text-sm text-white uppercase tracking-tight">Noticias del Mercado</h3>
              </div>
              
              <div className="flex-1 overflow-y-auto space-y-4 pr-1 scrollbar-thin">
                {transfers.map((log: any) => {
                  const dateExpr = log.timestamp ? new Date(log.timestamp).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" }) : "";
                  return (
                    <div key={log.id} className="relative pl-5 border-l border-white/10 text-xs">
                      <div className="absolute left-0 top-1.5 w-1.5 h-1.5 rounded-full bg-[#e10600] -ml-[3.5px]" />
                      <p className="text-white/80 font-medium leading-relaxed">{log.detalles}</p>
                      <span className="text-[8px] font-mono text-white/20 uppercase mt-1 block flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5" />
                        Hoy, {dateExpr}
                      </span>
                    </div>
                  );
                })}

                {transfers.length === 0 && (
                  <div className="text-center py-16 text-white/15 italic text-[11px] uppercase font-mono tracking-widest flex flex-col items-center justify-center gap-3">
                    <ShieldAlert className="w-8 h-8 opacity-25" />
                    Sin transacciones en este Split
                  </div>
                )}
              </div>
            </div>

          </div>
        </section>
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
              {confirmModal.showCancel !== false && (
                <button
                  onClick={() => setConfirmModal(null)}
                  className="px-4 py-2.5 bg-white/5 hover:bg-white/10 text-white rounded-lg transition-colors border border-white/5"
                >
                  Cancelar
                </button>
              )}
              <button
                onClick={() => {
                  confirmModal.onConfirm();
                  setConfirmModal(null);
                }}
                className="px-4 py-2.5 bg-[#e10600] text-white rounded-lg hover:bg-red-700 transition-colors shadow-lg shadow-red-900/40"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
