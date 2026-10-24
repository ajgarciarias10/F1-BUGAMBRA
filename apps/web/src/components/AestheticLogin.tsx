import { useState } from 'react';
import { ChevronRight, Trophy, Gauge } from 'lucide-react';
import { Button, Card, Notice } from './ui';

const FIELD_CLASS = 'min-h-12 w-full rounded-lg border border-line-strong bg-surface/90 px-3.5 text-base text-ink shadow-fluent-1 transition-colors placeholder:text-ink-muted/80 hover:border-info/60 focus:border-info focus-visible:outline-2 focus-visible:outline-offset-2 md:text-sm';

export function AestheticLogin({ onLogin, error }: { onLogin: (email: string, pass: string) => void, error?: string }) {
  const [email, setEmail] = useState("");
  const [pwd, setPwd] = useState("");

  return (
    <div className="min-h-[100dvh] bg-bg text-ink flex relative overflow-hidden font-sans">
      {/* Left panel - Branding (Hidden on mobile) */}
      <div className="hidden lg:flex flex-1 relative z-10 flex-col justify-between p-16 border-r border-line bg-surface-2/50 bg-[image:var(--grad-info)]">
         <div>
            <h1 className="text-5xl font-semibold text-ink tracking-tight flex items-center gap-3">
              <span aria-hidden="true" className="h-10 w-1.5 rounded-full bg-brand" />
              F1 BUGAMBRA
            </h1>
            <p className="mt-4 text-ink-muted text-base max-w-md leading-relaxed">
              El pináculo del automovilismo virtual. Gestiona, compite y domina el mercado en el campeonato más exigente.
            </p>
         </div>

         <div className="space-y-6">
            <div className="flex items-center gap-4 rounded-card p-4 acrylic">
               <div className="bg-brand-soft p-3 rounded-lg border border-brand/20"><Gauge className="text-brand w-6 h-6" /></div>
               <div>
                 <h4 className="text-ink font-bold text-sm">Telemetría en Vivo</h4>
                 <p className="text-ink-muted text-xs mt-1">Análisis profundo de ritmo, neumáticos y estrategias</p>
               </div>
            </div>
            <div className="flex items-center gap-4 rounded-card p-4 acrylic">
               <div className="bg-warn-soft p-3 rounded-lg border border-warn/30"><Trophy className="text-warn w-6 h-6" /></div>
               <div>
                 <h4 className="text-ink font-bold text-sm">Mercado Dinámico</h4>
                 <p className="text-ink-muted text-xs mt-1">Cláusulas, fichajes y agentes libres en tiempo real</p>
               </div>
            </div>
         </div>
      </div>

      {/* Right panel - Login form */}
      <div className="flex-1 flex flex-col justify-center items-center relative z-10 p-8">
         <Card as="section" pad="lg" className="w-full max-w-md">
            <div className="mb-8 text-center">
              <h2 className="text-2xl font-bold text-ink">Acceso al Paddock</h2>
              <p className="text-sm text-ink-muted mt-2">Identificación de Personal</p>
            </div>

            {error && (
              <Notice tone="danger" className="mb-6">{error}</Notice>
            )}

            <form onSubmit={(e) => { e.preventDefault(); onLogin(email, pwd); }} className="space-y-5">
               <div className="space-y-2">
                 <label htmlFor="aesthetic-email" className="block text-sm font-semibold text-ink-2">Credencial (Email)</label>
                 <input id="aesthetic-email" autoComplete="email" type="email" value={email} onChange={e => setEmail(e.target.value)} className={FIELD_CLASS} placeholder="piloto@f1bugambra.com" required />
               </div>
               <div className="space-y-2">
                 <label htmlFor="aesthetic-pwd" className="block text-sm font-semibold text-ink-2">Código de Seguridad</label>
                 <input id="aesthetic-pwd" autoComplete="current-password" type="password" value={pwd} onChange={e => setPwd(e.target.value)} className={FIELD_CLASS} placeholder="••••••••" required />
               </div>

               <Button type="submit" variant="primary" block className="mt-4 min-h-12">
                  Ingresar al Sistema
                  <ChevronRight aria-hidden="true" className="h-4 w-4" />
               </Button>
            </form>
         </Card>
      </div>
    </div>
  );
}