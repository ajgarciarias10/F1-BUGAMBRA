# 28. Rebuild the balance after each already-processed race

- **Branch from:** `feature/rediseno-app` (after 27 is merged)
- **Work branch:** `feature/reconstruir-saldos`
- **Owned files:** a new `apps/web/src/services/saldosHistoricosService.ts` and its test `apps/web/src/services/saldosHistoricosService.test.ts`, a new `apps/web/src/components/SaldosHistoricosPanel.tsx`, the admin tab registration in `apps/web/src/components/AdminDashboard.tsx` (only the import and one tab entry)
- **Do not touch:** `economyService.ts`, `transferService.ts`, `apps/web/src/nueva/**`
- **Agent and model:** decided by TypeSafe (level top); the owner reviews and runs it
- **Done when:** an admin tool previews, per split and team, the balance after each processed race rebuilt from the ledger (opening balance + every ledger entry up to that race, in order) and checks that the last rebuilt value equals the stored `presupuesto`; only if it matches, and after the owner confirms, it writes `economia_saldos` with `origen: "reconstruido"` through an audited write; a mismatch is shown with its size and nothing is written.

## Context

Ticket 27 only covers races processed from now on. Split 3's Hungary, Netherlands and Italy were processed before it. AGENTS.md: Hungary is not reconciled with the official workbook; the tool must show that and never fill a balance it cannot prove.

## Report

Template in `docs/agents/operating-procedure.md` §3.4, content in Spanish.
