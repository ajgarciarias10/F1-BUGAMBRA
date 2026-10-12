import { useEffect, useMemo, useState } from "react";
import { addDoc, collection, deleteDoc, doc, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "../services/firebase";
import { useAuth } from "../contexts/AuthContext";
import { useSplits } from "../hooks/useData";
import { SplitIntroGallery } from "./SplitIntroGallery";
import { getYoutubeEmbedUrl, getYoutubeThumbnailUrl, getYoutubeVideoId } from "../utils/youtube";
import { ArrowUpRight, Gauge, Loader2, MonitorPlay, Play, Plus, Radio, Trash2, Video } from "lucide-react";
import type { Circuito } from "../types";
import { buildRaceReport } from "../services/readModels";
import { FastestLapVideoCard } from "./NextRaceWidget";
import { Badge, Button, Card, EmptyState, StatusPill, buttonClass, cn } from "./ui";
import { useSingleFlight } from "../hooks/useSingleFlight";

const FOM_CHANNEL = {
  id: "tonicotitular",
  name: "Tonicotitular",
  label: "Cámara oficial Tonicotitular",
};

interface Interview {
  id: string;
  title: string;
  youtubeUrl: string;
  authorName: string;
  createdAt: string;
}

function InterviewsSection({ compact }: { compact: boolean }) {
  const { user, userData } = useAuth();
  const isAdmin = userData?.rol === "admin";
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [publishing, setPublishing] = useState(false);

  useEffect(() => onSnapshot(query(collection(db, "fom_interviews"), orderBy("createdAt", "desc")), snapshot => {
    setInterviews(snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as Interview[]);
  }), []);

  const validUrl = getYoutubeVideoId(url) !== "";

  const { run: runOnce } = useSingleFlight();
  const publish = async () => {
    return runOnce(async () => {
    if (!user || !userData || !title.trim() || !validUrl) return;
    setPublishing(true);
    try {
      await addDoc(collection(db, "fom_interviews"), {
        title: title.trim(),
        youtubeUrl: url.trim(),
        authorName: userData.nombre || "Admin",
        createdBy: user.uid,
        createdAt: new Date().toISOString(),
      });
      setTitle(""); setUrl("");
    } finally {
      setPublishing(false);
    }
    });
  };

  const remove = async (id: string) => {
    return runOnce(async () => {
    if (!isAdmin) return;
    await deleteDoc(doc(db, "fom_interviews", id));
    });
  };

  return (
    <Card as="section">
      <div className="flex items-center gap-2 mb-4">
        <Video className="w-4 h-4 text-brand" />
        <h2 className="text-lg font-bold text-ink">Entrevistas</h2>
      </div>

      {isAdmin && (
        <div className="m-card mb-4 flex flex-col gap-2 border border-line bg-surface-3 p-3 md:flex-row md:items-center">
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Título de la entrevista" maxLength={120}
            className="min-h-12 w-full flex-1 rounded-xl border border-line bg-surface-3 px-3 text-ink outline-none focus:border-brand md:min-h-0 md:min-w-40 md:rounded-none md:py-2 md:text-xs" />
          <input value={url} onChange={e => setUrl(e.target.value)} placeholder="URL de YouTube"
            className="min-h-12 w-full flex-1 rounded-xl border border-line bg-surface-3 px-3 text-ink outline-none focus:border-brand md:min-h-0 md:min-w-48 md:rounded-none md:py-2 md:text-xs" />
          <button onClick={publish} disabled={publishing || !title.trim() || !validUrl}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-brand px-4 text-sm font-bold text-brand-ink disabled:opacity-35 md:min-h-0 md:rounded-none md:py-2 md:text-xs md:font-black md:uppercase md:tracking-wider">
            {publishing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />} Añadir
          </button>
        </div>
      )}

      {interviews.length === 0 ? (
        <p className="py-3 text-center text-sm text-ink-muted">Todavía no hay entrevistas publicadas.</p>
      ) : (
        <div className={`grid gap-3 ${compact ? "" : "sm:grid-cols-2 xl:grid-cols-3"}`}>
          {interviews.map(item => (
            <article key={item.id} className="overflow-hidden rounded-lg border border-line bg-surface-2">
              {openId === item.id ? (
                <div className="aspect-video bg-surface">
                  <iframe src={getYoutubeEmbedUrl(item.youtubeUrl)} className="w-full h-full border-0" allowFullScreen
                    allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" title={item.title} />
                </div>
              ) : (
                <button onClick={() => setOpenId(item.id)} className="relative block w-full aspect-video bg-surface group">
                  <img src={getYoutubeThumbnailUrl(item.youtubeUrl)} alt="" loading="lazy" className="w-full h-full object-cover" />
                  <span className="absolute inset-0 grid place-items-center bg-ink/25 transition-colors group-hover:bg-ink/15">
                    <span className="grid h-12 w-12 place-items-center rounded-full bg-brand text-brand-ink"><Play aria-hidden="true" className="ml-0.5 h-5 w-5" fill="currentColor" /><span className="sr-only">Reproducir {item.title}</span></span>
                  </span>
                </button>
              )}
              <div className="p-3 flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-ink">{item.title}</p>
                  <p className="mt-0.5 text-xs text-ink-muted">{item.authorName}</p>
                </div>
                {isAdmin && (
                  <button onClick={() => remove(item.id)} className="shrink-0 text-ink-muted hover:text-danger transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </Card>
  );
}

export function FomLive({ compact = false }: { compact?: boolean }) {
  const domain = window.location.hostname || "localhost";
  const parent = domain === "localhost" ? "localhost" : domain;
  const { splits } = useSplits();
  // El directo de Twitch no se carga hasta que la persona lo pide.
  const [livePlaying, setLivePlaying] = useState(false);
  // Los tráilers de cada temporada son parte de la parrilla televisiva: aquí los
  // ve cualquiera que entre en TV, sin depender de en qué split esté mirando.
  const splitsConTrailer = (splits || []).filter((split: any) => split.id !== "global");

  return (
    <div className={compact ? "space-y-3" : "space-y-5"}>
      <Card as="section" pad="none" className="overflow-hidden" aria-labelledby="tv-live-title">
        <div className="flex flex-col justify-between gap-3 p-4 md:flex-row md:items-center md:p-6">
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-lg bg-brand text-brand-ink">
              <MonitorPlay aria-hidden="true" className="h-6 w-6" />
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-brand">F1 Bugambra TV</p>
              <h2 id="tv-live-title" className="text-xl font-bold text-ink md:text-2xl">Directo oficial</h2>
            </div>
          </div>
          <StatusPill tone="neutral" className="self-start md:self-auto">Señal de @{FOM_CHANNEL.id}</StatusPill>
        </div>

        <div className="border-y border-line bg-surface-3">
          <div className={`relative w-full ${compact ? "aspect-video" : "aspect-video md:min-h-[28rem]"}`}>
            {livePlaying ? (
              <iframe
                src={`https://player.twitch.tv/?channel=${FOM_CHANNEL.id}&parent=${parent}&autoplay=false`}
                title={FOM_CHANNEL.label}
                height="100%"
                width="100%"
                allowFullScreen
                className="absolute inset-0 h-full w-full border-0"
              />
            ) : (
              <div className="absolute inset-0 grid place-items-center p-4 text-center">
                <div>
                  <Radio aria-hidden="true" className="mx-auto h-8 w-8 text-ink-muted" />
                  <p className="mt-2 text-sm font-bold text-ink">{FOM_CHANNEL.label}</p>
                  <p className="mx-auto mt-1 max-w-xs text-xs text-ink-muted">El reproductor solo se carga cuando lo pides para ahorrar datos.</p>
                  <Button variant="primary" className="mt-4" onClick={() => setLivePlaying(true)}>
                    <Play aria-hidden="true" className="h-4 w-4" fill="currentColor" /> Reproducir directo
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-2 p-3 sm:grid-cols-3 md:p-4">
          <MiniLink href={`https://www.twitch.tv/${FOM_CHANNEL.id}`} icon={<Radio className="h-4 w-4" />} label="Abrir directo" />
          <MiniLink href={`https://www.twitch.tv/${FOM_CHANNEL.id}/videos`} icon={<Video className="h-4 w-4" />} label="Vídeos TV" />
          <MiniLink href={`https://www.twitch.tv/${FOM_CHANNEL.id}/clips`} icon={<MonitorPlay className="h-4 w-4" />} label="Clips" />
        </div>
      </Card>

      <SplitIntroGallery splits={splitsConTrailer} />

      <InterviewsSection compact={compact} />
    </div>
  );
}

function MiniLink({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={buttonClass({ variant: "secondary", block: true })}>
      {icon}
      {label}
      <ArrowUpRight aria-hidden="true" className="h-3.5 w-3.5 opacity-60" />
    </a>
  );
}

// ── TELEMETRÍA ────────────────────────────────────────────────────────────────

interface TelemetryViewProps {
  validSplits: any[];
  currentSplitId: string;
  onSelectSplit: (splitId: string) => void;
  currentSplit: any;
}

/**
 * Elige un circuito y muestra el vídeo de vuelta rápida (bajo demanda) y los datos de carrera
 * ya guardados. No inventa velocidad, sectores ni trazadas: si algo no está guardado, no se muestra.
 */
export function TelemetryView({ validSplits, currentSplitId, onSelectSplit, currentSplit }: TelemetryViewProps) {
  const circuitos: Circuito[] = useMemo(
    () => ([...(currentSplit?.circuitos || [])] as Circuito[]).sort((a, b) => (a.numero_carrera ?? 9999) - (b.numero_carrera ?? 9999)),
    [currentSplit],
  );
  const defaultId = useMemo(() => {
    const next = circuitos.find(c => !c.completado);
    const lastDone = [...circuitos].reverse().find(c => c.completado);
    return (next ?? lastDone ?? circuitos[0])?.id ?? "";
  }, [circuitos]);
  const [pickedId, setPickedId] = useState("");
  const selected = circuitos.find(c => c.id === pickedId) ?? circuitos.find(c => c.id === defaultId) ?? null;
  const report = useMemo(() => (selected ? buildRaceReport(selected, currentSplit?.roster ?? []) : null), [selected, currentSplit]);
  const ratingOf = (pilotId: string) => currentSplit?.roster?.find((p: any) => p.pilotoId === pilotId)?.rating_piloto;

  return (
    <div className="space-y-5">
      <div className="m-rail hide-scrollbar gap-2" role="group" aria-label="Temporada">
        {validSplits.map(split => (
          <button key={split.id} type="button" onClick={() => { onSelectSplit(split.id); setPickedId(""); }} aria-pressed={currentSplitId === split.id}
            className={cn("min-h-11 shrink-0 rounded-full border px-4 text-sm font-semibold transition-colors",
              currentSplitId === split.id ? "border-brand bg-brand text-brand-ink" : "border-line-strong bg-surface text-ink-2 hover:bg-surface-3")}>
            {split.nombre}
          </button>
        ))}
      </div>

      {circuitos.length === 0 || !selected || !report ? (
        <EmptyState icon={Gauge} title="Sin circuitos en esta temporada" description="Cuando el administrador cree el calendario podrás elegir un circuito aquí." />
      ) : (
        <>
          <div className="m-rail hide-scrollbar gap-2" role="group" aria-label="Circuito">
            {circuitos.map(c => (
              <button key={c.id} type="button" onClick={() => setPickedId(c.id)} aria-pressed={selected.id === c.id}
                className={cn("min-h-11 shrink-0 rounded-lg border px-3 text-sm font-semibold transition-colors",
                  selected.id === c.id ? "border-brand bg-brand-soft text-brand" : "border-line bg-surface text-ink-2 hover:bg-surface-3")}>
                {c.numero_carrera ? `${c.numero_carrera}. ` : ""}{c.nombre}
              </button>
            ))}
          </div>

          <FastestLapVideoCard circuito={selected} />

          <Card as="section" aria-labelledby="telemetry-race">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <h2 id="telemetry-race" className="text-lg font-bold text-ink">Datos de carrera · GP de {selected.nombre}</h2>
              <StatusPill tone={selected.completado ? "ok" : "info"}>{selected.completado ? "Disputada" : "Pendiente"}</StatusPill>
            </div>
            {!selected.completado || report.rows.length === 0 ? (
              <p className="rounded-lg border border-dashed border-line-strong bg-surface-2 p-4 text-sm text-ink-muted">
                {selected.completado ? "No hay resultados guardados para esta carrera." : "La carrera todavía no se ha disputado. Los datos aparecerán cuando el administrador registre los resultados."}
              </p>
            ) : (
              <ul className="divide-y divide-line rounded-lg border border-line">
                {report.rows.map(row => {
                  const delta = row.qualyPos !== null && row.racePos !== null ? row.qualyPos - row.racePos : null;
                  const ovr = ratingOf(row.pilotId);
                  return (
                    <li key={row.pilotId} className="flex items-center justify-between gap-3 px-3 py-2.5">
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold text-ink">{row.name}</span>
                        <span className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-ink-muted">
                          <span>Qualy {row.qualyPos ?? "—"}</span>
                          <span>· Carrera {row.status === "classified" ? row.racePos : "—"}</span>
                          {ovr !== undefined && <span>· OVR {ovr}</span>}
                        </span>
                      </span>
                      <span className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
                        {row.status === "dnf" && <Badge tone="danger">DNF</Badge>}
                        {row.status === "did_not_race" && <Badge tone="neutral">No corrió</Badge>}
                        {row.status === "unknown_position" && <Badge tone="warn">Posición desconocida</Badge>}
                        {row.fastestLap && <Badge tone="violet">Vuelta rápida</Badge>}
                        {delta !== null && delta !== 0 && <Badge tone={delta > 0 ? "ok" : "danger"}>{delta > 0 ? `+${delta}` : delta} pos.</Badge>}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
            <p className="mt-3 text-xs text-ink-muted">Solo se muestran datos guardados por la liga. No hay sectores, velocidades ni trazadas registradas.</p>
          </Card>
        </>
      )}
    </div>
  );
}
