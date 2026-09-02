import { useState } from "react";
import { Link } from "react-router";
import { useAuth } from "../contexts/AuthContext";
import { SharedDashboardView } from "./SharedDashboard";
import { ProfileView } from "./ProfileView";
import { auth } from "../services/firebase";
import { SuggestionsView } from "./SuggestionsView";
import { MarketDeadlineView } from "./MarketDeadlineView";
import { AuctionRoom } from "./AuctionRoom";
import { PaddockForum } from "./PaddockForum";
import { TeamsView } from "./TeamsView";
import { useSplits, useUsuarios } from "../hooks/useData";
import { MobileBottomTabs } from "./MobileBottomTabs";
import { AdminDashboard } from "./AdminDashboard";
import { Shield, ChevronLeft } from "lucide-react";

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
    <div className="fixed inset-0 z-[99] flex flex-col bg-[#0a0a0a] text-white">
      <header className="flex items-center justify-between h-14 px-4 md:px-8 border-b border-white/10 bg-[#0a0a0a]/95 backdrop-blur-xl z-10">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="p-2 text-white/40 hover:text-white transition-colors"
            aria-label="Cerrar panel admin"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2.5">
            <span className="w-0.5 h-5 bg-[#e10600]" />
            <span className="font-black tracking-[0.15em] uppercase text-sm text-white">F1 Bugambra</span>
            <span className="px-2 py-0.5 text-[9px] font-mono uppercase tracking-widest bg-[#e10600]/20 text-[#e10600] border border-[#e10600]/30 rounded-sm">
              ADMIN
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-[10px] font-bold tracking-[0.2em] uppercase bg-white/5 hover:bg-white/10 border border-white/10 rounded-sm transition-colors"
          >
            Volver a mi dashboard
          </button>
        </div>
      </header>
      <div className="flex-1 overflow-auto pt-4 pb-28">
        <AdminDashboard />
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
    <header className="fixed top-0 inset-x-0 z-50 bg-[#0a0a0a]/90 backdrop-blur-xl border-b border-white/[0.06] safe-top">
      <div className="flex items-center justify-between h-14 px-6 md:px-10">
        <div className="flex items-center gap-3">
          <Link to="/" className="flex items-center gap-2.5 group">
            <span className="w-0.5 h-5 bg-[#e10600]" />
            <span className="font-black tracking-[0.15em] uppercase text-sm text-white group-hover:text-white/70 transition-colors">F1 Bugambra</span>
          </Link>
          <span className="hidden md:block w-px h-4 bg-white/10" />
          <span className="hidden md:block text-[10px] font-mono tracking-[0.3em] text-white/30 uppercase">{title}</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-2">
            <span className="text-[10px] font-mono tracking-[0.25em] text-white/25 uppercase">{userData?.rol}</span>
            <span className="text-[10px] font-bold text-white/70">{userData?.nombre}</span>
          </div>
          {isAdmin && showAdminBadge && (
            <button
              onClick={onToggleAdmin}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold tracking-[0.2em] uppercase bg-[#e10600]/20 hover:bg-[#e10600]/30 border border-[#e10600]/30 text-[#e10600] rounded-sm transition-colors"
              aria-label="Abrir panel de administración"
            >
              <Shield className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Admin</span>
            </button>
          )}
          <button
            onClick={() => auth.signOut()}
            className="text-[10px] font-bold tracking-[0.3em] uppercase text-white/30 hover:text-[#e10600] transition-colors"
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
      <MobileBottomTabs tabs={tabs} activeTab={activeTab} onTab={onTab} />
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
  const { splits } = useSplits();
  const { usuarios } = useUsuarios();
  const [activeTab, setActiveTab] = useState("championship");
  const [adminOpen, setAdminOpen] = useState(false);

  const isAdmin = userData?.rol === "admin" || userData?.email === "ajgarciarias@gmail.com" || userData?.email === "admin@f1bugambra.com";

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

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-sans">
      <AppNav
        title={title}
        tabs={tabs}
        activeTab={activeTab}
        onTab={setActiveTab}
        isAdmin={isAdmin}
        onToggleAdmin={() => setAdminOpen(true)}
      />
      <AdminOverlay isOpen={adminOpen} onClose={() => setAdminOpen(false)} />
      <main className="pt-24 md:pt-[7.5rem] max-w-7xl mx-auto px-4 md:px-10 py-6 md:py-10 pb-28 md:pb-10">
        {activeTab === "championship" && <SharedDashboardView canViewBudget={canViewBudget} escuderiaId={userData?.escuderia_id} />}
        {activeTab === "market" && (
          <div className="space-y-6">
            {/* La sala va arriba: el día de mercado es lo único que importa mientras dura. */}
            <AuctionRoom splits={validSplits} splitId={resolvedTeamsSplitId} />
            <MarketDeadlineView />
          </div>
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
    { id: "paddock", label: "Paddock" },
    { id: "equipos",      label: "Equipos" },
    { id: "profile",      label: "Mi Perfil" },
    { id: "suggestions",  label: "Buzón de Mejoras" },
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
