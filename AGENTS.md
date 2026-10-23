# Rules for any agent working in this repository

Claude, Codex and any other tool read this same file. Read it fully before touching anything. The economy and data guardrails further down are unchanged and still apply to every task.

## How we work

1. **One branch per piece of work**, named for what it does (`feature/...`, `fix/...`, `docs/...`), never for who wrote it. Do not commit big changes on whatever branch you found checked out.
2. **The ticket decides your scope.** Non-trivial work arrives as `docs/trabajo/<slug>/tickets/NN-<name>.md` (template: `docs/plantillas/ticket.md`). Touch only the files in its `Owned files:`. If you need something that is not written there, the ticket is incomplete: say so, do not improvise. Read-only investigations need no ticket.
3. **One logical change, one commit, with its proof.** Nothing validated stays uncommitted, nothing is committed red, and a fix ships with a test that fails before it and passes after.
4. **Push only your own branch.** Only the owner integrates (merges) anything into `main` or the integration branch. No agent merges, force-pushes someone else's work, or deploys.
5. **No agent signatures.** Commit messages and PR descriptions carry no `Co-Authored-By`, no tool names, no "generated with". The author is the project owner.
6. **Stop and ask before adding a dependency or technique that is not already in the repo.** "Only to try it" does not count.
7. **Read the callee before writing a fallback.** Before any `try/catch`, `||`, `??` or default that rescues a main path, read the body of that path and find what it really treats as failure.
8. **Presentation work never changes behaviour.** A redesign must not alter calculations, Firestore writes, transactions, permissions, routes or auth. Keep the single-flight guards and audited writes intact on every action.
9. **Prototype before implementation for large visual changes.** Review a static prototype first (`docs/redesign/prototype/`), then implement only what the owner approved.
10. **Retire what is discarded in the same turn**: the doc section, the branch, the unused file. History stays in git; no current document may keep presenting discarded work as valid.
11. **Cost discipline for agents.** The default model for delegated work is the mid-tier one; the top-tier model only with the owner's say-so (see `docs/agents/reparto-entre-agentes.md`). Do not re-read what you already know or start a task over after an interruption: continue it.

## Where the rest lives

| File | What it holds |
|---|---|
| `CLAUDE.md` | Project context: stack, layout, how to run and preview |
| `docs/agents/operating-procedure.md` | The steps, in order, from pre-flight to closing a ticket |
| `docs/agents/reparto-entre-agentes.md` | Which kind of work goes to which agent and model; who integrates |
| `docs/plantillas/ticket.md` | The ticket template |
| `docs/BACKLOG.md` | What is open right now |
| `docs/adr/` | Decisions already taken; do not revive them without a new reason |

If any of those contradicts this file, this file wins.

# Repository guardrails

## Economy and transfer corrections

- Treat the current official league workbook as the source for recorded results, transfer prices, and manually adjusted team budgets. Record the sheet, cells or rows, and workbook version used in reconciliation notes.
- Names can differ between the workbook and the app. Resolve aliases using an explicit, reviewable mapping; for this workbook, **Alex is Mimic**. Do not infer that a database price is correct just because the names map.
- A correction to an existing purchase must settle only the difference from the stored purchase price. Use the shared price and balance functions in `apps/web/src/utils/presupuesto.ts`; do not recalculate the full roster cost against an inherited balance.
- Positive prices are team expenses and negative prices are team income. Preview and commit must use the same calculation. Reject a charge that would take the team below zero and report the shortfall.
- Keep admin adjustments generic and reasoned. Do not add one-off buttons or code constants that write a particular driver's or team's correction. Store a before/after record atomically with the edit.
- Admin actions must prevent duplicate submissions while saving and show a clear success or failure message. Meaningful data edits must preserve a before/after audit record.
- Any economy rule or transaction change needs regression coverage for refunds, extra charges, insufficient funds, negative prices, and unchanged prices. Run `npm run guardrails:economy` from the repository root before reporting it as verified. GitHub Actions runs the same command on pushes to `main` and pull requests.
- Never report a correction as applied to Firestore unless the transaction succeeded in the authenticated admin environment. A local preview or passing test is not a live database update.

## Results and season boundaries

- Zero points alone do not mean a driver retired. Preserve an unknown position as unknown; mark DNF only when the result entry explicitly says DNF.
- Never infer qualifying or finishing positions from points. Points can validate a recorded position, but cannot reconstruct it uniquely. Only exception, owner decision of 2026-10-22: Origins, which stored points only, shows positions deduced from its standard points as described in `docs/redesign/prototipo-gemini/decisiones.md`.
- Live Firestore was read on 2026-10-10: Split 3 Hungary exists with results, is complete, and has its act closed, but `economia_procesada` is false. Do not treat its payouts as applied; preserve the current state until its economy has been reconciled and the admin confirms the replay.
- Official workbook checkpoint before Hungary: use `presupuesto_inicial` minus the full Split 3 transfer totals in sheet `2026` (`R51` Zenith 126.8M, `R52` Roses 65.9M, `R53` Alfa Romero 115.2M). This yields Zenith 36.3M, Roses 50.0M, Alfa Romero 50.0M. Live balances read 2026-10-10 were Zenith 41.3M, Roses 50M, Alfa Romero 135M, so the pre-Hungary differences are -5M, 0M and -85M, respectively. These are reconciliation targets, not an applied database correction. Owner, 2026-10-23: Roses and Alfa Romero land on exactly 50.0M because every team starts the season with at most 50M (`tope_presupuesto_subasta`, applied by `auctionService` when the season starts, with a `tope_subasta__<split>__<team>` ledger entry).
- Workbook prices (`2026` sheet: Mimic/Alex `X65` 50.2M, Pinilla `X71` 22.6M, Carlos `X77` 21.2M, Dani `X81` 21.2M) total 115.2M for Alfa Romero. Live prices were 28.9M, 22.6M, 0M and 0M. The current purchase-price fields alone imply +63.7M to settle; the remaining 21.3M is a historical balance/price mismatch for Pinilla because the live price field is already corrected while the balance still reflects the old charge. Reconcile the total balance delta of 85M without charging that difference twice.
- Hungary does not yet reconcile to the workbook payout totals. Workbook inferred team earnings are Alfa 16.1M, Zenith 17.5M and Roses 7.9M; current result-derived earnings plus live rivalry config differ (notably the live groups omit Dani's 3M solo rivalry, produce different results for Moles/Pinilla, and the clean-team flag would grant Alfa 3M that the workbook does not include). Resolve these source differences before processing Hungary's economy.
- Keep each payout source identifiable in the ledger (race points, pole, fastest lap, clean-team award, participation, rivalry, constructors, and manual adjustments), even when the UI shows a combined total.

## Admin transaction reliability

- Put dependent document updates and their ledger/audit entries in one Firestore transaction. Use stable operation identifiers where retries could otherwise charge or refund twice.
- Read current values inside the transaction; do not trust a stale panel snapshot for balance validation.
- On failure, report that nothing was applied. After success, reload from Firestore before claiming the new state.

## Gemini generated race media

- Never expose `GEMINI_API_KEY` in Vite variables, frontend code, or browser requests. Gemini requests must go through the authenticated admin API and read the key from the API server environment.
- Generated race images are drafts. Show the administrator a preview and require an explicit download/upload/publish action; generation must not publish media automatically.
- Build winners from saved race positions and explicitly exclude DNF and non-participants. Do not infer winners from points.

## Current reconciliation note

- Source: [official 2026 workbook](https://docs.google.com/spreadsheets/d/19Um3bgr5BjVJRS86k_fflHDn21bzcJIRrK4AA5CbCpk/edit); inspected local export SHA-256 `0fe69bf543df5f6d62d78e6cdfb574778407f2c13b341304a32539c9870a892a`.
- In sheet `2026`, Alex is app pilot Mimic. The official Split 3 prices are Mimic 50.2M (`X65`), Pinilla 22.6M (`X71`), Carlos 21.2M (`X77`) and Dani 21.2M (`X81`), totaling Alfa Romero's 115.2M transfer spend (`R53`).
- Live prices read on 2026-10-10 were Mimic 28.9M, Pinilla 22.6M, Carlos 0M and Dani 0M. Price fields therefore account for a 63.7M charge; the full balance gap to the workbook checkpoint is 85M. Do not charge Pinilla's 21.3M discrepancy again: its price field is already corrected, so that part is a historical balance adjustment.
- No live correction has been applied. The split must be reconciled using the generic admin correction flow after the official Hungary payouts are confirmed; never encode these team/pilot figures in an app button or constant.
