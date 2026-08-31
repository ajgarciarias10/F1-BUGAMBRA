import React, { useState } from 'react';
import { ChevronRight, ShieldAlert, Trophy, Gauge } from 'lucide-react';

export function AestheticLogin({ onLogin, error }: { onLogin: (email: string, pass: string) => void, error?: string }) {
  const [email, setEmail] = useState("");
  const [pwd, setPwd] = useState("");

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex relative overflow-hidden font-sans">
      {/* Background animations and glows */}
      <div className="absolute inset-0 z-0">
         <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#e10600]/20 blur-[120px] rounded-full animate-pulse" />
         <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-amber-500/10 blur-[150px] rounded-full" />
         {/* Tech Grid overlay */}
         <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMSIgZmlsbD0icmdiYSgyNTUsMjU1LDI1NSwwLjA1KSIvPjwvc3ZnPg==')] opacity-50" />
      </div>

      {/* Left panel - Branding (Hidden on mobile) */}
      <div className="hidden lg:flex flex-1 relative z-10 flex-col justify-between p-16 border-r border-white/5 bg-black/40 backdrop-blur-sm">
         <div>
            <h1 className="text-5xl font-black italic text-white uppercase tracking-tighter flex items-center gap-3">
              <span className="w-2 h-10 bg-[#e10600]" />
              F1 BUGAMBRA
            </h1>
            <p className="mt-4 text-white/50 font-mono tracking-widest uppercase text-sm max-w-md leading-relaxed">
              El pináculo del automovilismo virtual. Gestiona, compite y domina el mercado en el campeonato más exigente.
            </p>
         </div>

         <div className="space-y-6">
            <div className="flex items-center gap-4 bg-white/[0.02] p-4 rounded-2xl border border-white/5">
               <div className="bg-[#e10600]/10 p-3 rounded-xl border border-[#e10600]/20"><Gauge className="text-[#e10600] w-6 h-6" /></div>
               <div>
                 <h4 className="text-white font-bold uppercase tracking-wide text-sm">Telemetría en Vivo</h4>
                 <p className="text-white/40 text-xs font-mono mt-1">Análisis profundo de ritmo, neumáticos y estrategias</p>
               </div>
            </div>
            <div className="flex items-center gap-4 bg-white/[0.02] p-4 rounded-2xl border border-white/5">
               <div className="bg-amber-500/10 p-3 rounded-xl border border-amber-500/20"><Trophy className="text-amber-500 w-6 h-6" /></div>
               <div>
                 <h4 className="text-white font-bold uppercase tracking-wide text-sm">Mercado Dinámico</h4>
                 <p className="text-white/40 text-xs font-mono mt-1">Cláusulas, fichajes y agentes libres en tiempo real</p>
               </div>
            </div>
         </div>
      </div>

      {/* Right panel - Login form */}
      <div className="flex-1 flex flex-col justify-center items-center relative z-10 p-8">
         <div className="w-full max-w-md bg-zinc-950/80 backdrop-blur-xl border border-white/10 p-10 rounded-[2rem] shadow-2xl shadow-black">
            <div className="mb-8 text-center">
              <h2 className="text-2xl font-black text-white uppercase tracking-tight">Acceso al Paddock</h2>
              <p className="text-xs text-white/40 font-mono mt-2 uppercase tracking-widest">Identificación de Personal</p>
            </div>

            {error && (
              <div className="mb-6 bg-red-500/10 border border-red-500/30 p-3 rounded-xl flex items-center gap-3 text-red-400 text-xs font-bold font-mono">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            <form onSubmit={(e) => { e.preventDefault(); onLogin(email, pwd); }} className="space-y-5">
               <div className="space-y-2">
                 <label className="text-[10px] text-white/50 uppercase font-mono tracking-widest font-bold ml-1">Credencial (Email)</label>
                 <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3.5 text-sm text-white placeholder-white/20 outline-none focus:border-[#e10600] focus:ring-1 focus:ring-[#e10600] transition-all" placeholder="piloto@f1bugambra.com" required />
               </div>
               <div className="space-y-2">
                 <label className="text-[10px] text-white/50 uppercase font-mono tracking-widest font-bold ml-1">Código de Seguridad</label>
                 <input type="password" value={pwd} onChange={e => setPwd(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3.5 text-sm text-white placeholder-white/20 outline-none focus:border-[#e10600] focus:ring-1 focus:ring-[#e10600] transition-all" placeholder="••••••••" required />
               </div>

               <button type="submit" className="w-full mt-4 bg-gradient-to-r from-[#e10600] to-red-700 hover:from-red-600 hover:to-red-800 text-white font-black text-xs uppercase tracking-widest py-4 rounded-xl flex justify-center items-center gap-2 transition-all active:scale-95 shadow-lg shadow-red-900/30 group">
                  Ingresar al Sistema
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
               </button>
            </form>
         </div>
      </div>
    </div>
  );
}