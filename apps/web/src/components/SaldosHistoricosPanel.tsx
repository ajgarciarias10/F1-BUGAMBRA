import { useMemo, useState } from "react";
import {
  cargarFuenteSaldos, guardarSaldosReconstruidos, reconstruirSaldosSplit, TOLERANCIA_SALDOS, type FuenteSaldos,
} from "../services/saldosHistoricosService";
import { useSingleFlight } from "../hooks/useSingleFlight";

const fmt = (n: number | null) => n == null ? "—" : `${n.toLocaleString("es-ES", { maximumFractionDigits: 2 })}M`;
const fmtDesvio = (n: number | null) => n == null ? "—" : `${n > 0 ? "+" : ""}${fmt(n)}`;
const ESTADOS = { reconstruible: "Sin saldo guardado", ya_guardado: "Ya guardado (no se toca)", sin_liquidar: "Sin liquidar: no reconstruible" } as const;

/** Herramienta de admin: previsualiza y, si se demuestra, guarda el saldo tras cada GP ya liquidado. */
export function SaldosHistoricosPanel({ splits }: { splits: any[] }) {
  const opciones = splits.filter(s => s.id !== "global" && s.tipo !== "individual");
  const [splitId, setSplitId] = useState(opciones[0]?.id ?? "");
  const [fuente, setFuente] = useState<FuenteSaldos | null>(null);
  const [referencias, setReferencias] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const { run: runOnce, pending: pendingOnce } = useSingleFlight();

  const vista = useMemo(() => {
    if (!fuente) return null;
    const numeros = Object.fromEntries(Object.entries(referencias)
      .map(([id, raw]) => [id, raw.trim() ? Number(raw.replace(",", ".")) : NaN])
      .filter(([, n]) => Number.isFinite(n)));
    return reconstruirSaldosSplit(fuente, numeros as Record<string, number>);
  }, [fuente, referencias]);

  async function cargar(id: string) {
    setBusy(true); setFuente(null);
    try { setFuente(await cargarFuenteSaldos(id)); }
    catch (error: any) { setMessage(`Error al leer el split: ${error.message}`); }
    finally { setBusy(false); }
  }

  const nombreCarrera = (id: string) => vista?.carreras.find(c => c.id === id)?.nombre ?? id;
  const pendientes = vista?.carreras.filter(c => c.estado === "reconstruible") ?? [];

  return <section className="rounded-2xl border border-line bg-surface-3 p-5 space-y-4">
    <div>
      <h2 className="text-lg font-bold">Saldos tras cada GP ya liquidado</h2>
      <p className="mt-1 text-sm text-ink-2">Reconstruye el saldo de cada escudería tras los GP liquidados antes de que se guardara. Parte del saldo actual y resta, hacia atrás, solo los movimientos guardados en el libro. Se comprueba con el saldo justo antes del primer GP: debe coincidir con el presupuesto inicial más el mercado de la plantilla (margen {TOLERANCIA_SALDOS}M). Si no coincide, se muestra el desvío y no se guarda nada.</p>
      <p className="mt-1 text-sm text-ink-2">Que el libro cuadre no significa que coincida con el Excel oficial. Puedes teclear el saldo oficial antes del primer GP de cada escudería para ver su desvío; ese dato es solo informativo.</p>
    </div>
    <label className="block text-sm font-bold">Split
      <select value={splitId} disabled={busy} onChange={e => { setSplitId(e.target.value); setFuente(null); setReferencias({}); setMessage(""); }}
        className="mt-2 block min-h-12 w-full rounded-xl border border-line bg-surface px-3 text-ink">
        {opciones.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
      </select>
    </label>
    <button disabled={busy || !splitId} onClick={() => { setMessage(""); void cargar(splitId); }}
      className="min-h-12 rounded-xl border border-line px-4 font-bold disabled:opacity-40">
      {busy ? "Leyendo…" : "Previsualizar saldos"}
    </button>

    {vista && <div className="space-y-4">
      <ul className="text-sm space-y-1">
        {vista.carreras.map(c => <li key={c.id}><span className="font-bold">{c.nombre}</span> · <span className={c.estado === "sin_liquidar" ? "text-warn" : "text-ink-2"}>{ESTADOS[c.estado]}</span></li>)}
      </ul>

      {vista.problemas.length > 0 && <div className="border border-danger/40 p-3 text-sm text-danger space-y-1">
        <p className="font-bold">No se puede demostrar: no se guardará nada.</p>
        {vista.problemas.map((p, i) => <p key={i}>{p}</p>)}
      </div>}
      {vista.avisos.map((a, i) => <p key={i} className="text-sm text-warn">{a}</p>)}

      <div className="overflow-x-auto border border-line">
        <table className="w-full text-xs border-collapse">
          <thead><tr className="border-b border-line text-left text-ink-muted">
            <th className="p-2">Escudería</th><th className="p-2 text-right">Saldo actual</th><th className="p-2 text-right">Inicial</th>
            <th className="p-2 text-right">Mercado plantilla</th><th className="p-2 text-right">Mercado posterior al primer GP</th>
            <th className="p-2 text-right">Inicial + mercado − posterior</th><th className="p-2 text-right">Antes del primer GP</th><th className="p-2 text-right">Desvío</th>
            <th className="p-2 text-right">Saldo oficial</th><th className="p-2 text-right">Desvío oficial</th>
          </tr></thead>
          <tbody className="divide-y divide-line">
            {vista.equipos.map(e => {
              const desviado = e.desvio == null || Math.abs(e.desvio) > TOLERANCIA_SALDOS + 1e-9;
              return <tr key={e.id}>
                <td className="p-2 font-bold">{e.nombre}{e.pilotosFuera.length > 0 && <span className="block font-normal text-warn">Con cargo en el libro y fuera de la plantilla: {e.pilotosFuera.join(", ")}</span>}</td>
                <td className="p-2 text-right font-mono">{fmt(e.presupuesto)}</td>
                <td className="p-2 text-right font-mono">{fmt(e.presupuestoInicial)}</td>
                <td className="p-2 text-right font-mono">{fmtDesvio(e.mercado)}</td>
                <td className="p-2 text-right font-mono" title="Cargos de mercado del libro hechos después del primer GP: no están en el saldo de antes y se descuentan del mercado de la plantilla">{e.mercadoPosterior ? fmtDesvio(e.mercadoPosterior) : "—"}</td>
                <td className="p-2 text-right font-mono">{fmt(e.apertura)}</td>
                <td className="p-2 text-right font-mono">{fmt(e.saldoAntesPrimerGp)}</td>
                <td className={`p-2 text-right font-mono font-bold ${desviado ? "text-danger" : "text-ok"}`}>{fmtDesvio(e.desvio)}</td>
                <td className="p-2 text-right">
                  <input inputMode="decimal" aria-label={`Saldo oficial de ${e.nombre} antes del primer GP`} value={referencias[e.id] ?? ""}
                    onChange={ev => setReferencias(prev => ({ ...prev, [e.id]: ev.target.value }))}
                    className="w-20 border border-line bg-surface px-2 py-1 text-right font-mono" />
                </td>
                <td className="p-2 text-right font-mono">{fmtDesvio(e.desvioReferencia)}</td>
              </tr>;
            })}
          </tbody>
        </table>
      </div>

      {vista.equipos.some(e => e.tramos.length) && <div className="overflow-x-auto border border-line">
        <table className="w-full text-xs border-collapse">
          <thead><tr className="border-b border-line text-left text-ink-muted">
            <th className="p-2">GP</th>{vista.equipos.map(e => <th key={e.id} className="p-2 text-right">{e.nombre}</th>)}
          </tr></thead>
          <tbody className="divide-y divide-line">
            {vista.equipos[0]?.tramos.map(t => <tr key={t.circuitoId}>
              <td className="p-2 font-bold">{nombreCarrera(t.circuitoId)}</td>
              {vista.equipos.map(e => {
                const tramo = e.tramos.find(x => x.circuitoId === t.circuitoId);
                return <td key={e.id} className="p-2 text-right font-mono" title={tramo ? `Antes ${fmt(tramo.antes)} · ingresos ${fmt(tramo.ingresos)}` : undefined}>
                  {tramo ? fmt(tramo.despues) : "—"}
                  {tramo && <span className="block text-ink-muted">{fmt(tramo.antes)} {tramo.ingresos >= 0 ? "+" : "−"} {fmt(Math.abs(tramo.ingresos))}</span>}
                </td>;
              })}
            </tr>)}
          </tbody>
        </table>
      </div>}

      <button disabled={!vista.escribible || busy || pendingOnce} aria-busy={pendingOnce || undefined}
        className="min-h-12 rounded-xl bg-warn-soft border border-warn/40 px-4 font-bold text-warn disabled:opacity-40"
        onClick={() => runOnce(async () => {
          if (!fuente || !vista.escribible) return;
          if (!confirm(`¿Guardar el saldo reconstruido de ${vista.equipos.length} escuderías en ${pendientes.map(c => c.nombre).join(", ")}?\n\nNo se mueve ningún saldo ni movimiento: solo se guarda la foto de cada GP, marcada como reconstruida, con un registro de auditoría. Si algo cambió desde la vista previa, no se guardará nada.`)) return;
          setBusy(true);
          try {
            const { circuitos } = await guardarSaldosReconstruidos(fuente, vista);
            setMessage(`Saldos guardados en ${circuitos} GP. Se ha vuelto a leer el split desde la base de datos.`);
            setFuente(await cargarFuenteSaldos(fuente.splitId));
          } catch (error: any) {
            setMessage(`Error: no se ha guardado nada. ${error.message}`);
          } finally { setBusy(false); }
        })}>
        {vista.escribible ? `Guardar saldos de ${pendientes.length} GP` : "No se puede guardar"}
      </button>
    </div>}
    <p role="status" className={`text-sm whitespace-pre-wrap ${message.startsWith("Error") ? "text-danger" : "text-ok"}`}>{message}</p>
  </section>;
}
