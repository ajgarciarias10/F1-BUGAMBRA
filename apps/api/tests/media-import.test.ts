import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, readFile, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { readMigratedMedia } from '../src/media.ts';
import { extractImages } from '../scripts/migrate-staging-to-schema.ts';

test('imagen extraída conserva exactamente los bytes originales y se sirve por hash', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'f1-media-'));
  const bytes = Buffer.from([0xff, 0xd8, 0xff, 0x12, 0x34, 0xff, 0xd9]);
  const hash = createHash('sha256').update(bytes).digest('hex');
  const verified = new Map<string, string>();
  const result = await extractImages({ foto_url: `data:image/jpeg;base64,${bytes.toString('base64')}` }, directory, verified);
  assert.equal(result.foto_url, `/api/media/${hash}.jpg`);
  assert.deepEqual(await readFile(join(directory, `${hash}.jpg`)), bytes);
  assert.equal(verified.get(`${hash}.jpg`), hash);
  assert.deepEqual(await readMigratedMedia(`${hash}.jpg`, directory), { bytes, mime: 'image/jpeg' });
});

test('la ruta rechaza traversal, listados, symlink, MIME falso y contenido cambiado', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'f1-media-'));
  const bytes = Buffer.from([0xff, 0xd8, 0xff, 0x12]);
  const hash = createHash('sha256').update(bytes).digest('hex');
  assert.equal(await readMigratedMedia('../etc/passwd', directory), null);
  assert.equal(await readMigratedMedia('', directory), null);
  await writeFile(join(directory, `${hash}.jpg`), Buffer.from('not a jpeg'));
  assert.equal(await readMigratedMedia(`${hash}.jpg`, directory), null);
  await writeFile(join(directory, `${hash}.jpg`), bytes);
  const other = await mkdtemp(join(tmpdir(), 'f1-media-other-'));
  await writeFile(join(other, `${hash}.jpg`), bytes);
  await symlink(join(other, `${hash}.jpg`), join(directory, `${hash}.png`));
  assert.equal(await readMigratedMedia(`${hash}.png`, directory), null);
  assert.equal(await readMigratedMedia(`${'0'.repeat(64)}.jpg`, directory).catch(() => null), null);
});

test('rechaza base64 cuyo MIME no coincide con los bytes', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'f1-media-'));
  const bytes = Buffer.from([0xff, 0xd8, 0xff, 0x12]);
  await assert.rejects(extractImages(`data:image/png;base64,${bytes.toString('base64')}`, directory), /MIME inválido/);
});
