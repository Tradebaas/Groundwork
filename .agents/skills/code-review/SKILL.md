---
name: code-review
description: Review the diff of substantial work before it is committed, after `verify` has passed. Two independent review axes with fresh eyes, standards conformance and spec fidelity, each reported by severity and never merged into one list. Use before committing any change bigger than a trivial fix.
---

# code-review: fresh eyes on the diff, twice

Runs before substantial work is committed, after `verify` has passed. Trivial changes (a typo,
a one-line fix with an obvious cause) skip it; everything with a spec gets it. The subject is
the actual diff about to be committed, not the intention behind it.

## Ground rules

- **Two independent axes, fresh eyes each.** If your tool has subagents, give each axis its own
  subagent with only the inputs named below. Without subagents, run the axes as two sequential
  passes, re-reading the diff from scratch each time and carrying no conclusions across.
- **Skip what tooling already enforces.** Formatting, line caps, denylist, secrets and the rest
  of `checks/check.mjs` plus the stack gates are the machines' job. A finding a gate would have
  caught means the gates were not run; stop and run them.
- **Report by severity per axis: blocker, major, minor.** The two axes are never merged into
  one ranked list. Each finding names the file and location, states the problem, and proposes
  the smallest fix.

## Axis A: standards conformance

Inputs: the diff, `docs/standards/GLOBAL.md`, and the stack file in `docs/standards/`.
Question: does this code meet the written standards, and is it free of the classic smells?

Baseline of twelve smells to check by name, beyond whatever the standards say:

1. Mysterious name: the name needs the implementation to be understood.
2. Duplicated code: the same knowledge written twice.
3. Feature envy: a function that mostly manipulates another module's data.
4. Data clumps: the same group of values traveling together unbundled.
5. Primitive obsession: domain concepts passed around as bare strings and numbers.
6. Repeated switches: the same case analysis dispatched in several places.
7. Shotgun surgery: one conceptual change forcing edits in many files.
8. Divergent change: one file edited for many unrelated reasons.
9. Speculative generality: hooks and options for a future nobody scheduled.
10. Message chains: reaching through object after object to get one value.
11. Middle man: a layer that only forwards to the next layer.
12. Refused bequest: inheriting an interface and ignoring most of it.

## Axis B: spec fidelity

Inputs: the diff and the spec (tier S: the request as recorded). Question: does the diff do
exactly what the spec says, no less and no more?

- **Missing behavior:** an acceptance criterion or stated requirement the diff does not
  satisfy. Quote the spec line in the finding.
- **Scope creep:** behavior in the diff that no spec line asks for. Quote the nearest spec
  line it exceeds, or state that no line covers it. Creep goes to INTAKE.md, not into the
  commit.
- Every finding on this axis quotes the spec; a fidelity finding without a spec quote is an
  opinion and belongs on axis A or nowhere.

## After the review

Blockers are fixed before the commit; the fix goes back through `verify`. Majors are fixed or
explicitly accepted by the owner. Minors are fixed cheaply now or recorded (INTAKE.md for
ideas, DEBT.md with a `defer:` marker for accepted debt). Refactoring findings are applied
here, in the review stage, as their own change: never folded into the implementing diff
(see `docs/standards/GLOBAL.md`). Report the outcome per axis in a few lines, then proceed
to `scope-guard` and the commit. ⚓
