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

export function getSplitIntroUrl(splitId: string, explicitUrl?: string | null): string {
  const url = (explicitUrl || "").trim();
  if (url) return url;

  if (splitId === "origins") return "https://youtu.be/5OLFg1W5LzU";
  if (splitId === "split_1") return "https://www.youtube.com/watch?v=PCj87_WObys";
  if (splitId === "split_2") return "https://www.youtube.com/watch?v=I3Ou8CxbU1I";
  return "";
}
