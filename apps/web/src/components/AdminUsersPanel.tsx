import { useState } from "react";
import { Check, Loader2, UserRound } from "lucide-react";
import { doc, setDoc } from "firebase/firestore";
import { usePilotos, useUsuarios } from "../hooks/useData";
import { db } from "../services/firebase";

export function AdminUsersPanel() {
  const { usuarios } = useUsuarios();
  const { pilotos } = usePilotos();
  const [savingUid, setSavingUid] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const updateUser = async (uid: string, pilotoId: string, rol: string) => {
    setSavingUid(uid);
    setMessage("");
    try {
      const pilot = pilotos.find(item => item.id === pilotoId);
      await setDoc(doc(db, "usuarios", uid), {
        piloto_id: pilotoId || null,
        rol,
        ...(pilot?.nombre ? { nombre_piloto: pilot.nombre } : {}),
      }, { merge: true });
      setMessage("Asociación guardada correctamente.");
    } catch (error: any) {
      setMessage(`Error: ${error.message}`);
    } finally {
      setSavingUid(null);
    }
  };

  return (
    <section className="space-y-5">
      <div className="border border-white/10 bg-white/[0.03] p-5">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-sky-500/10 text-sky-300"><UserRound className="w-5 h-5" /></div>
          <div><h2 className="font-black uppercase tracking-tight text-lg">Administración de usuarios</h2><p className="text-xs text-white/45 mt-1">Gestiona únicamente la identidad, el correo y la asociación con un piloto.</p></div>
        </div>
        {message && <p className={`mt-4 text-xs ${message.startsWith("Error") ? "text-red-300" : "text-emerald-300"}`}>{message}</p>}
      </div>
      <div className="border border-white/10 bg-white/[0.02] overflow-x-auto">
        <table className="w-full min-w-[700px] text-left text-xs"><thead className="border-b border-white/10 bg-white/[0.03] text-[9px] uppercase tracking-wider text-white/40"><tr><th className="p-3">Usuario</th><th className="p-3">UID</th><th className="p-3">Piloto asociado</th><th className="p-3">Rol</th><th className="p-3" /></tr></thead><tbody>{usuarios.map(user => {
          const currentPilot = user.piloto_id || "";
          const currentRole = user.rol || "usuario";
          return <UserRow key={user.uid} user={user} pilotos={pilotos} currentPilot={currentPilot} currentRole={currentRole} saving={savingUid === user.uid} onSave={updateUser} />;
        })}</tbody></table>
        {!usuarios.length && <p className="p-8 text-center text-xs text-white/35">No hay usuarios registrados en esta base.</p>}
      </div>
    </section>
  );
}

function UserRow({ user, pilotos, currentPilot, currentRole, saving, onSave }: any) {
  const [pilotId, setPilotId] = useState(currentPilot);
  const [role, setRole] = useState(currentRole);
  return <tr className="border-b border-white/5 last:border-0 hover:bg-white/[0.02]">
    <td className="p-3"><strong className="block text-white/85">{user.nombre || "Sin nombre"}</strong><span className="text-white/35">{user.email || "Sin correo"}</span></td>
    <td className="p-3 font-mono text-[10px] text-white/35">{user.uid}</td>
    <td className="p-3"><select value={pilotId} onChange={event => setPilotId(event.target.value)} className="w-full max-w-xs bg-black/30 border border-white/10 px-2 py-2 text-xs text-white"><option value="">Sin piloto</option>{pilotos.map((pilot: any) => <option key={pilot.id} value={pilot.id}>{pilot.nombre}</option>)}</select></td>
    <td className="p-3"><select value={role} onChange={event => setRole(event.target.value)} className="bg-black/30 border border-white/10 px-2 py-2 text-xs text-white"><option value="usuario">Usuario</option><option value="piloto">Piloto</option><option value="jeque">Jeque</option><option value="admin">Admin</option></select></td>
    <td className="p-3 text-right"><button onClick={() => onSave(user.uid, pilotId, role)} disabled={saving} className="inline-flex items-center gap-1.5 border border-emerald-500/30 px-3 py-2 text-[10px] font-black uppercase tracking-wider text-emerald-300 disabled:opacity-40">{saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />} Guardar</button></td>
  </tr>;
}
