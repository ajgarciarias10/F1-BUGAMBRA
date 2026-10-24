// Move marks through the queue. Usage:
//   node docs/redesign/queue.mjs list
//   node docs/redesign/queue.mjs set <id|all> <en-cola|en-curso|hecho|descartado> ["respuesta visible para el dueño"]
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
const file = process.env.REVIEW_OUT ? join(process.env.REVIEW_OUT, "queue.json") : join(dirname(fileURLToPath(import.meta.url)), "reviews", "queue.json");
const q = JSON.parse(readFileSync(file, "utf8"));
const [cmd, id, status, ...reply] = process.argv.slice(2);
if (cmd === "list") for (const i of q.items) console.log(i.id, i.status, i.route, "-", (i.note || "").slice(0, 70));
else if (cmd === "set" && ["en-cola", "en-curso", "hecho", "descartado"].includes(status)) {
  for (const i of q.items) if (id === "all" || i.id === id) { i.status = status; i.updatedAt = new Date().toISOString(); if (reply.length) i.reply = reply.join(" "); }
  writeFileSync(file, JSON.stringify(q, null, 2));
  console.log("ok");
} else { console.error("uso: list | set <id|all> <estado> [respuesta]"); process.exit(2); }
