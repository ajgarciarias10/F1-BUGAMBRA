// Validación del acta antes de guardarla: la misma para el panel clásico y el diseño. Puro, con pruebas.
import type { RaceResult } from "../types";

/** Lo que el admin ha rellenado para un piloto que corrió (los que no corrieron no entran). */
export interface EntradaActa {
  pilotoId: string;
  nombre: string;
  qualyPos?: unknown;
  racePos?: unknown;
  isDnf?: boolean;
  isDnfOwnError?: boolean;
  fastestLap?: boolean;
  isClean?: boolean;
}

/**
 * Convierte el acta en resultados o lanza un error que se enseña tal cual: falta un puesto,
 * no hay exactamente una pole o una vuelta rápida, o hay puestos repetidos.
 */
export function resultadosDelActa(entradas: EntradaActa[]): RaceResult[] {
  const finalResults: RaceResult[] = entradas.map(item => {
    const enteredQualy = typeof item.qualyPos === "number" ? item.qualyPos : parseInt(item.qualyPos as any);
    const enteredRace = typeof item.racePos === "number" ? item.racePos : parseInt(item.racePos as any);
    const isDnf = item.isDnf === true;
    if (isNaN(enteredQualy) || enteredQualy <= 0) {
      throw new Error(`Falta la posición de clasificación de ${item.nombre}.`);
    }
    if (!isDnf && (isNaN(enteredRace) || enteredRace <= 0)) {
      throw new Error(`Falta la posición de carrera de ${item.nombre}.`);
    }
    return {
      pilotoId: item.pilotoId,
      pilotoNombre: item.nombre,
      qualyPos: enteredQualy,
      racePos: isDnf ? 99 : enteredRace,
      isDnf,
      isDnfOwnError: isDnf && item.isDnfOwnError === true,
      fastestLap: item.fastestLap === true,
      isClean: item.isClean !== false,
    } as RaceResult;
  });

  if (finalResults.filter(result => result.qualyPos === 1).length !== 1) {
    throw new Error("Debe seleccionarse exactamente una pole.");
  }
  if (finalResults.filter(result => result.fastestLap).length !== 1) {
    throw new Error("Debe seleccionarse exactamente una vuelta rápida.");
  }

  const duplicatePositions = (field: "qualyPos" | "racePos") => {
    const counts = new Map<number, number>();
    finalResults.forEach(result => {
      const position = result[field];
      if (position !== 99) counts.set(position, (counts.get(position) || 0) + 1);
    });
    return [...counts.entries()].filter(([, count]) => count > 1).map(([position]) => position);
  };
  const duplicateQualy = duplicatePositions("qualyPos");
  const duplicateRace = duplicatePositions("racePos");
  if (duplicateQualy.length || duplicateRace.length) {
    throw new Error(`Hay posiciones duplicadas: ${duplicateQualy.length ? `qualy ${duplicateQualy.join(", ")}` : ""}${duplicateQualy.length && duplicateRace.length ? " y " : ""}${duplicateRace.length ? `carrera ${duplicateRace.join(", ")}` : ""}.`);
  }
  return finalResults;
}
