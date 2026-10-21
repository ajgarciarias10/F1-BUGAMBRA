# Backlog

What is open right now. Details per feature go in `docs/trabajo/<slug>/`. Remove an item in the same turn it is finished or discarded.

## Redesign (`docs/trabajo/redesign/`)

- [ ] 01 Design prototype with Review mode (Codex, in progress): `docs/redesign/prototype/`
- [ ] 02 Owner review of the prototype using Review mode, then decide what to keep
- [ ] 03 Foundation: tokens, primitives, shell (Codex mid-tier; blocked on 02; merges first)
- [ ] 04 User and public screens (Claude; blocked on 03)
- [ ] 05 Admin screens (Claude, economy paths untouched; blocked on 03)
- [ ] Decide fate of `GuestDashboard.tsx` and `AestheticLogin.tsx` (no references found outside their own files)
- [ ] Vercel does not build `feature/stitch-redesign` automatically; check Settings > Git (ignored build step, branch filter, connection)

## Economy and data (rules in `AGENTS.md`)

- [ ] Reconcile Hungary (Split 3) and process its economy only after the owner confirms the replay
- [ ] `SeasonReviewPanel.tsx` season import overwrites the full balance, deletes old transactions and has no audit record or shared `presupuesto.ts` calls: do not use it for corrections; decide whether to rebuild or retire it
- [ ] Remaining raw `writeBatch` and money-related writes in `AdminDashboard.tsx` (around the economy revert/process paths) still lack before/after audit records
- [ ] Reopening an act after reverting its economy is not one atomic operation (the revert routine runs first)
- [ ] Approved FIA fines have no ledger category: decide the marker (`tipo: "multa"` or `origen: "sancion_fia"`) when a fine write path exists
- [ ] Verify against real data that old transactions without `equipoId` match by team name in Mi escudería, and that loading the whole split ledger in the browser is acceptable in size and by Firestore rules
- [ ] Firestore rules for the new `avisos_oficiales` collection and the `decisiones_fia` field (admin-write-only), none exist in the repo
- [ ] `AuctionRoom` automatic adjudication (runs from an effect when the clock ends) has no single-flight guard

## Telemetry

**Parked by the owner on 2026-10-21; the full-web prototype goes first.** Idea to resume: ephemeral data per race. The admin loads only the next race's circuit times (one click from the owner's Racenet session via a bookmarklet, or by hand), each document carries `expireAt` = race day and Firestore TTL deletes it, nothing is kept after the race. Pilots only accept the owner's EA friend request once and agree in the group chat. Telemetry prototype (branch `feature/telemetria-prototype`, commit `b337fe5`), export script (`feature/telemetria-export`) and research on FUTBIN-style imports (`feature/telemetria-research`, `85f1ad6`) are kept as they are; EA terms for Racenet are unchecked.

- [x] Plan written: `docs/trabajo/telemetria/plan.md` (F1 25 all platforms; laps, sectors and racing line; opt-in UDP recorder, no Racenet scraping)
- [ ] Phase 0: capture one real session from one driver and verify the packets (needs the owner and a driver)
- [ ] Telemetry phase 1: best lap per track from Racenet Time Trial, manual entry form, comparison screens (plan update 2); UDP sectors and racing line later
- [ ] Ask each console player what device they have at home on the console's network; check whether F1Laps export is enough before building our own recorder
- [ ] Ask EA about official Racenet API access for a private league, if wanted

## Tooling

- [ ] `npm test` and `npm run guardrails:economy` need `corepack`; document or replace on machines without it
- [ ] `apps/api` typecheck fails at `src/auth.ts(25,48)` (TS2769, `string | undefined` passed to `Buffer.from`), pre-existing
