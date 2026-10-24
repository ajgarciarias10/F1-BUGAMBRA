import type { User } from "firebase/auth";
import { collection, doc, getDoc, getDocs, runTransaction, updateDoc } from "firebase/firestore";
import { db } from "./firebase";

/** Mantiene el alta y la reivindicación de correo tal como funciona el acceso actual. */
export async function provisionProfile(firebaseUser: User, normalizedEmail: string) {
  const authEmail = firebaseUser.email || normalizedEmail;
  const profileRef = doc(db, "usuarios", firebaseUser.uid);
  const claimRef = doc(db, "auth_emails", authEmail);
  await runTransaction(db, async transaction => {
    const [profileSnap, claimSnap] = await Promise.all([transaction.get(profileRef), transaction.get(claimRef)]);
    if (claimSnap.exists() && claimSnap.data().uid !== firebaseUser.uid) throw new Error("Ya existe una cuenta registrada con este correo.");
    if (!profileSnap.exists()) transaction.set(profileRef, {
      uid: firebaseUser.uid, email: authEmail, auth_email: authEmail,
      rol: normalizedEmail === "ajgarciarias@gmail.com" ? "admin" : "usuario",
      nombre: firebaseUser.displayName?.trim() || normalizedEmail.split("@")[0] || "Usuario",
      foto_url: firebaseUser.photoURL || "", escuderia_id: "", piloto_id: "",
    });
    transaction.set(claimRef, { uid: firebaseUser.uid, email: authEmail, auth_email: authEmail });
  });
}

export async function perfilGoogleExistente(uid: string, normalizedEmail: string): Promise<boolean> {
  const ownProfile = await getDoc(doc(db, "usuarios", uid));
  if (ownProfile.exists()) return false;
  const existingProfiles = await getDocs(collection(db, "usuarios"));
  return existingProfiles.docs.some(profile => String(profile.data().email || "").trim().toLowerCase() === normalizedEmail && profile.id !== uid);
}

export async function guardarPerfil(uid: string, nombre: string, fotoUrl: string) {
  await updateDoc(doc(db, "usuarios", uid), { nombre, foto_url: fotoUrl });
}

export async function guardarLogoEquipo(splitId: string, equipoId: string, logoUrl: string) {
  await updateDoc(doc(db, `splits/${splitId}/equipos`, equipoId), { logo_url: logoUrl || null });
}
