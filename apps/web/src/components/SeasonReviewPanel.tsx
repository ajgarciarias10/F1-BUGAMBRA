import { useMemo, useState } from "react";
import { GoogleAuthProvider, linkWithPopup, reauthenticateWithPopup } from "firebase/auth";
import { collection, doc, setDoc } from "firebase/firestore";
import { Check, FileSpreadsheet, Loader2, MousePointer2, Save, ShieldCheck } from "lucide-react";
import { auth, db } from "../services/firebase";

type Sheet = { properties: { sheetId: number; title: string; gridProperties?: { rowCount?: number; columnCount?: number } }; data?: Array<{ rowData?: Array<{ values?: Array<{ formattedValue?: string; effectiveValue?: Record<string, unknown> }> }> }> };
type Cell = { row: number; column: number; value: string };
type Selection = { start: Cell; end: Cell };

const FIELD_OPTIONS = [
  ["pilotos", "Pilotos"],
  ["circuitos", "Circuitos"],
  ["equipos", "Equipos de temporada"],
  ["equipoPiloto", "Equipo de cada piloto"],
  ["puntuacionPilotoCircuito", "Puntuación piloto por circuito"],
  ["puntuacionTotalPiloto", "Puntuación total de piloto"],
  ["puntuacionEquipoCircuito", "Puntuación equipo por circuito"],
  ["puntuacionTotalEquipo", "Puntuación total de equipo"],
  ["economia", "Economía"],
] as const;

const columnName = (index: number) => {
  let name = "";
  let value = index + 1;
  while (value > 0) {
    const remainder = (value - 1) % 26;
    name = String.fromCharCode(65 + remainder) + name;
    value = Math.floor((value - 1) / 26);
  }
  return name;
};

const parseSpreadsheetId = (url: string) => url.match(/\/spreadsheets\/d\/([^/]+)/)?.[1] || "";

export function SeasonReviewPanel({ splits }: { splits: any[] }) {
  const [url, setUrl] = useState("https://docs.google.com/spreadsheets/d/1htpqPEtKNDxAadBAP_OlxX1JlzFG4LwiLxtOyxQo3Zc/edit");
  const [seasonId, setSeasonId] = useState(splits.find(split => split.id === "origins")?.id || splits[0]?.id || "origins");
  const [sheets, setSheets] = useState<Sheet[]>([]);
  const [activeSheetId, setActiveSheetId] = useState<number | null>(null);
  const [grid, setGrid] = useState<Cell[][]>([]);
  const [token, setToken] = useState("");
  const [field, setField] = useState<(typeof FIELD_OPTIONS)[number][0]>("pilotos");
  const [selection, setSelection] = useState<Selection | null>(null);
  const [mappings, setMappings] = useState<Record<string, { sheetId: number; range: string; preview: string[] }>>({});
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [dragging, setDragging] = useState(false);

  const activeSheet = sheets.find(sheet => sheet.properties.sheetId === activeSheetId);
  const selectedRange = useMemo(() => {
    if (!selection) return null;
    const top = Math.min(selection.start.row, selection.end.row);
    const bottom = Math.max(selection.start.row, selection.end.row);
    const left = Math.min(selection.start.column, selection.end.column);
    const right = Math.max(selection.start.column, selection.end.column);
    const values = grid.slice(top, bottom + 1).map(row => row.slice(left, right + 1).map(cell => cell.value));
    return { top, bottom, left, right, values, range: `${columnName(left)}${top + 1}:${columnName(right)}${bottom + 1}` };
  }, [grid, selection]);

  const connectGoogle = async () => {
    if (!auth.currentUser) throw new Error("La sesión de administración no está disponible.");
    const provider = new GoogleAuthProvider();
    provider.addScope("https://www.googleapis.com/auth/spreadsheets.readonly");
    provider.setCustomParameters({ prompt: "consent", login_hint: auth.currentUser.email || "" });
    const result = auth.currentUser.providerData.some(item => item.providerId === "google.com")
      ? await reauthenticateWithPopup(auth.currentUser, provider)
      : await linkWithPopup(auth.currentUser, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) throw new Error("Google no devolvió un token de lectura de Sheets.");
    setToken(credential.accessToken);
    return credential.accessToken;
  };

  const loadSpreadsheet = async () => {
    setBusy(true);
    setMessage("");
    try {
      const spreadsheetId = parseSpreadsheetId(url);
      if (!spreadsheetId) throw new Error("Introduce un enlace válido de Google Sheets.");
      const accessToken = token || await connectGoogle();
      const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?includeGridData=true`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!response.ok) {
        let apiError: any = null;
        try { apiError = await response.json(); } catch { /* La respuesta puede no ser JSON. */ }
        const reason = apiError?.error?.errors?.[0]?.reason;
        if (reason === "accessNotConfigured" || apiError?.error?.status === "PERMISSION_DENIED" && String(apiError?.error?.message).includes("API has not been used")) {
          throw new Error("La API de Google Sheets no está habilitada en el proyecto Firebase. Actívala en Google Cloud y vuelve a intentarlo.");
        }
        if (response.status === 403) throw new Error("La cuenta Google autenticada no tiene acceso de lectura a este documento o el permiso Sheets no fue concedido.");
        if (response.status === 404) throw new Error("No se encontró el documento. Comprueba que el enlace sea correcto.");
        throw new Error(apiError?.error?.message || "No se pudo leer el documento.");
      }
      const data = await response.json();
      const nextSheets: Sheet[] = data.sheets || [];
      setSheets(nextSheets);
      if (nextSheets[0]) selectSheet(nextSheets[0], data);
      setMessage(`Documento conectado: ${nextSheets.length} hojas disponibles.`);
    } catch (error: any) {
      setMessage(error.message || "No se pudo conectar con Google Sheets.");
    } finally {
      setBusy(false);
    }
  };

  const selectSheet = (sheet: Sheet, spreadsheetData?: any) => {
    const source = spreadsheetData?.sheets?.find((item: Sheet) => item.properties.sheetId === sheet.properties.sheetId) || sheet;
    const rows = source.data?.[0]?.rowData || [];
    const width = Math.max(1, source.properties.gridProperties?.columnCount || 30, ...rows.map((row: any) => row.values?.length || 0));
    const nextGrid = rows.map((row: any, rowIndex: number) => Array.from({ length: width }, (_, column) => ({
      row: rowIndex,
      column,
      value: row.values?.[column]?.formattedValue || "",
    })));
    setActiveSheetId(sheet.properties.sheetId);
    setGrid(nextGrid);
    setSelection(null);
  };

  const saveSelection = async () => {
    if (!selectedRange || activeSheetId == null) return;
    const nextMappings = { ...mappings, [field]: { sheetId: activeSheetId, range: selectedRange.range, preview: selectedRange.values.slice(0, 3).map(row => row.join(" | ")) } };
    setMappings(nextMappings);
    await setDoc(doc(collection(db, "admin_excel_mappings"), seasonId), { seasonId, spreadsheetUrl: url, mappings: nextMappings, updatedAt: new Date().toISOString() }, { merge: true });
    setMessage(`Rango ${selectedRange.range} guardado para ${FIELD_OPTIONS.find(item => item[0] === field)?.[1]}.`);
  };

  return (
    <section className="space-y-5">
      <div className="border border-white/10 bg-white/[0.03] p-5 rounded-sm">
        <div className="flex items-start gap-3 mb-5">
          <div className="p-2 bg-emerald-500/10 text-emerald-300"><FileSpreadsheet className="w-5 h-5" /></div>
          <div><h2 className="font-black uppercase tracking-tight text-lg">Revisión de temporadas</h2><p className="text-xs text-white/45 mt-1">Lee el Excel original y configura los rangos sin modificarlo.</p></div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-[180px_1fr_auto] gap-3">
          <select value={seasonId} onChange={event => setSeasonId(event.target.value)} className="bg-black/30 border border-white/10 px-3 py-2 text-xs text-white">
            <option value="origins">Origins</option>
            {splits.filter(split => split.id !== "origins").map(split => <option key={split.id} value={split.id}>{split.nombre}</option>)}
          </select>
          <input value={url} onChange={event => setUrl(event.target.value)} className="bg-black/30 border border-white/10 px-3 py-2 text-xs text-white" placeholder="Enlace de Google Sheets" />
          <button onClick={loadSpreadsheet} disabled={busy} className="inline-flex items-center justify-center gap-2 bg-[#e10600] px-4 py-2 text-[10px] font-black uppercase tracking-wider disabled:opacity-50">{busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />} Conectar en lectura</button>
        </div>
        {message && <p className="mt-3 text-xs text-emerald-300">{message}</p>}
      </div>

      {sheets.length > 0 && <div className="border border-white/10 bg-white/[0.02] rounded-sm overflow-hidden">
        <div className="flex gap-1 overflow-x-auto p-2 border-b border-white/10 bg-black/20">{sheets.map(sheet => <button key={sheet.properties.sheetId} onClick={() => selectSheet(sheet)} className={`shrink-0 px-3 py-2 text-[10px] uppercase font-black ${activeSheetId === sheet.properties.sheetId ? "bg-emerald-600 text-white" : "text-white/45 hover:bg-white/5"}`}>{sheet.properties.title}</button>)}</div>
        <div className="p-3 border-b border-white/10 flex flex-wrap items-center gap-2">
          <MousePointer2 className="w-4 h-4 text-emerald-300" />
          <span className="text-[10px] uppercase tracking-wider text-white/45">Selecciona un rango para:</span>
          <select value={field} onChange={event => setField(event.target.value as typeof field)} className="bg-black/40 border border-white/10 px-2 py-1.5 text-[10px] text-white">{FIELD_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
          <span className="text-[10px] font-mono text-emerald-300">{selectedRange?.range || "sin selección"}</span>
          <button onClick={saveSelection} disabled={!selectedRange} className="ml-auto inline-flex items-center gap-1.5 border border-emerald-500/30 text-emerald-300 px-3 py-1.5 text-[10px] uppercase font-black disabled:opacity-30"><Save className="w-3.5 h-3.5" /> Guardar rango</button>
        </div>
        <div className="overflow-auto max-h-[620px]" onMouseUp={() => setDragging(false)}>
          <table className="border-collapse text-[11px] font-mono"><thead className="sticky top-0 z-10 bg-zinc-900"><tr><th className="sticky left-0 z-20 min-w-12 border border-white/10 bg-zinc-900" />{(grid[0] || []).map(cell => <th key={cell.column} className="min-w-24 border border-white/10 px-2 py-1 text-white/35">{columnName(cell.column)}</th>)}</tr></thead><tbody>{grid.map((row, rowIndex) => <tr key={rowIndex}><th className="sticky left-0 z-10 border border-white/10 bg-zinc-900 px-2 text-white/35">{rowIndex + 1}</th>{row.map(cell => { const selected = selectedRange && cell.row >= selectedRange.top && cell.row <= selectedRange.bottom && cell.column >= selectedRange.left && cell.column <= selectedRange.right; return <td key={cell.column} onMouseDown={() => { setDragging(true); setSelection({ start: cell, end: cell }); }} onMouseEnter={() => { if (dragging) setSelection(current => current ? { ...current, end: cell } : null); }} className={`border border-white/10 px-2 py-1.5 whitespace-nowrap cursor-crosshair ${selected ? "bg-emerald-500/30 text-white ring-1 ring-inset ring-emerald-400" : "text-white/65 hover:bg-white/10"}`}>{cell.value}</td>; })}</tr>)}</tbody></table>
        </div>
      </div>}

      {Object.keys(mappings).length > 0 && <div className="border border-white/10 p-4"><h3 className="text-xs font-black uppercase tracking-wider mb-3">Mapeo guardado</h3><div className="grid grid-cols-1 md:grid-cols-2 gap-2">{Object.entries(mappings).map(([key, value]) => <div key={key} className="flex items-center justify-between bg-white/[0.03] px-3 py-2 text-[10px]"><span className="text-white/60">{FIELD_OPTIONS.find(item => item[0] === key)?.[1]}</span><span className="font-mono text-emerald-300">{value.range} <Check className="inline w-3 h-3" /></span></div>)}</div></div>}
    </section>
  );
}
