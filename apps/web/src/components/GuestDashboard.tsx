import { useState, type ReactNode } from "react";
import { Link } from "react-router";
import { useSplits, useUsuarios } from "../hooks/useData";
import { Users, ChevronLeft, Award, Crown, Loader2 } from "lucide-react";
import { Badge, Card, EmptyState, buttonClass } from "./ui";
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
    <div className="min-h-[100dvh] text-ink px-3 pt-3 pb-tabbar md:p-8 font-sans safe-x">
      <div className="max-w-7xl mx-auto">
        <header className="safe-top mb-5 flex min-h-16 shrink-0 items-center justify-between gap-2 acrylic-bar rounded-2xl border px-3 md:-mx-8 md:-mt-8 md:mb-8 md:rounded-none md:border-x-0 md:border-t-0 md:px-6">
          <div className="flex min-w-0 items-center gap-2 md:gap-4">
            <Link
              to="/login"
              aria-label="Volver"
              className="-ml-1 grid h-11 w-11 shrink-0 place-items-center rounded-lg text-ink-muted transition-colors hover:bg-info/10 hover:text-ink"
            >
              <ChevronLeft aria-hidden="true" className="h-5 w-5" />
            </Link>
            <div className="btn-primary-fluent shrink-0 rounded-md bg-brand px-2.5 py-1 text-base font-semibold tracking-tight text-brand-ink md:px-3 md:text-lg">
              F1 BUGAMBRA
            </div>
            <div aria-hidden="true" className="hidden h-8 w-px bg-line sm:block"></div>
            {/* La etiqueta de modo invitado se cae en pantallas estrechas: el
                botón de iniciar sesión es lo que hace falta tener a mano. */}
            <div className="hidden flex-col sm:flex">
              <span className="text-xs text-ink-muted">
                Modo Público
              </span>
              <span className="text-sm font-semibold text-ink">
                Acceso de Invitado
              </span>
            </div>
          </div>
          <Link
            to="/login"
            className={buttonClass({ size: "sm" }) + " shrink-0"}
          >
            <span className="md:hidden">Entrar</span>
            <span className="hidden md:inline">Iniciar Sesión</span>
          </Link>
        </header>

        {/* Navigation Tabs */}
        <div role="tablist" aria-label="Secciones" className="mb-8 hidden flex-wrap gap-1 border-b border-line md:flex">
          {([
            { id: "tv",         label: "TV" },
            { id: "market",     label: "Deadline" },
            { id: "paddock",    label: "Paddock" },
            { id: "resultados", label: "Resultados" },
            { id: "album",      label: "Álbum de cromos" },
            { id: "acumulado",  label: "Ranking total" },
          ] as const).map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              role="tab"
              aria-selected={activeTab === tab.id}
              className={`relative min-h-11 cursor-pointer rounded-t-lg px-5 text-sm font-semibold transition-colors ${
                activeTab === tab.id
                  ? "bg-surface/70 text-ink"
                  : "text-ink-muted hover:bg-info/10 hover:text-ink"
              }`}
            >
              {tab.label}
              {activeTab === tab.id && (
                <div className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-brand" />
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
            <LoadingBlock>Cargando datos…</LoadingBlock>
          ) : (
            <Card as="section" pad="md">
              <TotalStandings splits={splits || []} getPilotPhoto={getPilotPhoto} />
            </Card>
          )
        )}
      </div>
    </div>
  );
}

function LoadingBlock({ children }: { children: ReactNode }) {
  return (
    <div role="status" className="flex items-center justify-center gap-3 rounded-card border border-line bg-surface-2/70 p-12 text-sm text-ink-muted">
      <Loader2 aria-hidden="true" className="h-4 w-4 motion-safe:animate-spin" />
      {children}
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
      <LoadingBlock>Cargando datos de temporada…</LoadingBlock>
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
      <EmptyState icon={Award} title="No hay temporadas disponibles" description="El álbum aparecerá cuando haya carreras completadas." />
    );
  }

  return (
    <div className="space-y-12">
      {/* Album Header */}
      <div className="rounded-card border border-line bg-surface-2/60 bg-[image:var(--grad-info)] px-4 py-8 text-center">
        <div className="mb-4 inline-flex items-center justify-center rounded-full border border-warn/30 bg-warn-soft p-3">
          <Award aria-hidden="true" className="h-8 w-8 text-warn" />
        </div>
        <h2 className="flex flex-wrap items-center justify-center gap-x-3 text-3xl font-semibold tracking-tight text-ink md:text-4xl">
          Álbum oficial <span className="text-brand">F1 Bugambra</span>
        </h2>
        <p className="mt-3 text-sm text-ink-muted">
          Colección oficial · {validSplits.length} Temporada
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
                <div aria-hidden="true" className="h-px flex-1 bg-line" />
                <Badge tone="warn" className="px-4 py-1.5 text-xs">Temporada Origins · Mundial individual</Badge>
                <div aria-hidden="true" className="h-px flex-1 bg-line" />
              </div>
              <Card as="div" tone="muted" className="border-warn/30 bg-warn-soft/50">
                <h3 className="mb-4 text-sm font-semibold text-warn">Clasificación final de Origins</h3>
                <div className="grid gap-2">
                  {originRanking.map((pilot, index) => (
                    <div key={pilot.pilotoId} className={`flex min-h-11 items-center justify-between gap-3 border-b border-line py-2 last:border-0 ${index < 3 ? "text-warn" : "text-ink-2"}`}>
                      <span className="min-w-0 truncate font-semibold"><span className="inline-block w-8 text-ink-muted">{String(index + 1).padStart(2, "0")}</span>{pilot.nombre}</span>
                      <span className="shrink-0 font-semibold tabular-nums">{pilot.puntos_piloto ?? 0} pts</span>
                    </div>
                  ))}
                </div>
              </Card>
            </section>
          );
        }

        return (
          <div key={split.id} className="space-y-6">
            {/* Cabecera de temporada */}
            <div className="flex items-center gap-4">
              <div aria-hidden="true" className="h-px flex-1 bg-line" />
              <Badge tone="brand" className="px-4 py-1.5 text-xs">
                Temporada principal · {split.nombre}
              </Badge>
              <div aria-hidden="true" className="h-px flex-1 bg-line" />
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
    <div className={`group relative overflow-hidden rounded-card border border-line bg-surface p-5 shadow-fluent-2 transition-colors ${
      isChampTeam ? "border-warn/60 ring-1 ring-warn/40" : "hover:border-line-strong"
    }`}>
      {/* Background Logo Watermark */}
      <div className="absolute -right-4 -bottom-4 w-40 h-40 opacity-[0.05] pointer-events-none">
        {equipo.logo_url ? (
          <img src={equipo.logo_url} alt="" className="w-full h-full object-contain grayscale" />
        ) : (
          <Users className="w-full h-full" />
        )}
      </div>

      {/* Team Header */}
      <div className="flex items-center gap-4 border-b border-line pb-4 mb-5 relative z-10">
        <div className="relative shrink-0">
          {equipo.logo_url ? (
            <div className="w-14 h-14 rounded-lg overflow-hidden border border-line-strong bg-surface-2 p-1 shadow-fluent-1">
              <img src={equipo.logo_url} alt={equipo.nombre} className="w-full h-full object-cover rounded-lg" />
            </div>
          ) : (
            <div className="w-14 h-14 rounded-lg bg-surface-2 border border-line-strong flex items-center justify-center font-semibold text-ink-muted shadow-fluent-1">
              {equipo.nombre.substring(0, 2).toUpperCase()}
            </div>
          )}
          {isChampTeam && (
            <span className="absolute -right-2 -top-2 grid h-6 w-6 place-items-center rounded-full border border-warn/40 bg-warn-soft text-warn" title="Campeón de constructores"><Crown aria-hidden="true" className="h-3.5 w-3.5" /><span className="sr-only">Campeón de constructores</span></span>
          )}
        </div>
        <div>
          <h3 className={`text-lg font-semibold tracking-tight ${isChampTeam ? "text-warn" : "text-ink"}`}>
            {equipo.nombre}
          </h3>
          <Badge>{equipo.pilotos?.length || 0} pilotos</Badge>
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
              className={`relative flex flex-col items-center overflow-hidden rounded-lg border p-3 text-center transition-colors ${
                isChamp
                  ? "border-warn/50 bg-warn-soft"
                  : "border-line bg-surface/60 hover:border-line-strong hover:bg-surface"
              }`}
            >
              <div className={`w-16 h-16 rounded-full overflow-hidden mb-3 relative shadow-fluent-1 bg-surface-2 z-10 ${
                isChamp ? "border-2 border-warn" : "border-2 border-line-strong"
              }`}>
                {fotoUrl ? (
                  <img src={fotoUrl} alt={piloto.nombre} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-ink-muted font-semibold">
                    {piloto.nombre.substring(0, 2).toUpperCase()}
                  </div>
                )}
                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-surface via-surface/70 to-transparent h-2/3 flex items-end justify-center pb-1">
                  <span className="text-[11px] font-semibold tabular-nums text-ink">
                    {piloto.rating_piloto ?? 70} OVR
                  </span>
                </div>
                {isChamp && (
                  <span className="absolute -right-1 -top-1 z-20 grid h-5 w-5 place-items-center rounded-full border border-warn/40 bg-warn-soft text-warn"><Crown aria-hidden="true" className="h-3 w-3" /><span className="sr-only">Campeón de pilotos</span></span>
                )}
              </div>

              <span className={`text-sm font-semibold line-clamp-1 w-full z-10 ${isChamp ? "text-warn" : "text-ink"}`}>
                {piloto.nombre}
              </span>
              <Badge tone="warn" className="z-10 mt-1.5 tabular-nums">
                {piloto.puntos_piloto || 0} pts
              </Badge>
            </div>
          );
        })}
        {(!equipo.pilotos || equipo.pilotos.length === 0) && (
          <div className="col-span-2 flex flex-col items-center justify-center rounded-lg border border-dashed border-line-strong bg-surface-2/60 py-6 text-sm text-ink-muted">
            <Users aria-hidden="true" className="mb-2 h-5 w-5 opacity-60" />
            Plazas disponibles
          </div>
        )}
      </div>
    </div>
  );
}
