export function getYoutubeVideoId(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return "";

  try {
    const parsed = new URL(trimmed);
    const host = parsed.hostname.replace(/^www\./, "");

    if (host === "youtu.be") {
      return parsed.pathname.replace(/^\//, "").split("/")[0] || "";
    }

    if (host.endsWith("youtube.com")) {
      const embedId = parsed.pathname.match(/\/embed\/([^/]+)/)?.[1];
      if (embedId) return embedId;

      const shortsId = parsed.pathname.match(/\/shorts\/([^/]+)/)?.[1];
      if (shortsId) return shortsId;

      const watchId = parsed.searchParams.get("v");
      if (watchId) return watchId;
    }
  } catch {
    return "";
  }

  return "";
}

export function getYoutubeEmbedUrl(url: string): string {
  const id = getYoutubeVideoId(url);
  return id ? `https://www.youtube-nocookie.com/embed/${id}?rel=0` : "";
}

export function getYoutubeThumbnailUrl(url: string): string {
  const id = getYoutubeVideoId(url);
  return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : "";
}

/** Intros originales de los splits históricos, anteriores a que el campo fuese editable.
 *  Solo se usan cuando el split nunca ha guardado un valor. */
const INTROS_POR_DEFECTO: Record<string, string> = {
  origins: "https://youtu.be/5OLFg1W5LzU",
  split_1: "https://www.youtube.com/watch?v=PCj87_WObys",
  split_2: "https://www.youtube.com/watch?v=I3Ou8CxbU1I",
};

export function getDefaultSplitIntroUrl(splitId: string): string {
  return INTROS_POR_DEFECTO[splitId] ?? "";
}

/**
 * URL de la intro de un split.
 *
 * Distingue tres estados a propósito, porque si no el admin no podía quitar la
 * intro de un split histórico: guardaba el campo vacío y volvía a salir la de
 * por defecto.
 *  - `undefined` / `null` -> nunca se editó: se usa la intro histórica si la hay.
 *  - `""` -> el admin la quitó deliberadamente: no hay intro.
 *  - una URL -> la que haya guardado el admin.
 */
export function getSplitIntroUrl(splitId: string, explicitUrl?: string | null): string {
  if (explicitUrl == null) return getDefaultSplitIntroUrl(splitId);
  return explicitUrl.trim();
}
