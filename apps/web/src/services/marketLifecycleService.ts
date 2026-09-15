import { collection, doc, getDocs, runTransaction, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";
import { canFinalizeMarket, marketCompletion, type MarketPilot } from "../utils/marketLifecycle";

// Solo el administrador puede cerrar un split. Las bienvenidas del paddock se
// publican después, manualmente, desde el panel de administración.
export async function syncMarketLifecycle(splitId: string) {
  const teamsSnapshot = await getDocs(collection(db, `splits/${splitId}/equipos`));
  const pilotSnapshots = await Promise.all([
    getDocs(collection(db, `splits/${splitId}/roster`)),
    ...teamsSnapshot.docs.map(team => getDocs(collection(db, `${team.ref.path}/pilotos`))),
  ]);
  const pilotDocs = pilotSnapshots.flatMap(snapshot => snapshot.docs);
  return runTransaction(db, async transaction => {
    const splitRef = doc(db, "splits", splitId);
    const split = await transaction.get(splitRef);
    const room = await transaction.get(doc(db, `splits/${splitId}/subasta`, "sala"));
    if (!split.exists()) return;
    const roomData = room.data();
    // Nunca anunciar plantillas provisionales de una puja o un simulacro.
    if (!canFinalizeMarket(split.data(), roomData)) return;

    const teamDocs = await Promise.all(teamsSnapshot.docs.map(team => transaction.get(team.ref)));
    const currentPilots = await Promise.all(pilotDocs.map(pilot => transaction.get(pilot.ref)));
    const roster = new Map<string, MarketPilot>();
    const nestedOwners = new Map<string, string>();
    // Preferir el modelo anidado sobre el plano, como useSplits.
    const nestedFirst = [...currentPilots].sort((a, b) => Number(b.ref.parent.id === "pilotos") - Number(a.ref.parent.id === "pilotos"));
    for (const pilot of nestedFirst) {
      if (!pilot.exists()) continue;
      const data = pilot.data();
      const nested = pilot.ref.parent.id === "pilotos";
      if (!nested && roster.has(pilot.id)) continue;
      const equipoId = nested ? pilot.ref.parent.parent!.id : data.equipoId;
      if (nested && data.participa_hasta == null) {
        // Una transferencia antigua escribe destino y borra origen por separado.
        // Si observamos ese punto intermedio, esperar a la próxima comprobación.
        if (nestedOwners.has(pilot.id) && nestedOwners.get(pilot.id) !== equipoId) return;
        nestedOwners.set(pilot.id, equipoId);
      }
      const previous = roster.get(pilot.id);
      if (previous && previous.participa_hasta == null && data.participa_hasta != null) continue;
      roster.set(pilot.id, { ...data, pilotoId: pilot.id, equipoId });
    }
    const state = marketCompletion(
      teamDocs.filter(team => team.exists()).map(team => ({ ...team.data(), id: team.id })),
      [...roster.values()],
    );
    if (state.complete) transaction.update(splitRef, {
      fichajes_abiertos: false,
      mercado_cerrado_por_plantillas: true,
      mercado_cerrado_en: serverTimestamp(),
    });
  });
}
