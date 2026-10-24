# 27. Save each team's balance after every processed race

- **Branch from:** `feature/rediseno-app`
- **Work branch:** `feature/saldo-tras-gp`
- **Owned files:** `apps/web/src/services/economyService.ts`, `apps/web/src/services/transferService.test.ts`, `apps/web/src/types/index.ts`, `docs/economia-y-fichajes.md`
- **Do not touch:** every component, `apps/web/src/nueva/**`, `firestore.rules`, any live data
- **Agent and model:** decided by TypeSafe (level top); economy path, the owner reviews before it reaches the preview
- **Done when:** processing a race's economy stores, in the same transaction, each team's balance before and after that race on the circuit document (`economia_saldos: { [equipoId]: { antes, ingresos, despues } }`, numbers in millions, read inside the transaction); reverting that race removes it in the same transaction; the retroactive split processing does the same per race; `npm run guardrails:economy` passes with new tests for processing, reverting, a team that earns nothing, negative balances and a retry, each proven by a negative control.

## Context

Owner decision of 2026-10-23: the team evolution chart must show the real balance after each GP. Today the ledger entries of a processed race carry `splitId` and `circuitoId` but no balance, so the balance after a GP cannot be known (finding of ticket 13). `procesarEconomiaCarrera` already reads every team inside its transaction and increments `presupuesto` by the race's earnings: the balance before is that read value and the balance after is that value plus the earnings.

## What to do

Add the field in `procesarEconomiaCarrera`, `revertirEconomiaCarrera` and `procesarEconomiaRetroactivaSplit` (read them fully first), add the type, document it in `docs/economia-y-fichajes.md`. Market operations between races (pacts, transfers, manual adjustments) move the balance too: `antes` of the next race already includes them, which is correct; do not try to attribute them to a GP. Never change how much is credited.

## Rules that apply

AGENTS.md economy guardrails and admin transaction reliability: one transaction, read current values inside it, nothing applied on failure. A passing test is not a live update.

## Report

Template in `docs/agents/operating-procedure.md` §3.4, content in Spanish.
