# DEBT: technical debt ledger

Every deliberate simplification is marked at the site with a `defer:` comment (format in
AGENTS.md) and gets a row here when accepted. The `maintain` skill harvests markers into this
table and flags rot: a marker without an upgrade trigger, or whose trigger has fired.

Rules: one row per debt item, never delete a row. Set status `paid` with the resolving
commit/spec instead. New findings from audits also land here, not in chat.

| ID | Where (file:line or area) | What / ceiling | Upgrade when | Status |
|---|---|---|---|---|
| DEBT-001 | `checks/board-shell.mjs`, the TOKENS block | The board's colours are copied from the explainer page instead of read from this project's tokens. Ceiling: a third surface, or a changed accent, and the copies drift apart. | The token section in `docs/DESIGN.md` is filled by a design session | open |
| DEBT-002 | `checks/board-path.mjs`, `ignoreLookup` | Every row of the file map asked the path decision on its own, and each ask spawned `git check-ignore` (about 150 ms of a render on this repo). Ceiling: a manifest of a few hundred rows, or a board opened in a loop. | Paid 2026-07-26: the link card would have taken the render from 238 ms to about 930 ms, so `ignoreLookup` now asks once per page; the six-card render is 60 ms. The file map the row was opened about was itself replaced by the four shelves on 2026-08-24 (E-01/F-04/S-04) | paid |
| <!-- DEBT-003 --> | | | | |
