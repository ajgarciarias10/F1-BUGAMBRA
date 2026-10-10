export const DEFAULT_ECONOMY_RULES = {
  puntos_por_posicion: [16, 13, 11, 9, 8, 7, 6, 5, 4, 3, 2, 1],
  puntos_pole: 2,
  mantener_factor_positivo: 3,
  mantener_divisor_negativo: 3,
  clausula_factor_positivo: 2,
  clausula_divisor_negativo: 2,
  pole: 2, vuelta_rapida: 1, sin_sancionados: 3, participacion: 4,
  puntos_factor: 0.1, solo: 1.5,
  rivalidad_clasificacion: [1, 0.5, 0], rivalidad_carrera: [2, 1, 0],
  rivalidad_duo_clasificacion: [1, 0], rivalidad_duo_carrera: [2, 0],
  premio_constructores: [20, 15, 10], rivalidad_etapa: [6, 3, 0], rivalidad_duo_etapa: [4, 2],
  tope_presupuesto_subasta: 50,
  clausula_al_vendedor: false,
};

export function pointsForRaceResult(
  result: { puntos?: number | null; racePos?: number; qualyPos?: number },
  config?: Partial<typeof DEFAULT_ECONOMY_RULES>,
): number {
  if (result.puntos != null && Number.isFinite(Number(result.puntos))) return Number(result.puntos);
  const rules = economyRules(config);
  const position = Number(result.racePos);
  const positionPoints = Number.isInteger(position) && position >= 1
    ? rules.puntos_por_posicion[position - 1] ?? 0
    : 0;
  return positionPoints + (result.qualyPos === 1 ? rules.puntos_pole : 0);
}

export function economyRules(config?: Partial<typeof DEFAULT_ECONOMY_RULES>) {
  const rules = { ...DEFAULT_ECONOMY_RULES, ...config };
  for (const value of Object.values(rules)) {
    if (typeof value === "boolean") continue;
    for (const n of Array.isArray(value) ? value : [value]) {
      if (typeof n !== "number" || !Number.isFinite(n) || n < 0) throw new Error("Los premios deben ser importes finitos y no negativos.");
    }
  }
  if (rules.mantener_divisor_negativo <= 0 || rules.clausula_divisor_negativo <= 0) {
    throw new Error("Los divisores de precio para importes negativos deben ser mayores que cero.");
  }
  return rules;
}

export function ajustarPresupuestoAlTope(presupuesto: number, tope: number): { presupuesto: number; ajuste: number } {
  if (!Number.isFinite(presupuesto) || !Number.isFinite(tope) || tope < 0) {
    throw new Error("El presupuesto y el tope deben ser números válidos; el tope no puede ser negativo.");
  }
  const ajustado = Math.min(Math.round(presupuesto * 10) / 10, tope);
  return { presupuesto: ajustado, ajuste: Math.round((presupuesto - ajustado) * 10) / 10 };
}

export function ordenarPorClasificacion<T>(entries: T[], puntos: (entry: T) => number): Array<{ entry: T; puesto: number }> {
  const sorted = [...entries].sort((a, b) => puntos(b) - puntos(a));
  let lastScore: number | null = null;
  let lastPlace = 0;
  return sorted.map((entry, index) => {
    const score = puntos(entry);
    if (lastScore === null || score !== lastScore) lastPlace = index + 1;
    lastScore = score;
    return { entry, puesto: lastPlace };
  });
}
