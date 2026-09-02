import { useState } from "react";
import { Check, Pencil, Plus, Trash2, X } from "lucide-react";
import { deleteDoc, doc, setDoc } from "firebase/firestore";
import { db } from "../services/firebase";

export function AdminTeamManager({ splitId, teams, roster, splits, onSelectSplit }: { splitId: string; teams: any[]; roster: any[]; splits: any[]; onSelectSplit: (id: string) => void }) {
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [message, setMessage] = useState("");

  const normalizeTeamName = (name: string) => name.replace(/\s+\d+\s*$/, "").replace(/\s+/g, " ").trim();
  const teamId = (name: string) => normalizeTeamName(name).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");

  const createTeam = async () => {
    const name = normalizeTeamName(newName);
    if (!name) return;
    const id = teamId(name);
    if (teams.some(team => team.id === id)) { setMessage("Ya existe un equipo con ese nombre."); return; }
    await setDoc(doc(db, `splits/${splitId}/equipos`, id), { nombre: name, presupuesto: 100, puntos_constructores: 0 });
    setNewName("");
    setMessage(`Equipo ${name} creado.`);
  };

  const saveName = async (id: string) => {
    const name = editingName.trim();
    if (!name) return;
    await setDoc(doc(db, `splits/${splitId}/equipos`, id), { nombre: name }, { merge: true });
    setEditingId(null);
    setMessage("Nombre de equipo actualizado.");
  };

  const removeTeam = async (team: any) => {
    if (roster.some(pilot => pilot.equipoId === team.id)) { setMessage("No puedes borrar un equipo que todavía tiene pilotos."); return; }
    if (!window.confirm(`¿Borrar ${team.nombre} del split?`)) return;
    await deleteDoc(doc(db, `splits/${splitId}/equipos`, team.id));
    setMessage(`Equipo ${team.nombre} eliminado.`);
  };

  return <section className="mb-5 border border-white/10 bg-white/[0.03] p-4">
    <div className="flex gap-2 overflow-x-auto mb-5 border-b border-white/10 pb-3">{splits.filter(split => split.id !== "global").map(split => <button key={split.id} onClick={() => onSelectSplit(split.id)} className={`shrink-0 px-3 py-2 text-[10px] font-black uppercase tracking-wider ${split.id === splitId ? "bg-[#e10600] text-white" : "border border-white/10 text-white/45 hover:text-white"}`}>{split.nombre}</button>)}</div>
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
      <div><h2 className="text-sm font-black uppercase tracking-tight">Administración de equipos</h2><p className="text-[10px] text-white/40 mt-1">Crea, modifica y elimina escuderías de este split.</p></div>
      <div className="flex gap-2"><input value={newName} onChange={event => setNewName(event.target.value)} onKeyDown={event => event.key === "Enter" && createTeam()} placeholder="Nombre del equipo" className="w-48 bg-black/30 border border-white/10 px-3 py-2 text-xs text-white" /><button onClick={createTeam} className="inline-flex items-center gap-1.5 bg-[#e10600] px-3 py-2 text-[10px] font-black uppercase"><Plus className="w-3.5 h-3.5" /> Crear</button></div>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">{teams.map(team => <div key={team.id} className="flex items-center gap-2 border border-white/5 bg-black/20 p-3">
      <div className="flex-1 min-w-0">{editingId === team.id ? <input autoFocus value={editingName} onChange={event => setEditingName(event.target.value)} className="w-full bg-black/40 border border-[#e10600] px-2 py-1 text-xs text-white" /> : <strong className="block truncate text-xs text-white/85">{team.nombre}</strong>}<span className="text-[10px] text-white/35">{roster.filter(pilot => pilot.equipoId === team.id).length} pilotos · {team.presupuesto ?? 0}M</span></div>
      {editingId === team.id ? <><button onClick={() => saveName(team.id)} title="Guardar" className="text-emerald-300"><Check className="w-4 h-4" /></button><button onClick={() => setEditingId(null)} title="Cancelar" className="text-white/35"><X className="w-4 h-4" /></button></> : <><button onClick={() => { setEditingId(team.id); setEditingName(team.nombre); }} title="Editar" className="text-white/35 hover:text-white"><Pencil className="w-4 h-4" /></button><button onClick={() => removeTeam(team)} title="Eliminar" className="text-red-300/60 hover:text-red-300"><Trash2 className="w-4 h-4" /></button></>}
    </div>)}</div>
    {message && <p className="mt-3 text-[10px] text-emerald-300">{message}</p>}
    {!teams.length && <p className="text-xs text-white/30">No hay equipos creados en este split.</p>}
  </section>;
}
