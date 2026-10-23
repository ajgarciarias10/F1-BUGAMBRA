# 19. Role homes, profile, suggestions, login and install

- **Branch from:** `feature/rediseno-app` (after tickets 13, 14 and 15 are merged)
- **Work branch:** `feature/nueva-inicio`
- **Owned files:** `apps/web/src/nueva/pantallas/Inicio.tsx`, `apps/web/src/nueva/pantallas/Inicio.test.ts`, `apps/web/src/nueva/pantallas/Perfil.tsx`, `apps/web/src/nueva/pantallas/Perfil.test.ts`, `apps/web/src/nueva/pantallas/Buzon.tsx`, `apps/web/src/nueva/pantallas/Buzon.test.ts`, `apps/web/src/nueva/pantallas/Acceso.tsx`, `apps/web/src/nueva/pantallas/Acceso.test.ts`, `apps/web/src/nueva/pantallas/Instalar.tsx`, `apps/web/src/nueva/pantallas/Instalar.test.ts`
- **Do not touch:** `apps/web/src/nueva/datos/**`, `apps/web/src/nueva/ui/**`, `apps/web/src/nueva/shell/**` (ask the coordinator if you need a change there), services, utils, old components
- **Agent and model:** Codex, mid-tier model, medium reasoning
- **Done when:** each role's home matches the prototype (jeque and director: team and balance, never 0 for an unknown balance; pilot; user; commissioner: pending acts and unprocessed economy); profile, suggestions, login and install keep their current logic with the new look.

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
