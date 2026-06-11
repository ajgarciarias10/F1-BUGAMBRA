import { useState, useMemo } from "react";
import { Link } from "react-router";
import { useSplits, useUsuarios } from "../hooks/useData";
import { useAuth } from "../contexts/AuthContext";
import { MonitorPlay, Sun, Moon } from "lucide-react";
import { PilotCardF1 } from "./PilotCardF1";

type Tab = "clasificacion" | "album" | "tv";

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

  const validSplits = useMemo(() => {
    const all = (splits || []).filter(s => s.id !== "global");
    const active = all.filter(s => s.activo);
    return active.length > 0 ? active : all;
  }, [splits]);

  const currentSplitId = activeSplitId || validSplits[validSplits.length - 1]?.id || "";
  const currentSplit = validSplits.find(s => s.id === currentSplitId);

  const pilotStandings = useMemo(() => {
    if (!currentSplit) return [];
    return [...(currentSplit.roster || [])]
      .filter(p => p.equipoId !== "agente_libre")
      .sort((a, b) => (b.puntos_piloto || 0) - (a.puntos_piloto || 0));
  }, [currentSplit]);

  const teamStandings = useMemo(() => {
    if (!currentSplit) return [];
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
    ? userData.rol === "admin" ? "/admin" : userData.rol === "jeque" ? "/jeque" : "/piloto"
    : "/login";

  const tabs: { id: Tab; label: string }[] = [
    { id: "clasificacion", label: "Clasificación" },
    { id: "album", label: "Álbum" },
    { id: "tv", label: "TV en Directo" },
  ];

  return (
    <div className={`${dark ? "dark" : ""} min-h-screen bg-[#f5f5f5] dark:bg-[#0a0a0a] text-[#0a0a0a] dark:text-white font-sans overflow-x-hidden`}>

      {/* ── NAV ── */}
      <header className="fixed top-0 inset-x-0 z-50 h-14 border-b border-[#0a0a0a]/[0.08] dark:border-white/[0.06] bg-[#f5f5f5]/95 dark:bg-[#0a0a0a]/95 backdrop-blur-md flex items-center justify-between px-4 md:px-10 gap-4">
        <div className="flex items-center gap-3 shrink-0">
          <span className="w-0.5 h-5 bg-[#e10600]" />
          <span className="font-black tracking-[0.15em] uppercase text-sm">F1 Bugambra</span>
        </div>

        <nav className="hidden md:flex items-center gap-6">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`text-[11px] font-mono tracking-[0.25em] uppercase transition-colors ${
                activeTab === t.id
                  ? "text-[#0a0a0a] dark:text-white"
                  : "text-[#0a0a0a]/35 dark:text-white/35 hover:text-[#0a0a0a]/70 dark:hover:text-white/70"
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
            className="text-[10px] font-bold tracking-[0.3em] uppercase text-[#0a0a0a]/70 dark:text-white/70 hover:text-[#0a0a0a] dark:hover:text-white border border-[#0a0a0a]/15 dark:border-white/15 hover:border-[#0a0a0a]/40 dark:hover:border-white/40 px-4 py-2.5 transition-all whitespace-nowrap"
          >
            {user ? "Mi Panel" : "Acceder"}
          </Link>
        </div>
      </header>

      {/* ── HERO ── */}
      <section className="pt-24 pb-12 px-4 md:px-10 max-w-7xl mx-auto">
        <p className="text-[10px] font-mono tracking-[0.4em] text-[#0a0a0a]/25 dark:text-white/25 uppercase mb-4">
          Liga Virtual · {validSplits.length} Temporadas
        </p>
        <h1 className="text-4xl sm:text-5xl md:text-7xl font-black uppercase leading-none tracking-tight">
          Campeonato<br />
          <span className="text-[#e10600]">F1 Bugambra</span>
        </h1>
      </section>

      {/* ── MOBILE TABS ── */}
      <div className="md:hidden flex border-b border-[#0a0a0a]/[0.08] dark:border-white/[0.06] px-4 overflow-x-auto">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`shrink-0 pb-3 mr-6 text-[10px] font-bold tracking-[0.25em] uppercase transition-all border-b-2 -mb-px whitespace-nowrap ${
              activeTab === t.id
                ? "border-[#e10600] text-[#0a0a0a] dark:text-white"
                : "border-transparent text-[#0a0a0a]/30 dark:text-white/30"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── CONTENT ── */}
      <main className="max-w-7xl mx-auto px-4 md:px-10 py-10">
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
            {activeTab === "album" && (
              <AlbumView
                validSplits={validSplits}
                currentSplitId={currentSplitId}
                onSelectSplit={setActiveSplitId}
                currentSplit={currentSplit}
                getPilotPhoto={getPilotPhoto}
              />
            )}
            {activeTab === "tv" && <TvView />}
          </>
        )}
      </main>
    </div>
  );
}

// ── HELPERS ────────────────────────────────────────────────────────────────────

function getYoutubeEmbedUrl(url: string): string | null {
  if (!url) return null;
  const match = url.match(/(?:v=|youtu\.be\/|embed\/)([a-zA-Z0-9_-]{11})/);
  return match ? `https://www.youtube.com/embed/${match[1]}?rel=0&modestbranding=1` : null;
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

  const embedUrl = getYoutubeEmbedUrl(currentSplit?.video_intro ?? "");

  return (
    <div className="space-y-8">

      {/* Video de introducción del split */}
      {embedUrl && (
        <div className="border border-[#0a0a0a]/[0.08] dark:border-white/[0.06] overflow-hidden">
          <div className="flex items-center gap-3 px-4 py-3 border-b border-[#0a0a0a]/[0.06] dark:border-white/[0.06]">
            <span className="w-1 h-4 bg-[#e10600] shrink-0" />
            <span className="text-[10px] font-mono tracking-[0.3em] uppercase text-[#0a0a0a]/50 dark:text-white/50">
              Intro · {currentSplit?.nombre}
            </span>
          </div>
          <div className="aspect-video">
            <iframe
              src={embedUrl}
              title={`Intro ${currentSplit?.nombre}`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="w-full h-full border-0"
            />
          </div>
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
          </div>
        </div>

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
              {v === "pilotos" ? "Pilotos" : "Constructores"}
            </button>
          ))}
        </div>
      </div>

      {/* Tabla pilotos */}
      {view === "pilotos" && (
        <div>
          <div className="grid grid-cols-[2.5rem_1fr_auto_auto] md:grid-cols-[2.5rem_1fr_12rem_6rem_5rem] gap-x-4 px-3 pb-3 border-b border-[#0a0a0a]/[0.08] dark:border-white/[0.06]">
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
                    <span className={`text-base font-black font-mono tabular-nums leading-none ${
                      isFirst ? "text-[#e10600]" : i < 3 ? "text-[#0a0a0a]/60 dark:text-white/60" : "text-[#0a0a0a]/20 dark:text-white/20"
                    }`}>
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
                        isFirst ? "text-[#0a0a0a] dark:text-white" : "text-[#0a0a0a]/80 dark:text-white/80"
                      }`}>
                        {p.nombre}
                      </p>
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
                      isFirst ? "text-[#0a0a0a] dark:text-white" : "text-[#0a0a0a]/70 dark:text-white/70"
                    }`}>
                      {p.puntos_piloto || 0}
                    </span>
                    {gap > 0 && (
                      <p className="text-[9px] font-mono text-[#0a0a0a]/20 dark:text-white/20 mt-0.5">-{gap}</p>
                    )}
                  </div>

                  <div className="hidden md:block text-right">
                    <span className="text-sm font-black font-mono text-[#0a0a0a]/30 dark:text-white/30">
                      {p.rating_piloto ?? 0}
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
      {view === "constructores" && (
        <div>
          <div className="grid grid-cols-[2.5rem_1fr_6rem] gap-x-4 px-3 pb-3 border-b border-[#0a0a0a]/[0.08] dark:border-white/[0.06]">
            <span className="text-[9px] font-mono tracking-[0.3em] text-[#0a0a0a]/20 dark:text-white/20 uppercase">#</span>
            <span className="text-[9px] font-mono tracking-[0.3em] text-[#0a0a0a]/20 dark:text-white/20 uppercase">Escudería</span>
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
                  {isFirst && <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-[#e10600]" />}

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

// PilotCard es ahora el componente compartido PilotCardF1
function PilotCard({ pilot, team, getPilotPhoto, featured = false }: {
  pilot: any; team: any; getPilotPhoto: (id: string) => string; featured?: boolean;
}) {
  return <PilotCardF1 pilot={pilot} team={team} getPilotPhoto={getPilotPhoto} featured={featured} />;
}

// ── ÁLBUM ──────────────────────────────────────────────────────────────────────

export function AlbumView({ validSplits, currentSplitId, onSelectSplit, currentSplit, getPilotPhoto }: any) {
  const eqMap = useMemo(
    () => Object.fromEntries((currentSplit?.equipos || []).map((e: any) => [e.id, e])),
    [currentSplit]
  );

  const pilotsByTeam = useMemo(() => {
    if (!currentSplit) return {};
    const map: Record<string, any[]> = {};
    for (const p of currentSplit.roster || []) {
      if (p.equipoId === "agente_libre") continue;
      (map[p.equipoId] ??= []).push(p);
    }
    return map;
  }, [currentSplit]);

  const champTeamId = useMemo(() => {
    if (!currentSplit) return "";
    let best = "", pts = 0;
    for (const t of currentSplit.equipos || []) {
      if ((t.puntos_constructores || 0) > pts) { pts = t.puntos_constructores; best = t.id; }
    }
    return pts > 0 ? best : "";
  }, [currentSplit]);

  // Piloto de la semana: solo aparece cuando hay un circuito activo (no completado).
  // El piloto destacado es el P1 de la carrera anterior (última completada).
  // El título referencia el circuito activo de esta semana.
  const { lastRace, activeRace, pilotoDestacado } = useMemo(() => {
    if (!currentSplit?.circuitos) return { lastRace: null, activeRace: null, pilotoDestacado: null };
    const sorted = [...(currentSplit.circuitos as any[])].sort(
      (a, b) => (a.numero_carrera ?? 999) - (b.numero_carrera ?? 999)
    );
    // Circuito activo = el primero no completado
    const active = sorted.find(c => !c.completado) || null;
    if (!active) return { lastRace: null, activeRace: null, pilotoDestacado: null };
    // Última carrera completada con resultados
    const completed = sorted.filter(c => c.completado && Array.isArray(c.resultados) && c.resultados.length > 0);
    const race = completed[completed.length - 1] || null;
    if (!race) return { lastRace: null, activeRace: active, pilotoDestacado: null };
    const winner = race.resultados.find((r: any) => r.racePos === 1);
    const piloto = winner
      ? (currentSplit.roster || []).find((p: any) => p.pilotoId === winner.pilotoId) || null
      : null;
    return { lastRace: race, activeRace: active, pilotoDestacado: piloto };
  }, [currentSplit]);

  return (
    <div className="space-y-10">

      {/* Split / Temporada selector */}
      <div className="border-b border-white/[0.06]">
        <div className="flex items-center gap-4 mb-0">
          <div className="flex items-center gap-2 pr-4 border-r border-white/[0.06] shrink-0">
            <span className="w-0.5 h-5 bg-[#e10600]" />
            <span className="text-[9px] font-mono tracking-[0.4em] text-white/20 uppercase leading-none">Temporada</span>
          </div>
          <div className="flex overflow-x-auto hide-scrollbar">
            {validSplits.map((s: any, i: number) => (
              <button
                key={s.id}
                onClick={() => onSelectSplit(s.id)}
                className={`relative shrink-0 flex flex-col items-start px-5 pb-3 pt-2 transition-all group ${
                  currentSplitId === s.id ? "" : "opacity-40 hover:opacity-70"
                }`}
              >
                <span className="text-[8px] font-mono tracking-[0.35em] text-white/30 uppercase leading-none mb-1">
                  T{i + 1}
                </span>
                <span className={`text-[11px] font-black uppercase tracking-[0.15em] leading-none ${
                  currentSplitId === s.id ? "text-white" : "text-white/60"
                }`}>
                  {s.nombre}
                </span>
                {currentSplitId === s.id && (
                  <span className="absolute bottom-0 inset-x-0 h-0.5 bg-[#e10600]" />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Piloto de la Semana */}
      {pilotoDestacado && (
        <div className="border border-[#0a0a0a]/[0.08] dark:border-white/[0.06] overflow-hidden">
          <div className="flex items-center gap-3 px-5 py-3 border-b border-[#0a0a0a]/[0.06] dark:border-white/[0.06]">
            <span className="w-0.5 h-5 bg-[#e10600]" />
            <div>
              <p className="text-[9px] font-mono tracking-[0.4em] text-[#0a0a0a]/20 dark:text-white/20 uppercase leading-none">
                Piloto de la Semana — {activeRace?.nombre}
              </p>
              <p className="text-[10px] font-mono text-[#0a0a0a]/40 dark:text-white/40 mt-0.5">
                P1 en {lastRace?.nombre}
              </p>
            </div>
            <span className="ml-auto text-xl">🏆</span>
          </div>

          <div className="flex flex-col sm:flex-row gap-6 p-5 bg-[#0a0a0a]/[0.02] dark:bg-white/[0.01]">
            {/* Card featured */}
            <div className="w-full sm:w-44 shrink-0">
              <PilotCard
                pilot={pilotoDestacado}
                team={eqMap[pilotoDestacado.equipoId]}
                getPilotPhoto={getPilotPhoto}
                featured
              />
            </div>

            {/* Info */}
            <div className="flex flex-col justify-center space-y-4">
              <div>
                <p className="text-2xl font-black uppercase tracking-tight text-[#0a0a0a] dark:text-white leading-none">
                  {pilotoDestacado.nombre}
                </p>
                <p className="text-[11px] font-mono text-[#0a0a0a]/35 dark:text-white/35 mt-1">
                  {eqMap[pilotoDestacado.equipoId]?.nombre || ""}
                </p>
              </div>

              <div className="flex items-baseline gap-3">
                <span className="text-4xl font-black text-[#e10600] leading-none">P1</span>
                <span className="text-[11px] font-mono text-[#0a0a0a]/40 dark:text-white/40">{lastRace?.nombre}</span>
              </div>

              <div className="flex flex-wrap gap-6">
                {(pilotoDestacado.mantener_actual || 0) > 0 && !pilotoDestacado.congelado && (
                  <div>
                    <p className="text-[8px] font-mono tracking-[0.3em] uppercase text-[#0a0a0a]/25 dark:text-white/25">Precio semana</p>
                    <p className="text-2xl font-black text-[#e10600] tabular-nums">{pilotoDestacado.mantener_actual}M</p>
                  </div>
                )}
                <div>
                  <p className="text-[8px] font-mono tracking-[0.3em] uppercase text-[#0a0a0a]/25 dark:text-white/25">Puntos</p>
                  <p className="text-2xl font-black text-[#0a0a0a] dark:text-white tabular-nums">{pilotoDestacado.puntos_piloto || 0}</p>
                </div>
                <div>
                  <p className="text-[8px] font-mono tracking-[0.3em] uppercase text-[#0a0a0a]/25 dark:text-white/25">Rating</p>
                  <p className="text-2xl font-black text-[#0a0a0a] dark:text-white tabular-nums">{pilotoDestacado.rating_piloto ?? 0}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Grid por equipos */}
      {Object.entries(pilotsByTeam).map(([teamId, pilots]) => {
        const team = eqMap[teamId];
        const isChampTeam = champTeamId === teamId;
        return (
          <div key={teamId}>
            {/* Team header */}
            <div className={`flex items-center gap-4 pb-4 mb-5 border-b ${
              isChampTeam ? "border-[#e10600]/25" : "border-[#0a0a0a]/[0.06] dark:border-white/[0.05]"
            }`}>
              {team?.logo_url ? (
                <img src={team.logo_url} alt={team.nombre} className="w-8 h-8 object-contain" />
              ) : (
                <div className="w-8 h-8 bg-[#0a0a0a]/5 dark:bg-white/5 border border-[#0a0a0a]/10 dark:border-white/10 flex items-center justify-center text-[9px] font-black text-[#0a0a0a]/30 dark:text-white/30">
                  {team?.nombre?.substring(0, 2).toUpperCase()}
                </div>
              )}
              <div>
                <h3 className={`font-black uppercase tracking-tight text-sm ${
                  isChampTeam ? "text-[#e10600]" : "text-[#0a0a0a] dark:text-white"
                }`}>
                  {team?.nombre || teamId}
                  {isChampTeam && <span className="ml-2 text-[10px] font-mono tracking-widest text-[#e10600]/50">· Campeón</span>}
                </h3>
                <p className="text-[9px] font-mono text-[#0a0a0a]/25 dark:text-white/25 uppercase tracking-widest mt-0.5">
                  {team?.puntos_constructores || 0} pts constructores
                </p>
              </div>
            </div>

            {/* Pilot cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
              {(pilots as any[])
                .sort((a, b) => (b.puntos_piloto || 0) - (a.puntos_piloto || 0))
                .map((p: any) => (
                  <PilotCard
                    key={p.pilotoId}
                    pilot={p}
                    team={team}
                    getPilotPhoto={getPilotPhoto}
                    featured={pilotoDestacado?.pilotoId === p.pilotoId}
                  />
                ))}
            </div>
          </div>
        );
      })}

      {Object.keys(pilotsByTeam).length === 0 && (
        <p className="text-center text-[#0a0a0a]/20 dark:text-white/20 text-xs font-mono tracking-widest uppercase py-24">
          Sin datos de temporada
        </p>
      )}
    </div>
  );
}

// ── TV EN DIRECTO ──────────────────────────────────────────────────────────────

function TvView() {
  const domain = window.location.hostname;
  const channels = [
    { id: "tonicotitular", name: "Piloto Toni" },
    { id: "fabiml_204", name: "Piloto Fabi" },
  ];

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {channels.map(ch => (
          <div key={ch.id} className="border border-[#0a0a0a]/[0.08] dark:border-white/[0.08]">
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#0a0a0a]/[0.06] dark:border-white/[0.06]">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#e10600] animate-pulse" />
                <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-[#0a0a0a] dark:text-white">{ch.name}</span>
              </div>
              <span className="text-[9px] font-mono text-[#0a0a0a]/25 dark:text-white/25">@{ch.id}</span>
            </div>
            <div className="aspect-video bg-black">
              <iframe
                src={`https://player.twitch.tv/?channel=${ch.id}&parent=${domain === "localhost" ? "localhost" : domain}`}
                height="100%" width="100%" allowFullScreen
                className="w-full h-full border-0"
              />
            </div>
          </div>
        ))}
      </div>

      <div className="border-t border-[#0a0a0a]/[0.06] dark:border-white/[0.06] pt-8">
        <p className="text-[10px] font-mono tracking-[0.35em] text-[#0a0a0a]/30 dark:text-white/30 uppercase mb-4">Repeticiones y VODs</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {channels.map(ch => (
            <a
              key={ch.id}
              href={`https://www.twitch.tv/${ch.id}/videos`}
              target="_blank" rel="noopener noreferrer"
              className="flex items-center justify-between px-5 py-4 border border-[#0a0a0a]/[0.08] dark:border-white/[0.08] hover:border-[#0a0a0a]/20 dark:hover:border-white/20 transition-all group"
            >
              <div className="flex items-center gap-3">
                <MonitorPlay className="w-4 h-4 text-[#0a0a0a]/25 dark:text-white/25 group-hover:text-[#0a0a0a]/60 dark:group-hover:text-white/60 transition-colors" />
                <span className="text-xs font-bold uppercase tracking-tight text-[#0a0a0a] dark:text-white">{ch.name}</span>
              </div>
              <span className="text-[9px] font-mono text-[#0a0a0a]/30 dark:text-white/30 uppercase tracking-widest group-hover:text-[#e10600] transition-colors">Ver →</span>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
