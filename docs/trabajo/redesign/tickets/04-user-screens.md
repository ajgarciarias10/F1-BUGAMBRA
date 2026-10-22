# 04. Jeque, user and public screens

- **Branch from:** `feature/rediseno-app`
- **Work branch:** `feature/redesign-user-screens`
- **Owned files:** `apps/web/src/components/PublicHome.tsx`, `apps/web/src/components/Dashboards.tsx`, `apps/web/src/components/TeamEconomyView.tsx`, `apps/web/src/components/TeamsView.tsx`, `apps/web/src/components/RaceResultsView.tsx`, `apps/web/src/components/TotalStandings.tsx`, `apps/web/src/components/ProfileView.tsx`, `apps/web/src/components/NextRaceWidget.tsx`, `PilotCardF1.tsx`, `apps/web/src/components/PilotDetailModal.tsx`, `apps/web/src/components/FomLive.tsx`, `apps/web/src/components/PaddockForum.tsx`, `apps/web/src/components/SuggestionsView.tsx`, `apps/web/src/components/Feedback.tsx`, `apps/web/src/components/SharedDashboard.tsx`, `apps/web/src/components/SeasonReviewPanel.tsx`, `apps/web/src/components/LoginRegister.tsx`, `apps/web/src/components/InstallApp.tsx`, `apps/web/src/components/RivalryPanels.tsx`
- **Do not touch:** `apps/api/**`, `apps/web/src/services/**`, `apps/web/src/utils/**`, `apps/web/src/types/**`, `apps/web/src/index.css`, `apps/web/src/components/ui/**`, `apps/web/src/components/App.tsx`, every `Admin*` and economy admin component
- **Agent and model:** Claude subagent, default model (one agent per screen group may be split further by the coordinator)
- **Done when:** the screens in scope match the approved prototype in `docs/redesign/prototipo-gemini/` (owner decisions: `docs/redesign/prototipo-gemini/decisiones.md`) in light and dark at 390px and 1440px; `npx tsc --noEmit`, `npx vite build` and `npm test --workspace @f1-bugambra/web` pass; `node tool/agent-guard.mjs --branch feature/redesign-user-screens --base feature/rediseno-app` exits 0; no calculation, write path, permission, route or auth changed; the single-flight guards and audited-write calls are untouched.

## Context

ADR 0002. Ticket 02 closed on 2026-10-22: the owner approved `docs/redesign/prototipo-gemini/`. Apply only what `decisiones.md` records as approved. Presentation only: AGENTS.md rule 8.

## What to do

Restyle the user-facing screens to the prototype. Keep the jeque read-only for budgets, DNF / did-not-race / unknown position distinct, videos loaded only after Play, and honest empty and error states. Depends on ticket 03.

## Report

Template in `docs/agents/operating-procedure.md` §3.4. List what you did not do and what you could not verify without a browser.
