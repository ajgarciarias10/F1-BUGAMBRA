import "dotenv/config";
import { readFile } from "node:fs/promises";
import pg from "pg";

// Enlaza las cuentas existentes de Firebase Auth con la tabla app_user.
//
//   firebase auth:export users.json --format=json --project <id>
//   tsx scripts/seed-users.ts users.json --admin=tu@correo --driver=a@x,b@y
//
// Nadie sube de rol por accidente: sin indicar un correo explícitamente, el
// usuario entra como viewer. Volver a ejecutarlo actualiza correo, nombre y rol
// sin duplicar filas, porque firebase_uid es la clave primaria.

type Role = "admin" | "team_manager" | "driver" | "viewer";

interface ExportedUser {
  localId?: string;
  email?: string;
  displayName?: string;
  disabled?: boolean;
}

const [exportPath, ...flags] = process.argv.slice(2);
if (!exportPath) {
  throw new Error("Uso: tsx scripts/seed-users.ts <export.json> [--admin=a@b] [--manager=a@b] [--driver=a@b]");
}

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("Falta DATABASE_URL.");

const roleByFlag: Record<string, Role> = {
  "--admin": "admin",
  "--manager": "team_manager",
  "--driver": "driver",
};

const requestedRoles = new Map<string, Role>();
for (const flag of flags) {
  const separator = flag.indexOf("=");
  const name = separator === -1 ? flag : flag.slice(0, separator);
  const role = roleByFlag[name];
  if (!role) throw new Error(`Opción desconocida: ${name}`);
  for (const email of flag.slice(separator + 1).split(",")) {
    const normalized = email.trim().toLowerCase();
    if (!normalized) continue;
    const previous = requestedRoles.get(normalized);
    if (previous && previous !== role) {
      throw new Error(`${normalized} aparece con dos roles distintos: ${previous} y ${role}.`);
    }
    requestedRoles.set(normalized, role);
  }
}

const exported = JSON.parse(await readFile(exportPath, "utf8")) as { users?: ExportedUser[] };
const users = exported.users ?? [];
if (users.length === 0) throw new Error("El export no contiene usuarios.");

const rows = users.map((user) => {
  if (!user.localId) throw new Error("Un usuario del export no tiene localId.");
  if (!user.email) throw new Error(`El usuario ${user.localId} no tiene correo y app_user lo exige.`);
  const email = user.email.trim().toLowerCase();
  return {
    uid: user.localId,
    email,
    displayName: user.displayName?.trim() || email.split("@")[0],
    role: requestedRoles.get(email) ?? ("viewer" as Role),
    disabled: user.disabled === true,
  };
});

const knownEmails = new Set(rows.map((row) => row.email));
for (const email of requestedRoles.keys()) {
  if (!knownEmails.has(email)) {
    throw new Error(`${email} no existe en Firebase Auth; revisa el correo antes de darle rol.`);
  }
}

const client = new pg.Client({ connectionString: databaseUrl });
await client.connect();
try {
  await client.query("BEGIN");
  for (const row of rows) {
    await client.query(
      `INSERT INTO app_user (firebase_uid, email, display_name, role, disabled)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (firebase_uid) DO UPDATE SET
         email = EXCLUDED.email,
         display_name = EXCLUDED.display_name,
         role = EXCLUDED.role,
         disabled = EXCLUDED.disabled,
         updated_at = now()`,
      [row.uid, row.email, row.displayName, row.role, row.disabled],
    );
  }
  await client.query("COMMIT");
} catch (error) {
  await client.query("ROLLBACK");
  throw error;
}

for (const row of rows) {
  console.log(`${row.role.padEnd(12)} ${row.email}${row.disabled ? " (deshabilitado)" : ""}`);
}
console.log(`\n${rows.length} usuarios enlazados con app_user.`);

await client.end();
