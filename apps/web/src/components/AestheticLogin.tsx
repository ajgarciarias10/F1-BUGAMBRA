import { useState } from 'react';
import { ChevronRight, ShieldAlert, Trophy, Gauge } from 'lucide-react';

export function AestheticLogin({ onLogin, error }: { onLogin: (email: string, pass: string) => void, error?: string }) {
  const [email, setEmail] = useState("");
  const [pwd, setPwd] = useState("");

  return (
    <div className="min-h-[100dvh] bg-bg text-ink flex relative overflow-hidden font-sans">
      {/* Left panel - Branding (Hidden on mobile) */}
      <div className="hidden lg:flex flex-1 relative z-10 flex-col justify-between p-16 border-r border-line bg-surface-2">
         <div>
            <h1 className="text-5xl font-extrabold text-ink tracking-tight flex items-center gap-3">
              <span className="w-2 h-10 bg-brand" />
              F1 BUGAMBRA
            </h1>
            <p className="mt-4 text-ink-muted text-base max-w-md leading-relaxed">
              El pináculo del automovilismo virtual. Gestiona, compite y domina el mercado en el campeonato más exigente.
            </p>
         </div>

         <div className="space-y-6">
            <div className="flex items-center gap-4 bg-surface p-4 rounded-card border border-line">
               <div className="bg-brand/10 p-3 rounded-xl border border-brand/20"><Gauge className="text-brand w-6 h-6" /></div>
               <div>
                 <h4 className="text-ink font-bold text-sm">Telemetría en Vivo</h4>
                 <p className="text-ink-muted text-xs mt-1">Análisis profundo de ritmo, neumáticos y estrategias</p>
               </div>
            </div>
            <div className="flex items-center gap-4 bg-surface p-4 rounded-card border border-line">
               <div className="bg-warn/10 p-3 rounded-xl border border-warn/20"><Trophy className="text-warn w-6 h-6" /></div>
               <div>
                 <h4 className="text-ink font-bold text-sm">Mercado Dinámico</h4>
                 <p className="text-ink-muted text-xs mt-1">Cláusulas, fichajes y agentes libres en tiempo real</p>
               </div>
            </div>
         </div>
      </div>

      {/* Right panel - Login form */}
      <div className="flex-1 flex flex-col justify-center items-center relative z-10 p-8">
         <div className="w-full max-w-md bg-surface border border-line p-6 md:p-10 rounded-card shadow-card">
            <div className="mb-8 text-center">
              <h2 className="text-2xl font-bold text-ink">Acceso al Paddock</h2>
              <p className="text-sm text-ink-muted mt-2">Identificación de Personal</p>
            </div>

            {error && (
              <div className="mb-6 bg-danger-soft border border-danger/40 p-3 rounded-lg flex items-center gap-3 text-danger text-sm font-semibold">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            <form onSubmit={(e) => { e.preventDefault(); onLogin(email, pwd); }} className="space-y-5">
               <div className="space-y-2">
                 <label className="text-sm font-semibold text-ink-2">Credencial (Email)</label>
                 <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-surface border border-line-strong rounded-lg px-4 min-h-12 text-base text-ink placeholder:text-ink-muted outline-none focus:border-brand focus:ring-1 focus:ring-brand transition-all" placeholder="piloto@f1bugambra.com" required />
               </div>
               <div className="space-y-2">
                 <label className="text-sm font-semibold text-ink-2">Código de Seguridad</label>
                 <input type="password" value={pwd} onChange={e => setPwd(e.target.value)} className="w-full bg-surface border border-line-strong rounded-lg px-4 min-h-12 text-base text-ink placeholder:text-ink-muted outline-none focus:border-brand focus:ring-1 focus:ring-brand transition-all" placeholder="••••••••" required />
               </div>

               <button type="submit" className="w-full mt-4 bg-brand hover:bg-brand-hover text-brand-ink font-bold text-sm min-h-12 rounded-lg flex justify-center items-center gap-2 transition-colors group">
                  Ingresar al Sistema
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
               </button>
            </form>
         </div>
      </div>
    </div>
  );
}