import { useState } from "react";
import { Download, ImagePlus, Loader2 } from "lucide-react";
import { requestRaceWinnerImage, type RaceImageWinner } from "../services/raceWinnerImageService";

interface Props {
  raceName: string;
  splitName: string;
  winners: RaceImageWinner[];
}

export function RaceWinnersImagePanel({ raceName, splitName, winners }: Props) {
  const [creativeDirection, setCreativeDirection] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [imageExtension, setImageExtension] = useState("png");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const generate = async () => {
    if (busy || winners.length === 0) return;
    setBusy(true);
    setMessage("");
    setImageUrl("");
    try {
      const result = await requestRaceWinnerImage({ raceName, splitName, winners, creativeDirection });
      setImageUrl(`data:${result.mimeType};base64,${result.data}`);
      setImageExtension(result.mimeType === "image/jpeg" ? "jpg" : result.mimeType === "image/webp" ? "webp" : "png");
      setMessage("Imagen generada. Revísala antes de descargar y publicar.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo generar la imagen.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section id="race-winners-image" className="mt-4 scroll-mt-6 rounded-sm border border-violet-400/20 bg-violet-400/[0.04] p-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-xs font-black uppercase tracking-wider text-violet-200">Imagen del podio con Gemini</h3>
          <p className="mt-1 text-[11px] text-white/50">Genera un borrador usando las posiciones guardadas. Se muestra aquí para revisión; no se publica automáticamente.</p>
          <p className="mt-2 text-[11px] text-white/70">{winners.map((winner) => `${winner.position}. ${winner.name}`).join(" · ")}</p>
        </div>
        <button type="button" onClick={generate} disabled={busy || winners.length === 0}
          className="flex min-h-10 items-center gap-2 rounded-sm bg-violet-500 px-3 text-xs font-bold text-white hover:bg-violet-400 disabled:opacity-50">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
          {busy ? "Generando…" : imageUrl ? "Generar otra" : "Generar imagen"}
        </button>
      </div>
      <label className="mt-3 block text-[10px] font-bold uppercase tracking-wide text-white/50">
        Dirección creativa opcional
        <textarea value={creativeDirection} maxLength={500} onChange={(event) => setCreativeDirection(event.target.value)}
          placeholder="Ej.: celebración nocturna bajo confeti azul y blanco"
          className="mt-1 min-h-16 w-full resize-y rounded-sm border border-white/10 bg-black/20 p-2 text-xs normal-case tracking-normal text-white outline-none focus:border-violet-400" />
      </label>
      {message && <p role="status" className="mt-2 text-xs text-white/70">{message}</p>}
      {imageUrl && <div className="mt-3">
        <img src={imageUrl} alt={`Borrador de imagen del podio de ${raceName}`} className="max-h-[480px] w-full rounded-sm border border-white/10 object-contain" />
        <a href={imageUrl} download={`bugambra-${splitName}-${raceName}-podio.${imageExtension}`}
          className="mt-2 inline-flex min-h-10 items-center gap-2 rounded-sm border border-white/20 px-3 text-xs font-bold text-white hover:bg-white/10">
          <Download className="h-4 w-4" /> Descargar borrador
        </a>
      </div>}
    </section>
  );
}
