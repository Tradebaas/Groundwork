# DEBT: technical debt ledger

<!-- TEMPLATE: the blank debt ledger, and the file `begin` copies over Groundwork's own
     (`cp docs/state/TEMPLATE-DEBT.md docs/state/DEBT.md`) so a new project does not start with the
     framework's own rows read as its debt. It fills from the first accepted `defer:` marker
     onwards, and on the adopt door from the check total `begin` logs as the starting position. -->

Every deliberate simplification is marked at the site with a `defer:` comment (format in
AGENTS.md) and gets a row here when accepted. The `maintain` skill harvests markers into this
table and flags rot: a marker without an upgrade trigger, or whose trigger has fired.

Rules: one row per debt item, never delete a row. Set status `paid` with the resolving
commit/spec instead. New findings from audits also land here, not in chat.

| ID | Where (file:line or area) | What / ceiling | Upgrade when | Status |
|---|---|---|---|---|
| <!-- DEBT-001 --> | | | | |
