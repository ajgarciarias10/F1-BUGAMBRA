import { useState, useId } from "react";
import { Download, ImagePlus, Loader2, SendHorizontal, Trophy, Award, Flag, Copy, Check, Upload } from "lucide-react";
import { addDoc, collection } from "firebase/firestore";
import { db } from "../services/firebase";
import { useAuth } from "../contexts/AuthContext";
import { requestRaceWinnerImage, type RaceImageWinner } from "../services/raceWinnerImageService";

import { useSingleFlight } from "../hooks/useSingleFlight";
interface Props {
  raceName: string;
  splitName: string;
  winners: RaceImageWinner[];
  poleWinner?: RaceImageWinner;
}

type CardMode = "podium" | "winner" | "pole";

export function RaceWinnersImagePanel({ raceName, splitName, winners, poleWinner }: Props) {
  const { run: runOnce, pending: pendingOnce } = useSingleFlight();
  const { user, userData } = useAuth();
  const fileInputId = useId();
  const [cardMode, setCardMode] = useState<CardMode>("podium");
  const [creativeDirection, setCreativeDirection] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [imageExtension, setImageExtension] = useState("png");
  const [busy, setBusy] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [message, setMessage] = useState("");
  const [copied, setCopied] = useState(false);

  const winnerP1 = winners.find((w) => w.position === 1);

  const buildPromptText = () => {
    const featured = cardMode === "winner" ? winnerP1 : cardMode === "pole" ? poleWinner : null;
    if (featured) {
      const isPole = cardMode === "pole";
      const headerTitle = isPole ? "POLE POSITION" : "WINNER";
      const subTitle = isPole ? "P1 QUALIFYING" : "P1 RACE";
      return `Create a bold, high-impact, modern motorsport official graphics poster for the F1 Bugambra league, ${splitName}.
Event: Official ${isPole ? "Pole Position" : "Race Winner"} poster for ${featured.name} at the ${raceName} Grand Prix.

Design style & layout:
- Format: Vertical 4:5 modern motorsport social media graphic poster.
- Subject: Frontal upper-body hero portrait of driver ${featured.name} wearing professional racing overalls in the upper portion.
- Background: Vibrant deep cobalt blue backdrop with repeating geometric "SPRINT" angled typography watermark pattern in lighter electric blue tones.
- Bottom graphic overlay: Clean crisp white angled banner across the lower third.
- Typography: Prominent, massive bold black uppercase lettering "${headerTitle}" in wide modern motorsport font across the lower section. Below it, clean minimalist text: "${subTitle} // ${raceName.toUpperCase()}".
- Match driver features, hairstyle, and appearance faithfully to the driver profile photo provided.${creativeDirection ? `\n- Creative direction: ${creativeDirection}` : ""}`;
    }

    const p1 = winners.find(w => w.position === 1);
    const p2 = winners.find(w => w.position === 2);
    const p3 = winners.find(w => w.position === 3);
    return `Create a celebratory, ultra-high quality, polished 16:9 motorsport race-podium illustration for the F1 Bugambra league, ${splitName}.
F1 champagne celebration on the podium at ${raceName} circuit. The drivers are joyfully spraying champagne bottles in an iconic Formula 1 podium tradition.

CRITICAL PODIUM POSITIONS AND EXACT DRIVER MAPPING:
1st: ${p1?.name || "Winner"} (WINNER / CHAMPION)
2nd: ${p2?.name || "Runner-up"} (RUNNER-UP)
3rd: ${p3?.name || "Third place"} (THIRD PLACE)

PODIUM STEPS PHYSICAL PLACEMENT:
- CENTER PODIUM STEP (Highest step #1): Driver ${p1?.name || "Winner"} (WINNER). Must be on the top step in the middle holding the trophy/celebrating.
- LEFT PODIUM STEP (Step #2): Driver ${p2?.name || "Runner-up"} (RUNNER-UP). Must stand to the left of the winner on the 2nd place step.
- RIGHT PODIUM STEP (Step #3): Driver ${p3?.name || "Third place"} (THIRD PLACE). Must stand to the right of the winner on the 3rd place step.

Do NOT mix up or swap the drivers or their podium positions.
FAITHFUL DRIVER LIKENESS: Attached are the official driver profile photos. Accurately capture each driver's distinctive facial structure, hair style, facial hair, and appearance from their driver profile photos.

ATTIRE & SCENE:
Drivers should wear professional modern racing overalls with clean styling; do not invent team logos, sponsors, flags, lap times, or text/lettering.
Keep the scene dynamic, celebratory with spraying champagne bottles and golden confetti at ${raceName} circuit podium, tasteful, and suitable for an official league poster.${creativeDirection ? `\nCreative direction: ${creativeDirection}` : ""}`;
  };

  const copyImageBlob = async (photoUrl: string, name: string) => {
    try {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = photoUrl;
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth || img.width;
      canvas.height = img.naturalHeight || img.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("No canvas context");
      ctx.drawImage(img, 0, 0);
      canvas.toBlob(async (blob) => {
        if (!blob) throw new Error("No blob generated");
        await navigator.clipboard.write([
          new ClipboardItem({ "image/png": blob })
        ]);
        setMessage(`✓ Foto de ${name} copiada al portapapeles. Pégala (Ctrl+V) en Gemini o ChatGPT.`);
      }, "image/png");
    } catch (err) {
      console.warn("Could not copy image blob:", err);
      setMessage(`No se pudo copiar la foto de ${name} al portapapeles. Puedes descargarla con el botón de descargar.`);
    }
  };

  const copyFullPack = async () => {
    const plainText = buildPromptText();
    const targets = cardMode === "winner" && winnerP1 ? [winnerP1] : cardMode === "pole" && poleWinner ? [poleWinner] : winners;
    const htmlSnippet = `<div>
      <p style="white-space:pre-wrap;font-family:sans-serif;">${plainText.replace(/\n/g, "<br/>")}</p>
      <hr/>
      <h3>Fotos de referencia de los pilotos:</h3>
      ${targets.map(t => t.photoUrl ? `
        <div style="margin-bottom:12px;">
          <p><b>${t.name} (${t.position ? 'P' + t.position : 'Pole'}):</b></p>
          <img src="${t.photoUrl}" alt="${t.name}" style="max-width:260px;border-radius:8px;" />
        </div>` : '').join('')}
    </div>`;

    try {
      const textBlob = new Blob([plainText], { type: "text/plain" });
      const htmlBlob = new Blob([htmlSnippet], { type: "text/html" });
      await navigator.clipboard.write([
        new ClipboardItem({
          "text/plain": textBlob,
          "text/html": htmlBlob,
        })
      ]);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
      setMessage("✓ Pack completo (Prompt + Fotos) copiado al portapapeles. Al pegar (Ctrl+V) en Gemini o ChatGPT se incluirán el texto y las fotos.");
    } catch {
      await navigator.clipboard.writeText(plainText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
      setMessage("✓ Prompt copiado al portapapeles. Pégalo en Gemini o ChatGPT junto con las fotos.");
    }
  };

  const handleContainerPaste = (e: React.ClipboardEvent) => {
    const file = Array.from(e.clipboardData.files).find(f => f.type.startsWith("image/"));
    if (file) {
      e.preventDefault();
      const reader = new FileReader();
      reader.onload = () => {
        setImageUrl(reader.result as string);
        setImageExtension(file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg");
        setMessage("✓ Imagen pegada con éxito desde el portapapeles (Ctrl+V). Ya puedes previsualizarla o subirla al Paddock.");
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = Array.from(e.dataTransfer.files).find(f => f.type.startsWith("image/"));
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setImageUrl(reader.result as string);
        setImageExtension(file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg");
        setMessage("✓ Imagen arrastrada y cargada con éxito. Ya puedes previsualizarla o subirla al Paddock.");
      };
      reader.readAsDataURL(file);
    }
  };

  const copyPrompt = async () => {
    const text = buildPromptText();
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
      setMessage("✓ Prompt copiado al portapapeles. Pégalo en Gemini, ChatGPT o Midjourney junto a las fotos de los pilotos.");
    } catch {
      setMessage("No se pudo copiar automáticamente. Puedes seleccionarlo y copiarlo manualmente.");
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setImageUrl(reader.result as string);
      setImageExtension(file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg");
      setMessage("✓ Imagen externa cargada con éxito. Ya puedes previsualizarla, descargarla o subirla al Paddock Social.");
    };
    reader.readAsDataURL(file);
  };

  const generate = async () => {
    return runOnce(async () => {
    if (busy) return;
    const targets = cardMode === "winner"
      ? (winnerP1 ? [winnerP1] : [])
      : cardMode === "pole"
        ? (poleWinner ? [poleWinner] : [])
        : winners;

    if (targets.length === 0) {
      setMessage(`No hay piloto asignado para generar el cartel de ${cardMode === "pole" ? "la pole" : "ganador"}.`);
      return;
    }

    setBusy(true);
    setMessage("");
    setImageUrl("");
    try {
      const result = await requestRaceWinnerImage({
        raceName,
        splitName,
        winners: targets,
        creativeDirection,
        cardType: cardMode,
      });
      setImageUrl(`data:${result.mimeType};base64,${result.data}`);
      setImageExtension(result.mimeType === "image/jpeg" ? "jpg" : result.mimeType === "image/webp" ? "webp" : "png");
      setMessage("Imagen generada. Revísala antes de descargar o subir al paddock.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo generar la imagen.");
    } finally {
      setBusy(false);
    }
  });
};

  const publishToPaddock = async () => {
    return runOnce(async () => {
    if (!imageUrl || !user || !userData || publishing) return;
    setPublishing(true);
    try {
      const typeLabel = cardMode === "winner"
        ? `🏆 ¡Victoria de ${winnerP1?.name || "carrera"} en ${raceName}!`
        : cardMode === "pole"
          ? `⏱️ ¡Pole position de ${poleWinner?.name || "qualy"} en ${raceName}!`
          : `🏁 Podio oficial del GP de ${raceName} (${splitName})`;

      await addDoc(collection(db, "paddock_posts"), {
        author: userData.nombre || "FIA / Bugambra Admin",
        authorPhoto: userData.foto_url || "",
        text: typeLabel,
        mediaUrl: imageUrl,
        mediaType: "image",
        createdAt: new Date().toISOString(),
        authorId: user.uid,
        kind: "official_media",
        splitName,
      });
      setMessage("¡Imagen publicada con éxito en el Paddock!");
    } catch (err: any) {
      setMessage("Error al subir al paddock: " + (err.message || String(err)));
    } finally {
      setPublishing(false);
    }
  });
};

  return (
    <section
      id="race-winners-image"
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
      onPaste={handleContainerPaste}
      tabIndex={0}
      className="mt-4 scroll-mt-6 rounded-sm border border-violet/40 bg-violet-soft p-3 focus:outline-none focus:ring-1 focus:ring-violet/40"
    >
      {/* Selector de modo de cartel */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-3">
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => { setCardMode("podium"); setImageUrl(""); setMessage(""); }}
            className={`inline-flex items-center gap-1.5 rounded-sm px-2.5 py-1 text-xs font-bold transition-colors ${
              cardMode === "podium"
                ? "bg-violet-soft border border-violet/40 text-violet"
                : "bg-surface-3 text-ink-2 hover:bg-surface-3"
            }`}
          >
            <Trophy className="h-3.5 w-3.5" /> Podio 16:9
          </button>
          <button
            type="button"
            onClick={() => { setCardMode("winner"); setImageUrl(""); setMessage(""); }}
            className={`inline-flex items-center gap-1.5 rounded-sm px-2.5 py-1 text-xs font-bold transition-colors ${
              cardMode === "winner"
                ? "bg-violet-soft border border-violet/40 text-violet"
                : "bg-surface-3 text-ink-2 hover:bg-surface-3"
            }`}
          >
            <Award className="h-3.5 w-3.5" /> Cartel Ganador ({winnerP1?.name || "P1"})
          </button>
          {poleWinner && (
            <button
              type="button"
              onClick={() => { setCardMode("pole"); setImageUrl(""); setMessage(""); }}
              className={`inline-flex items-center gap-1.5 rounded-sm px-2.5 py-1 text-xs font-bold transition-colors ${
                cardMode === "pole"
                  ? "bg-violet-soft border border-violet/40 text-violet"
                  : "bg-surface-3 text-ink-2 hover:bg-surface-3"
              }`}
            >
              <Flag className="h-3.5 w-3.5" /> Cartel Pole ({poleWinner.name})
            </button>
          )}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-violet">
            {cardMode === "winner"
              ? `Cartel oficial ganador: ${winnerP1?.name || "1º puesto"}`
              : cardMode === "pole"
                ? `Cartel oficial pole: ${poleWinner?.name || "1º clasificación"}`
                : "Imagen del podio con champán"}
          </h3>
          <p className="mt-1 text-[11px] text-ink-2">
            {cardMode === "podium"
              ? "Ilustración 16:9 con champán y confeti en el podio."
              : "Cartel vertical con diseño gráfico oficial de F1 (fondo azul cobalto, texto grande y retrato del piloto)."}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            {(cardMode === "winner" && winnerP1 ? [winnerP1] : cardMode === "pole" && poleWinner ? [poleWinner] : winners).map((winner) => (
              <div
                key={winner.name}
                className="flex items-center gap-2.5 rounded-lg border border-line bg-surface-2 p-2 pr-3.5 shadow-sm"
              >
                <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full border-2 border-violet/40 bg-brand">
                  {winner.photoUrl ? (
                    <img
                      src={winner.photoUrl}
                      alt={winner.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center font-bold text-ink-muted text-xs">
                      {winner.name.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <span className="absolute bottom-0 right-0 rounded-full bg-violet-soft border border-violet/40 px-1 text-[8px] font-bold text-violet">
                    {winner.position ? `P${winner.position}` : "POLE"}
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="truncate text-xs font-bold text-ink">{winner.name}</p>
                  <p className="text-[10px]">
                    {winner.photoUrl ? (
                      <span className="text-ok font-medium">✓ Foto oficial vinculada</span>
                    ) : (
                      <span className="text-warn font-medium">⚠️ Sin foto asignada</span>
                    )}
                  </p>
                  {winner.photoUrl && (
                    <div className="flex items-center gap-1.5 mt-1">
                      <button
                        type="button"
                        onClick={() => copyImageBlob(winner.photoUrl!, winner.name)}
                        className="inline-flex items-center gap-1 rounded bg-surface-3 px-1.5 py-0.5 text-[9px] font-bold text-ink hover:bg-surface-3 transition-colors"
                        title={`Copiar foto de ${winner.name} al portapapeles`}
                      >
                        <Copy className="h-2.5 w-2.5" /> Copiar foto
                      </button>
                      <a
                        href={winner.photoUrl}
                        download={`foto-${winner.name.toLowerCase().replace(/\s+/g, "_")}.jpg`}
                        className="inline-flex items-center gap-1 rounded bg-surface-3 px-1.5 py-0.5 text-[9px] font-bold text-ink-2 hover:bg-surface-3 transition-colors"
                        title={`Descargar foto de ${winner.name}`}
                      >
                        <Download className="h-2.5 w-2.5" /> Descargar
                      </a>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={copyFullPack}
            className="flex min-h-10 items-center gap-1.5 rounded-sm border border-ok/40 bg-ok-soft px-3 text-xs font-bold text-ok hover:bg-ok-soft transition-colors shadow-sm"
            title="Copia el prompt y las imágenes de los pilotos juntas para pegarlos en Gemini o ChatGPT"
          >
            {copied ? <Check className="h-4 w-4 text-ok" /> : <Copy className="h-4 w-4" />}
            {copied ? "¡Pack copiado!" : "Copiar Pack (Prompt + Fotos)"}
          </button>

          <button
            type="button"
            onClick={copyPrompt}
            className="flex min-h-10 items-center gap-1.5 rounded-sm border border-violet/40 bg-violet-soft px-3 text-xs font-bold text-violet hover:bg-violet-soft transition-colors"
            title="Copia solo el texto del prompt"
          >
            <Copy className="h-4 w-4" />
            Copiar solo Prompt
          </button>

          <label
            htmlFor={fileInputId}
            className="flex min-h-10 cursor-pointer items-center gap-1.5 rounded-sm border border-line bg-surface-3 px-3 text-xs font-bold text-ink hover:bg-surface-3 transition-colors"
            title="Sube una imagen generada externamente o arrástrala al panel"
          >
            <Upload className="h-4 w-4 text-ink-2" />
            Cargar imagen
            <input
              id={fileInputId}
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
        </div>
      </div>

      <div className="mt-3 rounded border border-violet/40 bg-violet-soft p-2.5 text-[11px] text-violet">
        <div className="flex items-center gap-1.5 font-bold text-violet">
          <span>⚡ Flujo Copiar & Pegar (Sin límites de API):</span>
        </div>
        <ol className="mt-1 list-decimal list-inside space-y-1 text-ink text-[10px]">
          <li>Pulsa <b>«Copiar Pack (Prompt + Fotos)»</b> (o usa <b>«Copiar foto»</b> en cada piloto de arriba).</li>
          <li>Pégalos (<kbd className="px-1 py-0.5 bg-surface-2 border border-line rounded font-mono">Ctrl+V</kbd>) en <a href="https://gemini.google.com" target="_blank" rel="noreferrer" className="underline font-bold text-violet hover:text-violet">Gemini Web</a> o ChatGPT.</li>
          <li>Copia la imagen generada, haz clic en este recuadro y pulsa <kbd className="px-1 py-0.5 bg-surface-2 border border-line rounded font-mono">Ctrl+V</kbd> (o arrástrala aquí).</li>
          <li>Comprueba la vista previa y dale a <b>«Subir al Paddock Social»</b>.</li>
        </ol>
      </div>

      <label className="mt-3 block text-[10px] font-bold uppercase tracking-wide text-ink-2">
        Dirección creativa opcional
        <textarea
          value={creativeDirection}
          maxLength={500}
          onChange={(event) => setCreativeDirection(event.target.value)}
          placeholder={cardMode === "podium" ? "Ej.: celebración nocturna bajo confeti" : "Ej.: estilo carrera sprint nocturna"}
          className="mt-1 min-h-14 w-full resize-y rounded-sm border border-line bg-surface-2 p-2 text-xs normal-case tracking-normal text-ink outline-none focus:border-violet/40"
        />
      </label>

      {/* Vista previa desplegable del prompt */}
      <details className="mt-2 rounded-sm border border-line bg-surface-2 p-2 text-xs">
        <summary className="cursor-pointer text-[11px] font-bold text-violet hover:text-violet">
          Ver texto del Prompt ({cardMode === "podium" ? "Podio 16:9" : cardMode === "winner" ? "Cartel Ganador" : "Cartel Pole"})
        </summary>
        <pre className="mt-2 max-h-48 overflow-y-auto whitespace-pre-wrap font-mono text-[10px] text-ink-2 bg-surface-2 p-2 rounded">
          {buildPromptText()}
        </pre>
      </details>

      {message && <p role="status" className="mt-2 text-xs text-violet">{message}</p>}

      {imageUrl && (
        <div className="mt-3 space-y-2">
          <img
            src={imageUrl}
            alt={`Borrador de imagen de ${raceName}`}
            className="max-h-[520px] w-full rounded-sm border border-line object-contain bg-surface-2"
          />
          <div className="flex flex-wrap items-center gap-2">
            <a
              href={imageUrl}
              download={`bugambra-${splitName}-${raceName}-${cardMode}.${imageExtension}`}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-sm border border-line px-3 text-xs font-bold text-ink hover:bg-surface-3"
            >
              <Download className="h-3.5 w-3.5" /> Descargar imagen
            </a>
            <button aria-busy={pendingOnce || undefined}
              type="button"
              onClick={publishToPaddock}
              disabled={(publishing) || pendingOnce}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-sm bg-ok-soft border border-ok/40 px-3 text-xs font-bold text-ok hover:bg-ok-soft/20 disabled:opacity-50"
            >
              {publishing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <SendHorizontal className="h-3.5 w-3.5" />}
              {publishing ? "Publicando en el Paddock…" : "Subir al Paddock Social"}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
