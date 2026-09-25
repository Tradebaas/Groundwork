# 0022: a copy takes later improvements through a report-first upgrade, never a silent merge

- **Date:** 2026-09-25 · **Status:** accepted · **Decider:** owner (recovery plan, decision D-2), agent

## Context

Decision 0017 gave Groundwork tagged releases, a changelog and a route the owner follows by hand,
and rejected any mechanism that brings framework files into an existing copy, because the
out-of-scope line said "there is nothing to run". It named its own exit: if a mechanism is ever
right, the out-of-scope line changes first, in the open, and 0017 is superseded rather than
bypassed. Both have now happened. The owner took decision D-2 on 2026-09-25, and the brief was
rewritten in the commit before this one.

What moved the owner is drift, measured for the recovery plan in September 2026 on four of the
owner's own projects built on Groundwork. Each copy was missing between 4 and 54 framework files,
and three of them differed from the framework in 37 to 48 more, one of the missing files being the
guard that refuses gate bypasses. The hand route had been available to all four and closed the gap
in none. That evidence comes from one user, who is also the maintainer; adopters outside this repo
are measured separately (recovery plan, decision D-14) before it is read as a general fact.

## Options considered

1. **A report-first upgrade from an optional plugin, plus a few zero-dependency scripts in the
   product.** Chosen. The plugin compares three states of each framework file: the hash recorded
   at install, the file as it is now, and the file in the new release. It reports each file as
   clean to update, edited here, in conflict, new, or withdrawn upstream, and writes nothing
   without a per-file yes. It never deletes, never resolves dependencies, and never touches the
   project's own files or files a project is expected to merge by hand. The product itself carries
   `init`, `assess` and `status`, which a person or agent may run and the project never needs to
   keep working.
2. **Keep the hand route of 0017:** rejected. The measurement above is the hand route's result
   under real use: it asks the adopter to diff two trees, and nobody did.
3. **An update mechanism that syncs framework files into a copy:** still rejected, for 0017's
   reason. It would overwrite the parts a project has made its own: skills edited for its stack,
   `checks/config.json` tuned, AGENTS.md extended. Doing that safely is a package manager, which is
   a second product, and the brief keeps a package manager out of scope.
4. **Say nothing and let copies be forks:** still rejected as a stance, for 0017's reason: silence
   is what left adopters unable to tell what they were missing.

## Decision & consequences

Releases, the changelog and the version a copy can name stay exactly as 0017 set them up; they are
what the upgrade reads. What changes is the route from a release into a copy: a report first, then
a yes per file, with the three-way comparison deciding what the report says. Until that upgrade is
built (recovery plan, package REL-5), improvements still travel by hand, and the public pages say
so rather than describe the plugin as if it existed.

Easier: an adopter sees in one report which framework files are behind, which ones they changed
themselves, and which ones collide, instead of diffing two trees. A missing guard shows up as
missing.

Harder: an install now has to record what it installed, so the comparison has a base, and a copy
made before that record existed needs a baseline step where doubt counts as a conflict. The plugin
becomes a second thing to version, and its minimum Groundwork version is a promise too.

Watch for: the upgrade growing into the package manager the brief rules out, one convenience at a
time. The per-file yes, the rule against deleting and the rule against resolving dependencies are
the line; a change that crosses one of them changes the brief first, as this record did.
