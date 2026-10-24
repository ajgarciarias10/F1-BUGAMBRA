import { useMemo } from "react";
import { TrendingUp } from "lucide-react";
import { OVR_DEBUT } from "../utils/splitResolver";
import { Card, EmptyState } from "./ui";

// El overall es la trayectoria de un piloto: arranca en su debut y evoluciona carrera a
// carrera. Se recalcula solo al guardar cada acta, así que este panel solo la muestra.

type Fila = {
  pilotoId: string;
  nombre: string;
  celdas: Array<{ splitId: string; rating: number | null; base: number | null; equipo: string }>;
  debutSplit: string;
  debut: number | null;
  ultimo: number | null;
  techo: number | null;
};

export function OVRTrajectoryPanel({ splits }: { splits: any[] }) {
  // Origins cuenta: para parte de la parrilla es el debut, y de ahí arranca su curva.
  const bloques = useMemo(() => [...splits]
    .filter((split: any) => split.id !== "global")
    .sort((a: any, b: any) => Number(a.orden ?? 999) - Number(b.orden ?? 999)), [splits]);

  const filas = useMemo<Fila[]>(() => {
    const porPiloto = new Map<string, Fila>();

    for (const split of bloques) {
      for (const entry of (split.roster || [])) {
        if (entry.equipoId === "agente_libre") continue;
        const fila = porPiloto.get(entry.pilotoId) ?? {
          pilotoId: entry.pilotoId,
          nombre: entry.nombre || entry.pilotoId,
          celdas: [],
          debutSplit: split.nombre || split.id,
          debut: null, ultimo: null, techo: null,
        };
        const equipo = (split.equipos || []).find((e: any) => e.id === entry.equipoId);
        fila.celdas.push({
          splitId: split.id,
          rating: Number(entry.rating_piloto) > 0 ? Number(entry.rating_piloto) : null,
          base:   Number(entry.rating_base) > 0 ? Number(entry.rating_base) : null,
          equipo: equipo?.nombre || entry.equipoId || "—",
        });
        porPiloto.set(entry.pilotoId, fila);
      }
    }

    return [...porPiloto.values()].map(fila => {
      const ratings = fila.celdas.map(c => c.rating).filter((r): r is number => r != null);
      const primera = fila.celdas.find(c => c.base != null || c.rating != null);
      return {
        ...fila,
        debut: primera?.base ?? ratings[0] ?? null,
        ultimo: ratings.length ? ratings[ratings.length - 1] : null,
        techo: ratings.length ? Math.max(...ratings) : null,
      };
    }).sort((a, b) => (b.ultimo ?? 0) - (a.ultimo ?? 0) || a.nombre.localeCompare(b.nombre));
  }, [bloques]);

  const tono = (rating: number | null) => {
    if (rating == null) return "text-ink-muted/60";
    if (rating >= 85) return "text-warn font-semibold";
    if (rating >= 75) return "text-ink font-semibold";
    if (rating >= 65) return "text-ink-2";
    return "text-ink-muted";
  };

  return (
    <Card as="section" pad="md" className="space-y-4">
      <div className="flex items-start gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-info/30 bg-info-soft text-info"><TrendingUp aria-hidden="true" className="h-5 w-5" /></div>
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Trayectoria de overall</h2>
          <p className="mt-1 max-w-2xl text-sm text-ink-muted">
            El OVR de un piloto arranca en {OVR_DEBUT} el día que debuta y a partir de ahí evoluciona
            carrera a carrera: cada resultado se mide contra la media de esa carrera y el valor con el
            que cierra un split es el que hereda el siguiente. Se rehace solo cada vez que se guarda
            un acta, replegando el bloque entero desde su rating de partida.
          </p>
        </div>
      </div>

      {filas.length === 0 ? (
        <EmptyState title="Sin pilotos todavía" description="La trayectoria aparece cuando hay pilotos inscritos en algún split." className="py-8" />
      ) : (
        <div className="table-scroll rounded-lg border border-line bg-surface/60">
          <table className="min-w-full border-collapse text-sm">
            <caption className="sr-only">Overall de cada piloto por split</caption>
            <thead>
              <tr className="border-b border-line bg-surface-2/70 text-xs text-ink-muted">
                <th scope="col" className="sticky left-0 z-10 min-w-[120px] bg-surface-2 px-3 py-2.5 text-left font-semibold">Piloto</th>
                <th scope="col" className="min-w-[92px] px-3 py-2.5 text-left font-semibold">Debut</th>
                {bloques.map((split: any) => (
                  <th scope="col" key={split.id} className="min-w-[72px] whitespace-nowrap px-3 py-2.5 text-right font-semibold">{split.nombre}</th>
                ))}
                <th scope="col" className="px-3 py-2.5 text-right font-semibold">Techo</th>
                <th scope="col" className="px-3 py-2.5 text-right font-semibold">Balance</th>
              </tr>
            </thead>
            <tbody>
              {filas.map(fila => {
                const balance = fila.ultimo != null && fila.debut != null ? fila.ultimo - fila.debut : null;
                return (
                  <tr key={fila.pilotoId} className="border-b border-line transition-colors last:border-0 hover:bg-info/5">
                    <th scope="row" className="sticky left-0 z-10 bg-surface px-3 py-2 text-left font-semibold text-ink">{fila.nombre}</th>
                    <td className="px-3 py-2 text-left">
                      <span className="block truncate text-xs text-ink-2">{fila.debutSplit}</span>
                      <span className="block text-xs tabular-nums text-ink-muted">{fila.debut ?? "—"} OVR</span>
                    </td>
                    {bloques.map((split: any) => {
                      const celda = fila.celdas.find(c => c.splitId === split.id);
                      if (!celda) return <td key={split.id} className="px-3 py-2 text-right text-ink-muted/60">—</td>;
                      const salto = celda.rating != null && celda.base != null ? celda.rating - celda.base : null;
                      return (
                        <td key={split.id} className="px-3 py-2 text-right">
                          <span className={`block tabular-nums ${tono(celda.rating)}`}>{celda.rating ?? "—"}</span>
                          {salto != null && salto !== 0 && (
                            <span className={`block text-xs tabular-nums ${salto > 0 ? "text-ok" : "text-danger"}`}>
                              {salto > 0 ? "+" : ""}{salto}
                            </span>
                          )}
                        </td>
                      );
                    })}
                    <td className="px-3 py-2 text-right tabular-nums text-warn">{fila.techo ?? "—"}</td>
                    <td className={`px-3 py-2 text-right font-semibold tabular-nums ${
                      balance == null ? "text-ink-muted" : balance > 0 ? "text-ok" : balance < 0 ? "text-danger" : "text-ink-muted"
                    }`}>
                      {balance == null ? "—" : `${balance > 0 ? "+" : ""}${balance}`}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
