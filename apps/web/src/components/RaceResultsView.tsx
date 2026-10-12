import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useSearchParams } from "react-router";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../services/firebase";
import { useAuth } from "../contexts/AuthContext";
import { votarPilotoDelDia, abrirVotacionPilotoDelDia, cerrarVotacionPilotoDelDia } from "../services/raceProcessor";
import type { Circuito } from "../types";
import { buildRaceShareUrl } from "../utils/raceShareUrl";
import { buildRaceReport, buildVotingShareUrl, votingStatusOf, type RaceReportRow } from "../services/readModels";
import { Trophy, Crown, Loader2, Users, FileText, Flag, Share2, Scale, CalendarDays } from "lucide-react";
import { RaceReportModal } from "./RaceReportModal";
import { Badge, Button, Card, EmptyState, Notice, StatusPill, cn } from "./ui";
import { useSingleFlight } from "../hooks/useSingleFlight";

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
  const { user, userData } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [openId, setOpenId] = useState<string | null>(() => searchParams.get("carrera"));
  const isAdmin = userData?.rol === "admin";
  const isRegistered = Boolean(user && userData);

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
  // El bonus del circuito anterior es lo que se refleja en este: buscamos su ganador cerrado.
  const indiceAbierto = abierto ? circuitos.findIndex(c => c.id === abierto.id) : -1;
  const anterior = indiceAbierto > 0 ? circuitos[indiceAbierto - 1] : null;

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
              const voting = votingStatusOf(circuito);
              return (
                <button
                  key={circuito.id}
                  type="button"
                  onClick={() => selectCircuit(circuito.id)}
                  className="rounded-card border border-line bg-surface p-4 text-left shadow-card transition-colors hover:border-line-strong md:p-5"
                >
                  <span className="flex items-start justify-between gap-2">
                    <span className="text-base font-bold text-ink">GP de {circuito.nombre}</span>
                    {voting === "open" && <Badge tone="ok">Votación abierta</Badge>}
                    {voting === "closed" && <Badge tone="neutral">Votación cerrada</Badge>}
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
                  {circuito.piloto_dia_cerrado && circuito.piloto_dia_ganador && (
                    <span className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-warn">
                      <Crown aria-hidden="true" className="h-3.5 w-3.5" /> Piloto del día: {nombreDe(currentSplit, circuito.piloto_dia_ganador)}
                    </span>
                  )}
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
          anteriorGanador={anterior?.piloto_dia_cerrado ? (anterior.piloto_dia_ganador ?? null) : null}
          anteriorNombre={anterior?.nombre}
          currentSplit={currentSplit}
          getPilotPhoto={getPilotPhoto}
          uid={user?.uid}
          isAdmin={isAdmin}
          isRegistered={isRegistered}
          onClose={closeCircuit}
        />
      )}
    </div>
  );
}

function RaceDetailModal({
  splitId, circuitoBase, anteriorGanador, anteriorNombre, currentSplit, getPilotPhoto, uid, isAdmin, isRegistered, onClose,
}: {
  splitId: string;
  circuitoBase: Circuito;
  anteriorGanador: string | null;
  anteriorNombre?: string;
  currentSplit: any;
  getPilotPhoto: (pilotId: string) => string;
  uid?: string;
  isAdmin: boolean;
  isRegistered: boolean;
  onClose: () => void;
}) {
  const [circuito, setCircuito] = useState<Circuito>(circuitoBase);
  const [votando, setVotando] = useState<string | null>(null);
  const [cerrando, setCerrando] = useState(false);
  const [abriendo, setAbriendo] = useState(false);
  const [copiandoEnlace, setCopiandoEnlace] = useState(false);
  const [ganadorElegido, setGanadorElegido] = useState("");
  const [actionError, setActionError] = useState("");
  const [actionMessage, setActionMessage] = useState("");
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

  // Vivo, directo al doc: así cada voto se ve al instante sin releer todo el split.
  useEffect(() => {
    const ref = doc(db, `splits/${splitId}/circuitos`, circuitoBase.id);
    return onSnapshot(ref, snap => {
      if (snap.exists()) setCircuito({ id: snap.id, ...(snap.data() as any) });
    });
  }, [splitId, circuitoBase.id]);

  const podio = [...(circuito.resultados || [])]
    .filter(r => r.racePos >= 1 && r.racePos <= 3 && r.isDnf !== true)
    .sort((a, b) => a.racePos - b.racePos);
  const votingStatus = votingStatusOf(circuito);

  const candidatos = [...(circuito.resultados || [])].filter(r => r.isDnf !== true);
  const votantes = circuito.piloto_dia_votantes || {};
  const conteos: Record<string, number> = {};
  Object.values(votantes).forEach(pid => { conteos[pid] = (conteos[pid] || 0) + 1; });
  const totalVotos = Object.keys(votantes).length;
  const miVoto = uid ? votantes[uid] : undefined;
  const propuesto = Object.entries(conteos).sort((a, b) => b[1] - a[1])[0]?.[0];

  const { run: runOnce } = useSingleFlight();
  const votar = async (pilotoId: string) => {
    return runOnce(async () => {
    if (!uid || votando || cerrando) return;
    setActionError(""); setActionMessage("");
    setVotando(pilotoId);
    try {
      const result = await votarPilotoDelDia(splitId, circuitoBase.id, uid, pilotoId);
      if (!result.ok) throw new Error(result.message);
      setActionMessage(result.message);
    } catch {
      setActionError("No se ha podido guardar tu voto. Comprueba tu conexión y vuelve a intentarlo.");
    } finally {
      setVotando(null);
    }
    });
  };

  const abrirVotacion = async () => {
    return runOnce(async () => {
    if (abriendo || cerrando || votando) return;
    setActionError(""); setActionMessage(""); setAbriendo(true);
    try {
      const result = await abrirVotacionPilotoDelDia(splitId, circuitoBase.id);
      if (!result.ok) throw new Error(result.message);
      setActionMessage(result.message);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "No se pudo abrir la votación.");
    } finally { setAbriendo(false); }
    });
  };

  const copiarEnlace = async () => {
    if (copiandoEnlace) return;
    setActionError(""); setActionMessage(""); setCopiandoEnlace(true);
    try {
      const url = buildRaceShareUrl(window.location.origin, splitId, circuitoBase.id);
      await navigator.clipboard.writeText(url);
      setActionMessage("Enlace de esta carrera copiado. Cualquiera puede consultar; solo las cuentas registradas pueden votar.");
    } catch {
      setActionError("No se pudo copiar el enlace. Comprueba que el navegador permite acceder al portapapeles.");
    } finally { setCopiandoEnlace(false); }
  };

  const compartirVotacion = async () => {
    if (copiandoEnlace) return;
    setActionError(""); setActionMessage(""); setCopiandoEnlace(true);
    try {
      await navigator.clipboard.writeText(buildVotingShareUrl(window.location.origin, splitId, circuitoBase.id));
      setActionMessage("Enlace de la votación copiado. Cualquiera puede consultarla; solo las cuentas registradas pueden votar.");
    } catch {
      setActionError("No se pudo copiar el enlace. Comprueba que el navegador permite acceder al portapapeles.");
    } finally { setCopiandoEnlace(false); }
  };

  const cerrarVotacion = async () => {
    return runOnce(async () => {
    const ganador = ganadorElegido || propuesto;
    if (!ganador || cerrando || votando) return;
    setActionError(""); setActionMessage("");
    setCerrando(true);
    try {
      const result = await cerrarVotacionPilotoDelDia(splitId, circuitoBase.id, ganador);
      if (!result.ok) throw new Error(result.message);
      setActionMessage(result.message);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "No se ha podido cerrar la votación. Comprueba la conexión y tus permisos antes de volver a intentarlo.");
    } finally {
      setCerrando(false);
    }
    });
  };

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

        {/* ── Piloto del día ── */}
        <div className="mt-6 border-t border-line pt-5">
          <div className="flex items-center gap-2 mb-3">
            <Crown className="w-4 h-4 text-warn" />
            <span className="text-sm font-semibold text-ink-2">Piloto del día</span>
            <StatusPill tone={votingStatus === "open" ? "ok" : votingStatus === "closed" ? "neutral" : "warn"}>
              {votingStatus === "open" ? "Votación abierta" : votingStatus === "closed" ? "Votación cerrada" : "Votación no disponible"}
            </StatusPill>
            {votingStatus !== "unavailable" && (
              <Button size="sm" variant="secondary" className="ml-auto" onClick={compartirVotacion} loading={copiandoEnlace}>
                <Share2 aria-hidden="true" className="h-4 w-4" /> Compartir votación
              </Button>
            )}
          </div>
          {votingStatus === "open" && miVoto && <p className="mb-3 text-sm font-semibold text-ok">Ya has votado. Puedes cambiar tu voto mientras siga abierta.</p>}

      {circuito.piloto_dia_cerrado && circuito.piloto_dia_ganador ? (
            <div className="m-card winner-glow flex items-center gap-3 border border-warn/40 bg-gradient-to-r from-warn/14 to-warn/3 p-4">
              {/* La foto es el ancla del "+2": la insignia sale justo de ella. */}
              <div className="relative shrink-0">
                <div className="h-14 w-14 overflow-hidden rounded-full border-2 border-warn/60 bg-surface-2 sm:rounded-none sm:border">
                  {getPilotPhoto(circuito.piloto_dia_ganador)
                    ? <img src={getPilotPhoto(circuito.piloto_dia_ganador)} alt="" className="w-full h-full object-cover" />
                    : <div className="w-full h-full grid place-items-center text-ink-muted font-black">{nombreDe(currentSplit, circuito.piloto_dia_ganador).slice(0, 2).toUpperCase()}</div>}
                </div>
                <span
                  aria-hidden="true"
                  className="bonus-plus2 pointer-events-none absolute -right-2 -top-2 rounded-full bg-warn px-2 py-0.5 text-[12px] font-black tabular-nums text-brand-ink shadow-card"
                >
                  +2
                </span>
              </div>
              <div className="min-w-0">
                <span className="flex items-center gap-1.5 text-[11px] font-bold text-warn">
                  <Crown className="crown-pop h-3.5 w-3.5" /> Piloto del día
                </span>
                <p className="truncate text-base font-black uppercase text-ink">{nombreDe(currentSplit, circuito.piloto_dia_ganador)}</p>
                <p className="text-[12px] text-warn/80 sm:font-mono sm:text-[11px] sm:uppercase sm:tracking-[0.08em]">
                  +2 OVR en la próxima carrera · {totalVotos} voto(s)
                </p>
              </div>
            </div>
          ) : (
            <>
          {circuito.piloto_dia_abierta !== true ? (
            <div className="rounded-xl border border-line bg-surface-2 p-4 text-sm text-ink-2">
              <p>{isAdmin ? "Esta votación aún no se ha compartido." : "La votación de esta carrera todavía no está abierta."}</p>
              {actionError && <p role="alert" className="mt-3 text-sm text-danger">{actionError}</p>}
              {actionMessage && <p role="status" className="mt-3 text-sm text-ok">{actionMessage}</p>}
              {isAdmin && <div className="mt-3 flex flex-wrap gap-2"><button type="button" onClick={abrirVotacion} disabled={abriendo || cerrando || !!votando} className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-warn px-4 text-xs font-black uppercase tracking-wide text-brand-ink disabled:opacity-50">{abriendo && <Loader2 className="h-3.5 w-3.5 animate-spin" />}Abrir votación</button><button type="button" onClick={copiarEnlace} disabled={copiandoEnlace} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-line-strong px-4 text-xs font-bold text-ink disabled:opacity-50">{copiandoEnlace && <Loader2 className="h-3.5 w-3.5 animate-spin" />}Copiar enlace de carrera</button></div>}
            </div>
          ) : <>
          <p className="mb-3 text-xs text-ok/80">Votación abierta · solo cuentas registradas · {totalVotos} voto(s)</p>
          {isAdmin && <button type="button" onClick={copiarEnlace} disabled={copiandoEnlace} className="mb-3 inline-flex min-h-10 items-center gap-2 rounded-lg border border-line-strong px-4 text-xs font-bold text-ink disabled:opacity-50">{copiandoEnlace && <Loader2 className="h-3.5 w-3.5 animate-spin" />}Copiar enlace para compartir esta votación</button>}
          {!isRegistered && <p className="mb-4 text-sm text-ink-2"><Link to="/login" className="font-semibold text-warn underline underline-offset-4">Inicia sesión o regístrate para votar</Link>. Puedes consultar la carrera sin entrar.</p>}
              {actionError && <p role="alert" className="mb-4 rounded-lg border border-danger/40 bg-danger/10 p-3 text-sm text-danger">{actionError}</p>}
              {actionMessage && <p role="status" className="mb-4 text-sm text-ok">{actionMessage}</p>}
              <div className="grid gap-2 sm:grid-cols-2">
                {candidatos.map(r => {
                  const seleccionado = miVoto === r.pilotoId;
                  return (
                    <button
                      key={r.pilotoId}
                      disabled={!isRegistered || !!votando || cerrando}
                      aria-pressed={seleccionado}
                      onClick={() => votar(r.pilotoId)}
                      className={`m-row flex items-center justify-between gap-2 rounded-xl border px-3 py-2.5 text-left transition-colors disabled:cursor-default md:rounded-none ${
                        seleccionado ? "border-warn/50 bg-warn/8" : "border-line bg-surface-2 hover:border-warn/30 active:bg-surface-2"
                      }`}
                    >
                      <span className="flex items-center gap-2 min-w-0">
                        {votando === r.pilotoId ? <Loader2 className="w-3.5 h-3.5 animate-spin text-ink-muted shrink-0" /> : <Users className="w-3.5 h-3.5 text-ink-muted shrink-0" />}
                        <span className="truncate text-sm font-bold uppercase tracking-tight text-ink">{nombreDe(currentSplit, r.pilotoId)}</span>
                      </span>
                      <span className="text-xs text-ink-2 shrink-0">{conteos[r.pilotoId] || 0} votos</span>
                    </button>
                  );
                })}
              </div>

              {isAdmin && (
                <div className="mt-4 flex flex-col gap-2 border-t border-line pt-4 sm:flex-row sm:flex-wrap sm:items-center">
                  <select
                    aria-label="Ganador de la votación"
                    value={ganadorElegido}
                    onChange={e => setGanadorElegido(e.target.value)}
                    className="min-h-12 w-full rounded-xl border border-line bg-surface-3 px-3 text-sm text-ink outline-none focus:border-warn sm:min-h-0 sm:w-auto sm:rounded-none sm:py-2 sm:text-xs"
                  >
                    <option value="">{propuesto ? `Más votado: ${nombreDe(currentSplit, propuesto)}` : "Elegir piloto..."}</option>
                    {candidatos.map(r => (
                      <option key={r.pilotoId} value={r.pilotoId}>{nombreDe(currentSplit, r.pilotoId)} ({conteos[r.pilotoId] || 0})</option>
                    ))}
                  </select>
                  <button
                    onClick={cerrarVotacion}
                    disabled={cerrando || !!votando || (!ganadorElegido && !propuesto)}
                    className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-warn px-4 text-sm font-bold text-brand-ink disabled:opacity-40 sm:min-h-0 sm:rounded-none sm:py-2 sm:text-xs sm:font-black sm:uppercase sm:tracking-wider"
                  >
                    {cerrando && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    Cerrar votación y fijar ganador
                  </button>
                </div>
              )}
          </>}
            </>
          )}
        </div>

        {/* ── Bonus heredado del circuito anterior ── */}
        {anteriorGanador && (
          <div className="mt-6 border-t border-line pt-4">
            <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-[0.08em] text-info">
              <Trophy className="w-3.5 h-3.5" />
              {nombreDe(currentSplit, anteriorGanador)} corre con +2 OVR · piloto del día en {anteriorNombre}
            </div>
          </div>
        )}

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
