import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useSearchParams } from "react-router";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../services/firebase";
import type { Circuito } from "../types";
import { buildRaceShareUrl } from "../utils/raceShareUrl";
import { buildRaceReport, type RaceReportRow } from "../services/readModels";
import { Trophy, Crown, FileText, Flag, Scale, CalendarDays } from "lucide-react";
import { RaceReportModal } from "./RaceReportModal";
import { Badge, Card, EmptyState, Notice, StatusPill, cn } from "./ui";

interface RaceResultsViewProps {
  validSplits: any[];
  currentSplitId: string;
  onSelectSplit: (splitId: string) => void;
  currentSplit: any;
  getPilotPhoto: (pilotId: string) => string;
  darkMode?: boolean;
}

function nombreDe(currentSplit: any, pilotoId: string): string {
  return currentSplit?.roster?.find((p: any) => p.pilotoId === pilotoId)?.nombre || pilotoId;
}

export function RaceResultsView({ validSplits, currentSplitId, onSelectSplit, currentSplit, getPilotPhoto }: RaceResultsViewProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [openId, setOpenId] = useState<string | null>(() => searchParams.get("carrera"));

  const circuitos: Circuito[] = ([...(currentSplit?.circuitos || [])] as Circuito[])
    .filter(c => c.completado)
    .sort((a, b) => (a.numero_carrera ?? 9999) - (b.numero_carrera ?? 9999));

  const abierto = circuitos.find(c => c.id === openId) || null;
  useEffect(() => {
    const linkedCircuitId = searchParams.get("carrera");
    if (linkedCircuitId && circuitos.some(c => c.id === linkedCircuitId)) setOpenId(linkedCircuitId);
    else if (linkedCircuitId && circuitos.length > 0) {
      setOpenId(null);
      setSearchParams(previous => { const next = new URLSearchParams(previous); next.delete("carrera"); return next; });
    }
    else if (!linkedCircuitId) setOpenId(null);
  }, [searchParams, circuitos, setSearchParams]);
  const selectCircuit = (circuitId: string) => {
    setOpenId(circuitId);
    setSearchParams(previous => {
      const next = new URLSearchParams(previous);
      next.set("tab", "resultados");
      next.set("temporada", currentSplitId);
      next.set("carrera", circuitId);
      return next;
    });
  };
  const closeCircuit = () => {
    setOpenId(null);
    setSearchParams(previous => {
      const next = new URLSearchParams(previous);
      next.delete("carrera");
      return next;
    });
  };

  const proximos = ([...(currentSplit?.circuitos || [])] as Circuito[])
    .filter(c => !c.completado)
    .sort((a, b) => (a.numero_carrera ?? 9999) - (b.numero_carrera ?? 9999));

  return (
    <div className="space-y-6">
      <div className="m-rail hide-scrollbar gap-2" role="group" aria-label="Temporada">
        {validSplits.map(split => (
          <button
            key={split.id}
            type="button"
            onClick={() => onSelectSplit(split.id)}
            aria-pressed={currentSplitId === split.id}
            className={cn(
              "min-h-11 shrink-0 rounded-full border px-4 text-sm font-semibold transition-colors",
              currentSplitId === split.id ? "border-brand bg-brand text-brand-ink" : "border-line-strong bg-surface text-ink-2 hover:bg-surface-3",
            )}
          >
            {split.nombre}
          </button>
        ))}
      </div>

      {proximos.length > 0 && (
        <section aria-labelledby="carreras-proximas">
          <h2 id="carreras-proximas" className="mb-3 text-lg font-bold text-ink">Próximas carreras</h2>
          <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {proximos.map(c => (
              <li key={c.id}>
                <Card pad="sm" className="flex items-center justify-between gap-3">
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-bold text-ink">GP de {c.nombre}</span>
                    <span className="mt-0.5 flex items-center gap-1.5 text-xs text-ink-muted">
                      <CalendarDays aria-hidden="true" className="h-3.5 w-3.5" />
                      {c.fecha ? new Date(`${c.fecha}T00:00:00`).toLocaleDateString("es-ES", { day: "numeric", month: "long" }) : "Fecha pendiente"}
                      {c.hora ? ` · ${c.hora} h` : ""}
                    </span>
                  </span>
                  <StatusPill tone="info">Próxima</StatusPill>
                </Card>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="carreras-disputadas">
        <h2 id="carreras-disputadas" className="mb-3 text-lg font-bold text-ink">Carreras disputadas</h2>
        {circuitos.length === 0 ? (
          <EmptyState icon={Trophy} title="Todavía no hay carreras cerradas" description={`${currentSplit?.nombre ?? "Esta temporada"} no tiene carreras disputadas. Puedes consultar otra temporada.`} />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {circuitos.map(circuito => {
              const podio = [...(circuito.resultados || [])]
                .filter(r => r.racePos >= 1 && r.racePos <= 3 && r.isDnf !== true)
                .sort((a, b) => a.racePos - b.racePos);
              return (
                <button
                  key={circuito.id}
                  type="button"
                  onClick={() => selectCircuit(circuito.id)}
                  className="rounded-card border border-line bg-surface p-4 text-left shadow-card transition-colors hover:border-line-strong md:p-5"
                >
                  <span className="flex items-start justify-between gap-2">
                    <span className="text-base font-bold text-ink">GP de {circuito.nombre}</span>
                  </span>
                  <span className="mt-1 block text-xs text-ink-muted">{circuito.acta_cerrada ? "Acta publicada" : "Acta pendiente de cierre"}</span>
                  <span className="mt-3 block space-y-1">
                    {podio.map(r => (
                      <span key={r.pilotoId} className="flex items-center gap-2 text-sm">
                        <span className="w-7 shrink-0 font-bold text-ink-muted">P{r.racePos}</span>
                        <span className="truncate text-ink-2">{nombreDe(currentSplit, r.pilotoId)}</span>
                      </span>
                    ))}
                    {podio.length === 0 && <span className="block text-xs text-ink-muted">Podio no registrado</span>}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </section>

      {abierto && (
        <RaceDetailModal
          splitId={currentSplitId}
          circuitoBase={abierto}
          currentSplit={currentSplit}
          getPilotPhoto={getPilotPhoto}
          onClose={closeCircuit}
        />
      )}
    </div>
  );
}

function RaceDetailModal({
  splitId, circuitoBase, currentSplit, getPilotPhoto, onClose,
}: {
  splitId: string;
  circuitoBase: Circuito;
  currentSplit: any;
  getPilotPhoto: (pilotId: string) => string;
  onClose: () => void;
}) {
  const [circuito, setCircuito] = useState<Circuito>(circuitoBase);
  const [showReport, setShowReport] = useState(false);
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

  // Vivo, directo al doc: así una corrección del acta se ve al instante sin releer todo el split.
  useEffect(() => {
    const ref = doc(db, `splits/${splitId}/circuitos`, circuitoBase.id);
    return onSnapshot(ref, snap => {
      if (snap.exists()) setCircuito({ id: snap.id, ...(snap.data() as any) });
    });
  }, [splitId, circuitoBase.id]);

  const podio = [...(circuito.resultados || [])]
    .filter(r => r.racePos >= 1 && r.racePos <= 3 && r.isDnf !== true)
    .sort((a, b) => a.racePos - b.racePos);
  return createPortal(
    <dialog ref={dialogRef} aria-labelledby="race-detail-title" onCancel={event => { event.preventDefault(); onClose(); }} className="fixed inset-0 m-0 h-[100dvh] max-h-none w-full max-w-none border-0 bg-ink/75 overflow-y-auto overscroll-contain p-0 md:p-6 text-left backdrop:bg-ink/70" onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
      <div className="relative mx-auto my-0 min-h-[100dvh] max-w-5xl border-line bg-surface p-4 pb-[max(2rem,env(safe-area-inset-bottom))] md:my-4 md:min-h-0 md:border md:p-6" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} aria-label="Cerrar" className="sticky top-[max(0.5rem,env(safe-area-inset-top))] z-10 -mr-1 ml-auto grid h-11 w-11 place-items-center rounded-full border border-line bg-surface text-ink-muted hover:text-ink md:absolute md:top-4 md:right-4 md:ml-0">✕</button>
        <p className="text-[11px] font-bold text-brand md:font-mono md:text-[11px] md:uppercase md:tracking-[0.08em]">Resultados · {currentSplit?.nombre}</p>
        <div className="flex flex-wrap items-center justify-between gap-3 mt-1 mb-2">
          <h2 id="race-detail-title" className="text-2xl md:text-3xl font-black uppercase tracking-[-0.04em] text-ink">{circuito.nombre}</h2>
          <button
            type="button"
            onClick={() => setShowReport(true)}
            className="inline-flex items-center gap-2 rounded bg-warn/15 border border-warn/40 px-3 py-1.5 text-xs font-black uppercase tracking-wider text-warn hover:bg-warn/25 transition-colors"
          >
            <FileText className="h-3.5 w-3.5 text-warn" />
            Boletín Oficial GP (Puntos & Economía)
          </button>
        </div>

        {/* ── Podio ── */}
        {/* Podio de verdad: el segundo a la izquierda, el ganador en el centro y
            más alto, el tercero a la derecha. El orden del DOM sigue siendo
            P1-P2-P3 y la colocación la hace CSS, para que quien lea la página
            con un lector de pantalla los oiga por clasificación. */}
        <div className="mt-6 grid grid-cols-3 items-end gap-2 sm:gap-3">
          {podio.map(r => {
            const photo = getPilotPhoto(r.pilotoId);
            const esGanador = r.racePos === 1;
            const columna = esGanador ? "order-2" : r.racePos === 2 ? "order-1" : "order-3";
            const peana = esGanador ? "h-14 sm:h-20" : r.racePos === 2 ? "h-9 sm:h-13" : "h-6 sm:h-9";
            // El primero entra el último: la mirada sube por el podio.
            const retardo = esGanador ? "0.3s" : r.racePos === 2 ? "0.15s" : "0s";

            return (
              <div key={r.pilotoId} className={`podium-rise ${columna}`} style={{ animationDelay: retardo }}>
                <div
                  className={`m-card relative border p-2.5 text-center sm:p-4 ${
                    esGanador
                      ? "winner-shine winner-glow border-warn/60 bg-gradient-to-b from-warn/18 to-warn/4"
                      : "border-line bg-surface-2"
                  }`}
                >
                  {esGanador && (
                    <Crown className="crown-pop mx-auto mb-1 h-5 w-5 text-warn drop-shadow-card" />
                  )}
                  <div className={`mx-auto overflow-hidden rounded-full bg-surface-2 sm:rounded-none ${
                    esGanador ? "h-16 w-16 border-2 border-warn/70 sm:h-20 sm:w-20" : "h-14 w-14 border border-line sm:h-16 sm:w-16"
                  }`}>
                    {photo ? <img src={photo} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full grid place-items-center text-ink-muted font-black">{nombreDe(currentSplit, r.pilotoId).slice(0, 2).toUpperCase()}</div>}
                  </div>
                  <p className={`mt-2 text-[11px] font-bold sm:font-mono sm:text-[11px] sm:uppercase sm:tracking-[0.08em] ${esGanador ? "text-warn" : "text-ink-muted"}`}>
                    P{r.racePos}
                  </p>
                  <p className={`truncate font-black uppercase text-ink ${esGanador ? "text-sm sm:text-base" : "text-[13px] sm:text-sm"}`}>
                    {nombreDe(currentSplit, r.pilotoId)}
                  </p>
                </div>

                {/* Peana. La cifra grande hace de número del cajón. */}
                <div className={`${peana} grid place-items-end justify-center overflow-hidden rounded-b-xl border-x border-b sm:rounded-none ${
                  esGanador ? "border-warn/40 bg-gradient-to-b from-warn/25 to-transparent" : "border-line bg-gradient-to-b from-surface/7 to-transparent"
                }`}>
                  <span className={`pb-1 text-2xl font-black italic leading-none tabular-nums sm:text-3xl ${esGanador ? "text-warn/70" : "text-ink-muted"}`}>
                    {r.racePos}
                  </span>
                </div>
              </div>
            );
          })}
          {podio.length === 0 && (
            <div className="col-span-3 py-6 text-center text-xs font-mono uppercase tracking-[0.08em] text-ink-muted">Sin podio registrado</div>
          )}
        </div>

        <ActaSection circuito={circuito} currentSplit={currentSplit} />
        <FiaDecisionsSection circuito={circuito} currentSplit={currentSplit} />

        {showReport && (
          <RaceReportModal
            isOpen={showReport}
            onClose={() => setShowReport(false)}
            circuito={circuito}
            splitName={currentSplit?.nombre || splitId}
            splitId={splitId}
            currentSplit={currentSplit}
          />
        )}
      </div>
    </dialog>, document.body
  );
}

// ── ACTA PUBLICADA ────────────────────────────────────────────────────────────

function statusBadge(row: RaceReportRow) {
  if (row.status === "classified") return <Badge tone="neutral">P{row.racePos}</Badge>;
  if (row.status === "dnf") return <Badge tone="danger">DNF</Badge>;
  if (row.status === "did_not_race") return <Badge tone="neutral">No corrió</Badge>;
  return <Badge tone="warn">Posición desconocida</Badge>;
}

function ActaSection({ circuito, currentSplit }: { circuito: Circuito; currentSplit: any }) {
  const report = buildRaceReport(circuito, currentSplit?.roster ?? []);
  const teamName = (id?: string) => (id ? currentSplit?.equipos?.find((e: any) => e.id === id)?.nombre : undefined);
  return (
    <section className="mt-6 border-t border-line pt-5" aria-labelledby="acta-title">
      <h3 id="acta-title" className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink-2">
        <Flag aria-hidden="true" className="h-4 w-4 text-brand" /> Acta
        <StatusPill tone={report.published ? "ok" : "warn"}>{report.published ? "Publicada" : "Pendiente de cierre"}</StatusPill>
      </h3>
      {!report.published ? (
        <Notice tone="info">El administrador todavía no ha cerrado el acta de esta carrera. Las posiciones y los puntos se mostrarán cuando se publique.</Notice>
      ) : report.rows.length === 0 ? (
        <EmptyState title="Acta sin resultados" description="No hay resultados guardados para esta carrera." />
      ) : (
        <>
          <ul className="divide-y divide-line rounded-lg border border-line">
            {report.rows.map(row => (
              <li key={row.pilotId} className="grid grid-cols-[auto_1fr_auto] items-center gap-3 px-3 py-2.5">
                <span className="w-9 text-center text-lg font-bold tabular-nums text-ink">{row.status === "classified" ? row.racePos : "·"}</span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-ink">{row.name}</span>
                  <span className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-ink-muted">
                    {teamName(row.teamId) && <span>{teamName(row.teamId)}</span>}
                    <span>Qualy {row.qualyPos ?? "—"}</span>
                    {statusBadge(row)}
                    {row.fastestLap && <Badge tone="violet">Vuelta rápida</Badge>}
                  </span>
                </span>
                <span className="text-right">
                  <span className="block text-base font-bold tabular-nums text-ink">{row.points ?? "—"}</span>
                  <span className="block text-[11px] text-ink-muted">pts</span>
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-ink-muted">«—» significa dato no registrado. Cero puntos no implica retirada: solo el administrador marca DNF o «No corrió».</p>
        </>
      )}
    </section>
  );
}

// ── DECISIONES FIA ────────────────────────────────────────────────────────────

function FiaDecisionsSection({ circuito, currentSplit }: { circuito: Circuito; currentSplit: any }) {
  const decisions = circuito.decisiones_fia ?? [];
  return (
    <section className="mt-6 border-t border-line pt-5" aria-labelledby="fia-title">
      <h3 id="fia-title" className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink-2">
        <Scale aria-hidden="true" className="h-4 w-4 text-brand" /> Decisiones FIA
      </h3>
      {decisions.length === 0 ? (
        <p className="rounded-lg border border-dashed border-line-strong bg-surface-2 p-4 text-sm text-ink-muted">No hay decisiones FIA registradas para esta carrera.</p>
      ) : (
        <ul className="space-y-2">
          {decisions.map(d => {
            const pilot = d.pilotoId ? nombreDe(currentSplit, d.pilotoId) : null;
            const team = d.equipoId ? currentSplit?.equipos?.find((e: any) => e.id === d.equipoId)?.nombre ?? d.equipoId : null;
            return (
              <li key={d.id} className="rounded-lg border border-line bg-surface-2 p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-bold text-ink">{[pilot, team].filter(Boolean).join(" · ") || "Sin afectado indicado"}</span>
                  <Badge tone="warn">{d.tipo}</Badge>
                  {d.transaccionId && <Badge tone="ok">Multa aprobada</Badge>}
                </div>
                {d.efecto_deportivo && <p className="mt-1 text-sm text-ink-2"><span className="text-ink-muted">Efecto: </span>{d.efecto_deportivo}</p>}
                <p className="mt-1 text-sm text-ink-2"><span className="text-ink-muted">Motivo: </span>{d.motivo}</p>
                <p className="mt-1 text-xs text-ink-muted">
                  Carrera: GP de {circuito.nombre}
                  {d.transaccionId && <> · Movimiento económico: <span className="font-mono">{d.transaccionId}</span></>}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
