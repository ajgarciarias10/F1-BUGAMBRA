import { Printer, X, ShieldCheck, FileText, CheckCircle2 } from "lucide-react";

interface TeamSummaryItem {
  id: string;
  nombre: string;
  presupuesto_inicial: number | null;
  movimientos_mercado: number;
  ajustes_clausulas: number;
  ingresos: {
    points: number;
    pole: number;
    fastestLap: number;
    participation: number;
    cleanTeam: number;
    rivalry: number;
    seasonPrize: number;
  };
  presupuesto: number | null;
}

interface PilotItem {
  id: string;
  nombre: string;
  equipoNombre: string;
  precio_compra: number;
  clausula_actual: number;
  mantener_actual: number;
  tipo_fichaje?: string;
}

interface LedgerEntryItem {
  id?: string;
  fecha?: any;
  equipo?: string;
  equipoId?: string;
  piloto?: string;
  tipo: string;
  cantidad?: number;
  esIngreso?: boolean;
  descripcion?: string;
  saldo_anterior?: number;
  saldo_nuevo?: number;
}

interface FiaFinancialReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  splitId: string;
  splitName: string;
  teams: TeamSummaryItem[];
  pilots: PilotItem[];
  ledgerEntries: LedgerEntryItem[];
}

function formatDate(val: any): string {
  if (!val) return "—";
  let date: Date | null = null;
  if (typeof val.toDate === "function") date = val.toDate();
  else if (typeof val.toMillis === "function") date = new Date(val.toMillis());
  else if (val instanceof Date) date = val;
  else if (typeof val === "string" || typeof val === "number") date = new Date(val);
  if (!date || isNaN(date.getTime())) return "—";
  return date.toLocaleString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function r1(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return "—";
  return (Math.round(n * 10) / 10).toFixed(1);
}

export function FiaFinancialReportModal({
  isOpen,
  onClose,
  splitId,
  splitName,
  teams,
  pilots,
  ledgerEntries,
}: FiaFinancialReportModalProps) {
  if (!isOpen) return null;

  const now = new Date();
  const docRef = `FIA-F1B-AUDIT-${splitId.toUpperCase().replace(/[^A-Z0-9]/g, "")}-${now.getFullYear()}`;
  const currentDateFormatted = now.toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  // Filtrar asientos de mercado y ajustes
  const adjustmentEntries = ledgerEntries.filter(
    e => e.tipo === "ajuste" || e.tipo === "clausula" || e.tipo === "fichaje" || e.tipo === "subasta"
  );

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-2 sm:p-4 backdrop-blur-sm overflow-y-auto">
      {/* Estilos específicos de impresión para A4 */}
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #fia-report-container, #fia-report-container * {
            visibility: visible !important;
          }
          #fia-report-container {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            color: #000000 !important;
            box-shadow: none !important;
            border: none !important;
          }
          .no-print {
            display: none !important;
          }
          @page {
            size: A4 portrait;
            margin: 12mm 15mm;
          }
        }
      `}</style>

      <div className="relative w-full max-w-5xl rounded-lg bg-surface border border-line shadow-2xl flex flex-col max-h-[92vh]">
        {/* Barra superior de acciones (no imprimible) */}
        <div className="no-print flex items-center justify-between border-b border-line px-5 py-3 bg-surface-2">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded bg-warn-soft text-warn">
              <FileText className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-ink">
                Boletín Oficial Financiero FIA
              </h2>
              <p className="text-[10px] text-ink-2">{splitName} · Resumen reglamentario descargable</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 rounded bg-warn-soft border border-warn/40 px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider text-warn transition-colors hover:bg-warn-soft/20"
            >
              <Printer className="h-3.5 w-3.5" />
              Descargar PDF / Imprimir
            </button>
            <button
              onClick={onClose}
              className="rounded p-1.5 text-ink-muted hover:bg-surface-3 hover:text-ink transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Contenedor del documento oficial imprimible */}
        <div className="overflow-y-auto p-4 sm:p-8 space-y-6 text-zinc-900 bg-white" id="fia-report-container">
          
          {/* CABECERA OFICIAL FIA */}
          <div className="border-b-2 border-zinc-900 pb-4">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-12 bg-zinc-900 text-white font-black flex items-center justify-center text-xs tracking-widest border border-zinc-800">
                    FIA
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600">
                    Fédération Internationale de l'Automobile
                  </span>
                </div>
                <h1 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-zinc-950 font-serif">
                  Financial Regulations & Transfers Bulletin
                </h1>
                <p className="text-xs font-semibold text-zinc-700 uppercase tracking-wider">
                  Campeonato F1 Bugambra · Control Presupuestario y Mercado
                </p>
              </div>

              {/* Caja de metadatos oficial */}
              <div className="border border-zinc-400 bg-zinc-50 p-2 text-right text-[10px] font-mono shrink-0">
                <p className="font-bold text-zinc-900">DOC: {docRef}</p>
                <p className="text-zinc-600">FECHA: {currentDateFormatted}</p>
                <p className="text-zinc-600">SPLIT: {splitName.toUpperCase()}</p>
                <div className="mt-1 inline-flex items-center gap-1 font-bold text-emerald-800 text-[9px] uppercase">
                  <CheckCircle2 className="h-2.5 w-2.5" /> Auditoría Conforme
                </div>
              </div>
            </div>
          </div>

          {/* SECCIÓN 1: ESTADO PRESUPUESTARIO DE ESCUDERÍAS */}
          <div>
            <div className="mb-2 flex items-center gap-2 border-b border-zinc-300 pb-1">
              <span className="h-3 w-1 bg-zinc-900"></span>
              <h3 className="text-xs font-black uppercase tracking-wider text-zinc-900">
                1. Estado de Balances y Asignaciones Económicas
              </h3>
            </div>
            <table className="w-full text-[11px] border-collapse border border-zinc-300">
              <thead>
                <tr className="bg-zinc-100 text-zinc-800 font-bold border-b border-zinc-300 uppercase text-[9px] tracking-wider text-right">
                  <th className="p-2 text-left border-r border-zinc-300">Escudería</th>
                  <th className="p-2 border-r border-zinc-300">Presupuesto Inicial</th>
                  <th className="p-2 border-r border-zinc-300">Gasto Mercado (Ledger)</th>
                  <th className="p-2 border-r border-zinc-300">Ajuste Cláusulas</th>
                  <th className="p-2 border-r border-zinc-300">Total Ingresos Deportivos</th>
                  <th className="p-2 font-black text-zinc-950">Total Disponible</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200">
                {teams.map(team => {
                  const totalIngresos = Object.values(team.ingresos).reduce((a, b) => a + b, 0);
                  return (
                    <tr key={team.id} className="text-right hover:bg-zinc-50">
                      <td className="p-2 text-left font-bold border-r border-zinc-300 text-zinc-900">{team.nombre}</td>
                      <td className="p-2 border-r border-zinc-300 font-mono">{r1(team.presupuesto_inicial)}M</td>
                      <td className={`p-2 border-r border-zinc-300 font-mono font-semibold ${team.movimientos_mercado < 0 ? "text-red-700" : "text-zinc-800"}`}>
                        {team.movimientos_mercado ? `${r1(team.movimientos_mercado)}M` : "0.0M"}
                      </td>
                      <td className={`p-2 border-r border-zinc-300 font-mono font-semibold ${team.ajustes_clausulas < 0 ? "text-amber-800" : "text-zinc-800"}`}>
                        {team.ajustes_clausulas ? `${team.ajustes_clausulas > 0 ? "+" : ""}${r1(team.ajustes_clausulas)}M` : "0.0M"}
                      </td>
                      <td className="p-2 border-r border-zinc-300 font-mono text-emerald-800">
                        {totalIngresos > 0 ? `+${r1(totalIngresos)}M` : "0.0M"}
                      </td>
                      <td className="p-2 font-mono font-black text-zinc-950 bg-zinc-50/50">
                        {r1(team.presupuesto)}M
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* SECCIÓN 2: REGISTRO OFICIAL DE FICHAS Y CLÁUSULAS */}
          <div>
            <div className="mb-2 flex items-center gap-2 border-b border-zinc-300 pb-1">
              <span className="h-3 w-1 bg-zinc-900"></span>
              <h3 className="text-xs font-black uppercase tracking-wider text-zinc-900">
                2. Plantillas Registradas y Valoraciones Contractuales
              </h3>
            </div>
            <table className="w-full text-[11px] border-collapse border border-zinc-300">
              <thead>
                <tr className="bg-zinc-100 text-zinc-800 font-bold border-b border-zinc-300 uppercase text-[9px] tracking-wider text-right">
                  <th className="p-2 text-left border-r border-zinc-300">Piloto</th>
                  <th className="p-2 text-left border-r border-zinc-300">Escudería</th>
                  <th className="p-2 border-r border-zinc-300">Precio Ficha / Compra</th>
                  <th className="p-2 border-r border-zinc-300">Cláusula Rescisión</th>
                  <th className="p-2 border-r border-zinc-300">Coste Mantener</th>
                  <th className="p-2 text-center">Tipo Registro</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200">
                {pilots.map(p => (
                  <tr key={p.id} className="text-right hover:bg-zinc-50">
                    <td className="p-2 text-left font-bold border-r border-zinc-300 text-zinc-900">{p.nombre}</td>
                    <td className="p-2 text-left border-r border-zinc-300 text-zinc-700">{p.equipoNombre}</td>
                    <td className="p-2 border-r border-zinc-300 font-mono font-semibold">{r1(p.precio_compra)}M</td>
                    <td className="p-2 border-r border-zinc-300 font-mono font-semibold text-amber-900">{r1(p.clausula_actual)}M</td>
                    <td className="p-2 border-r border-zinc-300 font-mono">{r1(p.mantener_actual)}M</td>
                    <td className="p-2 text-center uppercase text-[9px] font-mono text-zinc-600">
                      {p.tipo_fichaje || "registrado"}
                    </td>
                  </tr>
                ))}
                {pilots.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-4 text-center text-zinc-400 italic">
                      Sin pilotos registrados en este split
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* SECCIÓN 3: REGISTRO AUDITADO DE AJUSTES ECONÓMICOS Y CLÁUSULAS */}
          <div>
            <div className="mb-2 flex items-center gap-2 border-b border-zinc-300 pb-1">
              <span className="h-3 w-1 bg-zinc-900"></span>
              <h3 className="text-xs font-black uppercase tracking-wider text-zinc-900">
                3. Libro de Registro de Ajustes Económicos y Operaciones Auditadas
              </h3>
            </div>
            <table className="w-full text-[10px] border-collapse border border-zinc-300">
              <thead>
                <tr className="bg-zinc-100 text-zinc-800 font-bold border-b border-zinc-300 uppercase text-[8px] tracking-wider text-left">
                  <th className="p-2 border-r border-zinc-300">Fecha / Hora</th>
                  <th className="p-2 border-r border-zinc-300">Escudería</th>
                  <th className="p-2 border-r border-zinc-300">Piloto / Referencia</th>
                  <th className="p-2 border-r border-zinc-300">Tipo</th>
                  <th className="p-2 border-r border-zinc-300 text-right">Variación</th>
                  <th className="p-2 border-r border-zinc-300 text-right">Saldo Tras Operación</th>
                  <th className="p-2">Motivo / Justificante Auditado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200">
                {adjustmentEntries.map((e, idx) => {
                  const delta = e.esIngreso ? Number(e.cantidad ?? 0) : -Number(e.cantidad ?? 0);
                  return (
                    <tr key={e.id || idx} className="hover:bg-zinc-50 font-mono">
                      <td className="p-2 text-zinc-600 border-r border-zinc-300 whitespace-nowrap">{formatDate(e.fecha)}</td>
                      <td className="p-2 font-bold text-zinc-900 border-r border-zinc-300">{e.equipo || e.equipoId || "—"}</td>
                      <td className="p-2 text-zinc-800 border-r border-zinc-300">{e.piloto || "—"}</td>
                      <td className="p-2 uppercase text-[8px] text-zinc-600 border-r border-zinc-300 font-sans font-bold">{e.tipo}</td>
                      <td className={`p-2 text-right border-r border-zinc-300 font-bold ${delta < 0 ? "text-red-700" : "text-emerald-800"}`}>
                        {delta > 0 ? "+" : ""}{r1(delta)}M
                      </td>
                      <td className="p-2 text-right border-r border-zinc-300 text-zinc-800 font-bold">
                        {e.saldo_nuevo != null ? `${r1(e.saldo_nuevo)}M` : "—"}
                      </td>
                      <td className="p-2 text-zinc-700 font-sans text-[10px]">{e.descripcion || "—"}</td>
                    </tr>
                  );
                })}
                {adjustmentEntries.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-4 text-center text-zinc-400 italic">
                      Sin asientos de ajuste económico en el split actual
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* PIE DE CERTIFICACIÓN OFICIAL FIA */}
          <div className="mt-8 pt-4 border-t-2 border-zinc-900 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-zinc-600 text-[10px]">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-6 w-6 text-zinc-900 shrink-0" />
              <div>
                <p className="font-bold text-zinc-900 uppercase">FIA Cost Cap Administration & Financial Supervision</p>
                <p className="text-[9px]">Documento generado automáticamente bajo las regulaciones de la liga F1 Bugambra.</p>
              </div>
            </div>
            <div className="border border-zinc-400 px-4 py-2 bg-zinc-50 text-center font-mono">
              <span className="block font-bold text-zinc-900 text-[9px] uppercase tracking-wider">Validado por Comisarios FIA</span>
              <span className="text-[8px] text-zinc-500">{docRef}</span>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
