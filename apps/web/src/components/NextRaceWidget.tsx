import { useState, useEffect, useMemo } from "react";
import { Calendar, Clock } from "lucide-react";

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

function extractYoutubeId(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtu.be")) return u.pathname.slice(1).split("?")[0];
    return u.searchParams.get("v");
  } catch {
    return null;
  }
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
      <div className="border border-white/[0.06] p-6 text-center text-white/20 font-mono text-[10px] uppercase tracking-[0.3em]">
        Sin circuitos programados
      </div>
    );
  }

  const isCompleted = nextCircuit.status === "completed";
  const hasDate = !!nextCircuit.fecha;
  const videoId = nextCircuit.hotlap_url ? extractYoutubeId(nextCircuit.hotlap_url) : null;

  const dateLabel = hasDate
    ? new Date(nextCircuit.fecha!).toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
    : null;

  return (
    <div className="space-y-px">
      {/* ── MAIN CARD ── */}
      <div className="border border-white/[0.08] bg-white/[0.02]">
        <div className="grid lg:grid-cols-[1fr_auto] gap-0">

          {/* LEFT — circuit info */}
          <div className="p-6 lg:p-8 border-b lg:border-b-0 lg:border-r border-white/[0.06]">
            <p className="text-[9px] font-mono tracking-[0.4em] uppercase text-[#e10600] mb-3">
              {isCompleted ? "Última carrera" : "Próxima carrera"} · {currentSplit?.nombre}
            </p>

            <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-white leading-none mb-6">
              GP DE {nextCircuit.nombre.toUpperCase()}
            </h2>

            <div className="space-y-2.5">
              {dateLabel && (
                <div className="flex items-center gap-2.5 text-xs font-mono text-white/50">
                  <Calendar className="w-3.5 h-3.5 text-[#e10600] shrink-0" />
                  <span className="capitalize">{dateLabel}</span>
                </div>
              )}
              {nextCircuit.hora && (
                <div className="flex items-center gap-2.5 text-xs font-mono text-white/50">
                  <Clock className="w-3.5 h-3.5 text-[#e10600] shrink-0" />
                  <span>{nextCircuit.hora} h · Hora local del paddock</span>
                </div>
              )}
              {!hasDate && (
                <div className="flex items-center gap-2 text-[10px] font-mono text-white/25 italic">
                  <Clock className="w-3 h-3 shrink-0" />
                  <span>Fecha pendiente de confirmación</span>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT — countdown */}
          <div className="p-6 lg:p-8 flex flex-col justify-center">
            {isCompleted ? (
              <div className="text-center">
                <p className="text-[9px] font-mono tracking-[0.35em] uppercase text-white/25 mb-1">Estado</p>
                <p className="text-xs font-black uppercase tracking-wider text-emerald-400">Completado</p>
              </div>
            ) : !hasDate ? (
              <div className="text-center">
                <p className="text-[9px] font-mono tracking-[0.35em] uppercase text-white/25 mb-1">Cuenta atrás</p>
                <p className="text-xs font-mono text-white/20">—</p>
              </div>
            ) : timeLeft.isOver ? (
              <div className="text-center">
                <p className="text-[9px] font-mono tracking-[0.35em] uppercase text-[#e10600] mb-1">En curso</p>
                <p className="text-xs font-black uppercase tracking-wider text-white animate-pulse">GP en juego</p>
              </div>
            ) : (
              <div>
                <p className="text-[9px] font-mono tracking-[0.35em] uppercase text-white/25 mb-4 text-center lg:text-left">Cuenta atrás</p>
                <div className="grid grid-cols-4 gap-2 text-center">
                  {[
                    { val: timeLeft.days, label: "Días" },
                    { val: timeLeft.hours, label: "Horas" },
                    { val: timeLeft.minutes, label: "Min" },
                    { val: timeLeft.seconds, label: "Seg" },
                  ].map(({ val, label }) => (
                    <div key={label} className="border border-white/[0.06] bg-black/20 py-3 px-1">
                      <div className="text-xl font-black text-white tabular-nums leading-none">{String(val).padStart(2, "0")}</div>
                      <div className="text-[8px] font-mono uppercase text-white/25 mt-1 tracking-widest">{label}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── VIDEO ── */}
      {videoId && (
        <div className="border border-white/[0.08]">
          <div className="px-6 py-3 border-b border-white/[0.06] flex items-center gap-3">
            <span className="w-0.5 h-4 bg-[#e10600] shrink-0" />
            <span className="text-[9px] font-mono uppercase tracking-[0.3em] text-white/30">
              Hotlap · GP de {nextCircuit.nombre}
            </span>
          </div>
          <div className="relative w-full aspect-video">
            <iframe
              className="absolute inset-0 w-full h-full"
              src={`https://www.youtube.com/embed/${videoId}`}
              title={`Hotlap ${nextCircuit.nombre}`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        </div>
      )}
    </div>
  );
}
