# 05. Admin screens

- **Branch from:** `feature/stitch-redesign`
- **Work branch:** `feature/redesign-admin-screens`
- **Owned files:** `apps/web/src/components/AdminDashboard.tsx`, `apps/web/src/components/AdminControlPanel.tsx`, `apps/web/src/components/AdminRivalriesPanel.tsx`, `apps/web/src/components/AdminTeamManager.tsx`, `apps/web/src/components/AdminUsersPanel.tsx`, `apps/web/src/components/EconomyAdminPanel.tsx`, `apps/web/src/components/EconomyRulesPanel.tsx`, `apps/web/src/components/FiaFinancialReportModal.tsx`, `apps/web/src/components/RaceReportModal.tsx`, `apps/web/src/components/RaceWinnersImagePanel.tsx`, `apps/web/src/components/MediaSyncPanel.tsx`, `apps/web/src/components/PaddockAdminPanel.tsx`, `apps/web/src/components/SplitBuilderPanel.tsx`, `apps/web/src/components/SplitIntroGallery.tsx`, `apps/web/src/components/SplitIntroPanel.tsx`, `apps/web/src/components/SplitRestorePanel.tsx`, `apps/web/src/components/DatabaseExplorer.tsx`, `apps/web/src/components/AuctionRoom.tsx`, `apps/web/src/components/MarketDeadlineView.tsx`, `apps/web/src/components/StorageImageUpload.tsx`
- **Do not touch:** `apps/api/**`, `apps/web/src/services/**`, `apps/web/src/utils/**`, `apps/web/src/types/**`, `apps/web/src/index.css`, `apps/web/src/components/ui/**`, `apps/web/src/components/App.tsx`, every user-facing component
- **Agent and model:** Claude (economy screens: one agent, owner watching, per `reparto-entre-agentes.md`)
- **Done when:** the screens in scope match the approved prototype in `docs/redesign/prototype/` in light and dark at 390px and 1440px; `npx tsc --noEmit`, `npx vite build` and `npm test --workspace @f1-bugambra/web` pass; `node tool/agent-guard.mjs --branch feature/redesign-admin-screens --base feature/stitch-redesign` exits 0; no calculation, write path, permission, route or auth changed; the single-flight guards and audited-write calls are untouched.

## Context

ADR 0002. Blocked until ticket 02 (owner review of the prototype) is closed. Apply only what the owner approved; the exported Review-mode notes are the input for what to change. Presentation only: AGENTS.md rule 8.

## What to do

Restyle the admin area to the prototype, keeping it visibly separate from user views. Economy and transaction code paths must be untouched; `npm run guardrails:economy` equivalents (web typecheck and tests) must pass. Keep the useSingleFlight guards and audited writes. Depends on ticket 03.

## Report

Template in `docs/agents/operating-procedure.md` §3.4. List what you did not do and what you could not verify without a browser.
