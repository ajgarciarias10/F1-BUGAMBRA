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
- Never infer qualifying or finishing positions from points. Points can validate a recorded position, but cannot reconstruct it uniquely.
- Live Firestore was read on 2026-10-10: Split 3 Hungary exists with results, is complete, and has its act closed, but `economia_procesada` is false. Do not treat its payouts as applied; preserve the current state until its economy has been reconciled and the admin confirms the replay.
- Official workbook checkpoint before Hungary: use `presupuesto_inicial` minus the full Split 3 transfer totals in sheet `2026` (`R51` Zenith 126.8M, `R52` Roses 65.9M, `R53` Alfa Romero 115.2M). This yields Zenith 36.3M, Roses 50.0M, Alfa Romero 50.0M. Live balances read 2026-10-10 were Zenith 41.3M, Roses 50M, Alfa Romero 135M, so the pre-Hungary differences are -5M, 0M and -85M, respectively. These are reconciliation targets, not an applied database correction.
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
