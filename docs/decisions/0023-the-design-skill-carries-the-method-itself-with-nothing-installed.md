# 0023: The design skill carries the method itself, with nothing installed

- **Date:** 2026-10-10 · **Status:** accepted, supersedes 0020 · **Decider:** owner (Remon) + agent

## Context

Decision 0020 retired the in-house frontend rulebook in favor of an installed design method
(impeccable) with its own craft floor, detector and reviewer. Two months of use showed the bill:
an install step in `begin`, a payload declared third-party in `checks/config.json`, a detector
job in CI, a version pair that `maintain` had to keep current, a `renders` class answered by a
tool rather than by looking, and `design-guard` as a second skill that re-checked the detector's
ground. The owner's projects are built by one person with Claude; the method's apparatus was
sized for a team, and most of its context cost landed in sessions that never touched a screen.
The owner asked on 2026-10-10 to remove it from every project and from the framework.

## Options considered

1. **Remove the dependency and fold the two things that mattered into `design` (chosen):** the
   three decision points (direction, rendered compositions, finish verdict by a reviewer that
   never saw the build thread) stay as the skill's section 3, and the render judgment that
   `design-guard` carried becomes section 5 of the same skill. Nothing to install, nothing to
   version, no detector to keep current.
2. **Keep the method, drop only the detector job:** the install and the version pair remain, and
   the payload still rides in every design session's context. Halves the bill, keeps the shape.
3. **Keep 0020 as it was:** rejected by the owner on cost; the framework's own claim that every
   addition declares where it is paid (0015) applies here, and this one was paid in every session
   on every machine.

## Decision & consequences

The method is gone from the project layer: `begin` no longer installs it, `maintain` no longer
refreshes it, `stack` no longer wires its detector, `checks/design-method.mjs` and the enforcement
signal that read its version are deleted, `thirdParty` in `checks/config.json` is empty, and the
`renders` class of the floor table is answered as `manual` with a `defer:` marker until a project
has a screenshot run of its own. `design-guard` is merged into `design` as section 5, "Look at it
before you ship it", which `verify` runs on every delivery. The word is in the denylist so it
cannot return by habit; `CHANGELOG.md` is excluded because history keeps its facts.

Easier: a design session costs the skill and the owner's two files, nothing else; a project has
one fewer dependency to audit and nothing to upgrade. Harder: there is no mechanical detector of
the stock-AI look anymore, so section 5 of `design` is the only thing standing between a build and
a template palette; it is judgment, run on a render, and it has to be run. Watch for: a project
that ships a screen nobody looked at. The `verify` report's render line is where that shows.
