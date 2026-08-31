import "dotenv/config";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import pg from "pg";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("Falta DATABASE_URL.");

const migrationsDirectory = path.resolve("database/migrations");
const client = new pg.Client({ connectionString: databaseUrl });

await client.connect();
try {
  await client.query("SELECT pg_advisory_lock(hashtext('f1_bugambra_migrations'))");
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migration (
      filename text PRIMARY KEY,
      applied_at timestamptz NOT NULL DEFAULT now()
    )
  `);

  const appliedResult = await client.query<{ filename: string }>("SELECT filename FROM schema_migration");
  const applied = new Set(appliedResult.rows.map((row) => row.filename));
  const files = (await readdir(migrationsDirectory))
    .filter((filename) => filename.endsWith(".sql"))
    .sort();

  for (const filename of files) {
    if (applied.has(filename)) continue;
    const sql = await readFile(path.join(migrationsDirectory, filename), "utf8");
    await client.query("BEGIN");
    try {
      await client.query(sql);
      await client.query("INSERT INTO schema_migration (filename) VALUES ($1)", [filename]);
      await client.query("COMMIT");
      console.log(`Aplicada ${filename}`);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    }
  }
} finally {
  await client.query("SELECT pg_advisory_unlock(hashtext('f1_bugambra_migrations'))");
  await client.end();
}
