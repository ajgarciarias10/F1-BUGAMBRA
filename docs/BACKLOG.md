# Backlog

What is open right now. Details per feature go in `docs/trabajo/<slug>/`. Remove an item in the same turn it is finished or discarded.

## Redesign (`docs/trabajo/redesign/`)

The prototype becomes the app (ADR 0004). Plan and waves: `docs/trabajo/redesign/plan-app.md`. Integration branch and Vercel preview: `feature/rediseno-app`. Owner decisions: `docs/redesign/prototipo-gemini/decisiones.md`.

- [x] 08 Retire Paddock and vote (in the preview)
- [x] 03 Foundation tokens and type (in the preview)
- [ ] Wave 1: 13 data layer · 14 visual pieces · 15 shell and routes
- [ ] Wave 2: 16 home and championship · 17 teams and my driver · 18 races · 19 role homes, profile, login · 20 TV (needs the owner's Twitch credentials)
- [ ] Wave 3, one at a time: 21 my team · 22 market · 23 admin races · 24 admin economy · 25 admin rest
- [ ] 26 Switch every route and retire the old screens
- [x] 27 Save each team's balance after every processed race (in the preview)
- [ ] Live pill bug (production too): `PublicHome.tsx` treats decapi's «tonicotitular is offline» as live because it only checks the exact text «offline» (found in ticket 15; the new shell is not affected)
- [ ] `apps/api` typecheck fails on the base (`auth.ts:25` TS2769, `domain/race-winner-image.ts:49,52` TS18048), found in ticket 27
- [x] 28 Tool to rebuild that balance for races processed before 27 (in the preview; the owner runs it from the admin with the workbook checkpoints)
- [ ] TypeSafe reports OpenCode as available (no meter) but on this server it has 0 credentials and never picked up ticket 14; fix OpenCode's setup or tell TypeSafe (CleverTracker repo)
- [ ] `RaceWinnersImagePanel.tsx` still publishes the winners image to `paddock_posts`, which no screen shows since 08: decide where it goes or retire it
- [ ] Retire the Firestore rules for `paddock_posts` and the vote fields once the owner confirms nobody needs the stored data
- [ ] Assign Antonio Ceferi as Alfa Romero's sporting director in Equipos y usuarios (owner, live data)
- [ ] Rename Split 3 GP 16 from España to Italia (Imola) with the circuit-name field (owner, live data)
- [ ] Find out what the «Mundial» split in Firestore is before ticket 16 shows it

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
