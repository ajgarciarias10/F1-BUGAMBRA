# 13. Data layer for the new app (read models)

- **Branch from:** `feature/rediseno-app`
- **Work branch:** `feature/nueva-datos`
- **Owned files:** `apps/web/src/nueva/datos/**`, `apps/web/package.json` (only the `test` script, to add `src/nueva/**/*.test.ts`)
- **Do not touch:** `apps/web/src/services/**`, `apps/web/src/utils/**`, `apps/web/src/hooks/**`, every component
- **Agent and model:** Claude subagent, default model
- **Done when:** pure, tested functions turn `useSplits()` data into what the prototype screens show; tests cover Split 3 figures from the prototype (team points per GP, Temporada 1 totals 383/377/347 for Zenith/Alfa Romero/Roses at the time of writing, per-circuit income matching `procesarEconomiaCarrera`); a `useLiga()` hook exposes them.

## Context

The prototype computes everything in `generador/liga-block.js`, `standings-block.js`, `equipos-block.js` and `admin-block.js` from a snapshot of the same Firestore data the app already loads. Port that logic to typed, pure TypeScript.

## What to do

- Seasons: Origins (individual, by duos; positions deduced from standard points with `origins-detalle.json`, owner-approved exception in `AGENTS.md`), each split, and the Temporada 1 aggregate (sum of splits; per-GP team points with each split's roster; every pilot who raced for each team).
- Standings for pilots and teams per season; per-GP points and cumulative series aligned to the calendar; carry-over balances between splits (closing of one split = opening of the next).
- Card of a pilot in a given season (team and `rating_piloto` of that split; tiers as in `PilotCardF1.tsx`: ELITE ≥ 90, PRO ≥ 85, ADV ≥ 80, CORE).
- Per-circuit income preview per team (points × factor, pole, fastest lap, participation, no-penalty, rivalries) reusing `economyRules` and `pointsForRaceResult` from `utils/economyRules.ts`; it must equal what `procesarEconomiaCarrera` credits. Do not copy constants.
- Copy `origins-detalle.json` from the generator into `nueva/datos/` with a note of its source (the league's Origins workbook).

## Rules that apply

- Reference: `docs/redesign/prototipo-gemini/index.html` (open it in a browser), `docs/redesign/prototipo-gemini/generador/*.js` (the prototype logic per screen) and `docs/redesign/prototipo-gemini/decisiones.md`. Plan: `docs/trabajo/redesign/plan-app.md`, ADR 0004.
- Real data only, through `useSplits()`, `useUsuarios()`, `usePilotos()`, `useAuth()` and the existing services. Never write to Firestore except through an existing service function; never run scripts against the live database.
- Calculations, permissions and auth do not change unless this ticket says so. Keep `useSingleFlight` guards and audited writes.
- Spanish UI, mobile first: check 390 px and 1440 px, light and dark.
- Checks before pushing: `npx tsc --noEmit -p apps/web`, `npm run guardrails:economy`, `npx vite build` (in `apps/web`), `node tool/agent-guard.mjs --branch <your branch> --base feature/rediseno-app` exits 0.
- One logical change per commit, no agent signatures. Push only your branch; do not merge.

## Report

Template in `docs/agents/operating-procedure.md` §3.4, content in Spanish.
