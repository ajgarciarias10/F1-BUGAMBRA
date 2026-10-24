import { collection, doc, getDocs, setDoc } from "firebase/firestore";
import { db } from "./firebase";

/** Rol, piloto y escudería de una cuenta, como los asigna el admin. */
export async function asignarUsuario(uid: string, p: { rol: string; pilotoId: string; equipoId: string; nombrePiloto?: string }) {
  if ((p.rol === "jeque" || p.rol === "director_deportivo") && !p.equipoId) {
    throw new Error("Asigna una escudería al responsable para que aparezca junto al equipo.");
  }
  await setDoc(doc(db, "usuarios", uid), {
    piloto_id: p.pilotoId || null,
    escuderia_id: p.equipoId || null,
    rol: p.rol,
    ...(p.nombrePiloto ? { nombre_piloto: p.nombrePiloto } : {}),
  }, { merge: true });
}

/** Todas las cuentas (solo el admin puede leerlas enteras). */
export async function listarUsuarios() {
  const snap = await getDocs(collection(db, "usuarios"));
  return snap.docs.map(user => ({ uid: user.id, ...user.data() } as Record<string, any> & { uid: string }));
}
