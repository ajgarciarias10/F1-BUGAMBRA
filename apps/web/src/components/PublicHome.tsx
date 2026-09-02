import { useState, useMemo, useEffect } from "react";
import { Link } from "react-router";
import { useSplits, useUsuarios } from "../hooks/useData";
import { useAuth } from "../contexts/AuthContext";
import { Sun, Moon, Play, Radio, Crown } from "lucide-react";
import { TotalStandings } from "./SharedDashboard";
import { FomLive } from "./FomLive";
import { MobileBottomTabs } from "./MobileBottomTabs";
import { TeamsView } from "./TeamsView";
import { getSplitIntroUrl, getYoutubeEmbedUrl } from "../utils/youtube";

type Tab = "clasificacion" | "equipos" | "tv";

function useTheme() {
  const [dark, setDark] = useState(() => {
    try { return localStorage.getItem("f1-theme") !== "light"; } catch { return true; }
  });
  const toggle = () => setDark(d => {
    const next = !d;
    try { localStorage.setItem("f1-theme", next ? "dark" : "light"); } catch {}
    return next;
  });
  return { dark, toggle };
}

export function PublicHome() {
  const { user, userData } = useAuth();
  const { splits, loading } = useSplits();
  const { usuarios } = useUsuarios();
  const [activeTab, setActiveTab] = useState<Tab>("clasificacion");
  const [activeSplitId, setActiveSplitId] = useState<string>("");
  const { dark, toggle } = useTheme();
  const [isLive, setIsLive] = useState(false);

  useEffect(() => {
    let mounted = true;
    const checkLive = async () => {
      try {
        const response = await fetch("https://decapi.me/twitch/uptime/tonicotitular");
        const text = (await response.text()).trim().toLowerCase();
        if (mounted) setIsLive(text !== "offline" && !text.includes("error"));
      } catch {
        if (mounted) setIsLive(false);
      }
    };
    checkLive();
    const interval = window.setInterval(checkLive, 60000);
    return () => { mounted = false; window.clearInterval(interval); };
  }, []);

  const validSplits = useMemo(() => {
    const all = (splits || []).filter(s => s.id !== "global");
    const visible = all.filter(s => s.activo || s.completado || s.tipo === "individual");
    return visible.length > 0 ? visible : all;
  }, [splits]);

  const activeSeasonSplitId = validSplits.find(split => split.activo)?.id
    || validSplits.find(split => split.id === "split_3")?.id
    || validSplits.find(split => split.orden === 3)?.id
    || validSplits[validSplits.length - 1]?.id
    || "";
  const selectedRealSplitId = validSplits.some(split => split.id === activeSplitId)
    ? activeSplitId
    : activeSeasonSplitId;
  const currentSplitId = activeTab === "clasificacion" && activeSplitId === "general"
    ? "general"
    : selectedRealSplitId;
  const currentSplit = validSplits.find(split => split.id === selectedRealSplitId);
  const isHistoricalSplit = !!currentSplit?.completado && !currentSplit?.activo;

  const nextRace = useMemo(() => {
    return [...(currentSplit?.circuitos || [])]
      .sort((a, b) => (a.numero_carrera ?? 999) - (b.numero_carrera ?? 999))
      .find(c => !c.completado);
  }, [currentSplit]);

  const pilotStandings = useMemo(() => {
    if (!currentSplit) return [];
    return [...(currentSplit.roster || [])]
      .filter(p => p.equipoId !== "agente_libre")
      .sort((a, b) => (b.puntos_piloto || 0) - (a.puntos_piloto || 0));
  }, [currentSplit]);

  const teamStandings = useMemo(() => {
    if (!currentSplit) return [];
    if (currentSplit.tipo === "individual") {
      return [...(currentSplit.duos || [])]
        .map(duo => ({ ...duo, puntos_constructores: duo.puntos }))
        .sort((a, b) => (b.puntos || 0) - (a.puntos || 0));
    }
    return [...(currentSplit.equipos || [])].sort(
      (a, b) => (b.puntos_constructores || 0) - (a.puntos_constructores || 0)
    );
  }, [currentSplit]);

  const getPilotPhoto = (pilotoId: string) => {
    const u = (usuarios || []).find((u: any) => u.uid === pilotoId || u.piloto_id === pilotoId);
    if (u?.foto_url) return u.foto_url;
    // Fallback: foto en roster para pilotos sin cuenta de usuario
    for (const s of splits || []) {
      const p = (s.roster || []).find((r: any) => r.pilotoId === pilotoId);
      if (p?.foto_url) return p.foto_url;
    }
    return "";
  };

  const dashboardLink = userData
    ? userData.rol === "admin" ? "/admin" : userData.rol === "jeque" ? "/jeque" : userData.rol === "piloto" ? "/piloto" : "/usuario"
    : "/login";

  const tabs: { id: Tab; label: string }[] = [
    { id: "clasificacion", label: "Clasificación" },
    { id: "equipos", label: "Equipos" },
    { id: "tv", label: "TV" },
  ];

  return (
    <div className={`${dark ? "dark broadcast-shell" : ""} min-h-screen bg-[#d6d6d6] text-[#101010] dark:text-white font-sans overflow-x-hidden relative`}>
      {dark && <div className="broadcast-grid absolute inset-x-0 top-0 h-[44rem] pointer-events-none" />}

      {/* ── NAV ── */}
      <header className="fixed top-0 inset-x-0 z-50 min-h-16 md:min-h-16 border-b border-black/10 dark:border-white/10 bg-[#d6d6d6]/95 dark:bg-[#09090b]/95 backdrop-blur-xl flex items-center justify-between px-4 md:px-10 gap-4 safe-top">
        <div className="flex items-center gap-3 shrink-0">
          <span className="grid place-items-center w-9 h-9 bg-[#e10600] text-white font-black italic text-sm">F1</span>
          <span className="font-black tracking-[-0.03em] uppercase text-base">Bugambra</span>
        </div>

        <nav className="hidden md:flex items-center gap-6">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
                className={`relative py-5 text-[11px] font-black tracking-[0.12em] uppercase transition-colors ${
                activeTab === t.id
                  ? "text-[#0a0a0a] dark:text-white after:absolute after:bottom-0 after:inset-x-0 after:h-1 after:bg-[#e10600]"
                  : "text-[#111827]/50 dark:text-white/35 hover:text-[#111827]/80 dark:hover:text-white/70"
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={toggle}
            className="p-2 text-[#0a0a0a]/40 dark:text-white/40 hover:text-[#0a0a0a]/80 dark:hover:text-white/80 transition-colors"
            aria-label="Cambiar tema"
          >
            {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          <Link
            to={dashboardLink}
            className="text-[10px] font-black tracking-[0.14em] uppercase bg-[#0a0a0a] dark:bg-white text-white dark:text-black px-4 py-3 transition-all hover:bg-[#e10600] dark:hover:bg-[#e10600] dark:hover:text-white whitespace-nowrap"
          >
            {user ? "Mi Panel" : "Acceder"}
          </Link>
        </div>
      </header>

      {/* ── HERO ── */}
      <section className="relative pt-24 md:pt-28 px-4 md:px-10 max-w-[90rem] mx-auto">
        <div className="relative min-h-[28rem] md:min-h-[34rem] overflow-hidden bg-[#151518] border border-white/10 text-white flex items-end">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_30%,rgba(225,6,0,0.38),transparent_28%),linear-gradient(115deg,#111114_25%,rgba(17,17,20,0.72)_58%,#2a0909)]" />
          <div className="absolute right-[-7%] top-[4%] text-[16rem] md:text-[25rem] font-black italic leading-none text-white/[0.035] select-none">F1</div>
          <div className="absolute top-5 left-5 md:top-8 md:left-8 flex items-center gap-2 bg-[#e10600] px-3 py-2 text-[9px] font-black uppercase tracking-[0.16em]">
            <Radio className="w-3.5 h-3.5" /> {isHistoricalSplit ? "Archivo histórico" : "Temporada en curso"}
          </div>

          <div className="relative z-10 w-full p-5 sm:p-8 md:p-12 grid md:grid-cols-[1fr_auto] items-end gap-8">
            <div className="max-w-3xl">
              <p className="text-[10px] font-black tracking-[0.24em] text-white/55 uppercase mb-4">
                En portada · {currentSplit?.nombre || "F1 Bugambra"}
              </p>
              <h1 className="text-[3rem] sm:text-6xl md:text-[5.5rem] font-black uppercase leading-[0.84] tracking-[-0.065em]">
                {isHistoricalSplit ? <>El legado<br /><span className="text-[#e10600]">ya está escrito</span></> : <>La competición<br /><span className="text-[#e10600]">empieza aquí</span></>}
              </h1>
              <p className="mt-6 max-w-xl text-sm md:text-base text-white/60 leading-relaxed">
                {isHistoricalSplit
                  ? "Resultados, campeones y estadísticas del archivo histórico de la liga."
                  : "Clasificación, equipos y señal oficial de la liga en una experiencia creada para seguir cada carrera."}
              </p>
              <div className="flex flex-wrap gap-3 mt-7">
                {isLive && (
                  <button onClick={() => setActiveTab("tv")} className="min-h-12 bg-[#e10600] text-white hover:bg-[#ff241c] px-5 flex items-center gap-3 text-[11px] font-black uppercase tracking-[0.12em] transition-colors">
                    <Radio className="w-4 h-4 fill-current" /> Ver en vivo
                  </button>
                )}
              </div>
            </div>

            <div className="w-full md:w-72 border-t-2 border-[#e10600] bg-black/45 backdrop-blur-sm p-5">
              <p className="text-[9px] font-black tracking-[0.2em] text-white/40 uppercase">{isHistoricalSplit ? "Último evento" : "Próximo evento"}</p>
              <p className="mt-3 text-xl font-black uppercase tracking-tight">{nextRace?.nombre || (isHistoricalSplit ? "Temporada cerrada" : "Por anunciar")}</p>
              <div className="flex justify-between items-end mt-5 pt-4 border-t border-white/10">
                <span className="text-[10px] uppercase text-white/45">{currentSplit?.nombre || `${validSplits.length} temporadas`}</span>
                <span className="text-3xl font-black italic text-white/15">{String(nextRace?.numero_carrera ?? "--").padStart(2, "0")}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <MobileBottomTabs tabs={tabs} activeTab={activeTab} onTab={(id) => setActiveTab(id as Tab)} />

      {/* ── CONTENT ── */}
      <main className="relative max-w-[90rem] mx-auto px-4 md:px-10 pt-10 md:py-14 pb-28 md:pb-14">
        <div className="rail-title mb-6">{tabs.find(tab => tab.id === activeTab)?.label}</div>
        {loading ? (
          <div className="text-[#0a0a0a]/20 dark:text-white/20 text-xs font-mono tracking-[0.3em] uppercase py-24 text-center">
            Cargando temporada...
          </div>
        ) : (
          <>
            {activeTab === "clasificacion" && (
              <StandingsView
                validSplits={validSplits}
                currentSplitId={currentSplitId}
                onSelectSplit={setActiveSplitId}
                pilotStandings={pilotStandings}
                teamStandings={teamStandings}
                currentSplit={currentSplit}
                getPilotPhoto={getPilotPhoto}
              />
            )}
            {activeTab === "equipos" && (
              <TeamsView
                key={selectedRealSplitId}
                validSplits={validSplits}
                currentSplitId={selectedRealSplitId}
                onSelectSplit={setActiveSplitId}
                currentSplit={currentSplit}
                getPilotPhoto={getPilotPhoto}
              />
            )}
            {activeTab === "tv" && <FomLive />}
          </>
        )}
      </main>
    </div>
  );
}

// ── HELPERS ────────────────────────────────────────────────────────────────────

function standingsRatingTone(rating: number) {
  if (rating >= 90) return "border-red-500/45 bg-red-500/10 text-red-600 dark:text-red-200";
  if (rating >= 80) return "border-amber-500/45 bg-amber-500/10 text-amber-700 dark:text-amber-100";
  return "border-black/15 dark:border-white/15 bg-black/[0.04] dark:bg-white/[0.06] text-black/65 dark:text-white/75";
}

// ── STANDINGS ──────────────────────────────────────────────────────────────────

function StandingsView({ validSplits, currentSplitId, onSelectSplit, pilotStandings, teamStandings, currentSplit, getPilotPhoto }: any) {
  const [view, setView] = useState<"pilotos" | "constructores">("pilotos");
  const eqMap = useMemo(
    () => Object.fromEntries((currentSplit?.equipos || []).map((e: any) => [e.id, e])),
    [currentSplit]
  );

  const leader = pilotStandings[0];
  const leaderPts = leader?.puntos_piloto || 0;

  const videoIntroUrl = getSplitIntroUrl(currentSplit?.id, currentSplit?.video_intro);

  return (
    <div className="space-y-8">

      {/* Video de introducción del split */}
      {currentSplit?.id === "origins" && videoIntroUrl && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-[#0a0a0a]/[0.08] dark:border-white/[0.06] p-4">
          <div className="flex items-center gap-3">
            <span className="w-1 h-4 bg-[#e10600] shrink-0" />
            <span className="text-[10px] font-mono tracking-[0.3em] uppercase text-[#0a0a0a]/50 dark:text-white/50">
              Intro · {currentSplit?.nombre}
            </span>
          </div>
          <a
            href={videoIntroUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center gap-2 bg-[#e10600] px-5 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-white hover:bg-[#ff241c] transition-colors"
          >
            <Play className="h-4 w-4 fill-current" /> Ver vídeo de Origins
          </a>
        </div>
      )}

      {currentSplit?.id !== "origins" && videoIntroUrl && (
        <div className="border border-[#0a0a0a]/[0.08] dark:border-white/[0.06] p-4">
          <div className="flex items-center gap-3 mb-4">
            <span className="w-1 h-4 bg-[#e10600] shrink-0" />
            <span className="text-[10px] font-mono tracking-[0.3em] uppercase text-[#0a0a0a]/50 dark:text-white/50">
              Vídeo · {currentSplit?.nombre}
            </span>
          </div>
          <div className="aspect-video w-full bg-black">
            <iframe
              className="w-full h-full"
              src={getYoutubeEmbedUrl(videoIntroUrl)}
              title={`Vídeo de ${currentSplit?.nombre}`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          </div>
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

      {/* Controles */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#0a0a0a]/[0.08] dark:border-white/[0.06] pb-6">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-[9px] font-mono tracking-[0.4em] text-[#0a0a0a]/20 dark:text-white/20 uppercase shrink-0">Temporada</span>
          <div className="flex gap-0.5 flex-wrap">
            {validSplits.map((s: any) => (
              <button
                key={s.id}
                onClick={() => onSelectSplit(s.id)}
                className={`px-4 py-2 text-[10px] font-black tracking-[0.2em] uppercase transition-all ${
                  currentSplitId === s.id
                    ? "bg-[#e10600] text-white"
                    : "bg-[#0a0a0a]/[0.04] dark:bg-white/[0.04] text-[#0a0a0a]/35 dark:text-white/35 hover:bg-[#0a0a0a]/[0.08] dark:hover:bg-white/[0.08] hover:text-[#0a0a0a]/70 dark:hover:text-white/70"
                }`}
              >
                {s.nombre}
              </button>
            ))}
            <button
              onClick={() => onSelectSplit("general")}
              className={`px-4 py-2 text-[10px] font-black tracking-[0.2em] uppercase transition-all ${
                currentSplitId === "general"
                  ? "bg-[#e10600] text-white"
                  : "bg-[#0a0a0a]/[0.04] dark:bg-white/[0.04] text-[#0a0a0a]/35 dark:text-white/35 hover:bg-[#0a0a0a]/[0.08] dark:hover:bg-white/[0.08] hover:text-[#0a0a0a]/70 dark:hover:text-white/70"
              }`}
            >
              Mundial
            </button>
          </div>
        </div>

        {currentSplitId !== "general" && (
          <div className="flex border border-[#0a0a0a]/[0.08] dark:border-white/[0.08] self-start sm:self-auto">
            {(["pilotos", "constructores"] as const).map(v => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-4 py-2 text-[10px] font-bold tracking-[0.2em] uppercase transition-all ${
                  view === v
                    ? "bg-[#0a0a0a] text-white dark:bg-white dark:text-black"
                    : "text-[#0a0a0a]/30 dark:text-white/30 hover:text-[#0a0a0a]/60 dark:hover:text-white/60"
                }`}
              >
                {v === "pilotos" ? "Pilotos" : currentSplit?.tipo === "individual" ? "Dúos" : "Constructores"}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Clasificación general acumulada */}
      {currentSplitId === "general" && (
        <TotalStandings splits={validSplits} getPilotPhoto={getPilotPhoto} />
      )}

      {/* Tabla pilotos */}
      {currentSplitId !== "general" && view === "pilotos" && (
        <div className="sport-panel overflow-hidden">
          <div className="grid grid-cols-[2.5rem_1fr_auto_auto] md:grid-cols-[2.5rem_1fr_12rem_6rem_5rem] gap-x-4 px-4 py-3 bg-black/[0.035] dark:bg-white/[0.035] border-b border-[#0a0a0a]/[0.08] dark:border-white/[0.06]">
            <span className="text-[9px] font-mono tracking-[0.3em] text-[#0a0a0a]/20 dark:text-white/20 uppercase">#</span>
            <span className="text-[9px] font-mono tracking-[0.3em] text-[#0a0a0a]/20 dark:text-white/20 uppercase">Piloto</span>
            <span className="hidden md:block text-[9px] font-mono tracking-[0.3em] text-[#0a0a0a]/20 dark:text-white/20 uppercase">Escudería</span>
            <span className="text-[9px] font-mono tracking-[0.3em] text-[#0a0a0a]/20 dark:text-white/20 uppercase text-right">Pts</span>
            <span className="hidden md:block text-[9px] font-mono tracking-[0.3em] text-[#0a0a0a]/20 dark:text-white/20 uppercase text-right">OVR</span>
          </div>

          <div className="divide-y divide-[#0a0a0a]/[0.04] dark:divide-white/[0.04]">
            {pilotStandings.map((p: any, i: number) => {
              const team = eqMap[p.equipoId];
              const photo = getPilotPhoto(p.pilotoId);
                      const isFirst = i === 0;
                      const podiumClass = i === 0 ? "text-[#a87900] dark:text-yellow-300" : i === 1 ? "text-[#667085] dark:text-slate-300" : i === 2 ? "text-[#9a4d19] dark:text-orange-300" : "text-[#0a0a0a]/20 dark:text-white/20";
              const gap = leaderPts > 0 && !isFirst ? leaderPts - (p.puntos_piloto || 0) : 0;

              return (
                <div
                  key={p.pilotoId}
                  className={`grid grid-cols-[2.5rem_1fr_auto_auto] md:grid-cols-[2.5rem_1fr_12rem_6rem_5rem] gap-x-4 px-3 py-4 items-center transition-colors hover:bg-[#0a0a0a]/[0.02] dark:hover:bg-white/[0.02] relative ${
                    isFirst ? "bg-[#0a0a0a]/[0.03] dark:bg-white/[0.03]" : ""
                  }`}
                >
                  {isFirst && <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-[#e10600]" />}

                  <div className="flex items-center">
                    <span className={`text-base font-black font-mono tabular-nums leading-none ${podiumClass}`}>
                      {String(i + 1).padStart(2, "0")}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 min-w-0">
                    {photo ? (
                      <img
                        src={photo}
                        alt={p.nombre}
                        referrerPolicy="no-referrer"
                        className="w-9 h-9 object-cover border border-[#0a0a0a]/[0.08] dark:border-white/[0.08] shrink-0"
                      />
                    ) : (
                      <div className="w-9 h-9 bg-[#0a0a0a]/[0.04] dark:bg-white/[0.04] border border-[#0a0a0a]/[0.08] dark:border-white/[0.08] flex items-center justify-center text-[9px] font-black text-[#0a0a0a]/20 dark:text-white/20 shrink-0">
                        {(p.nombre || "?").slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className={`font-black text-sm tracking-tight truncate leading-tight ${
                        i === 0 ? "text-[#a87900] dark:text-yellow-300" : i === 1 ? "text-[#667085] dark:text-slate-300" : i === 2 ? "text-[#9a4d19] dark:text-orange-300" : "text-[#0a0a0a]/80 dark:text-white/80"
                      }`}>
                        {p.nombre}
                      </p>
                      {p.rookie && <span className="text-[7px] font-black uppercase tracking-[0.18em] text-sky-500 dark:text-sky-300">Rookie</span>}
                      <p className="text-[10px] text-[#0a0a0a]/25 dark:text-white/25 font-mono md:hidden truncate">
                        {team?.nombre || "—"}
                      </p>
                    </div>
                  </div>

                  <div className="hidden md:flex items-center gap-2 min-w-0">
                    {team?.logo_url && (
                      <img src={team.logo_url} alt={team.nombre} className="w-5 h-5 object-contain opacity-60 shrink-0" />
                    )}
                    <span className="text-[11px] text-[#0a0a0a]/35 dark:text-white/35 truncate font-mono">
                      {team?.nombre || "—"}
                    </span>
                  </div>

                  <div className="text-right">
                    <span className={`text-lg font-black tabular-nums leading-none ${
                      i === 0 ? "text-[#a87900] dark:text-yellow-300" : i === 1 ? "text-[#667085] dark:text-slate-300" : i === 2 ? "text-[#9a4d19] dark:text-orange-300" : "text-[#0a0a0a]/70 dark:text-white/70"
                    }`}>
                      {p.puntos_piloto || 0}
                    </span>
                    {gap > 0 && (
                      <p className="text-[9px] font-mono text-[#0a0a0a]/20 dark:text-white/20 mt-0.5">-{gap}</p>
                    )}
                  </div>

                  <div className="hidden md:flex justify-end">
                    <span className={`min-w-12 border px-2 py-1.5 text-center text-sm font-black font-mono tabular-nums ${standingsRatingTone(Number(p.rating_piloto ?? 0))}`}>
                      {currentSplit?.tipo === "individual" ? "--" : p.rating_piloto ?? 0}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {pilotStandings.length === 0 && (
            <div className="py-24 text-center">
              <p className="text-[10px] font-mono tracking-[0.4em] text-[#0a0a0a]/15 dark:text-white/15 uppercase">
                Sin datos de temporada
              </p>
            </div>
          )}
        </div>
      )}

      {/* Tabla constructores */}
      {currentSplitId !== "general" && view === "constructores" && (
        <div className="sport-panel overflow-hidden">
          <div className="grid grid-cols-[2.5rem_1fr_6rem] gap-x-4 px-4 py-3 bg-black/[0.035] dark:bg-white/[0.035] border-b border-[#0a0a0a]/[0.08] dark:border-white/[0.06]">
            <span className="text-[9px] font-mono tracking-[0.3em] text-[#0a0a0a]/20 dark:text-white/20 uppercase">#</span>
            <span className="text-[9px] font-mono tracking-[0.3em] text-[#0a0a0a]/20 dark:text-white/20 uppercase">{currentSplit?.tipo === "individual" ? "Dúo" : "Escudería"}</span>
            <span className="text-[9px] font-mono tracking-[0.3em] text-[#0a0a0a]/20 dark:text-white/20 uppercase text-right">Pts</span>
          </div>

          <div className="divide-y divide-[#0a0a0a]/[0.04] dark:divide-white/[0.04]">
            {teamStandings.map((t: any, i: number) => {
              const isFirst = i === 0;
              return (
                <div
                  key={t.id}
                  className={`grid grid-cols-[2.5rem_1fr_6rem] gap-x-4 px-3 py-5 items-center hover:bg-[#0a0a0a]/[0.02] dark:hover:bg-white/[0.02] transition-colors relative ${
                    isFirst ? "bg-[#0a0a0a]/[0.03] dark:bg-white/[0.03]" : ""
                  }`}
                >
                  {isFirst && <Crown className="absolute right-3 top-3 w-4 h-4 text-yellow-400" />}

                  <span className={`text-base font-black font-mono tabular-nums ${
                    isFirst ? "text-[#e10600]" : i < 3 ? "text-[#0a0a0a]/60 dark:text-white/60" : "text-[#0a0a0a]/20 dark:text-white/20"
                  }`}>
                    {String(i + 1).padStart(2, "0")}
                  </span>

                  <div className="flex items-center gap-3 min-w-0">
                    {t.logo_url ? (
                      <img src={t.logo_url} alt={t.nombre} className="w-8 h-8 object-contain border border-[#0a0a0a]/[0.08] dark:border-white/[0.08] shrink-0 p-0.5" />
                    ) : (
                      <div className="w-8 h-8 bg-[#0a0a0a]/[0.04] dark:bg-white/[0.04] border border-[#0a0a0a]/[0.08] dark:border-white/[0.08] flex items-center justify-center text-[9px] font-black text-[#0a0a0a]/20 dark:text-white/20 shrink-0">
                        {t.nombre?.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <span className={`font-black text-sm tracking-tight truncate ${
                      isFirst ? "text-[#0a0a0a] dark:text-white" : "text-[#0a0a0a]/70 dark:text-white/70"
                    }`}>
                      {t.nombre}
                    </span>
                  </div>

                  <div className="text-right">
                    <span className={`text-lg font-black tabular-nums ${
                      isFirst ? "text-[#0a0a0a] dark:text-white" : "text-[#0a0a0a]/60 dark:text-white/60"
                    }`}>
                      {t.puntos_constructores || 0}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {teamStandings.length === 0 && (
            <div className="py-24 text-center">
              <p className="text-[10px] font-mono tracking-[0.4em] text-[#0a0a0a]/15 dark:text-white/15 uppercase">
                Sin datos de constructores
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
