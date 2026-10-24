import { useEffect, useState } from "react";
import { Plus, Save, Trash2, Users } from "lucide-react";
import { guardarRivalidades, type Rivalidad } from "../services/rivalidadesService";

import { useSingleFlight } from "../hooks/useSingleFlight";
type Rivalry = Rivalidad;

export function AdminRivalriesPanel({ splits }: { splits: any[] }) {
  const { run: runOnce, pending: pendingOnce } = useSingleFlight();
  const [splitId, setSplitId] = useState(splits.find(split => split.id !== "origins")?.id || splits[0]?.id || "");
  const [selectedPilots, setSelectedPilots] = useState<string[]>([]);
  const [groups, setGroups] = useState<Rivalry[]>([]);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const split = splits.find(item => item.id === splitId);

  useEffect(() => {
    setGroups(Array.isArray(split?.rivalidades_manual) ? split.rivalidades_manual : []);
    setSelectedPilots([]);
  }, [splitId, split?.rivalidades_manual]);

  const saveGroups = async (nextGroups: Rivalry[]) => {
    return runOnce(async () => {
    setSaving(true);
    try {
      await guardarRivalidades(splitId, nextGroups, { equipos: split?.equipos || [], roster: split?.roster || [] });
      setGroups(nextGroups); setMessage("Rivalidades guardadas.");
    } catch (error: any) { setMessage(`No se guardaron las rivalidades: ${error.message}`); }
    finally { setSaving(false); }
  });
};

  const addGroup = async () => {
    if (selectedPilots.length < 2) {
      setMessage("Selecciona al menos dos pilotos.");
      return;
    }
    await saveGroups([...groups, { id: `rivalidad_${Date.now()}`, pilotoIds: selectedPilots }]);
    setSelectedPilots([]);
  };

  const pilotName = (pilotId: string) => split?.roster?.find((pilot: any) => pilot.pilotoId === pilotId)?.nombre || pilotId;

  return <section className="space-y-5">
    <div className="border border-line bg-surface-2 p-5">
      <div className="flex items-start gap-3"><div className="p-2 bg-violet-soft text-violet"><Users className="w-5 h-5" /></div><div><h2 className="font-bold uppercase tracking-tight text-lg">Administración de rivalidades</h2><p className="text-xs text-ink-muted mt-1">Las rivalidades se introducen manualmente para cada split. Puedes crear grupos 1 vs 1, 2 vs 2, 3 vs 3 o cualquier otra combinación.</p></div></div>
      <select value={splitId} onChange={event => setSplitId(event.target.value)} className="mt-5 bg-surface-2 border border-line px-3 py-2 text-xs text-ink"><option value="">Seleccionar split</option>{splits.filter(item => item.id !== "global").map(item => <option key={item.id} value={item.id}>{item.nombre}</option>)}</select>
      {message && <p className={`mt-3 text-xs ${message.startsWith("Selecciona") || message.startsWith("No se") ? "text-warn" : "text-ok"}`}>{message}</p>}
    </div>
    {split && <>
      <div className="border border-line bg-surface-2 p-4"><h3 className="text-xs font-bold uppercase tracking-wider mb-3">Nuevo grupo manual</h3><div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end"><div className="flex-1"><p className="text-[9px] uppercase tracking-wider text-ink-muted mb-2">Pilotos del grupo</p><div className="flex flex-wrap gap-2">{(split.roster || []).map((pilot: any) => <label key={pilot.pilotoId} className={`border px-2 py-1.5 text-[10px] cursor-pointer ${selectedPilots.includes(pilot.pilotoId) ? "border-violet/40 bg-violet-soft text-violet" : "border-line text-ink-2"}`}><input type="checkbox" className="sr-only" checked={selectedPilots.includes(pilot.pilotoId)} onChange={event => setSelectedPilots(current => event.target.checked ? [...current, pilot.pilotoId] : current.filter(id => id !== pilot.pilotoId))} />{pilot.nombre}</label>)}</div></div><button disabled={saving} onClick={addGroup} className="inline-flex items-center justify-center gap-1.5 bg-violet px-3 py-2 text-[10px] font-bold uppercase disabled:opacity-40"><Plus className="w-3.5 h-3.5" /> Añadir</button></div><p className="mt-3 text-[10px] text-ink-muted">El premio económico se calculará automáticamente en cada carrera según las posiciones y el reglamento.</p></div>
      <div className="border border-line bg-surface-2 p-4"><h3 className="text-xs font-bold uppercase tracking-wider mb-3">Rivalidades de {split.nombre}</h3>{groups.map(group => <div key={group.id} className="flex items-center justify-between gap-3 border-b border-line py-3 last:border-0"><div className="text-xs text-ink-2">{group.pilotoIds.map(pilotId => pilotName(pilotId)).join(" vs ")}</div><button aria-busy={pendingOnce || undefined} disabled={pendingOnce} onClick={() => saveGroups(groups.filter(item => item.id !== group.id))} className="text-danger hover:text-danger" title="Eliminar"><Trash2 className="w-3.5 h-3.5" /></button></div>)}{!groups.length && <p className="text-xs text-ink-muted">No hay rivalidades manuales para este split.</p>}<div className="mt-4 flex items-center gap-2 text-[10px] text-ink-muted"><Save className="w-3.5 h-3.5" /> Se guardan exclusivamente en este split.</div></div>
    </>}
  </section>;
}
