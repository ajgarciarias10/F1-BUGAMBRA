import { useEffect, useRef, useState } from "react";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { storage } from "../services/firebase";
import { UploadCloud, Loader2 } from "lucide-react";

interface Props {
  storagePath: string;           // e.g. "logos/split_1/equipo_rojo"
  currentUrl?: string;           // URL actual para preview
  onUpload: (url: string) => void;
  className?: string;
  size?: "sm" | "md";           // sm = inline para logos, md = cuadrado grande
}

export function StorageImageUpload({ storagePath, currentUrl, onUpload, className = "", size = "sm" }: Props) {
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | undefined>(currentUrl);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (progress === null) {
      setPreviewUrl(currentUrl);
    }
  }, [currentUrl, progress]);

  const handleFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      setError("Solo se permiten imágenes.");
      return;
    }
    setError("");
    setProgress(0);

    const storageRef = ref(storage, storagePath);
    const task = uploadBytesResumable(storageRef, file);

    task.on(
      "state_changed",
      snap => setProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)),
      err => { setError(err.message); setProgress(null); },
      async () => {
        const url = await getDownloadURL(task.snapshot.ref);
        setProgress(null);
        setPreviewUrl(`${url}?t=${Date.now()}`);
        onUpload(url);
      }
    );
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

  const isUploading = progress !== null;
  const displayUrl = previewUrl || currentUrl;

  if (size === "sm") {
    return (
      <div className={`flex items-center gap-1.5 ${className}`}>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onInputChange} />
        {displayUrl ? (
          <img
            src={displayUrl}
            className="w-7 h-7 object-contain shrink-0 bg-white/[0.03] p-0.5 border border-white/10"
            onClick={() => fileRef.current?.click()}
            title="Clic para cambiar imagen"
            style={{ cursor: "pointer" }}
          />
        ) : (
          <div
            className="w-7 h-7 bg-white/[0.03] border border-dashed border-white/20 flex items-center justify-center cursor-pointer hover:border-[#e10600]/50 transition-colors shrink-0"
            onClick={() => fileRef.current?.click()}
          >
            {isUploading
              ? <Loader2 className="w-3.5 h-3.5 text-amber-400 animate-spin" />
              : <UploadCloud className="w-3.5 h-3.5 text-white/20" />
            }
          </div>
        )}
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={isUploading}
          className="text-[9px] font-mono uppercase tracking-wider text-white/30 hover:text-white/70 transition-colors disabled:opacity-40 whitespace-nowrap"
        >
          {isUploading ? `${progress}%` : "Subir imagen"}
        </button>
        {error && <span className="text-[9px] text-red-400 font-mono truncate max-w-[120px]" title={error}>Error</span>}
      </div>
    );
  }

  // size === "md"
  return (
    <div
      className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-all ${className} ${
        isUploading ? "border-amber-500/40 bg-amber-500/5" : "border-white/10 hover:border-[#e10600]/40 bg-black/20"
      }`}
      onClick={() => !isUploading && fileRef.current?.click()}
      onDrop={onDrop}
      onDragOver={e => e.preventDefault()}
    >
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onInputChange} />
      {isUploading ? (
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
          <span className="text-xs font-mono text-amber-400">{progress}%</span>
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
