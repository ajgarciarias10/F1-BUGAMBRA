# 01. Telemetry comparison prototype

- **Branch from:** `feature/stitch-redesign`
- **Work branch:** `feature/telemetria-prototype`
- **Owned files:** `docs/trabajo/telemetria/prototype/**`, `docs/trabajo/telemetria/tickets/**`, `docs/trabajo/telemetria/task-analysis.md`, `docs/trabajo/telemetria/evaluation/**`
- **Do not touch:** `apps/**`, `AGENTS.md`, `tool/**`, `.github/**`, `docs/redesign/**`, `docs/trabajo/telemetria/plan.md`, `firestore.rules`
- **Agent and model:** Codex, `gpt-6-sol`, medium reasoning (ADR 0003)
- **Done when:** `docs/trabajo/telemetria/prototype/index.html` opens offline and shows the three screens below at 390px and 1440px in light and dark, with fictional data shaped like the plan's findings; a `README.md` in that folder explains how to open it and what is fictional; a `check.cjs` verifies the files, the sample data shape and that no network call exists.

## Context

ADR 0002 (prototype before implementation) and `docs/trabajo/telemetria/plan.md` (read the findings sections 3 and 4). The league wants Racenet-style best-lap comparison. Racenet's own screens are the reference: a per-track leaderboard of friends (platform icon, name, car, date, assists, time), a track strip with the viewer's best time per circuit, and a detailed analysis with two laps compared (speed, throttle, brake over distance, delta, racing lines on the circuit). Do not copy Racenet's branding or assets; use the league's look: black and white, thin uppercase type, hairline dividers (Zara-like direction, still under owner review), F1 red only as a small accent. Spanish UI.

## Screens

1. **Clasificación por circuito**: 16 circuits as a horizontal strip of cards (name, the viewer's best time as m:ss.mmm); selecting one shows the league ranking: position, platform mark, name, car/team, date, assists, time and gap to the leader; tick two rows to compare.
2. **Comparar dos vueltas**: header with both drivers and the time delta; three stacked charts over distance for the two laps (speed, throttle, brake) with a shared cursor; a delta-over-distance chart; the circuit drawn from the x/z positions of both laps in two colours with a marker that follows the cursor. Time is index x 0.25 s (4 samples per second), distance comes from the data.
3. **Mi mejor vuelta por circuito**: the viewer's own list of circuits with time, car, date and a small sparkline of the speed trace; empty state for circuits with no lap.

## Sample data

Generate fictional but plausible data in `sample-data.json` (no real names or EA ids): shape per lap: `trackID`, `trackName`, `driver {displayName, platform}`, `vehicle`, `date`, `assists`, `isValid`, `raceTimeMs`, `samples` {`distance[]`, `speed[]`, `throttle[]`, `brake[]`, `steering[]`, `gear[]`, `position[] {x,y,z}`}, about 300 samples per lap at 4 per second. At least two circuits with at least 6 drivers each; make the two compared laps differ visibly (one brakes later, one carries more speed).

## What not to do

No framework, no dependencies, no network calls, no real EA data. Pure HTML, CSS and JavaScript with canvas or SVG. Do not touch anything outside the owned folder. No commits (the coordinator commits).

Report with the template in `docs/agents/operating-procedure.md` section 3.4, including what could not be tested without a browser.
