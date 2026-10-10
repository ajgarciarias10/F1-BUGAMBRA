export interface RaceWinnerImageInput {
  raceName: string;
  splitName: string;
  winners: Array<{ name: string; position: number }>;
  creativeDirection?: string;
}

export function validateRaceWinnerImageInput(value: unknown): RaceWinnerImageInput | null {
  if (!value || typeof value !== "object") return null;
  const body = value as Record<string, unknown>;
  const raceName = typeof body.raceName === "string" ? body.raceName.trim() : "";
  const splitName = typeof body.splitName === "string" ? body.splitName.trim() : "";
  const creativeDirection = typeof body.creativeDirection === "string" ? body.creativeDirection.trim() : "";
  if (!raceName || raceName.length > 100 || !splitName || splitName.length > 100 || creativeDirection.length > 500) return null;
  if (!Array.isArray(body.winners) || body.winners.length < 1 || body.winners.length > 3) return null;
  const winners: RaceWinnerImageInput["winners"] = [];
  for (const winner of body.winners) {
    if (!winner || typeof winner !== "object") return null;
    const item = winner as Record<string, unknown>;
    const name = typeof item.name === "string" ? item.name.trim() : "";
    const position = item.position;
    if (!name || name.length > 80 || !Number.isSafeInteger(position) || Number(position) < 1 || Number(position) > 3) return null;
    winners.push({ name, position: Number(position) });
  }
  if (new Set(winners.map((winner) => winner.position)).size !== winners.length) return null;
  return { raceName, splitName, winners, ...(creativeDirection ? { creativeDirection } : {}) };
}

export function buildRaceWinnerImagePrompt(input: RaceWinnerImageInput): string {
  const podium = [...input.winners].sort((a, b) => a.position - b.position)
    .map((winner) => `${winner.position}${winner.position === 1 ? "st" : winner.position === 2 ? "nd" : "rd"}: ${winner.name}`)
    .join("; ");
  const direction = input.creativeDirection ? ` Administrator creative direction: ${input.creativeDirection}` : "";
  return `Create a celebratory, polished 16:9 motorsport race-podium illustration for the F1 Bugambra league, split ${input.splitName}, after ${input.raceName}. Show exactly these podium finishers in the correct order: ${podium}. Make the first-place finisher the central champion, with the other listed finishers alongside them. Use original, fictional racing suits and generic non-identifiable faces; do not invent team logos, sponsors, flags, lap times, or additional names. Keep the scene dynamic, tasteful, and suitable for a league social media post. Do not render text or lettering in the image; the admin will add verified labels later.${direction}`;
}

export async function generateRaceWinnerImage(
  apiKey: string,
  model: string,
  input: RaceWinnerImageInput,
  fetcher: typeof fetch = fetch,
): Promise<{ mimeType: string; data: string }> {
  const maxResponseBytes = 16 * 1024 * 1024;
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
  const response = await fetcher(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
    body: JSON.stringify({
      contents: [{ parts: [{ text: buildRaceWinnerImagePrompt(input) }] }],
      generationConfig: {
        responseModalities: ["IMAGE"],
        responseFormat: { image: { aspectRatio: "16:9" } },
      },
    }),
    signal: AbortSignal.timeout(90_000),
  });
  if (!response.ok) throw new Error(`Gemini returned ${response.status}`);
  const declaredLength = Number(response.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > maxResponseBytes) {
    throw new Error("Gemini image response exceeded the size limit");
  }
  if (!response.body) throw new Error("Gemini response body is empty");
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let responseBytes = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    responseBytes += value.byteLength;
    if (responseBytes > maxResponseBytes) {
      await reader.cancel();
      throw new Error("Gemini image response exceeded the size limit");
    }
    chunks.push(value);
  }
  const jsonBytes = new Uint8Array(responseBytes);
  let offset = 0;
  for (const chunk of chunks) {
    jsonBytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  const payload = JSON.parse(new TextDecoder().decode(jsonBytes)) as {
    candidates?: Array<{ content?: { parts?: Array<{ inlineData?: { mimeType?: string; data?: string } }> } }>;
  };
  const image = payload.candidates?.flatMap((candidate) => candidate.content?.parts ?? [])
    .map((part) => part.inlineData)
    .find((part) => part?.data && ["image/png", "image/jpeg", "image/webp"].includes(part.mimeType || ""));
  if (!image?.data || !image.mimeType) throw new Error("Gemini response did not contain an image");
  return { mimeType: image.mimeType, data: image.data };
}
