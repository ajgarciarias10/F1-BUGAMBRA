import { useState } from "react";
import { Link } from "react-router";
import { useSplits, useUsuarios } from "../hooks/useData";
import { Users, ChevronLeft, Award } from "lucide-react";
import { TotalStandings } from "./TotalStandings";
import { RaceResultsView } from "./RaceResultsView";
import { FomLive } from "./FomLive";
import { MarketDeadlineView } from "./MarketDeadlineView";
import { PaddockForum } from "./PaddockForum";
import { MobileBottomTabs } from "./MobileBottomTabs";

export function GuestDashboard() {
  const { splits, loading } = useSplits();
  const { usuarios } = useUsuarios();
  const [activeTab, setActiveTab] = useState<"tv" | "market" | "paddock" | "resultados" | "album" | "acumulado">("tv");
  const [resultadosSplitId, setResultadosSplitId] = useState("");
  const resultadosSplits = (splits || [])
    .filter((s: any) => s.id !== "global" && s.tipo !== "individual")
    .sort((a: any, b: any) => Number(a.orden ?? 999) - Number(b.orden ?? 999));
  const resolvedResultadosSplitId = resultadosSplits.some((s: any) => s.id === resultadosSplitId)
    ? resultadosSplitId
    : (resultadosSplits.find((s: any) => s.activo)?.id || resultadosSplits[resultadosSplits.length - 1]?.id || "");
  const resultadosSplit = resultadosSplits.find((s: any) => s.id === resolvedResultadosSplitId);

  const getPilotPhoto = (pilotId: string) => {
    const u = (usuarios || []).find((u: any) => u.uid === pilotId || u.piloto_id === pilotId);
    if (u?.foto_url) return u.foto_url;
    for (const s of splits || []) {
      const p = (s.roster || []).find((r: any) => r.pilotoId === pilotId);
      if (p?.foto_url) return p.foto_url;
    }
    return "";
  };
  
  return (
    <div className="dark min-h-[100dvh] bg-[#0E0E10] text-gray-100 px-3 pt-3 pb-tabbar md:p-8 font-sans safe-x">
      <div className="max-w-7xl mx-auto">
        <header className="safe-top mb-5 flex min-h-16 shrink-0 items-center justify-between gap-2 rounded-3xl border border-white/10 bg-black/55 px-3 shadow-2xl shadow-black/30 backdrop-blur-xl md:-mx-8 md:-mt-8 md:mb-8 md:rounded-none md:px-6">
          <div className="flex min-w-0 items-center gap-2 md:gap-4">
            <Link
              to="/login"
              aria-label="Volver"
              className="-ml-1 grid h-11 w-11 shrink-0 place-items-center rounded-lg text-white/50 transition-colors hover:bg-white/5 hover:text-white"
            >
              <ChevronLeft className="w-5 h-5" />
            </Link>
            <div className="shrink-0 bg-[#e10600] px-2.5 py-1 text-base font-black italic tracking-tighter text-white md:px-3 md:text-xl">
              F1 BUGAMBRA
            </div>
            <div className="hidden h-8 w-px bg-white/20 sm:block"></div>
            {/* La etiqueta de modo invitado se cae en pantallas estrechas: el
                botón de iniciar sesión es lo que hace falta tener a mano. */}
            <div className="hidden flex-col sm:flex">
              <span className="text-[10px] uppercase tracking-widest text-white/50">
                Modo Público
              </span>
              <span className="text-sm font-bold uppercase">
                Acceso de Invitado
              </span>
            </div>
          </div>
          <Link
            to="/login"
            className="flex min-h-11 shrink-0 items-center rounded-full border border-white/10 px-3 text-[12px] font-bold text-white/70 transition-colors hover:bg-white/5 hover:text-white md:rounded-lg md:px-4 md:text-xs md:uppercase md:tracking-widest"
          >
            <span className="md:hidden">Entrar</span>
            <span className="hidden md:inline">Iniciar Sesión</span>
          </Link>
        </header>

        {/* Navigation Tabs */}
        <div className="hidden md:flex flex-wrap border-b border-white/10 mb-8 gap-2">
          {([
            { id: "tv",         label: "TV" },
            { id: "market",     label: "Deadline" },
            { id: "paddock",    label: "Paddock" },
            { id: "resultados", label: "Resultados" },
            { id: "album",      label: "🎴 Álbum de Cromos" },
            { id: "acumulado",  label: "🏆 Ranking Total" },
          ] as const).map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-5 py-3 font-mono font-bold text-xs uppercase tracking-wider transition-all relative cursor-pointer ${
                activeTab === tab.id
                  ? "text-white bg-white/5"
                  : "text-white/40 hover:text-white/80 hover:bg-white/[0.02]"
              }`}
            >
              {tab.label}
              {activeTab === tab.id && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#e10600]" />
              )}
            </button>
          ))}
        </div>
        <MobileBottomTabs
          tabs={[
            { id: "tv", label: "TV" },
            { id: "market", label: "Deadline" },
            { id: "paddock", label: "Paddock" },
            { id: "resultados", label: "Resultados" },
            { id: "album", label: "Álbum" },
            { id: "acumulado", label: "Ranking" },
          ]}
          activeTab={activeTab}
          onTab={(id) => setActiveTab(id as "tv" | "market" | "paddock" | "resultados" | "album" | "acumulado")}
        />

        {activeTab === "tv" && <FomLive />}
        {activeTab === "market" && <MarketDeadlineView readOnly />}
        {activeTab === "paddock" && <PaddockForum readOnly />}
        {activeTab === "resultados" && (
          <RaceResultsView
            key={resolvedResultadosSplitId}
            validSplits={resultadosSplits}
            currentSplitId={resolvedResultadosSplitId}
            onSelectSplit={(id: string) => setResultadosSplitId(id)}
            currentSplit={resultadosSplit}
            getPilotPhoto={getPilotPhoto}
            darkMode
          />
        )}
        {activeTab === "album" && (
          <StickerAlbum splits={splits || []} usuarios={usuarios || []} loading={loading} />
        )}
        {activeTab === "acumulado" && (
          loading ? (
            <div className="text-white/50 font-mono flex items-center justify-center p-12 bg-black/40 rounded-xl border border-white/5">
              Cargando datos...
            </div>
          ) : (
            <div className="bg-zinc-950/80 border border-white/10 rounded-2xl p-6 shadow-2xl">
              <TotalStandings splits={splits || []} getPilotPhoto={getPilotPhoto} />
            </div>
          )
        )}
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
      ((s.id === "origins" && s.roster?.length > 0) || s.equipos?.length > 0) &&
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
        const isOrigins = split.id === "origins" || split.tipo === "individual";

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

        if (isOrigins) {
          const originRanking = [...roster].sort((a, b) => Number(b.puntos_piloto ?? 0) - Number(a.puntos_piloto ?? 0));
          return (
            <section key={split.id} className="space-y-5">
              <div className="flex items-center gap-4">
                <div className="h-px flex-1 bg-white/10" />
                <span className="text-xs font-mono font-bold uppercase tracking-[0.3em] text-amber-300 bg-amber-500/10 border border-amber-500/20 px-4 py-1.5 rounded-full">Temporada Origins · Mundial individual</span>
                <div className="h-px flex-1 bg-white/10" />
              </div>
              <div className="border border-amber-500/20 bg-amber-500/[0.04] rounded-2xl p-5">
                <p className="text-[10px] font-mono uppercase tracking-[0.3em] text-amber-300 mb-4">Clasificación final de Origins</p>
                <div className="grid gap-2">
                  {originRanking.map((pilot, index) => (
                    <div key={pilot.pilotoId} className={`flex items-center justify-between border-b border-white/5 last:border-0 py-3 ${index < 3 ? "text-amber-200" : "text-white/70"}`}>
                      <span className="font-black uppercase"><span className="inline-block w-8 font-mono text-white/30">{String(index + 1).padStart(2, "0")}</span>{pilot.nombre}</span>
                      <span className="font-mono font-black">{pilot.puntos_piloto ?? 0} PTS</span>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          );
        }

        return (
          <div key={split.id} className="space-y-6">
            {/* Cabecera de temporada */}
            <div className="flex items-center gap-4">
              <div className="h-px flex-1 bg-white/10" />
              <span className="text-xs font-mono font-bold uppercase tracking-[0.3em] text-[#e10600] bg-[#e10600]/10 border border-[#e10600]/20 px-4 py-1.5 rounded-full">
                Temporada principal · {split.nombre}
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
                    {piloto.rating_piloto ?? 70} OVR
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
