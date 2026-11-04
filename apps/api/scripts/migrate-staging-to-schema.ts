import { createHash } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import pg from 'pg';

type SourceDoc = { seq: number; path: string; coleccion: string; data: Record<string, any>; sha256: string };
const uuid = (name: string) => {
  const hex = createHash('md5').update(`f1-import:${name}`).digest('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
};
const mediaDirectory = process.env.F1_MEDIA_DIR || join(homedir(), 'backups/f1-media');
const money = (value: unknown) => typeof value === 'number' && Number.isFinite(value) ? value : 0;
const roundMoney = (value: number) => Math.round(value * 100) / 100;
export const positionOf = (value: unknown): number | null => {
  if (value === null || value === undefined || value === 99) return null;
  const number = Number(value);
  if (!Number.isInteger(number) || number <= 0) throw new Error(`Posición inválida: ${value}`);
  return number;
};
export const dnfOf = (result: Record<string, any>): boolean => result.isDnf === true || result.isDnfOwnError === true;
const dateOf = (value: unknown): string | null => {
  if (typeof value === 'string' && !Number.isNaN(Date.parse(value))) return new Date(value).toISOString();
  if (value && typeof value === 'object' && '__t' in value && value.__t === 'timestamp'
    && 'iso' in value && typeof value.iso === 'string') return new Date(value.iso).toISOString();
  return null;
};
const key = (path: string) => path.split('/');
const only = (docs: SourceDoc[], pattern: RegExp) => docs.filter(doc => pattern.test(doc.path));

export function imageMime(bytes: Buffer): string | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';
  if (bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return 'image/png';
  if (bytes.length >= 12 && bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP') return 'image/webp';
  if (bytes.length >= 6 && ['GIF87a', 'GIF89a'].includes(bytes.toString('ascii', 0, 6))) return 'image/gif';
  return null;
}

function countEmbeddedImages(value: any): number {
  if (typeof value === 'string') return value.startsWith('data:image/') ? 1 : 0;
  if (Array.isArray(value)) return value.reduce((sum, item) => sum + countEmbeddedImages(item), 0);
  if (value && typeof value === 'object') return Object.values(value).reduce<number>((sum, item) => sum + countEmbeddedImages(item), 0);
  return 0;
}

export async function extractImages(value: any, directory = mediaDirectory, verified: Map<string, string> = new Map()): Promise<any> {
  if (typeof value === 'string' && value.startsWith('data:')) {
    const match = /^data:(image\/(?:jpeg|png|webp|gif));base64,([A-Za-z0-9+/]+={0,2})$/.exec(value);
    if (!match) throw new Error('Imagen base64 con formato no admitido');
    const bytes = Buffer.from(match[2]!, 'base64');
    if (bytes.toString('base64') !== match[2] || imageMime(bytes) !== match[1]) throw new Error('Imagen base64 o MIME inválido');
    const hash = createHash('sha256').update(bytes).digest('hex');
    const extension = ({ 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' } as Record<string, string>)[match[1]!];
    const filename = `${hash}.${extension}`;
    await mkdir(directory, { recursive: true });
    const path = join(directory, filename);
    try { await writeFile(path, bytes, { flag: 'wx' }); }
    catch (error) { if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error; }
    const saved = await readFile(path);
    if (createHash('sha256').update(saved).digest('hex') !== hash || !saved.equals(bytes)) {
      throw new Error(`La imagen extraída no coincide con su base64: ${filename}`);
    }
    verified.set(filename, hash);
    return `/api/media/${filename}`;
  }
  if (Array.isArray(value)) return Promise.all(value.map(item => extractImages(item, directory, verified)));
  if (value && typeof value === 'object') {
    const pairs = await Promise.all(Object.entries(value).map(async ([name, item]) => [name, await extractImages(item, directory, verified)]));
    return Object.fromEntries(pairs);
  }
  return value;
}

export function ledgerOrder(documents: SourceDoc[]): SourceDoc[] {
  return [...documents].sort((a, b) => {
    const left = dateOf(a.data.fecha);
    const right = dateOf(b.data.fecha);
    if (left && right) return left.localeCompare(right) || a.seq - b.seq;
    if (left) return -1;
    if (right) return 1;
    return a.seq - b.seq;
  });
}

export function signedAmount(data: Record<string, any>): number {
  const amount = Number(data.cantidad);
  if (!Number.isFinite(amount)) throw new Error('Movimiento sin cantidad numérica');
  return data.esIngreso ? amount : -amount;
}

export function reconcileBalances(documents: SourceDoc[]) {
  const teams = only(documents, /^splits\/[^/]+\/equipos\/[^/]+$/);
  const transactions = only(documents, /^transacciones\/[^/]+$/);
  return teams.map(team => {
    const splitId = key(team.path)[1];
    const teamId = key(team.path)[3];
    const movements = transactions.filter(doc => doc.data.splitId === splitId && doc.data.equipoId === teamId)
      .map(doc => ({ path: doc.path, amount: signedAmount(doc.data), type: doc.data.tipo,
        date: dateOf(doc.data.fecha) }));
    const initial = roundMoney(money(team.data.presupuesto_inicial));
    const stored = roundMoney(money(team.data.presupuesto));
    const calculated = roundMoney(initial + movements.reduce((sum, item) => sum + item.amount, 0));
    return { splitId, teamId, team: team.data.nombre, initial, stored, calculated,
      difference: roundMoney(stored - calculated), movements };
  });
}

async function upsert(client: pg.PoolClient, table: string, columns: string[], values: unknown[], conflict = 'id') {
  const placeholders = values.map((_, index) => `$${index + 1}`).join(',');
  const updates = columns.filter(column => column !== conflict).map(column => `${column}=EXCLUDED.${column}`).join(',');
  await client.query(`INSERT INTO ${table} (${columns.join(',')}) VALUES (${placeholders}) ON CONFLICT (${conflict}) DO UPDATE SET ${updates}`, values);
}

async function archiveDocuments(client: pg.PoolClient, documents: SourceDoc[], verified: Map<string, string>) {
  for (let index = 0; index < documents.length; index += 25) {
    const batch = documents.slice(index, index + 25);
    const values: unknown[] = [];
    const rows: string[] = [];
    for (const doc of batch) {
      const data = await extractImages(doc.data, mediaDirectory, verified);
      const base = values.length;
      values.push(doc.path, doc.seq, doc.coleccion, JSON.stringify(data), doc.sha256);
      rows.push(`($${base + 1},$${base + 2},$${base + 3},$${base + 4},$${base + 5})`);
    }
    await client.query(`INSERT INTO source_document_archive (path,seq,collection_name,data,source_sha256)
      VALUES ${rows.join(',')} ON CONFLICT (path) DO UPDATE SET
      seq=EXCLUDED.seq,collection_name=EXCLUDED.collection_name,data=EXCLUDED.data,source_sha256=EXCLUDED.source_sha256`, values);
  }
}

function userRole(value: unknown): 'admin' | 'team_manager' | 'driver' | 'viewer' {
  if (value === 'admin') return 'admin';
  if (value === 'jeque' || value === 'director_deportivo') return 'team_manager';
  if (value === 'piloto') return 'driver';
  return 'viewer';
}

async function normalizeDocuments(client: pg.PoolClient, documents: SourceDoc[]) {
  const byPath = new Map(documents.map(doc => [doc.path, doc]));
  const users = only(documents, /^usuarios\/[^/]+$/);
  const emails = new Set<string>();
  for (const doc of users) {
    const email = String(doc.data.email || doc.data.auth_email || '').trim().toLowerCase();
    if (!email || emails.has(email)) throw new Error(`Correo ausente o duplicado: ${doc.path}`);
    emails.add(email);
    if (email === 'admin@f1bugambra.com') continue;
    await upsert(client, 'app_user', ['firebase_uid','email','display_name','role','disabled'],
      [doc.data.uid || key(doc.path)[1], email, doc.data.nombre || email, userRole(doc.data.rol), false], 'firebase_uid');
  }
  const auth = await client.query<{ email: string | null }>('SELECT email FROM f1_import_test.auth_usuario WHERE NOT deshabilitado');
  const unmatched = users.filter(doc => !auth.rows.some(row => row.email?.toLowerCase() === String(doc.data.email || doc.data.auth_email).toLowerCase()));
  if (unmatched.length) throw new Error(`Usuarios sin identidad Auth: ${unmatched.map(doc => doc.path).join(', ')}`);

  for (const doc of only(documents, /^pilotos\/[^/]+$/)) {
    const data = await extractImages(doc.data);
    await upsert(client, 'driver', ['id','external_key','display_name','photo_url'],
      [uuid(doc.path), key(doc.path)[1], data.nombre, data.foto_url || null]);
  }
  const teamDocs = only(documents, /^splits\/[^/]+\/equipos\/[^/]+$/);
  const teamNames = new Map<string, string>();
  for (const doc of teamDocs) teamNames.set(key(doc.path)[3]!, doc.data.nombre);
  for (const [teamId, name] of teamNames) {
    await upsert(client, 'team', ['id','external_key','display_name'], [uuid(`team/${teamId}`), teamId, name]);
  }
  const splits = only(documents, /^splits\/[^/]+$/);
  for (const doc of splits) {
    const splitId = key(doc.path)[1];
    const sequence = Number(doc.data.orden) + 1;
    const status = doc.data.completado ? 'completed' : doc.data.activo ? 'active' : 'draft';
    await upsert(client, 'season', ['id','slug','display_name','sequence','status'],
      [uuid(doc.path), splitId, doc.data.nombre, sequence, status]);
  }
  for (const doc of teamDocs) {
    const parts = key(doc.path), splitId = parts[1], teamId = parts[3];
    await upsert(client, 'season_team', ['id','season_id','team_id','initial_budget','current_budget'],
      [uuid(doc.path), uuid(`splits/${splitId}`), uuid(`team/${teamId}`), money(doc.data.presupuesto_inicial), money(doc.data.presupuesto)]);
    await upsert(client, 'team_standing', ['season_team_id','points'],
      [uuid(doc.path), money(doc.data.puntos_constructores)], 'season_team_id');
  }

  const pilotDocs = only(documents, /^splits\/[^/]+\/(?:roster\/[^/]+|equipos\/[^/]+\/pilotos\/[^/]+)$/);
  const bySeasonDriver = new Map<string, SourceDoc>();
  for (const doc of pilotDocs) {
    const parts = key(doc.path), driverId = doc.data.pilotoId || parts.at(-1);
    const mapKey = `${parts[1]}/${driverId}`;
    if (!bySeasonDriver.has(mapKey) || parts[2] === 'equipos') bySeasonDriver.set(mapKey, doc);
  }
  const userByPilot = new Map(users.filter(doc => doc.data.piloto_id).map(doc => [doc.data.piloto_id, doc.data.uid || key(doc.path)[1]]));
  for (const [mapKey, doc] of bySeasonDriver) {
    const [splitId, driverId] = mapKey.split('/');
    if (!byPath.has(`pilotos/${driverId}`)) throw new Error(`Piloto sin documento global: ${driverId}`);
    await upsert(client, 'season_driver', ['id','season_id','driver_id','user_uid','base_rating','purchase_price','starts_at_sequence','ends_at_sequence'],
      [uuid(`season_driver/${mapKey}`), uuid(`splits/${splitId}`), uuid(`pilotos/${driverId}`), userByPilot.get(driverId) || null,
        money(doc.data.rating_base) || 50, money(doc.data.precio_compra), Number(doc.data.participa_desde) || 1,
        doc.data.participa_hasta == null ? null : Number(doc.data.participa_hasta)]);
    if (key(doc.path)[2] === 'equipos') {
      const teamId = doc.data.equipoId || key(doc.path)[3];
      const teamPath = `splits/${splitId}/equipos/${teamId}`;
      if (!byPath.has(teamPath)) throw new Error(`Equipo inexistente para ${doc.path}`);
      await upsert(client, 'roster_assignment', ['id','season_driver_id','season_team_id','starts_at_sequence','ends_at_sequence'],
        [uuid(`roster/${mapKey}`), uuid(`season_driver/${mapKey}`), uuid(teamPath), Number(doc.data.participa_desde) || 1,
          doc.data.participa_hasta == null ? null : Number(doc.data.participa_hasta)]);
      await upsert(client, 'driver_standing', ['season_driver_id','points','rating','wins','podiums','poles','dnfs','clean_races'],
        [uuid(`season_driver/${mapKey}`), money(doc.data.puntos_piloto), money(doc.data.rating_piloto) || 50,
          money(doc.data.victorias), money(doc.data.podios), money(doc.data.poles), money(doc.data.dnfs), money(doc.data.carreras_limpias)], 'season_driver_id');
    }
  }

  const races = only(documents, /^splits\/[^/]+\/circuitos\/[^/]+$/);
  for (const doc of races) {
    const parts = key(doc.path), splitId = parts[1], raceId = parts[3];
    const results = Array.isArray(doc.data.resultados) ? doc.data.resultados : [];
    const status = doc.data.economia_procesada ? 'settled' : doc.data.acta_cerrada ? 'finalized' : doc.data.completado ? 'validated' : 'draft';
    await upsert(client, 'race', ['id','season_id','external_key','display_name','sequence','scheduled_at','status','current_revision'],
      [uuid(doc.path), uuid(`splits/${splitId}`), raceId, doc.data.nombre, Number(doc.data.numero_carrera), dateOf(doc.data.fecha), status, 0]);
    if (!results.length) continue;
    await upsert(client, 'race_revision', ['id','race_id','revision','status','source','created_by'],
      [uuid(`revision/${doc.path}`), uuid(doc.path), 1, 'current', 'migration', null]);
    for (const result of results) {
      const driverId = result.pilotoId;
      const mapKey = `${splitId}/${driverId}`;
      if (!bySeasonDriver.has(mapKey)) throw new Error(`Resultado sin piloto inscrito: ${doc.path}/${driverId}`);
      const teamPath = result.equipoId ? `splits/${splitId}/equipos/${result.equipoId}` : null;
      if (teamPath && !byPath.has(teamPath)) throw new Error(`Resultado con equipo inexistente: ${doc.path}/${driverId}`);
      await upsert(client, 'race_result', ['race_revision_id','season_driver_id','season_team_id_at_race','qualifying_position','race_position','dnf','own_error_dnf','clean_race','fastest_lap','driver_of_the_day'],
        [uuid(`revision/${doc.path}`), uuid(`season_driver/${mapKey}`), teamPath ? uuid(teamPath) : null,
          positionOf(result.qualyPos), positionOf(result.racePos),
          dnfOf(result), result.isDnfOwnError === true, result.isClean === true,
          result.fastestLap === true, result.isDotd === true], 'race_revision_id,season_driver_id');
    }
    await client.query('UPDATE race SET current_revision=1 WHERE id=$1', [uuid(doc.path)]);
  }

  const transactions = ledgerOrder(only(documents, /^transacciones\/[^/]+$/));
  for (let index = 0; index < transactions.length; index++) {
    const doc = transactions[index]!, splitId = doc.data.splitId, teamId = doc.data.equipoId;
    const teamPath = `splits/${splitId}/equipos/${teamId}`;
    if (!byPath.has(teamPath)) throw new Error(`Movimiento sin equipo: ${doc.path}`);
    const racePath = doc.data.circuitoId ? `splits/${splitId}/circuitos/${doc.data.circuitoId}` : null;
    await upsert(client, 'ledger_entry', ['id','season_id','season_team_id','race_revision_id','entry_type','amount','idempotency_key','description','created_by','created_at','source_path','secuencia'],
      [uuid(doc.path), uuid(`splits/${splitId}`), uuid(teamPath), racePath && byPath.get(racePath)?.data.resultados?.length ? uuid(`revision/${racePath}`) : null,
        doc.data.tipo || 'historico', signedAmount(doc.data), doc.path, doc.data.descripcion || doc.data.concepto || '',
        null, dateOf(doc.data.fecha), doc.path, index + 1]);
  }

  for (const doc of only(documents, /^splits\/[^/]+\/transfers\/[^/]+$/)) {
    const parts = key(doc.path), splitId = parts[1], driverId = doc.data.pilotoId;
    const teamId = doc.data.teamId;
    if (!bySeasonDriver.has(`${splitId}/${driverId}`) || !byPath.has(`splits/${splitId}/equipos/${teamId}`)) {
      throw new Error(`Transferencia sin piloto o equipo: ${doc.path}`);
    }
    const origin = doc.data.equipoOrigenId ? `splits/${splitId}/equipos/${doc.data.equipoOrigenId}` : null;
    await upsert(client, 'transfer', ['id','season_driver_id','from_season_team_id','to_season_team_id','status','amount','effective_from_sequence','created_by','created_at','source_path'],
      [uuid(doc.path), uuid(`season_driver/${splitId}/${driverId}`), origin && byPath.has(origin) ? uuid(origin) : null,
        uuid(`splits/${splitId}/equipos/${teamId}`), doc.data.estado === 'aplicada' ? 'applied' : 'draft',
        money(doc.data.precio), 1, null, dateOf(doc.data.fecha), doc.path]);
  }
  for (const doc of documents.filter(item => /^admin_audit\/[^/]+$/.test(item.path)
    || /^splits\/[^/]+\/adminOperations\/[^/]+$/.test(item.path)
    || /^splits\/[^/]+\/circuitos\/[^/]+\/votacion_audit\/[^/]+$/.test(item.path))) {
    const actor = doc.data.actorUid;
    const knownActor = actor && users.some(user => user.data.uid === actor || key(user.path)[1] === actor);
    await upsert(client, 'audit_log', ['actor_uid','action','entity_type','entity_id','before_data','after_data','created_at','source_path'],
      [knownActor ? actor : null, doc.data.action || doc.data.accion || doc.data.tipo || 'legacy',
        doc.coleccion, doc.data.target || doc.path, doc.data.before || doc.data.estadoAnterior || null,
        doc.data.after || doc.data.estadoNuevo || null, dateOf(doc.data.createdAt || doc.data.fecha), doc.path], 'source_path');
  }
}

async function verifyCoverage(client: pg.PoolClient, included: SourceDoc[], excluded: SourceDoc[], verified: Map<string, string>) {
  const { rows } = await client.query<{ path: string; data: Record<string, any>; source_sha256: string }>(
    'SELECT path,data,source_sha256 FROM source_document_archive ORDER BY seq');
  const byPath = new Map(rows.map(row => [row.path, row]));
  const missing = included.filter(doc => !byPath.has(doc.path) || byPath.get(doc.path)?.source_sha256 !== doc.sha256);
  const forbidden = excluded.filter(doc => byPath.has(doc.path));
  const changed: string[] = [];
  for (const doc of included) {
    const actual = byPath.get(doc.path);
    if (!actual) continue;
    const expected = await extractImages(doc.data, mediaDirectory, verified);
    if (!isDeepStrictEqual(actual.data, expected)) changed.push(doc.path);
  }
  if (missing.length || forbidden.length || changed.length || rows.length !== included.length) {
    throw new Error(`Cobertura inválida: ${missing.length} sin archivo, ${changed.length} campos distintos, ${forbidden.length} excluidos importados, ${rows.length}/${included.length} filas`);
  }
  return { included: included.length, archived: rows.length, missing: missing.map(doc => doc.path),
    exclusions: excluded.map(doc => doc.path) };
}

async function main() {
  if (!process.env.DATABASE_URL) throw new Error('Falta DATABASE_URL');
  const start = performance.now();
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 2 });
  const client = await pool.connect();
  let report: any;
  try {
    await client.query('BEGIN');
    await client.query("SET LOCAL f1.import_mode = 'on'");
    const { rows } = await client.query<SourceDoc>('SELECT seq,path,coleccion,data,sha256 FROM f1_import_test.documento ORDER BY seq');
    const excluded = rows.filter(doc => doc.coleccion === 'paddock_posts');
    const included = rows.filter(doc => doc.coleccion !== 'paddock_posts');
    if (rows.length !== 396 || excluded.length !== 4 || included.length !== 392) {
      throw new Error(`Inventario inesperado: ${rows.length} documentos, ${excluded.length} paddock_posts`);
    }
    const verified = new Map<string, string>();
    await client.query('DROP INDEX IF EXISTS source_document_archive_collection_idx');
    await archiveDocuments(client, included, verified);
    await client.query('CREATE INDEX source_document_archive_collection_idx ON source_document_archive (collection_name, seq)');
    await normalizeDocuments(client, included);
    const coverage = await verifyCoverage(client, included, excluded, verified);
    const reconciliation = reconcileBalances(included);
    await client.query('COMMIT');
    const counts = await client.query(`SELECT 'archive' AS entity, count(*)::int AS n FROM source_document_archive
      UNION ALL SELECT 'app_user',count(*)::int FROM app_user
      UNION ALL SELECT 'driver',count(*)::int FROM driver
      UNION ALL SELECT 'team',count(*)::int FROM team
      UNION ALL SELECT 'season',count(*)::int FROM season
      UNION ALL SELECT 'season_team',count(*)::int FROM season_team
      UNION ALL SELECT 'season_driver',count(*)::int FROM season_driver
      UNION ALL SELECT 'roster_assignment',count(*)::int FROM roster_assignment
      UNION ALL SELECT 'race',count(*)::int FROM race
      UNION ALL SELECT 'race_revision',count(*)::int FROM race_revision
      UNION ALL SELECT 'race_result',count(*)::int FROM race_result
      UNION ALL SELECT 'ledger_entry',count(*)::int FROM ledger_entry
      UNION ALL SELECT 'transfer',count(*)::int FROM transfer
      UNION ALL SELECT 'audit_log',count(*)::int FROM audit_log`);
    const size = await client.query("SELECT pg_total_relation_size('source_document_archive')::bigint AS bytes");
    const sampleTeam = reconciliation.find((item: any) => item.movements.length);
    const queryStart = performance.now();
    if (sampleTeam) await client.query(`SELECT l.secuencia,l.amount FROM ledger_entry l JOIN season_team st ON st.id=l.season_team_id
      JOIN season s ON s.id=l.season_id JOIN team t ON t.id=st.team_id
      WHERE s.slug=$1 AND t.external_key=$2 ORDER BY l.secuencia`, [sampleTeam.splitId, sampleTeam.teamId]);
    const queryMs = performance.now() - queryStart;
    report = { sourceDocuments: rows.length, coverage,
      images: { sourceOccurrences: included.reduce((sum, doc) => sum + countEmbeddedImages(doc.data), 0),
        uniqueFiles: verified.size, verifiedSha256: Object.fromEntries(verified) },
      normalizedCounts: Object.fromEntries(counts.rows.map(row => [row.entity, row.n])),
      reconciliationStatus: reconciliation.some(item => item.difference !== 0) ? 'pending_owner_review' : 'matches',
      reconciliation, performance: { migrationMs: Math.round(performance.now() - start), archiveBytes: Number(size.rows[0].bytes),
        ledgerQueryMs: Math.round(queryMs * 100) / 100 } };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
  console.log(JSON.stringify(report, null, 2));
}

if (process.argv[1]?.endsWith('migrate-staging-to-schema.ts')) {
  main().catch(error => { console.error(error); process.exitCode = 1; });
}
