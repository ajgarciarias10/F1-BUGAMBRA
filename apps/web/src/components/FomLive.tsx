import { ArrowUpRight, MonitorPlay, Radio, Video } from "lucide-react";

const FOM_CHANNEL = {
  id: "tonicotitular",
  name: "Tonicotitular",
  label: "Cámara oficial Tonicotitular",
};

export function FomLive({ compact = false }: { compact?: boolean }) {
  const domain = window.location.hostname || "localhost";
  const parent = domain === "localhost" ? "localhost" : domain;

  return (
    <div className={compact ? "space-y-3" : "space-y-5"}>
      <section className="relative overflow-hidden border border-white/10 bg-[#08090c] text-white shadow-[0_30px_90px_rgba(0,0,0,0.45)]">
        <img src="/fom-broadcast.jpeg" alt="" className="absolute inset-0 w-full h-full object-cover object-center opacity-30" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(5,6,9,0.6),rgba(5,6,9,0.93)_75%),linear-gradient(90deg,rgba(5,6,9,0.85),transparent_55%)]" />

        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 p-5 md:px-8 md:pt-8 md:pb-6 relative z-10">
          <div className="flex items-center gap-3">
            <div className="bg-[#e10600] p-3 shadow-[0_10px_30px_rgba(225,6,0,0.3)]">
              <MonitorPlay className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#e10600]">F1 Bugambra TV</p>
              <h2 className="text-3xl md:text-5xl font-black tracking-[-0.055em] uppercase text-white leading-none mt-1">
                Directo oficial
              </h2>
            </div>
          </div>
          <div className="flex items-center gap-2 border border-red-400/25 bg-red-500/10 px-3 py-2 text-[9px] font-black uppercase tracking-[0.16em] text-red-100">
            <span className="w-2 h-2 bg-[#e10600] animate-pulse" /> Señal de @{FOM_CHANNEL.id}
          </div>
        </div>

        <div className="relative z-10 mx-3 md:mx-8 border border-white/15 bg-black shadow-[0_25px_70px_rgba(0,0,0,0.6)]">
          <div className="bg-[#111217] px-4 md:px-5 py-3 flex justify-between items-center border-b border-white/10">
            <div className="flex items-center gap-2">
              <Radio className="w-3.5 h-3.5 text-[#e10600]" />
              <span className="font-black text-[10px] text-white uppercase tracking-[0.12em]">{FOM_CHANNEL.label}</span>
            </div>
            <span className="text-[8px] font-mono text-white/35 uppercase tracking-[0.2em]">Twitch Live</span>
          </div>
          <div className={`w-full bg-black relative ${compact ? "aspect-video" : "aspect-video min-h-[16rem] md:min-h-[32rem]"}`}>
            <iframe
              src={`https://player.twitch.tv/?channel=${FOM_CHANNEL.id}&parent=${parent}`}
              height="100%"
              width="100%"
              allowFullScreen
              className="absolute inset-0 w-full h-full border-0"
            />
          </div>
        </div>

        <div className="relative z-10 flex flex-wrap gap-2 p-3 md:px-8 md:py-5">
          <MiniLink href={`https://www.twitch.tv/${FOM_CHANNEL.id}`} icon={<Radio className="w-3.5 h-3.5" />} label="Abrir directo" />
          <MiniLink href={`https://www.twitch.tv/${FOM_CHANNEL.id}/videos`} icon={<Video className="w-3.5 h-3.5" />} label="Vídeos TV" />
          <MiniLink href={`https://www.twitch.tv/${FOM_CHANNEL.id}/clips`} icon={<MonitorPlay className="w-3.5 h-3.5" />} label="Clips" />
        </div>
      </section>
    </div>
  );
}

function MiniLink({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-2 border border-white/10 bg-black/35 px-3 py-2 text-[9px] font-black uppercase tracking-[0.16em] text-white/55 backdrop-blur-sm transition-colors hover:border-[#e10600]/50 hover:text-white"
    >
      {icon}
      {label}
      <ArrowUpRight className="w-3 h-3 opacity-50" />
    </a>
  );
}
