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
      className="fixed inset-0 m-0 h-[100dvh] max-h-none w-full max-w-none overflow-y-auto overscroll-contain border-0 bg-ink/75 p-0 text-left backdrop:bg-ink/70 md:p-6"
    >
      <div
        className="relative mx-auto my-0 min-h-[100dvh] max-w-4xl border-line bg-surface p-4 pb-[max(2rem,env(safe-area-inset-bottom))] md:my-4 md:min-h-0 md:border md:p-6"
        onClick={event => event.stopPropagation()}
      >
        <button
          onClick={onClose}
          aria-label="Cerrar"
          className="sticky top-[max(0.5rem,env(safe-area-inset-top))] z-10 -mr-1 ml-auto grid h-11 w-11 place-items-center rounded-full border border-line bg-surface text-ink-muted hover:text-ink md:absolute md:top-4 md:right-4 md:ml-0"
        >
          ✕
        </button>

        <p className="text-[11px] font-bold text-brand md:font-mono md:text-[11px] md:uppercase md:tracking-[0.08em]">
          Ficha de piloto · {split?.nombre}
        </p>
        <h2 id="pilot-detail-title" className="mt-1 text-2xl font-black uppercase tracking-[-0.04em] text-ink md:text-3xl">
          {pilot.nombre}
        </h2>
        <p className="mt-1 text-[11px] text-ink-muted md:font-mono md:text-xs md:uppercase md:tracking-[0.08em]">
          {team?.nombre || "Sin escudería"} · {rating} OVR
        </p>

        <div className="mt-6 grid gap-5 md:grid-cols-[minmax(0,260px)_1fr] md:gap-6">
          <div className="mx-auto w-full max-w-[260px]">
            <PilotCardF1 pilot={pilot} team={team} getPilotPhoto={getPilotPhoto} showPrice={showEconomy} />
          </div>

          <div className="space-y-5">
            <section>
              <h3 className="mb-2 text-[11px] font-mono uppercase tracking-[0.08em] text-ink-muted">Rendimiento en {split?.nombre}</h3>
              <div className="grid grid-cols-3 gap-px bg-surface-2">
                {stats.map(stat => (
                  <div key={stat.lbl} className="bg-surface p-3 text-center">
                    <p className="text-[11px] font-mono uppercase tracking-[0.08em] text-ink-muted">{stat.lbl}</p>
                    <p className="mt-1 text-xl font-black tabular-nums text-ink">{stat.val}</p>
                  </div>
                ))}
              </div>
            </section>

            {showEconomy && (
              <section>
                <h3 className="mb-2 text-[11px] font-mono uppercase tracking-[0.08em] text-ink-muted">Valoración</h3>
                <div className="grid grid-cols-3 gap-px bg-surface-2">
                  {[
                    { lbl: "Compra", val: pilot.precio_compra },
                    { lbl: "Mantener", val: pilot.mantener_actual },
                    { lbl: "Cláusula", val: pilot.clausula_actual },
                  ].map(precio => (
                    <div key={precio.lbl} className="bg-surface p-3 text-center">
                      <p className="text-[11px] font-mono uppercase tracking-[0.08em] text-ink-muted">{precio.lbl}</p>
                      <p className="mt-1 text-lg font-black tabular-nums text-brand">{Number(precio.val ?? 0).toFixed(1)}M</p>
                    </div>
                  ))}
                </div>
                {pilot.congelado && (
                  <p className="mt-2 text-xs font-mono text-info/80">❄ Congelado: su precio no varía hasta que se resuelva el fichaje.</p>
                )}
              </section>
            )}

            <section>
              <h3 className="mb-2 text-[11px] font-mono uppercase tracking-[0.08em] text-ink-muted">Carrera a carrera</h3>
              {carreras.length > 0 ? (
                <ul className="grid gap-px bg-surface-2">
                  {carreras.map(({ circuito, resultado }) => {
                    const abandono = resultado.isDnf === true;
                    return (
                      <li key={circuito.id} className={`flex items-center gap-3 px-3 py-2.5 ${
                        abandono ? "border-l-2 border-danger/70 bg-gradient-to-r from-danger/10 to-surface-2" : "bg-surface"
                      }`}>
                        <span className="min-w-0 flex-1">
                          <span className={`block truncate text-[12px] font-bold uppercase tracking-tight ${abandono ? "text-ink-muted" : "text-ink-2"}`}>{circuito.nombre}</span>
                          {abandono && (
                            <span className="mt-0.5 flex items-center gap-1 text-[11px] font-mono uppercase tracking-[0.08em] text-danger/80">
                              <Flag className="h-3 w-3" aria-hidden="true" /> Abandono · 0 pts
                            </span>
                          )}
                        </span>
                        <span className="flex shrink-0 items-center gap-2.5 text-xs font-mono text-ink-muted">
                          <span title="Posición de salida">Q{resultado.qualyPos === 99 ? "—" : resultado.qualyPos}</span>
                          {resultado.fastestLap && <Zap className="h-3.5 w-3.5 text-violet" aria-label="Vuelta rápida" />}
                          {resultado.isDotd && <Trophy className="h-3.5 w-3.5 text-warn" aria-label="Piloto del día" />}
                        </span>
                        <span title={abandono ? "No terminó la carrera" : undefined} className={`grid h-8 w-11 shrink-0 place-items-center border text-sm font-black tabular-nums ${
                          abandono ? "border-danger/60 bg-danger/20 text-[12px] tracking-wider text-danger"
                            : resultado.racePos === 1 ? "border-warn/60 bg-warn/15 text-warn"
                            : resultado.racePos <= 3 ? "border-line bg-surface-3 text-ink-muted"
                            : "border-line bg-surface-2 text-ink-2"
                        }`}>
                          {abandono ? "DNF" : resultado.racePos === 99 ? "—" : `P${resultado.racePos}`}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="flex items-center gap-2 bg-surface px-3 py-6 text-center text-xs font-mono uppercase tracking-[0.08em] text-ink-muted">
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
