---
name: scope-guard
description: Judgment check before calling substantial work done or proposing a commit. Use before "done", before committing more than a trivial change, and whenever you notice yourself building something nobody asked for. The judgment layer above the automated gates, not a duplicate of them.
---

# scope-guard: before you say "done"

The gates (`checks/check.mjs`, typecheck, lint, tests) are the floor and must be green. This
checklist catches what they can't see. Answer honestly; the point is the answers, not the ritual.

1. **Trace.** Does every part of this diff trace to a spec, an SC-item in BRIEF.md, or an
   explicit request? Anything that doesn't → out of the diff, into INTAKE.md.
2. **Ladder.** Did something get built that already existed: in the repo, the platform, or a
   dependency? Rebuilt-in-disguise counts.
3. **Minimum.** Is there code here for cases nobody asked for: options, abstractions,
   "flexibility"? Deletion is still cheap now; a month from now it's archaeology.
4. **While-I-was-here.** Any refactors, renames, or cleanups outside the task? Revert them or
   split them into their own proposed change; never smuggle them along.
5. **Safety floor intact?** Validation at trust boundaries, authorization, data-loss error
   handling, no silently swallowed failures, secrets, accessibility: none simplified away
   (AGENTS.md hard rule).
6. **Deferrals marked.** Every deliberate simplification has a `defer:` marker with a ceiling
   and an upgrade trigger, and a DEBT.md row if it will outlive this change.
7. **Done means verified.** Has `verify` actually been run on this change, behavior exercised,
   not just green tools? If not, that's the next step, not this one.
8. **Good is good.** Now that it passes: stop. List improvement ideas in INTAKE.md if they're
   worth keeping; build none of them unasked.

Then update what the change touched: STATE.md (always), the spec status, DEBT.md, stale docs
(retired wording → denylist). Report the check's outcome in one or two lines: findings and
what you did about them, or "clean". ⚓
