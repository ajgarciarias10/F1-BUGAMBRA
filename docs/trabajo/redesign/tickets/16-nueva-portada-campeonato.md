# 16. Home and championship screens

- **Branch from:** `feature/rediseno-app` (after tickets 13, 14 and 15 are merged)
- **Work branch:** `feature/nueva-campeonato`
- **Owned files:** `apps/web/src/nueva/pantallas/Portada.tsx`, `apps/web/src/nueva/pantallas/Campeonato.tsx` and their tests
- **Do not touch:** `apps/web/src/nueva/datos/**`, `apps/web/src/nueva/ui/**`, `apps/web/src/nueva/shell/**` (ask the coordinator if you need a change there), services, utils, old components
- **Agent and model:** Claude subagent, default model
- **Done when:** public home (hero, next GP with the real date or «Fecha por confirmar», tabs) and Championship (season rail; pilots, teams and duos for Origins; races; honours; aligned evolution; driver cards and head-to-head) match the prototype with real data.

## Context

Rebuild this part of the prototype in React with real data, using `nueva/datos` and `nueva/ui`. Plug the screen into the route the shell (ticket 15) reserved for it by exporting it from your file; the coordinator wires it.

## Rules that apply

- Reference: `docs/redesign/prototipo-gemini/index.html` (open it in a browser), `docs/redesign/prototipo-gemini/generador/*.js` (the prototype logic per screen) and `docs/redesign/prototipo-gemini/decisiones.md`. Plan: `docs/trabajo/redesign/plan-app.md`, ADR 0004.
- Real data only, through `useSplits()`, `useUsuarios()`, `usePilotos()`, `useAuth()` and the existing services. Never write to Firestore except through an existing service function; never run scripts against the live database.
- Calculations, permissions and auth do not change unless this ticket says so. Keep `useSingleFlight` guards and audited writes.
- Spanish UI, mobile first: check 390 px and 1440 px, light and dark.
- Checks before pushing: `npx tsc --noEmit -p apps/web`, `npm run guardrails:economy`, `npx vite build` (in `apps/web`), `node tool/agent-guard.mjs --branch <your branch> --base feature/rediseno-app` exits 0.
- One logical change per commit, no agent signatures. Push only your branch; do not merge.

## Report

Template in `docs/agents/operating-procedure.md` §3.4, content in Spanish.
