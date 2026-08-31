import React, { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { auth, db } from "../services/firebase";

export type Role = "admin" | "jeque" | "piloto" | null;

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

    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      
      if (unsubscribeSnapshot) {
        unsubscribeSnapshot();
        unsubscribeSnapshot = null;
      }

      if (firebaseUser) {
        const docRef = doc(db, "usuarios", firebaseUser.uid);
        unsubscribeSnapshot = onSnapshot(docRef, (docSnap) => {
          if (docSnap.exists()) {
            setUserData(docSnap.data() as UserData);
          } else {
            setUserData(null);
          }
          setLoading(false);
        }, (error) => {
          console.error("Error listening to user data", error);
          setLoading(false);
        });
      } else {
        setUserData(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeSnapshot) unsubscribeSnapshot();
    };
  }, []);

  return <AuthContext.Provider value={{ user, userData, loading }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
