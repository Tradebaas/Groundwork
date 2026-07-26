# 0016: Groundwork's own brief lives where the gate reads, and the blank skeleton moves aside

- **Date:** 2026-07-26 · **Status:** accepted · **Decider:** owner (scope session), agent

## Context

Groundwork's `docs/product/BRIEF.md` had never been filled, so the SC-id trace gate, the
framework's strongest control, was inert on the framework itself: every commit traced to an
explicit request and nothing could be checked against scope. Writing the brief exposed that the
same path served two purposes at once. It was also the blank skeleton every fresh copy starts
from, so filling it would hand each new project someone else's scope as its measuring stick.

Two further collisions surfaced only once real scope items existed. The fictional worked example
that ships with the framework traces `SC-3`, which any project defining an SC-3 would see
credited as finished work. And eleven of the twelve capabilities in the new brief were built
before the brief existed, so nothing claimed them and the progress overview would have reported
"0 of 12 done" about a framework that ships.

## Options considered

1. **Brief at `BRIEF.md`, skeleton moved to `TEMPLATE-BRIEF.md`, restored by `begin` §1:** the
   trace chain stays publicly resolvable, which is the whole claim being made. `begin` already
   has a "clean the copy" step that strips maintainer artifacts, so the mechanism exists.
2. **A gitignored `BRIEF.local.md`, the way STATE and INTAKE do it:** rejected. It works for
   personal state, but a hidden brief makes every `Traces-to: SC-n` unresolvable for anyone
   outside, and a framework that sells auditability cannot keep its own scope private. That is
   the special pleading the success criteria rule out.
3. **Leave the brief blank and keep tracing to explicit requests:** rejected. It leaves the
   strongest control switched off on the one project that most needs to demonstrate it works.

For the two collisions: a reserved `example` spec status keeps fiction out of every project's
count, and one baseline record states what already shipped instead of inventing eleven
retroactive specs nobody wrote.

## Decision & consequences

Scope is twelve capability-level items, phrased as what the builder can do, in the owner's
words and naming no skill. The class call is recorded in the brief: one individual at the
wheel, and the product that individual builds may be any size.

Easier: `scope-guard` finally has a measuring stick, the progress overview reports Groundwork's
own state honestly, and brownfield adopters inherit a pattern (one baseline record, then spec
forward) instead of a dilemma.

Harder: `begin` carries two more cleanup obligations, and a fresh copy that never runs `begin`
sees Groundwork's brief. That is the same exposure `MASTER_PROMPT.md` and in-flight specs
already had, handled in the same place.

Watch for: a thirteenth item that is really a deliverable. The brief holds capabilities; the
queue in state holds work. Two backlogs would be one too many.
