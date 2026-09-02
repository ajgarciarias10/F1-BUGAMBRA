import { useMemo } from "react";
import { TrendingUp } from "lucide-react";
import { OVR_DEBUT } from "../utils/splitResolver";

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
    if (rating == null) return "text-white/15";
    if (rating >= 85) return "text-amber-300 font-black";
    if (rating >= 75) return "text-white font-bold";
    if (rating >= 65) return "text-white/60";
    return "text-white/30";
  };

  return (
    <section className="border border-white/10 bg-white/[0.03] p-5 space-y-4">
      <div className="flex items-start gap-3">
        <div className="p-2 bg-sky-500/10 text-sky-300"><TrendingUp className="w-5 h-5" /></div>
        <div>
          <h2 className="font-black uppercase tracking-tight text-lg">Trayectoria de overall</h2>
          <p className="text-xs text-white/45 mt-1 max-w-2xl">
            El OVR de un piloto arranca en {OVR_DEBUT} el día que debuta y a partir de ahí evoluciona
            carrera a carrera: cada resultado se mide contra la media de esa carrera y el valor con el
            que cierra un split es el que hereda el siguiente. Se rehace solo cada vez que se guarda
            un acta, replegando el bloque entero desde su rating de partida.
          </p>
        </div>
      </div>

      {filas.length > 0 && (
        <div className="overflow-x-auto border border-white/[0.06]">
          <table className="text-[10px] border-collapse font-mono min-w-full">
            <thead>
              <tr className="border-b border-white/[0.06] text-[9px] uppercase tracking-[0.2em] text-white/25">
                <th className="py-2.5 px-3 text-left font-normal min-w-[120px]">Piloto</th>
                <th className="py-2.5 px-3 text-left font-normal min-w-[92px]">Debut</th>
                {bloques.map((split: any) => (
                  <th key={split.id} className="py-2.5 px-3 text-right font-normal min-w-[72px] whitespace-nowrap">{split.nombre}</th>
                ))}
                <th className="py-2.5 px-3 text-right font-normal">Techo</th>
                <th className="py-2.5 px-3 text-right font-normal">Balance</th>
              </tr>
            </thead>
            <tbody>
              {filas.map(fila => {
                const balance = fila.ultimo != null && fila.debut != null ? fila.ultimo - fila.debut : null;
                return (
                  <tr key={fila.pilotoId} className="border-b border-white/[0.04] hover:bg-white/[0.015]">
                    <td className="py-2 px-3 font-bold text-white/85 text-[11px]">{fila.nombre}</td>
                    <td className="py-2 px-3 text-left">
                      <span className="block text-white/45 text-[9px] uppercase tracking-wider truncate">{fila.debutSplit}</span>
                      <span className="block text-white/25 tabular-nums text-[9px]">{fila.debut ?? "—"} OVR</span>
                    </td>
                    {bloques.map((split: any) => {
                      const celda = fila.celdas.find(c => c.splitId === split.id);
                      if (!celda) return <td key={split.id} className="py-2 px-3 text-right text-white/10">—</td>;
                      const salto = celda.rating != null && celda.base != null ? celda.rating - celda.base : null;
                      return (
                        <td key={split.id} className="py-2 px-3 text-right">
                          <span className={`block tabular-nums ${tono(celda.rating)}`}>{celda.rating ?? "—"}</span>
                          {salto != null && salto !== 0 && (
                            <span className={`block text-[8px] tabular-nums ${salto > 0 ? "text-emerald-400/70" : "text-[#e10600]/70"}`}>
                              {salto > 0 ? "+" : ""}{salto}
                            </span>
                          )}
                        </td>
                      );
                    })}
                    <td className="py-2 px-3 text-right text-amber-300/70 tabular-nums">{fila.techo ?? "—"}</td>
                    <td className={`py-2 px-3 text-right tabular-nums font-black ${
                      balance == null ? "text-white/15" : balance > 0 ? "text-emerald-400" : balance < 0 ? "text-[#e10600]" : "text-white/30"
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
    </section>
  );
}
