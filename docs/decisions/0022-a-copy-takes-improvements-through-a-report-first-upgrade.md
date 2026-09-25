# 0022: a copy takes later improvements through a report-first upgrade, never a silent merge

- **Date:** 2026-09-25 · **Status:** accepted · **Decider:** owner (recovery plan, decision D-2), agent

## Context

Decision 0017 gave Groundwork tagged releases, a changelog and a route the owner follows by hand,
and rejected any mechanism that brings framework files into an existing copy, because the
out-of-scope line said "there is nothing to run". It named its own exit: if a mechanism is ever
right, the out-of-scope line changes first, in the open, and 0017 is superseded rather than
bypassed. Both have now happened. The owner took decision D-2 on 2026-09-25, and the brief was
rewritten in the commit before this one. D-2 and the package names below (REL-1, REL-5, ADP-3)
come from the owner's recovery plan of September 2026, which is kept outside this repo; the facts
this record rests on are repeated here so it does not depend on that file.

What moved the owner is drift, measured for that plan on four of the owner's own projects built on
Groundwork. Each copy was missing between 4 and 54 framework files, and three of them differed
from the framework in 37 to 48 more, one of the missing files being the guard that refuses gate
bypasses. In all four the gap stood, and closing it by hand means diffing two trees per copy. That
evidence comes from one user, who is also the maintainer; adopters outside this repo are measured
separately (recovery plan, decision D-14) before it is read as a general fact.

## Options considered

1. **A report-first upgrade from an optional plugin, plus a few zero-dependency scripts in the
   product.** Chosen. The upgrade compares each framework file three ways: as it was installed, as
   it is now, and as it is in the new release. That comparison is what lets it tell a file you
   edited from a file that is behind, and name a file that is missing as missing. Its report comes
   first, and it writes no framework file without a yes that names that file; its own records
   under `.groundwork/` are the only thing it writes without asking. It never deletes, never
   resolves dependencies, and never touches the project's own files or files a project is expected
   to merge by hand. It never writes a merged result either: a conflict ends as a report and a
   three-way diff that the person resolves. The product itself may carry `init`, `assess` and
   `status`, which a person or agent may run and the project never needs to keep working. The
   exact file states and their outcomes are package REL-5's to settle, inside these limits.
2. **Keep the hand route of 0017:** rejected. The measurement above is what copies look like with
   only the hand route: it asks the adopter to diff two trees, and the gap stood in every copy.
3. **A changelog alone, without tags:** still rejected, for 0017's reason, and not reopened here:
   tags and the changelog stay, and the upgrade reads them.
4. **An update mechanism that syncs framework files into a copy:** still rejected, for 0017's
   reason. It would overwrite the parts a project has made its own: skills edited for its stack,
   `checks/config.json` tuned, AGENTS.md extended. Doing that safely is a package manager, which is
   a second product, and the brief keeps a package manager out of scope.
5. **Say nothing and let copies be forks:** still rejected as a stance, for 0017's reason: silence
   is what left adopters unable to tell what they were missing.

## Decision & consequences

Releases, the changelog and the version a copy can name stay exactly as 0017 set them up; they are
what the upgrade reads. What changes is the route from a release into a copy: a report first, then
a yes per file, with the three-way comparison deciding what the report says. Adoption changes with
it: an existing project comes in through `init --adopt` plus `begin`, recorded as an amendment to
0018. Until the upgrade is built (package REL-5), improvements still travel by hand, and the public
pages say so rather than describe the plugin as if it existed.

The brief's constraints reach the plugin the same way they reach the product: it is part of what
the brief scopes, so it stays vendor-neutral, MIT, free and unmonetised. Its logic runs as plain
Node, so it works without any agent tool, and in a tool that cannot load the plugin the hand route
is the visible fallback.

Where it is paid (decision 0015): the scripts and the upgrade cost nothing until someone runs them,
the same as a tier 1 artifact; the standing cost is the maintainer's, who now versions a plugin
beside the framework and keeps its minimum Groundwork version true.

Easier: an adopter sees in one report which framework files are behind, which ones they changed
themselves, and which ones collide, instead of diffing two trees. A missing guard shows up as
missing.

Harder: an install now has to record what it installed, so the comparison has a base, and a copy
made before that record existed needs a baseline step where doubt counts as a conflict. The plugin
becomes a second thing to version, and its minimum Groundwork version is a promise too.

Watch for: the upgrade growing into the package manager the brief rules out, one convenience at a
time. The yes that names each file, the rule against deleting, the rule against writing a merged
result and the rule against resolving dependencies are the line; a change that crosses one of them
changes the brief first, as this record did.
