export interface OriginsPilotRow {
  name: string;
  total: number;
  racePoints: number[];
}

export interface OriginsDuoRow {
  name: string;
  total: number;
  racePoints: number[];
}

export interface OriginsWorkbookData {
  pilots: OriginsPilotRow[];
  duos: OriginsDuoRow[];
  races: string[];
}

function parseCsv(csv: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let value = "";
  let quoted = false;

  for (let index = 0; index < csv.length; index++) {
    const character = csv[index];
    if (character === '"') {
      if (quoted && csv[index + 1] === '"') {
        value += '"';
        index++;
      } else {
        quoted = !quoted;
      }
    } else if (character === "," && !quoted) {
      row.push(value);
      value = "";
    } else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && csv[index + 1] === "\n") index++;
      row.push(value);
      if (row.some(cell => cell.trim() !== "")) rows.push(row);
      row = [];
      value = "";
    } else {
      value += character;
    }
  }

  row.push(value);
  if (row.some(cell => cell.trim() !== "")) rows.push(row);
  return rows;
}

function numberCell(value: string, label: string): number {
  const parsed = Number(value.replace(",", ".").trim());
  if (!Number.isFinite(parsed)) throw new Error(`${label} no contiene un número válido.`);
  return parsed;
}

function cleanName(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function parseStandingRows(csv: string, expectedRows: number, label: string) {
  const rows = parseCsv(csv);
  if (rows.length !== expectedRows) {
    throw new Error(`${label}: se esperaban ${expectedRows} filas y se recibieron ${rows.length}.`);
  }

  return rows.map((cells, rowIndex) => {
    if (cells.length < 8) throw new Error(`${label}, fila ${rowIndex + 1}: faltan columnas.`);
    const name = cleanName(cells[0]);
    if (!name) throw new Error(`${label}, fila ${rowIndex + 1}: falta el nombre.`);
    const total = numberCell(cells[1], `${label}, total de ${name}`);
    const racePoints = cells.slice(2, 8).map((cell, raceIndex) =>
      numberCell(cell, `${label}, carrera ${raceIndex + 1} de ${name}`)
    );
    const calculatedTotal = racePoints.reduce((sum, points) => sum + points, 0);
    if (calculatedTotal !== total) {
      throw new Error(`${label}: ${name} suma ${calculatedTotal}, pero su total indica ${total}.`);
    }
    return { name, total, racePoints };
  });
}

function spreadsheetIdFromUrl(url: string): string {
  const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  if (!match) throw new Error("La URL de Google Sheets no es válida.");
  return match[1];
}

async function fetchRange(spreadsheetId: string, range: string): Promise<string> {
  const query = new URLSearchParams({
    format: "csv",
    sheet: "Plantilla 2025",
    range,
  });
  const response = await fetch(`https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?${query}`);
  if (!response.ok) throw new Error(`Google Sheets devolvió ${response.status} al leer ${range}.`);
  return response.text();
}

export async function fetchOriginsWorkbook(sheetUrl: string): Promise<OriginsWorkbookData> {
  const spreadsheetId = spreadsheetIdFromUrl(sheetUrl.trim());
  const [pilotsCsv, duosCsv, racesCsv] = await Promise.all([
    fetchRange(spreadsheetId, "C2:J11"),
    fetchRange(spreadsheetId, "C14:J18"),
    fetchRange(spreadsheetId, "B27:M27"),
  ]);

  const raceCells = parseCsv(racesCsv)[0] || [];
  const races = [0, 2, 4, 6, 8, 10].map(index => cleanName(raceCells[index] || ""));
  if (races.length !== 6 || races.some(name => !name)) {
    throw new Error("No se pudieron identificar las seis carreras de Origins en B27:M27.");
  }

  return {
    pilots: parseStandingRows(pilotsCsv, 10, "Pilotos"),
    duos: parseStandingRows(duosCsv, 5, "Dúos"),
    races,
  };
}

export function normalizeOriginsName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}
