import "dotenv/config";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { GoogleAuth } from "google-auth-library";

// Descarga el Excel de control y calcula su huella, que es el paso 1 y 2 del
// protocolo de docs/excel-control-audit.md.
//
//   tsx scripts/fetch-workbook.ts <url-de-google-sheets | id | ruta.xlsx> [--out ruta]
//
// Acepta cualquier documento, no solo el actual: para uno de Google basta con
// compartirlo en modo lector con el correo de la cuenta de servicio.

const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.readonly";

const args = process.argv.slice(2);
const source = args.find((argument) => !argument.startsWith("--"));
if (!source) {
  throw new Error("Uso: tsx scripts/fetch-workbook.ts <url|id|ruta.xlsx> [--out ruta]");
}

const outFlag = args.find((argument) => argument.startsWith("--out="));
const explicitOut = outFlag?.slice("--out=".length).trim();

function extractSpreadsheetId(value: string): string | null {
  const fromUrl = value.match(/\/spreadsheets\/d\/([A-Za-z0-9_-]+)/)?.[1];
  if (fromUrl) return fromUrl;
  // Un identificador suelto de Drive: largo, sin barras ni puntos.
  if (/^[A-Za-z0-9_-]{20,}$/.test(value)) return value;
  return null;
}

async function downloadFromDrive(spreadsheetId: string): Promise<Buffer> {
  const keyFile = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  const auth = new GoogleAuth({ scopes: [DRIVE_SCOPE], ...(keyFile ? { keyFile } : {}) });
  const token = await auth.getAccessToken();
  if (!token) throw new Error("No se pudo obtener un token de Google con permiso de lectura en Drive.");

  const url = `https://www.googleapis.com/drive/v3/files/${spreadsheetId}/export`
    + `?mimeType=${encodeURIComponent(XLSX_MIME)}`;
  const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });

  if (response.status === 403 || response.status === 404) {
    const client = await auth.getClient();
    const account = "email" in client ? String(client.email) : "la cuenta de servicio";
    throw new Error(
      `Google respondió ${response.status}. Comparte el documento en modo lector con ${account}.`,
    );
  }
  if (!response.ok) {
    throw new Error(`Google respondió ${response.status}: ${(await response.text()).slice(0, 200)}`);
  }
  return Buffer.from(await response.arrayBuffer());
}

const spreadsheetId = extractSpreadsheetId(source);
const workbook = spreadsheetId
  ? await downloadFromDrive(spreadsheetId)
  : await readFile(path.resolve(source));

// Un .xlsx es un zip: empieza por PK. Si Google devuelve una página de login
// llega HTML y conviene detectarlo aquí y no dentro del lector.
if (workbook.subarray(0, 2).toString("latin1") !== "PK") {
  throw new Error("Lo descargado no es un .xlsx. Suele significar que hizo falta iniciar sesión.");
}

const stamp = new Date().toISOString().slice(0, 10);
const destination = path.resolve(
  explicitOut ?? path.join("workbooks", `${spreadsheetId ?? path.parse(source).name}-${stamp}.xlsx`),
);
await mkdir(path.dirname(destination), { recursive: true });
await writeFile(destination, workbook);

console.log(`Guardado en   ${destination}`);
console.log(`Bytes         ${workbook.length}`);
console.log(`SHA-256       ${createHash("sha256").update(workbook).digest("hex")}`);
console.log(
  "\nCompara esta huella con la de docs/excel-control-audit.md. Si no coincide,"
  + "\nel documento ha cambiado y toca repetir el protocolo de conciliación.",
);
