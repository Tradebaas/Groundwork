# Evidence drill runbook

<!-- MAINTAINERS OF GROUNDWORK ITSELF. This runbook is about the framework's own copy route, not
     about any project built on it. A project inherits both the drill and its CI job dead: the
     drill reports that it has nothing to walk and exits green, and the workflow condition never
     matches. Nothing to clear at `begin`. -->

## The claim this backs

Groundwork tells people that someone can copy the repository, say "begin", and reach a first
governed commit with scope written, state on disk and gates running, without the maintainer. That
is `docs/product/BRIEF.md`'s first success criterion and the promise `README.md` and the explainer
open with.

It was proven once by hand, on 2026-07-14, from a pasted PRD to a checks-green first commit. A
proof with a date on it says nothing about the repository today, so this drill runs the mechanical
half of that walk on demand and on every push, against the snapshot an adopter actually receives.

## Running it

```bash
node checks/drill.mjs               # the current tracked snapshot, about 2 seconds
node checks/drill.mjs --ref <sha>   # another snapshot, most usefully a release candidate
node checks/drill.mjs --keep        # leave the throwaway copy on disk to look at
node checks/drill.test.mjs          # prove the drill can still fail (11 tests)
```

Run against a project rather than the framework, the drill says it has nothing to walk and exits
green. CI passes `--require-walk`, which turns that answer red: on this repository a skip would be
a green tick standing for a walk that never happened.

`--ref` walks **today's** `begin` bullets against the snapshot named, which is the right question
for a commit about to be tagged and the wrong one for an old tag. Drilling the v0.1.0 tag stops
at the clearing step with "no blank at `docs/operations/TEMPLATE-DEPLOY.md`", because that blank
arrived after the tag. Nothing is broken there: v0.1.0's own `begin` never mentioned the file.

The drill works in a temporary directory and touches nothing else. It never runs
`node checks/progress.mjs --register`, which would write a throwaway path into the owner's
cross-project overview. It gives the copy its own isolated git config, so the machine's global
templates, hooks or signing key cannot change the result.

## What the seven steps prove

| Step | What a failure means |
|---|---|
| a fresh copy | The tracked snapshot lost something an adopter needs, the `.claude/skills` symlink broke, or a maintainer-only file escaped the gitignore into every copy |
| the gates | The five self-test suites or `checks/check.mjs` do not pass on an untouched copy, or the copy claims its commit gates are armed when there is no git repository yet |
| the overview | `checks/progress.mjs` does not render for a copy |
| begin step 1 | One of the clearing commands in the `begin` skill has no template left to copy, leaves Groundwork's own content behind, or produces a repository the checks reject |
| arming | `git init` plus `checks/check.mjs --install-hooks` does not move the enforcement report from unarmed to armed |
| the first commit | The exact first commit `begin` prescribes is rejected by the gates it just installed |
| the bite | A commit with no type and no trace was accepted, which means the gate is installed and not working |

## What it does not prove

The drill walks the half of the route that is a command. The half that is judgment stays a
session's work and is not simulated: the interview, what `docs/product/BRIEF.md` ends up saying,
the first spec, the first real change.

Two of `begin` step 1's bullets are edits rather than one command, and the drill leaves them
alone: emptying `CHANGELOG.md` down to its heading, and stripping the `data-derive` attributes
from the stat strip in `index.html`. A copy that skips both still passes the checks, which is
why nothing here catches it.

## Reading a failure

A failed drill keeps its copy on disk and prints the path, whether or not `--keep` was passed.
Reproduce the failing step inside that directory by hand before changing anything: the copy is the
evidence, and it is a real repository at the exact point the walk stopped.

## Where the published evidence lives

The `drill` job in `.github/workflows/ci.yml` runs the self-test and then the drill on every push
and every pull request. A green tick beside a commit means the copy route was walked on that
commit, so the evidence carries the commit rather than a date. There is no stored report to keep
up to date, in line with the rule that what the code can prove is not restated in prose.
