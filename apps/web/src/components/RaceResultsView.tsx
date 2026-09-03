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
          <p className={`text-[9px] font-mono uppercase tracking-[0.35em] ${darkMode ? "text-white/50" : "text-black/35 dark:text-white/35"}`}>Archivo de carreras</p>
          <h2 className={`mt-1 text-2xl md:text-3xl font-black uppercase tracking-[-0.04em] ${darkMode ? "text-white" : "text-black dark:text-white"}`}>Resultados por circuito</h2>
        </div>
        <div className="flex overflow-x-auto hide-scrollbar border border-black/10 dark:border-white/10 self-start max-w-full">
          {validSplits.map(split => (
            <button
              key={split.id}
              onClick={() => onSelectSplit(split.id)}
              className={`shrink-0 px-4 py-3 text-[10px] font-black uppercase tracking-[0.18em] transition-colors ${
                currentSplitId === split.id
                  ? "bg-[#e10600] text-white"
                  : darkMode ? "bg-white/[0.06] text-white/75 hover:bg-white/[0.12] hover:text-white" : "bg-black/[0.03] dark:bg-white/[0.03] text-black/65 dark:text-white/70 hover:text-black dark:hover:text-white"
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
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {circuitos.map(circuito => {
            const podio = [...(circuito.resultados || [])]
              .filter(r => r.racePos >= 1 && r.racePos <= 3)
              .sort((a, b) => a.racePos - b.racePos);
            return (
              <button
                key={circuito.id}
                onClick={() => setOpenId(circuito.id)}
                className={`group relative overflow-hidden border p-5 text-left transition-all ${
                  darkMode ? "border-white/10 bg-[#111217] text-white hover:-translate-y-0.5 hover:border-[#e10600]/50" : "border-black/10 dark:border-white/10 bg-white/70 dark:bg-[#111217] text-black dark:text-white hover:-translate-y-0.5 hover:border-[#e10600]/50"
                }`}
              >
                <div className="absolute inset-x-0 top-0 h-1 bg-[#e10600] scale-x-0 origin-left transition-transform group-hover:scale-x-100" />
                <h3 className="text-lg font-black uppercase tracking-[-0.03em]">{circuito.nombre}</h3>
                <div className="mt-3 space-y-1">
                  {podio.map(r => (
                    <div key={r.pilotoId} className="flex items-center gap-2 text-[11px] font-mono">
                      <span className="w-4 text-white/30">P{r.racePos}</span>
                      <span className="truncate opacity-75">{nombreDe(currentSplit, r.pilotoId)}</span>
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
    <div className="fixed inset-0 bg-black/85 z-50 overflow-y-auto p-4 md:p-6 text-left backdrop-blur-sm" onClick={onClose}>
      <div className="max-w-5xl mx-auto bg-[#0d0d0d] border border-white/[0.08] p-6 relative my-4" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-4 text-white/40 hover:text-white text-lg leading-none">✕</button>
        <p className="text-[9px] font-mono uppercase tracking-[0.35em] text-[#e10600]">Resultados · {currentSplit?.nombre}</p>
        <h2 className="mt-1 text-2xl md:text-3xl font-black uppercase tracking-[-0.04em] text-white">{circuito.nombre}</h2>

        {/* ── Podio ── */}
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          {podio.map(r => {
            const photo = getPilotPhoto(r.pilotoId);
            return (
              <div key={r.pilotoId} className={`border p-4 text-center ${r.racePos === 1 ? "border-amber-400/40 bg-amber-400/[0.06]" : "border-white/10 bg-white/[0.02]"}`}>
                <div className="w-16 h-16 mx-auto overflow-hidden bg-white/5 border border-white/10">
                  {photo ? <img src={photo} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full grid place-items-center text-white/20 font-black">{nombreDe(currentSplit, r.pilotoId).slice(0, 2).toUpperCase()}</div>}
                </div>
                <p className="mt-2 text-[9px] font-mono uppercase tracking-[0.2em] text-white/30">P{r.racePos}</p>
                <p className="font-black uppercase text-white text-sm truncate">{nombreDe(currentSplit, r.pilotoId)}</p>
              </div>
            );
          })}
          {podio.length === 0 && (
            <div className="sm:col-span-3 text-center py-6 text-[10px] font-mono uppercase tracking-[0.25em] text-white/25">Sin podio registrado</div>
          )}
        </div>

        {/* ── Piloto del día ── */}
        <div className="mt-6 border-t border-white/[0.08] pt-5">
          <div className="flex items-center gap-2 mb-3">
            <Crown className="w-4 h-4 text-amber-400" />
            <span className="text-[9px] font-mono uppercase tracking-[0.3em] text-white/40">Piloto del día</span>
          </div>

          {circuito.piloto_dia_cerrado && circuito.piloto_dia_ganador ? (
            <div className="flex items-center gap-3 border border-amber-400/30 bg-amber-400/[0.06] p-4">
              <div className="w-14 h-14 shrink-0 overflow-hidden bg-white/5 border border-white/10">
                {getPilotPhoto(circuito.piloto_dia_ganador)
                  ? <img src={getPilotPhoto(circuito.piloto_dia_ganador)} alt="" className="w-full h-full object-cover" />
                  : <div className="w-full h-full grid place-items-center text-white/20 font-black">{nombreDe(currentSplit, circuito.piloto_dia_ganador).slice(0, 2).toUpperCase()}</div>}
              </div>
              <div>
                <p className="font-black uppercase text-white">{nombreDe(currentSplit, circuito.piloto_dia_ganador)}</p>
                <p className="text-[9px] font-mono uppercase tracking-[0.2em] text-amber-300">+2 OVR próxima carrera · {totalVotos} voto(s)</p>
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
                      className={`flex items-center justify-between gap-2 border p-2.5 text-left transition-colors disabled:opacity-40 ${
                        seleccionado ? "border-amber-400/50 bg-amber-400/[0.08]" : "border-white/10 bg-white/[0.02] hover:border-amber-400/30"
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
                <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-white/[0.06] pt-4">
                  <select
                    value={ganadorElegido}
                    onChange={e => setGanadorElegido(e.target.value)}
                    className="bg-black/30 border border-white/10 px-3 py-2 text-xs text-white outline-none focus:border-amber-400"
                  >
                    <option value="">{propuesto ? `Más votado: ${nombreDe(currentSplit, propuesto)}` : "Elegir piloto..."}</option>
                    {candidatos.map(r => (
                      <option key={r.pilotoId} value={r.pilotoId}>{nombreDe(currentSplit, r.pilotoId)} ({conteos[r.pilotoId] || 0})</option>
                    ))}
                  </select>
                  <button
                    onClick={cerrarVotacion}
                    disabled={cerrando || (!ganadorElegido && !propuesto)}
                    className="inline-flex items-center gap-2 bg-amber-500 text-black px-4 py-2 text-[10px] font-black uppercase tracking-wider disabled:opacity-40"
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
