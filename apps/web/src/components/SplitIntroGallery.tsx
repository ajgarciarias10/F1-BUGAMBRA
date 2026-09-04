import { useMemo, useState } from "react";
import { Play, X } from "lucide-react";
import { getSplitIntroUrl, getYoutubeEmbedUrl, getYoutubeThumbnailUrl } from "../utils/youtube";

/**
 * Las intros de todas las temporadas, para la vista de Mundial.
 *
 * En una temporada concreta se muestra su propio vídeo; el Mundial es la vista
 * histórica de la liga, así que aquí tiene sentido el archivo completo.
 */
export function SplitIntroGallery({ splits }: { splits: any[] }) {
  const [abierto, setAbierto] = useState<string>("");

  const conIntro = useMemo(
    () => (splits || [])
      .map(split => ({ split, url: getSplitIntroUrl(split.id, split.video_intro) }))
      .filter(item => item.url)
      .sort((a, b) => (a.split.orden ?? 0) - (b.split.orden ?? 0)),
    [splits],
  );

  if (conIntro.length === 0) return null;

  const activo = conIntro.find(item => item.split.id === abierto);

  return (
    <section>
      <div className="rail-title mb-4">Vídeos de la liga</div>

      {activo && (
        <div className="m-card m-expand mb-4 border border-[#0a0a0a]/[0.08] dark:border-white/[0.08]">
          <div className="flex items-center justify-between gap-3 border-b border-[#0a0a0a]/[0.08] px-4 py-2.5 dark:border-white/[0.08]">
            <span className="truncate text-[13px] font-black uppercase tracking-tight">
              Intro · {activo.split.nombre}
            </span>
            <button
              onClick={() => setAbierto("")}
              aria-label="Cerrar vídeo"
              className="-mr-2 grid h-10 w-10 shrink-0 place-items-center text-[#0a0a0a]/40 hover:text-[#0a0a0a] dark:text-white/40 dark:hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="aspect-video w-full bg-black">
            <iframe
              className="h-full w-full"
              src={getYoutubeEmbedUrl(activo.url)}
              title={`Intro de ${activo.split.nombre}`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
        {conIntro.map(({ split, url }) => {
          const miniatura = getYoutubeThumbnailUrl(url);
          const activa = split.id === abierto;
          return (
            <button
              key={split.id}
              onClick={() => setAbierto(activa ? "" : split.id)}
              aria-pressed={activa}
              className={`m-card group relative overflow-hidden border text-left transition-all active:scale-[0.99] ${
                activa
                  ? "border-[#e10600]"
                  : "border-[#0a0a0a]/[0.08] hover:border-[#e10600]/50 dark:border-white/[0.08]"
              }`}
            >
              <div className="relative aspect-video w-full bg-black">
                {miniatura && (
                  <img
                    src={miniatura}
                    alt=""
                    loading="lazy"
                    className="h-full w-full object-cover opacity-80 transition-opacity group-hover:opacity-100"
                  />
                )}
                <span className="absolute inset-0 grid place-items-center">
                  <span className="grid h-11 w-11 place-items-center rounded-full bg-[#e10600] text-white shadow-lg">
                    <Play className="h-5 w-5 fill-current" />
                  </span>
                </span>
              </div>
              <p className="truncate px-3 py-2.5 text-[13px] font-bold">{split.nombre}</p>
            </button>
          );
        })}
      </div>
    </section>
  );
}
