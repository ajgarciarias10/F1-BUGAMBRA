# 15. Shell and routes of the new app

- **Branch from:** `feature/rediseno-app`
- **Work branch:** `feature/nueva-shell`
- **Owned files:** `apps/web/src/nueva/shell/**`, `apps/web/src/App.tsx`
- **Do not touch:** `apps/web/src/components/**` (old screens stay as they are), services, utils, hooks
- **Agent and model:** Claude subagent, default model
- **Done when:** the app opens in the prototype's shell: header with hamburger, side menu per role, mobile bottom bar, theme toggle, account button; each section has its route and shows a placeholder that links to the current panel until its screen ticket lands; old routes keep working.

## Context

Prototype: `generador/transform.py` and `overlay.css` define the header and menu; `index.html` shows the role menus.

## What to do

- Menu per role as in the prototype: guest (Clasificación, Equipos, Resultados, TV, Entrar, Instalar); user and pilot (Inicio, Campeonato, Carreras, Mercado, Equipos, TV, Perfil, Buzón; pilot adds Mi piloto); jeque and sporting director add Mi escudería; admin adds the admin sections and has no team (owner decision; an admin who also races keeps his pilot panel).
- No Paddock and no vote (removed in ticket 08).
- Route table with placeholders that ticket 26 will remove.

## Rules that apply

- Reference: `docs/redesign/prototipo-gemini/index.html` (open it in a browser), `docs/redesign/prototipo-gemini/generador/*.js` (the prototype logic per screen) and `docs/redesign/prototipo-gemini/decisiones.md`. Plan: `docs/trabajo/redesign/plan-app.md`, ADR 0004.
- Real data only, through `useSplits()`, `useUsuarios()`, `usePilotos()`, `useAuth()` and the existing services. Never write to Firestore except through an existing service function; never run scripts against the live database.
- Calculations, permissions and auth do not change unless this ticket says so. Keep `useSingleFlight` guards and audited writes.
- Spanish UI, mobile first: check 390 px and 1440 px, light and dark.
- Checks before pushing: `npx tsc --noEmit -p apps/web`, `npm run guardrails:economy`, `npx vite build` (in `apps/web`), `node tool/agent-guard.mjs --branch <your branch> --base feature/rediseno-app` exits 0.
- One logical change per commit, no agent signatures. Push only your branch; do not merge.

## Report

Template in `docs/agents/operating-procedure.md` §3.4, content in Spanish.
