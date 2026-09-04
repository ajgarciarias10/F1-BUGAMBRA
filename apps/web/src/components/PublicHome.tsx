import { useState, useMemo, useEffect, Suspense, lazy } from "react";
import { Link } from "react-router";
import { useSplits, useUsuarios } from "../hooks/useData";
import { useAuth } from "../contexts/AuthContext";
import { Sun, Moon, Play, Radio, Crown } from "lucide-react";
import { TotalStandings } from "./TotalStandings";
import { MobileBottomTabs } from "./MobileBottomTabs";

// La portada abre siempre en Clasificación. Equipos, Resultados y TV solo hacen
// falta si el usuario toca esas pestañas, así que no viajan en el arranque.
const FomLive = lazy(() => import("./FomLive").then(m => ({ default: m.FomLive })));
const TeamsView = lazy(() => import("./TeamsView").then(m => ({ default: m.TeamsView })));
const RaceResultsView = lazy(() => import("./RaceResultsView").then(m => ({ default: m.RaceResultsView })));

const tabFallback = (
  <div className="py-20 text-center text-[13px] text-black/30 dark:text-white/30">Cargando…</div>
);
import { getSplitIntroUrl, getYoutubeEmbedUrl } from "../utils/youtube";
import { InstallButton } from "./InstallApp";
import { usePWAInstall } from "../hooks/usePWAInstall";

type Tab = "clasificacion" | "equipos" | "resultados" | "tv";

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
    { id: "resultados", label: "Resultados" },
    { id: "tv", label: "TV" },
  ];

  return (
    <div className={`${dark ? "dark broadcast-shell" : ""} min-h-[100dvh] bg-[#d6d6d6] text-[#101010] dark:text-white font-sans overflow-x-hidden relative`}>
      {dark && <div className="broadcast-grid absolute inset-x-0 top-0 h-[44rem] pointer-events-none" />}

      {/* ── NAV ── */}
      <header className="fixed top-0 inset-x-0 z-50 min-h-14 md:min-h-16 border-b border-black/10 dark:border-white/10 bg-[#d6d6d6]/95 dark:bg-[#09090b]/95 backdrop-blur-xl flex items-center justify-between px-3 md:px-10 gap-2 md:gap-4 safe-top safe-x">
        <div className="flex items-center gap-2.5 min-w-0 shrink">
          <span className="grid place-items-center w-9 h-9 shrink-0 bg-[#e10600] text-white font-black italic text-sm">F1</span>
          <span className="font-black tracking-[-0.03em] uppercase text-base truncate">Bugambra</span>
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

        <div className="flex items-center gap-1 md:gap-2 shrink-0">
          <button
            onClick={toggle}
            className="grid h-11 w-11 place-items-center text-[#0a0a0a]/40 dark:text-white/40 hover:text-[#0a0a0a]/80 dark:hover:text-white/80 transition-colors"
            aria-label="Cambiar tema"
          >
            {dark ? <Sun className="w-[18px] h-[18px]" /> : <Moon className="w-[18px] h-[18px]" />}
          </button>
          <Link
            to={dashboardLink}
            className="flex min-h-10 items-center rounded-full md:rounded-none bg-[#0a0a0a] dark:bg-white px-4 text-[12px] font-bold text-white dark:text-black transition-all hover:bg-[#e10600] dark:hover:bg-[#e10600] dark:hover:text-white whitespace-nowrap md:text-[10px] md:font-black md:uppercase md:tracking-[0.14em]"
          >
            {user ? "Mi Panel" : "Acceder"}
          </Link>
        </div>
      </header>

      {/* ── HERO ──
          En móvil se recorta a una tarjeta compacta: el titular gigante de
          escritorio ocupaba una pantalla entera antes de llegar al contenido. */}
      <section className="relative pt-appbar md:pt-28 px-3 md:px-10 max-w-[90rem] mx-auto safe-x">
        <div className="m-card relative min-h-[17rem] sm:min-h-[24rem] md:min-h-[34rem] overflow-hidden bg-[#151518] border border-white/10 text-white flex items-end">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_30%,rgba(225,6,0,0.38),transparent_28%),linear-gradient(115deg,#111114_25%,rgba(17,17,20,0.72)_58%,#2a0909)]" />
          <div className="absolute right-[-7%] top-[4%] text-[11rem] sm:text-[16rem] md:text-[25rem] font-black italic leading-none text-white/[0.035] select-none">F1</div>
          <div className="absolute top-4 left-4 md:top-8 md:left-8 flex items-center gap-2 rounded-full md:rounded-none bg-[#e10600] px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide">
            <Radio className="w-3.5 h-3.5" /> {isHistoricalSplit ? "Archivo histórico" : "Temporada en curso"}
          </div>

          <div className="relative z-10 w-full p-4 sm:p-8 md:p-12 grid md:grid-cols-[1fr_auto] items-end gap-5 md:gap-8">
            <div className="max-w-3xl">
              <p className="text-[11px] font-bold tracking-wide text-white/55 mb-2 md:mb-4 md:uppercase md:font-black md:tracking-[0.24em]">
                En portada · {currentSplit?.nombre || "F1 Bugambra"}
              </p>
              <h1 className="text-[2rem] sm:text-5xl md:text-[5.5rem] font-black uppercase leading-[0.9] md:leading-[0.84] tracking-[-0.04em] md:tracking-[-0.065em]">
                {isHistoricalSplit ? <>El legado<br /><span className="text-[#e10600]">ya está escrito</span></> : <>La competición<br /><span className="text-[#e10600]">empieza aquí</span></>}
              </h1>
              <p className="mt-3 md:mt-6 max-w-xl text-[13px] md:text-base text-white/60 leading-relaxed">
                {isHistoricalSplit
                  ? "Resultados, campeones y estadísticas del archivo histórico de la liga."
                  : "Clasificación, equipos y señal oficial de la liga para seguir cada carrera."}
              </p>
              {isLive && (
                <button
                  onClick={() => setActiveTab("tv")}
                  className="mt-5 flex min-h-12 w-full items-center justify-center gap-3 rounded-xl bg-[#e10600] px-5 text-sm font-bold text-white transition-colors hover:bg-[#ff241c] active:scale-[0.98] sm:w-auto md:rounded-none md:text-[11px] md:font-black md:uppercase md:tracking-[0.12em]"
                >
                  <Radio className="w-4 h-4 fill-current" /> Ver en vivo
                </button>
              )}
            </div>

            {/* La ficha del próximo evento se oculta en móvil: la misma
                información aparece completa en el widget de carrera. */}
            <div className="hidden sm:block w-full md:w-72 border-t-2 border-[#e10600] bg-black/45 backdrop-blur-sm p-5">
              <p className="text-[9px] font-black tracking-[0.2em] text-white/40 uppercase">{isHistoricalSplit ? "Último evento" : "Próximo evento"}</p>
              <p className="mt-3 text-xl font-black uppercase tracking-tight">{nextRace?.nombre || (isHistoricalSplit ? "Temporada cerrada" : "Por anunciar")}</p>
              <div className="flex justify-between items-end mt-5 pt-4 border-t border-white/10">
                <span className="text-[10px] uppercase text-white/45">{currentSplit?.nombre || `${validSplits.length} temporadas`}</span>
                <span className="text-3xl font-black italic text-white/15">{String(nextRace?.numero_carrera ?? "--").padStart(2, "0")}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Versión móvil de la ficha de evento: una línea, sin robarle pantalla. */}
        <div className="sm:hidden mt-3 flex items-center gap-3 rounded-xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-white/[0.04] px-4 py-3">
          <span className="text-2xl font-black italic tabular-nums text-[#e10600]">
            {String(nextRace?.numero_carrera ?? "--").padStart(2, "0")}
          </span>
          <div className="min-w-0">
            <p className="text-[11px] text-black/45 dark:text-white/45">{isHistoricalSplit ? "Último evento" : "Próximo evento"}</p>
            <p className="truncate text-sm font-bold">{nextRace?.nombre || (isHistoricalSplit ? "Temporada cerrada" : "Por anunciar")}</p>
          </div>
        </div>
      </section>

      <MobileBottomTabs tabs={tabs} activeTab={activeTab} onTab={(id) => setActiveTab(id as Tab)} />

      {/* ── CONTENT ── */}
      <main className="relative max-w-[90rem] mx-auto px-3 md:px-10 pt-8 md:py-14 pb-tabbar md:pb-14 safe-x">
        <div className="rail-title mb-5 md:mb-6">{tabs.find(tab => tab.id === activeTab)?.label}</div>
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
            {activeTab !== "clasificacion" && <Suspense fallback={tabFallback}>
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
            {activeTab === "resultados" && (
              <RaceResultsView
                key={selectedRealSplitId}
                validSplits={validSplits}
                currentSplitId={selectedRealSplitId}
                onSelectSplit={setActiveSplitId}
                currentSplit={currentSplit}
                getPilotPhoto={getPilotPhoto}
              />
            )}
            {activeTab === "tv" && <FomLive />}
            </Suspense>}
          </>
        )}

        <InstallPromoCard />
      </main>
    </div>
  );
}

// ── PROMO DE INSTALACIÓN ───────────────────────────────────────────────────────
// Punto de entrada permanente a /instalar: el banner flotante se puede descartar
// para siempre, así que necesita un sitio estable donde volver a encontrarlo.

function InstallPromoCard() {
  const { installed } = usePWAInstall();
  if (installed) return null;

  return (
    <div className="mt-10 flex flex-col gap-4 rounded-2xl md:rounded-none border border-black/10 dark:border-white/10 bg-white/60 dark:bg-white/[0.03] p-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-4">
        <img src="/icons/icon-192.png" alt="" className="h-12 w-12 shrink-0 rounded-xl md:rounded-none" />
        <div>
          <p className="text-base font-black uppercase tracking-tight">Llévate la liga en el móvil</p>
          <p className="mt-0.5 text-[13px] text-black/50 dark:text-white/50">
            Instálala gratis desde el navegador. Sin Play Store ni App Store.
          </p>
        </div>
      </div>
      <InstallButton className="justify-center text-black dark:text-white sm:shrink-0" />
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
              loading="lazy"
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

      {/* Controles: en móvil el selector de temporada es un carrusel deslizable
          en vez de un bloque de botones que se apila y empuja la tabla abajo. */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#0a0a0a]/[0.08] dark:border-white/[0.06] pb-5 md:pb-6">
        <div className="min-w-0">
          <span className="mb-2 block text-[11px] font-semibold text-[#0a0a0a]/40 dark:text-white/40 md:font-mono md:uppercase md:tracking-[0.4em] md:text-[9px] md:text-[#0a0a0a]/20 md:dark:text-white/20">
            Temporada
          </span>
          <div className="m-rail hide-scrollbar gap-2 md:gap-0.5">
            {validSplits.map((s: any) => (
              <button
                key={s.id}
                onClick={() => onSelectSplit(s.id)}
                className={`min-h-11 rounded-full md:rounded-none px-4 text-[12px] font-bold md:text-[10px] md:font-black md:tracking-[0.2em] md:uppercase transition-all ${
                  currentSplitId === s.id
                    ? "bg-[#e10600] text-white"
                    : "bg-[#0a0a0a]/[0.06] dark:bg-white/[0.07] text-[#0a0a0a]/60 dark:text-white/60 hover:bg-[#0a0a0a]/[0.1] dark:hover:bg-white/[0.12] hover:text-[#0a0a0a]/90 dark:hover:text-white/90"
                }`}
              >
                {s.nombre}
              </button>
            ))}
            <button
              onClick={() => onSelectSplit("general")}
              className={`min-h-11 rounded-full md:rounded-none px-4 text-[12px] font-bold md:text-[10px] md:font-black md:tracking-[0.2em] md:uppercase transition-all ${
                currentSplitId === "general"
                  ? "bg-[#e10600] text-white"
                  : "bg-[#0a0a0a]/[0.06] dark:bg-white/[0.07] text-[#0a0a0a]/60 dark:text-white/60 hover:bg-[#0a0a0a]/[0.1] dark:hover:bg-white/[0.12] hover:text-[#0a0a0a]/90 dark:hover:text-white/90"
              }`}
            >
              Mundial
            </button>
          </div>
        </div>

        {currentSplitId !== "general" && (
          <div className="grid grid-cols-2 md:flex overflow-hidden rounded-xl md:rounded-none border border-[#0a0a0a]/[0.12] dark:border-white/[0.12] self-stretch md:self-auto shrink-0">
            {(["pilotos", "constructores"] as const).map(v => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`min-h-11 px-4 text-[12px] font-bold md:text-[10px] md:font-bold md:tracking-[0.2em] md:uppercase transition-all ${
                  view === v
                    ? "bg-[#0a0a0a] text-white dark:bg-white dark:text-black"
                    : "text-[#0a0a0a]/45 dark:text-white/45 hover:text-[#0a0a0a]/80 dark:hover:text-white/80"
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
          {/* La cabecera de columnas solo tiene sentido con la rejilla de
              escritorio; en móvil cada fila es una tarjeta autoexplicativa. */}
          <div className="hidden md:grid grid-cols-[2.5rem_1fr_12rem_6rem_5rem] gap-x-4 px-4 py-3 bg-black/[0.035] dark:bg-white/[0.035] border-b border-[#0a0a0a]/[0.08] dark:border-white/[0.06]">
            <span className="text-[9px] font-mono tracking-[0.3em] text-[#0a0a0a]/20 dark:text-white/20 uppercase">#</span>
            <span className="text-[9px] font-mono tracking-[0.3em] text-[#0a0a0a]/20 dark:text-white/20 uppercase">Piloto</span>
            <span className="text-[9px] font-mono tracking-[0.3em] text-[#0a0a0a]/20 dark:text-white/20 uppercase">Escudería</span>
            <span className="text-[9px] font-mono tracking-[0.3em] text-[#0a0a0a]/20 dark:text-white/20 uppercase text-right">Pts</span>
            <span className="text-[9px] font-mono tracking-[0.3em] text-[#0a0a0a]/20 dark:text-white/20 uppercase text-right">OVR</span>
          </div>

          <div className="divide-y divide-[#0a0a0a]/[0.06] dark:divide-white/[0.06]">
            {pilotStandings.map((p: any, i: number) => {
              const team = eqMap[p.equipoId];
              const photo = getPilotPhoto(p.pilotoId);
              const isFirst = i === 0;
              const podiumClass = i === 0 ? "text-[#a87900] dark:text-yellow-300" : i === 1 ? "text-[#667085] dark:text-slate-300" : i === 2 ? "text-[#9a4d19] dark:text-orange-300" : "text-[#0a0a0a]/30 dark:text-white/30";
              const nameClass = i === 0 ? "text-[#a87900] dark:text-yellow-300" : i === 1 ? "text-[#667085] dark:text-slate-300" : i === 2 ? "text-[#9a4d19] dark:text-orange-300" : "text-[#0a0a0a]/85 dark:text-white/85";
              const gap = leaderPts > 0 && !isFirst ? leaderPts - (p.puntos_piloto || 0) : 0;
              const ovr = currentSplit?.tipo === "individual" ? "--" : Number(p.rating_piloto) > 0 ? p.rating_piloto : 70;

              return (
                <div
                  key={p.pilotoId}
                  className={`m-row flex md:grid md:grid-cols-[2.5rem_1fr_12rem_6rem_5rem] gap-3 md:gap-x-4 px-3 md:px-3 py-3 md:py-4 items-center transition-colors hover:bg-[#0a0a0a]/[0.02] dark:hover:bg-white/[0.02] relative ${
                    isFirst ? "bg-[#0a0a0a]/[0.03] dark:bg-white/[0.03]" : ""
                  }`}
                >
                  {isFirst && <div className="absolute left-0 top-0 bottom-0 w-1 md:w-0.5 bg-[#e10600]" />}

                  <div className="flex w-7 md:w-auto shrink-0 items-center justify-center md:justify-start">
                    <span className={`text-lg md:text-base font-black tabular-nums leading-none ${podiumClass}`}>
                      {i + 1}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {photo ? (
                      <img
                        src={photo}
                        alt={p.nombre}
                        referrerPolicy="no-referrer"
                        className="w-10 h-10 md:w-9 md:h-9 rounded-full md:rounded-none object-cover border border-[#0a0a0a]/[0.1] dark:border-white/[0.12] shrink-0"
                      />
                    ) : (
                      <div className="w-10 h-10 md:w-9 md:h-9 rounded-full md:rounded-none bg-[#0a0a0a]/[0.06] dark:bg-white/[0.06] border border-[#0a0a0a]/[0.1] dark:border-white/[0.12] flex items-center justify-center text-[11px] font-black text-[#0a0a0a]/35 dark:text-white/35 shrink-0">
                        {(p.nombre || "?").slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className={`font-bold md:font-black text-[15px] md:text-sm tracking-tight truncate leading-tight ${nameClass}`}>
                        {p.nombre}
                      </p>
                      <p className="flex items-center gap-1.5 truncate text-[12px] text-[#0a0a0a]/45 dark:text-white/45 md:hidden">
                        {team?.logo_url && <img src={team.logo_url} alt="" className="h-3.5 w-3.5 shrink-0 object-contain opacity-70" />}
                        <span className="truncate">{team?.nombre || "Sin equipo"}</span>
                        {p.rookie && <span className="shrink-0 font-semibold text-sky-500 dark:text-sky-300">· Rookie</span>}
                      </p>
                      {p.rookie && <span className="hidden md:inline text-[7px] font-black uppercase tracking-[0.18em] text-sky-500 dark:text-sky-300">Rookie</span>}
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

                  {/* Móvil: puntos y OVR juntos a la derecha, en una sola columna. */}
                  <div className="flex shrink-0 items-center gap-3 md:contents">
                    <div className="text-right">
                      <span className={`text-xl md:text-lg font-black tabular-nums leading-none ${nameClass}`}>
                        {p.puntos_piloto || 0}
                      </span>
                      <p className="text-[11px] leading-tight text-[#0a0a0a]/35 dark:text-white/35 md:hidden">
                        {gap > 0 ? `-${gap}` : "pts"}
                      </p>
                      {gap > 0 && (
                        <p className="hidden md:block text-[9px] font-mono text-[#0a0a0a]/20 dark:text-white/20 mt-0.5">-{gap}</p>
                      )}
                    </div>

                    <div className="flex justify-end">
                      <span className={`grid h-10 w-11 md:h-auto md:w-auto md:min-w-12 place-items-center rounded-lg md:rounded-none border px-2 md:py-1.5 text-center text-sm font-black tabular-nums ${standingsRatingTone(Number(p.rating_piloto ?? 0))}`}>
                        {ovr}
                      </span>
                    </div>
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
          <div className="hidden md:grid grid-cols-[2.5rem_1fr_6rem] gap-x-4 px-4 py-3 bg-black/[0.035] dark:bg-white/[0.035] border-b border-[#0a0a0a]/[0.08] dark:border-white/[0.06]">
            <span className="text-[9px] font-mono tracking-[0.3em] text-[#0a0a0a]/20 dark:text-white/20 uppercase">#</span>
            <span className="text-[9px] font-mono tracking-[0.3em] text-[#0a0a0a]/20 dark:text-white/20 uppercase">{currentSplit?.tipo === "individual" ? "Dúo" : "Escudería"}</span>
            <span className="text-[9px] font-mono tracking-[0.3em] text-[#0a0a0a]/20 dark:text-white/20 uppercase text-right">Pts</span>
          </div>

          <div className="divide-y divide-[#0a0a0a]/[0.06] dark:divide-white/[0.06]">
            {teamStandings.map((t: any, i: number) => {
              const isFirst = i === 0;
              return (
                <div
                  key={t.id}
                  className={`m-row grid grid-cols-[2rem_1fr_4.5rem] md:grid-cols-[2.5rem_1fr_6rem] gap-3 md:gap-x-4 px-3 py-3.5 md:py-5 items-center hover:bg-[#0a0a0a]/[0.02] dark:hover:bg-white/[0.02] transition-colors relative ${
                    isFirst ? "bg-[#0a0a0a]/[0.03] dark:bg-white/[0.03]" : ""
                  }`}
                >
                  {isFirst && <div className="absolute left-0 top-0 bottom-0 w-1 md:hidden bg-[#e10600]" />}

                  <span className={`text-lg md:text-base font-black tabular-nums text-center md:text-left ${
                    isFirst ? "text-[#e10600]" : i < 3 ? "text-[#0a0a0a]/60 dark:text-white/60" : "text-[#0a0a0a]/30 dark:text-white/30"
                  }`}>
                    {i + 1}
                  </span>

                  <div className="flex items-center gap-3 min-w-0">
                    {t.logo_url ? (
                      <img src={t.logo_url} alt={t.nombre} className="w-9 h-9 md:w-8 md:h-8 rounded-lg md:rounded-none object-contain border border-[#0a0a0a]/[0.1] dark:border-white/[0.12] shrink-0 p-1 md:p-0.5" />
                    ) : (
                      <div className="w-9 h-9 md:w-8 md:h-8 rounded-lg md:rounded-none bg-[#0a0a0a]/[0.06] dark:bg-white/[0.06] border border-[#0a0a0a]/[0.1] dark:border-white/[0.12] flex items-center justify-center text-[11px] font-black text-[#0a0a0a]/35 dark:text-white/35 shrink-0">
                        {t.nombre?.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <span className={`font-bold md:font-black text-[15px] md:text-sm tracking-tight truncate ${
                      isFirst ? "text-[#0a0a0a] dark:text-white" : "text-[#0a0a0a]/75 dark:text-white/75"
                    }`}>
                      {t.nombre}
                    </span>
                    {isFirst && <Crown className="w-4 h-4 shrink-0 text-yellow-500 dark:text-yellow-400" />}
                  </div>

                  <div className="text-right">
                    <span className={`text-xl md:text-lg font-black tabular-nums ${
                      isFirst ? "text-[#0a0a0a] dark:text-white" : "text-[#0a0a0a]/65 dark:text-white/65"
                    }`}>
                      {t.puntos_constructores || 0}
                    </span>
                    <p className="text-[11px] leading-tight text-[#0a0a0a]/35 dark:text-white/35 md:hidden">pts</p>
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
