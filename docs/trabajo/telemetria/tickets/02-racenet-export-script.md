# 02. Racenet export script (owner's own browser session)

- **Branch from:** `feature/stitch-redesign`
- **Work branch:** `feature/telemetria-export`
- **Owned files:** `tool/racenet-export/**`
- **Do not touch:** `apps/**`, `AGENTS.md`, `tool/agent-guard.mjs`, `tool/agent-guard.test.mjs`, `.github/**`, `docs/redesign/**`, `docs/trabajo/telemetria/plan.md`, `firestore.rules`
- **Agent and model:** Codex, `gpt-6-sol`, medium reasoning (ADR 0003)
- **Done when:** `tool/racenet-export/` has a browser-console script, a README in Spanish and a validator; the validator checks an exported JSON file against the schema and its tests pass with `node --test`; the README states the security rules below.

## Context

`docs/trabajo/telemetria/plan.md` findings 3 and 4. The owner is Racenet friends with the league. From their own logged-in browser on the F1 25 Time Trial page, a script pulls: `leaderboardSummary` (best time per track), for each track the `friends` list, and for the best laps the `ghost` trace of each friend (via `ssid`), and downloads ONE JSON file. The owner uploads that file later in the admin panel (a different ticket; not in scope).

## What to build

1. `racenet-export.js`: a single script pasted into the browser console on racenet.ea.com. It must read the bearer token ONLY by observing the page's own outgoing `fetch` headers in memory (wrap `window.fetch`), never read cookies or storage, never print, log, store or send the token anywhere, and never send any data to any server: the only output is a file download. Be gentle: sequential requests with a pause (at least 400 ms) between them, stop on the first 401/403/429, a progress line per track, a `maxTracks` option. Endpoint shapes are in the plan findings; if a field is missing, keep going and record the missing field in the output `warnings`.
2. Output format (`racenet-export-v1`): `{format, version, exportedAt, source:"racenet-web-api", tracks:[{trackID,trackName,mode,weather,entries:[{ssid,displayName,platform,vehicle,assists,date,isValid,raceTimeMs,profileImage, ghost?:{sampleHz:4, distance[], speed[], throttle[], brake[], steering[], gear[], position[]}}]}], warnings:[]}`. Quantise the ghost numbers to keep the file small (speed 0.1, position 0.1, distance 0.1).
3. `validate-export.mjs` (Node, no dependencies): checks the schema, rejects any file containing keys named like `token`, `access_token`, `authorization`, `cookie` or a string starting with `eyJ`, and reports counts. Tests in `validate-export.test.mjs` with a small fictional sample.
4. `README.md` (Spanish): how to run it step by step, what it does and does not do, that it uses a private EA API that may change and that EA's terms should be reviewed, that the owner should tell the league their data is imported, and that nothing leaves the browser except the file the owner downloads.

## What not to do

No dependencies, no network calls from the validator, no storage of credentials, no real EA data in tests. Do not run the script against Racenet yourself (you have no session). No commits.

Report with the template in `docs/agents/operating-procedure.md` section 3.4, including that the script is NOT verified against the real site.
