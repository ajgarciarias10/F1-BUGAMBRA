import { addDoc, arrayRemove, arrayUnion, collection, deleteDoc, doc, onSnapshot, updateDoc } from "firebase/firestore";
import { db } from "./firebase";

export interface Sugerencia {
  id: string;
  titulo: string;
  descripcion: string;
  categoria: string;
  usuario_nombre: string;
  usuario_uid: string;
  usuario_email: string;
  usuario_rol: string;
  fecha: string;
  estado: "pendiente" | "revisando" | "aprobado" | "descartado" | "completado";
  respuesta_admin?: string;
  votos?: string[];
}

export const CATEGORIAS_SUGERENCIA = [
  { id: "interfaz", label: "🎨 Interfaz y Diseño" },
  { id: "mercado", label: "💰 Mercado y Fichajes" },
  { id: "reglas", label: "📜 Normativa y Reglas" },
  { id: "bugs", label: "👾 Reporte de Bugs" },
  { id: "otros", label: "✨ General / Otros" },
] as const;

export function escucharSugerencias(onData: (items: Sugerencia[]) => void, onError: (error: Error) => void) {
  return onSnapshot(collection(db, "mejoras"), snapshot => {
    onData(snapshot.docs.map(item => ({ id: item.id, ...item.data() }) as Sugerencia));
  }, onError);
}

export async function crearSugerencia(input: Omit<Sugerencia, "id" | "estado" | "fecha" | "votos" | "respuesta_admin">) {
  await addDoc(collection(db, "mejoras"), { ...input, fecha: new Date().toISOString(), estado: "pendiente", votos: [] });
}

export async function votarSugerencia(id: string, uid: string, yaVoto: boolean) {
  await updateDoc(doc(db, "mejoras", id), { votos: yaVoto ? arrayRemove(uid) : arrayUnion(uid) });
}

export async function cambiarEstadoSugerencia(id: string, estado: Sugerencia["estado"]) {
  await updateDoc(doc(db, "mejoras", id), { estado });
}

export async function responderSugerencia(id: string, respuesta: string) {
  await updateDoc(doc(db, "mejoras", id), { respuesta_admin: respuesta.trim() || "" });
}

export async function eliminarSugerencia(id: string) {
  await deleteDoc(doc(db, "mejoras", id));
}
