# Backlog

What is open right now. Details per feature go in `docs/trabajo/<slug>/`. Remove an item in the same turn it is finished or discarded.

## Redesign (`docs/trabajo/redesign/`)

The owner approved `docs/redesign/prototipo-gemini/` on 2026-10-22 and wants it to become the real app. Decisions: `docs/redesign/prototipo-gemini/decisiones.md`.

- Work happens on `feature/rediseno-app` (redesign + `main` merged on 2026-10-22); Vercel publishes it as a preview. `main` and production stay as they are until the owner decides.
- [ ] 08 Retire Paddock and driver-of-the-day vote (behaviour, owner decision; before 04 and 05)
- [ ] 03 Foundation: tokens, primitives, shell (Codex mid-tier; merges before 04 and 05)
- [ ] 04 User and public screens (Claude; after 03 and 08)
- [ ] 05 Admin screens (Claude, economy paths untouched; after 03 and 08)
- [ ] 11 Commissioner without a team (role routing)
- [ ] 09 TV with the league's Twitch channels through the official API (needs the owner's Twitch app credentials)
- [ ] 10 Race act: positions 1-20, qualifying "did not run", position after a penalty (owner must confirm the data model first)
- [ ] 12 Seasons: Origins by duos, Temporada 1 total and every split (after 04; season standing = sum of splits, Origins positions deduced: owner, 2026-10-22)
- [ ] Assign Antonio Ceferi as Alfa Romero's sporting director in Equipos y usuarios (owner, live data)
- [ ] Rename Split 3 GP 16 from España to Italia (Imola) with the new circuit-name field (owner, live data)
- [ ] Decide fate of `GuestDashboard.tsx` and `AestheticLogin.tsx` (no references found outside their own files)

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
