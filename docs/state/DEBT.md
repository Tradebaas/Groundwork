# DEBT: technical debt ledger

Every deliberate simplification is marked at the site with a `defer:` comment (format in
AGENTS.md) and gets a row here when accepted. The `maintain` skill harvests markers into this
table and flags rot: a marker without an upgrade trigger, or whose trigger has fired.

Rules: one row per debt item, never delete a row. Set status `paid` with the resolving
commit/spec instead. New findings from audits also land here, not in chat.

| ID | Where (file:line or area) | What / ceiling | Upgrade when | Status |
|---|---|---|---|---|
| DEBT-001 | `checks/cockpit-page.mjs`, the STYLE block | The board's colours are copied from the explainer page instead of read from this project's tokens. Ceiling: a third surface, or a changed accent, and the copies drift apart. | The token section in `docs/design/DESIGN.md` is filled by a design session | open |
| DEBT-002 | `checks/cockpit-page.mjs`, `fileMapCard` | Every row of the file map asks the path decision on its own, and each ask spawns `git check-ignore` (about 150 ms of a render on this repo). Ceiling: a manifest of a few hundred rows, or a board opened in a loop. | A render is noticeably slow; then answer the whole list with one `git check-ignore --stdin` per request | open |
| <!-- DEBT-003 --> | | | | |
