# Changelog

What changed in Groundwork, and what it means if you build on it. Written for a reader, not
generated from commits.

Your copy carries the framework as it was on the day you took it. To take a later improvement,
read from your version forward, copy in the files you want, and keep everything you have made your
own. There is no updater, on purpose:
[decision 0017](docs/decisions/0017-copies-take-improvements-by-hand-from-tagged-releases.md).

Versions follow [semantic versioning](https://semver.org). Below 1.0 the shape is still settling,
so a minor version may move a file or rename a check; each entry says so when it does.

## v0.2.0 - 2026-08-01

The claim this framework makes about itself now runs on every push. `checks/drill.mjs` unpacks a
fresh copy, walks it through `begin`'s first step, arms the hooks, makes a governed first commit
and watches an ungoverned one get refused, then throws the copy away. It is a CI job of its own,
so the green tick beside a commit stands for that walk instead of promising it. The runbook is
`docs/operations/evidence-drill.md`, and you can run the same thing locally with
`node checks/drill.mjs`.

A copy also starts with more files of its own. Next to the brief it already replaced, `begin` now
lays a blank deploy runbook, debt ledger and compliance register over Groundwork's, so a new
project inherits the shape of those files and none of this project's answers. Step 1 of `begin`
went from four hand-edits to two.

Two files split, which is what makes this a minor rather than a patch. `checks/check.mjs` divided
by responsibility into itself (the runner and the document gates), `checks/check-code.mjs` and
`checks/check-trace.mjs`, with the test suites mirroring the split. The registry is still one
object, so the same checks run and `node checks/check.mjs` is unchanged, but proving the checks
first is three commands now instead of one: `.github/workflows/ci.yml` lists them in order.
`docs/compliance/COMPLIANCE.md` kept the regime rows every project shares and handed this
project's own answers to `docs/compliance/REGISTER.md`, which is the file `begin` replaces. If
your copy carries edits to either file, read yours against these before copying anything on top.

The gates got harder to disarm without meaning to. A `checks:allow-length` marker counts only
inside a comment that it opens, so a file which merely mentions the marker no longer exempts
itself from the line cap. A `defer:` marker is read at the end of a line of code, not only on a
line of its own. An exemption in `checks/config.json` has to say why it is there. And a path
written by a document reaches your terminal stripped of control characters, so one finding stays
one printable line.

The published explainer is in English now, and it asks nothing of anyone else: both webfonts ship
with the page under `fonts/OFL.txt`, the picker offers only families the page already holds, and
no state of the page makes a third-party request. Among the skills, `architect` asks what the
system decides and where that decision lives, and a `docs/product/CONTEXT.md` entry carries how a
term is measured, stopping short of its thresholds for the reason in decision 0019.

## v0.1.0 - 2026-07-31

The first tagged release. Everything below already shipped; the version is what is new, so a copy
can now name what it holds.

What you get: one always-loaded rulebook in `AGENTS.md` on the open agents.md standard, with thin
adapters for the tools that need their own file. A skill library in `.agents/skills/` on the Agent
Skills standard, loaded on demand, covering the route from first idea to delivered and maintained
software: scope, spec, architecture, stack choice, design and voice, verification, debugging, code
review, delivery, maintenance, compliance and handover. Project memory on disk in `docs/`, so a new
session, another tool or a reader a year later picks up state and decisions from files instead of
from chat history. Mechanical gates in `checks/`, dependency-free on Node 20 and tested against
themselves, wired into git hooks and CI, including a commit gate that makes every commit name the
scope item it serves. A read-only overview (`node checks/progress.mjs`) that derives what is done
and what is left from the brief, the specs and the handoff, and opens the same answer as a local
page with `--serve`. Decision records explaining why the system works the way it does.

Counts are deliberately absent here: `index.html` and `node checks/progress.mjs` read them from
the directories that own them, and a third typed copy would be the one that goes stale (SC-11).

Two entrances: a copy taken before the project exists, and a project that already exists with the
framework laid over it. Both go through `begin`.
