# 12. Seasons: Origins, Temporada 1 and every split

- **Branch from:** `feature/stitch-redesign` (after 04 is merged: it restyles the same three screens)
- **Work branch:** `feature/temporadas`
- **Owned files:** a new `apps/web/src/services/seasonReadModels.ts` and its test, `apps/web/src/components/TotalStandings.tsx`, `apps/web/src/components/TeamsView.tsx`, `apps/web/src/components/PilotDetailModal.tsx`
- **Do not touch:** economy services, write paths, Firestore rules
- **Agent and model:** Claude, default model
- **Done when:** Standings and Teams can show Origins (by duos), each split and the Temporada 1 total; pilots' cards show the team and rating of the chosen split; the aligned evolution charts match their tables; read models are pure functions with tests.

## Context

Owner decisions of 2026-10-22. All data is already public in Firestore (splits, circuits, teams, rosters with `rating_piloto`, Origins `duos`). Open question for the owner: is the season standing the sum of split points or another rule? Origins positions: the Excel only stores points; `AGENTS.md` forbids inferring positions from points, so either import them from the league's source with a reference or label them "estimated".

## Report

Template in `docs/agents/operating-procedure.md` §3.4.
