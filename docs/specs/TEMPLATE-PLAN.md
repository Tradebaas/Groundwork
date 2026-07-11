# Plan template: copy for tier L

<!-- Made by the `spec` skill for tier L work only; tiers S and M never get a plan.
     Location: docs/specs/<NNN>-<slug>/plan.md, next to spec.md. -->

# <NNN>: plan (tier L)

## Build order

Owned by the ticket graph in `tickets/` (see `TEMPLATE-TICKET.md`), never by this file. Work
the frontier: the lowest-numbered ticket whose Blocked-by entries are all `done`, one ticket
per fresh session. List the graph here as an overview; the ticket files stay the source of truth.

- <NN> <title> (no blockers)
- <NN> <title> (blocked by <NN>)

## Seams and interfaces touched

<!-- The stable interfaces this change is built and tested at, agreed before building starts.
     Name each seam and how tickets prove themselves against it: a check with a self-test, a
     public API with a contract test, a template validated by an existing gate. -->

## Migration / rollback

<!-- What existing data, config, or users must move, and how to undo the change if it fails.
     "All changes are additive; rollback is a plain git revert" is a fine answer when true. -->

## Verification approach

<!-- How the whole spec is proven, beyond per-ticket acceptance: the gates every ticket runs,
     plus the end-to-end pass `verify` runs against the acceptance criteria in spec.md. -->
