import { useEffect, useMemo, useState } from "react";
import { ChevronRight, Play, Shield, Users } from "lucide-react";
import { getSplitIntroUrl, getYoutubeEmbedUrl } from "../utils/youtube";

interface TeamsViewProps {
  validSplits: any[];
  currentSplitId: string;
  onSelectSplit: (splitId: string) => void;
  currentSplit: any;
  getPilotPhoto: (pilotId: string) => string;
  darkMode?: boolean;
}

function ratingAccent(rating: number): string {
  if (rating >= 90) return "border-red-400/70 bg-red-500/15 text-red-100";
  if (rating >= 80) return "border-amber-300/60 bg-amber-400/15 text-amber-100";
  if (rating >= 70) return "border-slate-300/40 bg-slate-300/10 text-slate-100";
  return "border-slate-600 bg-slate-800 text-slate-200";
}

export function TeamsView({ validSplits, currentSplitId, onSelectSplit, currentSplit, getPilotPhoto, darkMode = false }: TeamsViewProps) {
  const [selectedTeamId, setSelectedTeamId] = useState("");

  useEffect(() => {
    setSelectedTeamId("");
  }, [currentSplitId]);

  const pilotsByTeam = useMemo(() => {
    const result: Record<string, any[]> = {};
    for (const pilot of currentSplit?.roster || []) {
      if (pilot.participa_hasta != null) continue;
      if (!pilot.equipoId || pilot.equipoId === "agente_libre" || pilot.equipoId === "individual") continue;
      (result[pilot.equipoId] ??= []).push(pilot);
    }
    return result;
  }, [currentSplit]);

  const selectedTeam = (currentSplit?.equipos || []).find((team: any) => team.id === selectedTeamId);
  const selectedPilots = selectedTeam ? pilotsByTeam[selectedTeam.id] || [] : [];
  const selectedAverage = selectedPilots.length
    ? Math.round(selectedPilots.reduce((sum, pilot) => sum + (Number(pilot.rating_piloto) > 0 ? Number(pilot.rating_piloto) : 70), 0) / selectedPilots.length)
    : 0;
  const videoIntroUrl = getSplitIntroUrl(currentSplit?.id, currentSplit?.video_intro);
  const isIndividual = currentSplit?.tipo === "individual" || (currentSplit?.equipos || []).length === 0;

  return (
    <div className="space-y-7">
      <div className={`flex flex-col gap-4 border-b border-black/10 dark:border-white/[0.08] pb-5 ${darkMode ? "border-white/[0.08]" : ""}`}>
        <div>
          <p className={`text-[9px] font-mono uppercase tracking-[0.35em] ${darkMode ? "text-white/50" : "text-black/35 dark:text-white/35"}`}>Archivo de competición</p>
          <h2 className={`mt-1 text-2xl md:text-3xl font-black uppercase tracking-[-0.04em] ${darkMode ? "text-white" : "text-black dark:text-white"}`}>Equipos por temporada</h2>
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

      {isIndividual ? (
        <div className="space-y-4">
          <div className="grid lg:grid-cols-[0.75fr_1.25fr] border border-black/10 dark:border-white/10 bg-[#101116] text-white overflow-hidden">
            <div className="p-6 md:p-8 flex flex-col justify-between min-h-56 bg-[radial-gradient(circle_at_0%_0%,rgba(225,6,0,0.2),transparent_55%)]">
              <div>
                <span className="inline-flex border border-white/15 bg-white/5 px-3 py-1 text-[9px] font-mono uppercase tracking-[0.25em] text-white/55">Temporada individual</span>
                <h3 className="mt-5 text-4xl font-black uppercase tracking-[-0.05em]">{currentSplit?.nombre}</h3>
                <p className="mt-3 max-w-sm text-sm leading-relaxed text-white/50">
                  En esta etapa no existían escuderías permanentes. La clasificación complementaria se disputaba mediante parejas de pilotos.
                </p>
              </div>
              <span className="mt-8 text-[10px] font-mono uppercase tracking-[0.25em] text-[#e10600]">Formato histórico por dúos</span>
            </div>
            {currentSplit?.id === "origins" && videoIntroUrl && (
              <div className="min-h-64 bg-black flex items-center justify-center p-8 bg-[radial-gradient(circle_at_center,rgba(225,6,0,0.3),transparent_55%)]">
                <a
                  href={videoIntroUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center gap-3 bg-[#e10600] px-6 py-4 text-[11px] font-black uppercase tracking-[0.2em] text-white hover:bg-[#ff241c] transition-colors"
                >
                  <Play className="h-5 w-5 fill-current" /> Ver vídeo de Origins
                </a>
              </div>
            )}
            {currentSplit?.id !== "origins" && videoIntroUrl && (
              <div className="min-h-64 bg-black p-6">
                <iframe
                  className="w-full aspect-video"
                  src={`https://www.youtube.com/embed/${videoIntroUrl.split("v=")[1]?.split("&")[0]}`}
                  title={`Vídeo de ${currentSplit?.nombre}`}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              </div>
            )}
          </div>
          {(currentSplit?.duos || []).length > 0 && (
            <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-2">
              {[...(currentSplit.duos || [])]
                .sort((a: any, b: any) => Number(b.puntos || 0) - Number(a.puntos || 0))
                .map((duo: any, index: number) => (
                  <div key={duo.id} className="border border-black/10 dark:border-white/10 bg-white/70 dark:bg-[#111217] p-4 text-black dark:text-white">
                    <span className="text-[8px] font-mono uppercase tracking-[0.25em] opacity-30">Dúo {String(index + 1).padStart(2, "0")}</span>
                    <p className="mt-2 font-black uppercase text-sm leading-tight">{duo.nombre}</p>
                    <p className="mt-4 text-2xl font-black tabular-nums">{duo.puntos} <small className="text-[8px] opacity-35">PTS</small></p>
                  </div>
                ))}
            </div>
          )}
        </div>
      ) : (
        <>
          {videoIntroUrl && (
            <div className="border border-black/10 dark:border-white/10 bg-[#101116] text-white p-4">
              <div className="flex items-center gap-3 mb-4">
                <span className="w-1 h-4 bg-[#e10600] shrink-0" />
                <span className="text-[10px] font-mono tracking-[0.3em] uppercase text-white/50">
                  Vídeo · {currentSplit?.nombre}
                </span>
              </div>
              <iframe
                className="w-full aspect-video"
                src={getYoutubeEmbedUrl(videoIntroUrl)}
                title={`Vídeo de ${currentSplit?.nombre}`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
              <a
                href={videoIntroUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-flex items-center justify-center gap-2 bg-[#e10600] px-4 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-white hover:bg-[#ff241c] transition-colors"
              >
                Abrir en YouTube
              </a>
            </div>
          )}
          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {(currentSplit?.equipos || []).map((team: any) => {
              const pilots = pilotsByTeam[team.id] || [];
              const average = pilots.length
                ? Math.round(pilots.reduce((sum, pilot) => sum + (Number(pilot.rating_piloto) > 0 ? Number(pilot.rating_piloto) : 70), 0) / pilots.length)
                : 0;
              const selected = team.id === selectedTeamId;
              return (
                <button
                  key={team.id}
                  onClick={() => setSelectedTeamId(selected ? "" : team.id)}
                  aria-expanded={selected}
                  className={`group relative min-h-40 overflow-hidden border p-5 text-left transition-all ${
                    selected
                      ? "border-[#e10600] bg-[#15161b] text-white shadow-[0_18px_50px_rgba(225,6,0,0.16)]"
                       : darkMode ? "border-white/10 bg-[#111217] text-white hover:-translate-y-0.5 hover:border-[#e10600]/50" : "border-black/10 dark:border-white/10 bg-white/70 dark:bg-[#111217] text-black dark:text-white hover:-translate-y-0.5 hover:border-[#e10600]/50"
                  }`}
                >
                  <div className="absolute inset-x-0 top-0 h-1 bg-[#e10600] scale-x-0 origin-left transition-transform group-hover:scale-x-100" />
                  {team.logo_url && <img src={team.logo_url} alt="" className="absolute -right-6 -bottom-8 w-36 h-36 object-contain opacity-[0.06]" />}
                  <div className="relative flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-12 h-12 shrink-0 border border-current/10 bg-black/5 dark:bg-white/5 p-1.5 flex items-center justify-center">
                        {team.logo_url
                          ? <img src={team.logo_url} alt={team.nombre} className="w-full h-full object-contain" />
                          : <Shield className="w-6 h-6 opacity-25" />}
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-lg font-black uppercase tracking-[-0.03em] truncate">{team.nombre}</h3>
                        <span className="text-[9px] font-mono uppercase tracking-[0.2em] opacity-40">{pilots.length} pilotos</span>
                      </div>
                    </div>
                    <ChevronRight className={`w-5 h-5 shrink-0 transition-transform ${selected ? "rotate-90 text-[#e10600]" : "opacity-25"}`} />
                  </div>
                  <div className="relative mt-5 flex items-end justify-between border-t border-current/10 pt-3">
                    <div>
                      <span className="block text-[8px] font-mono uppercase tracking-[0.22em] opacity-35">Constructores</span>
                      <strong className="text-xl tabular-nums">{team.puntos_constructores || 0} <small className="text-[9px] opacity-40">PTS</small></strong>
                    </div>
                    <div className="text-right">
                      <span className="block text-[8px] font-mono uppercase tracking-[0.22em] opacity-35">Media equipo</span>
                      <strong className="text-xl tabular-nums">{average || "--"} <small className="text-[9px] opacity-40">OVR</small></strong>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {selectedTeam && (
            <div className="border border-[#e10600]/35 bg-[#0d0e12] text-white shadow-[0_24px_70px_rgba(0,0,0,0.3)]">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 border-b border-white/[0.08]">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 border border-white/10 bg-white/5 p-1.5 flex items-center justify-center">
                    {selectedTeam.logo_url
                      ? <img src={selectedTeam.logo_url} alt={selectedTeam.nombre} className="w-full h-full object-contain" />
                      : <Shield className="w-6 h-6 text-white/20" />}
                  </div>
                  <div>
                    <span className="text-[8px] font-mono uppercase tracking-[0.3em] text-[#e10600]">Alineación · {currentSplit.nombre}</span>
                    <h3 className="text-xl font-black uppercase tracking-[-0.03em]">{selectedTeam.nombre}</h3>
                  </div>
                </div>
                <div className="flex gap-6">
                  <div><span className="block text-[8px] uppercase tracking-[0.2em] text-white/30">Pilotos</span><strong className="text-2xl">{selectedPilots.length}</strong></div>
                  <div><span className="block text-[8px] uppercase tracking-[0.2em] text-white/30">Media</span><strong className="text-2xl">{selectedAverage || "--"}</strong></div>
                </div>
              </div>
              <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-px bg-white/[0.06]">
                {selectedPilots
                  .slice()
                  .sort((a, b) => Number(b.rating_piloto || 0) - Number(a.rating_piloto || 0))
                  .map(pilot => {
                    const photo = getPilotPhoto(pilot.pilotoId);
                    const rating = Number(pilot.rating_piloto) > 0 ? Number(pilot.rating_piloto) : 70;
                    return (
                      <div key={pilot.pilotoId} className="bg-[#101116] p-4 flex items-center gap-3 min-w-0">
                        <div className="w-14 h-14 shrink-0 overflow-hidden bg-white/5 border border-white/10">
                          {photo
                            ? <img src={photo} alt={pilot.nombre} className="w-full h-full object-cover" />
                            : <div className="w-full h-full grid place-items-center text-sm font-black text-white/20">{pilot.nombre?.slice(0, 2).toUpperCase()}</div>}
                        </div>
                        <div className="min-w-0 flex-1">
                          {pilot.rookie && <span className="text-[7px] font-black uppercase tracking-[0.2em] text-sky-300">Rookie</span>}
                          <p className="font-black uppercase truncate text-sm">{pilot.nombre}</p>
                          <span className="text-[8px] font-mono text-white/30">{pilot.puntos_piloto || 0} PTS</span>
                        </div>
                        <div className={`w-14 h-14 shrink-0 border grid place-items-center ${ratingAccent(rating)}`}>
                          <div className="text-center"><strong className="block text-xl leading-none tabular-nums">{rating}</strong><span className="text-[7px] font-black tracking-[0.18em]">OVR</span></div>
                        </div>
                      </div>
                    );
                  })}
                {selectedPilots.length === 0 && (
                  <div className="sm:col-span-2 xl:col-span-4 bg-[#101116] py-10 text-center text-white/25 text-[10px] font-mono uppercase tracking-[0.25em]">
                    <Users className="w-5 h-5 mx-auto mb-2" /> Sin pilotos asignados
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
