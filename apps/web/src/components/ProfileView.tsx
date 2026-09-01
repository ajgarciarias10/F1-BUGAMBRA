import React, { useState, useRef, useEffect, useMemo } from "react";
import { useAuth } from "../contexts/AuthContext";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../services/firebase";
import { compressAndConvertImage } from "../utils/imageHelper";
import { useSplits } from "../hooks/useData";
import { StorageImageUpload } from "./StorageImageUpload";
import { UploadCloud, Link as LinkIcon, Camera, User, BadgeAlert, CheckCircle, ImageIcon } from "lucide-react";

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
          rating: split.tipo === "individual" ? null : entry.rating_piloto ?? 70,
          points: entry.puntos_piloto ?? 0,
          rookie: !!entry.rookie,
        };
      })
      .filter(Boolean)
      .sort((a: any, b: any) => a.order - b.order);
  }, [splits, userData]);

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

  async function saveTeamLogo(splitId: string, logoUrl: string) {
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
  }

  useEffect(() => {
    if (userData) {
      setNombre(userData.nombre || "");
      setFotoUrl(userData.foto_url || "");
    }
  }, [userData]);

  if (!user || !userData) {
    return (
      <div className="bg-zinc-900/50 border border-white/5 rounded-2xl p-8 text-center text-white/50 uppercase font-mono text-xs tracking-wider">
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
  };

  const currentLogoForSplit = (splitId: string) => {
    const s = (splits || []).find((s: any) => s.id === splitId);
    const eq = (s?.equipos || []).find((e: any) => e.id === escuderiaId);
    return eq?.logo_url || "";
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* LEFT COLUMN: Visual Profile Card */}
      <div className="lg:col-span-1">
        <div className="bg-gradient-to-b from-zinc-900 to-black border border-white/10 rounded-2xl p-6 relative overflow-hidden shadow-2xl flex flex-col items-center text-center">
          {/* Accent red outline */}
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-[#e10600]"></div>
          
          <div className="relative mt-4 mb-5 group">
            {fotoUrl ? (
              <img
                src={fotoUrl}
                alt={nombre}
                referrerPolicy="no-referrer"
                className="w-32 h-32 rounded-full object-cover border-2 border-[#e10600] shadow-[0_0_20px_rgba(225,6,0,0.3)] transition-all duration-300 group-hover:scale-105"
              />
            ) : (
              <div className="w-32 h-32 rounded-full border border-white/10 bg-zinc-800/80 flex items-center justify-center text-white/20 transition-all duration-300">
                <User className="w-16 h-16" />
              </div>
            )}
            <div className="absolute bottom-1 right-1 bg-[#e10600] p-1.5 rounded-full text-white shadow-lg cursor-pointer hover:bg-red-700 transition-colors" onClick={() => fileInputRef.current?.click()}>
              <Camera className="w-4 h-4" />
            </div>
          </div>

          <span className="text-[10px] font-mono tracking-[0.25em] text-[#e10600] uppercase font-black bg-red-500/10 px-3 py-1 rounded-full border border-red-500/20 mb-2">
            Sesión: {userData.rol}
          </span>
          <h2 className="text-xl font-bold italic tracking-tight">{nombre || "Usuario F1"}</h2>
          <p className="text-xs text-white/50 font-mono lowercase mt-1">{user.email}</p>

          {/* Quick stats panel */}
          <div className="w-full border-t border-white/10 my-6 pt-5 grid grid-cols-2 gap-4">
            <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3">
               <span className="text-[8px] uppercase tracking-wider text-white/40 font-mono block mb-1">Estado actual</span>
               <span className="text-xs font-bold uppercase text-white tracking-tight truncate max-w-full block">
                 {userData.rol === "admin" ? "Administrador" : currentParticipation?.teamName || "Espectador"}
               </span>
            </div>
            <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3 flex flex-col justify-center">
              <span className="text-[8px] uppercase tracking-wider text-white/40 font-mono block mb-1">Id de Registro</span>
              <span className="text-[9px] font-mono text-white/60 truncate max-w-full block">{user.uid.substring(0, 10)}...</span>
            </div>
          </div>

          <div className="bg-[#e10600]/10 border border-[#e10600]/20 rounded-xl p-3.5 text-left w-full text-xs flex gap-2.5">
            <BadgeAlert className="w-4 h-4 text-[#e10600] shrink-0 mt-0.5" />
            <p className="text-white/70 leading-relaxed text-[11px]">
              Tus fotos y datos de perfil se actualizan en todas las tablas de clasificación de la plataforma de manera inmediata.
            </p>
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN: Edit Settings Panel */}
      <div className="lg:col-span-2">
        <form onSubmit={handleSaveChanges} className="bg-zinc-900/40 border border-white/10 rounded-2xl p-6 lg:p-8 space-y-6 shadow-2xl">
          <div className="border-b border-white/10 pb-4">
            <h3 className="text-lg font-bold uppercase tracking-tight flex items-center gap-2">
              <span className="w-1.5 h-5 bg-[#e10600] inline-block" />
              Editar tus Datos
            </h3>
            <p className="text-xs text-white/40 mt-1 font-mono uppercase tracking-wider">
              Actualiza tu fotografía y/o álias en los marcadores de la liga
            </p>
          </div>

          {/* Messages */}
          {successMsg && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-xs font-mono flex items-center gap-2">
              <CheckCircle className="w-4 h-4 shrink-0" />
              {successMsg}
            </div>
          )}
          {errorMsg && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs font-mono flex items-center gap-2">
              <BadgeAlert className="w-4 h-4 shrink-0" />
              {errorMsg}
            </div>
          )}

          {/* Form input: Nombre */}
          <div className="space-y-2">
            <label className="text-xs font-mono uppercase tracking-widest text-white/50 block font-bold">
              Nombre o Álias Piloto/Jeque
            </label>
            <input
              type="text"
              required
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="w-full bg-zinc-800 border border-white/10 rounded-xl px-4 py-3 text-white font-medium focus:outline-none focus:border-[#e10600] transition-colors"
              placeholder="Ej: Marotez Al-Rafah"
            />
          </div>

          {/* Drag & Drop Area */}
          <div className="space-y-2">
            <label className="text-xs font-mono uppercase tracking-widest text-white/50 block font-bold">
              Foto de Perfil (Avatar)
            </label>
            
            <div
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center min-h-[160px] ${
                dragActive
                  ? "border-[#e10600] bg-[#e10600]/5"
                  : "border-white/10 hover:border-white/20 bg-black/20"
              }`}
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                accept="image/*"
                className="hidden"
              />
              <UploadCloud className={`w-10 h-10 mb-2 transition-transform duration-300 ${dragActive ? "text-[#e10600] scale-110" : "text-white/30"}`} />
              <p className="text-xs font-bold text-white uppercase tracking-tight">
                Arrastra tu imagen aquí o haz clic para subir
              </p>
              <p className="text-[10px] text-white/40 mt-1 uppercase font-mono tracking-wider">
                Soporta PNG, JPG y GIF. Se redimensiona automáticamente.
              </p>
            </div>
          </div>

          {/* Paste URL Optional Input */}
          <div className="space-y-2 border-t border-white/5 pt-5">
            <label className="text-xs font-mono uppercase tracking-widest text-white/50 block">
              O introduce una dirección URL de imagen
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <LinkIcon className="absolute left-3.5 top-3 w-4 h-4 text-white/30" />
                <input
                  type="url"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  className="w-full bg-zinc-800 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-xs focus:outline-none focus:border-[#e10600] transition-colors"
                  placeholder="https://ejemplo.com/avatar.jpg"
                />
              </div>
              <button
                type="button"
                onClick={handleApplyUrl}
                className="bg-zinc-800 hover:bg-zinc-700 text-xs px-4 rounded-xl border border-white/10 font-mono uppercase tracking-wider font-bold transition-all text-white shrink-0 active:scale-95"
              >
                Aplicar URL
              </button>
            </div>
          </div>

          <div className="border-t border-white/10 pt-6 flex justify-end gap-3">
            <button
              type="submit"
              disabled={loading}
              className="bg-[#e10600] hover:bg-red-700 text-white font-extrabold text-xs uppercase tracking-widest px-8 py-3.5 rounded-xl shadow-lg shadow-red-900/20 flex items-center gap-2 cursor-pointer transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Guardando..." : "Guardar Perfil"}
            </button>
          </div>
        </form>

        {career.length > 0 && (
          <section className="mt-6 border border-white/10 bg-[#0d0e12] overflow-hidden">
            <div className="p-5 md:p-6 border-b border-white/[0.08]">
              <p className="text-[9px] font-mono uppercase tracking-[0.3em] text-[#e10600]">Archivo del piloto</p>
              <h3 className="mt-1 text-xl font-black uppercase tracking-[-0.03em]">Trayectoria por temporadas</h3>
              <p className="mt-1 text-xs text-white/40">Tus equipos y resultados se conservan aunque no participes en el split vigente.</p>
            </div>
            <div className="grid sm:grid-cols-2 gap-px bg-white/[0.06]">
              {career.map((season: any) => (
                <div key={season.splitId} className="bg-[#111218] p-4 flex items-center gap-4">
                  <div className="w-12 h-12 shrink-0 border border-white/10 bg-white/[0.04] p-1.5 flex items-center justify-center">
                    {season.teamLogo
                      ? <img src={season.teamLogo} alt={season.teamName} className="w-full h-full object-contain" />
                      : <span className="font-black text-xs text-white/20">{season.teamName.slice(0, 2).toUpperCase()}</span>}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[8px] font-mono uppercase tracking-[0.24em] text-white/30">{season.splitName}</span>
                      {season.rookie && <span className="text-[7px] font-black uppercase tracking-[0.18em] text-sky-300">Rookie</span>}
                    </div>
                    <p className="mt-1 font-black uppercase truncate">{season.teamName}</p>
                    <span className="text-[9px] font-mono text-white/35">{season.points} PTS</span>
                  </div>
                  {season.rating != null && (
                    <div className="w-14 h-14 border border-[#e10600]/35 bg-[#e10600]/10 grid place-items-center text-center">
                      <div><strong className="block text-xl leading-none">{season.rating}</strong><span className="text-[7px] tracking-[0.18em] text-white/45">OVR</span></div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Logo de equipo — solo para jeques */}
        {isJeque && escuderiaId && mySplits.length > 0 && (
          <div className="bg-zinc-900/40 border border-white/10 rounded-2xl p-6 lg:p-8 space-y-5 mt-6">
            <div className="border-b border-white/10 pb-4 flex items-center gap-2">
              <span className="w-1.5 h-5 bg-[#e10600] inline-block" />
              <div>
                <h3 className="text-sm font-bold uppercase tracking-tight">Logo de tu Escudería</h3>
                <p className="text-[10px] text-white/40 font-mono uppercase tracking-wider mt-0.5">
                  Sube el escudo de tu escudería por temporada
                </p>
              </div>
            </div>

            {logoMsg && (
              <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-400 text-xs font-mono">
                {logoMsg}
              </div>
            )}

            <div className="space-y-5">
              {mySplits.map((split: any) => {
                const currentLogo = currentLogoForSplit(split.id);
                const localUrl = logoUrlInputs[split.id] ?? currentLogo;
                return (
                  <div key={split.id} className="space-y-3">
                    <p className="text-[10px] font-mono uppercase tracking-[0.3em] text-white/30">
                      Temporada — {split.nombre}
                    </p>
                    <div className="flex items-center gap-3">
                      {/* Preview */}
                      <div className="w-14 h-14 bg-white/[0.03] border border-white/10 rounded-lg flex items-center justify-center shrink-0 overflow-hidden">
                        {currentLogo ? (
                          <img src={currentLogo} className="w-full h-full object-contain p-1" />
                        ) : (
                          <ImageIcon className="w-5 h-5 text-white/10" />
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
                        className="flex-1 min-w-0 bg-zinc-800 border border-white/10 rounded-lg px-3 py-2 text-[11px] text-white font-mono focus:outline-none focus:border-[#e10600] transition-colors"
                      />
                      <button
                        type="button"
                        disabled={savingLogo === split.id}
                        onClick={() => saveTeamLogo(split.id, localUrl)}
                        className="bg-[#e10600]/10 hover:bg-[#e10600]/20 border border-[#e10600]/30 text-[#e10600] text-[10px] font-bold uppercase px-3 py-2 rounded-lg transition-colors disabled:opacity-40 shrink-0"
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
