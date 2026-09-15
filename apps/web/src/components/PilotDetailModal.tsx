import { useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { Flag, Trophy, Zap } from "lucide-react";
import { PilotCardF1 } from "./PilotCardF1";

/**
 * Ficha completa de un piloto dentro de un split.
 *
 * Mismo patrón que la ficha de carrera: `<dialog>` nativo por portal, cierre con Escape y
 * clic en el fondo. La carta ya existía (`PilotCardF1`) pero solo se veía en las vistas
 * privadas; aquí se abre desde cualquier alineación, que es donde la gente busca al piloto.
 */
export function PilotDetailModal({
  pilot, team, split, getPilotPhoto, showEconomy = false, onClose,
}: {
  pilot: any;
  team: any;
  split: any;
  getPilotPhoto: (pilotId: string) => string;
  showEconomy?: boolean;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    const previousOverflow = document.body.style.overflow;
    dialog?.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      dialog?.close();
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  const rating = Number(pilot.rating_piloto) > 0 ? Number(pilot.rating_piloto) : 70;

  // Carrera a carrera dentro del split: es lo que convierte la carta en una ficha y no en
  // un adorno. Solo los GP ya corridos, en el orden del calendario.
  const carreras = useMemo(() => {
    return (split?.circuitos || [])
      .filter((circuito: any) => circuito.completado)
      .map((circuito: any) => {
        const resultado = (circuito.resultados || []).find((r: any) => r.pilotoId === pilot.pilotoId);
        return resultado ? { circuito, resultado } : null;
      })
      .filter(Boolean) as Array<{ circuito: any; resultado: any }>;
  }, [split, pilot.pilotoId]);

  const stats = [
    { lbl: "Puntos", val: pilot.puntos_piloto || 0 },
    { lbl: "Victorias", val: pilot.victorias || 0 },
    { lbl: "Podios", val: pilot.podios || 0 },
    { lbl: "Poles", val: pilot.poles || 0 },
    { lbl: "Abandonos", val: pilot.dnfs || 0 },
    { lbl: "Carreras limpias", val: pilot.carreras_limpias || 0 },
  ];

  return createPortal(
    <dialog
      ref={dialogRef}
      aria-labelledby="pilot-detail-title"
      onCancel={event => { event.preventDefault(); onClose(); }}
      onClick={event => { if (event.target === event.currentTarget) onClose(); }}
      className="fixed inset-0 m-0 h-[100dvh] max-h-none w-full max-w-none overflow-y-auto overscroll-contain border-0 bg-black/85 p-0 text-left backdrop:bg-black/70 md:p-6"
    >
      <div
        className="relative mx-auto my-0 min-h-[100dvh] max-w-4xl border-white/[0.08] bg-[#0d0d0d] p-4 pb-[max(2rem,env(safe-area-inset-bottom))] md:my-4 md:min-h-0 md:border md:p-6"
        onClick={event => event.stopPropagation()}
      >
        <button
          onClick={onClose}
          aria-label="Cerrar"
          className="sticky top-[max(0.5rem,env(safe-area-inset-top))] z-10 -mr-1 ml-auto grid h-11 w-11 place-items-center rounded-full border border-white/10 bg-[#0d0d0d] text-white/60 hover:text-white md:absolute md:top-4 md:right-4 md:ml-0"
        >
          ✕
        </button>

        <p className="text-[11px] font-bold text-[#e10600] md:font-mono md:text-[9px] md:uppercase md:tracking-[0.35em]">
          Ficha de piloto · {split?.nombre}
        </p>
        <h2 id="pilot-detail-title" className="mt-1 text-2xl font-black uppercase tracking-[-0.04em] text-white md:text-3xl">
          {pilot.nombre}
        </h2>
        <p className="mt-1 text-[11px] text-white/45 md:font-mono md:text-[10px] md:uppercase md:tracking-[0.2em]">
          {team?.nombre || "Sin escudería"} · {rating} OVR
        </p>

        <div className="mt-6 grid gap-5 md:grid-cols-[minmax(0,260px)_1fr] md:gap-6">
          <div className="mx-auto w-full max-w-[260px]">
            <PilotCardF1 pilot={pilot} team={team} getPilotPhoto={getPilotPhoto} showPrice={showEconomy} />
          </div>

          <div className="space-y-5">
            <section>
              <h3 className="mb-2 text-[9px] font-mono uppercase tracking-[0.3em] text-white/30">Rendimiento en {split?.nombre}</h3>
              <div className="grid grid-cols-3 gap-px bg-white/[0.06]">
                {stats.map(stat => (
                  <div key={stat.lbl} className="bg-[#101116] p-3 text-center">
                    <p className="text-[8px] font-mono uppercase tracking-[0.16em] text-white/35">{stat.lbl}</p>
                    <p className="mt-1 text-xl font-black tabular-nums text-white">{stat.val}</p>
                  </div>
                ))}
              </div>
            </section>

            {showEconomy && (
              <section>
                <h3 className="mb-2 text-[9px] font-mono uppercase tracking-[0.3em] text-white/30">Valoración</h3>
                <div className="grid grid-cols-3 gap-px bg-white/[0.06]">
                  {[
                    { lbl: "Compra", val: pilot.precio_compra },
                    { lbl: "Mantener", val: pilot.mantener_actual },
                    { lbl: "Cláusula", val: pilot.clausula_actual },
                  ].map(precio => (
                    <div key={precio.lbl} className="bg-[#101116] p-3 text-center">
                      <p className="text-[8px] font-mono uppercase tracking-[0.16em] text-white/35">{precio.lbl}</p>
                      <p className="mt-1 text-lg font-black tabular-nums text-[#e10600]">{Number(precio.val ?? 0).toFixed(1)}M</p>
                    </div>
                  ))}
                </div>
                {pilot.congelado && (
                  <p className="mt-2 text-[10px] font-mono text-sky-300/80">❄ Congelado: su precio no varía hasta que se resuelva el fichaje.</p>
                )}
              </section>
            )}

            <section>
              <h3 className="mb-2 text-[9px] font-mono uppercase tracking-[0.3em] text-white/30">Carrera a carrera</h3>
              {carreras.length > 0 ? (
                <ul className="grid gap-px bg-white/[0.06]">
                  {carreras.map(({ circuito, resultado }) => {
                    const abandono = resultado.racePos === 99;
                    return (
                      <li key={circuito.id} className="flex items-center gap-3 bg-[#101116] px-3 py-2.5">
                        <span className="min-w-0 flex-1 truncate text-[12px] font-bold uppercase tracking-tight text-white/85">{circuito.nombre}</span>
                        <span className="flex shrink-0 items-center gap-2.5 text-[10px] font-mono text-white/40">
                          <span title="Posición de salida">Q{resultado.qualyPos === 99 ? "—" : resultado.qualyPos}</span>
                          {resultado.fastestLap && <Zap className="h-3.5 w-3.5 text-violet-300" aria-label="Vuelta rápida" />}
                          {resultado.isDotd && <Trophy className="h-3.5 w-3.5 text-amber-300" aria-label="Piloto del día" />}
                        </span>
                        <span className={`grid h-8 w-11 shrink-0 place-items-center border text-sm font-black tabular-nums ${
                          abandono ? "border-red-500/40 bg-red-500/10 text-red-300"
                            : resultado.racePos === 1 ? "border-amber-300/60 bg-amber-400/15 text-amber-100"
                            : resultado.racePos <= 3 ? "border-slate-300/40 bg-slate-300/10 text-slate-100"
                            : "border-white/10 bg-white/[0.03] text-white/70"
                        }`}>
                          {abandono ? "DNF" : `P${resultado.racePos}`}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="flex items-center gap-2 bg-[#101116] px-3 py-6 text-center text-[10px] font-mono uppercase tracking-[0.2em] text-white/25">
                  <Flag className="h-4 w-4" /> Sin carreras disputadas en este split
                </p>
              )}
            </section>
          </div>
        </div>
      </div>
    </dialog>,
    document.body,
  );
}
