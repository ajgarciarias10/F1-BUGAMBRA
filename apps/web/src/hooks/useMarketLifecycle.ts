import { useEffect, useState } from "react";
import { syncMarketLifecycle } from "../services/marketLifecycleService";

// Se ejecuta durante la sesión del admin, incluso fuera de Datos y mantenimiento.
// Relee Firestore: no decide con snapshots parciales de las distintas colecciones.
export function useMarketLifecycle(enabled: boolean, splits: Array<{ id: string; fichajes_abiertos?: boolean; tipo?: string; completado?: boolean }>) {
  const [error, setError] = useState("");
  const ids = splits.filter(split => split.id !== "global" && split.fichajes_abiertos && split.tipo !== "individual" && !split.completado).map(split => split.id).sort().join("|");
  useEffect(() => {
    if (!enabled || !ids) return;
    let cancelled = false;
    let running = false;
    const sync = async () => {
      if (running) return;
      running = true;
      try {
        for (const id of ids.split("|")) {
          if (cancelled) break;
          await syncMarketLifecycle(id);
        }
        if (!cancelled) setError("");
      } catch (error) {
        if (!cancelled) setError(`No se pudo actualizar la bienvenida o el cierre del mercado. Se reintentará automáticamente. ${error instanceof Error ? error.message : ""}`);
      } finally { running = false; }
    };
    void sync();
    const interval = window.setInterval(sync, 10000);
    return () => { cancelled = true; window.clearInterval(interval); };
  }, [enabled, ids]);
  return error;
}
