import { useState } from "react";
import { Link } from "react-router";
import { useAuth } from "../contexts/AuthContext";
import { SharedDashboardView, TotalStandings } from "./SharedDashboard";
import { ProfileView } from "./ProfileView";
import { auth } from "../services/firebase";
import { SuggestionsView } from "./SuggestionsView";
import { AlbumView } from "./PublicHome";
import { useSplits, useUsuarios } from "../hooks/useData";
import { MobileBottomTabs } from "./MobileBottomTabs";

// ── SHARED NAV HEADER ─────────────────────────────────────────────────────────

function AppNav({ title, tabs, activeTab, onTab }: {
  title: string;
  tabs: { id: string; label: string }[];
  activeTab: string;
  onTab: (id: string) => void;
}) {
  const { userData } = useAuth();
  return (
    <header className="fixed top-0 inset-x-0 z-50 bg-[#0a0a0a]/90 backdrop-blur-xl border-b border-white/[0.06] safe-top">
      {/* Top bar */}
      <div className="flex items-center justify-between h-14 px-6 md:px-10">
        <div className="flex items-center gap-3">
          <Link to="/" className="flex items-center gap-2.5 group">
            <span className="w-0.5 h-5 bg-[#e10600]" />
            <span className="font-black tracking-[0.15em] uppercase text-sm text-white group-hover:text-white/70 transition-colors">F1 Bugambra</span>
          </Link>
          <span className="hidden md:block w-px h-4 bg-white/10" />
          <span className="hidden md:block text-[10px] font-mono tracking-[0.3em] text-white/30 uppercase">{title}</span>
        </div>
        <div className="flex items-center gap-6">
          <div className="hidden md:flex items-center gap-2">
            <span className="text-[10px] font-mono tracking-[0.25em] text-white/25 uppercase">{userData?.rol}</span>
            <span className="text-[10px] font-bold text-white/70">{userData?.nombre}</span>
          </div>
          <button
            onClick={() => auth.signOut()}
            className="text-[10px] font-bold tracking-[0.3em] uppercase text-white/30 hover:text-[#e10600] transition-colors"
          >
            Salir
          </button>
        </div>
      </div>
      {/* Tab bar */}
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

// ── JEQUE DASHBOARD ───────────────────────────────────────────────────────────

export function JequeDashboard() {
  const { userData } = useAuth();
  const { splits } = useSplits();
  const { usuarios } = useUsuarios();
  const [activeTab, setActiveTab] = useState("championship");

  const tabs = [
    { id: "championship", label: "Campeonato" },
    { id: "album",        label: "Álbum de Pilotos" },
    { id: "profile",      label: "Mi Perfil" },
    { id: "suggestions",  label: "Buzón de Mejoras" },
  ];

  const title = tabs.find(t => t.id === activeTab)?.label || "Jeque";

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
  const validSplits = (() => { const a = allSplits.filter((s: any) => s.activo); return a.length > 0 ? a : allSplits; })();
  const [albumSplitId, setAlbumSplitId] = useState<string>("");
  const resolvedAlbumSplitId = albumSplitId || validSplits[validSplits.length - 1]?.id || "";
  const albumSplit = validSplits.find((s: any) => s.id === resolvedAlbumSplitId) || validSplits[validSplits.length - 1];

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-sans">
      <AppNav title={title} tabs={tabs} activeTab={activeTab} onTab={setActiveTab} />
      <main className="pt-24 md:pt-[7.5rem] max-w-7xl mx-auto px-4 md:px-10 py-6 md:py-10 pb-28 md:pb-10">
        {activeTab === "championship" && <SharedDashboardView canViewBudget={true} escuderiaId={userData?.escuderia_id} />}
        {activeTab === "album" && (
          <AlbumView
            validSplits={validSplits}
            currentSplitId={resolvedAlbumSplitId}
            onSelectSplit={(id: string) => setAlbumSplitId(id)}
            currentSplit={albumSplit}
            getPilotPhoto={getPilotPhoto}
          />
        )}
        {activeTab === "profile" && <ProfileView />}
        {activeTab === "suggestions" && <SuggestionsView isAdmin={false} />}
      </main>
    </div>
  );
}

// ── PILOTO DASHBOARD ──────────────────────────────────────────────────────────

export function PilotoDashboard() {
  const { userData } = useAuth();
  const { splits } = useSplits();
  const { usuarios } = useUsuarios();
  const [activeTab, setActiveTab] = useState("championship");

  const tabs = [
    { id: "championship", label: "Campeonato" },
    { id: "album",        label: "Álbum de Pilotos" },
    { id: "profile",      label: "Mi Perfil" },
    { id: "suggestions",  label: "Buzón de Mejoras" },
  ];

  const title = tabs.find(t => t.id === activeTab)?.label || "Piloto";

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
  const validSplits = (() => { const a = allSplits.filter((s: any) => s.activo); return a.length > 0 ? a : allSplits; })();
  const [albumSplitId, setAlbumSplitId] = useState<string>("");
  const resolvedAlbumSplitId = albumSplitId || validSplits[validSplits.length - 1]?.id || "";
  const albumSplit = validSplits.find((s: any) => s.id === resolvedAlbumSplitId) || validSplits[validSplits.length - 1];

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-sans">
      <AppNav title={title} tabs={tabs} activeTab={activeTab} onTab={setActiveTab} />
      <main className="pt-24 md:pt-[7.5rem] max-w-7xl mx-auto px-4 md:px-10 py-6 md:py-10 pb-28 md:pb-10">
        {activeTab === "championship" && <SharedDashboardView canViewBudget={false} escuderiaId={userData?.escuderia_id} />}
        {activeTab === "album" && (
          <AlbumView
            validSplits={validSplits}
            currentSplitId={resolvedAlbumSplitId}
            onSelectSplit={(id: string) => setAlbumSplitId(id)}
            currentSplit={albumSplit}
            getPilotPhoto={getPilotPhoto}
          />
        )}
        {activeTab === "profile" && <ProfileView />}
        {activeTab === "suggestions" && <SuggestionsView isAdmin={false} />}
      </main>
    </div>
  );
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
