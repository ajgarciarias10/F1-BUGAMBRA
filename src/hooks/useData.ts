import { useEffect, useState } from "react";
import { collection, onSnapshot, query, orderBy, getDocs, collectionGroup } from "firebase/firestore";
import { db } from "../services/firebase";
import { useAuth } from "../contexts/AuthContext";

export function useUsuarios() {
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const { user } = useAuth();

  useEffect(() => {
    const q = query(collection(db, "usuarios"));
    return onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() }));
      setUsuarios(data);
    }, (error) => {
      console.warn("Gracefully handled usuarios snapshot error (expected on logout):", error);
    });
  }, []);

  return { usuarios };
}

export function useSplits() {
  const [splits, setSplits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [trigger, setTrigger] = useState(0);
  const { user } = useAuth();

  useEffect(() => {
    const unsubSplits = onSnapshot(collection(db, "splits"), () => {
      setTrigger(prev => prev + 1);
    }, (error) => {
      console.warn("Gracefully handled splits snapshot error:", error);
    });
    const unsubEquipos = onSnapshot(collectionGroup(db, "equipos"), () => {
      setTrigger(prev => prev + 1);
    }, (error) => {
      console.warn("Gracefully handled equipos snapshot error:", error);
    });
    const unsubPilotos = onSnapshot(collectionGroup(db, "pilotos"), () => {
      setTrigger(prev => prev + 1);
    }, (error) => {
      console.warn("Gracefully handled pilotos snapshot error:", error);
    });
    const unsubCircuitos = onSnapshot(collectionGroup(db, "circuitos"), () => {
      setTrigger(prev => prev + 1);
    }, (error) => {
      console.warn("Gracefully handled circuitos snapshot error:", error);
    });

    return () => {
      unsubSplits();
      unsubEquipos();
      unsubPilotos();
      unsubCircuitos();
    };
  }, []);

  useEffect(() => {
    let active = true;
    async function fetchData() {
      try {
        const q = query(collection(db, "splits"), orderBy("nombre", "asc"));
        const snapshot = await getDocs(q);
        const splitsData = [];

        for (const splitDoc of snapshot.docs) {
          // Fetch Circuits
          const circuitsSnap = await getDocs(collection(db, `splits/${splitDoc.id}/circuitos`));
          const circuitos = circuitsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

          // Fetch Teams (Equipos)
          const teamsSnap = await getDocs(collection(db, `splits/${splitDoc.id}/equipos`));
          const equipos = [];

          for (const teamDoc of teamsSnap.docs) {
            // Fetch Pilots for this team
            const pilotsSnap = await getDocs(collection(db, `splits/${splitDoc.id}/equipos/${teamDoc.id}/pilotos`));
            const pilotos = pilotsSnap.docs
              .map(d => ({ id: d.id, ...d.data() }))
              .filter((p: any) => p.nombre && p.nombre.trim() !== "");

            equipos.push({
              id: teamDoc.id,
              ...teamDoc.data(),
              pilotos
            });
          }

          splitsData.push({
            id: splitDoc.id,
            ...splitDoc.data(),
            circuitos,
            equipos
          });
        }

        if (active) {
          setSplits(splitsData);
          setLoading(false);
        }
      } catch (err) {
        console.error("Error fetching splits data:", err);
        if (active) {
          setLoading(false);
        }
      }
    }

    fetchData();
    return () => {
      active = false;
    };
  }, [trigger]);

  return { splits, loading };
}

