import { useEffect, useMemo, useState, type ChangeEvent, type DragEvent, type FormEvent } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { useSplits } from "../../hooks/useData";
import { useSingleFlight } from "../../hooks/useSingleFlight";
import { compressAndConvertImage } from "../../utils/imageHelper";
import { guardarLogoEquipo, guardarPerfil } from "../../services/perfilService";
import { StorageImageUpload } from "../../components/StorageImageUpload";
import type { SplitView } from "../../types";

export interface EtapaPerfil { splitId: string; split: string; equipo: string; logo: string; puntos: number; rating: number | null; ratingAnterior: number | null; cambio: number | null; rookie: boolean }

/** La trayectoria de la cuenta usa el roster histórico, no la escudería actual. */
export function trayectoriaPerfil(splits: readonly SplitView[], pilotoId: string | null): EtapaPerfil[] {
  if (!pilotoId) return [];
  const etapas = splits.filter(s => s.id !== "global").flatMap(split => {
    const ficha = split.roster.find(p => p.pilotoId === pilotoId);
    if (!ficha) return [];
    const equipo = split.equipos.find(e => e.id === ficha.equipoId);
    return [{ splitId: split.id, split: split.nombre, equipo: split.tipo === "individual" ? "Competición individual" : equipo?.nombre || ficha.equipoId || "Sin escudería", logo: equipo?.logo_url || "", puntos: ficha.puntos_piloto ?? 0, rating: Number(ficha.rating_piloto) > 0 ? Number(ficha.rating_piloto) : null, ratingBase: Number(ficha.rating_base) > 0 ? Number(ficha.rating_base) : null, rookie: Boolean(ficha.rookie), orden: split.orden }];
  }).sort((a, b) => a.orden - b.orden);
  let anterior: number | null = null;
  return etapas.map(({ orden: _orden, ratingBase, ...etapa }) => {
    const ratingAnterior = ratingBase ?? anterior;
    const cambio = etapa.rating !== null && ratingAnterior !== null ? etapa.rating - ratingAnterior : null;
    if (etapa.rating !== null) anterior = etapa.rating;
    return { ...etapa, ratingAnterior, cambio };
  });
}

export function Perfil() {
  const { user, userData } = useAuth();
  const { splits } = useSplits();
  const { run } = useSingleFlight();
  const [nombre, setNombre] = useState("");
  const [fotoUrl, setFotoUrl] = useState("");
  const [urlInput, setUrlInput] = useState("");
  const [logoUrlInputs, setLogoUrlInputs] = useState<Record<string, string>>({});
  const [ocupado, setOcupado] = useState(false);
  const [mensaje, setMensaje] = useState<{ error: boolean; texto: string } | null>(null);
  const pilotoId = userData?.piloto_id || (userData?.rol === "piloto" ? userData.uid : null);
  const trayectoria = useMemo(() => trayectoriaPerfil(splits, pilotoId), [splits, pilotoId]);
  const ratings = trayectoria.map(e => e.rating).filter((n): n is number => n !== null);
  const techo = ratings.length ? Math.max(...ratings) : null;
  const misSplits = splits.filter(s => s.id !== "global" && s.activo && s.equipos.some(e => e.id === userData?.escuderia_id));
  const splitActivo = splits.find(s => s.activo);
  const participacion = splitActivo?.roster.find(p => p.pilotoId === pilotoId && p.participa_hasta == null);

  useEffect(() => {
    setNombre(userData?.nombre || "");
    setFotoUrl(userData?.foto_url || "");
  }, [userData]);

  if (!user || !userData) return <section><h1>Perfil</h1><p>Inicia sesión para ver tu perfil.</p></section>;

  async function procesarArchivo(file: File) {
    if (!file.type.startsWith("image/")) { setMensaje({ error: true, texto: "El archivo debe ser una imagen." }); return; }
    setOcupado(true);
    try {
      const base64Img = await compressAndConvertImage(file, 256, 256, 0.75);
      setFotoUrl(base64Img);
      setMensaje({ error: false, texto: "Foto procesada. Guarda el perfil para publicar el cambio." });
    } catch (error) {
      setMensaje({ error: true, texto: `Error al procesar la imagen: ${String(error)}` });
    } finally { setOcupado(false); }
  }

  async function procesarImagen(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) await procesarArchivo(file);
  }

  async function soltarImagen(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (file) await procesarArchivo(file);
  }

  async function guardar(event: FormEvent) {
    event.preventDefault();
    await run(async () => {
      if (!nombre.trim()) { setMensaje({ error: true, texto: "El nombre no puede estar vacío." }); return; }
      setOcupado(true); setMensaje(null);
      try {
        await guardarPerfil(user!.uid, nombre.trim(), fotoUrl);
        setMensaje({ error: false, texto: "Perfil actualizado." });
      } catch (error) { setMensaje({ error: true, texto: `No se pudo guardar el perfil: ${String(error)}` }); }
      finally { setOcupado(false); }
    });
  }

  async function guardarLogo(splitId: string, url: string) {
    await run(async () => {
      if (!userData!.escuderia_id) return;
      setOcupado(true); setMensaje(null);
      try {
        await guardarLogoEquipo(splitId, userData!.escuderia_id, url);
        setMensaje({ error: false, texto: "Logo guardado." });
      } catch (error) { setMensaje({ error: true, texto: `No se pudo guardar el logo: ${String(error)}` }); }
      finally { setOcupado(false); }
    });
  }

  const equipoActual = splitActivo?.equipos.find(e => e.id === (userData.escuderia_id || participacion?.equipoId));
  return <div className="mx-auto max-w-5xl space-y-8 text-[color:var(--text-main)]">
    <header><span className="nui-eyebrow">Tu cuenta</span><h1 className="text-3xl font-bold">Perfil · {userData.nombre}</h1></header>
    {mensaje && <p role={mensaje.error ? "alert" : "status"} className="border-l-4 p-3" style={{ borderColor: mensaje.error ? "var(--accent-f1)" : "var(--accent-ok)" }}>{mensaje.texto}</p>}
    <div className="grid gap-8 lg:grid-cols-2">
      <section className="space-y-5" aria-label="Datos del perfil">
        <div className="flex items-center gap-4 border-b pb-5" style={{ borderColor: "var(--border-color)" }}>
          {fotoUrl ? <img src={fotoUrl} alt="" className="h-20 w-20 rounded-full object-cover" /> : <span className="grid h-20 w-20 place-items-center rounded-full text-2xl font-bold" style={{ background: "var(--bg-elevated)" }}>{nombre.slice(0, 2).toUpperCase()}</span>}
          <div><strong className="text-xl">{nombre || "Usuario"}</strong><p className="nui-muted">{user.email}</p><p className="nui-muted">Rol: {userData.rol === "admin" ? "Comisario" : userData.rol === "director_deportivo" ? "Director deportivo" : userData.rol}</p><p className="nui-muted">Escudería: {equipoActual?.nombre ?? "Ninguna"}</p>{pilotoId && !participacion && trayectoria.length > 0 && <p className="nui-muted">Ex piloto · Última temporada: {trayectoria[trayectoria.length - 1].split}</p>}</div>
        </div>
        <form onSubmit={guardar} className="space-y-4" aria-busy={ocupado}>
          <label className="block font-semibold">Alias<input className="mt-2 block min-h-12 w-full rounded border p-3" style={{ background: "var(--bg-surface)", borderColor: "var(--border-color)" }} value={nombre} onChange={e => setNombre(e.target.value)} required /></label>
          <label className="block rounded border border-dashed p-4 font-semibold" style={{ borderColor: "var(--border-color)" }} onDragOver={e => e.preventDefault()} onDrop={e => void soltarImagen(e)}>Foto de perfil · arrastra una imagen o selecciónala<input type="file" accept="image/*" onChange={e => void procesarImagen(e)} className="mt-2 block w-full" /></label>
          <label className="block font-semibold">URL de foto<input type="url" value={urlInput} onChange={e => setUrlInput(e.target.value)} className="mt-2 block min-h-12 w-full rounded border p-3" style={{ background: "var(--bg-surface)", borderColor: "var(--border-color)" }} /></label>
          <button type="button" className="nui-button" onClick={() => { if (urlInput.trim()) { setFotoUrl(urlInput.trim()); setUrlInput(""); setMensaje({ error: false, texto: "URL aplicada. Guarda el perfil para publicar el cambio." }); } }}>Aplicar URL</button>
          <div><button className="nui-button nui-button--primary" type="submit" disabled={ocupado}>{ocupado ? "Guardando…" : "Guardar perfil"}</button></div>
        </form>
      </section>
      <section aria-labelledby="trayectoria-perfil"><h2 id="trayectoria-perfil" className="mb-4 text-2xl font-bold">Trayectoria</h2>{trayectoria.length ? <>{techo !== null && <p className="nui-muted">Techo de carrera: {techo} OVR</p>}<ol>{trayectoria.map(etapa => <li key={etapa.splitId} className="flex items-center gap-4 border-b py-3" style={{ borderColor: "var(--border-color)" }}><span className="grid h-12 w-12 place-items-center">{etapa.logo ? <img src={etapa.logo} alt="" className="h-12 w-12 object-contain" /> : "◆"}</span><div className="flex-1"><strong>{etapa.split}</strong><p>{etapa.equipo}</p><small className="nui-muted">{etapa.puntos} pts{etapa.rookie ? " · Rookie" : ""}</small></div>{etapa.rating !== null && <div className="text-right"><strong>{etapa.rating} OVR</strong>{etapa.cambio !== null && <small className="nui-muted block">{etapa.cambio > 0 ? "+" : ""}{etapa.cambio} desde {etapa.ratingAnterior}</small>}</div>}</li>)}</ol></> : <p className="nui-muted">Todavía no hay trayectoria de piloto registrada.</p>}</section>
    </div>
    {userData.rol === "jeque" && userData.escuderia_id && misSplits.length > 0 && <section className="space-y-4 border-t pt-6" style={{ borderColor: "var(--border-color)" }}><h2 className="text-2xl font-bold">Logo de tu escudería</h2>{misSplits.map(split => {
      const logo = split.equipos.find(e => e.id === userData.escuderia_id)?.logo_url || "";
      return <div key={split.id} className="grid gap-3 border-b pb-4 sm:grid-cols-[1fr_auto]" style={{ borderColor: "var(--border-color)" }}><strong>{split.nombre}</strong><StorageImageUpload storagePath={`logos/${split.id}/${userData.escuderia_id}`} currentUrl={logo} onUpload={url => guardarLogo(split.id, url)} /><label className="sm:col-span-2">URL del logo<input type="url" aria-label={`URL del logo para ${split.nombre}`} value={logoUrlInputs[split.id] ?? logo} onChange={e => setLogoUrlInputs(prev => ({ ...prev, [split.id]: e.target.value }))} className="mt-2 block min-h-12 w-full rounded border p-3" style={{ background: "var(--bg-surface)", borderColor: "var(--border-color)" }} /></label><button className="nui-button sm:col-span-2 sm:justify-self-start" disabled={ocupado} onClick={() => void guardarLogo(split.id, logoUrlInputs[split.id] ?? logo)}>Guardar logo</button></div>;
    })}</section>}
  </div>;
}

export default Perfil;
