import { useEffect, useMemo, useState } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { AlertTriangle, Check, Clapperboard, Eye, EyeOff, Loader2, Trash2 } from "lucide-react";
import { db } from "../services/firebase";
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
  publicada: { texto: "Publicada", clase: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" },
  heredada: { texto: "Por defecto", clase: "border-sky-500/30 bg-sky-500/10 text-sky-300" },
  sin_intro: { texto: "Sin intro", clase: "border-white/15 bg-white/5 text-white/45" },
};

function SplitIntroRow({ split }: { split: any }) {
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
  };

  const miniatura = videoId ? getYoutubeThumbnailUrl(limpio) : "";

  return (
    <div className="m-card border border-white/10 bg-white/[0.02] p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-black uppercase tracking-tight text-white">{split.nombre}</span>
        <span className={`rounded-full border px-2 py-0.5 text-[11px] font-bold ${ETIQUETA[estado.tipo].clase}`}>
          {ETIQUETA[estado.tipo].texto}
        </span>
        {split.activo && (
          <span className="rounded-full border border-[#e10600]/30 bg-[#e10600]/10 px-2 py-0.5 text-[11px] font-bold text-[#e10600]">
            En portada
          </span>
        )}
      </div>

      {estado.tipo === "heredada" && (
        <p className="mt-2 text-[12px] leading-relaxed text-sky-300/80">
          Este split todavía usa su intro histórica. Guarda una URL para sustituirla, o pulsa «Quitar» para dejarlo sin vídeo.
        </p>
      )}

      <div className="mt-3 flex flex-col gap-2 md:flex-row md:items-start">
        {miniatura ? (
          <img
            src={miniatura}
            alt=""
            loading="lazy"
            className="h-20 w-full shrink-0 rounded-lg border border-white/10 object-cover md:w-36"
          />
        ) : (
          <div className="grid h-20 w-full shrink-0 place-items-center rounded-lg border border-dashed border-white/10 text-white/20 md:w-36">
            <Clapperboard className="h-6 w-6" />
          </div>
        )}

        <div className="min-w-0 flex-1">
          <label className="mb-1 block text-[12px] font-semibold text-white/50">URL de YouTube</label>
          <input
            type="url"
            value={valor}
            onChange={event => setValor(event.target.value)}
            placeholder="https://www.youtube.com/watch?v=..."
            className={`min-h-12 w-full rounded-xl border bg-black/30 px-3 text-white outline-none transition-colors md:min-h-0 md:rounded-none md:py-2 md:text-sm ${
              urlInvalida ? "border-[#e10600]" : "border-white/15 focus:border-[#e10600]"
            }`}
          />
          {urlInvalida && (
            <p className="mt-1.5 flex items-center gap-1.5 text-[12px] text-[#e10600]">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              No reconozco esa dirección. Vale un enlace de youtube.com/watch, youtu.be, /shorts o /embed.
            </p>
          )}

          <div className="mt-2 flex flex-wrap gap-2">
            <button
              onClick={() => guardar(limpio)}
              disabled={guardando || urlInvalida || sinCambios}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#e10600] px-4 text-[13px] font-bold text-white transition-colors hover:bg-[#ff241c] disabled:opacity-35 md:min-h-0 md:rounded-none md:py-2 md:text-[10px] md:font-black md:uppercase md:tracking-wider"
            >
              {guardando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              Guardar
            </button>

            {videoId && (
              <button
                onClick={() => setPrevisualizando(open => !open)}
                className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/15 px-4 text-[13px] font-bold text-white/70 transition-colors hover:text-white md:min-h-0 md:rounded-none md:py-2 md:text-[10px] md:font-black md:uppercase md:tracking-wider"
              >
                {previsualizando ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                {previsualizando ? "Ocultar" : "Previsualizar"}
              </button>
            )}

            {estado.tipo !== "sin_intro" && (
              <button
                onClick={() => { setValor(""); void guardar(""); }}
                disabled={guardando}
                className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/15 px-4 text-[13px] font-bold text-white/50 transition-colors hover:border-[#e10600]/50 hover:text-[#e10600] disabled:opacity-35 md:min-h-0 md:rounded-none md:py-2 md:text-[10px] md:font-black md:uppercase md:tracking-wider"
              >
                <Trash2 className="h-4 w-4" /> Quitar
              </button>
            )}
          </div>

          {aviso && <p className="mt-2 text-[12px] text-white/60">{aviso}</p>}
        </div>
      </div>

      {previsualizando && videoId && (
        <div className="mt-3 aspect-video w-full overflow-hidden rounded-lg bg-black">
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
    <section className="m-card border border-white/10 bg-white/[0.03] p-4">
      <div className="flex items-start gap-3">
        <div className="bg-[#e10600]/10 p-2 text-[#e10600]">
          <Clapperboard className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <h2 className="text-lg font-black uppercase tracking-tight">Intros de los splits</h2>
          <p className="mt-1 text-[13px] leading-relaxed text-white/50">
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
          <p className="py-6 text-center text-[13px] text-white/30">No hay splits cargados.</p>
        )}
      </div>
    </section>
  );
}
