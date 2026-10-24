# 0004. The approved prototype is the app's structure, not only its skin

**Status:** accepted (2026-10-23)

**Context.** Ticket 03 applied the prototype's tokens to the existing React screens. The owner compared both and prefers the prototype as a whole: its layout, navigation, sections, cards and charts ("el rediseño anterior me gusta más, me refiero al formato que hiciste todo"). Restyling the old screens keeps their structure, which is what he does not want.

**Decision.** The React app is rebuilt to follow `docs/redesign/prototipo-gemini/` screen by screen, under `apps/web/src/nueva/`, connected to the real data through the existing services and hooks. Reads may get new pure read models; every write keeps using the existing services with their transactions, audit records and single-flight guards. Old screens stay reachable until their replacement is merged, then they are retired in the same turn (AGENTS.md rule 10). This supersedes the presentation-only scope of tickets 04 and 05; ADR 0002 still applies (prototype first, owner approval before implementation).

**Consequences.** Routes and navigation change (owner decision). Calculations, writes, permissions and auth do not. Work is split in waves by complexity so several agents can work at once on disjoint files (`docs/trabajo/redesign/plan-app.md`).
