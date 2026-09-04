import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../services/firebase";
import { useAuth } from "../contexts/AuthContext";
import { votarPilotoDelDia, cerrarVotacionPilotoDelDia } from "../services/raceProcessor";
import type { Circuito } from "../types";
import { Trophy, Crown, Loader2, Users } from "lucide-react";

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

export function RaceResultsView({ validSplits, currentSplitId, onSelectSplit, currentSplit, getPilotPhoto, darkMode = false }: RaceResultsViewProps) {
  const { user, userData } = useAuth();
  const [openId, setOpenId] = useState<string | null>(null);
  const isAdmin = userData?.rol === "admin";

  const circuitos: Circuito[] = ([...(currentSplit?.circuitos || [])] as Circuito[])
    .filter(c => c.completado)
    .sort((a, b) => (a.numero_carrera ?? 9999) - (b.numero_carrera ?? 9999));

  const abierto = circuitos.find(c => c.id === openId) || null;
  // El bonus del circuito anterior es lo que se refleja en este: buscamos su ganador cerrado.
  const indiceAbierto = abierto ? circuitos.findIndex(c => c.id === abierto.id) : -1;
  const anterior = indiceAbierto > 0 ? circuitos[indiceAbierto - 1] : null;

  return (
    <div className="space-y-7">
      <div className={`flex flex-col gap-4 border-b border-black/10 dark:border-white/[0.08] pb-5 ${darkMode ? "border-white/[0.08]" : ""}`}>
        <div>
          <p className={`text-[11px] md:text-[9px] md:font-mono md:uppercase md:tracking-[0.35em] ${darkMode ? "text-white/50" : "text-black/45 dark:text-white/45"}`}>Archivo de carreras</p>
          <h2 className={`mt-1 text-xl md:text-3xl font-black uppercase tracking-[-0.03em] md:tracking-[-0.04em] ${darkMode ? "text-white" : "text-black dark:text-white"}`}>Resultados por circuito</h2>
        </div>
        <div className="m-rail hide-scrollbar gap-2 md:gap-0 md:border md:border-black/10 md:dark:border-white/10 md:self-start md:max-w-full">
          {validSplits.map(split => (
            <button
              key={split.id}
              onClick={() => onSelectSplit(split.id)}
              className={`min-h-11 shrink-0 rounded-full md:rounded-none px-4 text-[12px] font-bold md:py-3 md:text-[10px] md:font-black md:uppercase md:tracking-[0.18em] transition-colors ${
                currentSplitId === split.id
                  ? "bg-[#e10600] text-white"
                  : darkMode ? "bg-white/[0.08] text-white/75 hover:bg-white/[0.14] hover:text-white" : "bg-black/[0.05] dark:bg-white/[0.06] text-black/70 dark:text-white/70 hover:text-black dark:hover:text-white"
              }`}
            >
              {split.nombre}
            </button>
          ))}
        </div>
      </div>

      {circuitos.length === 0 ? (
        <div className="border border-dashed border-black/10 dark:border-white/10 py-16 text-center">
          <Trophy className="w-6 h-6 mx-auto text-black/15 dark:text-white/15" />
          <p className="mt-3 text-[10px] font-mono uppercase tracking-[0.3em] text-black/25 dark:text-white/25">Todavía no hay carreras cerradas en {currentSplit?.nombre}</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {circuitos.map(circuito => {
            const podio = [...(circuito.resultados || [])]
              .filter(r => r.racePos >= 1 && r.racePos <= 3)
              .sort((a, b) => a.racePos - b.racePos);
            return (
              <button
                key={circuito.id}
                onClick={() => setOpenId(circuito.id)}
                className={`m-card group relative overflow-hidden border p-4 md:p-5 text-left transition-all active:scale-[0.99] ${
                  darkMode ? "border-white/10 bg-[#111217] text-white hover:-translate-y-0.5 hover:border-[#e10600]/50" : "border-black/10 dark:border-white/10 bg-white/70 dark:bg-[#111217] text-black dark:text-white hover:-translate-y-0.5 hover:border-[#e10600]/50"
                }`}
              >
                <div className="absolute inset-x-0 top-0 h-1 bg-[#e10600] scale-x-0 origin-left transition-transform group-hover:scale-x-100" />
                <h3 className="text-lg font-black uppercase tracking-[-0.03em]">{circuito.nombre}</h3>
                <div className="mt-3 space-y-1">
                  {podio.map(r => (
                    <div key={r.pilotoId} className="flex items-center gap-2 text-[13px] md:text-[11px] md:font-mono">
                      <span className="w-6 shrink-0 font-bold opacity-45">P{r.racePos}</span>
                      <span className="truncate opacity-80">{nombreDe(currentSplit, r.pilotoId)}</span>
                    </div>
                  ))}
                  {podio.length === 0 && <span className="text-[10px] font-mono uppercase tracking-[0.2em] opacity-30">Sin podio registrado</span>}
                </div>
                {circuito.piloto_dia_cerrado && circuito.piloto_dia_ganador && (
                  <div className="mt-3 flex items-center gap-1.5 text-[9px] font-mono uppercase tracking-[0.2em] text-amber-400">
                    <Crown className="w-3 h-3" /> {nombreDe(currentSplit, circuito.piloto_dia_ganador)}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}

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
          onClose={() => setOpenId(null)}
        />
      )}
    </div>
  );
}

function RaceDetailModal({
  splitId, circuitoBase, anteriorGanador, anteriorNombre, currentSplit, getPilotPhoto, uid, isAdmin, onClose,
}: {
  splitId: string;
  circuitoBase: Circuito;
  anteriorGanador: string | null;
  anteriorNombre?: string;
  currentSplit: any;
  getPilotPhoto: (pilotId: string) => string;
  uid?: string;
  isAdmin: boolean;
  onClose: () => void;
}) {
  const [circuito, setCircuito] = useState<Circuito>(circuitoBase);
  const [votando, setVotando] = useState<string | null>(null);
  const [cerrando, setCerrando] = useState(false);
  const [ganadorElegido, setGanadorElegido] = useState("");

  // Vivo, directo al doc: así cada voto se ve al instante sin releer todo el split.
  useEffect(() => {
    const ref = doc(db, `splits/${splitId}/circuitos`, circuitoBase.id);
    return onSnapshot(ref, snap => {
      if (snap.exists()) setCircuito({ id: snap.id, ...(snap.data() as any) });
    });
  }, [splitId, circuitoBase.id]);

  const podio = [...(circuito.resultados || [])]
    .filter(r => r.racePos >= 1 && r.racePos <= 3)
    .sort((a, b) => a.racePos - b.racePos);

  const candidatos = [...(circuito.resultados || [])].filter(r => r.racePos !== 99);
  const votantes = circuito.piloto_dia_votantes || {};
  const conteos: Record<string, number> = {};
  Object.values(votantes).forEach(pid => { conteos[pid] = (conteos[pid] || 0) + 1; });
  const totalVotos = Object.keys(votantes).length;
  const miVoto = uid ? votantes[uid] : undefined;
  const propuesto = Object.entries(conteos).sort((a, b) => b[1] - a[1])[0]?.[0];

  const votar = async (pilotoId: string) => {
    if (!uid) return;
    setVotando(pilotoId);
    try {
      await votarPilotoDelDia(splitId, circuitoBase.id, uid, pilotoId);
    } finally {
      setVotando(null);
    }
  };

  const cerrarVotacion = async () => {
    const ganador = ganadorElegido || propuesto;
    if (!ganador) return;
    setCerrando(true);
    try {
      await cerrarVotacionPilotoDelDia(splitId, circuitoBase.id, ganador);
    } finally {
      setCerrando(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/85 z-50 overflow-y-auto overscroll-contain p-0 md:p-6 text-left backdrop-blur-sm" onClick={onClose}>
      <div className="relative mx-auto my-0 min-h-[100dvh] max-w-5xl border-white/[0.08] bg-[#0d0d0d] p-4 pb-[max(2rem,env(safe-area-inset-bottom))] md:my-4 md:min-h-0 md:border md:p-6" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} aria-label="Cerrar" className="sticky top-[max(0.5rem,env(safe-area-inset-top))] z-10 -mr-1 ml-auto grid h-11 w-11 place-items-center rounded-full border border-white/10 bg-[#0d0d0d] text-white/60 hover:text-white md:absolute md:top-4 md:right-4 md:ml-0">✕</button>
        <p className="text-[11px] font-bold text-[#e10600] md:font-mono md:text-[9px] md:uppercase md:tracking-[0.35em]">Resultados · {currentSplit?.nombre}</p>
        <h2 className="mt-1 text-2xl md:text-3xl font-black uppercase tracking-[-0.04em] text-white">{circuito.nombre}</h2>

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
                      ? "winner-shine winner-glow border-amber-400/60 bg-gradient-to-b from-amber-400/[0.18] to-amber-400/[0.04]"
                      : "border-white/10 bg-white/[0.02]"
                  }`}
                >
                  {esGanador && (
                    <Crown className="crown-pop mx-auto mb-1 h-5 w-5 text-amber-300 drop-shadow-[0_0_8px_rgba(251,191,36,0.7)]" />
                  )}
                  <div className={`mx-auto overflow-hidden rounded-full bg-white/5 sm:rounded-none ${
                    esGanador ? "h-16 w-16 border-2 border-amber-300/70 sm:h-20 sm:w-20" : "h-14 w-14 border border-white/10 sm:h-16 sm:w-16"
                  }`}>
                    {photo ? <img src={photo} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full grid place-items-center text-white/20 font-black">{nombreDe(currentSplit, r.pilotoId).slice(0, 2).toUpperCase()}</div>}
                  </div>
                  <p className={`mt-2 text-[11px] font-bold sm:font-mono sm:text-[9px] sm:uppercase sm:tracking-[0.2em] ${esGanador ? "text-amber-300" : "text-white/40"}`}>
                    P{r.racePos}
                  </p>
                  <p className={`truncate font-black uppercase text-white ${esGanador ? "text-sm sm:text-base" : "text-[13px] sm:text-sm"}`}>
                    {nombreDe(currentSplit, r.pilotoId)}
                  </p>
                </div>

                {/* Peana. La cifra grande hace de número del cajón. */}
                <div className={`${peana} grid place-items-end justify-center overflow-hidden rounded-b-xl border-x border-b sm:rounded-none ${
                  esGanador ? "border-amber-400/40 bg-gradient-to-b from-amber-400/25 to-transparent" : "border-white/10 bg-gradient-to-b from-white/[0.07] to-transparent"
                }`}>
                  <span className={`pb-1 text-2xl font-black italic leading-none tabular-nums sm:text-3xl ${esGanador ? "text-amber-300/70" : "text-white/20"}`}>
                    {r.racePos}
                  </span>
                </div>
              </div>
            );
          })}
          {podio.length === 0 && (
            <div className="col-span-3 py-6 text-center text-[10px] font-mono uppercase tracking-[0.25em] text-white/25">Sin podio registrado</div>
          )}
        </div>

        {/* ── Piloto del día ── */}
        <div className="mt-6 border-t border-white/[0.08] pt-5">
          <div className="flex items-center gap-2 mb-3">
            <Crown className="w-4 h-4 text-amber-400" />
            <span className="text-[9px] font-mono uppercase tracking-[0.3em] text-white/40">Piloto del día</span>
          </div>

          {circuito.piloto_dia_cerrado && circuito.piloto_dia_ganador ? (
            <div className="m-card winner-glow flex items-center gap-3 border border-amber-400/40 bg-gradient-to-r from-amber-400/[0.14] to-amber-400/[0.03] p-4">
              {/* La foto es el ancla del "+2": la insignia sale justo de ella. */}
              <div className="relative shrink-0">
                <div className="h-14 w-14 overflow-hidden rounded-full border-2 border-amber-300/60 bg-white/5 sm:rounded-none sm:border">
                  {getPilotPhoto(circuito.piloto_dia_ganador)
                    ? <img src={getPilotPhoto(circuito.piloto_dia_ganador)} alt="" className="w-full h-full object-cover" />
                    : <div className="w-full h-full grid place-items-center text-white/20 font-black">{nombreDe(currentSplit, circuito.piloto_dia_ganador).slice(0, 2).toUpperCase()}</div>}
                </div>
                <span
                  aria-hidden="true"
                  className="bonus-plus2 pointer-events-none absolute -right-2 -top-2 rounded-full bg-amber-400 px-2 py-0.5 text-[12px] font-black tabular-nums text-black shadow-[0_0_14px_rgba(251,191,36,0.8)]"
                >
                  +2
                </span>
              </div>
              <div className="min-w-0">
                <span className="flex items-center gap-1.5 text-[11px] font-bold text-amber-300">
                  <Crown className="crown-pop h-3.5 w-3.5" /> Piloto del día
                </span>
                <p className="truncate text-base font-black uppercase text-white">{nombreDe(currentSplit, circuito.piloto_dia_ganador)}</p>
                <p className="text-[12px] text-amber-300/80 sm:font-mono sm:text-[9px] sm:uppercase sm:tracking-[0.2em]">
                  +2 OVR en la próxima carrera · {totalVotos} voto(s)
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="grid gap-2 sm:grid-cols-2">
                {candidatos.map(r => {
                  const seleccionado = miVoto === r.pilotoId;
                  return (
                    <button
                      key={r.pilotoId}
                      disabled={!uid || votando === r.pilotoId}
                      onClick={() => votar(r.pilotoId)}
                      className={`m-row flex items-center justify-between gap-2 rounded-xl border px-3 py-2.5 text-left transition-colors disabled:opacity-40 md:rounded-none ${
                        seleccionado ? "border-amber-400/50 bg-amber-400/[0.08]" : "border-white/10 bg-white/[0.02] hover:border-amber-400/30 active:bg-white/[0.06]"
                      }`}
                    >
                      <span className="flex items-center gap-2 min-w-0">
                        {votando === r.pilotoId ? <Loader2 className="w-3.5 h-3.5 animate-spin text-white/40 shrink-0" /> : <Users className="w-3.5 h-3.5 text-white/25 shrink-0" />}
                        <span className="truncate text-sm font-bold uppercase tracking-tight text-white">{nombreDe(currentSplit, r.pilotoId)}</span>
                      </span>
                      <span className="text-[10px] font-mono text-white/40 shrink-0">{conteos[r.pilotoId] || 0}</span>
                    </button>
                  );
                })}
              </div>
              {!uid && <p className="mt-2 text-[10px] font-mono uppercase tracking-[0.22em] text-white/25">Inicia sesión para votar</p>}

              {isAdmin && (
                <div className="mt-4 flex flex-col gap-2 border-t border-white/[0.06] pt-4 sm:flex-row sm:flex-wrap sm:items-center">
                  <select
                    value={ganadorElegido}
                    onChange={e => setGanadorElegido(e.target.value)}
                    className="min-h-12 w-full rounded-xl border border-white/10 bg-black/30 px-3 text-sm text-white outline-none focus:border-amber-400 sm:min-h-0 sm:w-auto sm:rounded-none sm:py-2 sm:text-xs"
                  >
                    <option value="">{propuesto ? `Más votado: ${nombreDe(currentSplit, propuesto)}` : "Elegir piloto..."}</option>
                    {candidatos.map(r => (
                      <option key={r.pilotoId} value={r.pilotoId}>{nombreDe(currentSplit, r.pilotoId)} ({conteos[r.pilotoId] || 0})</option>
                    ))}
                  </select>
                  <button
                    onClick={cerrarVotacion}
                    disabled={cerrando || (!ganadorElegido && !propuesto)}
                    className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 text-sm font-bold text-black disabled:opacity-40 sm:min-h-0 sm:rounded-none sm:py-2 sm:text-[10px] sm:font-black sm:uppercase sm:tracking-wider"
                  >
                    {cerrando && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    Cerrar votación y fijar ganador
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* ── Bonus heredado del circuito anterior ── */}
        {anteriorGanador && (
          <div className="mt-6 border-t border-white/[0.08] pt-4">
            <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.2em] text-sky-300">
              <Trophy className="w-3.5 h-3.5" />
              {nombreDe(currentSplit, anteriorGanador)} corre con +2 OVR · piloto del día en {anteriorNombre}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
