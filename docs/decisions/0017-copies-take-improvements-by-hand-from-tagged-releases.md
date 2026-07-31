# 0017: a copy takes later improvements by hand, from tagged releases

- **Date:** 2026-07-31 · **Status:** accepted · **Decider:** owner (decision session), agent

## Context

Groundwork is copied before the project exists, carrying none of its history, so the copy is the
owner's own repo from its first commit. That is the identity, not an accident. What it cost stayed
invisible until it was measured: on 2026-07-31 this repo had no tags, no releases and no changelog
(`git tag` and `gh release list` both empty). A copy therefore carries no version, and its owner
has no way to learn what changed in the framework after they took it. A framework whose pitch is
"researched live, written down with a date" froze every product built on it at copy time.

The success criterion of three projects outside this repo by 2026-12-01 turns that from a
theoretical flaw into a near one: those three would each run an undated snapshot and would have to
diff two trees by hand to find out what they were missing.

## Options considered

1. **Tagged releases, a changelog, and a written route for taking improvements into an existing
   product.** Chosen. The tag gives the adopter a version they can state, the changelog says what
   moved, and the route says what to do about it. Three artifacts; nothing new runs anywhere.
2. **A changelog alone:** rejected. Without a tag nobody can say which Groundwork they hold, so the
   changelog has no line to read from.
3. **An update mechanism that syncs framework files into an existing copy:** rejected. It
   contradicts "there is nothing to run" on the out-of-scope list, and it would overwrite the parts
   a project has made its own: skills edited for that stack, `checks/config.json` tuned, AGENTS.md
   extended. Doing that safely is a package manager, which is a second product.
4. **Say nothing and let copies be forks:** rejected as a stance, though it is the honest
   description of the mechanics. It is what the repo did until today, and the silence is the thing
   this decision exists to end.

## Decision & consequences

Groundwork versions itself with its own `deliver` skill: a semantic version derived from the
Conventional Commits since the previous tag, a `CHANGELOG.md` at the root written for a reader
rather than generated at them, and one git tag plus one GitHub release per version. The first
release is `v0.1.0`. Pre-1.0 is the honest register while the framework still moves under its own
maintenance queue.

Taking improvements into an existing product stays manual and principled: read the changelog from
your version forward, copy in the files you want, keep everything you have made your own. README
says this in the adopter's words. The copy is still a fork by mechanics; what changes is that the
fork now knows what it forked from, and when.

Easier: an adopter can name their version, see what moved since, and choose. `deliver` gets its
first real exercise on the framework itself instead of only on the products built with it.

Harder: every release now owes a changelog entry, and a version number is a promise that a rename
inside `checks/` can break. Pre-1.0 keeps that promise cheap while the shape is still settling.

Watch for: pressure to automate the update once a few adopters ask for it. The answer is a sharper
changelog and a sharper route, not a mechanism. If a mechanism is ever right, the out-of-scope line
changes first, in the open, and this record gets superseded rather than quietly bypassed.
