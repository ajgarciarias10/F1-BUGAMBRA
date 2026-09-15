export const DEFAULT_ECONOMY_RULES = {
  pole: 2, vuelta_rapida: 1, sin_sancionados: 3, participacion: 4,
  puntos_factor: 0.1, solo: 1.5,
  rivalidad_clasificacion: [1, 0.5, 0], rivalidad_carrera: [2, 1, 0],
  rivalidad_duo_clasificacion: [1, 0], rivalidad_duo_carrera: [2, 0],
  clausula_al_vendedor: false,
};

export function economyRules(config?: Partial<typeof DEFAULT_ECONOMY_RULES>) {
  const rules = { ...DEFAULT_ECONOMY_RULES, ...config };
  for (const value of Object.values(rules)) {
    if (typeof value === "boolean") continue;
    for (const n of Array.isArray(value) ? value : [value]) {
      if (typeof n !== "number" || !Number.isFinite(n) || n < 0) throw new Error("Los premios deben ser importes finitos y no negativos.");
    }
  }
  return rules;
}
