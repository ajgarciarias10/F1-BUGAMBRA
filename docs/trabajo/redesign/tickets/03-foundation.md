# 03. Foundation: tokens, shared primitives, shell

- **Branch from:** `feature/stitch-redesign`
- **Work branch:** `feature/redesign-foundation`
- **Owned files:** `apps/web/src/index.css`, `apps/web/index.html`, `apps/web/src/components/ui/**`, `apps/web/src/hooks/useTheme.ts`, `apps/web/src/components/widgetStyles.ts`, `apps/web/src/components/MobileBottomTabs.tsx`
- **Do not touch:** `apps/api/**`, `apps/web/src/services/**`, `apps/web/src/utils/**`, `apps/web/src/types/**`, `apps/web/src/App.tsx`, every other component
- **Agent and model:** Codex, mid-tier model, medium reasoning (ADR 0003)
- **Done when:** the screens in scope match the approved prototype in `docs/redesign/prototipo-gemini/` (owner decisions: `docs/redesign/prototipo-gemini/decisiones.md`) in light and dark at 390px and 1440px; `npx tsc --noEmit`, `npx vite build` and `npm test --workspace @f1-bugambra/web` pass; `node tool/agent-guard.mjs --branch feature/redesign-foundation --base feature/stitch-redesign` exits 0; no calculation, write path, permission, route or auth changed; the single-flight guards and audited-write calls are untouched.

## Context

ADR 0002. Ticket 02 closed on 2026-10-22: the owner approved `docs/redesign/prototipo-gemini/`. Apply only what `decisiones.md` records as approved. Presentation only: AGENTS.md rule 8.

## What to do

Port the prototype design system (tokens, type, elevation, motion, light and dark) into `index.css` and rebuild the `components/ui` primitives to match the prototype component inventory. Keep the exported primitive names and props working so screens do not break; add new ones where the prototype needs them. This ticket merges first: tickets 04 to 06 depend on it.

## Report

Template in `docs/agents/operating-procedure.md` §3.4. List what you did not do and what you could not verify without a browser.
