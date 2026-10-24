# 01. Orchestration command and the IPO prototyping method

- **Branch from:** `feature/stitch-redesign`
- **Work branch:** `feature/orquestacion`
- **Owned files:** `tool/orchestrate.mjs`, `tool/orchestrate.test.mjs`, `docs/agents/ipo-prototype-method.md`, `docs/agents/operating-procedure.md`, `docs/agents/reparto-entre-agentes.md`, `.claude/skills/ipo-prototype/SKILL.md`, `AGENTS.md`, `package.json`
- **Do not touch:** `apps/**`, `firestore.rules`, `tool/agent-guard.mjs`, `tool/agent-guard.test.mjs`, `.github/**`, `docs/redesign/**`
- **Agent and model:** Claude coordinator session
- **Done when:** `node tool/orchestrate.mjs status` lists every ticket with its branch, worktree, guard verdict and whether an agent is running; `start <ticket>` creates the worktree and launches the delegated agent on the mid-tier model; `check <ticket>` runs the ownership guard; the IPO method is one document that both Claude (as a skill) and Codex (through AGENTS.md) read; tests pass.

## Context

The owner asked for an orchestration system built from what already exists (tickets, ownership guard, Codex, worktrees) and for the design method to be based on the course book "Interaccion Persona-Ordenador" (University of Jaen, 2026-27): task analysis, sketch, wireframe, mockup, prototype, then evaluation (Nielsen heuristics, cognitive walkthrough). The book itself is not committed; the method is written in our own words.
