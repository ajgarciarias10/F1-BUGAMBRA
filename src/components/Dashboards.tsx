import { useState } from "react";
import { Link } from "react-router";
import { useAuth } from "../contexts/AuthContext";
import { SharedDashboardView } from "./SharedDashboard";
import { ProfileView } from "./ProfileView";
import { auth } from "../services/firebase";
import { SuggestionsView } from "./SuggestionsView";
import { AlbumView } from "./PublicHome";
import { useSplits, useUsuarios } from "../hooks/useData";

// ── SHARED NAV HEADER ─────────────────────────────────────────────────────────

function AppNav({ title, tabs, activeTab, onTab }: {
  title: string;
  tabs: { id: string; label: string }[];
  activeTab: string;
  onTab: (id: string) => void;
}) {
  const { userData } = useAuth();
  return (
    <header className="fixed top-0 inset-x-0 z-50 bg-[#0a0a0a]/95 border-b border-white/[0.06]">
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
      <div className="flex border-t border-white/[0.04] px-6 md:px-10 overflow-x-auto">
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

// ── JEQUE DASHBOARD ───────────────────────────────────────────────────────────

export function JequeDashboard() {
  const { userData } = useAuth();
  const { splits } = useSplits();
  const { usuarios } = useUsuarios();
  const [activeTab, setActiveTab] = useState("championship");

  const tabs = [
    { id: "championship", label: "Campeonato" },
    { id: "album", label: "Álbum de Pilotos" },
    { id: "profile", label: "Mi Perfil" },
    { id: "suggestions", label: "Buzón de Mejoras" },
  ];

  const title = tabs.find(t => t.id === activeTab)?.label || "Jeque";

  const getPilotPhoto = (pilotoId: string) => {
    const u = (usuarios || []).find((u: any) => u.uid === pilotoId || u.piloto_id === pilotoId);
    return (u as any)?.foto_url || "";
  };

  const allSplits = (splits || []).filter((s: any) => s.id !== "global");
  const validSplits = (() => { const a = allSplits.filter((s: any) => s.activo); return a.length > 0 ? a : allSplits; })();
  const [albumSplitId, setAlbumSplitId] = useState<string>("");
  const resolvedAlbumSplitId = albumSplitId || validSplits[validSplits.length - 1]?.id || "";
  const albumSplit = validSplits.find((s: any) => s.id === resolvedAlbumSplitId) || validSplits[validSplits.length - 1];

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-sans">
      <AppNav title={title} tabs={tabs} activeTab={activeTab} onTab={setActiveTab} />
      <main className="pt-[7.5rem] max-w-7xl mx-auto px-6 md:px-10 py-10">
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
    { id: "album", label: "Álbum de Pilotos" },
    { id: "profile", label: "Mi Perfil" },
    { id: "suggestions", label: "Buzón de Mejoras" },
  ];

  const title = tabs.find(t => t.id === activeTab)?.label || "Piloto";

  const getPilotPhoto = (pilotoId: string) => {
    const u = (usuarios || []).find((u: any) => u.uid === pilotoId || u.piloto_id === pilotoId);
    return (u as any)?.foto_url || "";
  };

  const allSplits = (splits || []).filter((s: any) => s.id !== "global");
  const validSplits = (() => { const a = allSplits.filter((s: any) => s.activo); return a.length > 0 ? a : allSplits; })();
  const [albumSplitId, setAlbumSplitId] = useState<string>("");
  const resolvedAlbumSplitId = albumSplitId || validSplits[validSplits.length - 1]?.id || "";
  const albumSplit = validSplits.find((s: any) => s.id === resolvedAlbumSplitId) || validSplits[validSplits.length - 1];

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-sans">
      <AppNav title={title} tabs={tabs} activeTab={activeTab} onTab={setActiveTab} />
      <main className="pt-[7.5rem] max-w-7xl mx-auto px-6 md:px-10 py-10">
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
    <header className="h-14 border-b border-white/[0.06] flex items-center justify-between px-6 shrink-0 mb-8">
      <div className="flex items-center gap-3">
        <span className="w-0.5 h-5 bg-[#e10600]" />
        <span className="font-black tracking-[0.15em] uppercase text-sm">F1 Bugambra</span>
        <span className="w-px h-4 bg-white/10" />
        <span className="text-[10px] font-mono tracking-[0.3em] text-white/30 uppercase">{title}</span>
      </div>
      <div className="flex items-center gap-4">
        <span className="text-[10px] font-mono text-white/25 uppercase">{userData?.rol}</span>
        <span className="text-sm font-bold text-white/70">{userData?.nombre}</span>
        <button onClick={() => auth.signOut()} className="text-[10px] font-bold tracking-[0.3em] uppercase text-white/30 hover:text-[#e10600] transition-colors">Salir</button>
      </div>
    </header>
  );
}
