# 0001. Agents propose, the owner integrates

**Status:** accepted

**Context.** Several agents (Claude, Codex) work on this repo and some changes touch real money and a live Firestore. A merge or deploy by an agent is hard to undo and easy to get wrong.

**Decision.** Each agent works on its own branch and pushes only that branch. Only the owner merges into `main` or the integration branch and deploys. The coordinator reviews, verifies the branch touched only its owned files, and guides the owner through the merge in plain words.

**Consequences.** Slower merges, but no surprise changes to `main`. A pushed branch is the review queue. Rewriting history of a branch (for example to remove signatures) needs the owner's explicit yes and a lease-protected force-push of that branch only.
