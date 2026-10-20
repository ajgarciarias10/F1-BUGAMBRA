# 01. Design prototype with Review mode

- **Branch from:** `feature/stitch-redesign`
- **Work branch:** `feature/stitch-redesign` (design files only, uncommitted until the owner reviews)
- **Owned files:** everything under `docs/redesign/`
- **Do not touch:** `apps/**`, `docs/prototype/**`, `AGENTS.md`, `tool/**`, `.github/**`
- **Agent and model:** Codex, `gpt-6-sol`, medium reasoning (ADR 0003)
- **Done when:** `docs/redesign/prototype/index.html` opens and every route in `docs/redesign/screens.md` renders in light and dark at 390px and 1440px; Review mode lets the owner draw a box or select an element, add a note with tags and severity, and export Markdown and JSON; README and screens docs exist; no broken asset links.

## Context

ADR 0002. The owner wants a fresh, complete redesign, reviewed as a prototype before any React code changes. Direction: bright, modernist with a Fluent touch, less artificial, no AI-generic looks. Fictional sample data only. The jeque stays read-only for budgets; DNF, no-show and unknown position stay distinct; videos load only after Play; admin and user areas are separate.

## What to do

Build the static prototype and docs, then the Review mode. Report with the template in `docs/agents/operating-procedure.md` §3.4, including what could not be tested without a browser.
