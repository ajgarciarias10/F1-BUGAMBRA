// Serves the prototype and receives review marks. Zero dependencies.
// Run: node docs/redesign/serve.mjs [port]   ->  marks land in docs/redesign/reviews/
import { createServer } from "node:http";
import { readFile, mkdir, writeFile, rename } from "node:fs/promises";
import { extname, join, normalize, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = process.env.REVIEW_ROOT ?? join(here, "prototype");
const outDir = process.env.REVIEW_OUT ?? join(here, "reviews");
const port = Number(process.argv[2] ?? 18473);
const types = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp", ".woff2": "font/woff2" };
const MAX = 512 * 1024;
const queueFile = join(outDir, "queue.json");
// States: en-cola -> en-curso -> hecho | descartado. Claude edits queue.json (or runs queue.mjs) to move them.
const readQueue = async () => { try { return JSON.parse(await readFile(queueFile, "utf8")); } catch { return { items: [] }; } };
const writeQueue = async (q) => { await mkdir(outDir, { recursive: true }); const tmp = queueFile + ".tmp"; await writeFile(tmp, JSON.stringify(q, null, 2)); await rename(tmp, queueFile); };

createServer(async (req, res) => {
  try {
    const url = new URL(req.url, "http://x");
    if (req.method === "POST" && url.pathname === "/api/review") {
      let size = 0;
      const chunks = [];
      for await (const c of req) {
        size += c.length;
        if (size > MAX) { res.writeHead(413).end(); return; }
        chunks.push(c);
      }
      const body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
      if (!Array.isArray(body?.annotations)) { res.writeHead(400).end("no annotations"); return; }
      const q = await readQueue();
      const known = new Set(q.items.map((i) => i.id));
      const now = new Date().toISOString();
      let added = 0;
      for (const a of body.annotations) {
        if (!a?.id || known.has(a.id)) continue;
        q.items.push({ id: a.id, route: a.route, note: a.note, tags: a.tags, severity: a.severity, selector: a.selector, status: "en-cola", sentAt: now, updatedAt: now, reply: "", annotation: a });
        known.add(a.id);
        added += 1;
      }
      await writeQueue(q);
      res.writeHead(200, { "content-type": "application/json" }).end(JSON.stringify({ ok: true, added, duplicates: body.annotations.length - added, total: q.items.length }));
      return;
    }
    if (req.method === "GET" && url.pathname === "/api/queue") {
      const q = await readQueue();
      res.writeHead(200, { "content-type": "application/json", "cache-control": "no-store" }).end(JSON.stringify({ items: q.items.map(({ annotation, ...rest }) => rest) }));
      return;
    }
    if (req.method !== "GET" && req.method !== "HEAD") { res.writeHead(405).end(); return; }
    let path = normalize(decodeURIComponent(url.pathname)).replace(/^(\.\.[/\\])+/, "");
    if (path.endsWith("/")) path += "index.html";
    const file = join(root, path);
    if (!file.startsWith(root)) { res.writeHead(403).end(); return; }
    const data = await readFile(file);
    res.writeHead(200, { "content-type": types[extname(file)] ?? "application/octet-stream", "cache-control": "no-store" }).end(data);
  } catch (e) {
    res.writeHead(e.code === "ENOENT" ? 404 : 500).end(e.code === "ENOENT" ? "not found" : "error");
  }
}).listen(port, "127.0.0.1", () => console.log(`prototype on http://127.0.0.1:${port}`));
