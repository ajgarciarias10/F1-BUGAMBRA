import { useState, useMemo, useEffect, useRef, Suspense, lazy } from "react";
import { Link, useSearchParams } from "react-router";
import { useSplits, useUsuarios } from "../hooks/useData";
import { useAuth } from "../contexts/AuthContext";
import { Sun, Moon, Radio, Crown, Loader2, Users, Trophy } from "lucide-react";
import { useTheme } from "../hooks/useTheme";
import { Badge, Button, Card, EmptyState, Notice, buttonClass } from "./ui";
import { TotalStandings } from "./TotalStandings";
import { MobileBottomTabs } from "./MobileBottomTabs";

// La portada abre siempre en Clasificación. Equipos, Resultados y TV solo hacen
// falta si el usuario toca esas pestañas, así que no viajan en el arranque.
const FomLive = lazy(() => import("./FomLive").then(m => ({ default: m.FomLive })));
const TeamsView = lazy(() => import("./TeamsView").then(m => ({ default: m.TeamsView })));
const RaceResultsView = lazy(() => import("./RaceResultsView").then(m => ({ default: m.RaceResultsView })));
const PaddockForum = lazy(() => import("./PaddockForum").then(m => ({ default: m.PaddockForum })));

const tabFallback = (
  <div role="status" className="flex items-center justify-center gap-2 py-20 text-sm text-ink-muted">
    <Loader2 aria-hidden="true" className="h-4 w-4 motion-safe:animate-spin" />Cargando…
  </div>
);
import { InstallButton } from "./InstallApp";
import { usePWAInstall } from "../hooks/usePWAInstall";

type Tab = "clasificacion" | "equipos" | "resultados" | "paddock" | "tv";

export function PublicHome() {
  const { user, userData } = useAuth();
  const { splits, loading, error: dataError, fromCache, slow, retry } = useSplits();
  const { usuarios } = useUsuarios();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedTab = searchParams.get("tab");
  const activeTab: Tab = ["clasificacion", "equipos", "resultados", "paddock", "tv"].includes(requestedTab || "")
    ? requestedTab as Tab : "clasificacion";
  const activeSplitId = searchParams.get("temporada") || "";
  const contentHeading = useRef<HTMLHeadingElement>(null);
  const setActiveTab = (tab: Tab) => setSearchParams(previous => {
    const next = new URLSearchParams(previous);
    next.set("tab", tab);
    return next;
  });
  const setActiveSplitId = (id: string) => setSearchParams(previous => {
    const next = new URLSearchParams(previous);
    next.set("temporada", id);
    return next;
  });
  useEffect(() => {
    if (!requestedTab) return;
    contentHeading.current?.scrollIntoView({ block: "start" });
    contentHeading.current?.focus({ preventScroll: true });
  }, [activeTab, requestedTab]);
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
    { id: "paddock", label: "Paddock" },
    { id: "tv", label: "TV" },
  ];

  return (
    <div className="min-h-[100dvh] bg-transparent text-ink font-sans overflow-x-hidden relative">
      {/* ── NAV ── */}
      <header className="fixed top-0 inset-x-0 z-50 min-h-14 md:min-h-16 border-b acrylic-bar flex items-center justify-between px-3 md:px-10 gap-2 md:gap-4 safe-top safe-x">
        <Link to="/" className="flex items-center gap-2.5 min-w-0 shrink" aria-label="F1 Bugambra, inicio">
          <img src="/bugambra-logo.png" alt="" width={40} height={40} className="h-9 w-9 md:h-10 md:w-10 shrink-0 rounded-lg border border-line-strong bg-surface object-contain shadow-fluent-1" />
          <span className="min-w-0 leading-none">
            <span className="block truncate text-base font-semibold tracking-tight">Bugambra</span>
            <span className="mt-1 hidden text-[11px] font-medium text-ink-muted sm:block">Liga F1</span>
          </span>
        </Link>

        <nav aria-label="Secciones de la liga" className="hidden md:flex items-center gap-1 min-w-0 overflow-x-auto hide-scrollbar">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              aria-current={activeTab === t.id ? "page" : undefined}
              className={`min-h-11 shrink-0 rounded-lg px-3 text-sm font-semibold transition-colors ${
                activeTab === t.id
                  ? "bg-brand-soft text-brand"
                  : "text-ink-muted hover:bg-info/10 hover:text-ink"
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-1 md:gap-2 shrink-0">
          <button
            onClick={toggle}
            className="fluent-press grid h-11 w-11 place-items-center rounded-lg border border-line bg-surface/80 text-ink-2 hover:bg-surface"
            aria-label={dark ? "Activar tema claro" : "Activar tema oscuro"}
            aria-pressed={dark}
          >
            {dark ? <Sun className="w-[18px] h-[18px]" /> : <Moon className="w-[18px] h-[18px]" />}
          </button>
          <Link to={dashboardLink} className={buttonClass({ variant: "primary" })}>
            {user ? "Mi Panel" : "Acceder"}
          </Link>
        </div>
      </header>

      {/* ── HERO ── */}
      <section className="relative pt-appbar md:pt-28 px-3 md:px-10 max-w-[90rem] mx-auto safe-x">
        <div className="acrylic relative overflow-hidden rounded-card border-t-[3px] border-t-brand">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_92%_10%,var(--c-brand-soft),transparent_60%)]" />
          <div className="relative grid md:grid-cols-[1fr_auto] items-end gap-5 md:gap-8 p-5 sm:p-8 md:p-12">
            <div className="max-w-3xl">
              <Badge tone={isHistoricalSplit ? "neutral" : "ok"} dot>
                {isHistoricalSplit ? "Archivo histórico" : "Temporada en curso"}
              </Badge>
              <p className="mt-4 text-sm font-medium text-ink-muted">
                En portada · {currentSplit?.nombre || "F1 Bugambra"}
              </p>
              <h1 className="mt-2 text-[2rem] sm:text-5xl md:text-6xl font-bold leading-[1.02] tracking-tight">
                {isHistoricalSplit ? <>El legado<br /><span className="text-brand">ya está escrito</span></> : <>La competición<br /><span className="text-brand">empieza aquí</span></>}
              </h1>
              <p className="mt-3 md:mt-5 max-w-xl text-sm md:text-base text-ink-muted leading-relaxed">
                {isHistoricalSplit
                  ? "Resultados, campeones y estadísticas del archivo histórico de la liga."
                  : "Sigue las carreras, elige tu equipo y comenta la jugada con la parrilla. Puedes explorar la liga sin registrarte."}
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                <button onClick={() => { setActiveTab("resultados"); contentHeading.current?.scrollIntoView({ behavior: "smooth", block: "start" }); }} className={buttonClass({ variant: "primary" })}>Ver resultados →</button>
                <button onClick={() => setActiveTab("paddock")} className={buttonClass({ variant: "secondary" })}>Qué se comenta</button>
                {isLive && (
                  <button onClick={() => setActiveTab("tv")} className={buttonClass({ variant: "danger" })}>
                    <Radio aria-hidden="true" className="h-4 w-4" /> Ver en vivo
                  </button>
                )}
              </div>
            </div>

            {/* Ficha de evento: en móvil se muestra como una línea bajo el hero. */}
            <div className="hidden w-full rounded-xl border border-line bg-surface-2/70 bg-[image:var(--grad-info)] p-5 shadow-fluent-1 sm:block md:w-72">
              <p className="text-xs font-semibold text-ink-muted">{isHistoricalSplit ? "Último evento" : "Próximo evento"}</p>
              <p className="mt-3 text-xl font-bold tracking-tight">{nextRace?.nombre || (isHistoricalSplit ? "Temporada cerrada" : "Por anunciar")}</p>
              <div className="flex justify-between items-end mt-5 pt-4 border-t border-line">
                <span className="text-xs text-ink-muted">{currentSplit?.nombre || `${validSplits.length} temporadas`}</span>
                <span className="text-3xl font-bold tabular-nums text-brand">{String(nextRace?.numero_carrera ?? "--").padStart(2, "0")}</span>
              </div>
            </div>
          </div>
        </div>

        <Card tone="solid" pad="none" className="mt-3 flex items-center gap-3 px-4 py-3 sm:hidden">
          <span className="text-2xl font-bold tabular-nums text-brand">
            {String(nextRace?.numero_carrera ?? "--").padStart(2, "0")}
          </span>
          <div className="min-w-0">
            <p className="text-[11px] text-ink-muted">{isHistoricalSplit ? "Último evento" : "Próximo evento"}</p>
            <p className="truncate text-sm font-semibold">{nextRace?.nombre || (isHistoricalSplit ? "Temporada cerrada" : "Por anunciar")}</p>
          </div>
        </Card>
      </section>

      <MobileBottomTabs tabs={tabs} activeTab={activeTab} onTab={(id) => setActiveTab(id as Tab)} scrollToTop={false} />

      {/* ── CONTENT ── */}
      <main className="relative max-w-[90rem] mx-auto px-3 md:px-10 pt-8 md:py-14 pb-tabbar md:pb-14 safe-x">
        <h2 ref={contentHeading} tabIndex={-1} className="rail-title mb-5 md:mb-6 scroll-mt-28">{tabs.find(tab => tab.id === activeTab)?.label}</h2>
        {activeTab === "clasificacion" && <details className="mb-5 rounded-card border border-line bg-surface/80 p-4 shadow-fluent-1">
          <summary className="flex min-h-11 cursor-pointer items-center rounded-md text-sm font-semibold">¿Primera vez? La liga en 30 segundos</summary>
          <div className="mt-3 grid gap-4 text-sm leading-relaxed text-ink-muted sm:grid-cols-3">
            <p><strong className="block text-ink">1. Sigue la competición</strong>Cada split es una etapa de la liga. En Clasificación ves quién lidera; en Resultados, qué pasó en cada carrera.</p>
            <p><strong className="block text-ink">2. Encuentra tu equipo</strong>Los pilotos compiten y los jeques gestionan las escuderías. En Equipos puedes conocer a la parrilla.</p>
            <p><strong className="block text-ink">3. Vive el paddock</strong>Es el muro de la comunidad: bienvenidas, pronósticos y comentarios. <Link to={dashboardLink} className="font-bold text-brand underline underline-offset-4">{user ? "Ir a mi panel" : "Entrar para participar"}</Link>.</p>
          </div>
        </details>}
        {(dataError || (slow && (loading || fromCache))) && (
          <Notice
            tone="warn"
            className="mb-6"
            title={dataError ? "No se han podido cargar todos los datos" : "No hemos podido confirmar los datos con el servidor"}
            action={<Button variant="primary" onClick={retry}>Reintentar carga</Button>}
          >
            {dataError ? "Comprueba tu conexión y vuelve a intentarlo. Si continúa, contacta con la administración de la liga." : "La conexión está tardando más de lo habitual. Comprueba tu red; la actualización continuará automáticamente."} {validSplits.length > 0 ? "La información visible puede estar incompleta o desactualizada." : "Esto no significa que no haya temporadas."}
          </Notice>
        )}
        {loading || (fromCache && validSplits.length === 0 && !dataError && !slow) ? (
          <div role="status" className="flex items-center justify-center gap-2 py-16 text-sm text-ink-muted">
            <Loader2 aria-hidden="true" className="h-4 w-4 motion-safe:animate-spin" />Cargando temporadas y clasificación…
          </div>
        ) : (dataError || fromCache) && validSplits.length === 0 ? (
          <EmptyState title="Datos no disponibles" description="Los datos de la liga todavía no están disponibles en este dispositivo." />
        ) : validSplits.length === 0 ? (
          <EmptyState icon={Trophy} title="Aún no hay temporadas" description="Todavía no hay temporadas publicadas. Vuelve más adelante." />
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
            {activeTab === "paddock" && <PaddockForum readOnly={!user} />}
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
    <Card tone="solid" className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-4">
        <img src="/icons/icon-192.png" alt="" className="h-12 w-12 shrink-0 rounded-xl" />
        <div>
          <p className="text-base font-semibold tracking-tight">Llévate la liga en el móvil</p>
          <p className="mt-0.5 text-sm text-ink-muted">
            Instálala gratis desde el navegador. Sin Play Store ni App Store.
          </p>
        </div>
      </div>
      <InstallButton className="justify-center text-ink sm:shrink-0" />
    </Card>
  );
}

// ── HELPERS ────────────────────────────────────────────────────────────────────

function standingsRatingTone(rating: number) {
  if (rating >= 90) return "border-danger/50 bg-danger-soft text-danger";
  if (rating >= 80) return "border-warn/50 bg-warn-soft text-warn";
  return "border-line bg-surface-3 text-ink-2";
}

const PODIUM_TEXT = ["text-warn", "text-ink-2", "text-warn"];

// ── STANDINGS ──────────────────────────────────────────────────────────────────

const SPLIT_PILL = "fluent-press min-h-11 shrink-0 rounded-full px-4 text-sm font-semibold";
const SPLIT_PILL_ON = "btn-primary-fluent bg-brand text-brand-ink shadow-fluent-1";
const SPLIT_PILL_OFF = "border border-line bg-surface/80 text-ink-2 hover:border-info/50 hover:bg-surface";
const TH = "text-xs font-semibold text-ink-muted";

function StandingsView({ validSplits, currentSplitId, onSelectSplit, pilotStandings, teamStandings, currentSplit, getPilotPhoto }: any) {
  const [view, setView] = useState<"pilotos" | "constructores">("pilotos");
  const eqMap = useMemo(
    () => Object.fromEntries((currentSplit?.equipos || []).map((e: any) => [e.id, e])),
    [currentSplit]
  );

  const leader = pilotStandings[0];
  const leaderPts = leader?.puntos_piloto || 0;

  return (
    <div className="space-y-8">

      {/* Controles: en móvil el selector de temporada es un carrusel deslizable
          en vez de un bloque de botones que se apila y empuja la tabla abajo. */}
      <div className="flex flex-col justify-between gap-4 border-b border-line pb-5 md:flex-row md:items-center md:pb-6">
        <div className="min-w-0">
          <span className="mb-2 block text-xs font-semibold text-ink-muted">Temporada</span>
          <div className="m-rail hide-scrollbar gap-2" role="group" aria-label="Temporada">
            {validSplits.map((s: any) => (
              <button
                key={s.id}
                onClick={() => onSelectSplit(s.id)}
                aria-pressed={currentSplitId === s.id}
                className={`${SPLIT_PILL} ${currentSplitId === s.id ? SPLIT_PILL_ON : SPLIT_PILL_OFF}`}
              >
                {s.nombre}
              </button>
            ))}
            <button
              onClick={() => onSelectSplit("general")}
              aria-pressed={currentSplitId === "general"}
              className={`${SPLIT_PILL} ${currentSplitId === "general" ? SPLIT_PILL_ON : SPLIT_PILL_OFF}`}
            >
              Mundial
            </button>
          </div>
        </div>

        {currentSplitId !== "general" && (
          <div role="group" aria-label="Tipo de clasificación" className="grid shrink-0 grid-cols-2 gap-1 self-stretch rounded-lg border border-line bg-surface-2/70 p-1 md:flex md:self-auto">
            {(["pilotos", "constructores"] as const).map(v => (
              <button
                key={v}
                onClick={() => setView(v)}
                aria-pressed={view === v}
                className={`min-h-11 rounded-md px-4 text-sm font-semibold transition-colors ${
                  view === v
                    ? "bg-surface text-ink shadow-fluent-1"
                    : "text-ink-muted hover:bg-info/10 hover:text-ink"
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
        <Card as="section" aria-label="Clasificación de pilotos" pad="none" className="overflow-hidden">
          {/* La cabecera de columnas solo tiene sentido con la rejilla de
              escritorio; en móvil cada fila es una tarjeta autoexplicativa. */}
          <div className="hidden grid-cols-[2.5rem_1fr_12rem_6rem_5rem] gap-x-4 border-b border-line bg-surface-2/70 px-4 py-3 md:grid">
            <span className={TH}>#</span>
            <span className={TH}>Piloto</span>
            <span className={TH}>Escudería</span>
            <span className={`${TH} text-right`}>Pts</span>
            <span className={`${TH} text-right`}>OVR</span>
          </div>

          <ul className="divide-y divide-line">
            {pilotStandings.map((p: any, i: number) => {
              const team = eqMap[p.equipoId];
              const photo = getPilotPhoto(p.pilotoId);
              const isFirst = i === 0;
              const podiumClass = PODIUM_TEXT[i] ?? "text-ink-muted";
              const nameClass = PODIUM_TEXT[i] ?? "text-ink";
              const gap = leaderPts > 0 && !isFirst ? leaderPts - (p.puntos_piloto || 0) : 0;
              const ovr = currentSplit?.tipo === "individual" ? "--" : Number(p.rating_piloto) > 0 ? p.rating_piloto : 70;

              return (
                <li
                  key={p.pilotoId}
                  className={`m-row reveal relative flex items-center gap-3 px-3 py-3 transition-colors hover:bg-info/5 md:grid md:grid-cols-[2.5rem_1fr_12rem_6rem_5rem] md:gap-x-4 md:py-3.5 ${
                    isFirst ? "bg-warn-soft/40" : ""
                  }`}
                >
                  {isFirst && <div aria-hidden="true" className="absolute inset-y-0 left-0 w-1 bg-brand" />}

                  <div className="flex w-7 shrink-0 items-center justify-center md:w-auto md:justify-start">
                    <span className={`text-lg font-semibold leading-none tabular-nums md:text-base ${podiumClass}`}>
                      {i + 1}
                    </span>
                  </div>

                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    {photo ? (
                      <img
                        src={photo}
                        alt=""
                        referrerPolicy="no-referrer"
                        loading="lazy"
                        className="h-10 w-10 shrink-0 rounded-full border border-line-strong object-cover md:h-9 md:w-9"
                      />
                    ) : (
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-line bg-surface-2 text-xs font-semibold text-ink-muted md:h-9 md:w-9">
                        {(p.nombre || "?").slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className={`truncate text-[15px] font-semibold leading-tight md:text-sm ${nameClass}`}>
                        {p.nombre}
                      </p>
                      <p className="flex items-center gap-1.5 truncate text-xs text-ink-muted md:hidden">
                        {team?.logo_url && <img src={team.logo_url} alt="" className="h-3.5 w-3.5 shrink-0 object-contain" />}
                        <span className="truncate">{team?.nombre || "Sin equipo"}</span>
                        {p.rookie && <span className="shrink-0 font-semibold text-info">· Rookie</span>}
                      </p>
                      {p.rookie && <span className="hidden text-[11px] font-semibold text-info md:inline">Rookie</span>}
                    </div>
                  </div>

                  <div className="hidden min-w-0 items-center gap-2 md:flex">
                    {team?.logo_url && (
                      <img src={team.logo_url} alt="" className="h-5 w-5 shrink-0 object-contain" />
                    )}
                    <span className="truncate text-sm text-ink-muted">
                      {team?.nombre || "—"}
                    </span>
                  </div>

                  {/* Móvil: puntos y OVR juntos a la derecha, en una sola columna. */}
                  <div className="flex shrink-0 items-center gap-3 md:contents">
                    <div className="text-right">
                      <span className={`text-xl font-semibold leading-none tabular-nums md:text-lg ${nameClass}`}>
                        {p.puntos_piloto || 0}
                      </span>
                      <p className="text-xs leading-tight text-ink-muted md:hidden">
                        {gap > 0 ? `-${gap}` : "pts"}
                      </p>
                      {gap > 0 && (
                        <p className="mt-0.5 hidden text-xs tabular-nums text-ink-muted md:block">-{gap}</p>
                      )}
                    </div>

                    <div className="flex justify-end">
                      <span className={`grid h-10 w-11 place-items-center rounded-lg border px-2 text-center text-sm font-semibold tabular-nums md:h-auto md:w-auto md:min-w-12 md:py-1.5 ${standingsRatingTone(Number(p.rating_piloto ?? 0))}`}>
                        {ovr}
                      </span>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>

          {pilotStandings.length === 0 && (
            <EmptyState icon={Users} title="Sin datos de temporada" description="Los pilotos aparecerán cuando se inscriban en este split." className="m-4 py-12" />
          )}
        </Card>
      )}

      {/* Tabla constructores */}
      {currentSplitId !== "general" && view === "constructores" && (
        <Card as="section" aria-label="Clasificación de constructores" pad="none" className="overflow-hidden">
          <div className="hidden grid-cols-[2.5rem_1fr_6rem] gap-x-4 border-b border-line bg-surface-2/70 px-4 py-3 md:grid">
            <span className={TH}>#</span>
            <span className={TH}>{currentSplit?.tipo === "individual" ? "Dúo" : "Escudería"}</span>
            <span className={`${TH} text-right`}>Pts</span>
          </div>

          <ul className="divide-y divide-line">
            {teamStandings.map((t: any, i: number) => {
              const isFirst = i === 0;
              return (
                <li
                  key={t.id}
                  className={`m-row reveal relative grid grid-cols-[2rem_1fr_4.5rem] items-center gap-3 px-3 py-3.5 transition-colors hover:bg-info/5 md:grid-cols-[2.5rem_1fr_6rem] md:gap-x-4 md:py-4 ${
                    isFirst ? "bg-warn-soft/40" : ""
                  }`}
                >
                  {isFirst && <div aria-hidden="true" className="absolute inset-y-0 left-0 w-1 bg-brand" />}

                  <span className={`text-center text-lg font-semibold tabular-nums md:text-left md:text-base ${
                    PODIUM_TEXT[i] ?? "text-ink-muted"
                  }`}>
                    {i + 1}
                  </span>

                  <div className="flex min-w-0 items-center gap-3">
                    {t.logo_url ? (
                      <img src={t.logo_url} alt="" className="h-9 w-9 shrink-0 rounded-lg border border-line object-contain p-1 md:h-8 md:w-8" />
                    ) : (
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-line bg-surface-2 text-xs font-semibold text-ink-muted md:h-8 md:w-8">
                        {t.nombre?.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <span className={`truncate text-[15px] font-semibold md:text-sm ${isFirst ? "text-ink" : "text-ink-2"}`}>
                      {t.nombre}
                    </span>
                    {isFirst && <Crown aria-label="Líder" className="h-4 w-4 shrink-0 text-warn" />}
                  </div>

                  <div className="text-right">
                    <span className={`text-xl font-semibold tabular-nums md:text-lg ${isFirst ? "text-ink" : "text-ink-2"}`}>
                      {t.puntos_constructores || 0}
                    </span>
                    <p className="text-xs leading-tight text-ink-muted md:hidden">pts</p>
                  </div>
                </li>
              );
            })}
          </ul>

          {teamStandings.length === 0 && (
            <EmptyState icon={Users} title="Sin datos de constructores" description="Las escuderías aparecerán cuando se inscriban en este split." className="m-4 py-12" />
          )}
        </Card>
      )}
    </div>
  );
}
