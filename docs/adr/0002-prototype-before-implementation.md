# 0002. Review a prototype before implementing a large visual change

**Status:** accepted (2026-10-20)

**Context.** Two redesign passes were implemented straight into the React app and then judged as discarded or insufficient. That cost time and model spend, and mixed visual work with logic-bearing files.

**Decision.** For a large visual change, an agent first builds a static, clickable prototype under `docs/redesign/prototype/` that includes a Review mode where the owner draws boxes over what they dislike and leaves notes. Only after the owner reviews it does a separate ticket apply the approved design to the app.

**Consequences.** The React app stays untouched during design. The prototype's exported notes (Markdown/JSON) are the input for the next iteration. Implementation tickets own only presentation files and must not change calculations, writes, permissions, routes or auth.
