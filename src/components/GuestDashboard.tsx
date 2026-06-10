import { useState } from "react";
import { Link } from "react-router";
import { useSplits, useUsuarios } from "../hooks/useData";
import { MonitorPlay, Users, ChevronLeft, Award } from "lucide-react";

export function GuestDashboard() {
  const { splits, loading } = useSplits();
  const { usuarios } = useUsuarios();
  const [activeTab, setActiveTab] = useState<"tv" | "album">("tv");
  
  return (
    <div className="min-h-screen bg-[#0E0E10] text-gray-100 p-8 font-sans">
      <div className="max-w-7xl mx-auto">
        <header className="h-16 border-b border-white/10 bg-black/40 flex items-center justify-between px-6 shrink-0 -mx-8 -mt-8 mb-8">
          <div className="flex items-center gap-4">
            <Link
              to="/login"
              className="text-white/50 hover:text-white transition-colors p-2 hover:bg-white/5 rounded-lg"
            >
              <ChevronLeft className="w-5 h-5" />
            </Link>
            <div className="bg-[#e10600] px-3 py-1 font-black text-white italic tracking-tighter text-xl">
              F1 BUGAMBRA
            </div>
            <div className="h-8 w-[1px] bg-white/20"></div>
            <div className="flex flex-col">
              <span className="text-[10px] uppercase tracking-widest text-white/50">
                Modo Público
              </span>
              <span className="text-sm font-bold uppercase">
                Acceso de Invitado
              </span>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <Link
              to="/login"
              className="text-xs uppercase font-bold tracking-widest text-white/50 hover:text-white transition-colors border border-white/10 px-4 py-2 rounded-lg hover:bg-white/5"
            >
              Iniciar Sesión
            </Link>
          </div>
        </header>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap border-b border-white/10 mb-8 gap-2">
          <button
            onClick={() => setActiveTab("tv")}
            className={`px-5 py-3 font-mono font-bold text-xs uppercase tracking-wider transition-all relative cursor-pointer ${
              activeTab === "tv"
                ? "text-white bg-white/5"
                : "text-white/40 hover:text-white/80 hover:bg-white/[0.02]"
            }`}
          >
            📺 TV en Directo
            {activeTab === "tv" && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#e10600]" />
            )}
          </button>
          <button
            onClick={() => setActiveTab("album")}
            className={`px-5 py-3 font-mono font-bold text-xs uppercase tracking-wider transition-all relative cursor-pointer ${
              activeTab === "album"
                ? "text-white bg-white/5"
                : "text-white/40 hover:text-white/80 hover:bg-white/[0.02]"
            }`}
          >
            🎴 Álbum de Cromos
            {activeTab === "album" && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#e10600]" />
            )}
          </button>
        </div>

        {activeTab === "tv" ? (
          <LiveTV />
        ) : (
          <StickerAlbum
            splits={splits || []}
            usuarios={usuarios || []}
            loading={loading}
          />
        )}
      </div>
    </div>
  );
}

function LiveTV() {
  const currentDomain = window.location.hostname;

  const channels = [
    { id: "tonicotitular", name: "Piloto Toni", platform: "Twitch" },
    { id: "fabiml_204", name: "Piloto Fabi", platform: "Twitch" },
  ];

  return (
    <div className="bg-zinc-950/80 border border-white/10 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
      <div className="absolute top-0 right-0 w-64 h-64 bg-[#e10600]/10 rounded-full blur-[80px] pointer-events-none" />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 relative z-10">
        <div className="flex items-center gap-3">
          <div className="bg-[#e10600]/20 p-2 rounded-lg border border-[#e10600]/30">
            <MonitorPlay className="w-6 h-6 text-[#e10600] animate-pulse" />
          </div>
          <div>
            <h2 className="text-2xl font-black italic tracking-tighter uppercase text-white">
              Transmisión en Directo
            </h2>
            <p className="text-[10px] font-mono uppercase tracking-widest text-white/50">
              Cámaras On-Board de Pilotos
            </p>
          </div>
        </div>
      </div>

      {/* Grid de Directos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 relative z-10 mb-8">
        {channels.map((ch) => (
          <div
            key={ch.id}
            className="bg-black/50 border border-white/10 rounded-xl overflow-hidden flex flex-col group shadow-lg"
          >
            <div className="bg-zinc-900 border-b border-white/5 px-4 py-2.5 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <span className="font-bold text-xs text-white uppercase tracking-tight">
                  {ch.name}
                </span>
              </div>
              <span className="text-[9px] font-mono text-white/40 uppercase bg-black/40 px-2 py-0.5 rounded">
                @{ch.id}
              </span>
            </div>
            <div className="aspect-video w-full bg-black relative">
              <iframe
                src={`https://player.twitch.tv/?channel=${ch.id}&parent=${
                  currentDomain === "localhost" ? "localhost" : currentDomain
                }`}
                height="100%"
                width="100%"
                allowFullScreen
                className="absolute inset-0 w-full h-full border-0"
              ></iframe>
            </div>
          </div>
        ))}
      </div>

      {/* Historial de VODs Grid */}
      <div className="border-t border-white/10 pt-6 relative z-10">
        <h3 className="text-sm font-bold uppercase text-white tracking-widest mb-4 flex items-center gap-2">
          <MonitorPlay className="w-4 h-4 text-purple-400" />
          Acceso a Repeticiones y VODs
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {channels.map((ch) => (
            <a
              key={`vod-${ch.id}`}
              href={`https://www.twitch.tv/${ch.id}/videos`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex justify-between items-center bg-black/40 hover:bg-zinc-800 border border-white/5 hover:border-purple-500/50 p-4 rounded-xl transition-all group"
            >
              <div>
                <span className="text-white font-bold text-sm uppercase tracking-tight block group-hover:text-purple-400 transition-colors">
                  Historial de {ch.name}
                </span>
                <span className="text-white/40 text-[10px] font-mono uppercase tracking-widest">
                  Twitch Videos
                </span>
              </div>
              <div className="px-4 py-2 bg-purple-500/20 text-purple-300 text-[10px] font-black uppercase tracking-widest rounded-lg group-hover:bg-purple-500 group-hover:text-white transition-colors">
                Ver Videos
              </div>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}

export function StickerAlbum({
  splits,
  usuarios,
  loading,
}: {
  splits: any[];
  usuarios: any[];
  loading: boolean;
}) {
  if (loading) {
    return (
      <div className="text-white/50 font-mono flex items-center justify-center p-12 bg-black/40 rounded-xl border border-white/5">
        Cargando datos de temporada...
      </div>
    );
  }

  const validSplits = splits.filter(
    (s) =>
      s.id !== "global" &&
      s.equipos?.length > 0 &&
      s.circuitos?.some((c: any) => c.completado)
  );

  if (validSplits.length === 0) {
    return (
      <div className="text-white/50 font-mono flex items-center justify-center p-12 bg-black/40 rounded-xl border border-white/5">
        No hay temporadas disponibles.
      </div>
    );
  }

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Album Header */}
      <div className="text-center bg-gradient-to-r from-transparent via-white/5 to-transparent py-8 rounded-2xl border-y border-white/5">
        <div className="inline-flex items-center justify-center p-3 bg-amber-500/10 border border-amber-500/20 rounded-full mb-4">
          <Award className="w-8 h-8 text-amber-500" />
        </div>
        <h2 className="text-4xl font-black italic tracking-tighter uppercase text-white drop-shadow-lg flex items-center justify-center gap-3">
          Álbum Oficial <span className="text-[#e10600]">F1 BUGAMBRA</span>
        </h2>
        <p className="text-xs font-mono text-white/50 mt-3 uppercase tracking-[0.3em]">
          Colección Oficial • {validSplits.length} Temporada
          {validSplits.length > 1 ? "s" : ""}
        </p>
      </div>

      {/* Un bloque por cada split/temporada */}
      {validSplits.map((split) => {
        const roster: any[] = split.roster || [];

        // Campeón de pilotos: máximo puntos_piloto en el roster
        let champPilotId = "";
        let maxPilotPts = -1;
        roster.forEach((p: any) => {
          if ((p.puntos_piloto || 0) > maxPilotPts) {
            maxPilotPts = p.puntos_piloto || 0;
            champPilotId = p.pilotoId;
          }
        });
        if (maxPilotPts <= 0) champPilotId = "";

        // Campeón de constructores: máximo puntos_constructores
        let champTeamId = "";
        let maxTeamPts = -1;
        (split.equipos || []).forEach((eq: any) => {
          if ((eq.puntos_constructores || 0) > maxTeamPts) {
            maxTeamPts = eq.puntos_constructores || 0;
            champTeamId = eq.id;
          }
        });
        if (maxTeamPts <= 0) champTeamId = "";

        return (
          <div key={split.id} className="space-y-6">
            {/* Cabecera de temporada */}
            <div className="flex items-center gap-4">
              <div className="h-px flex-1 bg-white/10" />
              <span className="text-xs font-mono font-bold uppercase tracking-[0.3em] text-[#e10600] bg-[#e10600]/10 border border-[#e10600]/20 px-4 py-1.5 rounded-full">
                {split.nombre}
              </span>
              <div className="h-px flex-1 bg-white/10" />
            </div>

            {/* Grid de equipos */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {split.equipos.map((equipo: any) => {
                const equipoPilotos = roster
                  .filter((p: any) => p.equipoId === equipo.id)
                  .map((p: any) => {
                    const usuario = usuarios.find(
                      (u: any) => u.uid === p.pilotoId || u.piloto_id === p.pilotoId
                    );
                    return {
                      ...p,
                      id: p.pilotoId,
                      foto_url: usuario?.foto_url || p.foto_url || "",
                    };
                  });
                return (
                  <EquipoCard
                    key={equipo.id}
                    equipo={{ ...equipo, pilotos: equipoPilotos }}
                    usuarios={usuarios}
                    champPilotId={champPilotId}
                    champTeamId={champTeamId}
                  />
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function EquipoCard({
  equipo,
  usuarios,
  champPilotId,
  champTeamId,
}: {
  equipo: any;
  usuarios: any[];
  champPilotId: string;
  champTeamId: string;
}) {
  const isChampTeam = champTeamId && equipo.id === champTeamId;

  return (
    <div className={`bg-gradient-to-br from-zinc-900 to-black rounded-2xl p-5 shadow-2xl relative overflow-hidden group transition-all ${
      isChampTeam
        ? "border-2 border-amber-400/60 shadow-amber-500/10"
        : "border border-white/10 hover:border-white/20"
    }`}>
      {/* Background Logo Watermark */}
      <div className="absolute -right-4 -bottom-4 w-40 h-40 opacity-[0.03] pointer-events-none group-hover:opacity-10 transition-opacity duration-500 mix-blend-overlay">
        {equipo.logo_url ? (
          <img src={equipo.logo_url} alt="" className="w-full h-full object-contain filter grayscale" />
        ) : (
          <Users className="w-full h-full" />
        )}
      </div>

      {/* Team Header */}
      <div className="flex items-center gap-4 border-b border-white/10 pb-4 mb-5 relative z-10">
        <div className="relative shrink-0">
          {equipo.logo_url ? (
            <div className="w-14 h-14 rounded-xl overflow-hidden border border-white/20 bg-white/5 p-1 shadow-lg shadow-black">
              <img src={equipo.logo_url} alt={equipo.nombre} className="w-full h-full object-cover rounded-lg" />
            </div>
          ) : (
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-zinc-800 to-zinc-900 border border-white/20 flex items-center justify-center font-bold font-mono text-white/50 shadow-lg shadow-black">
              {equipo.nombre.substring(0, 2).toUpperCase()}
            </div>
          )}
          {isChampTeam && (
            <span className="absolute -top-2.5 -right-2.5 text-base leading-none drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]">👑</span>
          )}
        </div>
        <div>
          <h3 className={`text-lg font-black uppercase italic tracking-tight transition-colors ${isChampTeam ? "text-amber-400" : "text-white group-hover:text-[#e10600]"}`}>
            {equipo.nombre}
          </h3>
          <span className="text-[9px] font-mono text-white/40 uppercase tracking-widest bg-white/5 px-1.5 py-0.5 rounded border border-white/5">
            {equipo.pilotos?.length || 0} Pilotos
          </span>
        </div>
      </div>

      {/* Pilots Grid */}
      <div className="grid grid-cols-2 gap-3 relative z-10">
        {(equipo.pilotos || []).map((piloto: any) => {
          const isChamp = champPilotId && piloto.id === champPilotId;
          const matchedUser = usuarios.find(
            (u: any) => u.uid === piloto.id || (u.piloto_id && u.piloto_id === piloto.id)
          );
          const fotoUrl = matchedUser?.foto_url || "";

          return (
            <div
              key={piloto.id}
              className={`border rounded-xl p-3 flex flex-col items-center text-center transition-all cursor-pointer shadow-inner relative overflow-hidden group/card ${
                isChamp
                  ? "bg-gradient-to-b from-amber-500/15 to-amber-500/5 border-amber-400/50"
                  : "bg-gradient-to-b from-white/5 to-transparent border-white/10 hover:bg-white/10 hover:border-amber-500/50"
              }`}
            >
              {isChamp && (
                <div className="absolute inset-0 bg-gradient-to-b from-amber-500/10 to-transparent pointer-events-none" />
              )}

              <div className={`w-16 h-16 rounded-full overflow-hidden mb-3 relative shadow-md bg-zinc-900 z-10 ${
                isChamp ? "border-2 border-amber-400" : "border-2 border-white/20"
              }`}>
                {fotoUrl ? (
                  <img src={fotoUrl} alt={piloto.nombre} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white/30 font-bold">
                    {piloto.nombre.substring(0, 2).toUpperCase()}
                  </div>
                )}
                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent h-2/3 flex items-end justify-center pb-1">
                  <span className="text-[9px] font-black font-mono text-white drop-shadow-[0_2px_2px_rgba(0,0,0,1)] tracking-wider">
                    {piloto.rating_piloto || 70} OVR
                  </span>
                </div>
                {isChamp && (
                  <span className="absolute -top-1 -right-1 text-sm leading-none drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)] z-20">👑</span>
                )}
              </div>

              <span className={`font-bold text-xs uppercase tracking-tight line-clamp-1 w-full z-10 ${isChamp ? "text-amber-300" : "text-white/90"}`}>
                {piloto.nombre}
              </span>
              <span className={`text-[9px] font-mono mt-1.5 px-2 py-0.5 rounded border font-bold z-10 ${
                isChamp
                  ? "text-amber-300 bg-amber-500/20 border-amber-400/40"
                  : "text-amber-400 bg-amber-500/10 border-amber-500/20"
              }`}>
                {piloto.puntos_piloto || 0} PTS
              </span>
            </div>
          );
        })}
        {(!equipo.pilotos || equipo.pilotos.length === 0) && (
          <div className="col-span-2 flex flex-col items-center justify-center py-6 text-[10px] text-white/30 font-mono uppercase border border-dashed border-white/10 rounded-xl bg-black/20">
            <Users className="w-5 h-5 mb-2 opacity-50" />
            Plazas Disponibles
          </div>
        )}
      </div>
    </div>
  );
}