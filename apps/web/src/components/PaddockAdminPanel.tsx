import { useEffect, useState } from "react";
import { CheckCircle2, Image, Loader2, Trash2 } from "lucide-react";
import { StorageImageUpload } from "./StorageImageUpload";
import { aprobarBienvenidas, borrarMensajePaddock, borrarMensajesDeSplit, leerBienvenidas, leerMensajesPaddock, marcarEquipoCompleto, publicarBienvenida, type PaddockPostAdmin, type PaddockWelcomeTeam } from "../services/paddockAdminService";

export function PaddockAdminPanel({ splits }: { splits: any[] }) {
  const [splitId, setSplitId] = useState(splits.find(split => split.id === "split_3")?.id || splits.find(split => split.id !== "global")?.id || "");
  const [splitNombre, setSplitNombre] = useState("");
  const [equipos, setEquipos] = useState<PaddockWelcomeTeam[]>([]);
  const [completa, setCompleta] = useState(false);
  const [aprobado, setAprobado] = useState(false);
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [posts, setPosts] = useState<PaddockPostAdmin[]>([]);

  const load = async () => {
    if (!splitId) return;
    setBusy("cargando");
    try {
      const data = await leerBienvenidas(splitId);
      setSplitNombre(data.splitNombre); setEquipos(data.equipos); setCompleta(data.completa);
      setAprobado(splits.find(split => split.id === splitId)?.paddock_bienvenidas_aprobadas === true);
    } catch (error: any) { setMessage(error.message); } finally { setBusy(""); }
  };
  useEffect(() => { void load(); }, [splitId]);

  useEffect(() => {
    void leerMensajesPaddock().then(setPosts).catch(error => setMessage(error.message));
  }, []);

  const removePost = async (post: PaddockPostAdmin) => {
    if (!confirm(`¿Borrar el mensaje de ${post.author}? Esta acción no se puede deshacer.`)) return;
    setBusy(`borrando-${post.id}`);
    try {
      await borrarMensajePaddock(post.id);
      setPosts(current => current.filter(item => item.id !== post.id));
      setMessage("Mensaje borrado.");
    } catch (error: any) { setMessage(error.message); } finally { setBusy(""); }
  };

  const approve = async () => {
    if (!completa || !confirm("¿Dar el OK completo y permitir publicar las bienvenidas?")) return;
    setBusy("aprobando");
    try { await aprobarBienvenidas(splitId); setAprobado(true); setMessage("OK completo guardado. Ya puedes publicar las bienvenidas."); }
    catch (error: any) { setMessage(error.message); } finally { setBusy(""); }
  };

  const removeSplit3 = async () => {
    if (!confirm("¿Borrar todos los mensajes de bienvenida del Split 3? Esta acción no se puede deshacer.")) return;
    setBusy("borrando");
    try { const count = await borrarMensajesDeSplit("split_3"); setMessage(`${count} mensaje(s) del Split 3 borrado(s).`); await load(); }
    catch (error: any) { setMessage(error.message); } finally { setBusy(""); }
  };

  return <section className="space-y-5 border border-white/10 bg-white/[0.02] p-5">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><p className="text-[9px] font-mono uppercase tracking-[0.3em] text-emerald-300/70">Paddock · publicaciones oficiales</p><h2 className="mt-1 text-xl font-black text-white">Bienvenidas de equipos</h2></div>
      <select value={splitId} onChange={event => setSplitId(event.target.value)} className="border border-white/10 bg-black px-3 py-2 text-xs text-white">{splits.filter(split => split.id !== "global").map(split => <option key={split.id} value={split.id}>{split.nombre || split.id}</option>)}</select>
    </div>
    <p className="text-xs text-white/50">Las plantillas completas se revisan aquí. Nada se publica automáticamente. Primero da el OK completo y después publica cada comentario con su foto.</p>
    {message && <p className="border border-white/10 px-3 py-2 text-xs text-amber-300">{message}</p>}
    <div className="space-y-3 border border-white/10 p-4">
      <div>
        <h2 className="font-black text-white">Mensajes del paddock</h2>
        <p className="mt-1 text-xs text-white/50">Borra cualquier publicación individual con el botón.</p>
      </div>
      {posts.length === 0 ? <p className="text-xs text-white/40">No hay mensajes publicados.</p> : posts.map(post => <article key={post.id} className="flex items-start justify-between gap-3 border-t border-white/10 pt-3">
        <div className="min-w-0">
          <p className="text-xs font-black text-white">{post.author}</p>
          <p className="mt-1 whitespace-pre-wrap break-words text-xs text-white/60">{post.text || "(Publicación con imagen o vídeo)"}</p>
          <time className="mt-1 block text-[10px] font-mono text-white/30">{new Date(post.createdAt).toLocaleString("es-ES")}</time>
        </div>
        <button onClick={() => void removePost(post)} disabled={!!busy} className="inline-flex shrink-0 items-center gap-1 border border-red-400/30 px-2.5 py-2 text-[10px] font-black uppercase tracking-wider text-red-300 disabled:opacity-40"><Trash2 className="h-3.5 w-3.5" /> Borrar</button>
      </article>)}
    </div>
    <div className="flex flex-wrap gap-2">
      <button onClick={approve} disabled={!completa || aprobado || !!busy} className="inline-flex items-center gap-2 bg-emerald-500 px-3 py-2 text-[10px] font-black uppercase tracking-wider text-black disabled:opacity-40"><CheckCircle2 className="h-3.5 w-3.5" /> {aprobado ? "OK completo dado" : "Dar OK completo"}</button>
      <button onClick={removeSplit3} disabled={!!busy} className="inline-flex items-center gap-2 border border-red-400/30 px-3 py-2 text-[10px] font-black uppercase tracking-wider text-red-300 disabled:opacity-40"><Trash2 className="h-3.5 w-3.5" /> Borrar mensajes Split 3</button>
    </div>
    {!completa && <p className="text-xs text-amber-300">No se puede dar el OK: todavía falta completar algún equipo.</p>}
    {busy === "cargando" ? <Loader2 className="h-5 w-5 animate-spin text-white/40" /> : <div className="grid gap-3 md:grid-cols-2">{equipos.map(equipo => <article key={equipo.id} className="border border-white/10 p-4">
      <div className="flex items-start justify-between gap-3"><div><h3 className="font-black text-white">{equipo.nombre}</h3><p className={`text-[10px] font-mono ${equipo.completa ? "text-emerald-300" : "amber-300"}`}>{equipo.pilotos.length} pilotos · {equipo.completa ? "equipo confirmado" : "pendiente de confirmar"} · {equipo.publicada ? "publicada" : "pendiente"}</p></div><Image className="h-4 w-4 text-white/30" /></div>
      <p className="mt-2 text-xs text-white/40">{equipo.pilotos.map(pilot => pilot.nombre).join(" · ") || "Sin pilotos"}</p>
      <button onClick={async () => { setBusy(equipo.id); try { await marcarEquipoCompleto(splitId, equipo.id, !equipo.completa); await load(); } catch (error: any) { setMessage(error.message); } finally { setBusy(""); } }} disabled={!!busy} className="mt-3 border border-emerald-300/30 px-3 py-2 text-[10px] font-black uppercase tracking-wider text-emerald-300 disabled:opacity-40">{equipo.completa ? "Desmarcar equipo completo" : "Marcar equipo completo"}</button>
      <div className="mt-3"><StorageImageUpload currentUrl={equipo.fotoUrl} size="md" onUpload={url => setEquipos(current => current.map(item => item.id === equipo.id ? { ...item, fotoUrl: url } : item))} /></div>
      <button onClick={async () => { setBusy(equipo.id); try { await publicarBienvenida(splitId, splitNombre, equipo, equipo.fotoUrl || ""); setMessage(`Bienvenida de ${equipo.nombre} publicada.`); await load(); } catch (error: any) { setMessage(error.message); } finally { setBusy(""); } }} disabled={!aprobado || !equipo.completa || equipo.publicada || !!busy} className="mt-3 w-full bg-[#e10600] px-3 py-2 text-[10px] font-black uppercase tracking-wider text-white disabled:opacity-40">{busy === equipo.id ? "Publicando..." : equipo.publicada ? "Publicada" : "Publicar comentario"}</button>
    </article>)}</div>}
  </section>;
}
