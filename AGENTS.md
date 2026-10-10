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
- Hungary is not yet recorded in Firestore. Keep the database at the pre-Hungary checkpoint until the user confirms the race inputs and calculations.
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
- In the official workbook sheet `2026`, Alex's Split 3 auction price is **50.2M** (`X65` / `X66`); app pilot **Mimic** is the same person.
- The inspected Split 3 roster stored Mimic at **28.9M**. Correcting that purchase to 50.2M is a **21.3M charge** to Alfa Romero, subject to the live balance check.
- This one correction does not reconcile Alfa Romero's other workbook transfer differences or its full season balance. Reconcile all such differences before claiming the team's ledger matches the workbook.
