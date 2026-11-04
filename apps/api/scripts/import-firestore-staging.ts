import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import pg from "pg";

// Uso: tsx scripts/import-firestore-staging.ts <carpeta-exportacion> [--schema f1_import_test] [--verify]
// Importa la exportación de Firestore/Auth tal cual (copia fiel) a un esquema de pruebas.
// Variable: DATABASE_URL. Solo escribe en esquemas llamados f1_import_*.

type SourceDoc = { path: string; data: Record<string, unknown> };

const args = process.argv.slice(2);
const exportDir = args.find((a) => !a.startsWith("--"));
const schema = args.includes("--schema") ? args[args.indexOf("--schema") + 1] : "f1_import_test";
const verifyOnly = args.includes("--verify");

if (!exportDir) throw new Error("Falta la carpeta de la exportación.");
if (!/^f1_import_[a-z0-9_]+$/.test(schema)) throw new Error("El esquema debe llamarse f1_import_*.");
if (!process.env.DATABASE_URL) throw new Error("Falta DATABASE_URL.");

const ordinal = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value).sort(ordinal).map((k) => [k, canonical((value as Record<string, unknown>)[k])]),
    );
  }
  return value;
}
const hashOf = (value: unknown) => createHash("sha256").update(JSON.stringify(canonical(value))).digest("hex");

function loadDocs(): SourceDoc[] {
  const dir = join(exportDir!, "firestore");
  const docs: SourceDoc[] = [];
  for (const file of readdirSync(dir).filter((f) => f.endsWith(".jsonl"))) {
    for (const line of readFileSync(join(dir, file), "utf8").split("\n")) {
      if (line.trim()) docs.push(JSON.parse(line));
    }
  }
  const sorted = docs.sort((a, b) => ordinal(a.path, b.path));
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].path === sorted[i - 1].path) throw new Error(`Ruta duplicada: ${sorted[i].path}`);
  }
  return sorted;
}

const timestampOf = (data: Record<string, unknown>): string | null => {
  for (const key of ["fecha", "createdAt", "creado_en", "updatedAt"]) {
    const v = data[key] as { __t?: string; iso?: string } | string | undefined;
    if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}T/.test(v) && !Number.isNaN(Date.parse(v))) return v;
    if (v && typeof v === "object" && v.__t === "timestamp" && v.iso) return v.iso;
  }
  return null;
};

async function createSchema(client: pg.PoolClient) {
  await client.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);
  await client.query(`CREATE SCHEMA ${schema}`);
  await client.query(`
    CREATE TABLE ${schema}.documento (
      seq integer PRIMARY KEY,
      path text NOT NULL UNIQUE,
      parent_path text REFERENCES ${schema}.documento(path) DEFERRABLE INITIALLY IMMEDIATE,
      coleccion text NOT NULL,
      nivel integer NOT NULL CHECK (nivel >= 1),
      doc_id text NOT NULL,
      fecha timestamptz,
      data jsonb NOT NULL,
      sha256 char(64) NOT NULL,
      CHECK (parent_path IS NULL OR path LIKE parent_path || '/%')
    );
    CREATE INDEX documento_coleccion_idx ON ${schema}.documento (coleccion, nivel, seq);
    CREATE INDEX documento_fecha_idx ON ${schema}.documento (fecha) WHERE fecha IS NOT NULL;
    CREATE TABLE ${schema}.auth_usuario (
      uid text PRIMARY KEY,
      email text,
      email_verificado boolean NOT NULL,
      deshabilitado boolean NOT NULL,
      proveedores text[] NOT NULL,
      creado_en timestamptz,
      ultimo_acceso timestamptz,
      raw jsonb NOT NULL
    );
    CREATE UNIQUE INDEX auth_usuario_email_idx ON ${schema}.auth_usuario (lower(email)) WHERE email IS NOT NULL;
  `);
}

async function importAll(pool: pg.Pool, docs: SourceDoc[], users: any[]) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await createSchema(client);
    for (let i = 0; i < docs.length; i++) {
      const d = docs[i];
      const parts = d.path.split("/");
      await client.query(
        `INSERT INTO ${schema}.documento (seq, path, parent_path, coleccion, nivel, doc_id, fecha, data, sha256)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [
          i + 1, d.path, parts.length > 2 ? parts.slice(0, -2).join("/") : null,
          parts[0], parts.length / 2, parts[parts.length - 1],
          timestampOf(d.data), JSON.stringify(d.data), hashOf(d.data),
        ],
      );
    }
    for (const u of users) {
      await client.query(
        `INSERT INTO ${schema}.auth_usuario (uid,email,email_verificado,deshabilitado,proveedores,creado_en,ultimo_acceso,raw)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [
          u.uid, u.email ?? null, !!u.emailVerified, !!u.disabled,
          (u.providerData ?? []).map((p: any) => p.providerId),
          u.metadata?.creationTime ? new Date(u.metadata.creationTime) : null,
          u.metadata?.lastSignInTime ? new Date(u.metadata.lastSignInTime) : null,
          JSON.stringify(u),
        ],
      );
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function verify(pool: pg.Pool, docs: SourceDoc[], users: any[]) {
  const problems: string[] = [];
  const { rows } = await pool.query(`SELECT seq, path, data, sha256, parent_path FROM ${schema}.documento ORDER BY seq`);
  if (rows.length !== docs.length) problems.push(`Documentos: base ${rows.length} / exportación ${docs.length}`);
  rows.forEach((row, i) => {
    const src = docs[i];
    if (!src || row.path !== src.path) return problems.push(`Orden distinto en seq ${row.seq}: ${row.path}`);
    if (row.seq !== i + 1) problems.push(`seq no consecutivo en ${row.path}`);
    if (hashOf(row.data) !== hashOf(src.data) || row.sha256 !== hashOf(src.data)) problems.push(`Contenido distinto: ${row.path}`);
  });
  const orphans = await pool.query(
    `SELECT count(*)::int AS n FROM ${schema}.documento d WHERE d.parent_path IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM ${schema}.documento p WHERE p.path = d.parent_path)`);
  if (orphans.rows[0].n) problems.push(`Huérfanos: ${orphans.rows[0].n}`);
  const authCount = (await pool.query(`SELECT count(*)::int AS n FROM ${schema}.auth_usuario`)).rows[0].n;
  if (authCount !== users.length) problems.push(`Auth: base ${authCount} / exportación ${users.length}`);
  const perCol = (await pool.query(`SELECT coleccion, count(*)::int AS n FROM ${schema}.documento GROUP BY 1 ORDER BY 1`)).rows;
  const expected = JSON.parse(readFileSync(join(exportDir!, "firestore", "_resumen.json"), "utf8")) as Record<string, number>;
  for (const [col, n] of Object.entries(expected)) {
    const got = perCol.find((r) => r.coleccion === col)?.n ?? 0;
    if (got !== n) problems.push(`Colección ${col}: base ${got} / resumen ${n}`);
  }
  console.log("Por colección:", Object.fromEntries(perCol.map((r) => [r.coleccion, r.n])));
  console.log(`Documentos: ${rows.length}, usuarios Auth: ${authCount}`);
  if (problems.length) {
    console.error("VERIFICACIÓN FALLIDA:\n- " + problems.join("\n- "));
    process.exitCode = 1;
  } else {
    console.log("VERIFICACIÓN OK: mismo contenido, mismo orden, sin huérfanos.");
  }
}

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 2 });
try {
  const docs = loadDocs();
  const users = JSON.parse(readFileSync(join(exportDir, "auth_users.json"), "utf8"));
  if (!verifyOnly) await importAll(pool, docs, users);
  await verify(pool, docs, users);
} finally {
  await pool.end();
}
