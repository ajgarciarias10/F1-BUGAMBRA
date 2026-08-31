import { useEffect, useRef, useState } from "react";
import { UploadCloud, Loader2 } from "lucide-react";
import { compressAndConvertImage } from "../utils/imageHelper";

interface Props {
  storagePath?: string;          // Mantenido por compatibilidad, ya no se usa
  currentUrl?: string;           // URL actual para preview
  onUpload: (url: string) => void;
  className?: string;
  size?: "sm" | "md";
}

export function StorageImageUpload({ currentUrl, onUpload, className = "", size = "sm" }: Props) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | undefined>(currentUrl);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!uploading) setPreviewUrl(currentUrl);
  }, [currentUrl, uploading]);

  const handleFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setError("Solo se permiten imágenes.");
      return;
    }
    setError("");
    setUploading(true);
    try {
      const maxDim = size === "sm" ? 400 : 800;
      const base64 = await compressAndConvertImage(file, maxDim, maxDim, 0.82);
      setPreviewUrl(base64);
      onUpload(base64);
    } catch (err: any) {
      setError(err.message || "Error al procesar imagen.");
    } finally {
      setUploading(false);
    }
  };

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = "";
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const displayUrl = previewUrl || currentUrl;

  if (size === "sm") {
    return (
      <div className={`flex items-center gap-1.5 ${className}`}>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onInputChange} />
        {displayUrl ? (
          <img
            src={displayUrl}
            className="w-7 h-7 object-contain shrink-0 bg-white/[0.03] p-0.5 border border-white/10 cursor-pointer"
            onClick={() => fileRef.current?.click()}
            title="Clic para cambiar imagen"
          />
        ) : (
          <div
            className="w-7 h-7 bg-white/[0.03] border border-dashed border-white/20 flex items-center justify-center cursor-pointer hover:border-[#e10600]/50 transition-colors shrink-0"
            onClick={() => fileRef.current?.click()}
          >
            {uploading
              ? <Loader2 className="w-3.5 h-3.5 text-amber-400 animate-spin" />
              : <UploadCloud className="w-3.5 h-3.5 text-white/20" />
            }
          </div>
        )}
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="text-[9px] font-mono uppercase tracking-wider text-white/30 hover:text-white/70 transition-colors disabled:opacity-40 whitespace-nowrap"
        >
          {uploading ? "Procesando..." : "Subir imagen"}
        </button>
        {error && <span className="text-[9px] text-red-400 font-mono truncate max-w-[120px]" title={error}>Error</span>}
      </div>
    );
  }

  // size === "md"
  return (
    <div
      className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-all ${className} ${
        uploading ? "border-amber-500/40 bg-amber-500/5" : "border-white/10 hover:border-[#e10600]/40 bg-black/20"
      }`}
      onClick={() => !uploading && fileRef.current?.click()}
      onDrop={onDrop}
      onDragOver={e => e.preventDefault()}
    >
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onInputChange} />
      {uploading ? (
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
          <span className="text-xs font-mono text-amber-400">Procesando...</span>
        </div>
      ) : displayUrl ? (
        <div className="flex flex-col items-center gap-2">
          <img src={displayUrl} className="h-16 w-auto object-contain mx-auto" />
          <span className="text-[10px] text-white/30 font-mono">Clic o arrastra para cambiar</span>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2">
          <UploadCloud className="w-8 h-8 text-white/20 mx-auto" />
          <span className="text-[10px] text-white/40 font-mono uppercase tracking-wider">Clic o arrastra imagen aquí</span>
        </div>
      )}
      {error && <p className="text-[10px] text-red-400 font-mono mt-1">{error}</p>}
    </div>
  );
}
