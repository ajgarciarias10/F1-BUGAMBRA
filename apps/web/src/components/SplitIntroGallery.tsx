import { useMemo, useState } from "react";
import { Play, X } from "lucide-react";
import { getSplitIntroUrl, getYoutubeEmbedUrl, getYoutubeThumbnailUrl } from "../utils/youtube";

/**
 * Los tráilers de todas las temporadas, para la parrilla de F1 Bugambra TV.
 *
 * Es el único sitio donde salen: antes se repetían en Equipos y en la
 * clasificación general, y el mismo vídeo aparecía tres veces por navegación.
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
      <div className="rail-title mb-4">Tráilers de las temporadas</div>

      {activo && (
        <div className="m-card m-expand mb-4 border border-line">
          <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-2.5">
            <span className="truncate text-[13px] font-bold uppercase tracking-tight">
              Intro · {activo.split.nombre}
            </span>
            <button
              onClick={() => setAbierto("")}
              aria-label="Cerrar vídeo"
              className="-mr-2 grid h-10 w-10 shrink-0 place-items-center text-surface-2 hover:text-ink"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="aspect-video w-full bg-surface">
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
                  ? "border-brand"
                  : "border-line hover:border-brand/50"
              }`}
            >
              <div className="relative aspect-video w-full bg-surface">
                {miniatura && (
                  <img
                    src={miniatura}
                    alt=""
                    loading="lazy"
                    className="h-full w-full object-cover opacity-80 transition-opacity group-hover:opacity-100"
                  />
                )}
                <span className="absolute inset-0 grid place-items-center">
                  <span className="grid h-11 w-11 place-items-center rounded-full bg-brand text-brand-ink shadow-lg">
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
