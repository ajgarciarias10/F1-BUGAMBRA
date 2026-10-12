import { useState } from "react";
import { Check, Pencil, Plus, Trash2, X } from "lucide-react";
import { doc } from "firebase/firestore";
import { db } from "../services/firebase";
import { runAuditedAdminMutation } from "../services/adminMutationService";
import { useConfirm } from "./Feedback";

import { useSingleFlight } from "../hooks/useSingleFlight";
export function AdminTeamManager({ splitId, teams, roster, splits, onSelectSplit }: { splitId: string; teams: any[]; roster: any[]; splits: any[]; onSelectSplit: (id: string) => void }) {
  const { run: runOnce, pending: pendingOnce } = useSingleFlight();
  const [newName, setNewName] = useState("");
  const [newBudget, setNewBudget] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const { confirm, confirmDialog } = useConfirm();

  const normalizeTeamName = (name: string) => name.replace(/\s+\d+\s*$/, "").replace(/\s+/g, " ").trim();
  const teamId = (name: string) => normalizeTeamName(name).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");

  const createTeam = async () => {
    return runOnce(async () => {
    const name = normalizeTeamName(newName);
    if (!name) return;
    const budget = Number(newBudget.replace(",", "."));
    if (!newBudget.trim() || !Number.isFinite(budget) || budget < 0) { setMessage("Indica un presupuesto inicial válido (cero o más). "); return; }
    const id = teamId(name);
    if (teams.some(team => team.id === id)) { setMessage("Ya existe un equipo con ese nombre."); return; }
    setSaving(true);
    try {
      await runAuditedAdminMutation({ ref: doc(db, `splits/${splitId}/equipos`, id), action: "team.create", summary: `Equipo ${name} creado en ${splitId}.`, apply: current => {
        if (current) throw new Error("El identificador ya existe. Recarga los equipos antes de continuar.");
        return { nombre: name, presupuesto: budget, presupuesto_inicial: budget, puntos_constructores: 0 };
      } });
      setNewName(""); setNewBudget(""); setMessage(`Equipo ${name} creado con presupuesto inicial de ${budget}M.`);
    } catch (error: any) { setMessage(`No se guardó el equipo: ${error.message}`); }
    finally { setSaving(false); }
  });
};

  const saveName = async (id: string) => {
    return runOnce(async () => {
    const name = editingName.trim();
    if (!name) return;
    setSaving(true);
    try {
      await runAuditedAdminMutation({ ref: doc(db, `splits/${splitId}/equipos`, id), action: "team.rename", summary: `Nombre de equipo actualizado en ${splitId}.`, apply: current => {
        if (!current) throw new Error("El equipo ya no existe. Recarga antes de editarlo.");
        return { ...current, nombre: name };
      } });
      setEditingId(null); setMessage("Nombre de equipo actualizado.");
    } catch (error: any) { setMessage(`No se guardó el nombre: ${error.message}`); }
    finally { setSaving(false); }
  });
};

  const removeTeam = async (team: any) => {
    return runOnce(async () => {
    if (roster.some(pilot => pilot.equipoId === team.id)) { setMessage("No puedes borrar un equipo que todavía tiene pilotos."); return; }
    const ok = await confirm({
      title: `Borrar ${team.nombre}`,
      body: "La escudería desaparece de este split. Su presupuesto y su logo se pierden.",
      confirmLabel: "Borrar equipo",
      tone: "peligro",
    });
    if (!ok) return;
    setSaving(true);
    try {
      await runAuditedAdminMutation({ ref: doc(db, `splits/${splitId}/equipos`, team.id), action: "team.delete", summary: `Equipo ${team.nombre} eliminado en ${splitId}.`, apply: current => {
        if (!current) throw new Error("El equipo ya no existe.");
        return null;
      } });
      setMessage(`Equipo ${team.nombre} eliminado.`);
    } catch (error: any) { setMessage(`No se eliminó el equipo: ${error.message}`); }
    finally { setSaving(false); }
  });
};

  return <section className="mb-5 border border-line bg-surface-2 p-4">
    <div className="flex gap-2 overflow-x-auto mb-5 border-b border-line pb-3">{splits.filter(split => split.id !== "global").map(split => <button key={split.id} onClick={() => onSelectSplit(split.id)} className={`shrink-0 px-3 py-2 text-[10px] font-bold uppercase tracking-wider ${split.id === splitId ? "bg-brand text-brand-ink" : "border border-line text-ink-muted hover:text-ink"}`}>{split.nombre}</button>)}</div>
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
      <div><h2 className="text-sm font-bold uppercase tracking-tight">Administración de equipos</h2><p className="text-[10px] text-ink-muted mt-1">Crea, modifica y elimina escuderías de este split.</p></div>
      <div className="flex gap-2"><input disabled={saving} value={newName} onChange={event => setNewName(event.target.value)} onKeyDown={event => event.key === "Enter" && createTeam()} placeholder="Nombre del equipo" className="w-48 bg-surface-2 border border-line px-3 py-2 text-xs text-ink" /><input disabled={saving} type="number" step="0.1" value={newBudget} onChange={event => setNewBudget(event.target.value)} onKeyDown={event => event.key === "Enter" && createTeam()} placeholder="Presupuesto (M)" aria-label="Presupuesto inicial del equipo" className="w-32 bg-surface-2 border border-line px-3 py-2 text-xs text-ink" /><button aria-busy={pendingOnce || undefined} disabled={(saving) || pendingOnce} onClick={createTeam} className="inline-flex items-center gap-1.5 bg-brand px-3 py-2 text-[10px] font-bold uppercase disabled:opacity-40"><Plus className="w-3.5 h-3.5" />{saving ? "Guardando" : " Crear"}</button></div>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">{teams.map(team => <div key={team.id} className="flex items-center gap-2 border border-line bg-surface-2 p-3">
      <div className="flex-1 min-w-0">{editingId === team.id ? <input autoFocus value={editingName} onChange={event => setEditingName(event.target.value)} className="w-full bg-surface-2 border border-brand px-2 py-1 text-xs text-ink" /> : <strong className="block truncate text-xs text-ink">{team.nombre}</strong>}<span className="text-[10px] text-ink-muted">{roster.filter(pilot => pilot.equipoId === team.id).length} pilotos · {team.presupuesto ?? "—"}M</span></div>
      {editingId === team.id ? <><button aria-busy={pendingOnce || undefined} disabled={(saving) || pendingOnce} onClick={() => saveName(team.id)} title="Guardar" className="text-ok disabled:opacity-40"><Check className="w-4 h-4" /></button><button disabled={saving} onClick={() => setEditingId(null)} title="Cancelar" className="text-ink-muted"><X className="w-4 h-4" /></button></> : <><button disabled={saving} onClick={() => { setEditingId(team.id); setEditingName(team.nombre); }} title="Editar" className="text-ink-muted hover:text-ink"><Pencil className="w-4 h-4" /></button><button aria-busy={pendingOnce || undefined} disabled={(saving) || pendingOnce} onClick={() => removeTeam(team)} title="Eliminar" className="text-danger hover:text-danger"><Trash2 className="w-4 h-4" /></button></>}
    </div>)}</div>
    {message && <p role="status" className={`mt-3 text-[10px] ${message.startsWith("No se") ? "text-danger" : "text-ok"}`}>{message}</p>}
    {!teams.length && <p className="text-xs text-ink-muted">No hay equipos creados en este split.</p>}
    {confirmDialog}
  </section>;
}
