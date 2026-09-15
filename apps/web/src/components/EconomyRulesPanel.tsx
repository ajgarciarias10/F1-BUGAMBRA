import { useEffect, useState } from "react";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../services/firebase";
import { DEFAULT_ECONOMY_RULES, economyRules } from "../utils/economyRules";

const labels: Record<string, string> = {
  pole: "Pole", vuelta_rapida: "Vuelta rápida", sin_sancionados: "Equipo sin sanciones",
  participacion: "Participación del equipo", puntos_factor: "Millones por punto", solo: "Piloto sin rival",
  rivalidad_clasificacion: "Rivalidad clasificación (por posición)", rivalidad_carrera: "Rivalidad carrera (por posición)",
  rivalidad_duo_clasificacion: "Dúo clasificación (por posición)", rivalidad_duo_carrera: "Dúo carrera (por posición)",
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
    <p className="text-xs text-white/60 my-3">Importes en millones. Se aplican a las próximas operaciones. Para corregir una carrera ya liquidada, revierte su economía y vuelve a procesarla. Separa los premios por posición con punto y coma.</p>
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
        await updateDoc(doc(db, "splits", splitId), { economia_config: rules });
        setMessage("Reglas guardadas.");
      } catch (error: any) { setMessage(error.message); }
      finally { setReady(true); }
    }}>Guardar reglas</button>
    <p role="status" className="text-xs mt-2">{message}</p>
  </details>;
}
