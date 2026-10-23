# Plan: the prototype becomes the app

Decision: ADR 0004. Reference: `docs/redesign/prototipo-gemini/index.html` (open it), its generator `docs/redesign/prototipo-gemini/generador/` and the owner's decisions `docs/redesign/prototipo-gemini/decisiones.md`. Integration branch and Vercel preview: `feature/rediseno-app`.

New code lives in `apps/web/src/nueva/`:

| Folder | Holds | Ticket |
|---|---|---|
| `nueva/datos/` | Pure read models over `useSplits()` data: seasons (Origins, each split, Temporada 1 total), standings, per-GP evolution, cards per season, per-circuit income preview, Origins detail | 13 |
| `nueva/ui/` | Visual pieces from the prototype: aligned evolution grid, season rail, driver card, team card, flip card modal, KPI, tables, chips | 14 |
| `nueva/shell/` | Header with hamburger, side menu per role, mobile bottom bar, theme, account; route table | 15 |
| `nueva/pantallas/` | One file per screen, wired to `datos` and `ui` | 16 to 25 |

## Waves

| Wave | Tickets | Complexity | Agent |
|---|---|---|---|
| 1, in parallel | 13 data, 14 visual pieces, 15 shell and routes | medium | 13 and 15 Claude subagents, 14 Codex mid-tier |
| 2, in parallel after wave 1 | 16 home and standings, 17 teams, driver card and my driver, 18 races, 19 role homes, profile, suggestions, login, install | medium/low | Claude subagents and Codex, one per ticket |
| 2b | 20 TV with Twitch (former 09) | medium, needs the owner's Twitch credentials | Claude subagent |
| 3, one at a time | 21 my team and ledger, 22 market and auction, 23 admin races and act (includes former 10), 24 admin economy and transfers, 25 admin rivalries, users, videos, suggestions, season | high (money, writes) | Claude, strongest model, owner watching |
| 4 | 26 switch every route to `nueva`, retire old screens and unused code | medium | Claude |

Each ticket owns disjoint files. A screen ticket may read `datos`, `ui` and existing services but not edit them; if it needs a change there, it asks the coordinator, who amends the owning ticket.

Retired by this plan: tickets 04 and 05 (presentation-only restyle), 11 (folded into 15), 12 (folded into 13, 16 and 17), 09 (renumbered 20), 10 (folded into 23).
