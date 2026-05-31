import { useState, useEffect } from "react";
import { collection, getDocs, doc, updateDoc, deleteDoc } from "firebase/firestore";
import { db } from "../services/firebase";
import { Loader2, Trash2 } from "lucide-react";

// ─── TYPES ────────────────────────────────────────────────────────────────────

interface CircuitoCol {
  id: string;
  nombre: string;
  ts: number; // epoch ms para ordenar
}

interface PilotRow {
  id: string;
  nombre: string;
  equipoId: string;
  equipoNombre: string;
  splitId: string;
  precio_compra_split: number;
  mantener_actual: number;
  clausula_actual: number;
  mantener_inicial_split: number;
  clausula_inicial_split: number;
  historial: Record<string, { mantener: number | null; clausula: number | null }>;
  isLegacy: boolean; // piloto_X en splits 2+ cuando ya hay versión con nombre real
}

interface TeamRow {
  id: string;
  nombre: string;
  presupuesto: number;
  puntos_constructores: number;
  poles: number;
  vueltas_rapidas: number;
  sin_sanc: number;
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────

/** Convierte cualquier valor Firestore fecha a epoch ms */
function toMs(fecha: any): number {
  if (!fecha) return 0;
  if (typeof fecha?.toMillis === "function") return fecha.toMillis(); // Firestore Timestamp
  if (typeof fecha === "string") return new Date(fecha).getTime() || 0;
  if (fecha instanceof Date) return fecha.getTime();
  return 0;
}

function r1(n: number | null | undefined): string {
  if (n == null || isNaN(n as number)) return "—";
  return (Math.round((n as number) * 10) / 10).toFixed(1);
}

function cellBg(val: number | null): string {
  if (val == null) return "text-white/20";
  if (val < 0) return "text-red-400";
  if (val > 150) return "text-amber-300";
  if (val > 80) return "text-white";
  return "text-white/70";
}

const LEGACY_PREFIX = "piloto_";

// ─── COMPONENT ────────────────────────────────────────────────────────────────

export function EconomyAdminPanel({ splits }: { splits: any[] }) {
  const [selectedSplitId, setSelectedSplitId] = useState(splits[0]?.id ?? "");
  const [circuits, setCircuits] = useState<CircuitoCol[]>([]);
  const [teams, setTeams] = useState<TeamRow[]>([]);
  const [pilots, setPilots] = useState<PilotRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showLegacy, setShowLegacy] = useState(false);

  useEffect(() => {
    if (selectedSplitId) loadData(selectedSplitId);
  }, [selectedSplitId]);

  async function loadData(splitId: string) {
    setLoading(true);
    try {
      // ── Circuitos: convertir Timestamp y ordenar cronológicamente ──────────
      const circSnap = await getDocs(collection(db, `splits/${splitId}/circuitos`));
      const rawCircs = circSnap.docs.map(d => {
        const data = d.data() as any;
        return {
          id: d.id,
          nombre: data.nombre || d.id,
          ts: toMs(data.fecha),
          orden: data.numero_carrera ?? 0,
          completado: !!data.completado,
          resultados: data.resultados
        };
      });
      // Prioridad: numero_carrera → fecha → id alfabético
      const sortedCircs = [...rawCircs].sort((a, b) => {
        if (a.orden && b.orden) return a.orden - b.orden;
        if (a.orden) return -1;
        if (b.orden) return 1;
        if (a.ts !== b.ts) return a.ts - b.ts;
        return a.id.localeCompare(b.id);
      });
      setCircuits(sortedCircs.map(c => ({ id: c.id, nombre: c.nombre, ts: c.ts })));

      // ── Pilotos y equipos ──────────────────────────────────────────────────
      const teamsSnap = await getDocs(collection(db, `splits/${splitId}/equipos`));
      const newTeams: TeamRow[] = [];
      const allPilots: PilotRow[] = [];

      for (const teamDoc of teamsSnap.docs) {
        const td = teamDoc.data() as any;
        newTeams.push({
          id: teamDoc.id, nombre: td.nombre || teamDoc.id,
          presupuesto: td.presupuesto ?? 0,
          puntos_constructores: td.puntos_constructores ?? 0,
          poles: 0, vueltas_rapidas: 0, sin_sanc: 0,
        });

        const pilotsSnap = await getDocs(collection(db, `splits/${splitId}/equipos/${teamDoc.id}/pilotos`));
        for (const pDoc of pilotsSnap.docs) {
          const pd = pDoc.data() as any;
          const hist: Record<string, { mantener: number | null; clausula: number | null }> = {};
          sortedCircs.forEach(c => {
            const h = pd.historial_precios?.[c.id];
            hist[c.id] = { mantener: h?.mantener ?? null, clausula: h?.clausula ?? null };
          });
          allPilots.push({
            id: pDoc.id,
            nombre: pd.nombre || pDoc.id,
            equipoId: teamDoc.id,
            equipoNombre: td.nombre || teamDoc.id,
            splitId,
            precio_compra_split: pd.precio_compra_split ?? 0,
            mantener_actual: pd.mantener_actual ?? 0,
            clausula_actual: pd.clausula_actual ?? 0,
            mantener_inicial_split: pd.mantener_inicial_split ?? 0,
            clausula_inicial_split: pd.clausula_inicial_split ?? 0,
            historial: hist,
            isLegacy: false, // marcado después
          });
        }
      }

      // Marcar pilotos legacy: en splits 2+, cualquier piloto con ID piloto_X
      // que tenga un duplicado por nombre en cualquier equipo del mismo split
      if (splitId !== "split_1") {
        const nombreSet = new Set(
          allPilots.filter(p => !p.id.startsWith(LEGACY_PREFIX)).map(p => p.nombre.toLowerCase().trim())
        );
        allPilots.forEach(p => {
          if (p.id.startsWith(LEGACY_PREFIX) && nombreSet.has(p.nombre.toLowerCase().trim())) {
            p.isLegacy = true;
          }
        });
      }

      // ── Agregar stats de circuitos: poles, vuelta rápida, sin sancionados ──
      const pilotTeam: Record<string, string> = {};
      allPilots.forEach(p => { pilotTeam[p.id] = p.equipoId; });

      for (const c of rawCircs) {
        if (!c.completado || !Array.isArray(c.resultados)) continue;
        const pole = c.resultados.find((r: any) => r.qualyPos === 1);
        const fl   = c.resultados.find((r: any) => r.fastestLap);
        const allClean = c.resultados.every((r: any) => r.isClean);

        if (pole) {
          const t = newTeams.find(t => t.id === pilotTeam[pole.pilotoId]);
          if (t) t.poles++;
        }
        if (fl) {
          const t = newTeams.find(t => t.id === pilotTeam[fl.pilotoId]);
          if (t) t.vueltas_rapidas++;
        }
        if (allClean) {
          const teamsInRace = new Set(c.resultados.map((r: any) => pilotTeam[r.pilotoId]).filter(Boolean));
          teamsInRace.forEach(tid => {
            const t = newTeams.find(t => t.id === tid);
            if (t) t.sin_sanc++;
          });
        }
      }

      setTeams(newTeams.sort((a, b) => a.nombre.localeCompare(b.nombre)));
      setPilots(allPilots.sort((a, b) => a.equipoNombre.localeCompare(b.equipoNombre) || a.nombre.localeCompare(b.nombre)));
    } finally {
      setLoading(false);
    }
  }

  async function savePrecio(pilot: PilotRow, rawVal: string) {
    const newPrecio = parseFloat(rawVal);
    if (isNaN(newPrecio)) return;
    setSavingId(pilot.id);
    const mantenerInicial = Math.round(newPrecio * 3 * 10) / 10;
    const clausulaInicial = Math.round(newPrecio * 2 * 10) / 10;
    await updateDoc(doc(db, `splits/${pilot.splitId}/equipos/${pilot.equipoId}/pilotos`, pilot.id), {
      precio_compra_split: newPrecio,
      mantener_actual: mantenerInicial,
      clausula_actual: clausulaInicial,
      mantener_inicial_split: mantenerInicial,
      clausula_inicial_split: clausulaInicial,
      precio_carrera_anterior: mantenerInicial,
      historial_precios: {},
    });
    setEditing(prev => { const n = { ...prev }; delete n[pilot.id]; return n; });
    await loadData(pilot.splitId);
    setSavingId(null);
  }

  async function deleteLegacy(pilot: PilotRow) {
    setDeletingId(pilot.id);
    await deleteDoc(doc(db, `splits/${pilot.splitId}/equipos/${pilot.equipoId}/pilotos`, pilot.id));
    await loadData(pilot.splitId);
    setDeletingId(null);
  }

  const visiblePilots = showLegacy ? pilots : pilots.filter(p => !p.isLegacy);
  const legacyCount = pilots.filter(p => p.isLegacy).length;

  const grouped = visiblePilots.reduce<Record<string, PilotRow[]>>((acc, p) => {
    (acc[p.equipoNombre] = acc[p.equipoNombre] || []).push(p);
    return acc;
  }, {});

  return (
    <div className="space-y-8">
      {/* Split selector */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-[10px] font-mono uppercase tracking-widest text-white/40">Split</span>
        {splits.map(s => (
          <button key={s.id} onClick={() => setSelectedSplitId(s.id)}
            className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all ${
              selectedSplitId === s.id ? "bg-[#e10600] text-white" : "bg-white/5 text-white/50 hover:bg-white/10"
            }`}
          >
            {s.nombre}
          </button>
        ))}
        {loading && <Loader2 className="w-4 h-4 animate-spin text-white/40" />}
        {legacyCount > 0 && (
          <button onClick={() => setShowLegacy(!showLegacy)}
            className={`ml-auto text-[10px] font-mono uppercase tracking-widest transition-colors ${
              showLegacy ? "text-red-400" : "text-white/30 hover:text-white/60"
            }`}
          >
            {showLegacy ? `Ocultar ${legacyCount} legacy` : `${legacyCount} pilotos legacy (piloto_X)`}
          </button>
        )}
      </div>

      {/* ── TABLA EQUIPOS ─────────────────────────────────────────────────── */}
      <div>
        <h3 className="text-[10px] font-mono uppercase tracking-widest text-white/40 mb-3">Resumen de Escuderías</h3>
        <div className="overflow-x-auto rounded-xl border border-white/5">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="text-[9px] uppercase tracking-[0.2em] text-white/30 bg-black/40">
                <th className="py-2.5 px-4 text-left font-normal">Escudería</th>
                <th className="py-2.5 px-4 text-right font-normal">Presupuesto</th>
                <th className="py-2.5 px-4 text-right font-normal">Pts Constr.</th>
                <th className="py-2.5 px-4 text-right font-normal">Poles</th>
                <th className="py-2.5 px-4 text-right font-normal">V. Rápidas</th>
                <th className="py-2.5 px-4 text-right font-normal">Sin Sanc.</th>
              </tr>
            </thead>
            <tbody>
              {teams.map((t, i) => (
                <tr key={t.id} className={`border-t border-white/5 ${i % 2 === 0 ? "bg-white/[0.01]" : ""}`}>
                  <td className="py-2.5 px-4 font-bold text-white">{t.nombre}</td>
                  <td className={`py-2.5 px-4 text-right font-mono font-bold ${t.presupuesto < 0 ? "text-red-400" : "text-amber-400"}`}>
                    {r1(t.presupuesto)}M
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono text-white/60">{t.puntos_constructores}</td>
                  <td className="py-2.5 px-4 text-right font-mono text-white/60">{t.poles}</td>
                  <td className="py-2.5 px-4 text-right font-mono text-white/60">{t.vueltas_rapidas}</td>
                  <td className="py-2.5 px-4 text-right font-mono text-white/60">{t.sin_sanc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── TABLA PILOTOS ─────────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center gap-3 mb-3">
          <h3 className="text-[10px] font-mono uppercase tracking-widest text-white/40">
            Evolución de Precios por Carrera
          </h3>
          <span className="text-white/20 text-[9px] font-mono">— clic en precio para editar</span>
        </div>

        <div className="overflow-x-auto rounded-xl border border-white/5">
          <table className="text-[10px] border-collapse font-mono min-w-full">
            <thead>
              <tr className="text-[9px] uppercase tracking-[0.12em] text-white/30 bg-black/40">
                <th className="py-2.5 px-3 text-left font-normal sticky left-0 bg-black/80 z-10 min-w-[110px]">Piloto</th>
                <th className="py-2.5 px-2 text-left font-normal min-w-[70px]">Equipo</th>
                <th className="py-2.5 px-2 text-right font-normal min-w-[90px]">Precio Compra</th>
                <th className="py-2.5 px-2 text-center font-normal min-w-[56px] text-white/20">Tipo</th>
                {circuits.map(c => (
                  <th key={c.id} className="py-2.5 px-2 text-right font-normal min-w-[62px] whitespace-nowrap">{c.nombre}</th>
                ))}
                <th className="py-2.5 px-2 text-right font-normal min-w-[64px]">Actual</th>
                {showLegacy && <th className="py-2.5 px-2 font-normal min-w-[40px]" />}
              </tr>
            </thead>
            <tbody>
              {Object.entries(grouped).map(([equipo, pilotList]) => (
                <>
                  {/* Equipo header */}
                  <tr key={`hdr-${equipo}`}>
                    <td colSpan={5 + circuits.length + (showLegacy ? 1 : 0)}
                      className="py-1.5 px-3 text-[9px] uppercase tracking-widest text-[#e10600]/70 font-bold bg-[#e10600]/5 border-y border-[#e10600]/10">
                      {equipo}
                    </td>
                  </tr>

                  {pilotList.map(pilot => {
                    const editVal = editing[pilot.id];
                    const isSaving = savingId === pilot.id;
                    const isDeleting = deletingId === pilot.id;
                    return (
                      <>
                        {/* Mantener row */}
                        <tr key={`m-${pilot.id}`}
                          className={`border-b border-white/[0.03] hover:bg-white/[0.02] ${pilot.isLegacy ? "opacity-40" : ""}`}>
                          <td className="py-1.5 px-3 sticky left-0 bg-zinc-950 font-bold text-white/90 truncate max-w-[110px]">
                            {pilot.nombre}
                            {pilot.isLegacy && <span className="ml-1 text-[8px] text-red-400/60">legacy</span>}
                          </td>
                          <td className="py-1.5 px-2 text-white/30 truncate max-w-[70px]">{equipo.slice(0, 8)}</td>
                          <td className="py-1.5 px-2 text-right">
                            {editVal !== undefined ? (
                              <div className="flex items-center justify-end gap-1">
                                <input type="number" step="0.1" value={editVal}
                                  onChange={e => setEditing(prev => ({ ...prev, [pilot.id]: e.target.value }))}
                                  className="w-16 bg-black/60 border border-amber-500/40 rounded px-1 py-0.5 text-right text-amber-400 outline-none text-[10px]"
                                />
                                <button disabled={isSaving} onClick={() => savePrecio(pilot, editVal)}
                                  className="text-emerald-400 hover:text-emerald-300 disabled:opacity-50">
                                  {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : "✓"}
                                </button>
                                <button onClick={() => setEditing(prev => { const n = { ...prev }; delete n[pilot.id]; return n; })}
                                  className="text-white/30 hover:text-white/60">✕</button>
                              </div>
                            ) : (
                              <span className="cursor-pointer text-white/50 hover:text-amber-400 transition-colors"
                                onClick={() => setEditing(prev => ({ ...prev, [pilot.id]: String(pilot.precio_compra_split) }))}>
                                {r1(pilot.precio_compra_split)}M ✎
                              </span>
                            )}
                          </td>
                          <td className="py-1.5 px-2 text-center text-white/25 text-[9px]">Mant.</td>
                          {circuits.map(c => (
                            <td key={c.id} className={`py-1.5 px-2 text-right ${cellBg(pilot.historial[c.id]?.mantener ?? null)}`}>
                              {r1(pilot.historial[c.id]?.mantener ?? null)}
                            </td>
                          ))}
                          <td className={`py-1.5 px-2 text-right font-bold ${cellBg(pilot.mantener_actual)}`}>
                            {r1(pilot.mantener_actual)}
                          </td>
                          {showLegacy && pilot.isLegacy && (
                            <td className="py-1.5 px-2">
                              <button disabled={isDeleting} onClick={() => deleteLegacy(pilot)}
                                className="text-red-500/60 hover:text-red-400 disabled:opacity-40 transition-colors">
                                {isDeleting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                              </button>
                            </td>
                          )}
                          {showLegacy && !pilot.isLegacy && <td />}
                        </tr>

                        {/* Cláusula row */}
                        <tr key={`c-${pilot.id}`}
                          className={`border-b border-white/[0.06] hover:bg-white/[0.01] ${pilot.isLegacy ? "opacity-40" : ""}`}>
                          <td className="py-1 px-3 sticky left-0 bg-zinc-950" />
                          <td className="py-1 px-2" />
                          <td className="py-1 px-2" />
                          <td className="py-1 px-2 text-center text-white/20 text-[9px] italic">Claus.</td>
                          {circuits.map(c => (
                            <td key={c.id} className={`py-1 px-2 text-right text-[9px] ${cellBg(pilot.historial[c.id]?.clausula ?? null)}`}>
                              {r1(pilot.historial[c.id]?.clausula ?? null)}
                            </td>
                          ))}
                          <td className={`py-1 px-2 text-right text-[9px] font-bold ${cellBg(pilot.clausula_actual)}`}>
                            {r1(pilot.clausula_actual)}
                          </td>
                          {showLegacy && <td />}
                        </tr>
                      </>
                    );
                  })}
                </>
              ))}
            </tbody>
          </table>
        </div>

        {visiblePilots.length === 0 && !loading && (
          <p className="text-xs text-white/30 font-mono mt-4 p-4">No hay pilotos en este split.</p>
        )}
      </div>
    </div>
  );
}
