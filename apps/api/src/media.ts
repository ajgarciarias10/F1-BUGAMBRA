import { readFile, lstat, realpath } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join, sep } from 'node:path';
import { createHash } from 'node:crypto';
import type { Request, Response } from 'express';

const directory = process.env.F1_MEDIA_DIR || join(homedir(), 'backups/f1-media');
const types: Record<string, string> = { jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif' };

function detectedMime(bytes: Buffer): string | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';
  if (bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return 'image/png';
  if (bytes.length >= 12 && bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP') return 'image/webp';
  if (bytes.length >= 6 && ['GIF87a', 'GIF89a'].includes(bytes.toString('ascii', 0, 6))) return 'image/gif';
  return null;
}

export async function readMigratedMedia(filename: string, root = directory): Promise<{ bytes: Buffer; mime: string } | null> {
  const match = /^([a-f0-9]{64})\.(jpg|png|webp|gif)$/.exec(filename);
  if (!match) return null;
  const expectedMime = types[match[2]!];
  const rootPath = await realpath(root);
  const target = join(rootPath, filename);
  const stat = await lstat(target);
  if (!stat.isFile() || stat.isSymbolicLink()) return null;
  const actual = await realpath(target);
  if (!actual.startsWith(rootPath + sep)) return null;
  const bytes = await readFile(actual);
  if (detectedMime(bytes) !== expectedMime) return null;
  if (createHash('sha256').update(bytes).digest('hex') !== match[1]) return null;
  return { bytes, mime: expectedMime! };
}

export async function serveMigratedMedia(request: Request, response: Response) {
  try {
    const file = await readMigratedMedia(request.params.filename || '');
    if (!file) { response.sendStatus(404); return; }
    response.setHeader('Content-Type', file.mime);
    response.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    response.send(file.bytes);
  } catch {
    response.sendStatus(404);
  }
}
