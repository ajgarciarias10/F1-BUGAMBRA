# Who does what

Several tools can work here at once. This page says which kind of work goes to which, which model tier to use, and who integrates. It is reference; `AGENTS.md` and `operating-procedure.md` win if they disagree.

## Roles

| Role | Does | Never does |
|---|---|---|
| **Owner** | Decides product questions, reviews, integrates (merges), deploys | n/a |
| **Coordinator** (Claude Code session) | Writes tickets, dispatches agents, verifies their branches, prepares the merge guide for the owner, publishes review artifacts | Merges, deploys, or edits files outside a ticket |
| **Worker agents** (Claude subagents, Codex) | Execute one ticket on one branch, report with the template | Touch files outside `Owned files:`, merge, push others' branches |

## Which work goes where

| Kind of work | Agent | Model tier |
|---|---|---|
| Read-only investigation, searches, audits | Claude subagent (Explore or general-purpose) | Default |
| Economy, transactions, Firestore writes, security rules | Claude (coordinator or one worker), with the owner watching | Strongest available, one agent at a time |
| Visual design prototypes and large visual passes | Codex | Mid-tier, medium reasoning |
| Mechanical restyling or token swaps over many files | Claude subagent or Codex | Mid-tier |
| Code review of a pushed branch | A different agent from the author | Default |

## Model cost

The top-tier Codex model is expensive. Default delegated work to the mid-tier model at medium reasoning; ask the owner before using the top tier. Check the list of models your setup offers instead of assuming names. Interrupted work is resumed in the same session (with the cheaper model if cost was the reason), not restarted.

## Several agents at once

- One worktree per agent; do not share a checkout.
- Disjoint `Owned files:` per ticket. Two tickets may not own the same file at the same time.
- Verify the base by its files before branching.
- Before the coordinator prepares an integration, list what each branch touched and confirm nothing falls outside its ticket.
