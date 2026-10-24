import { useState } from "react";
import { Check, Loader2, UserRound } from "lucide-react";
import { usePilotos, useSplits, useUsuarios } from "../hooks/useData";
import { asignarUsuario } from "../services/usuariosService";

import { useSingleFlight } from "../hooks/useSingleFlight";
export function AdminUsersPanel() {
  const { run: runOnce, pending: pendingOnce } = useSingleFlight();
  const { usuarios } = useUsuarios();
  const { pilotos } = usePilotos();
  const { splits } = useSplits();
  const [savingUid, setSavingUid] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const activeSplit = splits.find(split => split.activo)
    || [...splits].sort((a, b) => (b.orden ?? 0) - (a.orden ?? 0))[0];
  const equipos = activeSplit?.equipos || [];
  const equipoPorPiloto = new Map(
    (activeSplit?.roster || [])
      .filter(pilot => pilot.equipoId && pilot.equipoId !== "agente_libre" && pilot.equipoId !== "individual")
      .map(pilot => [pilot.pilotoId, pilot.equipoId])
  );

  const updateUser = async (uid: string, pilotoId: string, rol: string, equipoId: string) => {
    return runOnce(async () => {
    setSavingUid(uid);
    setMessage("");
    try {
      const pilot = pilotos.find(item => item.id === pilotoId);
      await asignarUsuario(uid, { rol, pilotoId, equipoId, nombrePiloto: pilot?.nombre });
       setMessage(rol === "jeque" || rol === "director_deportivo" ? "Responsable y escudería asignados correctamente." : "Asociación guardada correctamente.");
    } catch (error: any) {
      setMessage(`Error: ${error.message}`);
    } finally {
      setSavingUid(null);
    }
  });
};

  return (
    <section className="space-y-5">
      <div className="border border-line bg-surface-2 p-5">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-info-soft text-info"><UserRound className="w-5 h-5" /></div>
          <div><h2 className="font-bold uppercase tracking-tight text-lg">Administración de usuarios</h2><p className="text-xs text-ink-muted mt-1">Gestiona la identidad, el piloto, el rol y la escudería con la que opera cada usuario.</p></div>
        </div>
        {message && <p className={`mt-4 text-xs ${message.startsWith("Error") ? "text-danger" : "text-ok"}`}>{message}</p>}
      </div>
      <div className="border border-line bg-surface-2 overflow-x-auto">
        <table className="w-full min-w-[900px] text-left text-xs"><thead className="border-b border-line bg-surface-2 text-[9px] uppercase tracking-wider text-ink-muted"><tr><th className="p-3">Usuario</th><th className="p-3">UID</th><th className="p-3">Piloto asociado</th><th className="p-3">Escudería</th><th className="p-3">Rol</th><th className="p-3" /></tr></thead><tbody>{usuarios.map(user => {
          const currentPilot = user.piloto_id || "";
          const currentRole = user.rol || "usuario";
          return <UserRow key={user.uid} user={user} pilotos={pilotos} equipos={equipos} equipoPorPiloto={equipoPorPiloto} currentPilot={currentPilot} currentRole={currentRole} saving={savingUid === user.uid || pendingOnce} onSave={updateUser} />;
        })}</tbody></table>
        {!usuarios.length && <p className="p-8 text-center text-xs text-ink-muted">No hay usuarios registrados en esta base.</p>}
      </div>
    </section>
  );
}

function UserRow({ user, pilotos, equipos, equipoPorPiloto, currentPilot, currentRole, saving, onSave }: any) {
  const [pilotId, setPilotId] = useState(currentPilot);
  const [teamId, setTeamId] = useState(user.escuderia_id || "");
  const [role, setRole] = useState(currentRole);
  const selectPilot = (nextPilotId: string) => {
    setPilotId(nextPilotId);
    const inferredTeamId = equipoPorPiloto.get(nextPilotId);
    if (inferredTeamId) setTeamId(inferredTeamId);
  };
  return <tr className="border-b border-line last:border-0 hover:bg-surface-2">
    <td className="p-3"><strong className="block text-ink">{user.nombre || "Sin nombre"}</strong><span className="text-ink-muted">{user.email || "Sin correo"}</span></td>
    <td className="p-3 font-mono text-[10px] text-ink-muted">{user.uid}</td>
    <td className="p-3"><select value={pilotId} onChange={event => selectPilot(event.target.value)} className="w-full max-w-xs bg-surface-2 border border-line px-2 py-2 text-xs text-ink"><option value="">Sin piloto</option>{pilotos.map((pilot: any) => <option key={pilot.id} value={pilot.id}>{pilot.nombre}</option>)}</select></td>
    <td className="p-3"><select value={teamId} onChange={event => setTeamId(event.target.value)} className="w-full max-w-xs bg-surface-2 border border-line px-2 py-2 text-xs text-ink"><option value="">Sin escudería</option>{equipos.map((team: any) => <option key={team.id} value={team.id}>{team.nombre}</option>)}</select></td>
       <td className="p-3"><select value={role} onChange={event => setRole(event.target.value)} className="bg-surface-2 border border-line px-2 py-2 text-xs text-ink"><option value="usuario">Usuario</option><option value="piloto">Piloto</option><option value="jeque">Jeque</option><option value="director_deportivo">Director deportivo</option><option value="admin">Admin</option></select></td>
    <td className="p-3 text-right"><button onClick={() => onSave(user.uid, pilotId, role, teamId)} disabled={saving} aria-busy={saving || undefined} className="inline-flex items-center gap-1.5 border border-ok/40 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-ok disabled:opacity-40">{saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />} Guardar</button></td>
  </tr>;
}
