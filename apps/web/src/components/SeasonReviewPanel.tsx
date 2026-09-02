import { useEffect, useMemo, useState } from "react";
import { GoogleAuthProvider, linkWithPopup, reauthenticateWithPopup } from "firebase/auth";
import { collection, doc, getDoc, getDocs, setDoc, writeBatch } from "firebase/firestore";
import { Check, FileSpreadsheet, Loader2, MousePointer2, Save, ShieldCheck, X } from "lucide-react";
import { auth, db } from "../services/firebase";

type Sheet = { properties: { sheetId: number; title: string; gridProperties?: { rowCount?: number; columnCount?: number } }; data?: Array<{ rowData?: Array<{ values?: Array<{ formattedValue?: string; effectiveValue?: Record<string, unknown> }> }> }> };
type Cell = { row: number; column: number; value: string };
type Selection = { start: Cell; end: Cell };
type MappingEntry = { sheetId: number; range: string; preview: string[] };

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

const ORIGINS_FIELDS = FIELD_OPTIONS.filter(([value]) =>
  !["equipoPiloto", "economia"].includes(value)
);

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

const parseCell = (value: string) => {
  const match = value.match(/^([A-Z]+)(\d+)$/i);
  if (!match) throw new Error(`Celda inválida: ${value}`);
  const column = match[1].toUpperCase().split("").reduce((total, character) => total * 26 + character.charCodeAt(0) - 64, 0) - 1;
  return { row: Number(match[2]) - 1, column };
};

const rangeBounds = (range: string) => {
  const [start, end = start] = range.split(":");
  const first = parseCell(start);
  const last = parseCell(end);
  return { top: Math.min(first.row, last.row), bottom: Math.max(first.row, last.row), left: Math.min(first.column, last.column), right: Math.max(first.column, last.column) };
};

const rangesOverlap = (first: string, second: string) => {
  const a = rangeBounds(first);
  const b = rangeBounds(second);
  return a.left <= b.right && a.right >= b.left && a.top <= b.bottom && a.bottom >= b.top;
};

export function SeasonReviewPanel({ splits }: { splits: any[] }) {
  const [url, setUrl] = useState("https://docs.google.com/spreadsheets/d/1htpqPEtKNDxAadBAP_OlxX1JlzFG4LwiLxtOyxQo3Zc/edit");
  const [seasonId, setSeasonId] = useState(splits.find(split => split.id === "origins")?.id || splits[0]?.id || "origins");
  const [sheets, setSheets] = useState<Sheet[]>([]);
  const [sheetGrids, setSheetGrids] = useState<Record<number, Cell[][]>>({});
  const [activeSheetId, setActiveSheetId] = useState<number | null>(null);
  const [grid, setGrid] = useState<Cell[][]>([]);
  const [token, setToken] = useState("");
  const [field, setField] = useState<(typeof FIELD_OPTIONS)[number][0]>("pilotos");
  const [selection, setSelection] = useState<Selection | null>(null);
  const [mappings, setMappings] = useState<Record<string, MappingEntry[]>>({});
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [dragging, setDragging] = useState(false);
  const [importing, setImporting] = useState(false);
  const visibleFieldOptions = seasonId === "origins" ? ORIGINS_FIELDS : FIELD_OPTIONS;

  useEffect(() => {
    if (!visibleFieldOptions.some(([value]) => value === field)) {
      setField(visibleFieldOptions[0][0]);
    }
  }, [field, visibleFieldOptions]);

  useEffect(() => {
    let cancelled = false;
    getDoc(doc(db, "admin_excel_mappings", seasonId)).then(snapshot => {
      if (cancelled) return;
      const data = snapshot.data();
      if (data?.mappings) {
        const normalized = Object.fromEntries(Object.entries(data.mappings).map(([key, value]) => [
          key,
          Array.isArray(value) ? value : [value],
        ])) as Record<string, MappingEntry[]>;
        setMappings(normalized);
      }
      if (data?.spreadsheetUrl) setUrl(data.spreadsheetUrl);
    }).catch(() => {
      if (!cancelled) setMappings({});
    });
    return () => { cancelled = true; };
  }, [seasonId]);

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
    setSheetGrids(current => ({ ...current, [sheet.properties.sheetId]: nextGrid }));
    setSelection(null);
  };

  const importOrigins = async () => {
    setImporting(true);
    setMessage("");
    try {
      if (seasonId !== "origins") throw new Error("La importación de Origins solo puede ejecutarse con la temporada Origins seleccionada.");
      const requiredFields = ["pilotos", "circuitos", "equipos", "puntuacionPilotoCircuito", "puntuacionTotalPiloto", "puntuacionTotalEquipo"];
      const missing = requiredFields.filter(key => !mappings[key]?.length);
      if (missing.length) throw new Error(`Faltan rangos obligatorios: ${missing.join(", ")}.`);
      const readEntries = (key: string) => (mappings[key] || []).flatMap(entry => {
        const source = sheetGrids[entry.sheetId];
        if (!source) throw new Error(`La hoja del rango ${entry.range} no está cargada. Vuelve a conectar el documento.`);
        const bounds = rangeBounds(entry.range);
        return source.slice(bounds.top, bounds.bottom + 1).map(row => row.slice(bounds.left, bounds.right + 1).map(cell => cell.value.trim()));
      });
      const readMatrixEntries = (key: string) => {
        const matrices = (mappings[key] || []).map(entry => {
          const source = sheetGrids[entry.sheetId];
          if (!source) throw new Error(`La hoja del rango ${entry.range} no está cargada. Vuelve a conectar el documento.`);
          const bounds = rangeBounds(entry.range);
          return source.slice(bounds.top, bounds.bottom + 1).map(row => row.slice(bounds.left, bounds.right + 1).map(cell => cell.value.trim()));
        });
        if (matrices.length <= 1) return matrices[0] || [];
        if (matrices.every(matrix => matrix.length === matrices[0].length)) {
          return matrices[0].map((row, rowIndex) => matrices.reduce((combined, matrix) => [...combined, ...(matrix[rowIndex] || [])], [] as string[]));
        }
        return matrices.flat();
      };
      const clean = (value: string) => value.replace(/\s+/g, " ").trim();
      const pilotNames = readEntries("pilotos").flat().map(clean).filter(Boolean);
      const circuitNames = readEntries("circuitos").flat().map(clean).filter(Boolean);
      const duoNames = readEntries("equipos").flat().map(clean).filter(Boolean);
      if (!pilotNames.length || !circuitNames.length || !duoNames.length) throw new Error("Los rangos seleccionados no contienen pilotos, circuitos o dúos reconocibles.");
      const pilotIds = pilotNames.map(name => `piloto_${name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "")}`);
      const circuitIds = circuitNames.map(name => name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, ""));
      const scoreMatrix = readMatrixEntries("puntuacionPilotoCircuito");
      const scoreColumns = Math.max(0, ...scoreMatrix.map(row => row.length));
      const scoreEntries = mappings.puntuacionPilotoCircuito || [];
      const overlappingScores = scoreEntries.flatMap((entry, index) => scoreEntries.slice(index + 1).filter(other => entry.sheetId === other.sheetId && rangesOverlap(entry.range, other.range)).map(other => `${entry.range} y ${other.range}`));
      if (overlappingScores.length) throw new Error(`Hay rangos de puntuación solapados: ${overlappingScores.join(", ")}. Conserva solo la matriz sin el total ni los encabezados.`);
      const incompleteRows = scoreMatrix.map((row, index) => row.length < circuitNames.length ? index + 1 : 0).filter(Boolean);
      if (scoreMatrix.length !== pilotNames.length || scoreColumns < circuitNames.length || incompleteRows.length > 0) {
        const rowShape = scoreMatrix.map(row => row.length).join(", ");
        throw new Error(`La matriz tiene ${scoreMatrix.length} filas y las filas tienen ${rowShape || "0"} columnas; se esperaban ${pilotNames.length} filas de ${circuitNames.length} columnas. Filas incompletas: ${incompleteRows.join(", ") || "ninguna"}.`);
      }
      const number = (value: string, label: string) => { const parsed = Number(value.replace(",", ".")); if (!Number.isFinite(parsed)) throw new Error(`${label} no es un número válido.`); return parsed; };
      const totalEntries = mappings.puntuacionTotalPiloto?.length ? readEntries("puntuacionTotalPiloto").flat().filter(Boolean) : [];
      const pilotTotals = pilotNames.map((_, index) => totalEntries[index] ? number(totalEntries[index], `Total del piloto ${pilotNames[index]}`) : scoreMatrix[index].slice(0, circuitNames.length).reduce((sum, value, circuitIndex) => sum + number(value, `Puntuación ${pilotNames[index]} C${circuitIndex + 1}`), 0));
      const teamTotals = mappings.puntuacionTotalEquipo?.length ? readEntries("puntuacionTotalEquipo").flat().filter(Boolean).map((value, index) => number(value, `Total del dúo ${duoNames[index]}`)) : [];
      const teamScoreMatrix = mappings.puntuacionEquipoCircuito?.length ? readMatrixEntries("puntuacionEquipoCircuito") : [];
      if (teamScoreMatrix.length && (teamScoreMatrix.length !== duoNames.length || teamScoreMatrix.some(row => row.length < circuitNames.length))) throw new Error("La matriz de puntuaciones de dúos no coincide con los equipos y circuitos seleccionados.");
      const batch = writeBatch(db);
      const [oldPilots, oldCircuits] = await Promise.all([getDocs(collection(db, "splits/origins/roster")), getDocs(collection(db, "splits/origins/circuitos"))]);
      oldPilots.docs.forEach(snapshot => batch.delete(snapshot.ref));
      oldCircuits.docs.forEach(snapshot => batch.delete(snapshot.ref));
      pilotNames.forEach((name, pilotIndex) => {
        batch.set(doc(db, "pilotos", pilotIds[pilotIndex]), { nombre: name }, { merge: true });
        batch.set(doc(db, "splits/origins/roster", pilotIds[pilotIndex]), { pilotoId: pilotIds[pilotIndex], nombre: name, equipoId: "individual", puntos_piloto: pilotTotals[pilotIndex], puntos_equipos: 0 }, { merge: true });
      });
      circuitNames.forEach((name, circuitIndex) => batch.set(doc(db, "splits/origins/circuitos", circuitIds[circuitIndex]), { nombre: name, numero_carrera: circuitIndex + 1, completado: true, acta_cerrada: true, economia_procesada: false, resultados: pilotNames.map((pilotName, pilotIndex) => ({ pilotoId: pilotIds[pilotIndex], pilotoNombre: pilotName, puntos: number(scoreMatrix[pilotIndex][circuitIndex], `${pilotName} en ${name}`) })) }));
      batch.set(doc(db, "splits", "origins"), { nombre: "Origins", orden: 0, tipo: "individual", activo: false, completado: true, fichajes_abiertos: false, source_url: url, duos: duoNames.map((name, index) => ({ id: `duo_${index + 1}`, nombre: name, puntos: teamTotals[index] ?? 0, puntos_carreras: teamScoreMatrix[index]?.slice(0, circuitNames.length).map((value, circuitIndex) => number(value, `${name} en C${circuitIndex + 1}`)) || [] })) }, { merge: true });
      await batch.commit();
      setMessage(`Origins cargado correctamente: ${pilotNames.length} pilotos, ${circuitNames.length} circuitos y ${duoNames.length} dúos. La clasificación se actualizará al recargar.`);
    } catch (error: any) {
      setMessage(`Error de importación: ${error.message || "datos no válidos"}`);
    } finally {
      setImporting(false);
    }
  };

  const saveSelection = async () => {
    if (!selectedRange || activeSheetId == null) return;
    const entry: MappingEntry = { sheetId: activeSheetId, range: selectedRange.range, preview: selectedRange.values.slice(0, 3).map(row => row.join(" | ")) };
    const previousEntries = mappings[field] || [];
    const nextEntries = previousEntries.some(item => item.sheetId === entry.sheetId && item.range === entry.range)
      ? previousEntries
      : [...previousEntries, entry];
    const nextMappings = { ...mappings, [field]: nextEntries };
    setMappings(nextMappings);
    await setDoc(doc(db, "admin_excel_mappings", seasonId), { seasonId, spreadsheetUrl: url, mappings: nextMappings, updatedAt: new Date().toISOString() }, { merge: true });
    setMessage(`Rango ${selectedRange.range} guardado para ${FIELD_OPTIONS.find(item => item[0] === field)?.[1]}.`);
    const nextField = visibleFieldOptions[visibleFieldOptions.findIndex(item => item[0] === field) + 1];
    if (nextField) setField(nextField[0]);
  };

  const removeMapping = async (key: string, index: number) => {
    const nextEntries = (mappings[key] || []).filter((_, entryIndex) => entryIndex !== index);
    const nextMappings = { ...mappings };
    if (nextEntries.length) nextMappings[key] = nextEntries;
    else delete nextMappings[key];
    setMappings(nextMappings);
    await setDoc(doc(db, "admin_excel_mappings", seasonId), { seasonId, spreadsheetUrl: url, mappings: nextMappings, updatedAt: new Date().toISOString() }, { merge: true });
    setMessage("Rango eliminado del mapeo.");
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
        {message && <p className={`mt-3 text-xs ${message.startsWith("Error") ? "text-red-300" : "text-emerald-300"}`}>{message}</p>}
        {sheets.length > 0 && seasonId === "origins" && <button onClick={importOrigins} disabled={importing} className="mt-4 inline-flex items-center gap-2 border border-amber-500/40 px-4 py-2 text-[10px] font-black uppercase tracking-wider text-amber-300 disabled:opacity-50"><Save className="w-4 h-4" />{importing ? "Validando e importando..." : "Cargar Origins en Firestore"}</button>}
      </div>

      {sheets.length > 0 && <div className="border border-white/10 bg-white/[0.02] rounded-sm overflow-hidden">
        <div className="flex gap-1 overflow-x-auto p-2 border-b border-white/10 bg-black/20">{sheets.map(sheet => <button key={sheet.properties.sheetId} onClick={() => selectSheet(sheet)} className={`shrink-0 px-3 py-2 text-[10px] uppercase font-black ${activeSheetId === sheet.properties.sheetId ? "bg-emerald-600 text-white" : "text-white/45 hover:bg-white/5"}`}>{sheet.properties.title}</button>)}</div>
        <div className="p-3 border-b border-white/10 flex flex-wrap items-center gap-2">
          <MousePointer2 className="w-4 h-4 text-emerald-300" />
          <span className="text-[10px] uppercase tracking-wider text-white/45">Selecciona un rango para:</span>
          <select value={field} onChange={event => setField(event.target.value as typeof field)} className="bg-black/40 border border-white/10 px-2 py-1.5 text-[10px] text-white">{visibleFieldOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
          <span className="text-[10px] font-mono text-emerald-300">{selectedRange?.range || "sin selección"}</span>
          <button onClick={saveSelection} disabled={!selectedRange} className="ml-auto inline-flex items-center gap-1.5 border border-emerald-500/30 text-emerald-300 px-3 py-1.5 text-[10px] uppercase font-black disabled:opacity-30"><Save className="w-3.5 h-3.5" /> Guardar rango</button>
        </div>
        <div className="overflow-auto max-h-[620px]" onMouseUp={() => setDragging(false)}>
          <table className="border-collapse text-[11px] font-mono"><thead className="sticky top-0 z-10 bg-zinc-900"><tr><th className="sticky left-0 z-20 min-w-12 border border-white/10 bg-zinc-900" />{(grid[0] || []).map(cell => <th key={cell.column} className="min-w-24 border border-white/10 px-2 py-1 text-white/35">{columnName(cell.column)}</th>)}</tr></thead><tbody>{grid.map((row, rowIndex) => <tr key={rowIndex}><th className="sticky left-0 z-10 border border-white/10 bg-zinc-900 px-2 text-white/35">{rowIndex + 1}</th>{row.map(cell => { const selected = selectedRange && cell.row >= selectedRange.top && cell.row <= selectedRange.bottom && cell.column >= selectedRange.left && cell.column <= selectedRange.right; return <td key={cell.column} onMouseDown={() => { setDragging(true); setSelection({ start: cell, end: cell }); }} onMouseEnter={() => { if (dragging) setSelection(current => current ? { ...current, end: cell } : null); }} className={`border border-white/10 px-2 py-1.5 whitespace-nowrap cursor-crosshair ${selected ? "bg-emerald-500/30 text-white ring-1 ring-inset ring-emerald-400" : "text-white/65 hover:bg-white/10"}`}>{cell.value}</td>; })}</tr>)}</tbody></table>
        </div>
      </div>}

      {Object.keys(mappings).length > 0 && <div className="border border-white/10 p-4"><h3 className="text-xs font-black uppercase tracking-wider mb-3">Mapeo guardado</h3><div className="grid grid-cols-1 md:grid-cols-2 gap-2">{Object.entries(mappings).map(([key, values]) => <div key={key} className="bg-white/[0.03] px-3 py-2 text-[10px]"><div className="flex items-center justify-between mb-1"><span className="text-white/60">{FIELD_OPTIONS.find(item => item[0] === key)?.[1]}</span><span className="text-white/35">{values.length} rango{values.length === 1 ? "" : "s"}</span></div><div className="space-y-1">{values.map((value, index) => <div key={`${value.sheetId}-${value.range}`} className="flex items-center justify-between gap-2"><span className="font-mono text-emerald-300">{value.range} <Check className="inline w-3 h-3" /></span><span className="text-white/35 font-mono truncate">{value.preview.join(" / ") || "Rango vacío"}</span><button onClick={() => removeMapping(key, index)} className="shrink-0 text-white/30 hover:text-red-300" title="Eliminar rango"><X className="w-3.5 h-3.5" /></button></div>)}</div></div>)}</div></div>}
    </section>
  );
}
