// Carta de un piloto tal como estaba en una temporada: la escudería y la valoración de ese split,
// también para pilotos que ya no corren (decisión del dueño). Porta `cartaDeTemporada` de
// docs/redesign/prototipo-gemini/generador/liga-block.js.
import type { EstadoResultado, Temporada } from "./tipos";

export type NivelCarta = "ELITE" | "PRO" | "ADV" | "CORE";

/** Los mismos cortes que `components/PilotCardF1.tsx`. Sin valoración no hay nivel. */
export function nivelDe(rating: number | null | undefined): NivelCarta | null {
  if (typeof rating !== "number" || !Number.isFinite(rating)) return null;
  return rating >= 90 ? "ELITE" : rating >= 85 ? "PRO" : rating >= 80 ? "ADV" : "CORE";
}

export interface CarreraCarta {
  circuitoId: string;
  numero: number;
  nombre: string;
  estado: EstadoResultado;
  puesto: number | null;
  puntos: number;
  vueltaRapida: boolean;
  pilotoDelDia: boolean;
}

export interface CartaPiloto {
  pilotoId: string;
  nombre: string;
  fotoUrl?: string;
  temporadaId: string;
  temporada: string;
  /** Escudería de esa temporada; null en Origins (individual). */
  equipoId: string | null;
  equipoNombre: string | null;
  rating: number | null;
  nivel: NivelCarta | null;
  puntos: number;
  carreras: number;
  /** Contadas solo con puestos registrados (o deducidos en Origins); nunca con los puntos. */
  victorias: number;
  podios: number;
  poles: number;
  vueltasRapidas: number;
  dnfs: number;
  /** Carreras con el acta marcando «limpio»; las que no lo dicen no cuentan. */
  limpias: number;
  /** Media de los puestos registrados; null si no hay ninguno. */
  mediaCarrera: number | null;
  mediaPuntos: number | null;
  evolucion: CarreraCarta[];
}

export function cartaDeTemporada(t: Temporada, pilotoId: string): CartaPiloto | null {
  const p = t.pilotos[pilotoId];
  if (!p) return null;
  const corridas = t.gps.filter(g => g.disputada && g.resultados[pilotoId] && g.resultados[pilotoId].estado !== "no_corrio");
  const res = corridas.map(g => g.resultados[pilotoId]);
  const cuenta = (f: (r: (typeof res)[number]) => boolean) => res.filter(f).length;
  const puestos = res.map(r => r.puesto).filter((n): n is number => n !== null);
  const media = (xs: number[]) => xs.length ? Math.round(xs.reduce((s, x) => s + x, 0) / xs.length * 10) / 10 : null;
  return {
    pilotoId, nombre: p.nombre, fotoUrl: p.fotoUrl, temporadaId: t.id, temporada: t.nombre,
    equipoId: p.equipoId,
    equipoNombre: p.equipoId ? t.equipos.find(e => e.equipoId === p.equipoId)?.nombre ?? null : null,
    rating: p.rating, nivel: nivelDe(p.rating), puntos: p.puntos, carreras: corridas.length,
    victorias: cuenta(r => r.puesto === 1),
    podios: cuenta(r => r.puesto !== null && r.puesto <= 3),
    poles: cuenta(r => r.qualy === 1 || r.origins?.pole === true),
    vueltasRapidas: cuenta(r => r.vueltaRapida),
    dnfs: cuenta(r => r.estado === "dnf"),
    limpias: cuenta(r => r.limpio === true),
    mediaCarrera: media(puestos),
    mediaPuntos: corridas.length ? Math.round(p.puntosResultados / corridas.length * 10) / 10 : null,
    evolucion: corridas.map(g => {
      const r = g.resultados[pilotoId];
      return {
        circuitoId: g.circuitoId, numero: g.numero, nombre: g.nombre, estado: r.estado, puesto: r.puesto,
        puntos: r.puntos, vueltaRapida: r.vueltaRapida, pilotoDelDia: r.origins?.pilotoDelDia === true,
      };
    }),
  };
}
