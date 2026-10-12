import { useState, useEffect, useMemo } from "react";
import { Calendar, Clock, Play, Video } from "lucide-react";
import { fastestLapVideoOf } from "../services/readModels";
import { Card, Button, StatusPill, cn } from "./ui";

interface CircuitConfig {
  id: string;
  nombre: string;
  completado: boolean;
  fecha?: string;
  hora?: string;
  hotlap_url?: string;
  [key: string]: any;
}

interface NextRaceWidgetProps {
  currentSplit: {
    nombre: string;
    circuitos?: CircuitConfig[];
  } | null;
}

export function NextRaceWidget({ currentSplit }: NextRaceWidgetProps) {
  const nextCircuit = useMemo(() => {
    if (!currentSplit?.circuitos?.length) return null;
    const pending = currentSplit.circuitos.filter(c => !c.completado);
    if (pending.length > 0) {
      const now = new Date();
      let best = pending[0];
      let minDiff = Infinity;
      for (const c of pending) {
        if (c.fecha) {
          const d = new Date(`${c.fecha}T${c.hora || "00:00"}:00`);
          if (!isNaN(d.getTime())) {
            const diff = Math.abs(d.getTime() - now.getTime());
            if (diff < minDiff) { minDiff = diff; best = c; }
          }
        }
      }
      return { ...best, status: "pending" as const };
    }
    const last = currentSplit.circuitos[currentSplit.circuitos.length - 1];
    return last ? { ...last, status: "completed" as const } : null;
  }, [currentSplit]);

  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0, isOver: false });

  useEffect(() => {
    if (!nextCircuit?.fecha || nextCircuit.status === "completed") return;
    const target = new Date(`${nextCircuit.fecha}T${nextCircuit.hora || "00:00"}:00`).getTime();
    const tick = () => {
      const diff = target - Date.now();
      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, isOver: true });
      } else {
        setTimeLeft({
          days: Math.floor(diff / 86400000),
          hours: Math.floor((diff % 86400000) / 3600000),
          minutes: Math.floor((diff % 3600000) / 60000),
          seconds: Math.floor((diff % 60000) / 1000),
          isOver: false,
        });
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [nextCircuit]);

  if (!nextCircuit) {
    return (
      <div className="border border-line p-6 text-center text-ink-muted font-mono text-xs uppercase tracking-[0.08em]">
        Sin circuitos programados
      </div>
    );
  }

  const isCompleted = nextCircuit.status === "completed";
  const hasDate = !!nextCircuit.fecha;

  const dateLabel = hasDate
    ? new Date(nextCircuit.fecha!).toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
    : null;

  return (
    <div className="space-y-px">
      {/* ── MAIN CARD ── */}
      <div className="m-card border border-line bg-surface-2">
        <div className="grid lg:grid-cols-[1fr_auto] gap-0">

          {/* LEFT — circuit info */}
          <div className="p-4 md:p-6 lg:p-8 border-b lg:border-b-0 lg:border-r border-line">
            <p className="mb-2 text-[11px] font-bold text-brand md:mb-3 md:font-mono md:text-[11px] md:uppercase md:tracking-[0.08em]">
              {isCompleted ? "Última carrera" : "Próxima carrera"} · {currentSplit?.nombre}
            </p>

            <h2 className="mb-4 text-xl leading-tight font-black uppercase tracking-tight text-ink md:mb-6 md:text-3xl md:leading-none">
              GP DE {nextCircuit.nombre.toUpperCase()}
            </h2>

            <div className="space-y-2.5">
              {dateLabel && (
                <div className="flex items-center gap-2.5 text-[13px] text-ink-muted md:font-mono md:text-xs md:text-ink-muted">
                  <Calendar className="w-3.5 h-3.5 text-brand shrink-0" />
                  <span className="capitalize">{dateLabel}</span>
                </div>
              )}
              {nextCircuit.hora && (
                <div className="flex items-center gap-2.5 text-[13px] text-ink-muted md:font-mono md:text-xs md:text-ink-muted">
                  <Clock className="w-3.5 h-3.5 text-brand shrink-0" />
                  <span>{nextCircuit.hora} h · Hora local del paddock</span>
                </div>
              )}
              {!hasDate && (
                <div className="flex items-center gap-2 text-xs font-mono text-ink-muted italic">
                  <Clock className="w-3 h-3 shrink-0" />
                  <span>Fecha pendiente de confirmación</span>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT — countdown */}
          <div className="p-4 md:p-6 lg:p-8 flex flex-col justify-center">
            {isCompleted ? (
              <div className="text-center">
                <p className="text-[11px] font-mono tracking-[0.08em] uppercase text-ink-muted mb-1">Estado</p>
                <p className="text-xs font-black uppercase tracking-wider text-ok">Completado</p>
              </div>
            ) : !hasDate ? (
              <div className="text-center">
                <p className="text-[11px] font-mono tracking-[0.08em] uppercase text-ink-muted mb-1">Cuenta atrás</p>
                <p className="text-xs font-mono text-ink-muted">—</p>
              </div>
            ) : timeLeft.isOver ? (
              <div className="text-center">
                <p className="text-[11px] font-mono tracking-[0.08em] uppercase text-brand mb-1">En curso</p>
                <p className="text-xs font-black uppercase tracking-wider text-ink animate-pulse">GP en juego</p>
              </div>
            ) : (
              <div>
                <p className="text-[11px] font-mono tracking-[0.08em] uppercase text-ink-muted mb-4 text-center lg:text-left">Cuenta atrás</p>
                <div className="grid grid-cols-4 gap-2 text-center">
                  {[
                    { val: timeLeft.days, label: "Días" },
                    { val: timeLeft.hours, label: "Horas" },
                    { val: timeLeft.minutes, label: "Min" },
                    { val: timeLeft.seconds, label: "Seg" },
                  ].map(({ val, label }) => (
                    <div key={label} className="rounded-xl border border-line bg-surface-3 px-1 py-3 md:rounded-none">
                      <div className="text-xl font-black text-ink tabular-nums leading-none">{String(val).padStart(2, "0")}</div>
                      <div className="mt-1 text-[11px] text-ink-muted md:font-mono md:text-[11px] md:uppercase md:tracking-widest md:text-ink-muted">{label}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── VÍDEO: el reproductor solo se carga tras pulsar «Reproducir» ── */}
      <FastestLapVideoCard circuito={nextCircuit} className="mt-2 md:mt-0" />
    </div>
  );
}

/**
 * Vídeo de vuelta rápida publicado por el admin para un circuito.
 * Muestra miniatura y botón explícito; el iframe no existe hasta que se pulsa «Reproducir».
 * Sin vídeo guarda un estado «pendiente de publicación» y no inventa nada.
 */
export function FastestLapVideoCard({ circuito, className }: { circuito: { nombre: string; hotlap_url?: string }; className?: string }) {
  const video = fastestLapVideoOf(circuito);
  const [playing, setPlaying] = useState(false);
  // Al cambiar de circuito se descarta el reproductor anterior.
  useEffect(() => { setPlaying(false); }, [circuito.hotlap_url, circuito.nombre]);

  return (
    <Card as="section" pad="none" className={cn("overflow-hidden", className)} aria-label={`Vuelta rápida · ${circuito.nombre}`}>
      <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
        <span className="flex min-w-0 items-center gap-2 text-sm font-bold text-ink">
          <Video aria-hidden="true" className="h-4 w-4 shrink-0 text-brand" />
          <span className="truncate">Vuelta rápida · GP de {circuito.nombre}</span>
        </span>
        <StatusPill tone={video.status === "available" ? "ok" : "neutral"}>{video.status === "available" ? "Publicado" : "Pendiente"}</StatusPill>
      </div>
      <div className="relative aspect-video w-full bg-surface-3">
        {video.status === "pending" || !video.embedUrl ? (
          <div className="absolute inset-0 grid place-items-center p-4 text-center">
            <div>
              <Video aria-hidden="true" className="mx-auto h-8 w-8 text-ink-muted" />
              <p className="mt-2 text-sm font-bold text-ink">Vídeo pendiente de publicación</p>
              <p className="mt-1 text-xs text-ink-muted">El administrador lo publica antes de la carrera.</p>
            </div>
          </div>
        ) : playing ? (
          <iframe
            className="absolute inset-0 h-full w-full border-0"
            src={video.embedUrl}
            title={`Vuelta rápida ${circuito.nombre}`}
            allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <>
            {video.thumbnailUrl && <img src={video.thumbnailUrl} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />}
            <div className="absolute inset-0 grid place-items-center bg-ink/30">
              <Button variant="primary" onClick={() => setPlaying(true)} aria-label={`Reproducir vuelta rápida de ${circuito.nombre}`}>
                <Play aria-hidden="true" className="h-4 w-4" fill="currentColor" /> Reproducir vuelta rápida
              </Button>
            </div>
          </>
        )}
      </div>
    </Card>
  );
}
