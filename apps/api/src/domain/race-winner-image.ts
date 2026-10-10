export type RaceMediaCardType = "podium" | "winner" | "pole";

export interface RaceWinnerImageInput {
  raceName: string;
  splitName: string;
  winners: Array<{ name: string; position: number; photoUrl?: string }>;
  creativeDirection?: string;
  cardType?: RaceMediaCardType;
}

export function validateRaceWinnerImageInput(value: unknown): RaceWinnerImageInput | null {
  if (!value || typeof value !== "object") return null;
  const body = value as Record<string, unknown>;
  const raceName = typeof body.raceName === "string" ? body.raceName.trim() : "";
  const splitName = typeof body.splitName === "string" ? body.splitName.trim() : "";
  const creativeDirection = typeof body.creativeDirection === "string" ? body.creativeDirection.trim() : "";
  const rawCardType = typeof body.cardType === "string" ? body.cardType.trim().toLowerCase() : "podium";
  const cardType: RaceMediaCardType = rawCardType === "winner" || rawCardType === "pole" ? rawCardType : "podium";

  if (!raceName || raceName.length > 100 || !splitName || splitName.length > 100 || creativeDirection.length > 500) return null;
  if (!Array.isArray(body.winners) || body.winners.length < 1 || body.winners.length > 3) return null;
  const winners: RaceWinnerImageInput["winners"] = [];
  for (const winner of body.winners) {
    if (!winner || typeof winner !== "object") return null;
    const item = winner as Record<string, unknown>;
    const name = typeof item.name === "string" ? item.name.trim() : "";
    const position = item.position;
    if (!name || name.length > 80 || !Number.isSafeInteger(position) || Number(position) < 1 || Number(position) > 3) return null;
    const photoUrl = typeof item.photoUrl === "string" && item.photoUrl.length <= 500_000 ? item.photoUrl : undefined;
    winners.push({ name, position: Number(position), ...(photoUrl ? { photoUrl } : {}) });
  }
  if (new Set(winners.map((winner) => winner.position)).size !== winners.length) return null;
  return { raceName, splitName, winners, cardType, ...(creativeDirection ? { creativeDirection } : {}) };
}

export function buildRaceWinnerImagePrompt(input: RaceWinnerImageInput): string {
  const cardType = input.cardType || "podium";
  const sortedWinners = [...input.winners].sort((a, b) => a.position - b.position);
  const p1 = sortedWinners.find((w) => w.position === 1);
  const p2 = sortedWinners.find((w) => w.position === 2);
  const p3 = sortedWinners.find((w) => w.position === 3);

  if (cardType === "winner" || cardType === "pole") {
    const featuredDriver = p1 || sortedWinners[0];
    const headerTitle = cardType === "pole" ? "POLE" : "WINNER";
    const subTitle = cardType === "pole" ? "QUALIFYING // POLE POSITION" : "RACE // WINNER";
    const direction = input.creativeDirection ? ` Creative direction note: ${input.creativeDirection}` : "";

    return `Official Formula 1 ${headerTitle} announcement poster graphic for ${featuredDriver.name} at ${input.raceName} Grand Prix (${input.splitName}).
Design style & layout:
- Format: Vertical 4:5 modern motorsport social media graphic poster.
- Subject: Frontal upper-body hero portrait of driver ${featuredDriver.name} wearing professional racing overalls in the upper portion.
- Background: Vibrant deep cobalt blue backdrop with repeating geometric "SPRINT" angled typography watermark pattern in lighter electric blue tones.
- Bottom graphic overlay: Clean crisp white angled banner across the lower third.
- Typography: Prominent, massive bold black uppercase lettering "${headerTitle}" in wide modern motorsport font across the lower section. Below it, clean minimalist text: "${subTitle} // ${input.raceName.toUpperCase()}".
- Match driver features, hairstyle, and appearance faithfully to the driver profile photos provided.
- Professional graphic design presentation suitable for official motorsport social media channels.${direction}`;
  }

  const podiumOrder = sortedWinners
    .map((w) => `${w.position === 1 ? "1st: " : w.position === 2 ? "2nd: " : "3rd: "}${w.name} (${w.position === 1 ? "WINNER / CHAMPION" : w.position === 2 ? "RUNNER-UP" : "THIRD PLACE"})`)
    .join("; ");

  const hasPhotos = sortedWinners.some((w) => Boolean(w.photoUrl));
  const photoInstruction = hasPhotos
    ? "FAITHFUL DRIVER LIKENESS: Attached are the official driver profile photos. Accurately capture each driver's distinctive facial structure, hair style, facial hair, and appearance from their driver profile photos. Specifically: " +
      sortedWinners
        .filter((w) => Boolean(w.photoUrl))
        .map((w) => `[Reference photo for ${w.name}: depict them on the podium step for position ${w.position}]`)
        .join(". ")
    : "Portray each podium finisher matching realistic features suitable for official league media.";

  const spatialPodiumInstruction = [
    p1 ? `- CENTER PODIUM STEP (Highest step #1): Driver ${p1.name} (WINNER). Must be on the top step in the middle holding the trophy/celebrating.` : "",
    p2 ? `- LEFT PODIUM STEP (Step #2): Driver ${p2.name} (RUNNER-UP). Must stand to the left of the winner on the 2nd place step.` : "",
    p3 ? `- RIGHT PODIUM STEP (Step #3): Driver ${p3.name} (THIRD PLACE). Must stand to the right of the winner on the 3rd place step.` : "",
  ].filter(Boolean).join("\n");

  const direction = input.creativeDirection ? ` Administrator creative direction: ${input.creativeDirection}` : "";

  return `Create a celebratory, ultra-high quality, polished 16:9 motorsport race-podium illustration for the F1 Bugambra league, split ${input.splitName}.
F1 champagne celebration on the podium at ${input.raceName} circuit. The drivers are joyfully spraying champagne bottles in an iconic Formula 1 podium tradition.

CRITICAL PODIUM POSITIONS AND EXACT DRIVER MAPPING:
${podiumOrder}

PODIUM STEPS PHYSICAL PLACEMENT:
${spatialPodiumInstruction}

Do NOT mix up or swap the drivers or their podium positions.
${photoInstruction}

ATTIRE & SCENE:
Drivers should wear professional modern racing overalls with clean styling; do not invent team logos, sponsors, flags, lap times, or text/lettering.
Keep the scene dynamic, celebratory with spraying champagne bottles and golden confetti at ${input.raceName} circuit podium, tasteful, and suitable for an official league poster.${direction}`;
}

export async function generateRaceWinnerImage(
  apiKey: string,
  model: string,
  input: RaceWinnerImageInput,
  fetcher: typeof fetch = fetch,
): Promise<{ mimeType: string; data: string }> {
  const maxResponseBytes = 16 * 1024 * 1024;
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
  const sortedWinners = [...input.winners].sort((a, b) => a.position - b.position);

  const parts: Array<Record<string, unknown>> = [{ text: buildRaceWinnerImagePrompt(input) }];

  for (const winner of sortedWinners) {
    if (winner.photoUrl) {
      const match = winner.photoUrl.match(/^data:(image\/[a-zA-Z0-9.+_-]+);base64,(.+)$/);
      if (match) {
        parts.push({
          text: `Driver Profile Photo reference for ${winner.name} who finished in position ${winner.position}:`,
        });
        parts.push({
          inlineData: {
            mimeType: match[1],
            data: match[2],
          },
        });
      }
    }
  }
  const response = await fetcher(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
    body: JSON.stringify({
      contents: [{ parts }],
      generationConfig: {
        responseModalities: ["IMAGE"],
      },
    }),
    signal: AbortSignal.timeout(90_000),
  });
  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(`Gemini returned ${response.status}: ${errorText}`);
  }
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
  if (!image?.data || !image.mimeType) {
    console.error("Gemini full payload without image:", JSON.stringify(payload).slice(0, 1000));
    throw new Error("Gemini response did not contain an image");
  }
  return { mimeType: image.mimeType, data: image.data };
}
