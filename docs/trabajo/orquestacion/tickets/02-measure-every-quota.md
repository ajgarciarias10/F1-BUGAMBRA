# 02. TypeSafe measures every quota group

- **Branch from:** CleverTracker `origin/docs/seguimientos-ola-4` (its `origin/main` is from 2026-09-19 and has no `tool/`; the TypeSafe that runs is `e5de36c`, contained in that branch) (the code lives in `~/projects/CleverTracker`; this repo only keeps the ticket, as part of the orchestration we adopted from CleverTracker, see `docs/agents/orquestacion.md`)
- **Work branch:** CleverTracker `fix/tiposafe-todas-las-cuotas`, in its own worktree (CleverTracker's main checkout is on a detached HEAD that is not ours)
- **Owned files:** CleverTracker `tool/servicio_tiposafe.py`, `tool/test_servicio_tiposafe.py`, `tool/cuota_de_cada_agente.py`, `tool/test_cuota_de_cada_agente.py`
- **Do not touch:** anything else in CleverTracker (its `AGENTS.md` rules apply there), anything in this repo, `~/.gemini/**`, Orca's configuration
- **Agent and model:** whatever `tool/pedir-agente.sh` answers at level `bounded`; mid-tier model
- **Done when:** `python3 ~/projects/CleverTracker/tool/pedir_agente.py --disponibilidad` reports Antigravity with every group of `agy -p /usage` and its state follows the most used one (on 2026-10-23 that is «Gemini 4 Argon» at 0 % left, so `blocked` until 2026-10-27); Codex blocked by `rateLimitReachedType` keeps its real weekly percentage in the output; CleverTracker's tests pass.

## Context

Owner, 2026-10-23, while launching wave 2 of the redesign: «Gemini 4 Argon está totalmente pelado, tienes que medir el uso de todas las cosas». He chose that the most used group decides.

What `agy -p /usage --output-format json` returned at 15:36 UTC:

| Group | Window | Remaining | Reset |
|---|---|---|---|
| Gemini Models | weekly / 5h | 92 % / 96 % | 2026-10-27 / 19:29 UTC |
| Claude and GPT models | weekly / 5h | 78 % / 56 % | 2026-10-30 / 20:25 UTC |
| Gemini 4 Argon | weekly (only window) | 0 % | 2026-10-27 17:30 UTC |

TypeSafe reported Antigravity `available` (session 0.9 %, weekly 7.4 %) because `uso_antigravity` (`servicio_tiposafe.py:249-315`) reads only `GRUPO_ANTIGRAVITY = "Gemini Models"`.

Same day, TypeSafe reported Codex weekly at 100 % until 2026-10-29 while Orca's usage panel showed Codex 5h 100 % (back in 2h53m) and weekly 16 %. Cause: `medidor_codex` (`cuota_de_cada_agente.py:211-216`) writes 100 % in both windows when `rateLimitReachedType` is set. Blocking is right; hiding the real weekly figure is not, because it made the owner and the coordinator think Codex was out for a week.

## What to do

1. `uso_antigravity`: read every group in `command.data.groups[]`, not one by name. A group may have only a weekly window (Argon does); accept that. Keep rule 11 of CleverTracker: an unreadable shape is `None` and `None` is blocked, never «0 % used».
2. `_estado_antigravity`: the state follows the most used window of any group; `motivo` names that group and window and its reset; the per-group figures go in the output so the coordinator sees them all.
3. `medidor_codex`: when `rateLimitReachedType` is set or `ordinaryUsageAllowed` is false, keep the state blocked, but report the real percentages of each window, and the reset of the window that is actually full.
4. Tests with the payloads above (Argon at 0 %, a group with only a weekly window, a group missing, a fraction out of range) and with a Codex answer that has the 5h window full and weekly at 16 %. Run each new test against the current code first to prove it fails.

## Rules that apply

`AGENTS.md` rules 2, 3, 5, 6 and 7 here; CleverTracker's own `AGENTS.md` for the work there. No new dependencies.

## Report

Use the template in `docs/agents/operating-procedure.md` §3.4. Include what you did not do and what you could not verify.
