# 0018: an existing project adopts Groundwork through `begin`, as method and not as an installer

- **Date:** 2026-07-31 · **Status:** accepted · **Decider:** owner (decision session), agent

## Context

`docs/product/BRIEF.md` said "Existing repos come in through the retrofit route" under rollout.
No such route was in this repo. A search of `docs/`, `.agents/` and `README.md` on 2026-07-31
found that sentence and nothing that describes a route. The only retrofit that existed was the
maintainer's personal global skill, which lives outside this repo, is written in another language,
and answers a different question: general repo hygiene for any project, not adoption of Groundwork.
An adopter could not reach it.

So the brief promised a capability the repo could not back, which is the exact failure SC-11 exists
to prevent, and it had to be resolved in one direction or the other rather than left standing.
Meanwhile the out-of-scope list never ruled brownfield out: it rules out an installer, a CLI and a
scaffolder, on the ground that Groundwork is copied before the project exists. That is an argument
about mechanism, not about who may adopt.

## Options considered

1. **A branch inside `begin`.** Chosen. One skill already owns the question "how does a project
   start with Groundwork", and the two entrances share most of their steps: the same template
   cleanup, the same interview, the same machinery. The differences are few and nameable.
2. **A separate `adopt` skill:** rejected. It would answer the same question as `begin` in a second
   place and drift from it, and a whole skill is the most expensive tier in decision 0015 for a
   difference of a handful of steps.
3. **Rule brownfield out of scope and delete the sentence:** put to the owner and rejected by them.
   It costs the flank that the nearest comparable system leads with, and it contradicts the
   principle in the vision that names the retrofit story as part of distribution.
4. **A script that installs Groundwork into an existing repo:** not on the table. The out-of-scope
   line rules it out, and decision 0017 just ruled the same way for updates.

## Decision & consequences

SC-1 in the brief now names both entrances, rather than a thirteenth scope item: a copy before the
project exists, and an existing project the framework is laid over. One capability, two doors.

`begin` opens by asking which of the two it is, and the brownfield branch changes four things:
the project's own `.git` and history stay, so no repo is initialized over them; the interview reads
its answers out of the code, the README and the manifests first and plays them back, because the
project can answer most of them; one baseline record in `docs/specs/archive/000-baseline/` states
what already shipped, reusing the pattern this repo proved on itself, so the overview does not
report a running product as nothing done; and the first `check.mjs` run is treated as a
measurement, not a failure.

That last one is the load-bearing part. A real codebase turns the gates red on contact, and if
adoption means fixing all of it before any work can happen, nobody adopts. What the first run
flags goes to `docs/state/DEBT.md` as the starting position, and the gates hold from that commit
forward.

Easier: the brief tells the truth again, an existing project has a documented way in, and the
route costs no new skill and no new gate.

Harder: `begin` now carries two paths, so every future edit to it has to hold for both. The
brownfield path is the one this repo cannot dogfood, since Groundwork was never retrofitted onto
anything: it stays unproven until a real project runs it.

Watch for: the branch growing into a second skill by accretion. If the two paths ever stop sharing
the interview and the machinery, that is the signal to split them deliberately, not to keep adding
conditionals.
