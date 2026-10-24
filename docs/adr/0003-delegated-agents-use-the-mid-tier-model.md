# 0003. Delegated agents default to the mid-tier model

**Status:** accepted (2026-10-20)

**Context.** The top-tier Codex model was too expensive for a design prototype. The owner asked for a proper but cheaper model.

**Decision.** Delegated Codex work defaults to the mid-tier model (`gpt-6-sol`) at medium reasoning. The top tier needs the owner's say-so. Interrupted runs are resumed in the same session with the cheaper model rather than restarted.

**Consequences.** Lower cost; slightly less capable on hard problems. If a result is too weak for design work, step up one tier and tell the owner before doing so. Model names change: check what the Codex setup lists instead of assuming.
