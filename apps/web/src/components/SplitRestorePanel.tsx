import { useState } from "react";
import { previsualizarRestauracion, restaurarSplitDesdeCierre } from "../services/splitRestoreService";

export function SplitRestorePanel({ splitId, splits, onRestored }: {
  splitId: string; splits: any[]; onRestored: () => Promise<void>;
}) {
  const target = splits.find(s => s.id === splitId);
  const sources = splits.filter(s => s.id !== "global" && s.tipo !== "individual" && Number(s.orden) < Number(target?.orden))
    .sort((a, b) => Number(b.orden) - Number(a.orden));
  const [sourceId, setSourceId] = useState(sources[0]?.id ?? "");
  const [preview, setPreview] = useState<Awaited<ReturnType<typeof previsualizarRestauracion>> | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  if (!sources.length) return null;
  const sourceName = sources.find(s => s.id === sourceId)?.nombre ?? sourceId;
  return <details className="border border-amber-500/30 p-4 space-y-3">
    <summary className="cursor-pointer font-bold text-amber-200">Restaurar {target?.nombre || splitId} desde un cierre anterior</summary>
    <p className="text-sm text-white/70">Recupera los saldos, plantillas, ratings y valores de cierre del origen. Los pactos hacia este split se anulan y se compensan en el origen. No se vuelve a cobrar la plantilla.</p>
    <p className="text-sm text-white/70">El destino vuelve al inicio: se reinician resultados, puntos, liquidaciones y subastas. Se conserva su calendario. El mercado queda cerrado hasta que lo abras. Se guarda una copia de los documentos sustituidos.</p>
    <label className="block text-sm">Cierre de origen
      <select disabled={busy} className="block bg-black border border-white/20 p-2 mt-1" value={sourceId}
        onChange={e => { setSourceId(e.target.value); setPreview(null); setMessage(""); }}>
        {sources.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
      </select>
    </label>
    <button disabled={busy || !sourceId} className="border border-white/20 px-3 py-2 disabled:opacity-40" onClick={async () => {
      setBusy(true); setPreview(null); setMessage("");
      try { setPreview(await previsualizarRestauracion(sourceId, splitId)); }
      catch (error: any) { setMessage(error.message); }
      finally { setBusy(false); }
    }}>{busy ? "Procesando…" : "Previsualizar restauración"}</button>
    {preview && <div className="space-y-3">
      <p className="text-sm">{preview.pilotos} pilotos · {preview.libres} agentes libres · {preview.pactos} pactos a anular.</p>
      <table className="w-full text-sm"><thead><tr><th className="text-left">Escudería</th><th className="text-right">Saldo recuperado</th><th className="text-right">Fuente</th></tr></thead>
        <tbody>{preview.teams.map(t => <tr key={t.id}><td className="py-1">{t.nombre}</td><td className="text-right">{t.saldo.toLocaleString("es-ES")} M</td><td className="text-right">{t.conciliado ? "Cierre conciliado" : "Saldo + anulación de pactos"}</td></tr>)}</tbody>
      </table>
      <button disabled={busy} className="bg-amber-500 text-black font-bold px-4 py-2 disabled:opacity-40" onClick={async () => {
        if (!confirm(`¿Restaurar ${target?.nombre || splitId} desde el cierre de ${sourceName}?\n\nSe reemplazarán las plantillas y saldos del destino, se reiniciarán sus resultados y se retirarán sus fichajes y movimientos actuales. Los pactos del origen hacia el destino se anularán. Se guardará una copia antes de sustituirlos.`)) return;
        setBusy(true);
        try {
          const result = await restaurarSplitDesdeCierre(sourceId, splitId, preview.version);
          setPreview(null);
          setMessage(`Restauración completada: ${result.equipos} escuderías y ${result.pilotos} pilotos. Copia: ${result.backupId}.`);
          await onRestored();
        } catch (error: any) { setPreview(null); setMessage(error.message); }
        finally { setBusy(false); }
      }}>Restaurar {target?.nombre || splitId} desde {sourceName}</button>
    </div>}
    <p role="status" className="text-sm whitespace-pre-wrap">{message}</p>
  </details>;
}
