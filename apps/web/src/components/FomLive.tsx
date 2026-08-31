import { ArrowUpRight, MonitorPlay } from "lucide-react";

const FOM_CHANNEL = {
  id: "tonicotitular",
  name: "Tonicotitular",
  label: "Cámara oficial Tonicotitular",
};

export function FomLive({ compact = false }: { compact?: boolean }) {
  const domain = window.location.hostname || "localhost";
  const parent = domain === "localhost" ? "localhost" : domain;

  return (
    <div className={compact ? "space-y-4" : "space-y-6"}>
      <div className="sport-panel bg-[#111113] relative overflow-hidden text-white">
        <div className="absolute top-0 right-0 w-96 h-64 bg-[#e10600]/15 blur-[100px] pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 p-5 md:p-8 relative z-10">
          <div className="flex items-center gap-3">
            <div className="bg-[#e10600] p-3">
              <MonitorPlay className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#e10600]">F1 Bugambra FOM</p>
              <h2 className="text-2xl md:text-4xl font-black tracking-[-0.04em] uppercase text-white leading-none mt-1">
                Señal oficial
              </h2>
            </div>
          </div>
          <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.16em] text-white/60">
            <span className="w-2 h-2 bg-[#e10600] animate-pulse" /> En directo desde @{FOM_CHANNEL.id}
          </div>
        </div>

        <div className="bg-black border-y border-white/10 overflow-hidden flex flex-col group relative z-10">
          <div className="bg-[#19191c] px-4 md:px-6 py-3 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <span className="w-1 h-4 bg-[#e10600]" />
              <span className="font-black text-[10px] text-white uppercase tracking-[0.12em]">{FOM_CHANNEL.label}</span>
            </div>
            <span className="text-[9px] font-mono text-white/40 uppercase">
              @{FOM_CHANNEL.id}
            </span>
          </div>
          <div className="aspect-video w-full bg-black relative">
            <iframe
              src={`https://player.twitch.tv/?channel=${FOM_CHANNEL.id}&parent=${parent}`}
              height="100%"
              width="100%"
              allowFullScreen
              className="absolute inset-0 w-full h-full border-0"
            />
          </div>
        </div>

        <div className="relative z-10">
          <a
            href={`https://www.twitch.tv/${FOM_CHANNEL.id}/videos`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex justify-between items-center hover:bg-white/[0.05] p-5 md:px-8 transition-all group"
          >
            <div>
              <span className="text-white font-black text-sm uppercase tracking-tight block group-hover:text-[#e10600] transition-colors">
                Repeticiones FOM
              </span>
              <span className="text-white/40 text-[10px] font-mono uppercase tracking-widest">Twitch Videos</span>
            </div>
            <div className="flex items-center gap-2 text-white text-[10px] font-black uppercase tracking-widest group-hover:text-[#e10600] transition-colors">
              Ver repeticiones <ArrowUpRight className="w-4 h-4" />
            </div>
          </a>
        </div>
      </div>
    </div>
  );
}
