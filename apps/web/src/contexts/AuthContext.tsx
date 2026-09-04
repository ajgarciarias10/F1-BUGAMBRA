import React, { createContext, useContext, useEffect, useState } from "react";
import type { User } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../services/firebase";

export type Role = "admin" | "usuario" | "jeque" | "piloto" | "invitado" | null;

interface UserData {
  uid: string;
  nombre: string;
  rol: Role;
  escuderia_id?: string;
  [key: string]: any;
}

interface AuthContextValue {
  user: User | null;
  userData: UserData | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextValue>({ user: null, userData: null, loading: true });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribeSnapshot: (() => void) | null = null;
    let unsubscribeAuth: (() => void) | null = null;
    let desmontado = false;

    const alRecibirSesion = (firebaseUser: User | null) => {
      setUser(firebaseUser);

      if (unsubscribeSnapshot) {
        unsubscribeSnapshot();
        unsubscribeSnapshot = null;
      }

      if (!firebaseUser) {
        setUserData(null);
        setLoading(false);
        return;
      }

      const docRef = doc(db, "usuarios", firebaseUser.uid);
      unsubscribeSnapshot = onSnapshot(docRef, (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data() as UserData;
          const email = (firebaseUser.email || (data as any).email || "").toLowerCase();
          setUserData({
            ...data,
            uid: firebaseUser.uid,
            email,
            // AJ must be able to run the idempotent data migration even if
            // the legacy Firestore profile still says "piloto".
            rol: email === "ajgarciarias@gmail.com" ? "admin" : data.rol,
          });
        } else {
          setUserData(null);
        }
        setLoading(false);
      }, (error) => {
        console.error("Error listening to user data", error);
        setLoading(false);
      });
    };

    // El SDK de autenticación se carga fuera del arranque: son unos 270 kB que
    // la portada pública no necesita para pintar la clasificación. Mientras
    // llega, `loading` sigue en true y las rutas protegidas muestran su espera,
    // igual que hacían antes mientras Firebase resolvía la sesión.
    const escuchar = async () => {
      try {
        const [{ onAuthStateChanged }, { auth }] = await Promise.all([
          import("firebase/auth"),
          import("../services/auth"),
        ]);
        if (desmontado) return;
        unsubscribeAuth = onAuthStateChanged(auth, alRecibirSesion);
      } catch (error) {
        // Si el trozo no llega (red caída a media carga), la app se queda como
        // sesión cerrada en vez de bloqueada en la pantalla de "Cargando".
        console.error("No se pudo cargar la autenticación", error);
        if (!desmontado) setLoading(false);
      }
    };

    void escuchar();

    return () => {
      desmontado = true;
      if (unsubscribeAuth) unsubscribeAuth();
      if (unsubscribeSnapshot) unsubscribeSnapshot();
    };
  }, []);

  return <AuthContext.Provider value={{ user, userData, loading }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
