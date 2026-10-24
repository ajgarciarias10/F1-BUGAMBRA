#!/usr/bin/env node
/**
 * Ownership guard: did an agent stay inside the files its ticket gave it?
 *
 * Why this exists. Several agents (Claude, Codex) work in this repo at once and
 * the rule is that nobody merges their own work. The check "did you stay inside
 * your ticket's files" used to be a promise made in chat, and a promise in chat
 * is not a property of the repository. This turns it into one. Ported from the
 * CleverTracker guard (tool/estado_agentes.py there), same exit codes.
 *
 * What it does: for a branch, gather the files it touched against a base
 * (committed, plus uncommitted if that branch is checked out in a worktree),
 * find the tickets that declare the branch as their `Work branch`, and compare
 * the files with `Owned files` and `Do not touch`.
 *
 * Two choices that matter:
 * - Tickets are read from the BASE ref, not from the branch. Otherwise an agent
 *   could widen its own scope by editing its own ticket.
 * - It never runs `git fetch`. Looking must not touch the network or move refs,
 *   so its answer is as fresh as your last fetch.
 *
 * Usage:
 *   node tool/agent-guard.mjs                       # board: every worktree
 *   node tool/agent-guard.mjs --branch feature/x    # only that branch
 *   node tool/agent-guard.mjs --base origin/main    # compare against another ref
 *   node tool/agent-guard.mjs --json                # machine-readable
 *   node tool/agent-guard.mjs --require-ticket      # a branch without a ticket fails
 *
 * Exit codes: 0 nobody left their files (or nothing to judge); 1 someone did;
 * 2 there is no reliable base to compare against, so nothing is judged.
 */
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const LABELS = ["Branch from", "Work branch", "Owned files", "Do not touch", "Agent and model", "Done when"];
const LABEL_LINE = /^\s*[-*]?\s*\*\*([^*]+?):\*\*\s*(.*)$/;

/** Ticket glob: `**` crosses folders, `*` stays in one, `dir/` means the whole tree. */
export function matchesPattern(path, pattern) {
  const p = pattern.endsWith("/") ? `${pattern}**` : pattern;
  let re = "";
  for (const part of p.split(/(\*\*\/|\*\*|\*|\?)/)) {
    if (part === "**/" || part === "**") re += ".*";
    else if (part === "*") re += "[^/]*";
    else if (part === "?") re += "[^/]";
    else re += part.replace(/[.+^${}()|[\]\\]/g, "\\$&");
  }
  return new RegExp(`^${re}$`).test(path);
}

/** Read the `- **Label:** value` header of a ticket; values may continue on following lines. */
export function parseTicket(path, text) {
  const lines = text.split(/\r?\n/);
  const values = {};
  for (let i = 0; i < lines.length; i += 1) {
    const m = LABEL_LINE.exec(lines[i]);
    if (!m || !LABELS.includes(m[1])) continue;
    const chunk = [m[2]];
    for (const next of lines.slice(i + 1)) {
      if (!next.trim() || next.startsWith("#") || LABEL_LINE.test(next)) break;
      chunk.push(next);
    }
    values[m[1]] = chunk.join(" ");
  }
  const ticks = (s = "") => [...s.matchAll(/`([^`]+)`/g)].map((x) => x[1]);
  const firstTitle = lines.find((l) => l.trim()) ?? path;
  const workBranch = ticks(values["Work branch"])[0] ?? (values["Work branch"] ?? "").trim().split(/\s+/)[0] ?? "";
  return {
    path,
    title: firstTitle.replace(/^#+\s*/, "").trim(),
    workBranch: workBranch.replace(/`/g, ""),
    owned: ticks(values["Owned files"]),
    forbidden: ticks(values["Do not touch"]),
  };
}

/** Judge a set of touched files against the tickets of one branch. */
export function judge(files, tickets) {
  const owned = tickets.flatMap((t) => t.owned);
  const forbidden = tickets.flatMap((t) => t.forbidden);
  const violations = [];
  for (const file of files) {
    const hit = forbidden.find((p) => matchesPattern(file, p));
    if (hit) violations.push({ file, reason: `listed in Do not touch (${hit})` });
    else if (!owned.some((p) => matchesPattern(file, p))) violations.push({ file, reason: "not in Owned files" });
  }
  return violations;
}

function git(args, cwd) {
  return execFileSync("git", args, { cwd, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }).trimEnd();
}

function tryGit(args, cwd) {
  try {
    return git(args, cwd);
  } catch {
    return null;
  }
}

/** Index tickets under docs/trabajo/ by the branch they declare, reading them from `base`. */
export function ticketsByBranch(root, base) {
  const listing = tryGit(["ls-tree", "-r", "--name-only", base, "docs/trabajo/"], root);
  const index = new Map();
  for (const file of (listing ?? "").split("\n").filter((f) => /\/tickets\/[^/]+\.md$/.test(f))) {
    const ticket = parseTicket(file, git(["show", `${base}:${file}`], root));
    if (!ticket.workBranch) continue;
    if (!index.has(ticket.workBranch)) index.set(ticket.workBranch, []);
    index.get(ticket.workBranch).push(ticket);
  }
  return index;
}

function worktrees(root) {
  const out = git(["worktree", "list", "--porcelain"], root);
  return out.split("\n\n").map((block) => {
    const path = /^worktree (.+)$/m.exec(block)?.[1];
    const branch = /^branch refs\/heads\/(.+)$/m.exec(block)?.[1] ?? null;
    return { path, branch };
  }).filter((w) => w.path);
}

function touchedFiles(root, base, branch, worktreePath) {
  const files = new Set();
  const committed = tryGit(["diff", "--name-only", `${base}...${branch}`], root);
  if (committed) committed.split("\n").filter(Boolean).forEach((f) => files.add(f));
  if (worktreePath) {
    const status = tryGit(["status", "--porcelain", "-uall"], worktreePath) ?? "";
    for (const line of status.split("\n").filter(Boolean)) files.add(line.slice(3).replace(/^.* -> /, "").replace(/^"|"$/g, ""));
  }
  return [...files].sort();
}

export function check({ root, base, only, requireTicket }) {
  if (tryGit(["rev-parse", "--verify", `${base}^{commit}`], root) === null) {
    return { code: 2, message: `Base "${base}" does not exist here. Fetch it or pass --base. Nothing was judged.`, results: [] };
  }
  const index = ticketsByBranch(root, base);
  const results = [];
  for (const wt of worktrees(root)) {
    if (!wt.branch || (only && wt.branch !== only)) continue;
    const tickets = index.get(wt.branch) ?? [];
    const files = touchedFiles(root, base, wt.branch, wt.path);
    if (tickets.length === 0) {
      results.push({ branch: wt.branch, files, tickets: [], violations: [], judged: false });
      continue;
    }
    results.push({ branch: wt.branch, files, tickets: tickets.map((t) => t.path), violations: judge(files, tickets), judged: true });
  }
  if (only && !results.length) {
    // Branch not checked out in any worktree: judge committed changes only.
    const tickets = index.get(only) ?? [];
    const files = touchedFiles(root, base, only, null);
    results.push({ branch: only, files, tickets: tickets.map((t) => t.path), violations: tickets.length ? judge(files, tickets) : [], judged: tickets.length > 0 });
  }
  const failed = results.some((r) => r.violations.length > 0 || (requireTicket && !r.judged && r.files.length > 0));
  return { code: failed ? 1 : 0, results };
}

function render(report, base) {
  if (report.message) return report.message;
  const lines = [`Ownership guard (base ${base})`];
  for (const r of report.results) {
    if (!r.judged) lines.push(`  ${r.branch}: ${r.files.length} file(s), no ticket declares this branch on ${base}; not judged`);
    else if (!r.violations.length) lines.push(`  ${r.branch}: OK, ${r.files.length} file(s) inside ${r.tickets.length} ticket(s)`);
    else {
      lines.push(`  ${r.branch}: ${r.violations.length} file(s) outside the ticket`);
      r.violations.forEach((v) => lines.push(`    - ${v.file}  (${v.reason})`));
    }
  }
  return lines.join("\n");
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const opt = (name) => (args.includes(name) ? args[args.indexOf(name) + 1] : undefined);
  const base = opt("--base") ?? "origin/main";
  const root = git(["rev-parse", "--show-toplevel"], process.cwd());
  const report = check({ root, base, only: opt("--branch"), requireTicket: args.includes("--require-ticket") });
  console.log(args.includes("--json") ? JSON.stringify(report, null, 2) : render(report, base));
  process.exit(report.code);
}
