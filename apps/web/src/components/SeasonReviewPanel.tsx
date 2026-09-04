import { useEffect, useMemo, useState } from "react";
import { GoogleAuthProvider, linkWithPopup, reauthenticateWithPopup } from "firebase/auth";
import { collection, doc, getDoc, getDocs, setDoc, writeBatch } from "firebase/firestore";
import { Check, FileSpreadsheet, Loader2, MousePointer2, Save, ShieldCheck, X } from "lucide-react";
import { db } from "../services/firebase";
import { auth } from "../services/auth";
import { recalcSplitPoints } from "../services/raceProcessor";
import { POINTS_BY_POSITION, calcularMillonesRivalidadClasificacion, calcularMillonesRivalidadCarrera } from "../services/economyService";

type SheetCell = { formattedValue?: string; effectiveValue?: Record<string, unknown>; effectiveFormat?: { textFormat?: { bold?: boolean; foregroundColor?: { red?: number; green?: number; blue?: number }; foregroundColorStyle?: { rgbColor?: { red?: number; green?: number; blue?: number } } } } };
type Sheet = { properties: { sheetId: number; title: string; gridProperties?: { rowCount?: number; columnCount?: number } }; data?: Array<{ rowData?: Array<{ values?: SheetCell[] }> }> };
type Cell = { row: number; column: number; value: string; isBold?: boolean; isFastestLap?: boolean };
type Selection = { start: Cell; end: Cell };
type MappingEntry = { sheetId: number; range: string; preview: string[] };

const FIELD_OPTIONS = [
  ["pilotos", "Pilotos"],
  ["pilotosEconomia", "Pilotos para economía"],
  ["circuitos", "Circuitos"],
  ["equipos", "Equipos de temporada"],
  ["equipoPiloto", "Equipo de cada piloto"],
  ["puntuacionPilotoCircuito", "Puntuación piloto por circuito"],
  ["puntuacionTotalPiloto", "Puntuación total de piloto"],
  ["puntuacionEquipoCircuito", "Puntuación equipo por circuito"],
  ["puntuacionTotalEquipo", "Puntuación total de equipo"],
  ["polesTemporada", "Poles acumuladas de la temporada"],
  ["vueltasRapidasTemporada", "V. rápidas acumuladas de la temporada"],
  ["sinSancionesTemporada", "Sin sanciones acumuladas de la temporada"],
  ["participacionesTemporada", "Participaciones acumuladas de la temporada"],
  ["fichajesSplit", "Ajuste de fichajes (opcional)"],
  ["rivalidadesSplit", "Ajuste de rivalidades (opcional)"],
  ["premiosSplit", "Ajuste de premios (opcional)"],
  ["precioCompraPiloto", "Precio de compra (valores en orden economía)"],
  ["mantenerPiloto", "Mantener (valores en orden economía)"],
  ["clausulaPiloto", "Cláusula (valores en orden economía)"],
  ["tipoCompraPiloto", "Tipo de compra (valores en orden economía)"],
] as const;

const ECONOMY_FIELD_KEYS = [
  "polesTemporada", "vueltasRapidasTemporada", "sinSancionesTemporada", "participacionesTemporada",
  "fichajesSplit", "rivalidadesSplit", "premiosSplit", "precioCompraPiloto",
  "mantenerPiloto", "clausulaPiloto", "tipoCompraPiloto",
  "pilotosEconomia",
];
const ORIGINS_FIELDS = FIELD_OPTIONS.filter(([value]) =>
  !["equipoPiloto", ...ECONOMY_FIELD_KEYS].includes(value)
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
const normalizeTeamName = (value: string) => value.replace(/\s+\d+\s*$/, "").replace(/\s+/g, " ").trim();

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
  const [rangeInput, setRangeInput] = useState("");
  const [token, setToken] = useState("");
  const [field, setField] = useState<(typeof FIELD_OPTIONS)[number][0]>("pilotos");
  const [selection, setSelection] = useState<Selection | null>(null);
  const [mappings, setMappings] = useState<Record<string, MappingEntry[]>>({});
  const [mappingSeasonId, setMappingSeasonId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [dragging, setDragging] = useState(false);
  const [importing, setImporting] = useState(false);
  const visibleFieldOptions = seasonId === "origins" ? ORIGINS_FIELDS : FIELD_OPTIONS;
  const reviewSeasons = [
    { id: "origins", label: "Origins" },
    { id: "split_1", label: "Temporada 1 · Split 1" },
    { id: "split_2", label: "Temporada 1 · Split 2" },
    ...splits.filter(split => !["origins", "split_1", "split_2"].includes(split.id)).map(split => ({ id: split.id, label: split.nombre })),
  ];

  useEffect(() => {
    if (!visibleFieldOptions.some(([value]) => value === field)) {
      setField(visibleFieldOptions[0][0]);
    }
  }, [field, visibleFieldOptions]);

  useEffect(() => {
    let cancelled = false;
    setMappings({});
    setMappingSeasonId(null);
    setSelection(null);
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
      setMappingSeasonId(seasonId);
      if (data?.spreadsheetUrl) setUrl(data.spreadsheetUrl);
    }).catch(() => {
      if (!cancelled) setMappings({});
      if (!cancelled) setMappingSeasonId(null);
    });
    return () => { cancelled = true; };
  }, [seasonId]);

  const selectedRange = useMemo(() => {
    if (!selection) return null;
    const top = Math.min(selection.start.row, selection.end.row);
    const bottom = Math.max(selection.start.row, selection.end.row);
    const left = Math.min(selection.start.column, selection.end.column);
    const right = Math.max(selection.start.column, selection.end.column);
    const values = grid.slice(top, bottom + 1).map(row => row.slice(left, right + 1).map(cell => cell.value));
    return { top, bottom, left, right, values, range: `${columnName(left)}${top + 1}:${columnName(right)}${bottom + 1}` };
  }, [grid, selection]);

  // El rango se puede escribir a mano en vez de arrastrarlo sobre la cuadrícula.
  useEffect(() => {
    if (selectedRange) setRangeInput(selectedRange.range);
  }, [selectedRange?.range]);

  const applyRangeInput = () => {
    const text = rangeInput.replace(/\s+/g, "").toUpperCase();
    if (!text) {
      setSelection(null);
      return;
    }
    try {
      if (!grid.length) throw new Error("Conecta antes el documento y elige una hoja.");
      const bounds = rangeBounds(text.includes(":") ? text : `${text}:${text}`);
      const columns = grid[0]?.length ?? 0;
      if (bounds.bottom >= grid.length || bounds.right >= columns) {
        throw new Error(`${text} se sale de la hoja, que llega hasta ${columnName(columns - 1)}${grid.length}.`);
      }
      setSelection({
        start: { row: bounds.top, column: bounds.left, value: "" },
        end:   { row: bounds.bottom, column: bounds.right, value: "" },
      });
      setMessage(`Rango ${text} listo para añadir.`);
    } catch (error: any) {
      setMessage(`Error: ${error.message || "rango no válido"}`);
    }
  };

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
    const nextGrid = rows.map((row: any, rowIndex: number) => Array.from({ length: width }, (_, column) => {
      const sourceCell = row.values?.[column] as SheetCell | undefined;
      const color = sourceCell?.effectiveFormat?.textFormat?.foregroundColorStyle?.rgbColor
        ?? sourceCell?.effectiveFormat?.textFormat?.foregroundColor;
      return {
        row: rowIndex,
        column,
        value: sourceCell?.formattedValue || "",
        isBold: sourceCell?.effectiveFormat?.textFormat?.bold === true,
        isFastestLap: (color?.red ?? 0) > 0.4 && (color?.blue ?? 0) > 0.8 && (color?.green ?? 0) < 0.4,
      };
    }));
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
       let scoreMatrix = readMatrixEntries("puntuacionPilotoCircuito");
       const totalEntries = mappings.puntuacionTotalPiloto?.length ? readEntries("puntuacionTotalPiloto").flat().filter(Boolean) : [];
       if (totalEntries.length === scoreMatrix.length && scoreMatrix.length > 0 && scoreMatrix.every((row, index) => row[0] === totalEntries[index])) {
         scoreMatrix = scoreMatrix.map(row => row.slice(1));
       }
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

  const importTeamSplit = async () => {
    setImporting(true);
    setMessage("");
    try {
      if (seasonId === "origins") throw new Error("Selecciona un split de equipos.");
        const requiredFields = ["pilotos", "pilotosEconomia", "circuitos", "equipos", "equipoPiloto", "puntuacionPilotoCircuito", "puntuacionTotalPiloto", "puntuacionTotalEquipo", "precioCompraPiloto", "fichajesSplit", "rivalidadesSplit", "premiosSplit"];
      const missing = requiredFields.filter(key => !mappings[key]?.length);
      if (missing.length) throw new Error(`Faltan rangos obligatorios: ${missing.join(", ")}.`);
      const readEntries = (key: string) => (mappings[key] || []).flatMap(entry => {
        const source = sheetGrids[entry.sheetId];
        if (!source) throw new Error(`La hoja del rango ${entry.range} no está cargada. Vuelve a conectar el documento.`);
        const bounds = rangeBounds(entry.range);
        return source.slice(bounds.top, bounds.bottom + 1).map(row => row.slice(bounds.left, bounds.right + 1).map(cell => cell.value.trim()));
      });
      const readMatrix = (key: string) => {
        const matrices = (mappings[key] || []).map(entry => {
          const source = sheetGrids[entry.sheetId];
          if (!source) throw new Error(`La hoja del rango ${entry.range} no está cargada. Vuelve a conectar el documento.`);
          const bounds = rangeBounds(entry.range);
          return source.slice(bounds.top, bounds.bottom + 1).map(row => row.slice(bounds.left, bounds.right + 1).map(cell => cell.value.trim()));
        });
        if (matrices.length <= 1) return matrices[0] || [];
        if (matrices.every(matrix => matrix.length === matrices[0].length)) return matrices[0].map((row, index) => matrices.reduce((result, matrix) => [...result, ...(matrix[index] || [])], [] as string[]));
        return matrices.flat();
      };
      const readCellMatrix = (key: string) => {
        const matrices = (mappings[key] || []).map(entry => {
          const source = sheetGrids[entry.sheetId];
          if (!source) throw new Error(`La hoja del rango ${entry.range} no está cargada. Vuelve a conectar el documento.`);
          const bounds = rangeBounds(entry.range);
          return source.slice(bounds.top, bounds.bottom + 1).map(row => row.slice(bounds.left, bounds.right + 1));
        });
        if (matrices.length <= 1) return matrices[0] || [];
        if (matrices.every(matrix => matrix.length === matrices[0].length)) return matrices[0].map((row, index) => matrices.reduce((result, matrix) => [...result, ...(matrix[index] || [])], [] as Cell[]));
        return matrices.flat();
      };
       const clean = (value: string) => value.replace(/\s+/g, " ").trim();
       const id = (value: string, prefix: string) => `${prefix}_${clean(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "")}`;
       const pilotNameKey = (value: string) => {
         const normalized = clean(value).replace(/[★☆]+/g, "").replace(/\s+/g, " ").trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
         return normalized === "alex" ? "mimic" : normalized;
       };
        const pilotNames = readEntries("pilotos").flat().map(clean).filter(Boolean);
        const economyPilotCells = (mappings.pilotosEconomia || []).flatMap(entry => {
          const source = sheetGrids[entry.sheetId];
          if (!source) throw new Error(`La hoja del rango ${entry.range} no está cargada. Vuelve a conectar el documento.`);
          const bounds = rangeBounds(entry.range);
          return source.slice(bounds.top, bounds.bottom + 1).flatMap(row => row.slice(bounds.left, bounds.right + 1).map(cell => ({ row: cell.row, value: clean(cell.value) }))).filter(cell => cell.value);
        });
        const economyPilotNames = economyPilotCells.map(cell => cell.value);
      const circuitNames = readEntries("circuitos").flat().map(clean).filter(Boolean);
      const teamNames = [...new Set(readEntries("equipos").flat().map(value => normalizeTeamName(clean(value))).filter(Boolean))];
      const pilotTeams = readEntries("equipoPiloto").flat().map(value => normalizeTeamName(clean(value))).filter(Boolean);
       const scoreCellMatrix = readCellMatrix("puntuacionPilotoCircuito");
       const scoreMatrix = scoreCellMatrix.map(row => row.map(cell => cell.value));
       if (scoreMatrix.length !== pilotNames.length) throw new Error(`El rango Pilotos tiene ${pilotNames.length} filas, pero la matriz de puntuaciones tiene ${scoreMatrix.length}. Para Split 1 selecciona los 10 nombres de pilotos, no una sola celda.`);
       if (economyPilotNames.length !== pilotNames.length) throw new Error(`Pilotos para economía tiene ${economyPilotNames.length} filas y la lista de puntuación tiene ${pilotNames.length}. Selecciona los mismos pilotos en el orden del bloque económico.`);
       const scoringPilots = new Set(pilotNames.map(pilotNameKey));
       const missingEconomyPilots = economyPilotNames.filter(name => !scoringPilots.has(pilotNameKey(name)));
       if (missingEconomyPilots.length) throw new Error(`Estos pilotos de economía no aparecen en la lista de puntuación: ${missingEconomyPilots.join(", ")}.`);
      if (pilotTeams.length !== pilotNames.length) throw new Error(`Equipo de cada piloto: hay ${pilotTeams.length} valores para ${pilotNames.length} pilotos.`);
      if (scoreMatrix.some(row => row.length !== circuitNames.length)) throw new Error(`La matriz tiene ${scoreMatrix.length} filas, pero no todas tienen ${circuitNames.length} columnas.`);
       const number = (value: string, label: string) => { const parsed = Number(value.replace(/\s*M\s*$/i, "").replace(",", ".").trim()); if (!Number.isFinite(parsed)) throw new Error(`${label} no es un número válido.`); return parsed; };
       const pilotTotals = readEntries("puntuacionTotalPiloto").flat().filter(Boolean).map((value, index) => number(value, `Total de ${pilotNames[index]}`));
       const teamTotals = readEntries("puntuacionTotalEquipo").flat().filter(Boolean).map((value, index) => number(value, `Total de ${teamNames[index]}`));
       const teamScoreMatrix = mappings.puntuacionEquipoCircuito?.length ? readMatrix("puntuacionEquipoCircuito") : [];
         const readEconomicValues = (key: string, parseValue: (value: string, label: string) => any, rowOffset = 0) => {
          const cells = (mappings[key] || []).flatMap(entry => {
            const source = sheetGrids[entry.sheetId];
            if (!source) throw new Error(`La hoja del rango ${entry.range} no está cargada. Vuelve a conectar el documento.`);
            const bounds = rangeBounds(entry.range);
            return source.slice(bounds.top, bounds.bottom + 1).flatMap(row => row.slice(bounds.left, bounds.right + 1).map(cell => ({ row: cell.row, value: clean(cell.value) })));
          });
          const label = FIELD_OPTIONS.find(item => item[0] === key)?.[1] || key;
          return new Map(economyPilotCells.flatMap(pilot => {
            const value = cells.find(cell => cell.row === pilot.row + rowOffset && cell.value)?.value;
            return value ? [[pilotNameKey(pilot.value), parseValue(value, `${label} de ${pilot.value}`)]] : [];
           }));
         };
         const readEconomicSeries = (key: string, rowOffset = 0) => {
           const cells = (mappings[key] || []).flatMap(entry => {
             const source = sheetGrids[entry.sheetId];
             if (!source) throw new Error(`La hoja del rango ${entry.range} no está cargada. Vuelve a conectar el documento.`);
             const bounds = rangeBounds(entry.range);
             return source.slice(bounds.top, bounds.bottom + 1).flatMap(row => row.slice(bounds.left, bounds.right + 1).map(cell => ({ row: cell.row, column: cell.column, value: clean(cell.value) })));
           });
           const label = FIELD_OPTIONS.find(item => item[0] === key)?.[1] || key;
           return new Map(economyPilotCells.flatMap(pilot => {
             const values = cells
               .filter(cell => cell.row === pilot.row + rowOffset)
               .sort((a, b) => a.column - b.column)
               .map(cell => cell.value ? number(cell.value, `${label} de ${pilot.value}`) : null);
             return values.length ? [[pilotNameKey(pilot.value), values]] : [];
           }));
         };
        const readTeamEconomicValues = (key: string) => {
          const values = readEntries(key).flat().filter(Boolean);
          if (values.length !== teamNames.length) throw new Error(`${FIELD_OPTIONS.find(item => item[0] === key)?.[1] || key}: hay ${values.length} valores para ${teamNames.length} equipos.`);
          return values.map((value, index) => number(value, `${key} de ${teamNames[index]}`));
        };
        // Mapeo opcional: sin él se conservan los precios ya guardados en el split (o en el anterior).
        // Los acumulados de temporada viven en otro bloque del Excel, con los equipos en otro orden:
        // si el rango incluye la columna del nombre se casa por nombre, y solo si no, por posición.
        const readTeamSeasonTotals = (key: string) => {
          const label = FIELD_OPTIONS.find(item => item[0] === key)?.[1] || key;
          const rows = readEntries(key).map(row => row.filter(Boolean)).filter(row => row.length);
          if (!rows.length || rows.some(row => row.length < 2)) return readTeamEconomicValues(key);
          const byName = new Map(rows.map(row => [
            normalizeTeamName(clean(row[0])).toLowerCase(),
            number(row[row.length - 1], `${label} de ${row[0]}`),
          ]));
          return teamNames.map(name => {
            const value = byName.get(normalizeTeamName(clean(name)).toLowerCase());
            if (value == null) throw new Error(`${label}: falta el valor de ${name} en el rango mapeado.`);
            return value;
          });
        };
        const purchasePrices = mappings.precioCompraPiloto?.length
          ? readEconomicValues("precioCompraPiloto", number)
          : new Map<string, number>();
       if (mappings.precioCompraPiloto?.length) {
         const missingPrices = pilotNames.filter(name => !purchasePrices.has(pilotNameKey(name)));
         if (missingPrices.length) throw new Error(`Falta el precio de compra de: ${missingPrices.join(", ")}.`);
       }
        const keepValues = mappings.mantenerPiloto?.length ? readEconomicValues("mantenerPiloto", number) : new Map<string, number>();
         const clauseValues = mappings.clausulaPiloto?.length ? readEconomicValues("clausulaPiloto", number, 1) : new Map<string, number>();
        const keepSeries = mappings.mantenerPiloto?.length ? readEconomicSeries("mantenerPiloto") : new Map<string, Array<number | null>>();
        const clauseSeries = mappings.clausulaPiloto?.length ? readEconomicSeries("clausulaPiloto", 1) : new Map<string, Array<number | null>>();
        // Ajustes opcionales: solo cuadran el Excel cuando su economía no coincide con la calculada.
        const readTeamAdjustments = (key: string) =>
          mappings[key]?.length ? readTeamSeasonTotals(key) : teamNames.map(() => 0);
        // El gasto en fichajes sí es real: sin rango se deduce sumando los precios del equipo.
        const mappedSignings = mappings.fichajesSplit?.length ? readTeamSeasonTotals("fichajesSplit") : null;
        const rivalryAdjustments = readTeamAdjustments("rivalidadesSplit");
        const prizeAdjustments = readTeamAdjustments("premiosSplit");
       const signingTypes = mappings.tipoCompraPiloto?.length ? readEconomicValues("tipoCompraPiloto", (value, label) => {
         const normalized = pilotNameKey(value).replace(/\s+/g, "_");
         if (!["mantener", "clausula", "subasta", "agente_libre"].includes(normalized)) throw new Error(`${label} debe ser mantener, cláusula, subasta o agente_libre.`);
         return normalized;
       }) : new Map<string, string>();
       const teamIdByName = new Map(teamNames.map((name, index) => [clean(name).toLowerCase(), id(name, "equipo")]));
      const pilotIds = pilotNames.map(name => id(name, "piloto"));
      const circuitIds = circuitNames.map(name => id(name, "circuito"));
       const teamIds = teamNames.map(name => teamIdByName.get(clean(name).toLowerCase())!);
       const resolvedTeamIds = pilotTeams.map((team, index) => teamIdByName.get(clean(team).toLowerCase()) || (() => { throw new Error(`No se encontró el equipo "${team}" del piloto ${pilotNames[index]}.`); })());
        const deriveRaceResults = (racePoints: number[], explicitPoleIndex: number) => {
          const used = new Set<number>();
          const assignments = racePoints.map((points, pilotIndex) => {
            if (points === 0) return { pilotIndex, racePos: 99, pole: false };
            const basePoints = points - (pilotIndex === explicitPoleIndex ? 2 : 0);
            // Poleman que abandona: se queda con los 2 puntos de la pole y nada de carrera.
            if (basePoints === 0) return { pilotIndex, racePos: 99, pole: true };
            const racePos = POINTS_BY_POSITION.indexOf(basePoints) + 1;
            if (racePos === 0 || used.has(racePos)) throw new Error(`No se pueden deducir posiciones únicas para la carrera con puntos: ${racePoints.join(", ")}.`);
            used.add(racePos);
            return { pilotIndex, racePos, pole: pilotIndex === explicitPoleIndex };
          });
          return assignments;
        };
        const races = circuitNames.map((name, circuitIndex) => {
          const rawValues = pilotNames.map((_, pilotIndex) => scoreMatrix[pilotIndex][circuitIndex]);
          const poleIndexes = pilotNames.flatMap((_, pilotIndex) => scoreCellMatrix[pilotIndex][circuitIndex]?.isBold ? [pilotIndex] : []);
          const fastestIndexes = pilotNames.flatMap((_, pilotIndex) => scoreCellMatrix[pilotIndex][circuitIndex]?.isFastestLap ? [pilotIndex] : []);
          if (poleIndexes.length !== 1 || fastestIndexes.length !== 1) throw new Error(`${name}: el formato del Excel no identifica exactamente una pole y una vuelta rápida.`);
          const racePoints = rawValues.map((value, pilotIndex) => value === "" ? 0 : number(value, `${pilotNames[pilotIndex]} en ${name}`));
          const assignments = deriveRaceResults(racePoints, poleIndexes[0]);
          return {
            id: circuitIds[circuitIndex], name,
            resultados: pilotNames.flatMap((pilotName, pilotIndex) => rawValues[pilotIndex] === "" ? [] : [{
              pilotoId: pilotIds[pilotIndex], pilotoNombre: pilotName, equipoId: resolvedTeamIds[pilotIndex],
              puntos: racePoints[pilotIndex], racePos: assignments[pilotIndex].racePos,
              qualyPos: assignments[pilotIndex].pole ? 1 : 99,
              fastestLap: fastestIndexes[0] === pilotIndex,
              isClean: assignments[pilotIndex].racePos !== 99,
              isDnfOwnError: assignments[pilotIndex].racePos === 99,
            }]),
          };
        });
        const existingSplit = await getDoc(doc(db, "splits", seasonId));
        const rivalryGroups: any[] = existingSplit.data()?.rivalries?.groups || [];
        if (!rivalryGroups.length) throw new Error("Configura y guarda las rivalidades históricas antes de importar la economía del split.");
        const economyByTeam = new Map(teamIds.map((teamId, index) => [teamId, {
          points: teamTotals[index] || 0, poles: 0, fastestLaps: 0, cleanRaces: 0, participations: 0, rivalryIncome: 0,
        }]));
        races.forEach(race => {
          teamIds.forEach(teamId => {
            const teamResults = race.resultados.filter(result => result.equipoId === teamId);
            const economy = economyByTeam.get(teamId)!;
            if (teamResults.length) economy.participations++;
            if (teamResults.length && teamResults.every(result => result.isClean)) economy.cleanRaces++;
            economy.poles += teamResults.filter(result => result.qualyPos === 1).length;
            economy.fastestLaps += teamResults.filter(result => result.fastestLap).length;
          });
          rivalryGroups.forEach(group => {
            const members = (group.members || []).map((member: any) => {
              const result = race.resultados.find(entry => entry.pilotoId === member.id);
              return result
                ? { ...result, teamId: result.equipoId }
                : { pilotoId: member.id, teamId: member.equipoId, qualyPos: 99, racePos: 99 };
            }).filter((member: any) => economyByTeam.has(member.teamId));
            if (members.length < 2) return;
            [...members].sort((a: any, b: any) => a.qualyPos - b.qualyPos).forEach((member: any, index) => {
              economyByTeam.get(member.teamId)!.rivalryIncome += calcularMillonesRivalidadClasificacion(index + 1, members.length);
            });
            [...members].sort((a: any, b: any) => a.racePos - b.racePos).forEach((member: any, index) => {
              economyByTeam.get(member.teamId)!.rivalryIncome += calcularMillonesRivalidadCarrera(index + 1, members.length);
            });
          });
        });

        // Los conteos del Excel son acumulados de temporada: lo que no está en los splits
        // anteriores pertenece a este. Así entran las sanciones sin saber a qué piloto tocaron.
        const seasonTotalKeys = [
          ["polesTemporada", "poles"],
          ["vueltasRapidasTemporada", "fastestLaps"],
          ["sinSancionesTemporada", "cleanRaces"],
          ["participacionesTemporada", "participations"],
        ] as const;
        const mappedTotals = seasonTotalKeys.filter(([key]) => mappings[key]?.length);
        const currentOrden = Number(splits.find(split => split.id === seasonId)?.orden ?? 0);
        const earlierTeamSplits = splits
          .filter(split => split.tipo !== "individual" && split.id !== "origins" && Number(split.orden ?? 0) < currentOrden)
          .sort((a, b) => Number(a.orden ?? 0) - Number(b.orden ?? 0));

        // El presupuesto es un saldo único de temporada: este split abre donde cerró el anterior.
        const openingBudgets = new Map<string, number>();
        const previousTeamSplit = earlierTeamSplits.at(-1);
        if (previousTeamSplit) {
          const previousTeams = await getDocs(collection(db, `splits/${previousTeamSplit.id}/equipos`));
          previousTeams.docs.forEach(snapshot => {
            const closing = snapshot.data().economia_historica?.presupuesto_cierre ?? snapshot.data().presupuesto;
            if (typeof closing === "number") openingBudgets.set(snapshot.id, closing);
          });
        }

        if (mappedTotals.length) {
          const alreadyCounted = new Map<string, Record<string, number>>();
          for (const previousSplit of earlierTeamSplits) {
            const previousTeams = await getDocs(collection(db, `splits/${previousSplit.id}/equipos`));
            previousTeams.docs.forEach(snapshot => {
              const historic = snapshot.data().economia_historica;
              if (!historic) return;
              const accumulated = alreadyCounted.get(snapshot.id) ?? { poles: 0, fastestLaps: 0, cleanRaces: 0, participations: 0 };
              alreadyCounted.set(snapshot.id, {
                poles:          accumulated.poles + Number(historic.poles ?? 0),
                fastestLaps:    accumulated.fastestLaps + Number(historic.vueltas_rapidas ?? 0),
                cleanRaces:     accumulated.cleanRaces + Number(historic.carreras_limpias ?? 0),
                participations: accumulated.participations + Number(historic.participaciones ?? 0),
              });
            });
          }
          for (const [key, concept] of mappedTotals) {
            const totals = readTeamSeasonTotals(key);
            teamIds.forEach((teamId, index) => {
              const remainder = totals[index] - (alreadyCounted.get(teamId)?.[concept] ?? 0);
              if (remainder < 0) {
                throw new Error(`${FIELD_OPTIONS.find(item => item[0] === key)?.[1]}: ${teamNames[index]} acumula ${totals[index]} en la temporada pero los splits anteriores ya suman ${totals[index] - remainder}.`);
              }
              economyByTeam.get(teamId)![concept] = remainder;
            });
          }
        }

        const batch = writeBatch(db);
       const [oldRoster, oldTeams, oldCircuits, oldTransactions] = await Promise.all([getDocs(collection(db, `splits/${seasonId}/roster`)), getDocs(collection(db, `splits/${seasonId}/equipos`)), getDocs(collection(db, `splits/${seasonId}/circuitos`)), getDocs(collection(db, "transacciones"))]);
       // Los precios vivos se rescatan antes de borrar: el Excel solo los pisa si están mapeados.
       const storedPrices = new Map<string, number>();
       oldRoster.docs.forEach(snapshot => {
         const price = snapshot.data().precio_compra;
         if (typeof price === "number") storedPrices.set(snapshot.id, price);
       });
       oldRoster.docs.forEach(snapshot => batch.delete(snapshot.ref));
       for (const oldTeam of oldTeams.docs) {
         const oldPilots = await getDocs(collection(db, `splits/${seasonId}/equipos/${oldTeam.id}/pilotos`));
         oldPilots.docs.forEach(snapshot => {
           const price = snapshot.data().precio_compra;
           if (typeof price === "number") storedPrices.set(snapshot.id, price);
         });
         oldPilots.docs.forEach(snapshot => batch.delete(snapshot.ref));
       }

       // Los que aún no tengan ficha en este split heredan el precio del split anterior.
       const previousSplitId = previousTeamSplit?.id;
       if (previousSplitId && !mappings.precioCompraPiloto?.length) {
         const previousTeams = await getDocs(collection(db, `splits/${previousSplitId}/equipos`));
         for (const previousTeam of previousTeams.docs) {
           const previousPilots = await getDocs(collection(db, `splits/${previousSplitId}/equipos/${previousTeam.id}/pilotos`));
           previousPilots.docs.forEach(snapshot => {
             const price = snapshot.data().precio_compra;
             if (typeof price === "number" && !storedPrices.has(snapshot.id)) storedPrices.set(snapshot.id, price);
           });
         }
       }

       if (!mappings.precioCompraPiloto?.length) {
         const withoutPrice = pilotNames.filter((_, index) => !storedPrices.has(pilotIds[index]));
         if (withoutPrice.length) {
           throw new Error(`Sin rango de precio de compra y sin precio guardado para: ${withoutPrice.join(", ")}. Mapea el rango o dales de alta antes de importar.`);
         }
       }

       const finalPurchasePrices = pilotNames.map((name, index) =>
         purchasePrices.get(pilotNameKey(name)) ?? storedPrices.get(pilotIds[index]) ?? 0);
       const signingAdjustments = mappedSignings ?? teamIds.map(teamId =>
         Math.round(finalPurchasePrices.reduce(
           (total, price, index) => resolvedTeamIds[index] === teamId ? total + price : total, 0,
         ) * 10) / 10);
       // El escudo de cada equipo lo sube el jeque y no está en el Excel: se rescata antes de borrar.
       const escudosPorEquipo = new Map<string, string>();
       oldTeams.docs.forEach(snapshot => {
         const logo = snapshot.data().logo_url;
         if (typeof logo === "string" && logo) escudosPorEquipo.set(snapshot.id, logo);
       });
       oldTeams.docs.forEach(snapshot => batch.delete(snapshot.ref));
       oldCircuits.docs.forEach(snapshot => batch.delete(snapshot.ref));
       oldTransactions.docs.filter(snapshot => snapshot.data().splitId === seasonId).forEach(snapshot => batch.delete(snapshot.ref));
      batch.set(doc(db, "temporadas", "temporada_1"), { nombre: "Temporada 1", orden: 1, activa: false, splits: ["split_1", "split_2"] }, { merge: true });
      batch.set(doc(db, "splits", seasonId), { nombre: seasonId === "split_1" ? "Split 1" : "Split 2", temporadaId: "temporada_1", tipo: "equipos", orden: seasonId === "split_1" ? 1 : 2, activo: false, completado: true, fichajes_abiertos: false, source_url: url, economia_mapeo: Object.fromEntries(Object.entries(mappings).filter(([key]) => ECONOMY_FIELD_KEYS.includes(key))) }, { merge: true });
        teamNames.forEach((name, index) => {
          const teamId = teamIds[index];
          const economy = economyByTeam.get(teamId)!;
          const income = economy.points * 0.1 + economy.poles * 2 + economy.fastestLaps + economy.cleanRaces * 3 + economy.participations * 4 + economy.rivalryIncome;
          const openingBudget = openingBudgets.get(teamId) ?? 100;
          const budget = Math.round((openingBudget + income - signingAdjustments[index] - rivalryAdjustments[index] - prizeAdjustments[index]) * 10) / 10;
          const economia_historica = { conciliado: true, puntos_constructores: economy.points, ingresos_puntos: economy.points * 0.1, poles: economy.poles, ingresos_poles: economy.poles * 2, vueltas_rapidas: economy.fastestLaps, ingresos_vueltas_rapidas: economy.fastestLaps, carreras_limpias: economy.cleanRaces, ingresos_carreras_limpias: economy.cleanRaces * 3, participaciones: economy.participations, ingresos_participacion: economy.participations * 4, ingresos_rivalidades_carreras: economy.rivalryIncome, ajuste_fichajes: signingAdjustments[index], ajuste_rivalidades: rivalryAdjustments[index], ajuste_premios: prizeAdjustments[index], presupuesto_cierre: budget };
          batch.set(doc(db, `splits/${seasonId}/equipos`, teamId), { nombre: name, puntos_constructores: economy.points, presupuesto: budget, presupuesto_inicial: openingBudget, ...(escudosPorEquipo.has(teamId) ? { logo_url: escudosPorEquipo.get(teamId) } : {}), puntos_carreras: teamScoreMatrix[index]?.slice(0, circuitNames.length) || [], economia_historica });
          const ledger = [
            ["puntos", economy.points * 0.1, "ingreso_puntos"], ["poles", economy.poles * 2, "pole"],
            ["vueltas_rapidas", economy.fastestLaps, "vuelta_rapida"], ["carreras_limpias", economy.cleanRaces * 3, "sin_sancionados"],
            ["participaciones", economy.participations * 4, "premio_carrera"], ["rivalidades_carreras", economy.rivalryIncome, "rivalidad"],
            ["ajuste_fichajes", -signingAdjustments[index], signingAdjustments[index] < 0 ? "piloto_negativo" : "fichaje"],
            ["ajuste_rivalidades", -rivalryAdjustments[index], "rivalidad"], ["ajuste_premios", -prizeAdjustments[index], "premio_carrera"],
          ] as const;
          ledger.filter(([, amount]) => amount !== 0).forEach(([concept, amount, type]) => {
            batch.set(doc(db, "transacciones", `${seasonId}__historico__${teamId}__${concept}`), {
              equipo: name, equipoId: teamId, tipo: type, cantidad: Math.abs(amount), esIngreso: amount > 0,
              splitId: seasonId, origen: "excel_conciliado", descripcion: `Conciliación histórica ${seasonId} · ${concept}`,
            });
          });
        });
        pilotNames.forEach((name, pilotIndex) => {
          const key = pilotNameKey(name);
          const purchasePrice = finalPurchasePrices[pilotIndex];
          const keeps = keepSeries.get(key) || [];
          const clauses = clauseSeries.get(key) || [];
          const keep = keeps.find(value => value != null) ?? keepValues.get(key);
          const clause = clauses.find(value => value != null) ?? clauseValues.get(key);
          const currentKeep = [...keeps].reverse().find(value => value != null) ?? keep;
          const currentClause = [...clauses].reverse().find(value => value != null) ?? clause;
          const historial_precios = Object.fromEntries(circuitIds.flatMap((circuitId, circuitIndex) => {
            const mantener = keeps[circuitIndex] ?? null;
            const clausula = clauses[circuitIndex] ?? null;
            return mantener == null && clausula == null ? [] : [[circuitId, { carrera: circuitNames[circuitIndex], mantener, clausula, congelado: false }]];
          }));
          // Sin rangos de mantener/cláusula se derivan del precio: si es negativo divide en vez de multiplicar.
          const derivedKeep = Math.round((purchasePrice < 0 ? purchasePrice / 3 : purchasePrice * 3) * 10) / 10;
          const derivedClause = Math.round((purchasePrice < 0 ? purchasePrice / 2 : purchasePrice * 2) * 10) / 10;
          const initialKeep = keep ?? derivedKeep;
          const finalKeep = currentKeep ?? derivedKeep;
          const initialClause = clause ?? derivedClause;
          const finalClause = currentClause ?? derivedClause;
          const pilotData = { pilotoId: pilotIds[pilotIndex], nombre: name, equipoId: resolvedTeamIds[pilotIndex], puntos_piloto: pilotTotals[pilotIndex] || 0, puntos_equipos: 0, precio_compra: purchasePrice, mantener_actual: finalKeep, mantener_inicial_split: initialKeep, precio_carrera_anterior: finalKeep, clausula_actual: finalClause, clausula_inicial_split: initialClause, ...(Object.keys(historial_precios).length ? { historial_precios } : {}), ...(signingTypes.has(key) ? { tipo_fichaje: signingTypes.get(key) } : {}) };
          batch.set(doc(db, "pilotos", pilotIds[pilotIndex]), { nombre: name }, { merge: true });
          batch.set(doc(db, `splits/${seasonId}/roster`, pilotIds[pilotIndex]), pilotData);
          batch.set(doc(db, `splits/${seasonId}/equipos/${resolvedTeamIds[pilotIndex]}/pilotos`, pilotIds[pilotIndex]), pilotData);
        });
        races.forEach((race, circuitIndex) => {
          batch.set(doc(db, `splits/${seasonId}/circuitos`, race.id), {
             nombre: race.name,
             numero_carrera: circuitIndex + 1,
             completado: true,
             acta_cerrada: true,
             economia_procesada: true,
             resultados: race.resultados,
           });
       });
       await batch.commit();
       await recalcSplitPoints(seasonId);
       setMessage(`${seasonId === "split_1" ? "Split 1" : "Split 2"} cargado correctamente: ${pilotNames.length} pilotos, ${teamNames.length} equipos y ${circuitNames.length} circuitos.`);
    } catch (error: any) { setMessage(`Error de importación: ${error.message || "datos no válidos"}`); } finally { setImporting(false); }
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
    setMappingSeasonId(seasonId);
    await setDoc(doc(db, "admin_excel_mappings", seasonId), { seasonId, spreadsheetUrl: url, mappings: nextMappings, updatedAt: new Date().toISOString() }, { merge: true });
    setMessage(`Rango ${selectedRange.range} añadido a ${FIELD_OPTIONS.find(item => item[0] === field)?.[1]}. Puedes guardar más selecciones en este mismo campo.`);
    setSelection(null);
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
          <div><h2 className="font-black uppercase tracking-tight text-lg">Revisión de temporadas</h2><p className="text-xs text-white/45 mt-1">Revisando exclusivamente: <strong className="text-emerald-300">{reviewSeasons.find(season => season.id === seasonId)?.label || seasonId}</strong>. Sus rangos no se mezclan con ninguna otra temporada.</p></div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-[180px_1fr_auto] gap-3">
          <select value={seasonId} onChange={event => setSeasonId(event.target.value)} className="bg-black/30 border border-white/10 px-3 py-2 text-xs text-white">
            <option value="origins">Origins</option>
            {reviewSeasons.slice(1).map(season => <option key={season.id} value={season.id}>{season.label}</option>)}
          </select>
          <input value={url} onChange={event => setUrl(event.target.value)} className="bg-black/30 border border-white/10 px-3 py-2 text-xs text-white" placeholder="Enlace de Google Sheets" />
          <button onClick={loadSpreadsheet} disabled={busy} className="inline-flex items-center justify-center gap-2 bg-[#e10600] px-4 py-2 text-[10px] font-black uppercase tracking-wider disabled:opacity-50">{busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />} Conectar en lectura</button>
        </div>
        {message && <p className={`mt-3 text-xs ${message.startsWith("Error") ? "text-red-300" : "text-emerald-300"}`}>{message}</p>}
        {sheets.length > 0 && <button onClick={seasonId === "origins" ? importOrigins : importTeamSplit} disabled={importing} className="mt-4 inline-flex items-center gap-2 border border-amber-500/40 px-4 py-2 text-[10px] font-black uppercase tracking-wider text-amber-300 disabled:opacity-50"><Save className="w-4 h-4" />{importing ? "Validando e importando..." : `Cargar ${seasonId === "origins" ? "Origins" : seasonId === "split_1" ? "Split 1" : "Split 2"} en Firestore`}</button>}
      </div>

      {sheets.length > 0 && <div className="border border-white/10 bg-white/[0.02] rounded-sm overflow-hidden">
        <div className="flex gap-1 overflow-x-auto p-2 border-b border-white/10 bg-black/20">{sheets.map(sheet => <button key={sheet.properties.sheetId} onClick={() => selectSheet(sheet)} className={`shrink-0 px-3 py-2 text-[10px] uppercase font-black ${activeSheetId === sheet.properties.sheetId ? "bg-emerald-600 text-white" : "text-white/45 hover:bg-white/5"}`}>{sheet.properties.title}</button>)}</div>
        <div className="p-3 border-b border-white/10 flex flex-wrap items-center gap-2">
          <MousePointer2 className="w-4 h-4 text-emerald-300" />
          <span className="text-[10px] uppercase tracking-wider text-white/45">{seasonId === "origins" ? "Selecciona un rango para:" : "Selecciona uno o varios rangos para:"}</span>
          <select value={field} onChange={event => setField(event.target.value as typeof field)} className="bg-black/40 border border-white/10 px-2 py-1.5 text-[10px] text-white">{visibleFieldOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
          <input
            value={rangeInput}
            onChange={event => setRangeInput(event.target.value)}
            onBlur={applyRangeInput}
            onKeyDown={event => { if (event.key === "Enter") { event.preventDefault(); applyRangeInput(); } }}
            placeholder="A51:F53"
            spellCheck={false}
            className="w-28 bg-black/40 border border-emerald-500/30 px-2 py-1.5 text-[10px] font-mono uppercase text-emerald-300 outline-none focus:border-emerald-400"
            title="Escribe el rango y pulsa Enter, o arrástralo sobre la cuadrícula"
          />
          <span className="text-[10px] text-white/25">{selectedRange ? `${selectedRange.bottom - selectedRange.top + 1}×${selectedRange.right - selectedRange.left + 1}` : "sin selección"}</span>
          <button onClick={saveSelection} disabled={!selectedRange} className="ml-auto inline-flex items-center gap-1.5 border border-emerald-500/30 text-emerald-300 px-3 py-1.5 text-[10px] uppercase font-black disabled:opacity-30"><Save className="w-3.5 h-3.5" /> Añadir selección</button>
        </div>
        <div className="overflow-auto max-h-[620px]" onMouseUp={() => setDragging(false)}>
          <table className="border-collapse text-[11px] font-mono"><thead className="sticky top-0 z-10 bg-zinc-900"><tr><th className="sticky left-0 z-20 min-w-12 border border-white/10 bg-zinc-900" />{(grid[0] || []).map(cell => <th key={cell.column} className="min-w-24 border border-white/10 px-2 py-1 text-white/35">{columnName(cell.column)}</th>)}</tr></thead><tbody>{grid.map((row, rowIndex) => <tr key={rowIndex}><th className="sticky left-0 z-10 border border-white/10 bg-zinc-900 px-2 text-white/35">{rowIndex + 1}</th>{row.map(cell => { const selected = selectedRange && cell.row >= selectedRange.top && cell.row <= selectedRange.bottom && cell.column >= selectedRange.left && cell.column <= selectedRange.right; return <td key={cell.column} onMouseDown={() => { setDragging(true); setSelection({ start: cell, end: cell }); }} onMouseEnter={() => { if (dragging) setSelection(current => current ? { ...current, end: cell } : null); }} className={`border border-white/10 px-2 py-1.5 whitespace-nowrap cursor-crosshair ${selected ? "bg-emerald-500/30 text-white ring-1 ring-inset ring-emerald-400" : "text-white/65 hover:bg-white/10"}`}>{cell.value}</td>; })}</tr>)}</tbody></table>
        </div>
      </div>}

      {mappingSeasonId === seasonId && Object.keys(mappings).length > 0 && <div className="border border-white/10 p-4"><h3 className="text-xs font-black uppercase tracking-wider mb-3">Mapeo guardado de {reviewSeasons.find(season => season.id === seasonId)?.label || seasonId}</h3><div className="grid grid-cols-1 md:grid-cols-2 gap-2">{Object.entries(mappings).map(([key, values]) => <div key={key} className="bg-white/[0.03] px-3 py-2 text-[10px]"><div className="flex items-center justify-between mb-1"><span className="text-white/60">{FIELD_OPTIONS.find(item => item[0] === key)?.[1]}</span><span className="text-white/35">{values.length} rango{values.length === 1 ? "" : "s"}</span></div><div className="space-y-1">{values.map((value, index) => <div key={`${value.sheetId}-${value.range}`} className="flex items-center justify-between gap-2"><span className="font-mono text-emerald-300">{value.range} <Check className="inline w-3 h-3" /></span><span className="text-white/35 font-mono truncate">{value.preview.join(" / ") || "Rango vacío"}</span><button onClick={() => removeMapping(key, index)} className="shrink-0 text-white/30 hover:text-red-300" title="Eliminar rango"><X className="w-3.5 h-3.5" /></button></div>)}</div></div>)}</div></div>}
    </section>
  );
}
