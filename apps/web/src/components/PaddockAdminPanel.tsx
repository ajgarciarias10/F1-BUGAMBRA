import { useEffect, useState } from "react";
import { CheckCircle2, Image, Loader2, Trash2 } from "lucide-react";
import { StorageImageUpload } from "./StorageImageUpload";
import { aprobarBienvenidas, borrarMensajePaddock, borrarMensajesDeSplit, leerBienvenidas, leerMensajesPaddock, marcarEquipoCompleto, publicarBienvenida, type PaddockPostAdmin, type PaddockWelcomeTeam } from "../services/paddockAdminService";

import { useSingleFlight } from "../hooks/useSingleFlight";
export function PaddockAdminPanel({ splits }: { splits: any[] }) {
  const { run: runOnce, pending: pendingOnce } = useSingleFlight();
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
    return runOnce(async () => {
    if (!confirm(`¿Borrar el mensaje de ${post.author}? Esta acción no se puede deshacer.`)) return;
    setBusy(`borrando-${post.id}`);
    try {
      await borrarMensajePaddock(post.id);
      setPosts(current => current.filter(item => item.id !== post.id));
      setMessage("Mensaje borrado.");
    } catch (error: any) { setMessage(error.message); } finally { setBusy(""); }
  });
};

  const approve = async () => {
    return runOnce(async () => {
    if (!completa || !confirm("¿Dar el OK completo y permitir publicar las bienvenidas?")) return;
    setBusy("aprobando");
    try { await aprobarBienvenidas(splitId); setAprobado(true); setMessage("OK completo guardado. Ya puedes publicar las bienvenidas."); }
    catch (error: any) { setMessage(error.message); } finally { setBusy(""); }
  });
};

  const removeSplit3 = async () => {
    return runOnce(async () => {
    if (!confirm("¿Borrar todos los mensajes de bienvenida del Split 3? Esta acción no se puede deshacer.")) return;
    setBusy("borrando");
    try { const count = await borrarMensajesDeSplit("split_3"); setMessage(`${count} mensaje(s) del Split 3 borrado(s).`); await load(); }
    catch (error: any) { setMessage(error.message); } finally { setBusy(""); }
  });
};

  return <section className="space-y-5 border border-line bg-surface-2 p-5">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><p className="text-[9px] font-mono uppercase tracking-[0.3em] text-ok">Paddock · publicaciones oficiales</p><h2 className="mt-1 text-xl font-bold text-ink">Bienvenidas de equipos</h2></div>
      <select value={splitId} onChange={event => setSplitId(event.target.value)} className="border border-line bg-surface px-3 py-2 text-xs text-ink">{splits.filter(split => split.id !== "global").map(split => <option key={split.id} value={split.id}>{split.nombre || split.id}</option>)}</select>
    </div>
    <p className="text-xs text-ink-2">Las plantillas completas se revisan aquí. Nada se publica automáticamente. Primero da el OK completo y después publica cada comentario con su foto.</p>
    {message && <p className="border border-line px-3 py-2 text-xs text-warn">{message}</p>}
    <div className="space-y-3 border border-line p-4">
      <div>
        <h2 className="font-bold text-ink">Mensajes del paddock</h2>
        <p className="mt-1 text-xs text-ink-2">Borra cualquier publicación individual con el botón.</p>
      </div>
      {posts.length === 0 ? <p className="text-xs text-ink-muted">No hay mensajes publicados.</p> : posts.map(post => <article key={post.id} className="flex items-start justify-between gap-3 border-t border-line pt-3">
        <div className="min-w-0">
          <p className="text-xs font-bold text-ink">{post.author}</p>
          <p className="mt-1 whitespace-pre-wrap break-words text-xs text-ink-2">{post.text || "(Publicación con imagen o vídeo)"}</p>
          <time className="mt-1 block text-[10px] font-mono text-ink-muted">{new Date(post.createdAt).toLocaleString("es-ES")}</time>
        </div>
        <button aria-busy={pendingOnce || undefined} onClick={() => void removePost(post)} disabled={(!!busy) || pendingOnce} className="inline-flex shrink-0 items-center gap-1 border border-danger/40 px-2.5 py-2 text-[10px] font-bold uppercase tracking-wider text-danger disabled:opacity-40"><Trash2 className="h-3.5 w-3.5" /> Borrar</button>
      </article>)}
    </div>
    <div className="flex flex-wrap gap-2">
      <button aria-busy={pendingOnce || undefined} onClick={approve} disabled={(!completa || aprobado || !!busy) || pendingOnce} className="inline-flex items-center gap-2 bg-ok-soft border border-ok/40 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-ok disabled:opacity-40"><CheckCircle2 className="h-3.5 w-3.5" /> {aprobado ? "OK completo dado" : "Dar OK completo"}</button>
      <button aria-busy={pendingOnce || undefined} onClick={removeSplit3} disabled={(!!busy) || pendingOnce} className="inline-flex items-center gap-2 border border-danger/40 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-danger disabled:opacity-40"><Trash2 className="h-3.5 w-3.5" /> Borrar mensajes Split 3</button>
    </div>
    {!completa && <p className="text-xs text-warn">No se puede dar el OK: todavía falta completar algún equipo.</p>}
    {busy === "cargando" ? <Loader2 className="h-5 w-5 animate-spin text-ink-muted" /> : <div className="grid gap-3 md:grid-cols-2">{equipos.map(equipo => <article key={equipo.id} className="border border-line p-4">
      <div className="flex items-start justify-between gap-3"><div><h3 className="font-bold text-ink">{equipo.nombre}</h3><p className={`text-[10px] font-mono ${equipo.completa ? "text-ok" : "text-warn"}`}>{equipo.pilotos.length} pilotos · {equipo.completa ? "equipo confirmado" : "pendiente de confirmar"} · {equipo.publicada ? "publicada" : "pendiente"}</p></div><Image className="h-4 w-4 text-ink-muted" /></div>
      <p className="mt-2 text-xs text-ink-muted">{equipo.pilotos.map(pilot => pilot.nombre).join(" · ") || "Sin pilotos"}</p>
      <button aria-busy={pendingOnce || undefined} onClick={async () => {
    return runOnce(async () => { setBusy(equipo.id); try { await marcarEquipoCompleto(splitId, equipo.id, !equipo.completa); await load(); } catch (error: any) { setMessage(error.message); } finally { setBusy(""); } });
}} disabled={(!!busy) || pendingOnce} className="mt-3 border border-ok/40 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-ok disabled:opacity-40">{equipo.completa ? "Desmarcar equipo completo" : "Marcar equipo completo"}</button>
      <div className="mt-3"><StorageImageUpload currentUrl={equipo.fotoUrl} size="md" onUpload={url => setEquipos(current => current.map(item => item.id === equipo.id ? { ...item, fotoUrl: url } : item))} /></div>
      <button aria-busy={pendingOnce || undefined} onClick={async () => {
    return runOnce(async () => { setBusy(equipo.id); try { await publicarBienvenida(splitId, splitNombre, equipo, equipo.fotoUrl || ""); setMessage(`Bienvenida de ${equipo.nombre} publicada.`); await load(); } catch (error: any) { setMessage(error.message); } finally { setBusy(""); } });
}} disabled={(!aprobado || !equipo.completa || equipo.publicada || !!busy) || pendingOnce} className="mt-3 w-full bg-brand px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-brand-ink disabled:opacity-40">{busy === equipo.id ? "Publicando..." : equipo.publicada ? "Publicada" : "Publicar comentario"}</button>
    </article>)}</div>}
  </section>;
}
