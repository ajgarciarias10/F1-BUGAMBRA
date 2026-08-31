import { AlertCircle, CheckCircle2, FileSpreadsheet } from "lucide-react";

export function AdminControlPanel() {
  return (
    <section className="bg-white/[0.03] border border-white/10 p-5 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/5 blur-[100px] -mr-32 -mt-32 rounded-full" />
      <div className="relative z-10 space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-sm">
              <FileSpreadsheet className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <p className="text-[10px] font-mono uppercase tracking-[0.3em] text-emerald-300">Control oficial</p>
              <h2 className="text-xl font-black italic tracking-tighter uppercase text-white">Excel vs PostgreSQL</h2>
            </div>
          </div>
          <div className="text-[10px] font-mono uppercase tracking-widest text-white/40 border border-white/10 px-3 py-2 rounded-sm">
            Solo lectura hasta confirmar diferencias
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          <StatusCard
            icon={<CheckCircle2 className="w-4 h-4" />}
            title="Referencia"
            text="El Excel conserva puntuación y economía histórica. No se modifica desde la app."
          />
          <StatusCard
            icon={<CheckCircle2 className="w-4 h-4" />}
            title="Fuente viva"
            text="PostgreSQL debe guardar actas, revisiones y standings reconstruibles."
          />
          <StatusCard
            icon={<AlertCircle className="w-4 h-4" />}
            title="Pendiente"
            text="Conectar aquí el endpoint de conciliación para subir XLSX y ver diferencias en tabla."
          />
        </div>

        <div className="bg-black/30 border border-white/10 rounded-sm p-4">
          <h3 className="text-xs font-black uppercase tracking-widest text-white mb-3">Flujo objetivo</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2 text-[11px] font-mono text-white/60">
            <Step label="1" text="Subir Excel" />
            <Step label="2" text="Comparar reglas, puntos y economía" />
            <Step label="3" text="Previsualizar diferencias" />
            <Step label="4" text="Corregir Postgres con revisión" />
          </div>
        </div>
      </div>
    </section>
  );
}

function StatusCard({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className="bg-black/30 border border-white/10 rounded-sm p-4">
      <div className="flex items-center gap-2 text-emerald-300 mb-2">
        {icon}
        <span className="text-[10px] font-black uppercase tracking-widest text-white">{title}</span>
      </div>
      <p className="text-xs text-white/50 leading-relaxed">{text}</p>
    </div>
  );
}

function Step({ label, text }: { label: string; text: string }) {
  return (
    <div className="flex items-center gap-3 border border-white/10 bg-white/[0.02] px-3 py-3 rounded-sm">
      <span className="w-6 h-6 rounded-full bg-emerald-500/15 text-emerald-300 flex items-center justify-center text-[10px] font-black">
        {label}
      </span>
      <span>{text}</span>
    </div>
  );
}
