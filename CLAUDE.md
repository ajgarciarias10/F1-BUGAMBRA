# F1 Bugambra: project context for Claude

The rules are not here. They live in [`AGENTS.md`](AGENTS.md), the name most tools read at startup, so every agent follows the same ones. The working steps are in [`docs/agents/operating-procedure.md`](docs/agents/operating-procedure.md). This file is context only; if it contradicts them, they win.

## What this is

A private Formula 1 league web app (Spanish UI). Jeques (team owners) consult their team, balances, ledger, calendar, results and notices; the admin enters results, FIA decisions and economy operations after the league announces them on WhatsApp. Mostly used from phones.

## Stack and layout

- npm workspaces: `apps/web` (Vite, React 19, Tailwind v4, react-router 7, Firebase client) and `apps/api` (Express, firebase-admin, Gemini media endpoint, correction/reconciliation services, tests).
- `apps/web/src/components/` screens; `components/ui/` shared primitives; `services/` Firestore read models and audited writes; `utils/` pure rules (economy in `presupuesto.ts`, `economyRules.ts`).
- Hosting: Vercel (`vercel.json`). Firestore rules in `firestore.rules`.

## Commands (from the repo root; `corepack` may be missing on some machines, then call the tools from `apps/web` directly)

    npm run typecheck
    npm run guardrails:economy      # web typecheck + web tests; required before reporting an economy change as verified
    npm test                        # api tests
    npm run build

## Where work is tracked

Open work: [`docs/BACKLOG.md`](docs/BACKLOG.md). Details per feature: `docs/trabajo/<slug>/`. Decisions: [`docs/adr/`](docs/adr/). No state lists are kept in this file because they go stale.

## Preview of a branch

If Vercel does not build a branch, a quick preview can be served from a static copy of `apps/web/dist` behind a separate Caddy container, and exposed with a temporary tunnel. Update it by copying files into the existing folder, never by deleting and recreating it (the container keeps a mount on the folder). The preview talks to the live Firebase project: do not click admin actions on it.
