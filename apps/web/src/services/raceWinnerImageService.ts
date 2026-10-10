import { auth } from "./auth";

export interface RaceImageWinner {
  name: string;
  position: number;
  photoUrl?: string;
}

export async function requestRaceWinnerImage(input: {
  raceName: string;
  splitName: string;
  winners: RaceImageWinner[];
  creativeDirection: string;
  cardType?: "podium" | "winner" | "pole";
}): Promise<{ mimeType: string; data: string }> {
  const user = auth.currentUser;
  if (!user) throw new Error("Inicia sesión como administrador para generar la imagen.");
  const token = await user.getIdToken();
  const apiBase = import.meta.env.VITE_API_URL?.replace(/\/$/, "") ?? "";
  const response = await fetch(`${apiBase}/api/media/race-winner-image`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(input),
  });
  const payload = await response.json().catch(() => ({})) as { error?: string; mimeType?: string; data?: string };
  if (!response.ok) throw new Error(payload.error || "No se pudo generar la imagen.");
  if (!payload.mimeType || !["image/png", "image/jpeg", "image/webp"].includes(payload.mimeType) || !payload.data) {
    throw new Error("La API no devolvió una imagen válida.");
  }
  return { mimeType: payload.mimeType, data: payload.data };
}
