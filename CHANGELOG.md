# Changelog

What changed in Groundwork, and what it means if you build on it. Written for a reader, not
generated from commits.

Your copy carries the framework as it was on the day you took it. To take a later improvement,
read from your version forward, copy in the files you want, and keep everything you have made your
own. There is no updater, on purpose:
[decision 0017](docs/decisions/0017-copies-take-improvements-by-hand-from-tagged-releases.md).

Versions follow [semantic versioning](https://semver.org). Below 1.0 the shape is still settling,
so a minor version may move a file or rename a check; each entry says so when it does.

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
