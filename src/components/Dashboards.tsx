import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { SharedDashboardView } from "./SharedDashboard";
import { ProfileView } from "./ProfileView";
import { auth } from "../services/firebase";
import { SuggestionsView } from "./SuggestionsView";
import { useLocation, useNavigate } from "react-router";

export function UserHeader({ title }: { title: string }) {
  const { userData } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  return (
    <header className="h-16 border-b border-white/10 bg-black/40 flex items-center justify-between px-6 shrink-0 -mx-8 -mt-8 mb-8">
      <div className="flex items-center gap-4">
        <div className="bg-[#e10600] px-3 py-1 font-black text-white italic tracking-tighter text-xl">F1 BUGAMBRA</div>
        <div className="h-8 w-[1px] bg-white/20"></div>
        <div className="flex flex-col">
          <span className="text-[10px] uppercase tracking-widest text-white/50">Season 2026</span>
          <span className="text-sm font-bold uppercase">{title}</span>
        </div>
      </div>
      <div className="flex items-center gap-6">
        <div className="flex flex-col items-end">
          <span className="text-[10px] uppercase text-[#e10600] font-bold tracking-widest">{userData?.rol} SESSION</span>
          <span className="text-sm font-medium">{userData?.nombre}</span>
        </div>
        <div className="flex items-center gap-3">
          <div
            role="button"
            onClick={() => {
              // Navigate to same path with query ?tab=profile to signal dashboards to open profile tab
              const params = new URLSearchParams(location.search);
              params.set("tab", "profile");
              navigate(`${location.pathname}?${params.toString()}`);
            }}
            className="cursor-pointer flex items-center gap-2"
            title="Abrir Mi Perfil"
          >
            {userData?.foto_url ? (
              <img 
                src={userData.foto_url} 
                alt={userData.nombre} 
                referrerPolicy="no-referrer"
                className="w-10 h-10 rounded-full border border-[#e10600] object-cover shadow-[0_0_15px_rgba(225,6,0,0.3)]"
              />
            ) : (
              <div className="w-10 h-10 rounded-full border border-[#e10600] bg-gradient-to-tr from-zinc-800 to-zinc-700 flex items-center justify-center font-bold text-white shadow-[0_0_15px_rgba(225,6,0,0.3)]">
                {userData?.nombre?.substring(0, 2).toUpperCase() || 'FX'}
              </div>
            )}
          </div>
          <button 
            onClick={() => auth.signOut()}
            className="ml-2 text-[10px] uppercase tracking-widest font-bold text-white/50 hover:text-white transition-colors"
          >
            Salir
          </button>
        </div>
        </div>
    </header>
  );
}

export function JequeDashboard() {
  const { userData } = useAuth();
  const [activeTab, setActiveTab] = useState<"championship" | "profile" | "suggestions">("championship");
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tab = params.get("tab");
    if (tab === "profile") setActiveTab("profile");
  }, [location.search]);

  const getHeaderTitle = () => {
    switch (activeTab) {
      case "championship": return "Dashboard del Jeque";
      case "profile": return "Mi Perfil de Jeque";
      case "suggestions": return "Buzón de Mejoras Paddock";
      default: return "Jeque";
    }
  };

  return (
    <div className="min-h-screen bg-[#0E0E10] text-gray-100 p-8 font-sans">
      <div className="max-w-7xl mx-auto">
        <UserHeader title={getHeaderTitle()} />
        
        {/* Navigation Tabs */}
        <div className="flex flex-wrap border-b border-white/10 mb-8 gap-2">
          <button
            onClick={() => setActiveTab("championship")}
            className={`px-5 py-3 font-mono font-bold text-xs uppercase tracking-wider transition-all relative cursor-pointer ${
              activeTab === "championship"
                ? "text-white bg-white/5"
                : "text-white/40 hover:text-white/80 hover:bg-white/[0.02]"
            }`}
          >
            🏁 Campeonato y Escudería
            {activeTab === "championship" && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#e10600]" />
            )}
          </button>
          <button
            onClick={() => setActiveTab("profile")}
            className={`px-5 py-3 font-mono font-bold text-xs uppercase tracking-wider transition-all relative cursor-pointer ${
              activeTab === "profile"
                ? "text-white bg-white/5"
                : "text-white/40 hover:text-white/80 hover:bg-white/[0.02]"
            }`}
          >
            👤 Mi Perfil
            {activeTab === "profile" && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#e10600]" />
            )}
          </button>
          <button
            onClick={() => setActiveTab("suggestions")}
            className={`px-5 py-3 font-mono font-bold text-xs uppercase tracking-wider transition-all relative cursor-pointer ${
              activeTab === "suggestions"
                ? "text-white bg-white/5 animate-pulse"
                : "text-white/40 hover:text-white/80 hover:bg-white/[0.02]"
            }`}
          >
            💡 Buzón de Mejoras
            {activeTab === "suggestions" && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#e10600]" />
            )}
          </button>
        </div>

        {activeTab === "championship" ? (
          <SharedDashboardView canViewBudget={true} escuderiaId={userData?.escuderia_id} />
        ) : activeTab === "profile" ? (
          <ProfileView />
        ) : (
          <SuggestionsView isAdmin={false} />
        )}
      </div>
    </div>
  );
}

export function PilotoDashboard() {
  const { userData } = useAuth();
  const [activeTab, setActiveTab] = useState<"championship" | "profile" | "suggestions">("championship");
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tab = params.get("tab");
    if (tab === "profile") setActiveTab("profile");
  }, [location.search]);

  const getHeaderTitle = () => {
    switch (activeTab) {
      case "championship": return "Dashboard de Piloto";
      case "profile": return "Mi Perfil de Piloto";
      case "suggestions": return "Buzón de Mejoras Paddock";
      default: return "Piloto";
    }
  };

  return (
    <div className="min-h-screen bg-[#0E0E10] text-gray-100 p-8 font-sans">
      <div className="max-w-7xl mx-auto">
        <UserHeader title={getHeaderTitle()} />
        
        {/* Navigation Tabs */}
        <div className="flex flex-wrap border-b border-white/10 mb-8 gap-2">
          <button
            onClick={() => setActiveTab("championship")}
            className={`px-5 py-3 font-mono font-bold text-xs uppercase tracking-wider transition-all relative cursor-pointer ${
              activeTab === "championship"
                ? "text-white bg-white/5"
                : "text-white/40 hover:text-white/80 hover:bg-white/[0.02]"
            }`}
          >
            🏁 Campeonato y Escudería
            {activeTab === "championship" && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#e10600]" />
            )}
          </button>
          <button
            onClick={() => setActiveTab("profile")}
            className={`px-5 py-3 font-mono font-bold text-xs uppercase tracking-wider transition-all relative cursor-pointer ${
              activeTab === "profile"
                ? "text-white bg-white/5"
                : "text-white/40 hover:text-white/80 hover:bg-white/[0.02]"
            }`}
          >
            👤 Mi Perfil
            {activeTab === "profile" && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#e10600]" />
            )}
          </button>
          <button
            onClick={() => setActiveTab("suggestions")}
            className={`px-5 py-3 font-mono font-bold text-xs uppercase tracking-wider transition-all relative cursor-pointer ${
              activeTab === "suggestions"
                ? "text-white bg-white/5 animate-pulse"
                : "text-white/40 hover:text-white/80 hover:bg-white/[0.02]"
            }`}
          >
            💡 Buzón de Mejoras
            {activeTab === "suggestions" && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#e10600]" />
            )}
          </button>
        </div>

        {activeTab === "championship" ? (
          <SharedDashboardView canViewBudget={false} escuderiaId={userData?.escuderia_id} />
        ) : activeTab === "profile" ? (
          <ProfileView />
        ) : (
          <SuggestionsView isAdmin={false} />
        )}
      </div>
    </div>
  );
}
