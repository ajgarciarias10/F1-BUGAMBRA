import React, { useState, useRef, useEffect, useMemo } from "react";
import { useAuth } from "../contexts/AuthContext";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../services/firebase";
import { compressAndConvertImage } from "../utils/imageHelper";
import { useSplits } from "../hooks/useData";
import { StorageImageUpload } from "./StorageImageUpload";
import { UploadCloud, Link as LinkIcon, Camera, User, BadgeAlert, CheckCircle, ImageIcon } from "lucide-react";
import { useSingleFlight } from "../hooks/useSingleFlight";

export function ProfileView() {
  const { user, userData } = useAuth();
  const { splits } = useSplits();
  const [nombre, setNombre] = useState(userData?.nombre || "");
  const [fotoUrl, setFotoUrl] = useState(userData?.foto_url || "");
  const [urlInput, setUrlInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const [logoUrlInputs, setLogoUrlInputs] = useState<Record<string, string>>({});
  const [savingLogo, setSavingLogo] = useState<string | null>(null);
  const [logoMsg, setLogoMsg] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  const isJeque = userData?.rol === "jeque";
  const escuderiaId = userData?.escuderia_id;

  const mySplits = (splits || []).filter(
    (s: any) => s.id !== "global" && s.activo && (s.equipos || []).some((e: any) => e.id === escuderiaId)
  );

  const career = useMemo(() => {
    if (!userData) return [];
    const pilotId = userData.piloto_id || (userData.rol === "piloto" ? userData.uid : "");
    if (!pilotId) return [];

    return (splits || [])
      .filter((split: any) => split.id !== "global")
      .map((split: any) => {
        const entry = (split.roster || []).find((pilot: any) => pilot.pilotoId === pilotId);
        if (!entry) return null;
        const team = (split.equipos || []).find((candidate: any) => candidate.id === entry.equipoId);
        return {
          splitId: split.id,
          splitName: split.nombre,
          order: split.orden,
          teamName: split.tipo === "individual" ? "Competición individual" : team?.nombre || entry.equipoId || "Sin escudería",
          teamLogo: team?.logo_url || "",
          // Origins también puntúa: para parte de la parrilla es su debut, y la trayectoria
          // arranca ahí. Solo se oculta el OVR si esa temporada no llegó a calcularlo.
          rating: Number(entry.rating_piloto) > 0 ? Number(entry.rating_piloto) : null,
          // El OVR con el que arrancó el split: la diferencia con el de cierre es lo que
          // el piloto ganó o perdió en ese bloque.
          ratingBase: Number(entry.rating_base) > 0 ? Number(entry.rating_base) : null,
          points: entry.puntos_piloto ?? 0,
          rookie: !!entry.rookie,
        };
      })
      .filter(Boolean)
      .sort((a: any, b: any) => a.order - b.order);
  }, [splits, userData]);

  // La trayectoria encadenada: cada split parte del OVR con el que cerró el anterior, así
  // que la variación se mide contra ese valor y no contra un 70 fijo.
  const careerWithProgress = useMemo(() => {
    let previousRating: number | null = null;
    return career.map((season: any) => {
      const from = season.ratingBase ?? previousRating;
      const change = season.rating != null && from != null ? season.rating - from : null;
      if (season.rating != null) previousRating = season.rating;
      return { ...season, ratingFrom: from, ratingChange: change };
    });
  }, [career]);

  const careerPeak = useMemo(() => {
    const ratings = career.map((season: any) => season.rating).filter((r: any) => r != null);
    return ratings.length ? Math.max(...ratings) : null;
  }, [career]);

  const currentParticipation = useMemo(() => {
    if (!userData) return null;
    const pilotId = userData.piloto_id || (userData.rol === "piloto" ? userData.uid : "");
    const activeSplit = (splits || []).find((split: any) => split.activo);
    if (!pilotId || !activeSplit) return null;
    const entry = (activeSplit.roster || []).find((pilot: any) =>
      pilot.pilotoId === pilotId && pilot.participa_hasta == null
    );
    if (!entry) return null;
    const team = (activeSplit.equipos || []).find((candidate: any) => candidate.id === entry.equipoId);
    return { splitName: activeSplit.nombre, teamName: team?.nombre || "Competición individual" };
  }, [splits, userData]);

  const pilotStatus = useMemo(() => {
    const pilotId = userData?.piloto_id || (userData?.rol === "piloto" ? userData.uid : "");
    if (!pilotId) return null;
    const activeSplit = (splits || []).find((split: any) => split.activo);
    const lastSeason = [...career].sort((a: any, b: any) => b.order - a.order)[0];
    return {
      activeSeasonName: activeSplit?.nombre || "temporada activa",
      lastSeasonName: lastSeason?.splitName || "Sin temporada registrada",
      isFormerPilot: !currentParticipation,
    };
  }, [career, currentParticipation, splits, userData]);

  const { run: runOnce } = useSingleFlight();
  async function saveTeamLogo(splitId: string, logoUrl: string) {
    return runOnce(async () => {
    if (!escuderiaId) return;
    setSavingLogo(splitId);
    try {
      await updateDoc(doc(db, `splits/${splitId}/equipos`, escuderiaId), { logo_url: logoUrl || null });
      setLogoMsg("Logo guardado.");
      setTimeout(() => setLogoMsg(""), 2500);
    } catch (err: any) {
      setLogoMsg("Error: " + err.message);
    } finally {
      setSavingLogo(null);
    }
    });
  }

  useEffect(() => {
    if (userData) {
      setNombre(userData.nombre || "");
      setFotoUrl(userData.foto_url || "");
    }
  }, [userData]);

  if (!user || !userData) {
    return (
      <div className="bg-surface-2 border border-line rounded-2xl p-8 text-center text-ink-muted uppercase font-mono text-xs tracking-wider">
        Inicia sesión para ver tu perfil.
      </div>
    );
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      await processImageFile(file);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      await processImageFile(file);
    }
  };

  const processImageFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setErrorMsg("El archivo seleccionado debe ser una imagen.");
      return;
    }
    setLoading(true);
    setErrorMsg("");
    setSuccessMsg("");
    try {
      // Compress to ideal size (max 256x256, highly compressed jpeg)
      const base64Img = await compressAndConvertImage(file, 256, 256, 0.75);
      setFotoUrl(base64Img);
      setSuccessMsg("¡Foto procesada correctamente! No olvides guardar los cambios.");
    } catch (err: any) {
      setErrorMsg(err.message || "Error al procesar la imagen de perfil.");
    } finally {
      setLoading(false);
    }
  };

  const handleApplyUrl = () => {
    if (!urlInput.trim()) return;
    setFotoUrl(urlInput.trim());
    setUrlInput("");
    setSuccessMsg("¡URL de foto aplicada! Recuerda guardar para persistir los cambios.");
  };

  const handleSaveChanges = async (e: React.FormEvent) => {
    return runOnce(async () => {
    e.preventDefault();
    if (!nombre.trim()) {
      setErrorMsg("El nombre no puede estar vacío.");
      return;
    }
    setLoading(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const userRef = doc(db, "usuarios", user.uid);
      await updateDoc(userRef, {
        nombre: nombre.trim(),
        foto_url: fotoUrl
      });
      setSuccessMsg("¡Tu perfil ha sido actualizado con éxito!");
    } catch (err: any) {
      setErrorMsg("Error al guardar cambios: " + (err.message || err));
    } finally {
      setLoading(false);
    }
    });
  };

  const currentLogoForSplit = (splitId: string) => {
    const s = (splits || []).find((s: any) => s.id === splitId);
    const eq = (s?.equipos || []).find((e: any) => e.id === escuderiaId);
    return eq?.logo_url || "";
  };

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-3 lg:gap-8">
      {/* LEFT COLUMN: Visual Profile Card */}
      <div className="lg:col-span-1">
        <div className="relative flex flex-col items-center overflow-hidden rounded-2xl border border-line bg-gradient-to-b from-surface to-surface-2 p-5 text-center shadow-2xl md:p-6">
          {/* Accent red outline */}
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-brand"></div>
          
          <div className="relative mt-4 mb-5 group">
            {fotoUrl ? (
              <img
                src={fotoUrl}
                alt={nombre}
                referrerPolicy="no-referrer"
                className="w-32 h-32 rounded-full object-cover border-2 border-brand shadow-card transition-all duration-300 group-hover:scale-105"
              />
            ) : (
              <div className="w-32 h-32 rounded-full border border-line bg-surface-3 flex items-center justify-center text-ink-muted transition-all duration-300">
                <User className="w-16 h-16" />
              </div>
            )}
            <div className="absolute bottom-1 right-1 bg-brand p-1.5 rounded-full text-brand-ink shadow-lg cursor-pointer hover:bg-danger transition-colors" onClick={() => fileInputRef.current?.click()}>
              <Camera className="w-4 h-4" />
            </div>
          </div>

          <span className="text-xs font-mono tracking-[0.08em] text-brand uppercase font-black bg-danger/10 px-3 py-1 rounded-full border border-danger/20 mb-2">
            Sesión: {userData.rol}
          </span>
          <h2 className="text-xl font-bold italic tracking-tight">{nombre || "Usuario F1"}</h2>
          <p className="text-xs text-ink-muted font-mono lowercase mt-1">{user.email}</p>

          {/* Quick stats panel */}
          <div className="w-full border-t border-line my-6 pt-5 grid grid-cols-2 gap-4">
            <div className="bg-surface-2 border border-line rounded-xl p-3">
               <span className="text-[11px] uppercase tracking-wider text-ink-muted font-mono block mb-1">Estado actual</span>
               <span className="text-xs font-bold uppercase text-ink tracking-tight truncate max-w-full block">
                  {userData.rol === "admin" && !pilotStatus ? "Administrador" : currentParticipation?.teamName || (pilotStatus?.isFormerPilot ? "Ex piloto F1" : "Espectador")}
                </span>
                {pilotStatus?.isFormerPilot && (
                  <span className="block mt-1 text-[11px] text-ink-muted font-mono uppercase tracking-wider">
                    No compite en {pilotStatus.activeSeasonName} · Última: {pilotStatus.lastSeasonName}
                  </span>
                )}
            </div>
            <div className="bg-surface-2 border border-line rounded-xl p-3 flex flex-col justify-center">
              <span className="text-[11px] uppercase tracking-wider text-ink-muted font-mono block mb-1">Id de Registro</span>
              <span className="text-[11px] font-mono text-ink-muted truncate max-w-full block">{user.uid.substring(0, 10)}...</span>
            </div>
          </div>

          <div className="bg-brand/10 border border-brand/20 rounded-xl p-3.5 text-left w-full text-xs flex gap-2.5">
            <BadgeAlert className="w-4 h-4 text-brand shrink-0 mt-0.5" />
            <p className="text-ink-2 leading-relaxed text-[11px]">
              Tus fotos y datos de perfil se actualizan en todas las tablas de clasificación de la plataforma de manera inmediata.
            </p>
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN: Edit Settings Panel */}
      <div className="lg:col-span-2">
        <form onSubmit={handleSaveChanges} className="space-y-6 rounded-2xl border border-line bg-surface-2 p-4 shadow-2xl md:p-6 lg:p-8">
          <div className="border-b border-line pb-4">
            <h3 className="text-lg font-bold uppercase tracking-tight flex items-center gap-2">
              <span className="w-1.5 h-5 bg-brand inline-block" />
              Editar tus Datos
            </h3>
            <p className="text-xs text-ink-muted mt-1 font-mono uppercase tracking-wider">
              Actualiza tu fotografía y/o álias en los marcadores de la liga
            </p>
          </div>

          {/* Messages */}
          {successMsg && (
            <div className="p-3 bg-ok/10 border border-ok/30 rounded-xl text-ok text-xs font-mono flex items-center gap-2">
              <CheckCircle className="w-4 h-4 shrink-0" />
              {successMsg}
            </div>
          )}
          {errorMsg && (
            <div className="p-3 bg-danger/10 border border-danger/30 rounded-xl text-danger text-xs font-mono flex items-center gap-2">
              <BadgeAlert className="w-4 h-4 shrink-0" />
              {errorMsg}
            </div>
          )}

          {/* Form input: Nombre */}
          <div className="space-y-2">
            <label className="text-xs font-mono uppercase tracking-widest text-ink-muted block font-bold">
              Nombre o Álias Piloto/Jeque
            </label>
            <input
              type="text"
              required
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="w-full bg-surface-3 border border-line rounded-xl px-4 py-3 text-ink font-medium focus:outline-none focus:border-brand transition-colors"
              placeholder="Ej: Marotez Al-Rafah"
            />
          </div>

          {/* Drag & Drop Area */}
            <div className="space-y-2">
              <label className="text-xs font-mono uppercase tracking-widest text-ink-muted block font-bold">
                Foto de Perfil Personalizada
              </label>
            
            <div
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center min-h-[160px] ${
                dragActive
                  ? "border-brand bg-brand/5"
                  : "border-line hover:border-line-strong bg-surface-3"
              }`}
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                accept="image/*"
                className="hidden"
              />
              <UploadCloud className={`w-10 h-10 mb-2 transition-transform duration-300 ${dragActive ? "text-brand scale-110" : "text-ink-muted"}`} />
              <p className="text-xs font-bold text-ink uppercase tracking-tight">
                Arrastra tu imagen aquí o haz clic para subir
              </p>
              <p className="text-xs text-ink-muted mt-1 uppercase font-mono tracking-wider">
                Sube la imagen que quieras. Se redimensiona automáticamente y se ve en toda la app.
              </p>
            </div>
          </div>

          {/* Paste URL Optional Input */}
          <div className="space-y-2 border-t border-line pt-5">
            <label className="text-xs font-mono uppercase tracking-widest text-ink-muted block">
              O introduce una dirección URL de imagen
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <LinkIcon className="absolute left-3.5 top-3 w-4 h-4 text-ink-muted" />
                <input
                  type="url"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  className="min-h-12 w-full rounded-xl border border-line bg-surface-3 py-2.5 pl-10 pr-4 text-ink transition-colors focus:border-brand focus:outline-none md:min-h-0 md:text-xs"
                  placeholder="https://ejemplo.com/avatar.jpg"
                />
              </div>
              <button
                type="button"
                onClick={handleApplyUrl}
                className="bg-surface-3 hover:bg-surface-3 text-xs px-4 rounded-xl border border-line font-mono uppercase tracking-wider font-bold transition-all text-ink shrink-0 active:scale-95"
              >
                Aplicar URL
              </button>
            </div>
          </div>

          <div className="border-t border-line pt-6 flex justify-end gap-3">
            <button
              type="submit"
              disabled={loading}
              className="flex min-h-13 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-brand px-8 text-sm font-extrabold uppercase tracking-wide text-brand-ink shadow-lg shadow-danger/20 transition-all hover:bg-danger active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto md:min-h-0 md:py-3.5 md:text-xs md:tracking-widest"
            >
              {loading ? "Guardando..." : "Guardar Perfil"}
            </button>
          </div>
        </form>

        {career.length > 0 && (
          <section className="mt-6 border border-line bg-surface overflow-hidden">
            <div className="p-5 md:p-6 border-b border-line">
              <p className="text-[11px] font-mono uppercase tracking-[0.08em] text-brand">Archivo del piloto</p>
              <h3 className="mt-1 text-xl font-black uppercase tracking-[-0.03em]">Trayectoria por temporadas</h3>
              <p className="mt-1 text-xs text-ink-muted">Tus equipos y resultados se conservan aunque no participes en el split vigente.</p>
              {careerPeak != null && (
                <p className="mt-2 text-[11px] font-mono uppercase tracking-[0.08em] text-ink-muted">
                  Techo de carrera <span className="text-warn font-black">{careerPeak} OVR</span>
                  <span className="text-ink-muted"> · el overall se arrastra de un split al siguiente</span>
                </p>
              )}
            </div>
            <div className="grid sm:grid-cols-2 gap-px bg-surface-2">
              {careerWithProgress.map((season: any) => (
                <div key={season.splitId} className="bg-surface p-4 flex items-center gap-4">
                  <div className="w-12 h-12 shrink-0 border border-line bg-surface-2 p-1.5 flex items-center justify-center">
                    {season.teamLogo
                      ? <img src={season.teamLogo} alt={season.teamName} className="w-full h-full object-contain" />
                      : <span className="font-black text-xs text-ink-muted">{season.teamName.slice(0, 2).toUpperCase()}</span>}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono uppercase tracking-[0.08em] text-ink-muted">{season.splitName}</span>
                      {season.rookie && <span className="text-[11px] font-black uppercase tracking-[0.08em] text-info">Rookie</span>}
                    </div>
                    <p className="mt-1 font-black uppercase truncate">{season.teamName}</p>
                    <span className="text-[11px] font-mono text-ink-muted">{season.points} PTS</span>
                  </div>
                  {season.rating != null && (
                    <div className="flex flex-col items-center gap-1">
                      <div className="w-14 h-14 border border-brand/35 bg-brand/10 grid place-items-center text-center">
                        <div><strong className="block text-xl leading-none">{season.rating}</strong><span className="text-[11px] tracking-[0.08em] text-ink-muted">OVR</span></div>
                      </div>
                      {season.ratingChange != null && (
                        <span className={`text-[11px] font-mono font-black tabular-nums ${
                          season.ratingChange > 0 ? "text-ok"
                          : season.ratingChange < 0 ? "text-brand"
                          : "text-ink-muted"
                        }`}>
                          {season.ratingChange > 0 ? "▲" : season.ratingChange < 0 ? "▼" : "="}
                          {season.ratingChange !== 0 && Math.abs(season.ratingChange)}
                          <span className="text-ink-muted font-normal"> de {season.ratingFrom}</span>
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Logo de equipo — solo para jeques */}
        {isJeque && escuderiaId && mySplits.length > 0 && (
          <div className="mt-6 space-y-5 rounded-2xl border border-line bg-surface-2 p-4 md:p-6 lg:p-8">
            <div className="border-b border-line pb-4 flex items-center gap-2">
              <span className="w-1.5 h-5 bg-brand inline-block" />
              <div>
                <h3 className="text-sm font-bold uppercase tracking-tight">Logo de tu Escudería</h3>
                <p className="text-xs text-ink-muted font-mono uppercase tracking-wider mt-0.5">
                  Sube el escudo de tu escudería por temporada
                </p>
              </div>
            </div>

            {logoMsg && (
              <div className="p-2.5 bg-ok/10 border border-ok/30 rounded-lg text-ok text-xs font-mono">
                {logoMsg}
              </div>
            )}

            <div className="space-y-5">
              {mySplits.map((split: any) => {
                const currentLogo = currentLogoForSplit(split.id);
                const localUrl = logoUrlInputs[split.id] ?? currentLogo;
                return (
                  <div key={split.id} className="space-y-3">
                    <p className="text-xs font-mono uppercase tracking-[0.08em] text-ink-muted">
                      Temporada — {split.nombre}
                    </p>
                    <div className="flex items-center gap-3">
                      {/* Preview */}
                      <div className="w-14 h-14 bg-surface-2 border border-line rounded-lg flex items-center justify-center shrink-0 overflow-hidden">
                        {currentLogo ? (
                          <img src={currentLogo} className="w-full h-full object-contain p-1" />
                        ) : (
                          <ImageIcon className="w-5 h-5 text-ink-muted" />
                        )}
                      </div>
                      {/* Upload via Storage */}
                      <StorageImageUpload
                        storagePath={`logos/${split.id}/${escuderiaId}`}
                        currentUrl={currentLogo || undefined}
                        onUpload={url => saveTeamLogo(split.id, url)}
                        size="sm"
                        className="shrink-0"
                      />
                      {/* URL alternativa */}
                      <input
                        type="url"
                        value={localUrl}
                        onChange={e => setLogoUrlInputs(prev => ({ ...prev, [split.id]: e.target.value }))}
                        placeholder="o pega URL aquí"
                        className="min-h-11 w-full min-w-0 flex-1 rounded-lg border border-line bg-surface-3 px-3 text-ink transition-colors focus:border-brand focus:outline-none md:min-h-0 md:py-2 md:font-mono md:text-[11px]"
                      />
                      <button
                        type="button"
                        disabled={savingLogo === split.id}
                        onClick={() => saveTeamLogo(split.id, localUrl)}
                        className="min-h-11 shrink-0 rounded-lg border border-brand/30 bg-brand/10 px-3 text-[13px] font-bold text-brand transition-colors hover:bg-brand/20 disabled:opacity-40 md:min-h-0 md:py-2 md:text-xs md:uppercase"
                      >
                        {savingLogo === split.id ? "..." : "Guardar"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
