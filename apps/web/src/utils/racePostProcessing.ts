export function raceRatingFailureMessage(splitId: string, message: string): string | null {
  const prefix = `Error recalculando OVR de ${splitId}:`;
  if (!message.startsWith(prefix)) return null;
  const detail = message.slice(prefix.length).trim();
  return `Los resultados y puntos de la carrera sí se guardaron, pero falló el recálculo del OVR${detail ? `: ${detail}` : "."} Puedes reintentarlo con «Recalcular puntos y rating» en Datos y mantenimiento.`;
}

export class RaceRatingRecalculationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RaceRatingRecalculationError";
  }
}
