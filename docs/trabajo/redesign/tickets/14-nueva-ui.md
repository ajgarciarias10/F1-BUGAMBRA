# 14. Visual pieces for the new app

- **Branch from:** `feature/rediseno-app`
- **Work branch:** `feature/nueva-ui`
- **Owned files:** `apps/web/src/nueva/ui/**`
- **Do not touch:** `apps/web/src/nueva/datos/**`, `apps/web/src/nueva/shell/**`, `apps/web/src/components/**`, `apps/web/src/services/**`, `apps/web/src/utils/**`, `apps/web/src/hooks/**`
- **Agent and model:** Codex, mid-tier model, medium reasoning
- **Done when:** each piece renders like the prototype from plain props (no data fetching): aligned evolution grid (chart and table share columns, sticky first column, pending GPs hatched, group bands per split), season rail, F1-style driver card, team card with photo lineup, flip card modal (the photo must not show through the back), KPI card, segmented control use, admin table styles, rivalry chips, video card; a demo page `nueva/ui/Demo.tsx` shows them all with sample props.

## Context

The prototype's markup and CSS are the spec: `generador/evo.css`, `generador/overlay.css` and the render functions in `generador/*.js`. Tokens already live in `apps/web/src/index.css` (ticket 03); reuse them, add component CSS in `nueva/ui/nueva.css`.

## What to do

Build typed React components with the prototype's look and behaviour, accessible (keyboard, labels, 44 px targets) and with `prefers-reduced-motion` respected. No business logic: the screens pass ready data.

## Rules that apply

- Reference: `docs/redesign/prototipo-gemini/index.html` (open it in a browser), `docs/redesign/prototipo-gemini/generador/*.js` (the prototype logic per screen) and `docs/redesign/prototipo-gemini/decisiones.md`. Plan: `docs/trabajo/redesign/plan-app.md`, ADR 0004.
- Real data only, through `useSplits()`, `useUsuarios()`, `usePilotos()`, `useAuth()` and the existing services. Never write to Firestore except through an existing service function; never run scripts against the live database.
- Calculations, permissions and auth do not change unless this ticket says so. Keep `useSingleFlight` guards and audited writes.
- Spanish UI, mobile first: check 390 px and 1440 px, light and dark.
- Checks before pushing: `npx tsc --noEmit -p apps/web`, `npm run guardrails:economy`, `npx vite build` (in `apps/web`), `node tool/agent-guard.mjs --branch <your branch> --base feature/rediseno-app` exits 0.
- One logical change per commit, no agent signatures. Push only your branch; do not merge.

## Report

Template in `docs/agents/operating-procedure.md` §3.4, content in Spanish.
