import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../services/firebase";
import { runAuditedAdminMutation } from "../services/adminMutationService";
import { DEFAULT_ECONOMY_RULES, economyRules } from "../utils/economyRules";

const labels: Record<string, string> = {
  puntos_por_posicion: "Puntos por posición (1.º en adelante)", puntos_pole: "Puntos deportivos por pole",
  mantener_factor_positivo: "Mantener: multiplicador de precio positivo",
  mantener_divisor_negativo: "Mantener: divisor de precio negativo",
  clausula_factor_positivo: "Cláusula: multiplicador de precio positivo",
  clausula_divisor_negativo: "Cláusula: divisor de precio negativo",
  pole: "Pole", vuelta_rapida: "Vuelta rápida", sin_sancionados: "Equipo sin sanciones",
  participacion: "Participación del equipo", puntos_factor: "Millones por punto", solo: "Piloto sin rival",
  rivalidad_clasificacion: "Rivalidad clasificación (por posición)", rivalidad_carrera: "Rivalidad carrera (por posición)",
  rivalidad_duo_clasificacion: "Dúo clasificación (por posición)", rivalidad_duo_carrera: "Dúo carrera (por posición)",
  premio_constructores: "Premio de constructores (por puesto final)",
  rivalidad_etapa: "Premio de rivalidad por etapa (por puesto)",
  rivalidad_duo_etapa: "Premio de rivalidad de dúo por etapa (por puesto)",
  tope_presupuesto_subasta: "Tope de presupuesto al cerrar la subasta",
};
export function EconomyRulesPanel({ splitId }: { splitId: string }) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [seller, setSeller] = useState(false);
  const [message, setMessage] = useState("");
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let active = true;
    setReady(false);
    getDoc(doc(db, "splits", splitId)).then(snap => {
      if (!active) return;
      const rules = economyRules(snap.data()?.economia_config);
      setValues(Object.fromEntries(Object.entries(rules).filter(([, v]) => typeof v !== "boolean").map(([k, v]) => [k, Array.isArray(v) ? v.join("; ") : String(v)])));
      setSeller(rules.clausula_al_vendedor);
      setReady(true);
    }).catch(error => { if (active) setMessage(error.message); });
    return () => { active = false; };
  }, [splitId]);
  return <details className="border border-white/10 p-4 my-4">
    <summary className="cursor-pointer font-bold">Reglas económicas del split</summary>
    <p className="text-xs text-white/60 my-3">Las reglas de precios y puntos se aplican a las próximas operaciones o recálculos. Los datos de precio ya guardados en el historial se conservan. Para corregir una carrera ya liquidada, revierte su economía y vuelve a procesarla. Separa las listas por posición con punto y coma.</p>
    <div className="grid sm:grid-cols-2 gap-3">{Object.entries(values).map(([key, value]) => <label key={key} className="text-xs">{labels[key] || key}
      <input className="block bg-black border border-white/20 p-2 w-full" value={value} onChange={e => setValues(v => ({ ...v, [key]: e.target.value }))} />
    </label>)}</div>
    <label className="block text-xs my-3"><input type="checkbox" checked={seller} onChange={e => setSeller(e.target.checked)} /> La escudería vendedora cobra la cláusula</label>
    <button disabled={!ready} className="border border-white/20 px-3 py-2 text-xs" onClick={async () => {
      setReady(false);
      try {
        const parsed = Object.fromEntries(Object.entries(values).map(([k, v]) => {
          const parse = (s: string) => s.trim() ? Number(s.trim().replace(",", ".")) : NaN;
          return [k, Array.isArray(DEFAULT_ECONOMY_RULES[k as keyof typeof DEFAULT_ECONOMY_RULES]) ? v.split(";").map(parse) : parse(v)];
        }));
        const rules = economyRules({ ...parsed, clausula_al_vendedor: seller });
        await runAuditedAdminMutation({ ref: doc(db, "splits", splitId), action: "economy.rules.update", summary: `Reglas económicas actualizadas en ${splitId}.`, apply: current => {
          if (!current) throw new Error("El split ya no existe.");
          return { ...current, economia_config: rules };
        } });
        setMessage("Reglas guardadas.");
      } catch (error: any) { setMessage(`Error: ${error.message}`); }
      finally { setReady(true); }
    }}>Guardar reglas</button>
    <p role="status" className={`text-xs mt-2 ${message.startsWith("Error") || message.includes("no existe") ? "text-red-300" : "text-emerald-300"}`}>{message}</p>
  </details>;
}
