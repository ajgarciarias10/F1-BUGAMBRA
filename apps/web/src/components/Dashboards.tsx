import { lazy, Suspense, useState, useMemo, useEffect } from "react";
import { Link } from "react-router";
import { useAuth } from "../contexts/AuthContext";
import { SharedDashboardView } from "./SharedDashboard";
import { ProfileView } from "./ProfileView";
import { auth } from "../services/auth";
import { SuggestionsView } from "./SuggestionsView";
import { MarketDeadlineView } from "./MarketDeadlineView";
import { AuctionRoom } from "./AuctionRoom";
import { TeamEconomyView } from "./TeamEconomyView";
import { PaddockForum } from "./PaddockForum";
import { TeamsView } from "./TeamsView";
import { RaceResultsView } from "./RaceResultsView";
import { useSplits, useUsuarios } from "../hooks/useData";
import { MobileBottomTabs } from "./MobileBottomTabs";
import { Shield, ChevronLeft, Lock, Store } from "lucide-react";
import { useMarketLifecycleStatus } from "./MarketLifecycleProvider";
import { StatusBanner } from "./Feedback";

const AdminDashboard = lazy(() => import("./AdminDashboard").then(module => ({ default: module.AdminDashboard })));

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
        abierto ? "border-emerald-500/30 bg-emerald-500/[0.07]" : "border-white/10 bg-white/[0.03]"
      }`}
    >
      <span className={`flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.18em] ${abierto ? "text-emerald-300" : "text-white/50"}`}>
        {abierto ? <Store className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
        {abierto ? "Mercado abierto" : "Mercado cerrado"}
      </span>
      <span className="text-[11px] font-mono uppercase tracking-[0.16em] text-white/35">
        {split.nombre} · {subasta ? "Sala de pujas" : "Fichaje directo"}
      </span>
      <span className="w-full text-[11px] leading-relaxed text-white/45 sm:w-auto sm:flex-1">
        {abierto
          ? subasta
            ? "Las operaciones se resuelven pujando en la sala. El admin saca a cada piloto."
            : "Puedes fichar agentes libres y ejecutar cláusulas directamente desde aquí."
          : "La ventana de fichajes está cerrada. El admin la abre desde el panel de control."}
      </span>
    </div>
  );
}

// ── ADMIN OVERLAY ──────────────────────────────────────────────────────────────
// Overlay que permite a usuarios con rol admin acceder al panel de admin
// sin salir de su dashboard (jeque/piloto).

interface AdminOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

function AdminOverlay({ isOpen, onClose }: AdminOverlayProps) {
  if (!isOpen) return null;

  return (
    <div className="dark fixed inset-0 z-[99] flex flex-col bg-[#0a0a0a] text-white">
      <header className="flex items-center justify-between min-h-14 px-3 md:px-8 border-b border-white/10 bg-[#0a0a0a]/95 backdrop-blur-xl z-10 safe-top safe-x">
        <div className="flex items-center gap-2 min-w-0">
          <button
            onClick={onClose}
            className="-ml-1 grid h-11 w-11 shrink-0 place-items-center text-white/50 hover:text-white transition-colors"
            aria-label="Cerrar panel admin"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-0.5 h-5 shrink-0 bg-[#e10600]" />
            <span className="truncate font-black tracking-tight md:tracking-[0.15em] uppercase text-sm text-white">F1 Bugambra</span>
            <span className="shrink-0 rounded-full md:rounded-sm border border-[#e10600]/30 bg-[#e10600]/20 px-2 py-0.5 text-[10px] font-bold uppercase text-[#e10600]">
              Admin
            </span>
          </div>
        </div>
        <button
          onClick={onClose}
          className="flex min-h-10 shrink-0 items-center rounded-full md:rounded-sm border border-white/10 bg-white/5 px-3 text-[12px] font-bold text-white/80 transition-colors hover:bg-white/10 md:text-[10px] md:tracking-[0.2em] md:uppercase"
        >
          <span className="md:hidden">Salir</span>
          <span className="hidden md:inline">Volver a mi dashboard</span>
        </button>
      </header>
      <div className="flex-1 overflow-auto overscroll-contain pt-4 pb-24 safe-x">
        <Suspense fallback={<div className="py-24 text-center text-xs font-mono uppercase tracking-[0.3em] text-white/30">Cargando administración...</div>}>
          <AdminDashboard />
        </Suspense>
      </div>
    </div>
  );
}

// ── APP NAV WITH ADMIN TOGGLE ──────────────────────────────────────────────────

interface AppNavProps {
  title: string;
  tabs: { id: string; label: string }[];
  activeTab: string;
  onTab: (id: string) => void;
  isAdmin: boolean;
  onToggleAdmin: () => void;
  showAdminBadge?: boolean;
}

function AppNav({ title, tabs, activeTab, onTab, isAdmin, onToggleAdmin, showAdminBadge = true }: AppNavProps) {
  const { userData } = useAuth();
  return (
    <header className="fixed top-0 inset-x-0 z-50 bg-[#0a0a0a]/90 backdrop-blur-xl border-b border-white/[0.06] safe-top safe-x">
      <div className="flex items-center justify-between h-14 px-3 md:px-10 gap-2">
        <div className="flex items-center gap-3 min-w-0">
          <Link to="/" className="flex items-center gap-2.5 group min-w-0">
            <span className="w-0.5 h-5 shrink-0 bg-[#e10600]" />
            <span className="truncate font-black tracking-tight md:tracking-[0.15em] uppercase text-sm text-white group-hover:text-white/70 transition-colors">F1 Bugambra</span>
          </Link>
          <span className="hidden md:block w-px h-4 bg-white/10" />
          <span className="hidden md:block text-[10px] font-mono tracking-[0.3em] text-white/30 uppercase">{title}</span>
        </div>
        <div className="flex items-center gap-1 md:gap-4 shrink-0">
          <div className="hidden md:flex items-center gap-2">
            <span className="text-[10px] font-mono tracking-[0.25em] text-white/25 uppercase">{userData?.rol}</span>
            <span className="text-[10px] font-bold text-white/70">{userData?.nombre}</span>
          </div>
          {isAdmin && showAdminBadge && (
            <button
              onClick={onToggleAdmin}
              className="flex min-h-10 items-center gap-1.5 rounded-full md:rounded-sm px-3 text-[12px] font-bold md:text-[10px] md:tracking-[0.2em] md:uppercase bg-[#e10600]/20 hover:bg-[#e10600]/30 border border-[#e10600]/30 text-[#e10600] transition-colors"
              aria-label="Abrir panel de administración"
            >
              <Shield className="w-4 h-4 md:w-3.5 md:h-3.5" />
              <span className="hidden sm:inline">Admin</span>
            </button>
          )}
          <button
            onClick={() => auth.signOut()}
            className="min-h-10 px-2 text-[12px] font-bold text-white/40 hover:text-[#e10600] transition-colors md:text-[10px] md:tracking-[0.3em] md:uppercase md:text-white/30"
          >
            Salir
          </button>
        </div>
      </div>
      <div className="hidden md:flex border-t border-white/[0.04] px-6 md:px-10 overflow-x-auto">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => onTab(t.id)}
            className={`shrink-0 py-3 mr-8 text-[10px] font-bold tracking-[0.25em] uppercase transition-all border-b-2 -mb-px whitespace-nowrap ${activeTab === t.id ? "border-[#e10600] text-white" : "border-transparent text-white/30 hover:text-white/60"}`}
          >
            {t.label}
          </button>
        ))}
      </div>
    </header>
  );
}

// ── BASE DASHBOARD ─────────────────────────────────────────────────────────────

interface BaseDashboardProps {
  role: "jeque" | "piloto" | "usuario";
  tabs: { id: string; label: string }[];
  canViewBudget: boolean;
  renderExtraTabs?: () => React.ReactNode;
}

function BaseDashboard({ role, tabs, canViewBudget, renderExtraTabs }: BaseDashboardProps) {
  const { userData } = useAuth();
  const { splits, loading: loadingSplits } = useSplits();
  const { usuarios } = useUsuarios();
  const [activeTab, setActiveTab] = useState("championship");
  const [adminOpen, setAdminOpen] = useState(false);

  const isAdmin = userData?.rol === "admin" || userData?.email === "ajgarciarias@gmail.com" || userData?.email === "admin@f1bugambra.com";
  const marketLifecycleError = useMarketLifecycleStatus();

  const title = tabs.find(t => t.id === activeTab)?.label || role;

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
  const [teamsSplitId, setTeamsSplitId] = useState<string>("");
  const latestTeamsSplitId = validSplits[validSplits.length - 1]?.id || "";
  const resolvedTeamsSplitId = validSplits.some((split: any) => split.id === teamsSplitId)
    ? teamsSplitId
    : latestTeamsSplitId;
  const teamsSplit = validSplits.find((split: any) => split.id === resolvedTeamsSplitId);

  // Split activo para la pestaña de economía
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
      setActiveTab("paddock");
      setMarketSplitId("");
    }
  }, [loadingSplits, activeTab, marketSplit?.id, selectedMarketClosed]);
  useEffect(() => {
    if (activeTab === "market" && marketSplit && !marketSplitId) setMarketSplitId(marketSplit.id);
  }, [activeTab, marketSplit?.id, marketSplitId]);

  return (
    <div className="dark min-h-[100dvh] bg-[#0a0a0a] text-white font-sans">
      <AppNav
        title={title}
        tabs={visibleTabs}
        activeTab={activeTab}
        onTab={setActiveTab}
        isAdmin={isAdmin}
        onToggleAdmin={() => setAdminOpen(true)}
      />
      <MobileBottomTabs tabs={visibleTabs} activeTab={activeTab} onTab={setActiveTab} />
      <AdminOverlay isOpen={adminOpen} onClose={() => setAdminOpen(false)} />
      <main className="pt-appbar md:pt-[7.5rem] max-w-7xl mx-auto px-3 md:px-10 py-6 md:py-10 pb-tabbar md:pb-10 safe-x">
        <div className="rail-title rail-title-on-dark mb-5 md:hidden">{title}</div>
        {marketLifecycleError && <StatusBanner message={marketLifecycleError} tone="error" />}
        {activeTab === "championship" && <section className="mb-6 rounded-2xl border border-white/10 bg-white/[0.04] p-4 md:p-6">
          <p className="text-sm text-white/60">Hola, {userData?.nombre || "bienvenido a la parrilla"} 👋</p>
          <h1 className="mt-1 text-xl font-black md:text-2xl">Tu liga, en un vistazo</h1>
          <p className="mt-2 text-sm leading-relaxed text-white/65">Aquí abajo tienes la próxima carrera y la clasificación. Elige qué quieres hacer ahora.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {[
              { tab: "paddock", title: "Entra en la conversación", description: "Saluda a tu equipo o comenta la última carrera." },
              { tab: marketSplit?.fichajes_abiertos ? "market" : "equipos", title: marketSplit?.fichajes_abiertos ? (role === "jeque" ? "Completa tu equipo" : "Sigue los fichajes") : "Conoce la parrilla", description: marketSplit?.fichajes_abiertos ? `${marketSplit.nombre}: ${isAuctionEnabled ? "subasta en vivo" : "mercado abierto"}.` : "Descubre los equipos y quién corre en cada uno." },
              { tab: "resultados", title: "Revive la última carrera", description: "Consulta los resultados y vota al piloto del día cuando la votación esté abierta." },
            ].map(action => <button key={action.tab} onClick={() => setActiveTab(action.tab)} className="min-h-24 rounded-xl border border-white/15 bg-black/20 p-4 text-left transition-colors hover:border-[#e10600]/60 hover:bg-white/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#e10600]">
              <span className="block text-sm font-bold">{action.title} →</span>
              <span className="mt-1 block text-sm leading-relaxed text-white/60">{action.description}</span>
            </button>)}
          </div>
          {activeSplit?.mercado_cerrado_por_plantillas && <p className="mt-4 text-sm text-emerald-300">🏁 Plantillas completas en {activeSplit.nombre}. Las bienvenidas de los equipos ya están en el paddock.</p>}
        </section>}
        {activeTab === "championship" && <SharedDashboardView canViewBudget={canViewBudget} escuderiaId={userData?.escuderia_id} />}
        {activeTab === "market" && marketSplit && !selectedMarketClosed && (
          <div className="space-y-6">
            <label className="block text-sm font-bold">Mercado del split
              <select value={marketSplit.id} onChange={event => setMarketSplitId(event.target.value)} className="ml-3 min-h-11 rounded-xl border border-white/20 bg-[#151515] px-3">
                {marketSplits.map(split => <option key={split.id} value={split.id}>{split.nombre}</option>)}
              </select>
            </label>
            <MarketStatusHeader split={marketSplit} />
            {isAuctionEnabled ? (
              <AuctionRoom key={marketSplit.id} splits={marketSplits} splitId={marketSplit.id} />
            ) : (
              <TeamEconomyView key={marketSplit.id} splitId={marketSplit.id} canManage={role === "jeque"} escuderiaId={userData?.escuderia_id} />
            )}
            <MarketDeadlineView />
          </div>
        )}
        {activeTab === "economia" && (
          <TeamEconomyView splitId={activeSplitId} canManage={role === "jeque"} escuderiaId={userData?.escuderia_id} />
        )}
        {activeTab === "paddock" && <PaddockForum />}
        {activeTab === "equipos" && (
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
        )}
        {activeTab === "resultados" && (
          <RaceResultsView
            key={resolvedTeamsSplitId}
            validSplits={validSplits}
            currentSplitId={resolvedTeamsSplitId}
            onSelectSplit={(id: string) => setTeamsSplitId(id)}
            currentSplit={teamsSplit}
            getPilotPhoto={getPilotPhoto}
            darkMode
          />
        )}
        {activeTab === "profile" && <ProfileView />}
        {activeTab === "suggestions" && <SuggestionsView isAdmin={false} />}
        {renderExtraTabs && activeTab === "extra" && renderExtraTabs()}
      </main>
    </div>
  );
}

// ── JEQUE DASHBOARD ───────────────────────────────────────────────────────────

export function JequeDashboard() {
  const tabs = [
    { id: "championship", label: "Campeonato" },
    { id: "market", label: "Mercado" },
    { id: "economia", label: "Economía" },
    { id: "paddock", label: "Paddock" },
    { id: "equipos", label: "Equipos" },
    { id: "resultados", label: "Resultados" },
    { id: "profile", label: "Mi Perfil" },
    { id: "suggestions", label: "Buzón de Mejoras" },
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
  const tabs = [
    { id: "championship", label: "Campeonato" },
    { id: "market", label: "Mercado" },
    { id: "paddock", label: "Paddock" },
    { id: "equipos",      label: "Equipos" },
    { id: "resultados",    label: "Resultados" },
    { id: "profile",      label: "Mi Perfil" },
    { id: "suggestions",  label: "Buzón de Mejoras" },
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
  const tabs = [
    { id: "championship", label: "Campeonato" },
    { id: "market", label: "Mercado" },
    { id: "paddock", label: "Paddock" },
    { id: "equipos",      label: "Equipos" },
    { id: "resultados",    label: "Resultados" },
    { id: "profile",      label: "Mi Perfil" },
    { id: "suggestions",  label: "Buzón de Mejoras" },
  ];

  return <BaseDashboard role="usuario" tabs={tabs} canViewBudget={false} />;
}

// Exported for backwards compat
export function UserHeader({ title }: { title: string }) {
  const { userData } = useAuth();
  return (
    <header className="min-h-14 border border-white/[0.08] md:border-b md:border-x-0 md:border-t-0 bg-white/[0.03] md:bg-transparent backdrop-blur-xl flex items-center justify-between px-4 md:px-6 shrink-0 mb-5 md:mb-8 rounded-3xl md:rounded-none gap-3">
      <div className="flex items-center gap-3">
        <span className="w-0.5 h-5 bg-[#e10600]" />
        <span className="font-black tracking-[0.15em] uppercase text-sm">F1 Bugambra</span>
        <span className="hidden sm:block w-px h-4 bg-white/10" />
        <span className="hidden sm:block text-[10px] font-mono tracking-[0.3em] text-white/30 uppercase">{title}</span>
      </div>
      <div className="flex items-center gap-3 min-w-0">
        <span className="hidden md:inline text-[10px] font-mono text-white/25 uppercase">{userData?.rol}</span>
        <span className="hidden sm:inline text-sm font-bold text-white/70 truncate max-w-28">{userData?.nombre}</span>
        <button onClick={() => auth.signOut()} className="text-[10px] font-bold tracking-[0.3em] uppercase text-white/30 hover:text-[#e10600] transition-colors">Salir</button>
      </div>
    </header>
  );
}
