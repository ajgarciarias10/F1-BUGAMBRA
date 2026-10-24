import { collection, doc, getDocs } from "firebase/firestore";
import { db } from "./firebase";
import { runAuditedAdminMutation } from "./adminMutationService";
import { construirRivalidades, type PlantillaSplit, type Rivalidad } from "../utils/rivalidades";

export type { PlantillaSplit, Rivalidad };

/** Guarda los grupos del split con registro antes/después. */
export async function guardarRivalidades(splitId: string, grupos: Rivalidad[], plantilla: PlantillaSplit) {
  await runAuditedAdminMutation({ ref: doc(db, "splits", splitId), action: "rivalries.update", summary: `Rivalidades actualizadas en ${splitId}: ${grupos.length} grupos.`, apply: current => {
    if (!current) throw new Error("El split ya no existe.");
    return { ...current, rivalidades_manual: grupos, rivalries: construirRivalidades(splitId, grupos, plantilla) };
  } });
}

/** Escuderías y pilotos del split leídos de Firestore, para quien no tiene ya el split cargado. */
export async function leerPlantillaSplit(splitId: string): Promise<PlantillaSplit> {
  const equiposSnap = await getDocs(collection(db, `splits/${splitId}/equipos`));
  const equipos = equiposSnap.docs.map(team => ({ id: team.id, nombre: String(team.data().nombre || team.id) }));
  const fichas = await Promise.all(equiposSnap.docs.filter(team => team.id !== "agente_libre").map(team => getDocs(collection(db, `splits/${splitId}/equipos/${team.id}/pilotos`))));
  const roster = fichas.flatMap(snap => snap.docs.map(pilot => ({ ...pilot.data(), pilotoId: String(pilot.data().pilotoId || pilot.id) })));
  return { equipos, roster };
}
