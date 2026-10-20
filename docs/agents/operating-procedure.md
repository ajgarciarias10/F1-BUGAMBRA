# Operating procedure

The only executable procedure: the steps, in order, from starting a ticket to closing it. [`AGENTS.md`](../../AGENTS.md) holds the invariants and wins if anything here contradicts it. Everything else under `docs/agents/` is reference.

## 1. Before touching anything

1. `git status` and `git branch --show-current`. If the tree has someone else's uncommitted work, STOP: do not create a branch, edit or commit. Report what you found.
2. Check you are on the branch the ticket names. If not, stop and say so.
3. Check the base by its files, not its name: `git ls-tree --name-only <base>` must show the files your task touches.
4. Read the ticket (`docs/trabajo/<slug>/tickets/NN-*.md`). If it contradicts itself or `AGENTS.md`, or asks for something the code cannot do as written, stop and report the contradiction with evidence.

## 2. Making changes

1. One branch per task: `feature/...`, `fix/...`, `docs/...`.
2. Touch only the ticket's `Owned files:`. Say which files you will touch before starting if the ticket leaves it open.
3. One logical change per commit; a fix and its test go together; ten files means the commit is too big.
4. Commit messages carry no agent signature (rule 5). Spanish or English, but consistent within the change.
5. A fix brings a test that fails on the broken code and passes on the fixed code; run it against the broken version first to prove it protects.
6. No new dependencies without asking (rule 6). Respect existing style. Do not refactor neighbours.
7. Economy, price, balance or transaction changes also need the regression coverage listed in the economy guardrails, and `npm run guardrails:economy` must pass before you report them verified. A local preview or a passing test is never a live database update.

## 3. Closing a ticket

1. Run the full suite of the area you touched (typecheck, tests, build as relevant). Nothing red is committed.
2. Push your own branch (not `main`). That is the review queue.
3. Do not merge. Only the owner integrates.
4. Report with this template (labels stay in English, content in the owner's language):

        TASK: <one line>
        BRANCH: <name>
        COMMIT: <short hash>
        FILES CHANGED: <list>
        TESTS: <commands and results, before and after>
        NEGATIVE CONTROL: <how you proved the test protects>
        BLOCKERS OR FINDINGS: <anything outside scope worth flagging>
        WHAT I DID NOT DO: <explicit list>
        NOT VERIFIED: <what needs a browser, live data or the owner>

5. If you had to decide something the ticket did not cover, say it in the report.

## 4. Integration (owner only)

The coordinator reviews the pushed branch, checks it touched only owned files and that checks are green, then walks the owner through the merge in plain words, one step at a time. The owner merges and deploys. After the merge reaches `origin`, the branch is deleted locally and on GitHub in the same turn.

## 5. When something goes wrong

- A command fails: read the error, do not repeat it blindly.
- Tests fail after your change: revert, investigate, retry.
- You discover the base is wrong mid-task: stop.
- You committed on the wrong branch: do not push; report it.
- A prior failure on the base branch: report it, do not fix it inside this task.
- A delegated agent was interrupted (quota, cost, restart): resume the same session and continue; do not start over.
