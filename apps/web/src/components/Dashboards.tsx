import { useState, useMemo, useEffect, useCallback } from "react";
import { Link, useSearchParams } from "react-router";
import { useAuth } from "../contexts/AuthContext";
import { SharedDashboardView } from "./SharedDashboard";
import { ProfileView } from "./ProfileView";
import { auth } from "../services/auth";
import { SuggestionsView } from "./SuggestionsView";
import { MarketDeadlineView } from "./MarketDeadlineView";
import { AuctionRoom } from "./AuctionRoom";
import { TeamEconomyView } from "./TeamEconomyView";
import { TeamsView } from "./TeamsView";
import { RaceResultsView } from "./RaceResultsView";
import { FomLive } from "./FomLive";
import { useSplits, useUsuarios } from "../hooks/useData";
import { MobileBottomTabs } from "./MobileBottomTabs";
import { Shield, Lock, Store, Home, Wallet, Trophy, Flag, Gauge, MessagesSquare, User, MonitorPlay, Lightbulb, Users, Sun, Moon, CalendarDays, Megaphone, ArrowRight, type LucideIcon } from "lucide-react";
import { useTheme } from "../hooks/useTheme";
import { Card, Button, StatusPill, Notice, EmptyState, PageHeader, buttonClass, cn } from "./ui";
import { TelemetryView } from "./FomLive";
import { ComunidadView } from "./PaddockForum";
import { buildJequeHome, type JequeHome } from "../services/readModels";
import { fetchLatestOfficialNotice } from "../services/readModelService";
import { formatearMillones } from "../services/auctionService";
import type { AvisoOficial } from "../types";
import { useMarketLifecycleStatus } from "./MarketLifecycleProvider";
import { StatusBanner } from "./Feedback";

/**
 * Estado del mercado, arriba del todo de la pestaña.
 *
 * Antes había que deducirlo: el jeque entraba en Mercado y no sabía si la ventana estaba
 * abierta, ni si tocaba pujar en la sala o fichar a pelo, hasta que una acción fallaba.
 */
function MarketStatusHeader({ split }: { split: any }) {
  if (!split) return null;
  const abierto = split.fichajes_abiertos === true;
  const subasta = split.mercado_subasta_activado === true;

  return (
    <div
      role="status"
      className={`flex flex-wrap items-center gap-x-4 gap-y-2 border px-4 py-3 ${
        abierto ? "border-ok/30 bg-ok/7" : "border-line bg-surface-2"
      }`}
    >
      <span className={`flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.18em] ${abierto ? "text-ok" : "text-ink-muted"}`}>
        {abierto ? <Store className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
        {abierto ? "Mercado abierto" : "Mercado cerrado"}
      </span>
      <span className="text-[11px] font-mono uppercase tracking-[0.16em] text-ink-muted">
        {split.nombre} · {subasta ? "Sala de pujas" : "Fichaje directo"}
      </span>
      <span className="w-full text-[11px] leading-relaxed text-ink-muted sm:w-auto sm:flex-1">
        {abierto
          ? subasta
            ? "Las operaciones se resuelven pujando en la sala. El admin saca a cada piloto."
            : "Los fichajes y cláusulas se registran cuando la liga los anuncia por WhatsApp; aquí solo consultas el estado."
          : "La ventana de fichajes está cerrada. El admin la abre desde el panel de control."}
      </span>
    </div>
  );
}

// ── NAVEGACIÓN ────────────────────────────────────────────────────────────────

interface TabDef { id: string; label: string; icon?: LucideIcon }

const TAB_ICONS: Record<string, LucideIcon> = {
  inicio: Home, escuderia: Wallet, championship: Trophy, resultados: Flag, telemetria: Gauge,
  comunidad: MessagesSquare, equipos: Users, market: Store, tv: MonitorPlay, profile: User, suggestions: Lightbulb,
};

/** Ids antiguos que aún pueden llegar en enlaces compartidos. */
const LEGACY_TABS: Record<string, string> = { paddock: "comunidad", economia: "escuderia" };

interface AppNavProps {
  title: string;
  tabs: TabDef[];
  activeTab: string;
  onTab: (id: string) => void;
  isAdmin: boolean;
}

function ThemeToggle() {
  const { dark, toggle } = useTheme();
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={dark ? "Cambiar a tema claro" : "Cambiar a tema oscuro"}
      className="grid h-11 w-11 place-items-center rounded-lg text-ink-muted transition-colors hover:bg-surface-3 hover:text-ink"
    >
      {dark ? <Sun aria-hidden="true" className="h-5 w-5" /> : <Moon aria-hidden="true" className="h-5 w-5" />}
    </button>
  );
}

function AppNav({ title, tabs, activeTab, onTab, isAdmin }: AppNavProps) {
  const { userData } = useAuth();
  return (
    <header className="safe-top safe-x fixed inset-x-0 top-0 z-50 border-b acrylic-bar">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-2 px-3 md:px-10">
        <Link to="/" className="flex min-w-0 items-center gap-2.5 rounded-lg py-2 text-ink">
          <span aria-hidden="true" className="h-5 w-1 shrink-0 rounded-full bg-brand" />
          <span className="truncate text-sm font-extrabold tracking-tight">F1 Bugambra</span>
          <span className="hidden text-sm text-ink-muted md:inline">· {title}</span>
        </Link>
        <div className="flex shrink-0 items-center gap-1">
          <span className="mr-2 hidden text-right leading-tight md:block">
            <span className="block text-sm font-semibold text-ink">{userData?.nombre}</span>
            <span className="block text-[11px] capitalize text-ink-muted">{userData?.rol}</span>
          </span>
          {isAdmin && (
            <Link to="/admin" aria-label="Ir al panel de administración" className={buttonClass({ variant: "secondary", size: "sm" })}>
              <Shield aria-hidden="true" className="h-4 w-4" />
              <span className="hidden sm:inline">Admin</span>
            </Link>
          )}
          <ThemeToggle />
          <Button variant="ghost" size="sm" onClick={() => auth.signOut()}>Salir</Button>
        </div>
      </div>
      <nav aria-label="Secciones" className="hidden border-t border-line md:block">
        <div className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-10 hide-scrollbar">
          {tabs.map(t => {
            const Icon = t.icon ?? TAB_ICONS[t.id];
            const active = activeTab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => onTab(t.id)}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "-mb-px inline-flex min-h-11 shrink-0 items-center gap-2 border-b-2 px-3 text-sm font-semibold whitespace-nowrap transition-colors",
                  active ? "border-brand text-ink" : "border-transparent text-ink-muted hover:text-ink",
                )}
              >
                {Icon && <Icon aria-hidden="true" className="h-4 w-4" />}
                {t.label}
              </button>
            );
          })}
        </div>
      </nav>
    </header>
  );
}

// ── INICIO ────────────────────────────────────────────────────────────────────

function toMillis(value: unknown): number | null {
  if (value == null) return null;
  if (typeof value === "number") return value;
  if (value instanceof Date) return value.getTime();
  const v = value as { toMillis?: () => number; seconds?: number };
  if (typeof v.toMillis === "function") return v.toMillis();
  if (typeof v.seconds === "number") return v.seconds * 1000;
  return null;
}

function formatRaceDate(fecha?: string, hora?: string): string | null {
  if (!fecha) return null;
  const d = new Date(`${fecha}T00:00:00`);
  if (isNaN(d.getTime())) return null;
  const day = d.toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" });
  return hora ? `${day} · ${hora} h` : day;
}

type NoticeState = { status: "loading" } | { status: "ok"; notice: AvisoOficial | null } | { status: "error" };

function InicioView({ split, teamId, showBalance, onGo }: { split: any; teamId?: string; showBalance: boolean; onGo: (tab: string) => void }) {
  const [noticeState, setNoticeState] = useState<NoticeState>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let alive = true;
    setNoticeState({ status: "loading" });
    fetchLatestOfficialNotice()
      .then(notice => { if (alive) setNoticeState({ status: "ok", notice }); })
      .catch(() => { if (alive) setNoticeState({ status: "error" }); });
    return () => { alive = false; };
  }, [attempt]);

  const home: JequeHome | null = useMemo(
    () => split ? buildJequeHome({ circuitos: split.circuitos ?? [], equipos: split.equipos ?? [] }, teamId, noticeState.status === "ok" ? noticeState.notice : null) : null,
    [split, teamId, noticeState],
  );

  if (!split || !home) {
    return <EmptyState icon={CalendarDays} title="Todavía no hay una temporada activa" description="Cuando el administrador publique un split verás aquí el próximo GP, tu equipo y los avisos." />;
  }

  const race = home.nextRace;
  const raceDate = race ? formatRaceDate(race.fecha, race.hora) : null;
  const noticeDate = noticeState.status === "ok" && noticeState.notice ? toMillis(noticeState.notice.publicado_en) : null;

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <Card as="section" aria-labelledby="inicio-gp">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-ink-muted">Próximo GP · {split.nombre}</p>
          {race ? (
            <>
              <h2 id="inicio-gp" className="mt-2 text-2xl font-bold tracking-tight text-ink">GP de {race.nombre}</h2>
              <p className="mt-1 flex items-center gap-2 text-sm text-ink-muted">
                <CalendarDays aria-hidden="true" className="h-4 w-4 shrink-0 text-brand" />
                <span className="capitalize">{raceDate ?? "Fecha pendiente de confirmación"}</span>
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button variant="secondary" size="sm" onClick={() => onGo("telemetria")}>
                  <Gauge aria-hidden="true" className="h-4 w-4" /> Telemetría
                </Button>
              </div>
            </>
          ) : (
            <>
              <h2 id="inicio-gp" className="mt-2 text-xl font-bold text-ink">No quedan carreras por correr</h2>
              <p className="mt-1 text-sm text-ink-muted">Consulta los resultados de la temporada en Carreras.</p>
            </>
          )}
        </Card>

        <Card as="section" aria-labelledby="inicio-aviso">
          <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-ink-muted">
            <Megaphone aria-hidden="true" className="h-4 w-4 text-brand" /> Aviso oficial
          </p>
          {noticeState.status === "loading" && <p role="status" className="mt-3 text-sm text-ink-muted">Cargando aviso…</p>}
          {noticeState.status === "error" && (
            <Notice tone="danger" className="mt-3" title="No se pudo cargar el aviso" action={<Button size="sm" onClick={() => setAttempt(n => n + 1)}>Reintentar</Button>}>
              Comprueba tu conexión.
            </Notice>
          )}
          {noticeState.status === "ok" && !noticeState.notice && (
            <>
              <h2 id="inicio-aviso" className="mt-2 text-lg font-bold text-ink">Sin avisos publicados</h2>
              <p className="mt-1 text-sm text-ink-muted">Cuando el administrador publique un aviso oficial aparecerá aquí.</p>
            </>
          )}
          {noticeState.status === "ok" && noticeState.notice && (
            <>
              <h2 id="inicio-aviso" className="mt-2 text-lg font-bold text-ink">{noticeState.notice.titulo}</h2>
              <p className="mt-1 line-clamp-4 whitespace-pre-wrap text-sm text-ink-2">{noticeState.notice.texto}</p>
              {noticeDate && <p className="mt-2 text-xs text-ink-muted">{new Date(noticeDate).toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" })}</p>}
            </>
          )}
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card as="section" aria-labelledby="inicio-equipo">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-ink-muted">Mi equipo</p>
          {home.team ? (
            <>
              <h2 id="inicio-equipo" className="mt-2 text-xl font-bold text-ink">{home.team.name}</h2>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <StatusPill tone="info">Puesto {home.team.rank} de {home.team.of}</StatusPill>
                <StatusPill tone="neutral">{home.team.constructorPoints} pts</StatusPill>
              </div>
              <Button variant="ghost" size="sm" className="mt-3 -ml-3" onClick={() => onGo(showBalance ? "escuderia" : "championship")}>
                {showBalance ? "Ver mi escudería" : "Ver campeonato"} <ArrowRight aria-hidden="true" className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <>
              <h2 id="inicio-equipo" className="mt-2 text-lg font-bold text-ink">Sin escudería asignada</h2>
              <p className="mt-1 text-sm text-ink-muted">Consulta la parrilla y la clasificación del campeonato.</p>
              <Button variant="ghost" size="sm" className="mt-3 -ml-3" onClick={() => onGo("championship")}>
                Ver campeonato <ArrowRight aria-hidden="true" className="h-4 w-4" />
              </Button>
            </>
          )}
        </Card>

        {showBalance && (
          <Card as="section" aria-labelledby="inicio-saldo">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-ink-muted">Saldo disponible</p>
            {home.availableBalance === null ? (
              <>
                <h2 id="inicio-saldo" className="mt-2 text-xl font-bold text-ink">Saldo no disponible</h2>
                <p className="mt-1 text-sm text-ink-muted">{home.team ? "El saldo de tu escudería no está registrado todavía; el administrador lo concilia." : "Necesitas una escudería asignada para ver el saldo."}</p>
              </>
            ) : (
              <>
                <h2 id="inicio-saldo" className="mt-2 text-3xl font-bold tabular-nums text-ink">{formatearMillones(home.availableBalance)}</h2>
                <p className="mt-1 text-sm text-ink-muted">Solo consulta. Los ajustes los registra el administrador.</p>
              </>
            )}
          </Card>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <button type="button" onClick={() => onGo("resultados")} className="flex min-h-14 items-center justify-between gap-3 rounded-card border border-line bg-surface px-4 text-left text-sm font-semibold text-ink shadow-card transition-colors hover:border-line-strong">
          <span className="flex items-center gap-3"><Flag aria-hidden="true" className="h-5 w-5 text-brand" /> Ver resultados</span>
          <ArrowRight aria-hidden="true" className="h-4 w-4 text-ink-muted" />
        </button>
        <button type="button" onClick={() => onGo("telemetria")} className="flex min-h-14 items-center justify-between gap-3 rounded-card border border-line bg-surface px-4 text-left text-sm font-semibold text-ink shadow-card transition-colors hover:border-line-strong">
          <span className="flex items-center gap-3"><Gauge aria-hidden="true" className="h-5 w-5 text-brand" /> Telemetría y vuelta rápida</span>
          <ArrowRight aria-hidden="true" className="h-4 w-4 text-ink-muted" />
        </button>
      </div>
    </div>
  );
}

// ── CONTENEDOR COMÚN ──────────────────────────────────────────────────────────

interface BaseDashboardProps {
  role: "jeque" | "piloto" | "usuario";
  tabs: TabDef[];
  canViewBudget: boolean;
  renderExtraTabs?: () => React.ReactNode;
}

function BaseDashboard({ role, tabs, canViewBudget, renderExtraTabs }: BaseDashboardProps) {
  const { userData } = useAuth();
  const { splits, loading: loadingSplits } = useSplits();
  const { usuarios } = useUsuarios();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTabState] = useState(() => {
    const requested = searchParams.get("tab") ?? "";
    const id = LEGACY_TABS[requested] ?? requested;
    return tabs.some(t => t.id === id) ? id : "inicio";
  });
  const setActiveTab = useCallback((id: string) => {
    setActiveTabState(id);
    // La URL refleja la pestaña; los parámetros de carrera/temporada solo viven en su pestaña.
    setSearchParams({ tab: id }, { replace: true });
  }, [setSearchParams]);

  const isAdmin = userData?.rol === "admin" || userData?.email === "ajgarciarias@gmail.com" || userData?.email === "admin@f1bugambra.com";
  const marketLifecycleError = useMarketLifecycleStatus();

  const getPilotPhoto = (pilotoId: string) => {
    const u = (usuarios || []).find((u: any) => u.uid === pilotoId || u.piloto_id === pilotoId);
    if ((u as any)?.foto_url) return (u as any).foto_url;
    for (const s of splits || []) {
      const p = (s.roster || []).find((r: any) => r.pilotoId === pilotoId);
      if (p?.foto_url) return p.foto_url;
    }
    return "";
  };

  const allSplits = (splits || []).filter((s: any) => s.id !== "global");
  const validSplits = (() => {
    const visible = allSplits.filter((s: any) => s.activo || s.completado || s.tipo === "individual");
    return visible.length > 0 ? visible : allSplits;
  })();
  const [teamsSplitId, setTeamsSplitId] = useState<string>(() => searchParams.get("temporada") ?? "");
  const latestTeamsSplitId = validSplits[validSplits.length - 1]?.id || "";
  const resolvedTeamsSplitId = validSplits.some((split: any) => split.id === teamsSplitId)
    ? teamsSplitId
    : latestTeamsSplitId;
  const teamsSplit = validSplits.find((split: any) => split.id === resolvedTeamsSplitId);

  // Split activo para Inicio y Mi escudería
  const activeSplit = validSplits.find((s: any) => s.activo) || validSplits[validSplits.length - 1];
  const activeSplitId = activeSplit?.id || "";
  const [marketSplitId, setMarketSplitId] = useState("");
  const marketSplits = allSplits.filter(split => split.tipo !== "individual" && !split.completado
    && !split.temporada_iniciada && !split.mercado_cerrado_por_plantillas
    && (split.activo || split.fichajes_abiertos));
  const marketSplit = marketSplits.find(split => split.id === marketSplitId)
    || marketSplits.find(split => split.fichajes_abiertos) || marketSplits[0];
  const visibleTabs = tabs.filter(tab => tab.id !== "market" || marketSplits.length > 0);
  const isAuctionEnabled = marketSplit?.mercado_subasta_activado === true;
  const selectedMarketClosed = !!marketSplitId && allSplits.some(split => split.id === marketSplitId
    && (split.mercado_cerrado_por_plantillas || split.temporada_iniciada || split.completado));
  useEffect(() => {
    if (!loadingSplits && activeTab === "market" && (!marketSplit || selectedMarketClosed)) {
      setActiveTab("comunidad");
      setMarketSplitId("");
    }
  }, [loadingSplits, activeTab, marketSplit?.id, selectedMarketClosed, setActiveTab]);
  useEffect(() => {
    if (activeTab === "market" && marketSplit && !marketSplitId) setMarketSplitId(marketSplit.id);
  }, [activeTab, marketSplit?.id, marketSplitId]);

  const title = visibleTabs.find(t => t.id === activeTab)?.label || role;
  const tabsWithIcons = visibleTabs.map(t => ({ ...t, icon: t.icon ?? TAB_ICONS[t.id] }));

  return (
    <div className="min-h-[100dvh] bg-transparent font-sans text-ink">
      <AppNav title={title} tabs={tabsWithIcons} activeTab={activeTab} onTab={setActiveTab} isAdmin={isAdmin} />
      <MobileBottomTabs tabs={tabsWithIcons} activeTab={activeTab} onTab={setActiveTab} />
      <main className="pt-appbar safe-x pb-tabbar mx-auto max-w-7xl px-4 py-6 md:px-10 md:pt-[8.5rem] md:pb-10">
        {marketLifecycleError && <div className="mb-4"><Notice tone="danger">{marketLifecycleError}</Notice></div>}
        {activeTab === "inicio" && (
          <>
            <PageHeader eyebrow={`Hola, ${userData?.nombre || "bienvenido"}`} title="Inicio" description="Lo importante de tu liga, de un vistazo." />
            <InicioView split={activeSplit} teamId={userData?.escuderia_id} showBalance={canViewBudget} onGo={setActiveTab} />
            {activeSplit?.mercado_cerrado_por_plantillas && (
              <Notice tone="ok" className="mt-4" title={`Plantillas completas en ${activeSplit.nombre}`}>Las bienvenidas de los equipos ya están en Comunidad.</Notice>
            )}
          </>
        )}
        {activeTab === "escuderia" && (
          <>
            <PageHeader title="Mi escudería" description="Presupuesto, plantilla y movimientos. Solo consulta: los ajustes los registra el administrador tras el anuncio de la liga." />
            <TeamEconomyView splitId={activeSplitId} canManage={false} escuderiaId={userData?.escuderia_id} />
          </>
        )}
        {activeTab === "championship" && (
          <>
            <PageHeader title="Campeonato" description="Clasificaciones, próxima carrera y rendimiento de la temporada." />
            <SharedDashboardView canViewBudget={canViewBudget} escuderiaId={userData?.escuderia_id} onOpenTv={() => setActiveTab("tv")} />
          </>
        )}
        {activeTab === "market" && marketSplit && !selectedMarketClosed && (
          <div className="space-y-6">
            <PageHeader title="Mercado" />
            <label className="block text-sm font-semibold text-ink">Mercado del split
              <select value={marketSplit.id} onChange={event => setMarketSplitId(event.target.value)} className="ml-3 min-h-11 rounded-lg border border-line-strong bg-surface px-3 text-ink">
                {marketSplits.map(split => <option key={split.id} value={split.id}>{split.nombre}</option>)}
              </select>
            </label>
            <MarketStatusHeader split={marketSplit} />
            {isAuctionEnabled ? (
              <AuctionRoom key={marketSplit.id} splits={marketSplits} splitId={marketSplit.id} />
            ) : (
              <TeamEconomyView key={marketSplit.id} splitId={marketSplit.id} canManage={false} escuderiaId={userData?.escuderia_id} />
            )}
            <MarketDeadlineView />
          </div>
        )}
        {activeTab === "comunidad" && (
          <>
            <PageHeader title="Comunidad" description="Paddock, votación al mejor piloto y archivo de votaciones." />
            <ComunidadView splits={validSplits} defaultSplitId={resolvedTeamsSplitId} />
          </>
        )}
        {activeTab === "equipos" && (
          <>
            <PageHeader title="Equipos" />
            <TeamsView
              key={resolvedTeamsSplitId}
              validSplits={validSplits}
              currentSplitId={resolvedTeamsSplitId}
              onSelectSplit={(id: string) => setTeamsSplitId(id)}
              currentSplit={teamsSplit}
              getPilotPhoto={getPilotPhoto}
              darkMode
              showEconomy={canViewBudget}
            />
          </>
        )}
        {activeTab === "resultados" && (
          <>
            <PageHeader title="Carreras" description="Circuitos pasados y próximos, acta publicada y decisiones FIA." />
            <RaceResultsView
              key={resolvedTeamsSplitId}
              validSplits={validSplits}
              currentSplitId={resolvedTeamsSplitId}
              onSelectSplit={(id: string) => setTeamsSplitId(id)}
              currentSplit={teamsSplit}
              getPilotPhoto={getPilotPhoto}
              darkMode
            />
          </>
        )}
        {activeTab === "telemetria" && (
          <>
            <PageHeader title="Telemetría" description="Vuelta rápida del circuito y los datos de carrera guardados." />
            <TelemetryView
              key={resolvedTeamsSplitId}
              validSplits={validSplits}
              currentSplitId={resolvedTeamsSplitId}
              onSelectSplit={(id: string) => setTeamsSplitId(id)}
              currentSplit={teamsSplit}
            />
          </>
        )}
        {activeTab === "tv" && <><PageHeader title="TV" /><FomLive /></>}
        {activeTab === "profile" && <ProfileView />}
        {activeTab === "suggestions" && <SuggestionsView isAdmin={false} />}
        {renderExtraTabs && activeTab === "extra" && renderExtraTabs()}
      </main>
    </div>
  );
}

// ── JEQUE DASHBOARD ───────────────────────────────────────────────────────────

export function JequeDashboard() {
  const tabs: TabDef[] = [
    { id: "inicio", label: "Inicio" },
    { id: "escuderia", label: "Mi escudería" },
    { id: "championship", label: "Campeonato" },
    { id: "resultados", label: "Carreras" },
    { id: "telemetria", label: "Telemetría" },
    { id: "comunidad", label: "Comunidad" },
    { id: "market", label: "Mercado" },
    { id: "equipos", label: "Equipos" },
    { id: "tv", label: "TV" },
    { id: "profile", label: "Perfil" },
    { id: "suggestions", label: "Buzón de mejoras" },
  ];

  return (
    <BaseDashboard
      role="jeque"
      tabs={tabs}
      canViewBudget={true}
    />
  );
}

// ── PILOTO DASHBOARD ──────────────────────────────────────────────────────────

export function PilotoDashboard() {
  const tabs: TabDef[] = [
    { id: "inicio", label: "Inicio" },
    { id: "championship", label: "Campeonato" },
    { id: "resultados", label: "Carreras" },
    { id: "telemetria", label: "Telemetría" },
    { id: "comunidad", label: "Comunidad" },
    { id: "market", label: "Mercado" },
    { id: "equipos", label: "Equipos" },
    { id: "tv", label: "TV" },
    { id: "profile", label: "Perfil" },
    { id: "suggestions", label: "Buzón de mejoras" },
  ];

  return (
    <BaseDashboard
      role="piloto"
      tabs={tabs}
      canViewBudget={false}
    />
  );
}

export function UsuarioDashboard() {
  const tabs: TabDef[] = [
    { id: "inicio", label: "Inicio" },
    { id: "championship", label: "Campeonato" },
    { id: "resultados", label: "Carreras" },
    { id: "telemetria", label: "Telemetría" },
    { id: "comunidad", label: "Comunidad" },
    { id: "market", label: "Mercado" },
    { id: "equipos", label: "Equipos" },
    { id: "tv", label: "TV" },
    { id: "profile", label: "Perfil" },
    { id: "suggestions", label: "Buzón de mejoras" },
  ];

  return <BaseDashboard role="usuario" tabs={tabs} canViewBudget={false} />;
}

// Exported for backwards compat
export function UserHeader({ title, action }: { title: string; action?: React.ReactNode }) {
  const { userData } = useAuth();
  return (
    <header className="min-h-14 border border-line md:border-b md:border-x-0 md:border-t-0 bg-surface-2 md:bg-transparent backdrop-blur-xl flex flex-wrap items-center justify-between px-4 py-3 md:px-6 md:py-0 shrink-0 mb-5 md:mb-8 rounded-3xl md:rounded-none gap-3">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <span className="w-0.5 h-5 bg-brand" />
        <span className="truncate font-black tracking-[0.15em] uppercase text-sm">F1 Bugambra</span>
        <span className="hidden sm:block w-px h-4 bg-surface-2" />
        <span className="hidden sm:block text-[10px] font-mono tracking-[0.3em] text-ink-muted uppercase">{title}</span>
      </div>
      {action && <div className="order-3 w-full sm:order-2 sm:w-auto">{action}</div>}
      <div className="order-2 flex items-center gap-3 min-w-0 sm:order-3">
        <span className="hidden md:inline text-[10px] font-mono text-ink-muted uppercase">{userData?.rol}</span>
        <span className="hidden sm:inline text-sm font-bold text-ink-2 truncate max-w-28">{userData?.nombre}</span>
        <button onClick={() => auth.signOut()} className="text-[10px] font-bold tracking-[0.3em] uppercase text-ink-muted hover:text-brand transition-colors">Salir</button>
      </div>
    </header>
  );
}
