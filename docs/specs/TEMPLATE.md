# Spec template: copy per change

<!-- The `spec` skill decides the tier; this file is the skeleton for tiers M and L.
     Location: docs/specs/<NNN>-<slug>/spec.md (tier L adds plan.md from TEMPLATE-PLAN.md).
     Anti-staleness rule: no source-code paths or line numbers in a spec; they go stale the
     moment code moves. Describe observable behavior, never a layer-by-layer implementation. -->

Right-sizing (details in the `spec` skill, never more ceremony than the change deserves):

- **S: no spec.** Small, clear, reversible (bugfix, copy change, config tweak). Build it
  directly; the commit message and tests are the record.
- **M: this file only.** A feature or change touching one area. Fill Spec; skip Plan. If it
  will not fit one session, also cut tickets from `TEMPLATE-TICKET.md`.
- **L: this file + plan.md.** Multi-session, multi-area, risky, or contested work. Copy
  `TEMPLATE-PLAN.md` for the plan; multi-session work cuts tickets from `TEMPLATE-TICKET.md`
  (method owned by the `spec` skill).

---

# <NNN>: <title>

- **Status:** draft | approved | building | done | dropped
- **Traces to:** BRIEF SC-<n> / explicit request: <link or quote>
- **Owner sign-off:** TBD <!-- the interview's shared-understanding confirmation: date plus the
  owner's words. Required before building starts; a bare "approved" is not it. -->

## Why

<!-- The problem or goal, in the user's terms. One paragraph. -->

## What: acceptance criteria

<!-- Numbered, testable statements. "Done" means all of these demonstrably hold. Where it
     fits, use EARS phrasing: WHEN <condition> THE SYSTEM SHALL <behavior>. A suggestion for
     precision, not a mandate. -->

1. TBD

## Failure modes

<!-- What can go wrong in this change (bad input, dependency down, race, partial write),
     what the user sees then (VOICE.md error pattern), and what gets logged or alerted.
     One line per mode; "none beyond the global handler" is a valid, deliberate answer. -->

## Settled decisions

<!-- Choices made during the spec interview, each with its one-line reason. Later sessions
     build on these instead of re-opening them; only the owner re-opens a settled decision. -->

## Testing seams

<!-- The stable interfaces the change is tested at, agreed before building starts. Tests
     written at a seam survive refactors; tests written against internals go stale. -->

## Not in this change

<!-- What this spec deliberately excludes, so it can't creep back in unnoticed. -->

## Risks & open questions

<!-- Only what is genuinely unresolved; resolve or park each before building. -->

---

When the change ships (`deliver`/`verify`): set status `done`, reconcile any doc the change made
stale (retired wording → denylist in `checks/config.json`), and move the folder to
`docs/specs/archive/`.
