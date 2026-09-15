export interface FichaPrevia {
  equipoId: string;
  datos_json: string;
}

export type ResultadoRevert = "restaurado" | "sin-foto" | "nada-que-restaurar";

export interface PlanRevert {
  /** Equipos de los que hay que borrar la ficha. Hay que borrar TODO antes de restaurar. */
  borrar: string[];
  restaurar: FichaPrevia[];
  resultado: ResultadoRevert;
}

/**
 * Decide qué hacer en el split siguiente al deshacer un fichaje.
 *
 * La versión anterior borraba solo la ficha del equipo del pacto y siempre
 * escribía una nueva en el equipo de origen. Eso dejaba copias duplicadas del
 * piloto y, cuando antes no tenía ficha, le inventaba un contrato que la tabla
 * mostraba como «Renovado». Aquí no se escribe nada que no estuviera guardado.
 *
 * `fichasPrevias` distingue dos casos que no son lo mismo:
 * - `null`: el pacto es anterior a que se guardara el estado previo. No se puede
 *   saber dónde estaba, así que se retira y se avisa al administrador.
 * - `[]`: antes del pacto no tenía ficha en el split siguiente. Se queda fuera.
 */
export function planRevertFichaje(
  existentes: { equipoId: string }[],
  fichasPrevias: FichaPrevia[] | null,
): PlanRevert {
  const borrar = existentes.map(ficha => ficha.equipoId);
  if (fichasPrevias == null) {
    return { borrar, restaurar: [], resultado: borrar.length > 0 ? "sin-foto" : "nada-que-restaurar" };
  }
  return {
    borrar,
    restaurar: fichasPrevias,
    resultado: fichasPrevias.length > 0 ? "restaurado" : "nada-que-restaurar",
  };
}
