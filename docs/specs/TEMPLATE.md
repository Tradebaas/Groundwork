# Spec template: copy per change

<!-- The `spec` skill decides the tier; this file is the skeleton for tiers M and L.
     Location: docs/specs/<NNN>-<slug>/spec.md (plus plan.md for tier L). -->

Right-sizing (details in the `spec` skill, never more ceremony than the change deserves):

- **S: no spec.** Small, clear, reversible (bugfix, copy change, config tweak). Build it
  directly; the commit message and tests are the record.
- **M: this file only.** A feature or change touching one area. Fill Spec; skip Plan.
- **L: this file + plan.md.** Multi-session, multi-area, risky, or contested work.

---

# <NNN>: <title>

- **Status:** draft | approved | building | done | dropped
- **Traces to:** BRIEF SC-<n> / explicit request: <link or quote>
- **Owner sign-off:** TBD <!-- required before building starts -->

## Why

<!-- The problem or goal, in the user's terms. One paragraph. -->

## What: acceptance criteria

<!-- Numbered, testable statements. "Done" means all of these demonstrably hold. -->

1. TBD

## Not in this change

<!-- What this spec deliberately excludes, so it can't creep back in unnoticed. -->

## Risks & open questions

<!-- Only what is genuinely unresolved; resolve or park each before building. -->

---

When the change ships (`deliver`/`verify`): set status `done`, reconcile any doc the change made
stale (retired wording → denylist in `checks/config.json`), and move the folder to
`docs/specs/archive/`.
