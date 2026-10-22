# 11. The commissioner (admin) has no team

- **Branch from:** `feature/stitch-redesign`
- **Work branch:** `feature/comisario-sin-equipo`
- **Owned files:** `apps/web/src/App.tsx`, `apps/web/src/components/Dashboards.tsx` (role routing only)
- **Do not touch:** auth, Firestore rules, the hardcoded admin e-mail logic beyond reading it
- **Agent and model:** Claude, default model
- **Done when:** an admin who is not also a jeque or pilot sees no "My team", balance or "My pilot" entry, and their home shows pending acts and unprocessed race economy; an admin who also races keeps "Ir a mi panel de piloto".

## Context

Owner decision of 2026-10-22: "si soy comisario no tengo equipo". Today the admin account can also be a pilot (the panel shows "Ir a mi panel de piloto"), so the change is about not inventing a team, not about removing the pilot panel from someone who has one.

## Report

Template in `docs/agents/operating-procedure.md` §3.4.
