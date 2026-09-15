import { collection, doc, getDocs, runTransaction, serverTimestamp, writeBatch } from "firebase/firestore";
import { db } from "./firebase";
import { marketCompletion, type MarketPilot } from "../utils/marketLifecycle";

export interface PaddockWelcomeTeam {
  id: string;
  nombre: string;
  pilotos: Array<{ pilotoId: string; nombre: string }>;
  plantillaCompleta: boolean;
  completa: boolean;
  publicada: boolean;
  fotoUrl?: string;
}

export async function leerBienvenidas(splitId: string): Promise<{ splitNombre: string; completa: boolean; equipos: PaddockWelcomeTeam[] }> {
  const [splitSnap, teamsSnap] = await Promise.all([
    getDocs(collection(db, "splits")),
    getDocs(collection(db, `splits/${splitId}/equipos`)),
  ]);
  const split = splitSnap.docs.find(item => item.id === splitId);
  const roomDoc = (await getDocs(collection(db, `splits/${splitId}/subasta`))).docs.find(item => item.id === "sala");
  const pilotSnapshots = await Promise.all(teamsSnap.docs.map(team => getDocs(collection(db, `${team.ref.path}/pilotos`))));
  const roster: MarketPilot[] = pilotSnapshots.flatMap((snapshot, index) => snapshot.docs.map(item => ({
    ...(item.data() as any), pilotoId: item.id, equipoId: teamsSnap.docs[index].id,
  })));
  const state = marketCompletion(
    teamsSnap.docs.filter(team => team.id !== "agente_libre").map(team => ({ ...team.data(), id: team.id })),
    roster,
  );
  const postsSnapshot = await getDocs(collection(db, "paddock_posts"));
  return {
    splitNombre: split?.data()?.nombre || splitId,
    completa: state.complete,
    equipos: state.teams.map(team => {
      const post = postsSnapshot.docs.find(item => item.id === `welcome_${splitId}_${team.id}`);
      return {
        id: team.id,
        nombre: team.nombre || team.id,
        pilotos: team.pilots.map(pilot => ({ pilotoId: pilot.pilotoId, nombre: pilot.nombre || pilot.pilotoId })),
        plantillaCompleta: team.plantilla_completa === true,
        completa: team.complete,
        publicada: !!post,
        fotoUrl: post?.data()?.mediaUrl || "",
      };
    }),
  };
}

export async function marcarEquipoCompleto(splitId: string, equipoId: string, completa: boolean) {
  const ref = doc(db, `splits/${splitId}/equipos`, equipoId);
  await runTransaction(db, async transaction => {
    const snapshot = await transaction.get(ref);
    if (!snapshot.exists()) throw new Error("La escudería no existe.");
    transaction.update(ref, { plantilla_completa: completa });
  });
}

export async function publicarBienvenida(splitId: string, splitNombre: string, equipo: PaddockWelcomeTeam, fotoUrl: string) {
  const postRef = doc(db, "paddock_posts", `welcome_${splitId}_${equipo.id}`);
  await runTransaction(db, async transaction => {
    const [split, post] = await Promise.all([
      transaction.get(doc(db, "splits", splitId)),
      transaction.get(postRef),
    ]);
    if (!split.exists() || split.data()?.paddock_bienvenidas_aprobadas !== true) throw new Error("El administrador aún no ha dado el OK completo.");
    if (!equipo.completa) throw new Error(`La plantilla de ${equipo.nombre} aún no está completa.`);
    if (post.exists()) throw new Error(`La bienvenida de ${equipo.nombre} ya está publicada.`);
    transaction.set(postRef, {
      author: "Paddock · F1 Bugambra", authorId: "paddock", kind: "team_welcome",
      splitId, teamId: equipo.id, splitName: splitNombre, authorPhoto: "",
      mediaUrl: fotoUrl || null, mediaType: fotoUrl ? "image" : null,
      createdAt: new Date().toISOString(),
      text: `🏁 ¡Bienvenido, ${equipo.nombre}, a ${splitNombre}!\n\nPlantilla completa: ${equipo.pilotos.map(pilot => pilot.nombre).join(", ")}.\n\nEl box ya está listo. Equipo, presentaos al paddock: ¿cuál es vuestro objetivo para este split?`,
      publicadoEn: serverTimestamp(),
    });
  });
}

export async function aprobarBienvenidas(splitId: string) {
  await runTransaction(db, async transaction => {
    const splitRef = doc(db, "splits", splitId);
    const split = await transaction.get(splitRef);
    if (!split.exists()) throw new Error("El split no existe.");
    transaction.update(splitRef, { paddock_bienvenidas_aprobadas: true, paddock_bienvenidas_aprobadas_en: serverTimestamp() });
  });
}

export async function borrarMensajesDeSplit(splitId: string) {
  const posts = await getDocs(collection(db, "paddock_posts"));
  const matches = posts.docs.filter(post => post.data()?.splitId === splitId || post.data()?.splitName === splitId);
  const batch = writeBatch(db);
  matches.forEach(post => batch.delete(post.ref));
  await batch.commit();
  return matches.length;
}
