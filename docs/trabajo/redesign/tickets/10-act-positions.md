# 10. Race act: positions 1 to 20, qualifying "did not run", position after a penalty

- **Branch from:** `feature/rediseno-app`
- **Work branch:** `feature/acta-posiciones`
- **Owned files:** the results-entry part of `apps/web/src/components/AdminDashboard.tsx`, `apps/web/src/types/index.ts` (result fields only), `apps/web/src/utils/economyRules.ts` and `apps/web/src/services/economyService.ts` only if the penalty position must feed points, their tests
- **Do not touch:** other admin sections, transfer and split services
- **Agent and model:** Claude, owner watching (economy path)
- **Done when:** the admin can enter qualifying and race positions from 1 to 20 or "did not run", fastest lap and FIA status; repeated positions are flagged before saving; a penalised driver can carry a position after the penalty; economy guardrails pass with tests for the new fields.

## Context

Owner decisions of 2026-10-22. Today a position change after a penalty means reopening the act (which reverts the economy of the latest processed race) and editing the result. The owner asked whether the position can be adjusted later: it can by reopening; storing both the track position and the post-penalty position is a data-model change and needs the owner's explicit approval before coding. Keep DNF, did-not-run and unknown position distinct (AGENTS.md).

## What to do

First confirm with the owner which position pays points (post-penalty, presumably). Then implement the entry and validation, and decide with the owner whether to store both positions.

## Report

Template in `docs/agents/operating-procedure.md` §3.4.
