// Punto de entrada de las pantallas nuevas: todo lo que enseña el prototipo, calculado una vez
// por cada cambio de `useSplits()`. No vuelve a leer Firestore.
import { useMemo } from "react";
import { useSplits } from "../../hooks/useData";
import type { SplitView } from "../../types";
import { desgloseCircuito, type DesgloseCircuito } from "./ingresos";
import { construirLiga } from "./temporadas";
import { pactosDelSplit } from "./pactos";
import { evolucionEscuderias } from "./evolucion";

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
  // Pactos del split en curso hacia el siguiente (exista ya o no).
  const pactos = useMemo(() => liga.actual?.tipo === "split" ? pactosDelSplit(splits, liga.actual.id) : null, [liga, splits]);
  // Evolución de la Temporada 1 con datos públicos; con el libro de movimientos, la pantalla
  // llama a evolucionEscuderias pasándolo.
  const evolucionTemporada1 = useMemo(() => liga.temporada1 ? evolucionEscuderias(liga, splits, liga.temporada1) : null, [liga, splits]);
  return { liga, desgloses, splitPorId, pactos, evolucionTemporada1, splits, loading, error, fromCache, slow, retry };
}
