import { useEffect, useMemo, useState } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { AlertTriangle, Check, Clapperboard, Eye, EyeOff, Loader2, Trash2 } from "lucide-react";
import { db } from "../services/firebase";
import { useSingleFlight } from "../hooks/useSingleFlight";
import {
  getDefaultSplitIntroUrl,
  getSplitIntroUrl,
  getYoutubeEmbedUrl,
  getYoutubeThumbnailUrl,
  getYoutubeVideoId,
} from "../utils/youtube";

type Estado =
  | { tipo: "publicada"; url: string }
  | { tipo: "heredada"; url: string }
  | { tipo: "sin_intro" };

function estadoDeSplit(split: any): Estado {
  const guardado: string | undefined = split?.video_intro;
  if (guardado == null) {
    const porDefecto = getDefaultSplitIntroUrl(split.id);
    return porDefecto ? { tipo: "heredada", url: porDefecto } : { tipo: "sin_intro" };
  }
  const url = guardado.trim();
  return url ? { tipo: "publicada", url } : { tipo: "sin_intro" };
}

const ETIQUETA: Record<Estado["tipo"], { texto: string; clase: string }> = {
  publicada: { texto: "Publicada", clase: "border-ok/40 bg-ok-soft text-ok" },
  heredada: { texto: "Por defecto", clase: "border-info/40 bg-info-soft text-info" },
  sin_intro: { texto: "Sin intro", clase: "border-line bg-surface-3 text-ink-muted" },
};

function SplitIntroRow({ split }: { split: any }) {
  const { run: runOnce, pending: pendingOnce } = useSingleFlight();
  const estado = estadoDeSplit(split);
  const urlActual = estado.tipo === "sin_intro" ? "" : estado.url;

  const [valor, setValor] = useState(urlActual);
  const [guardando, setGuardando] = useState(false);
  const [aviso, setAviso] = useState("");
  const [previsualizando, setPrevisualizando] = useState(false);

  // Si el split cambia por debajo (otro admin guardando, recarga de datos),
  // el campo sigue al dato salvo que el admin esté editándolo.
  useEffect(() => {
    setValor(urlActual);
  }, [urlActual]);

  const limpio = valor.trim();
  const videoId = getYoutubeVideoId(limpio);
  const urlInvalida = limpio !== "" && videoId === "";
  const sinCambios = limpio === urlActual.trim();

  const guardar = async (nuevoValor: string) => {
    return runOnce(async () => {
    setGuardando(true);
    setAviso("");
    try {
      // Se guarda "" en lugar de null a propósito: null significaría "nunca
      // editado" y haría reaparecer la intro histórica del split.
      await updateDoc(doc(db, "splits", split.id), { video_intro: nuevoValor });
      setAviso(nuevoValor ? "Intro guardada." : "Intro retirada.");
      setTimeout(() => setAviso(""), 3000);
    } catch (error: any) {
      setAviso(`Error al guardar: ${error.message}`);
    } finally {
      setGuardando(false);
    }
  });
};

  const miniatura = videoId ? getYoutubeThumbnailUrl(limpio) : "";

  return (
    <div className="m-card border border-line bg-surface-2 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-bold uppercase tracking-tight text-ink">{split.nombre}</span>
        <span className={`rounded-full border px-2 py-0.5 text-[11px] font-bold ${ETIQUETA[estado.tipo].clase}`}>
          {ETIQUETA[estado.tipo].texto}
        </span>
        {split.activo && (
          <span className="rounded-full border border-brand/30 bg-brand/10 px-2 py-0.5 text-[11px] font-bold text-brand">
            En portada
          </span>
        )}
      </div>

      {estado.tipo === "heredada" && (
        <p className="mt-2 text-[12px] leading-relaxed text-info">
          Este split todavía usa su intro histórica. Guarda una URL para sustituirla, o pulsa «Quitar» para dejarlo sin vídeo.
        </p>
      )}

      <div className="mt-3 flex flex-col gap-2 md:flex-row md:items-start">
        {miniatura ? (
          <img
            src={miniatura}
            alt=""
            loading="lazy"
            className="h-20 w-full shrink-0 rounded-lg border border-line object-cover md:w-36"
          />
        ) : (
          <div className="grid h-20 w-full shrink-0 place-items-center rounded-lg border border-dashed border-line text-ink-muted md:w-36">
            <Clapperboard className="h-6 w-6" />
          </div>
        )}

        <div className="min-w-0 flex-1">
          <label className="mb-1 block text-[12px] font-semibold text-ink-2">URL de YouTube</label>
          <input
            type="url"
            value={valor}
            onChange={event => setValor(event.target.value)}
            placeholder="https://www.youtube.com/watch?v=..."
            className={`min-h-12 w-full rounded-xl border bg-surface-2 px-3 text-ink outline-none transition-colors md:min-h-0 md:rounded-none md:py-2 md:text-sm ${
              urlInvalida ? "border-brand" : "border-line focus:border-brand"
            }`}
          />
          {urlInvalida && (
            <p className="mt-1.5 flex items-center gap-1.5 text-[12px] text-brand">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              No reconozco esa dirección. Vale un enlace de youtube.com/watch, youtu.be, /shorts o /embed.
            </p>
          )}

          <div className="mt-2 flex flex-wrap gap-2">
            <button aria-busy={pendingOnce || undefined}
              onClick={() => guardar(limpio)}
              disabled={(guardando || urlInvalida || sinCambios) || pendingOnce}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-brand px-4 text-[13px] font-bold text-brand-ink transition-colors hover:bg-brand-hover disabled:opacity-35 md:min-h-0 md:rounded-none md:py-2 md:text-[10px] md:font-bold md:uppercase md:tracking-wider"
            >
              {guardando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              Guardar
            </button>

            {videoId && (
              <button
                onClick={() => setPrevisualizando(open => !open)}
                className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-line px-4 text-[13px] font-bold text-ink-2 transition-colors hover:text-ink md:min-h-0 md:rounded-none md:py-2 md:text-[10px] md:font-bold md:uppercase md:tracking-wider"
              >
                {previsualizando ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                {previsualizando ? "Ocultar" : "Previsualizar"}
              </button>
            )}

            {estado.tipo !== "sin_intro" && (
              <button aria-busy={pendingOnce || undefined}
                onClick={() => { setValor(""); void guardar(""); }}
                disabled={(guardando) || pendingOnce}
                className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-line px-4 text-[13px] font-bold text-ink-2 transition-colors hover:border-brand/50 hover:text-brand disabled:opacity-35 md:min-h-0 md:rounded-none md:py-2 md:text-[10px] md:font-bold md:uppercase md:tracking-wider"
              >
                <Trash2 className="h-4 w-4" /> Quitar
              </button>
            )}
          </div>

          {aviso && <p className="mt-2 text-[12px] text-ink-2">{aviso}</p>}
        </div>
      </div>

      {previsualizando && videoId && (
        <div className="mt-3 aspect-video w-full overflow-hidden rounded-lg bg-surface">
          <iframe
            className="h-full w-full"
            src={getYoutubeEmbedUrl(limpio)}
            title={`Intro de ${split.nombre}`}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        </div>
      )}
    </div>
  );
}

export function SplitIntroPanel({ splits }: { splits: any[] }) {
  const ordenados = useMemo(
    () => [...(splits || [])].filter(split => split.id !== "global").sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0)),
    [splits],
  );

  const sinIntro = ordenados.filter(split => !getSplitIntroUrl(split.id, split.video_intro)).length;

  return (
    <section className="m-card border border-line bg-surface-2 p-4">
      <div className="flex items-start gap-3">
        <div className="bg-brand/10 p-2 text-brand">
          <Clapperboard className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <h2 className="text-lg font-bold uppercase tracking-tight">Intros de los splits</h2>
          <p className="mt-1 text-[13px] leading-relaxed text-ink-2">
            El vídeo que se muestra en la portada y en la pestaña de equipos de cada temporada.
            {sinIntro > 0 && ` Ahora mismo hay ${sinIntro} split(s) sin intro.`}
          </p>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {ordenados.map(split => (
          <SplitIntroRow key={split.id} split={split} />
        ))}
        {ordenados.length === 0 && (
          <p className="py-6 text-center text-[13px] text-ink-muted">No hay splits cargados.</p>
        )}
      </div>
    </section>
  );
}
