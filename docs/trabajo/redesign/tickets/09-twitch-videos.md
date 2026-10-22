# 09. TV: videos from the league's Twitch channels

- **Branch from:** `feature/rediseno-app`
- **Work branch:** `feature/tv-twitch`
- **Owned files:** `apps/api/src/server.ts` (one new read-only route), a new `apps/api/src/twitch.ts` and its test, `apps/api/.env.example`, `apps/web/src/components/FomLive.tsx`, a new `apps/web/src/services/twitchService.ts`
- **Do not touch:** economy code, auth, Firestore rules
- **Agent and model:** Claude, default model
- **Done when:** the TV screen lists the videos and clips of `tonicotitular` and of each pilot channel (first: `fabiml_204` for Fabi), shows whether a channel is live, plays a video only after the user taps it, and survives Twitch being down with an honest error; the API test passes with Twitch mocked.

## Context

Owner decision of 2026-10-22. The prototype reads Twitch from the browser through the endpoint the twitch.tv web uses; that endpoint is unofficial. The app must use the official Twitch API (Helix) from `apps/api` with an app access token. The client id and secret live only in the API environment (same rule as `GEMINI_API_KEY`).

## What to do

Add a cached read-only route that returns, per configured channel, the live state, the latest videos and the 2026 clips. Keep the channel list in config, not in code constants per pilot. Match videos to GPs only when unambiguous (see `docs/redesign/prototipo-gemini/generador/tv-block.js`). Ask the owner for the Twitch app credentials; do not invent them. New dependency or service: stop and ask first (AGENTS.md rule 6).

## Report

Template in `docs/agents/operating-procedure.md` §3.4.
