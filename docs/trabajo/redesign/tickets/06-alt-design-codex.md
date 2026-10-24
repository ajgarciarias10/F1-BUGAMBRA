# 06. Alternative design: Codex, gpt-6-sol, medium reasoning (ADR 0003)

- **Branch from:** `feature/stitch-redesign`
- **Work branch:** `feature/redesign-alt-codex`
- **Owned files:** `docs/redesign/alt-codex/**`
- **Do not touch:** `apps/**`, `docs/redesign/prototype/**`, `docs/redesign/reviews/**`, `docs/redesign/serve.mjs`, `docs/redesign/queue.mjs`, `AGENTS.md`, `tool/**`, `.github/**`
- **Agent and model:** Codex, gpt-6-sol, medium reasoning (ADR 0003)
- **Done when:** `docs/redesign/alt-codex/index.html` opens offline and shows the 8 key screens below at 390px and 1440px in light and dark, `check.cjs` passes, and `README.md` explains the design idea in five lines.

## Context

The owner approved the visual language of the current prototype (`docs/redesign/prototype/`: Zara-like, black and white, hairlines, uppercase thin type, side drawer menu) and wants a SECOND, different proposal to compare against it. Read the current prototype, `docs/redesign/screens.md`, `docs/redesign/README.md` and the colour guide (`git show feature/telemetria-prototype:docs/trabajo/telemetria/prototype/colour-guide.md`; IPO book topic 6: at most 7 colours, contrast 4.5:1 text and 3:1 graphics in light and dark, no red-green / blue-yellow / red-blue pairs, colour never the only signal).

Keep the same family of look (editorial, restrained, mostly monochrome) but propose your own take on layout, hierarchy, navigation on a phone and how data is shown (tables, standings, money, race results). Say what is different and why in the README. Same fictional data and Spanish UI text as the current prototype. Mobile first (most users are on phones); thumb-reachable main actions.

Screens (reuse the route names of the current prototype): `#portada`, `#login`, `#inicio`, `#escuderia`, `#campeonato`, `#carreras`, `#mercado`, `#admin-carrera`.

## What not to do

No framework, no dependencies, no network calls, no real data. Do not copy files from the current prototype's folder over your own work without changing the design; you may read them. No commits (the coordinator commits). Touch only the owned folder. End with the report template of `docs/agents/operating-procedure.md` section 3.4 and say what you could not verify without a browser.
