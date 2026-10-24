import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { useSingleFlight } from "../../hooks/useSingleFlight";
import { CATEGORIAS_SUGERENCIA, crearSugerencia, escucharSugerencias, votarSugerencia, type Sugerencia } from "../../services/sugerenciasService";

export type OrdenSugerencia = "date" | "votes";
export function ordenarSugerencias(items: readonly Sugerencia[], categoria: string, estado: string, orden: OrdenSugerencia): Sugerencia[] {
  const filtradas = items.filter(item => (categoria === "all" || item.categoria === categoria) && (estado === "all" || item.estado === estado));
  return [...filtradas].sort((a, b) => orden === "votes" ? (b.votos?.length ?? 0) - (a.votos?.length ?? 0) || b.fecha.localeCompare(a.fecha) : b.fecha.localeCompare(a.fecha));
}

const ESTADOS: Record<Sugerencia["estado"], string> = { pendiente: "Pendiente", revisando: "En revisión", aprobado: "Aprobada", descartado: "Descartada", completado: "Completada" };

export function Buzon() {
  const { user, userData } = useAuth();
  const { run } = useSingleFlight();
  const [items, setItems] = useState<Sugerencia[]>([]);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState(false);
  const [titulo, setTitulo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [categoria, setCategoria] = useState("interfaz");
  const [filtroCategoria, setFiltroCategoria] = useState("all");
  const [filtroEstado, setFiltroEstado] = useState("all");
  const [orden, setOrden] = useState<OrdenSugerencia>("date");
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState<{ error: boolean; texto: string } | null>(null);
  const visibles = useMemo(() => ordenarSugerencias(items, filtroCategoria, filtroEstado, orden), [items, filtroCategoria, filtroEstado, orden]);

  useEffect(() => escucharSugerencias(data => { setItems(data); setCargando(false); setErrorCarga(false); }, () => { setCargando(false); setErrorCarga(true); }), []);

  async function enviar(event: FormEvent) {
    event.preventDefault();
    await run(async () => {
      if (!user || !userData) return;
      if (!titulo.trim() || !descripcion.trim()) { setMensaje({ error: true, texto: "Rellena título y descripción." }); return; }
      setGuardando(true); setMensaje(null);
      try {
        await crearSugerencia({ titulo: titulo.trim(), descripcion: descripcion.trim(), categoria, usuario_nombre: userData.nombre || "Usuario", usuario_uid: user.uid, usuario_email: user.email || "", usuario_rol: userData.rol || "piloto" });
        setTitulo(""); setDescripcion(""); setCategoria("interfaz");
        setMensaje({ error: false, texto: "Propuesta enviada correctamente." });
      } catch (error) { setMensaje({ error: true, texto: `No se pudo enviar la propuesta: ${String(error)}` }); }
      finally { setGuardando(false); }
    });
  }

  async function votar(item: Sugerencia) {
    await run(async () => {
      if (!user) return;
      setGuardando(true); setMensaje(null);
      try { await votarSugerencia(item.id, user.uid, Boolean(item.votos?.includes(user.uid))); }
      catch (error) { setMensaje({ error: true, texto: `No se pudo registrar el voto: ${String(error)}` }); }
      finally { setGuardando(false); }
    });
  }

  if (!user || !userData) return <section><h1>Buzón de mejoras</h1><p>Inicia sesión para enviar propuestas.</p></section>;
  return <div className="mx-auto max-w-5xl space-y-8 text-[color:var(--text-main)]">
    <header><span className="nui-eyebrow">Propuestas de la liga</span><h1 className="text-3xl font-bold">Buzón de mejoras</h1><p className="nui-muted">Comparte una idea y consulta qué está revisando la liga.</p></header>
    {mensaje && <p role={mensaje.error ? "alert" : "status"} className="border-l-4 p-3" style={{ borderColor: mensaje.error ? "var(--accent-f1)" : "var(--accent-ok)" }}>{mensaje.texto}</p>}
    <form onSubmit={enviar} aria-busy={guardando} className="grid gap-4 border-b pb-8 md:grid-cols-2" style={{ borderColor: "var(--border-color)" }}>
      <label className="font-semibold">Categoría<select value={categoria} onChange={e => setCategoria(e.target.value)} className="mt-2 block min-h-12 w-full rounded border p-3" style={{ background: "var(--bg-surface)", borderColor: "var(--border-color)" }}>{CATEGORIAS_SUGERENCIA.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}</select></label>
      <label className="font-semibold">Título<input value={titulo} onChange={e => setTitulo(e.target.value)} required maxLength={120} placeholder="Escribe tu propuesta" className="mt-2 block min-h-12 w-full rounded border p-3" style={{ background: "var(--bg-surface)", borderColor: "var(--border-color)" }} /></label>
      <label className="font-semibold md:col-span-2">Descripción<textarea value={descripcion} onChange={e => setDescripcion(e.target.value)} required rows={4} className="mt-2 block w-full rounded border p-3" style={{ background: "var(--bg-surface)", borderColor: "var(--border-color)" }} /></label>
      <button type="submit" className="nui-button nui-button--primary justify-self-start" disabled={guardando}>{guardando ? "Enviando…" : "Enviar propuesta"}</button>
    </form>
    <section aria-labelledby="lista-propuestas"><div className="flex flex-wrap items-center justify-between gap-4"><h2 id="lista-propuestas" className="text-2xl font-bold">Propuestas</h2><div className="flex flex-wrap gap-2"><label>Categoría <select value={filtroCategoria} onChange={e => setFiltroCategoria(e.target.value)} className="nui-button"><option value="all">Todas</option>{CATEGORIAS_SUGERENCIA.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}</select></label><label>Estado <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)} className="nui-button"><option value="all">Todos</option>{Object.entries(ESTADOS).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label><label>Orden <select value={orden} onChange={e => setOrden(e.target.value as OrdenSugerencia)} className="nui-button"><option value="date">Más recientes</option><option value="votes">Más votadas</option></select></label></div></div>
      {cargando ? <p role="status">Cargando propuestas…</p> : errorCarga ? <p role="alert">No se pudieron cargar las propuestas. Comprueba tu conexión.</p> : visibles.length ? <ul className="mt-5 space-y-0">{visibles.map(item => <li key={item.id} className="grid gap-3 border-b py-5 sm:grid-cols-[1fr_auto]" style={{ borderColor: "var(--border-color)" }}><div><div className="flex flex-wrap items-center gap-2"><strong className="text-lg">{item.titulo}</strong><span className="nui-eyebrow">{ESTADOS[item.estado]}</span></div><p className="nui-muted">{item.descripcion}</p><small className="nui-muted">{CATEGORIAS_SUGERENCIA.find(c => c.id === item.categoria)?.label ?? item.categoria} · {item.usuario_nombre}</small>{item.respuesta_admin && <p className="mt-2 border-l-2 pl-3" style={{ borderColor: "var(--accent-amber)" }}><strong>Respuesta de administración:</strong> {item.respuesta_admin}</p>}</div><button className="nui-button self-start" onClick={() => void votar(item)} disabled={guardando} aria-pressed={Boolean(item.votos?.includes(user.uid))} aria-label={`${item.votos?.includes(user.uid) ? "Retirar voto" : "Votar"} por ${item.titulo}`}>▲ {item.votos?.length ?? 0}</button></li>)}</ul> : <p className="nui-muted mt-5">Todavía no hay propuestas con estos filtros.</p>}
    </section>
  </div>;
}

export default Buzon;
