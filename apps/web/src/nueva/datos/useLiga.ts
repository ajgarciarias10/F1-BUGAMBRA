// Punto de entrada de las pantallas nuevas: todo lo que enseña el prototipo, calculado una vez
// por cada cambio de `useSplits()`. No vuelve a leer Firestore.
import { useMemo } from "react";
import { useSplits } from "../../hooks/useData";
import type { SplitView } from "../../types";
import { desgloseCircuito, type DesgloseCircuito } from "./ingresos";
import { construirLiga } from "./temporadas";

/** Desglose de ingresos de cada circuito disputado de cada split de escuderías: splitId → circuitoId → desglose. */
export function desglosesPorSplit(splits: readonly SplitView[]): Record<string, Record<string, DesgloseCircuito>> {
  return Object.fromEntries(splits.filter(s => s.tipo !== "individual").map(s => [
    s.id,
    Object.fromEntries(s.circuitos.filter(c => c.completado).map(c => [c.id, desgloseCircuito(s, c)])),
  ]));
}

export function useLiga() {
  const { splits, loading, error, fromCache, slow, retry } = useSplits();
  const liga = useMemo(() => construirLiga(splits), [splits]);
  const desgloses = useMemo(() => desglosesPorSplit(splits), [splits]);
  const splitPorId = useMemo(() => new Map(splits.map(s => [s.id, s])), [splits]);
  return { liga, desgloses, splitPorId, splits, loading, error, fromCache, slow, retry };
}
