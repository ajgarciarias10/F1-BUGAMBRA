import React, { useState, useRef, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../services/firebase";
import { compressAndConvertImage } from "../utils/imageHelper";
import { UploadCloud, Link as LinkIcon, Camera, User, BadgeAlert, Coins, Sparkles, Trophy, CheckCircle, Flame } from "lucide-react";

export function ProfileView() {
  const { user, userData } = useAuth();
  const [nombre, setNombre] = useState(userData?.nombre || "");
  const [fotoUrl, setFotoUrl] = useState(userData?.foto_url || "");
  const [urlInput, setUrlInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [dragActive, setDragActive] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

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
              <span className="text-[8px] uppercase tracking-wider text-white/40 font-mono block mb-1">Escudería</span>
              <span className="text-xs font-bold uppercase text-white tracking-tight truncate max-w-full block">
                {userData.escuderia_id ? userData.escuderia_id.replace("_", " ") : "Sin Escudería"}
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
      </div>
    </div>
  );
}
