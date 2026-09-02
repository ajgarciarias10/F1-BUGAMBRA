export function getYoutubeEmbedUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return "";

  try {
    const parsed = new URL(trimmed);
    const host = parsed.hostname.replace(/^www\./, "");

    if (host === "youtu.be") {
      const id = parsed.pathname.replace(/^\//, "").split("/")[0];
      return id ? `https://www.youtube-nocookie.com/embed/${id}?rel=0` : "";
    }

    if (host.endsWith("youtube.com")) {
      const embedId = parsed.pathname.match(/\/embed\/([^/]+)/)?.[1];
      if (embedId) return `https://www.youtube-nocookie.com/embed/${embedId}?rel=0`;

      const shortsId = parsed.pathname.match(/\/shorts\/([^/]+)/)?.[1];
      if (shortsId) return `https://www.youtube-nocookie.com/embed/${shortsId}?rel=0`;

      const watchId = parsed.searchParams.get("v");
      if (watchId) return `https://www.youtube-nocookie.com/embed/${watchId}?rel=0`;
    }
  } catch {
    return "";
  }

  return "";
}

export function getSplitIntroUrl(splitId: string, explicitUrl?: string | null): string {
  const url = (explicitUrl || "").trim();
  if (url) return url;

  if (splitId === "origins") return "https://youtu.be/5OLFg1W5LzU";
  if (splitId === "split_1") return "https://www.youtube.com/watch?v=PCj87_WObys";
  if (splitId === "split_2") return "https://www.youtube.com/watch?v=I3Ou8CxbU1I";
  return "";
}
