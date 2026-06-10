import { useState } from "react";
import { db } from "../services/firebase";
import { collection, getDocs, deleteDoc, doc } from "firebase/firestore";
import {
  ChevronRight, ChevronDown, Trash2, Loader2,
  RefreshCw, AlertTriangle, Database, Search,
} from "lucide-react";

type DocEntry = { id: string; data: Record<string, any> };
interface CollState { docs: DocEntry[]; loaded: boolean; loading: boolean; open: boolean }

// Fields to show inline per collection type
const SUMMARY: Record<string, string[]> = {
  splits:      ["nombre", "activo", "fichajes_abiertos"],
  equipos:     ["nombre", "presupuesto", "puntos_constructores"],
  roster:      ["nombre", "equipoId", "puntos_piloto", "precio_compra", "congelado", "pending_equipoId"],
  circuitos:   ["nombre", "completado", "fecha", "acta_cerrada"],
  transfers:   ["tipo", "timestamp"],
  usuarios:    ["nombre", "email", "rol", "escuderia_id"],
  plantilla:   ["nombre", "rol"],
  pilotos:     ["nombre", "rating_piloto"],
  suggestions: ["titulo", "estado"],
};

const SPLIT_SUBS = ["equipos", "circuitos", "transfers"];

function fmtVal(val: any): string {
  if (val == null) return "—";
  if (typeof val === "boolean") return val ? "✓" : "✗";
  if (typeof val === "string") return val.length > 56 ? val.slice(0, 53) + "…" : val;
  if (Array.isArray(val)) return `[${val.length}]`;
  if (typeof val === "object") {
    const k = Object.keys(val);
    return k.length === 0 ? "{}" : `{${k.slice(0, 3).join(",")}${k.length > 3 ? "…" : ""}}`;
  }
  return String(val);
}

function matches(d: DocEntry, f: string) {
  if (!f) return true;
  const fl = f.toLowerCase();
  if (d.id.toLowerCase().includes(fl)) return true;
  return Object.values(d.data).some(v =>
    typeof v === "string" ? v.toLowerCase().includes(fl) :
    typeof v === "number" ? String(v).includes(fl) : false
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function DatabaseExplorer() {
  const [coll, setColl] = useState<Record<string, CollState>>({});
  const [openDocs, setOpenDocs] = useState<Set<string>>(new Set());
  const [confirmDel, setConfirmDel] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const [orphans, setOrphans] = useState<{
    rosterOrphans: Array<{ splitId: string; pid: string; nombre: string; issue: string }>;
    unrostedPilots: Array<{ id: string; nombre: string; email: string }>;
  } | null>(null);
  const [orphanLoading, setOrphanLoading] = useState(false);

  // ─── State helpers ──────────────────────────────────────────────────────────

  const getState = (path: string): CollState =>
    coll[path] ?? { docs: [], loaded: false, loading: false, open: false };

  const loadColl = async (path: string) => {
    setColl(p => ({ ...p, [path]: { docs: p[path]?.docs ?? [], loaded: false, loading: true, open: true } }));
    try {
      const snap = await getDocs(collection(db, path));
      setColl(p => ({
        ...p,
        [path]: { docs: snap.docs.map(d => ({ id: d.id, data: d.data() })), loaded: true, loading: false, open: true }
      }));
    } catch {
      setColl(p => ({ ...p, [path]: { docs: [], loaded: true, loading: false, open: true } }));
    }
  };

  const toggleColl = (path: string) => {
    const s = getState(path);
    if (!s.loaded && !s.loading) { loadColl(path); return; }
    setColl(p => ({ ...p, [path]: { ...p[path], open: !p[path].open } }));
  };

  const toggleDoc = (key: string) =>
    setOpenDocs(p => { const n = new Set(p); n.has(key) ? n.delete(key) : n.add(key); return n; });

  const handleDelete = async (collPath: string, docId: string) => {
    const key = `${collPath}/${docId}`;
    if (confirmDel !== key) {
      setConfirmDel(key);
      setTimeout(() => setConfirmDel(c => c === key ? null : c), 3000);
      return;
    }
    setDeleting(key);
    setConfirmDel(null);
    try {
      await deleteDoc(doc(db, collPath, docId));
      setColl(p => ({
        ...p,
        [collPath]: { ...p[collPath], docs: p[collPath].docs.filter(d => d.id !== docId) }
      }));
    } finally {
      setDeleting(null);
    }
  };

  // ─── Orphan analysis ────────────────────────────────────────────────────────

  const runOrphanCheck = async () => {
    setOrphanLoading(true);
    try {
      const [pilotosSnap, usuariosSnap, plantillaSnap, splitsSnap] = await Promise.all([
        getDocs(collection(db, "pilotos")),
        getDocs(collection(db, "usuarios")),
        getDocs(collection(db, "plantilla")),
        getDocs(collection(db, "splits")),
      ]);

      const pilotoIds = new Set(pilotosSnap.docs.map(d => d.id));
      const usuarioIds = new Set(usuariosSnap.docs.map(d => d.id));
      const plantillaIds = new Set(plantillaSnap.docs.map(d => d.id));

      const rosterOrphans: Array<{ splitId: string; pid: string; nombre: string; issue: string }> = [];
      const allRosterPilotIds = new Set<string>();

      for (const splitDoc of splitsSnap.docs) {
        const equiposSnap = await getDocs(collection(db, `splits/${splitDoc.id}/equipos`));
        for (const equipoDoc of equiposSnap.docs) {
          const pilotosSnap = await getDocs(collection(db, `splits/${splitDoc.id}/equipos/${equipoDoc.id}/pilotos`));
          for (const r of pilotosSnap.docs) {
            allRosterPilotIds.add(r.id);
            const issues: string[] = [];
            if (!pilotoIds.has(r.id)) issues.push("falta en pilotos/");
            if (!usuarioIds.has(r.id) && !plantillaIds.has(r.id)) issues.push("falta en usuarios/ y plantilla/");
            if (issues.length) {
              rosterOrphans.push({ splitId: splitDoc.id, pid: r.id, nombre: r.data().nombre || r.id, issue: issues.join(" · ") });
            }
          }
        }
      }

      const unrostedPilots = usuariosSnap.docs
        .filter(u => {
          const d = u.data();
          if (d.rol !== "piloto") return false;
          return !allRosterPilotIds.has(u.id) && (!d.piloto_id || !allRosterPilotIds.has(d.piloto_id));
        })
        .map(u => ({ id: u.id, nombre: u.data().nombre || u.id, email: u.data().email || "" }));

      setOrphans({ rosterOrphans, unrostedPilots });
    } finally {
      setOrphanLoading(false);
    }
  };

  // ─── Render helpers ─────────────────────────────────────────────────────────

  const renderDocDetail = (entry: DocEntry) => (
    <div className="ml-7 px-3 pb-2 pt-1 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-5 gap-y-0.5 bg-black/20 border-l border-[#e10600]/10">
      {Object.entries(entry.data).map(([k, v]) => (
        <div key={k} className="flex gap-1.5 items-baseline min-w-0">
          <span className="text-[8px] font-mono text-white/20 shrink-0">{k}:</span>
          <span className="text-[9px] font-mono text-white/55 truncate" title={typeof v === "string" ? v : JSON.stringify(v)}>
            {fmtVal(v)}
          </span>
        </div>
      ))}
      {Object.keys(entry.data).length === 0 && (
        <span className="text-[9px] font-mono text-white/15 col-span-4">vacío</span>
      )}
    </div>
  );

  const renderDocRow = (collPath: string, entry: DocEntry, indent = 0) => {
    const type = collPath.split("/").pop() ?? "";
    const summaryFields = SUMMARY[type] ?? [];
    const docKey = `${collPath}/${entry.id}`;
    const isOpen = openDocs.has(docKey);
    const isConfirm = confirmDel === docKey;
    const isDel = deleting === docKey;
    const pl = 12 + indent * 16;

    return (
      <div key={docKey} className="border-b border-white/[0.025] last:border-0">
        <div className="flex items-center gap-1.5 py-1 hover:bg-white/[0.02] group" style={{ paddingLeft: `${pl}px`, paddingRight: "8px" }}>
          <button onClick={() => toggleDoc(docKey)} className="shrink-0 text-white/20 hover:text-white/50">
            {isOpen ? <ChevronDown className="w-2.5 h-2.5" /> : <ChevronRight className="w-2.5 h-2.5" />}
          </button>
          <span className="text-[9px] font-mono text-[#e10600]/60 w-40 shrink-0 truncate" title={entry.id}>{entry.id}</span>
          <div className="flex flex-1 flex-wrap gap-x-4 gap-y-0 min-w-0 overflow-hidden">
            {summaryFields.map(f => (
              <span key={f} className="text-[9px] font-mono whitespace-nowrap">
                <span className="text-white/20">{f}: </span>
                <span className={
                  entry.data[f] === true ? "text-green-400/70" :
                  entry.data[f] === false ? "text-red-400/50" :
                  "text-white/55"
                }>
                  {fmtVal(entry.data[f])}
                </span>
              </span>
            ))}
          </div>
          <button
            onClick={() => handleDelete(collPath, entry.id)}
            disabled={isDel}
            className={`ml-1 shrink-0 flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-mono transition-all ${
              isConfirm
                ? "opacity-100 bg-[#e10600]/15 text-[#e10600]/80 border border-[#e10600]/30"
                : "opacity-0 group-hover:opacity-100 text-white/20 hover:text-red-400/80"
            }`}
          >
            {isDel ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <Trash2 className="w-2.5 h-2.5" />}
            {isConfirm && <span>¿borrar?</span>}
          </button>
        </div>
        {isOpen && renderDocDetail(entry)}
      </div>
    );
  };

  const renderCollHeader = (path: string, label: string, indent = 0) => {
    const s = getState(path);
    const filtered = s.docs.filter(d => matches(d, filter));
    const pl = 12 + indent * 16;

    return (
      <div
        className="flex items-center gap-2 py-1.5 hover:bg-white/[0.015] group cursor-pointer border-b border-white/[0.03]"
        style={{ paddingLeft: `${pl}px`, paddingRight: "8px" }}
        onClick={() => toggleColl(path)}
      >
        <span className="shrink-0 text-white/25">
          {s.loading
            ? <Loader2 className="w-3 h-3 animate-spin text-amber-400/70" />
            : s.open
              ? <ChevronDown className="w-3 h-3" />
              : <ChevronRight className="w-3 h-3" />}
        </span>
        <span className="text-[10px] font-mono font-bold text-white/65">{label}</span>
        {s.loaded && (
          <span className="text-[9px] font-mono text-white/25">
            ({filter && filtered.length !== s.docs.length ? `${filtered.length}/` : ""}{s.docs.length})
          </span>
        )}
        {s.loaded && (
          <button
            onClick={e => { e.stopPropagation(); loadColl(path); }}
            className="ml-auto opacity-0 group-hover:opacity-100 text-white/20 hover:text-white/60 p-0.5 transition-opacity"
            title="Recargar"
          >
            <RefreshCw className="w-2.5 h-2.5" />
          </button>
        )}
      </div>
    );
  };

  const renderPlainCollection = (path: string, indent = 0) => {
    const s = getState(path);
    const label = path.split("/").pop() + "/";
    const filtered = s.docs.filter(d => matches(d, filter));
    const pl = 12 + indent * 16;

    return (
      <div key={path}>
        {renderCollHeader(path, label, indent)}
        {s.open && s.loaded && (
          <div>
            {filtered.length === 0
              ? <p className="text-[9px] font-mono text-white/15 py-1.5" style={{ paddingLeft: `${pl + 16}px` }}>
                  {s.docs.length === 0 ? "Sin documentos" : "Sin resultados"}
                </p>
              : filtered.map(d => renderDocRow(path, d, indent + 1))}
          </div>
        )}
      </div>
    );
  };

  // ─── Split section (special: shows sub-collections nested) ──────────────────

  const renderSplitNode = (splitEntry: DocEntry) => {
    const splitKey = `__split__${splitEntry.id}`;
    const isOpen = openDocs.has(splitKey);
    const isConfirm = confirmDel === `splits/${splitEntry.id}`;
    const isDel = deleting === `splits/${splitEntry.id}`;

    return (
      <div key={splitEntry.id} className="border-b border-white/[0.025] last:border-0">
        <div className="flex items-center gap-1.5 py-1 hover:bg-white/[0.02] group pl-7 pr-2">
          <button onClick={() => toggleDoc(splitKey)} className="shrink-0 text-white/20 hover:text-white/50">
            {isOpen ? <ChevronDown className="w-2.5 h-2.5" /> : <ChevronRight className="w-2.5 h-2.5" />}
          </button>
          <span className="text-[9px] font-mono text-[#e10600]/60 w-20 shrink-0">{splitEntry.id}</span>
          <div className="flex flex-1 gap-4 flex-wrap min-w-0">
            {(SUMMARY.splits ?? []).map(f => (
              <span key={f} className="text-[9px] font-mono whitespace-nowrap">
                <span className="text-white/20">{f}: </span>
                <span className={
                  splitEntry.data[f] === true ? "text-green-400/70" :
                  splitEntry.data[f] === false ? "text-red-400/50" :
                  "text-white/55"
                }>
                  {fmtVal(splitEntry.data[f])}
                </span>
              </span>
            ))}
          </div>
          <button
            onClick={() => handleDelete("splits", splitEntry.id)}
            disabled={isDel}
            className={`ml-1 shrink-0 flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-mono transition-all ${
              isConfirm ? "opacity-100 bg-[#e10600]/15 text-[#e10600]/80 border border-[#e10600]/30" : "opacity-0 group-hover:opacity-100 text-white/20 hover:text-red-400/80"
            }`}
          >
            {isDel ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <Trash2 className="w-2.5 h-2.5" />}
            {isConfirm && <span>¿borrar?</span>}
          </button>
        </div>

        {isOpen && (
          <div className="border-l border-[#e10600]/10 ml-8">
            {/* Raw doc fields */}
            <div className="px-3 py-1.5 grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-0.5 bg-black/15 border-b border-white/[0.03]">
              {Object.entries(splitEntry.data).map(([k, v]) => (
                <div key={k} className="flex gap-1.5 items-baseline min-w-0">
                  <span className="text-[8px] font-mono text-white/20 shrink-0">{k}:</span>
                  <span className="text-[9px] font-mono text-white/45 truncate" title={typeof v === "string" ? v : JSON.stringify(v)}>
                    {fmtVal(v)}
                  </span>
                </div>
              ))}
            </div>
            {/* Sub-collections */}
            {SPLIT_SUBS.map(sub => renderPlainCollection(`splits/${splitEntry.id}/${sub}`, 1))}
          </div>
        )}
      </div>
    );
  };

  const renderSplitsSection = () => {
    const s = getState("splits");
    const filtered = s.docs.filter(d => matches(d, filter));

    return (
      <div>
        {renderCollHeader("splits", "splits/", 0)}
        {s.open && s.loaded && (
          <div>
            {filtered.length === 0
              ? <p className="text-[9px] font-mono text-white/15 py-1.5 pl-8">Sin splits</p>
              : filtered.map(renderSplitNode)}
          </div>
        )}
      </div>
    );
  };

  // ─── Orphan analysis panel ──────────────────────────────────────────────────

  const renderOrphanPanel = () => (
    <div className="border border-white/[0.07] bg-[#080808]">
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/[0.04]">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-3 h-3 text-amber-400/70" />
          <span className="text-[10px] font-mono font-bold text-white/60 uppercase tracking-wider">Análisis de inconsistencias</span>
          <span className="text-[9px] font-mono text-white/20">— cruza roster ↔ pilotos ↔ usuarios</span>
        </div>
        <button
          onClick={runOrphanCheck}
          disabled={orphanLoading}
          className="px-2.5 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-400/80 text-[9px] font-mono uppercase tracking-wider hover:bg-amber-500/20 transition-colors flex items-center gap-1.5 disabled:opacity-50"
        >
          {orphanLoading ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <RefreshCw className="w-2.5 h-2.5" />}
          Analizar
        </button>
      </div>

      {!orphans && !orphanLoading && (
        <p className="text-[9px] font-mono text-white/15 px-3 py-2">
          Pulsa Analizar para detectar docs huérfanos y pilotos sin roster.
        </p>
      )}

      {orphans && (
        <div className="p-3 space-y-4">
          {/* Roster orphans */}
          <div>
            <p className="text-[9px] font-mono text-white/30 uppercase tracking-wider mb-1.5">
              Entradas en roster sin doc en pilotos/ o usuarios/ ({orphans.rosterOrphans.length})
            </p>
            {orphans.rosterOrphans.length === 0
              ? <p className="text-[9px] font-mono text-green-400/60 pl-2">✓ Sin huérfanos</p>
              : orphans.rosterOrphans.map((o, i) => (
                <div key={i} className="flex items-center gap-3 px-2 py-1 bg-amber-500/5 border-b border-amber-500/[0.06] text-[9px] font-mono">
                  <span className="text-amber-400/60 w-16 shrink-0">{o.splitId}</span>
                  <span className="text-white/45 w-40 shrink-0 truncate" title={o.pid}>{o.pid}</span>
                  <span className="text-white/70 w-24 shrink-0">{o.nombre}</span>
                  <span className="text-amber-400/50">{o.issue}</span>
                </div>
              ))
            }
          </div>

          {/* Unrosted pilots */}
          <div>
            <p className="text-[9px] font-mono text-white/30 uppercase tracking-wider mb-1.5">
              Pilotos (usuarios/) sin roster en ningún split ({orphans.unrostedPilots.length})
            </p>
            {orphans.unrostedPilots.length === 0
              ? <p className="text-[9px] font-mono text-green-400/60 pl-2">✓ Todos tienen roster</p>
              : orphans.unrostedPilots.map((o, i) => (
                <div key={i} className="flex items-center gap-3 px-2 py-1 bg-white/[0.02] border-b border-white/[0.03] text-[9px] font-mono">
                  <span className="text-white/40 w-40 shrink-0 truncate" title={o.id}>{o.id}</span>
                  <span className="text-white/70 w-28 shrink-0">{o.nombre}</span>
                  <span className="text-white/30">{o.email}</span>
                </div>
              ))
            }
          </div>
        </div>
      )}
    </div>
  );


  // ─── Root render ─────────────────────────────────────────────────────────────

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Database className="w-3.5 h-3.5 text-[#e10600]" />
          <span className="text-[10px] font-mono font-black uppercase tracking-widest text-white/70">
            Explorer de base de datos
          </span>
          <span className="text-[9px] font-mono text-white/20 hidden sm:block">
            — clic para cargar · clic papelera = confirmar · 2º clic = borrar
          </span>
        </div>
        <div className="relative">
          <Search className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-white/25 pointer-events-none" />
          <input
            type="text"
            placeholder="Filtrar docs…"
            value={filter}
            onChange={e => setFilter(e.target.value)}
            className="bg-white/[0.03] border border-white/10 pl-6 pr-3 py-1 text-[10px] font-mono text-white outline-none focus:border-[#e10600]/60 w-44"
          />
        </div>
      </div>

      {/* Collection tree */}
      <div className="border border-white/[0.07] bg-[#080808]">
        {renderSplitsSection()}
        {["usuarios", "plantilla", "pilotos", "suggestions"].map(p => renderPlainCollection(p, 0))}
      </div>

      {/* Orphan analysis */}
      {renderOrphanPanel()}

    </div>
  );
}
