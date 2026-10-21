# Telemetry plan (F1 25, per-driver opt-in)

Status: plan only, no code. Decided by the owner on 2026-10-21: F1 25 on every platform (PlayStation, Xbox, PC); show **laps, sectors per driver and the racing line (trajectory) per lap**, visible to each team.

## Source: UDP, not Racenet

- Racenet has no public API for third parties that we found, and connecting would mean handling each player's EA login. Not done, now or later (see ADR 0004 when written).
- The game itself sends telemetry over UDP on the local network ([F1 25 UDP specification v6.0](https://forums.ea.com/blog/f1-games-game-info-hub-en/f1%c2%ae-25-udp-specification/12187347)). We use the packets for lap data, session and motion.
- Consoles cannot send to the internet. Everyone plays from their own home, so **each driver needs a device of their own on their home network** (same Wi-Fi or cable as the console) running the recorder, which then uploads over the internet. Nobody needs to share a network with anyone else.

## What we store

- Per session: track, session type, date, driver, game version, packet format.
- Per lap: lap time, sector 1/2/3 times, valid or not, tyre compound if available.
- Per lap trajectory: world position (x, z) sampled at about 10 Hz, about 900 points for a 90 s lap, about 15 KB. Enough to draw the racing line over the track and overlay two laps.
- Never stored: EA credentials, raw UDP streams.

## Pieces

1. **Recorder** (`tools/telemetry-recorder/`, Node, no dependencies if possible): listens on UDP, decodes lap, session and motion packets, builds the per-lap summary, uploads. Runs at each player's home on their PC (or a small always-on device) and uploads over HTTPS.
2. **Ingest endpoint** in `apps/api`: authenticated with a per-driver upload token (not a Firebase admin), validates size and shape, idempotent by session and lap so a re-upload never duplicates. Tests in the API suite.
3. **Storage: PostgreSQL** (owner decision 2026-10-21, to avoid Firestore read/write and traffic charges). See the section below.
4. **UI**: prototype first (ADR 0002): lap table, sector comparison, racing line on the track, team view. Then a ticket with owned files.

## Storage in PostgreSQL

The API already has PostgreSQL (`apps/api/database/migrations`, 001 and 002; `driver` table with `external_key`, runner `npm run db:migrate`). Telemetry goes there in a new migration `003_telemetry.sql`; Firestore is not touched.

Tables (draft):
- `telemetry_session(id, driver_id -> driver, track, session_type, game_version, packet_format, recorded_at, visibility)`
- `telemetry_lap(id, session_id, lap_number, lap_ms, s1_ms, s2_ms, s3_ms, valid, tyre, UNIQUE(session_id, lap_number))`, the unique key makes uploads idempotent
- `telemetry_trace(lap_id, points bytea or int[])`: trajectory as one compact array per lap (about 15 KB), read only when a lap is opened
- `telemetry_token(driver_id, token_hash, created_at, revoked_at)`: upload tokens stored hashed

Honest sizing: 20 drivers x 2 sessions/week x ~15 laps is about 600 laps a week, about 9 MB of trajectories a week, about 0.5 GB a year. Small for Postgres. In Firestore a lap as a single document would be cheap too; the real saving is bulk reads (comparing many laps, season statistics) and no per-read billing, at the cost of running the database ourselves.

What this depends on (not yet verified, owner to confirm):
- **The API must be reachable from players' homes over HTTPS** (Caddy or Nginx in front, as the API README says). I do not know whether it is deployed publicly today. Without it, ingest cannot work.
- **Backups**: `pg_dump` on a schedule, restore tested once. Today's data is authoritative in Postgres per the API README, so telemetry rides the same backup.
- **Retention**: keep lap and sector rows forever; delete trajectories older than one season unless starred (proposal).
- **Reading from the web**: the web app reads Firestore today. Telemetry screens would call the API with the Firebase ID token (already verified by the API), no Firestore involved.

## Privacy

- Each driver opts in and can turn it off or delete their sessions.
- Own team always sees its drivers. Rivals see a driver only if that driver chooses "visible to the league". The in-game "Your Telemetry" setting also limits what other players' cars expose (to verify with a real capture).

## Phases

0. Capture one real session to a file from one driver and check the packets against the spec (format version, motion data present, console works through a PC).
1. Recorder that prints laps and sectors from that file, with tests on the recorded sample.
2. Ingest endpoint, token handling, storage, tests.
3. Prototype of the screens, owner review, then implementation tickets.

## Open decisions

- Is the API deployed with a public HTTPS address? If not, that is the first thing to set up.
- Which device each console player has at home: a PC or laptop on the same network is the only supported option now. A Raspberry Pi-class device is the fallback. A phone or tablet app is possible only as a native app (a browser cannot receive UDP), so it is a bigger project.
- F1Laps (third-party site that already records and shows laps): not evaluated yet; check what it exports before building a recorder of our own.

## Update 2026-10-21: the Postgres choice needs a second look

Evidence from the repo: `vercel.json` only builds and serves the static web (`apps/web/dist`), and the web calls the API in exactly one place (`raceWinnerImageService.ts`, winner image). All league data lives in Firestore with Firebase Auth. So the API and its PostgreSQL are most likely **not deployed**; the owner confirmed the integration was a quick Firebase Firestore and Auth one deployed on Vercel.

Consequence: Postgres for telemetry means a second backend (hosted Postgres plus a hosted API with HTTPS and backups) beside Firestore. It would be quite separate from what exists.

Options, to be decided by the owner:
- **A. Firestore, one document per lap** (laps and sectors as fields, the trajectory as one compact array, under 1 MB). Ingest through a small serverless function on Vercel with the Firebase Admin SDK and a per-driver upload token. No new server. At about 600 laps a week this is well inside Firestore's free daily quota, so the cost argument for Postgres is weak at this size. Needs new rules in `firestore.rules` (reads by team and visibility).
- **B. Postgres** hosted outside the app (managed free tier or our own server), plus deploying the API. Better for bulk analytics later, more to run and back up.
- Recommendation: **A** now; move to B only if volume or analytics outgrow Firestore.

## Update 2026-10-21 (2): start with Racenet best laps, not UDP

The owner has Racenet Time Trial data (Friends leaderboard per track: date, platform, name, team/car, assists, best lap; Tracks view with the owner's best per circuit) and wants the easy path first: store each driver's best lap per track and compare them like Racenet does. UDP (sectors, racing line) stays as a later phase.

Phase 1 scope:
- One Firestore document per driver and track (`telemetria_mejores/{driver}_{track}`): lap time in ms, car or team, platform, date, assists, source "racenet-manual".
- Entry without credentials or scraping. Owner wants no typing by hand, so the main path is **screenshots at registration**: the driver uploads one to three Racenet screenshots (Friends list, Tracks view), a vision model on a serverless function reads every row, the driver confirms, and the rows are saved. A short manual form stays as fallback. Later option, only after checking EA's terms: a browser extension that reads the page inside the driver's own logged-in session (no credentials leave their browser).
- Screens (prototype first, ADR 0002): league leaderboard per track; compare two drivers' best laps on one track with the time delta; personal best per circuit. Racenet Time Trial has no sectors or trace through this path, so those stay for the UDP phase.
- Rules: members read, a driver writes their own row, admin writes any; economy untouched.
- Not done: no reading of Racenet with anyone's EA login, no automated access to EA pages.

## Findings 2026-10-21 (3): what Racenet's web API returns (owner's own session, responses only)

Host `web-api.racenet.com`, JSON, bearer token refreshed through `refresh-auth`. Observed endpoints: `friends?trackId&mode&weather&version`, `leaderboardSummary?platform&mode&weather`, `ghost?platform&ssid&trackId&mode&weather&version`, `spline?trackId`, `player`, `profile-picture`.

- `friends` returns an array of entries; seen fields: `vehicle` (team or car), `date` (ISO), `isValid`, plus collapsed fields not yet seen (name, lap time, platform, assists, player id).
- `ghost` is a full lap trace (Australia sample: 312 samples over 5228.276 m, about 55 KB): `progress`, `distance`, `speed` (88 to 332), `rpm`, `throttle`, `brake`, `steering`, `gear`, `rearWing`, `position` (x, y, z objects, x from -730 to 739, z from -863 to 871), `rotation`. So the racing line AND speed, throttle, brake, steering and gear per point come from one request; sectors still need to be located (probably in the entry or summary).
- `spline?trackId` is the track centreline (about 299 KB) used to draw the circuit; one per track, shared by everyone.

Consequences for the design:
- A compact per-lap document (quantised arrays) is about 15 to 25 KB, well under the Firestore 1 MB limit. One driver with about 24 tracks is about 0.5 MB; 20 drivers about 10 MB. Cost and size are not a concern.
- The track spline is stored once per track, not per lap.
- Comparison view (Racenet-style): two laps over distance, speed and throttle/brake traces, delta, and both racing lines on the circuit.
- Still unknown: the lap time and sector fields in `friends` entries and the shape of `position`; need one expanded `friends` entry from the owner.
- Reading Racenet's private API stays opt-in per driver and only through the driver's own browser session. Terms of EA to check before publishing anything.

## Findings 2026-10-21 (4): exact shapes

- `friends` entry: `vehicle`, `assists` (array of ids, e.g. [4]), `date`, `isValid`, `ssid` (EA player id), `displayName`, `platform` (3 for the Steam entry seen; mapping of the other values still to learn), `raceTimeMs` (76450), `profileImage`. No sector times in it.
- `leaderboardSummary`: array per track with `trackID` ("00" Australia, "02" China, "03" Bahrain, "04" Spain, "05" Monaco, "06" Canada, "07" Great Britain, "10" Belgium, "11" Monza, "12" Singapore, "13" Japan, "14" Abu Dhabi, "17" Austria, "29" Saudi Arabia, "30" Miami, "31" Las Vegas), `trackName`, `isValid`, `mode`, `weather`, `time` (ms, 78001 for Australia). 16 tracks in the owner's account.
- `ghost` has no explicit time array in what was seen, but 312 samples for a 78.0 s lap means 4 samples per second (0.25 s each), so time = index x 0.25 s. That gives deltas over distance and per-point comparison without sector markers.
- Because the owner is already Racenet friends with the league, ONE sync from the owner's own browser session yields everyone's best lap per track (`friends`) and each friend's ghost (via `ssid`). Each pilot installing something becomes optional, not required.
