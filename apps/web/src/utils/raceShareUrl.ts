export function buildRaceShareUrl(origin: string, splitId: string, circuitId: string): string {
  const url = new URL("/", origin);
  url.searchParams.set("tab", "resultados");
  url.searchParams.set("temporada", splitId);
  url.searchParams.set("carrera", circuitId);
  return url.toString();
}
