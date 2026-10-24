import { Fragment, useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { useSearchParams } from "react-router";
import { ChevronRight, Crown, Shield, Users } from "lucide-react";
import { useUsuarios } from "../hooks/useData";
import { PilotDetailModal } from "./PilotDetailModal";
import { Badge, Card, EmptyState } from "./ui";

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
  if (rating >= 90) return "border-danger/50 bg-danger-soft text-danger";
  if (rating >= 80) return "border-warn/50 bg-warn-soft text-warn";
  return "border-line bg-surface-3 text-ink-muted";
}

export function TeamsView({ validSplits, currentSplitId, onSelectSplit, currentSplit, getPilotPhoto, showEconomy = false }: TeamsViewProps) {
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
      <div className="flex flex-col gap-4 border-b border-line pb-5">
        <div>
          <p className="text-xs font-semibold text-ink-muted">Archivo de competición</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight text-ink md:text-3xl">Equipos por temporada</h2>
        </div>
        <div className="m-rail hide-scrollbar gap-2" role="group" aria-label="Temporadas">
          {validSplits.map(split => (
            <button
              key={split.id}
              onClick={() => onSelectSplit(split.id)}
              aria-pressed={currentSplitId === split.id}
              className={`fluent-press min-h-11 shrink-0 rounded-full px-4 text-sm font-semibold ${
                currentSplitId === split.id
                  ? "btn-primary-fluent bg-brand text-brand-ink shadow-fluent-1"
                  : "border border-line bg-surface/80 text-ink-2 hover:border-info/50 hover:bg-surface"
              }`}
            >
              {split.nombre}
            </button>
          ))}
        </div>
      </div>

      {isIndividual ? (
        <div className="space-y-4">
          <Card pad="lg" className="flex min-h-56 flex-col justify-between bg-[image:var(--grad-info)]">
            <div>
              <Badge>Temporada individual</Badge>
              <h3 className="mt-5 text-3xl font-semibold tracking-tight md:text-4xl">{currentSplit?.nombre}</h3>
              <p className="mt-3 max-w-sm text-sm leading-relaxed text-ink-muted">
                En esta etapa no existían escuderías permanentes. La clasificación complementaria se disputaba mediante parejas de pilotos.
              </p>
            </div>
            <span className="mt-8 text-sm font-semibold text-brand">Formato histórico por dúos</span>
          </Card>
          {(currentSplit?.duos || []).length > 0 && (
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
              {[...(currentSplit.duos || [])]
                .sort((a: any, b: any) => Number(b.puntos || 0) - Number(a.puntos || 0))
                .map((duo: any, index: number) => (
                  <Card key={duo.id} tone="muted" pad="sm">
                    <span className="text-xs text-ink-muted">Dúo {String(index + 1).padStart(2, "0")}</span>
                    <p className="mt-2 text-sm font-semibold leading-tight">{duo.nombre}</p>
                    <p className="mt-4 text-2xl font-semibold tabular-nums">{duo.puntos} <small className="text-xs font-normal text-ink-muted">pts</small></p>
                  </Card>
                ))}
            </div>
          )}
        </div>
      ) : equipos.length === 0 ? (
        <EmptyState icon={Shield} title="Sin escuderías en esta temporada" description="Cuando se inscriban equipos aparecerán aquí." />
      ) : (
        <>
          <div ref={gridRef} className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
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
                  className={`reveal fluent-press group border border-line bg-surface shadow-fluent-2 relative min-h-32 overflow-hidden rounded-card p-4 text-left text-ink md:min-h-40 md:p-5 ${
                    selected ? "border-brand/60 ring-1 ring-brand/40" : "hover:border-line-strong"
                  }`}
                >
                  <div className="absolute inset-x-0 top-0 h-1 origin-left scale-x-0 bg-brand transition-transform group-hover:scale-x-100 motion-reduce:transition-none" />
                  {team.logo_url && <img src={team.logo_url} alt="" className="pointer-events-none absolute -bottom-8 -right-6 h-36 w-36 object-contain opacity-[0.07]" />}
                  <div className="relative flex items-start justify-between gap-4">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-line bg-surface-2 p-1.5">
                        {team.logo_url
                          ? <img src={team.logo_url} alt={team.nombre} className="h-full w-full object-contain" />
                          : <Shield aria-hidden="true" className="h-6 w-6 text-ink-muted" />}
                      </div>
                      <div className="min-w-0">
                        <h3 className="truncate text-lg font-semibold tracking-tight">{team.nombre}</h3>
                        <span className="text-sm text-ink-muted">{pilots.length} pilotos</span>
                        {jeques.length > 0 && (
                          <span className="mt-1.5 flex min-w-0 flex-col gap-0.5">
                            {jeques.map((jeque, i) => (
                              <span key={i} className="flex min-w-0 items-center gap-1.5">
                                {jeque.foto_url
                                  ? <img src={jeque.foto_url} alt="" className="h-4 w-4 shrink-0 rounded-full object-cover" />
                                  : <Crown aria-hidden="true" className="h-3 w-3 shrink-0 text-warn" />}
                                <span className="truncate text-xs text-ink-muted">{jeque.nombre}</span>
                              </span>
                            ))}
                          </span>
                        )}
                        {(directoresPorEquipo[team.id] || []).map(director => (
                          <span key={director.uid} className="mt-1 flex min-w-0 items-center gap-1.5">
                            {director.foto_url ? <img src={director.foto_url} alt="" className="h-4 w-4 shrink-0 rounded-full object-cover" /> : <Crown aria-hidden="true" className="h-3 w-3 shrink-0 text-info" />}
                            <span className="truncate text-xs text-ink-muted">Director deportivo · {director.nombre}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                    <ChevronRight aria-hidden="true" className={`h-5 w-5 shrink-0 transition-transform motion-reduce:transition-none ${selected ? "rotate-90 text-brand" : "text-ink-muted"}`} />
                  </div>
                  <div className="relative mt-5 flex items-end justify-between border-t border-line pt-3">
                    <div>
                      <span className="block text-xs text-ink-muted">Constructores</span>
                      <strong className="text-xl font-semibold tabular-nums">{team.puntos_constructores || 0} <small className="text-xs font-normal text-ink-muted">pts</small></strong>
                    </div>
                    <div className="text-right">
                      <span className="block text-xs text-ink-muted">Media equipo</span>
                      <strong className="text-xl font-semibold tabular-nums">{average || "--"} <small className="text-xs font-normal text-ink-muted">OVR</small></strong>
                    </div>
                  </div>
                </button>

                {selectedTeam && index === finDeFila && (
                  <div className="col-span-full">
                    <Card pad="none" className="m-expand overflow-hidden border-brand/30">
                      <div className="flex flex-col justify-between gap-4 border-b border-line p-5 sm:flex-row sm:items-center">
                        <div className="flex items-center gap-3">
                          <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-line bg-surface-2 p-1.5">
                            {selectedTeam.logo_url
                              ? <img src={selectedTeam.logo_url} alt={selectedTeam.nombre} className="h-full w-full object-contain" />
                              : <Shield aria-hidden="true" className="h-6 w-6 text-ink-muted" />}
                          </div>
                          <div>
                            <span className="text-xs font-semibold text-brand">Alineación · {currentSplit.nombre}</span>
                            <h3 className="text-xl font-semibold tracking-tight">{selectedTeam.nombre}</h3>
                          </div>
                        </div>
                        <div className="flex gap-6">
                          <div><span className="block text-xs text-ink-muted">Pilotos</span><strong className="text-2xl font-semibold tabular-nums">{selectedPilots.length}</strong></div>
                          <div><span className="block text-xs text-ink-muted">Media</span><strong className="text-2xl font-semibold tabular-nums">{selectedAverage || "--"}</strong></div>
                        </div>
                      </div>
                      {selectedJeques.length > 0 && (
                        <div className="border-b border-line bg-surface-2/50 p-4 md:p-5">
                          <div className="mb-3 flex items-center gap-2">
                            <Crown aria-hidden="true" className="h-4 w-4 text-warn" />
                            <span className="text-sm font-semibold text-warn">Dirección de la escudería</span>
                          </div>
                          <div className="grid gap-3 sm:grid-cols-2">
                            {selectedJeques.map(jeque => {
                              const photo = jeque.foto_url || (jeque.pilotoId ? getPilotPhoto(jeque.pilotoId) : "");
                              return (
                                <div key={jeque.uid} className="flex items-center gap-3 rounded-lg border border-warn/30 bg-warn-soft/60 p-3">
                                  <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-warn/30 bg-warn-soft">
                                    {photo
                                      ? <img src={photo} alt={jeque.nombre} className="h-full w-full object-cover" />
                                      : <Crown aria-hidden="true" className="m-auto h-6 w-6 text-warn" />}
                                  </div>
                                  <div className="min-w-0">
                                    <span className="block text-xs text-ink-muted">Jeque</span>
                                    <p className="truncate text-sm font-semibold text-ink">{jeque.nombre}</p>
                                    {!jeque.foto_url && jeque.pilotoId && <span className="text-xs text-ink-muted">Foto del perfil asociado</span>}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                      {selectedDirectores.length > 0 && (
                        <div className="border-b border-line bg-surface-2/50 p-4 md:p-5">
                          <div className="mb-3 flex items-center gap-2">
                            <Crown aria-hidden="true" className="h-4 w-4 text-info" />
                            <span className="text-sm font-semibold text-info">Dirección deportiva</span>
                          </div>
                          <div className="grid gap-3 sm:grid-cols-2">
                            {selectedDirectores.map(director => (
                              <div key={director.uid} className="flex items-center gap-3 rounded-lg border border-info/30 bg-info-soft/60 p-3">
                                <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-info/30 bg-info-soft">
                                  {director.foto_url ? <img src={director.foto_url} alt={director.nombre} className="h-full w-full object-cover" /> : <Crown aria-hidden="true" className="m-auto h-6 w-6 text-info" />}
                                </div>
                                <div className="min-w-0">
                                  <span className="block text-xs text-ink-muted">Director deportivo</span>
                                  <p className="truncate text-sm font-semibold text-ink">{director.nombre}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      <div className="grid gap-px bg-line sm:grid-cols-2 xl:grid-cols-4">
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
                                className="m-row group flex min-w-0 items-center gap-3 bg-surface p-3 text-left transition-colors hover:bg-info/5 md:p-4"
                              >
                                <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-line bg-surface-2">
                                  {photo
                                    ? <img src={photo} alt="" className="h-full w-full object-cover" />
                                    : <div className="grid h-full w-full place-items-center text-sm font-semibold text-ink-muted">{pilot.nombre?.slice(0, 2).toUpperCase()}</div>}
                                </div>
                                <div className="min-w-0 flex-1">
                                  {pilot.rookie && <Badge tone="info" className="mb-0.5">Rookie</Badge>}
                                  <p className="truncate text-sm font-semibold">{pilot.nombre}</p>
                                  <span className="text-xs tabular-nums text-ink-muted">{pilot.puntos_piloto || 0} pts · Ver ficha</span>
                                </div>
                                <div className={`grid h-14 w-14 shrink-0 place-items-center rounded-lg border ${ratingAccent(rating)}`}>
                                  <div className="text-center"><strong className="block text-xl font-semibold leading-none tabular-nums">{rating}</strong><span className="text-[11px] font-semibold">OVR</span></div>
                                </div>
                                <ChevronRight aria-hidden="true" className="h-4 w-4 shrink-0 text-ink-muted transition-colors group-hover:text-brand" />
                              </button>
                            );
                          })}
                        {selectedPilots.length === 0 && (
                          <div className="bg-surface py-10 text-center text-sm text-ink-muted sm:col-span-2 xl:col-span-4">
                            <Users aria-hidden="true" className="mx-auto mb-2 h-5 w-5" /> Sin pilotos asignados
                          </div>
                        )}
                      </div>
                    </Card>
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
