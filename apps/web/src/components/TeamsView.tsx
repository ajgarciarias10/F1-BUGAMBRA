import { Fragment, useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { useSearchParams } from "react-router";
import { ChevronRight, Crown, Shield, Users } from "lucide-react";
import { useUsuarios } from "../hooks/useData";
import { PilotDetailModal } from "./PilotDetailModal";

interface TeamsViewProps {
  validSplits: any[];
  currentSplitId: string;
  onSelectSplit: (splitId: string) => void;
  currentSplit: any;
  getPilotPhoto: (pilotId: string) => string;
  darkMode?: boolean;
  /** Precios y valoración en la ficha del piloto. Fuera de la web pública. */
  showEconomy?: boolean;
}

/**
 * Número de columnas que está pintando una rejilla CSS ahora mismo.
 *
 * Hace falta para insertar el desplegable al final de la fila del equipo
 * pulsado. Se lee del estilo calculado en vez de duplicar aquí los puntos de
 * ruptura de las clases, que se desincronizarían al primer retoque.
 */
function useColumnCount(ref: RefObject<HTMLElement | null>) {
  const [columns, setColumns] = useState(1);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const medir = () => {
      const template = getComputedStyle(element).gridTemplateColumns;
      setColumns(template ? template.split(" ").filter(Boolean).length : 1);
    };
    medir();
    const observer = new ResizeObserver(medir);
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref]);

  return columns;
}

function ratingAccent(rating: number): string {
  if (rating >= 90) return "border-danger/70 bg-danger/15 text-danger";
  if (rating >= 80) return "border-warn/60 bg-warn/15 text-warn";
  if (rating >= 70) return "border-line bg-surface-3 text-ink-muted";
  return "border-line bg-surface-3 text-ink-muted";
}

export function TeamsView({ validSplits, currentSplitId, onSelectSplit, currentSplit, getPilotPhoto, darkMode = false, showEconomy = false }: TeamsViewProps) {
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const { usuarios } = useUsuarios();
  const [searchParams, setSearchParams] = useSearchParams();

  // La ficha abierta vive en la URL, igual que la pestaña y la temporada: recargar o
  // compartir el enlace lleva al mismo piloto en vez de a la portada.
  const pilotoParam = searchParams.get("piloto") || "";
  const abrirPiloto = (pilotoId: string) => setSearchParams(previous => {
    const next = new URLSearchParams(previous);
    next.set("piloto", pilotoId);
    return next;
  });
  const cerrarPiloto = () => setSearchParams(previous => {
    const next = new URLSearchParams(previous);
    next.delete("piloto");
    return next;
  });

  // El jeque se asigna a la escudería, no al split: los ids de equipo se mantienen entre
  // bloques, así que el mismo mapa sirve para cualquier split del archivo.
  const jequesPorEquipo = useMemo(() => {
    const result: Record<string, Array<{ uid: string; nombre: string; foto_url?: string; pilotoId?: string }>> = {};
    for (const usuario of usuarios) {
      if (usuario.rol !== "jeque" || !usuario.escuderia_id) continue;
      (result[usuario.escuderia_id] ??= []).push({ uid: usuario.uid, nombre: usuario.nombre, foto_url: usuario.foto_url, pilotoId: usuario.piloto_id || undefined });
    }
    return result;
  }, [usuarios]);

  const directoresPorEquipo = useMemo(() => {
    const result: Record<string, Array<{ uid: string; nombre: string; foto_url?: string }>> = {};
    for (const usuario of usuarios) {
      if (usuario.rol !== "director_deportivo" || !usuario.escuderia_id) continue;
      (result[usuario.escuderia_id] ??= []).push({ uid: usuario.uid, nombre: usuario.nombre, foto_url: usuario.foto_url });
    }
    return result;
  }, [usuarios]);

  useEffect(() => {
    setSelectedTeamId("");
  }, [currentSplitId]);

  const pilotsByTeam = useMemo(() => {
    const result: Record<string, any[]> = {};
    for (const pilot of currentSplit?.roster || []) {
      if (pilot.participa_hasta != null) continue;
      if (!pilot.equipoId || pilot.equipoId === "agente_libre" || pilot.equipoId === "individual") continue;
      (result[pilot.equipoId] ??= []).push(pilot);
    }
    return result;
  }, [currentSplit]);

  const gridRef = useRef<HTMLDivElement>(null);
  const columnas = useColumnCount(gridRef);

  const equipos = currentSplit?.equipos || [];
  const selectedTeam = equipos.find((team: any) => team.id === selectedTeamId);

  // El desplegable ocupa el ancho completo, así que va detrás de la última
  // tarjeta de la fila del equipo pulsado: si se colara justo detrás de la
  // tarjeta dejaría un hueco en el resto de la fila. En móvil, con una sola
  // columna, ese final de fila es la propia tarjeta.
  const indiceSeleccionado = equipos.findIndex((team: any) => team.id === selectedTeamId);
  const finDeFila = indiceSeleccionado < 0
    ? -1
    : Math.min((Math.floor(indiceSeleccionado / columnas) + 1) * columnas, equipos.length) - 1;
  const selectedJeques = selectedTeam ? jequesPorEquipo[selectedTeam.id] || [] : [];
  const selectedDirectores = selectedTeam ? directoresPorEquipo[selectedTeam.id] || [] : [];
  const selectedPilots = selectedTeam ? pilotsByTeam[selectedTeam.id] || [] : [];
  // Se busca en todo el plantel, no solo en el equipo desplegado: un enlace compartido
  // debe abrir la ficha aunque quien lo reciba no tenga esa alineación abierta.
  const pilotoAbierto = pilotoParam
    ? (currentSplit?.roster || []).find((pilot: any) => pilot.pilotoId === pilotoParam)
    : null;
  const equipoDelPilotoAbierto = pilotoAbierto
    ? equipos.find((team: any) => team.id === pilotoAbierto.equipoId) || null
    : null;

  const selectedAverage = selectedPilots.length
    ? Math.round(selectedPilots.reduce((sum, pilot) => sum + (Number(pilot.rating_piloto) > 0 ? Number(pilot.rating_piloto) : 70), 0) / selectedPilots.length)
    : 0;
  const isIndividual = currentSplit?.tipo === "individual" || (currentSplit?.equipos || []).length === 0;

  return (
    <div className="space-y-7">
      <div className={`flex flex-col gap-4 border-b border-line pb-5 ${darkMode ? "border-line" : ""}`}>
        <div>
          <p className={`text-[11px] md:text-[11px] md:font-mono md:uppercase md:tracking-[0.08em] ${darkMode ? "text-ink-muted" : "text-ink-muted"}`}>Archivo de competición</p>
          <h2 className={`mt-1 text-xl md:text-3xl font-black uppercase tracking-[-0.03em] md:tracking-[-0.04em] ${darkMode ? "text-ink" : "text-ink"}`}>Equipos por temporada</h2>
        </div>
        <div className="m-rail hide-scrollbar gap-2 md:gap-0 md:border md:border-line md:self-start md:max-w-full">
          {validSplits.map(split => (
            <button
              key={split.id}
              onClick={() => onSelectSplit(split.id)}
              className={`min-h-11 shrink-0 rounded-full md:rounded-none px-4 text-[12px] font-bold md:py-3 md:text-xs md:font-black md:uppercase md:tracking-[0.08em] transition-colors ${
                currentSplitId === split.id
                  ? "bg-brand text-brand-ink"
                   : darkMode ? "bg-surface-2 text-ink-2 hover:bg-surface-2 hover:text-ink" : "bg-surface-2 text-ink-2 hover:text-ink"
              }`}
            >
              {split.nombre}
            </button>
          ))}
        </div>
      </div>

      {isIndividual ? (
        <div className="space-y-4">
          <div className="grid lg:grid-cols-[0.75fr_1.25fr] border border-line bg-surface text-ink overflow-hidden">
            <div className="p-6 md:p-8 flex flex-col justify-between min-h-56 bg-brand-soft">
              <div>
                <span className="inline-flex border border-line-strong bg-surface-2 px-3 py-1 text-[11px] font-mono uppercase tracking-[0.08em] text-ink-muted">Temporada individual</span>
                <h3 className="mt-5 text-4xl font-black uppercase tracking-[-0.05em]">{currentSplit?.nombre}</h3>
                <p className="mt-3 max-w-sm text-sm leading-relaxed text-ink-muted">
                  En esta etapa no existían escuderías permanentes. La clasificación complementaria se disputaba mediante parejas de pilotos.
                </p>
              </div>
              <span className="mt-8 text-xs font-mono uppercase tracking-[0.08em] text-brand">Formato histórico por dúos</span>
            </div>
          </div>
          {(currentSplit?.duos || []).length > 0 && (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-2 lg:grid-cols-5">
              {[...(currentSplit.duos || [])]
                .sort((a: any, b: any) => Number(b.puntos || 0) - Number(a.puntos || 0))
                .map((duo: any, index: number) => (
                  <div key={duo.id} className="m-card border border-line bg-surface-3 p-4 text-ink">
                    <span className="text-[11px] font-mono uppercase tracking-[0.08em] opacity-30">Dúo {String(index + 1).padStart(2, "0")}</span>
                    <p className="mt-2 font-black uppercase text-sm leading-tight">{duo.nombre}</p>
                    <p className="mt-4 text-2xl font-black tabular-nums">{duo.puntos} <small className="text-[11px] opacity-35">PTS</small></p>
                  </div>
                ))}
            </div>
          )}
        </div>
      ) : (
        <>
          <div ref={gridRef} className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {equipos.map((team: any, index: number) => {
              const pilots = pilotsByTeam[team.id] || [];
              const average = pilots.length
                ? Math.round(pilots.reduce((sum, pilot) => sum + (Number(pilot.rating_piloto) > 0 ? Number(pilot.rating_piloto) : 70), 0) / pilots.length)
                : 0;
              const selected = team.id === selectedTeamId;
              const jeques = jequesPorEquipo[team.id] || [];
              return (
                <Fragment key={team.id}>
                <button
                  onClick={() => setSelectedTeamId(selected ? "" : team.id)}
                  aria-expanded={selected}
                  className={`m-card group relative min-h-32 md:min-h-40 overflow-hidden border p-4 md:p-5 text-left transition-all active:scale-[0.99] ${
                    selected
                      ? "border-brand bg-surface text-ink shadow-card"
                       : darkMode ? "border-line bg-surface text-ink hover:-translate-y-0.5 hover:border-brand/50" : "border-line bg-surface-3 text-ink hover:-translate-y-0.5 hover:border-brand/50"
                  }`}
                >
                  <div className="absolute inset-x-0 top-0 h-1 bg-brand scale-x-0 origin-left transition-transform group-hover:scale-x-100" />
                  {team.logo_url && <img src={team.logo_url} alt="" className="absolute -right-6 -bottom-8 w-36 h-36 object-contain opacity-[0.06]" />}
                  <div className="relative flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-12 h-12 shrink-0 border border-current/10 bg-surface-2 p-1.5 flex items-center justify-center">
                        {team.logo_url
                          ? <img src={team.logo_url} alt={team.nombre} className="w-full h-full object-contain" />
                          : <Shield className="w-6 h-6 opacity-25" />}
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-lg font-black uppercase tracking-[-0.03em] truncate">{team.nombre}</h3>
                        <span className="text-[12px] opacity-50 md:font-mono md:text-[11px] md:uppercase md:tracking-[0.08em]">{pilots.length} pilotos</span>
                        {jeques.length > 0 && (
                          <span className="mt-1.5 flex flex-col gap-0.5 min-w-0">
                            {jeques.map((jeque, i) => (
                              <span key={i} className="flex items-center gap-1.5 min-w-0">
                                {jeque.foto_url
                                  ? <img src={jeque.foto_url} alt="" className="w-4 h-4 shrink-0 object-cover" />
                                  : <Crown className="w-3 h-3 shrink-0 opacity-40" />}
                                <span className="truncate text-[12px] opacity-60 md:font-mono md:text-[11px] md:uppercase md:tracking-[0.08em]">{jeque.nombre}</span>
                              </span>
                            ))}
                          </span>
                        )}
                        {(directoresPorEquipo[team.id] || []).map(director => (
                          <span key={director.uid} className="mt-1 flex items-center gap-1.5 min-w-0">
                            {director.foto_url ? <img src={director.foto_url} alt="" className="h-4 w-4 shrink-0 rounded-full object-cover" /> : <Crown className="h-3 w-3 shrink-0 text-info/60" />}
                            <span className="truncate text-[12px] opacity-60 md:font-mono md:text-[11px] md:uppercase md:tracking-[0.08em]">Director deportivo · {director.nombre}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                    <ChevronRight className={`w-5 h-5 shrink-0 transition-transform ${selected ? "rotate-90 text-brand" : "opacity-25"}`} />
                  </div>
                  <div className="relative mt-5 flex items-end justify-between border-t border-current/10 pt-3">
                    <div>
                      <span className="block text-[11px] opacity-45 md:font-mono md:text-[11px] md:uppercase md:tracking-[0.08em]">Constructores</span>
                      <strong className="text-xl tabular-nums">{team.puntos_constructores || 0} <small className="text-[11px] opacity-40">PTS</small></strong>
                    </div>
                    <div className="text-right">
                      <span className="block text-[11px] opacity-45 md:font-mono md:text-[11px] md:uppercase md:tracking-[0.08em]">Media equipo</span>
                      <strong className="text-xl tabular-nums">{average || "--"} <small className="text-[11px] opacity-40">OVR</small></strong>
                    </div>
                  </div>
                </button>

                {selectedTeam && index === finDeFila && (
                  <div className="col-span-full">
                    <div className="m-card m-expand border border-brand/35 bg-surface text-ink shadow-card">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 border-b border-line">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 border border-line bg-surface-2 p-1.5 flex items-center justify-center">
                            {selectedTeam.logo_url
                              ? <img src={selectedTeam.logo_url} alt={selectedTeam.nombre} className="w-full h-full object-contain" />
                              : <Shield className="w-6 h-6 text-ink-muted" />}
                          </div>
                          <div>
                            <span className="text-[11px] font-mono uppercase tracking-[0.08em] text-brand">Alineación · {currentSplit.nombre}</span>
                            <h3 className="text-xl font-black uppercase tracking-[-0.03em]">{selectedTeam.nombre}</h3>
                          </div>
                        </div>
                        <div className="flex gap-6">
                          <div><span className="block text-[11px] uppercase tracking-[0.08em] text-ink-muted">Pilotos</span><strong className="text-2xl">{selectedPilots.length}</strong></div>
                          <div><span className="block text-[11px] uppercase tracking-[0.08em] text-ink-muted">Media</span><strong className="text-2xl">{selectedAverage || "--"}</strong></div>
                        </div>
                      </div>
                      {selectedJeques.length > 0 && (
                        <div className="border-b border-line bg-bg p-4 md:p-5">
                          <div className="mb-3 flex items-center gap-2">
                            <Crown className="h-4 w-4 text-warn" />
                            <span className="text-[11px] font-black uppercase tracking-[0.08em] text-warn/70">Dirección de la escudería</span>
                          </div>
                          <div className="grid gap-3 sm:grid-cols-2">
                            {selectedJeques.map(jeque => {
                              const photo = jeque.foto_url || (jeque.pilotoId ? getPilotPhoto(jeque.pilotoId) : "");
                              return (
                                <div key={jeque.uid} className="flex items-center gap-3 border border-warn/15 bg-warn/4 p-3">
                                  <div className="h-14 w-14 shrink-0 overflow-hidden border border-warn/20 bg-warn/10">
                                    {photo
                                      ? <img src={photo} alt={jeque.nombre} className="h-full w-full object-cover" />
                                      : <Crown className="m-auto h-6 w-6 text-warn/45" />}
                                  </div>
                                  <div className="min-w-0">
                                    <span className="block text-[11px] font-mono uppercase tracking-[0.08em] text-warn/45">Jeque</span>
                                    <p className="truncate text-sm font-black uppercase text-ink">{jeque.nombre}</p>
                                    {!jeque.foto_url && jeque.pilotoId && <span className="text-[11px] text-ink-muted">Foto del perfil asociado</span>}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                      {selectedDirectores.length > 0 && (
                        <div className="border-b border-line bg-bg p-4 md:p-5">
                          <div className="mb-3 flex items-center gap-2">
                            <Crown className="h-4 w-4 text-info" />
                            <span className="text-[11px] font-black uppercase tracking-[0.08em] text-info/70">Dirección deportiva</span>
                          </div>
                          <div className="grid gap-3 sm:grid-cols-2">
                            {selectedDirectores.map(director => (
                              <div key={director.uid} className="flex items-center gap-3 border border-info/15 bg-info/4 p-3">
                                <div className="h-14 w-14 shrink-0 overflow-hidden border border-info/20 bg-info/10">
                                  {director.foto_url ? <img src={director.foto_url} alt={director.nombre} className="h-full w-full object-cover" /> : <Crown className="m-auto h-6 w-6 text-info/45" />}
                                </div>
                                <div className="min-w-0">
                                  <span className="block text-[11px] font-mono uppercase tracking-[0.08em] text-info/45">Director deportivo</span>
                                  <p className="truncate text-sm font-black uppercase text-ink">{director.nombre}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      <div className="grid gap-px bg-surface-2 sm:grid-cols-2 xl:grid-cols-4">
                        {selectedPilots
                          .slice()
                          .sort((a, b) => Number(b.rating_piloto || 0) - Number(a.rating_piloto || 0))
                          .map(pilot => {
                            const photo = getPilotPhoto(pilot.pilotoId);
                            const rating = Number(pilot.rating_piloto) > 0 ? Number(pilot.rating_piloto) : 70;
                            return (
                              <button
                                key={pilot.pilotoId}
                                type="button"
                                onClick={() => abrirPiloto(pilot.pilotoId)}
                                aria-haspopup="dialog"
                                aria-label={`Ver la ficha de ${pilot.nombre}`}
                                className="m-row group flex min-w-0 items-center gap-3 bg-surface p-3 text-left transition-colors hover:bg-surface active:scale-[0.99] md:p-4"
                              >
                                <div className="w-14 h-14 shrink-0 overflow-hidden bg-surface-2 border border-line">
                                  {photo
                                    ? <img src={photo} alt="" className="w-full h-full object-cover" />
                                    : <div className="w-full h-full grid place-items-center text-sm font-black text-ink-muted">{pilot.nombre?.slice(0, 2).toUpperCase()}</div>}
                                </div>
                                <div className="min-w-0 flex-1">
                                  {pilot.rookie && <span className="text-[11px] font-black uppercase tracking-[0.08em] text-info">Rookie</span>}
                                  <p className="font-black uppercase truncate text-sm">{pilot.nombre}</p>
                                  <span className="text-[11px] font-mono text-ink-muted">{pilot.puntos_piloto || 0} PTS · Ver ficha</span>
                                </div>
                                <div className={`w-14 h-14 shrink-0 border grid place-items-center ${ratingAccent(rating)}`}>
                                  <div className="text-center"><strong className="block text-xl leading-none tabular-nums">{rating}</strong><span className="text-[11px] font-black tracking-[0.08em]">OVR</span></div>
                                </div>
                                <ChevronRight className="w-4 h-4 shrink-0 text-ink-muted transition-colors group-hover:text-brand" />
                              </button>
                            );
                          })}
                        {selectedPilots.length === 0 && (
                          <div className="sm:col-span-2 xl:col-span-4 bg-surface py-10 text-center text-ink-muted text-xs font-mono uppercase tracking-[0.08em]">
                            <Users className="w-5 h-5 mx-auto mb-2" /> Sin pilotos asignados
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
                </Fragment>
              );
            })}
          </div>

        </>
      )}

      {pilotoAbierto && (
        <PilotDetailModal
          pilot={pilotoAbierto}
          team={equipoDelPilotoAbierto}
          split={currentSplit}
          getPilotPhoto={getPilotPhoto}
          showEconomy={showEconomy}
          onClose={cerrarPiloto}
        />
      )}
    </div>
  );
}
