# 08. Retire the Paddock and the driver-of-the-day vote

- **Branch from:** `feature/stitch-redesign` (after `main` has been merged into it)
- **Work branch:** `feature/retirar-paddock-votacion`
- **Owned files:** `apps/web/src/components/PaddockForum.tsx`, `apps/web/src/components/PaddockAdminPanel.tsx`, `apps/web/src/services/paddockAdminService.ts`, `apps/web/src/components/Dashboards.tsx`, `apps/web/src/components/PublicHome.tsx`, `apps/web/src/components/RaceResultsView.tsx`, `apps/web/src/components/AdminDashboard.tsx` (only the Paddock tab and its import), `apps/web/src/services/readModels.ts` (only the voting read model), `apps/web/src/services/raceProcessor.ts` (only the vote functions), `apps/web/src/types/index.ts` (only voting/paddock types), their tests, `docs/BACKLOG.md`
- **Do not touch:** economy services and utils, `firestore.rules`, any Firestore data, `apps/api/**`
- **Agent and model:** Claude, default model
- **Done when:** no screen shows the Paddock wall, welcome posters, Comunidad or the driver-of-the-day vote; nothing imports the removed files; typecheck, web tests and build pass; the economy guardrails pass; the stored `paddock_posts` and `piloto_dia_*` data are left untouched.

## Context

Owner decision of 2026-10-22 (`docs/redesign/prototipo-gemini/decisiones.md`): the league did not like the voting system; the Paddock goes too. This is a behaviour change approved by the owner, so it is its own ticket and not part of the presentation tickets 04 and 05. Run it before them: it removes UI they would otherwise restyle.

## What to do

Remove the screens, tabs, menu entries and admin section, plus the client code that only served them. Keep the data in Firestore (no deletes) and leave the rules as they are; a later ticket can retire them. Confirm first that `syncMarketLifecycle` and split closing do not depend on `paddock_bienvenidas_aprobadas`; if they do, stop and report.

## Report

Template in `docs/agents/operating-procedure.md` §3.4.
