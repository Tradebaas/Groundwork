# Groundwork: the operating system for this project

Groundwork tells any AI agent (in any IDE, on any model) how to take this project from first
idea to delivered, maintained software at enterprise quality. This file is always loaded and is
the single source of rules. Everything else loads on demand via the routing table below.

**New project (docs/state/STATE.md still says NOT STARTED)?** Load the skill `begin` and follow it.

## Session protocol

1. Read the handoff block at the top of `docs/state/STATE.md` before anything else. Do not
   re-derive project state from the codebase. That is what the file is for.
2. Work one task at a time. When you finish, propose exactly **one** best next step, no menus.
3. Before ending a session or after completing significant work: update `docs/state/STATE.md`.
   One fact, one place: update only the file that owns the fact.
4. End every message with ⚓ to confirm these rules are loaded.

## Decision ladder: run before writing anything

Stop at the first rung that holds:

1. **Does this need to exist?** Not requested and not load-bearing → don't build it.
2. **Does it already exist in this repo?** Reuse it. Never write a second version.
3. **Does the platform, stdlib, or an installed dependency do it?** Use that.
4. Only then: build the **minimum that works**, to the standards in `docs/standards/`.

Understanding comes before the ladder. A small diff you don't understand is not efficiency.
Read enough to know the root cause, then fix the cause once, not the symptom everywhere.

## Hard rules

- **Scope.** All work must trace to `docs/product/BRIEF.md` or an explicit request. Out-of-scope
  findings and ideas go to `docs/state/INTAKE.md`: record them, don't build them.
- **Done is done.** Stable, tested, in scope = finished. No gold-plating, no unrequested
  refactors, no "while I'm here". There is always something to improve; that is not a reason to.
- **Never bypass a gate.** No `--no-verify`, no skipping hooks, no commenting out or weakening a
  check to make it pass. A red gate is information. If a gate is wrong, fix the gate in the open.
- **Security floor (never simplify away):** input validation at trust boundaries, authorization
  checks, error handling that prevents data loss, secrets out of code and logs, accessibility.
- **Honesty.** Report failures as failures, with output. Never claim something works that you
  did not verify. No reassuring the user against the evidence.
- **Verify before "done".** Exercise the change end-to-end, not just the type checker. What you
  cannot verify, you flag. Details: skill `verify`.
- **Language.** All governance text, code, comments, and commits in English. Write plainly: no em
  dashes, en dashes, curly quotes or ellipsis characters, and none of the AI-boilerplate phrasing
  banned in `docs/design/VOICE.md`. This holds for every file in this repo and every product built
  on Groundwork; `checks/check.mjs` (prose-style) enforces the mechanical part. Product-facing
  language is set per project in `docs/design/VOICE.md`.

## Efficiency

- Read only what the task needs. Before each file read, ask: does this answer the current question?
- Prefer pointers over copies. Link to the owning file; never restate its content elsewhere.
- State lives on disk, not in chat: progress → `docs/state/STATE.md`, decisions →
  `docs/decisions/`, debt → `defer:` markers (below) + `docs/state/DEBT.md`.
- Large explorations: delegate to a subagent that returns a short summary, if your tool has them.
- Non-Markdown documents (PDF, Office, images, audio, data files): convert to Markdown with the
  `ingest` skill before reading. Content, not binary bulk, is what should cost tokens.
- Deliberate simplification? Mark it at the site, so it is grep-recoverable and auditable:
  `// defer: <what was simplified>. ceiling: <where it breaks>. upgrade-when: <trigger>.`

## Where everything lives

| Topic | Source of truth |
|---|---|
| Live state, session handoff, what's next | `docs/state/STATE.md` |
| Scope, goals, users, constraints | `docs/product/BRIEF.md` |
| Feedback/ideas awaiting triage | `docs/state/INTAKE.md` |
| Technical debt ledger | `docs/state/DEBT.md` |
| Specs for changes being built | `docs/specs/` |
| Architecture & other decisions | `docs/decisions/` |
| Code standards (per stack) | `docs/standards/` |
| Design system (visual) | `docs/design/DESIGN.md` |
| Voice & content system | `docs/design/VOICE.md` |
| EU/NL compliance register | `docs/compliance/COMPLIANCE.md` |
| Operational runbooks | `docs/operations/` |
| Automated checks (run: `node checks/check.mjs`) | `checks/` |
| Full docs manifest | `docs/README.md` |

## Skills: expert methods, loaded on demand

Skills live in `.agents/skills/` (open Agent Skills standard; `.claude/skills` is a symlink to
it). If your tool does not auto-load skills, read the skill's `SKILL.md` yourself when its
trigger applies. The library:

| Skill | Load when |
|---|---|
| `begin` | Starting a freshly copied project: intake, setup, first commit |
| `scope` | Defining or changing scope; triaging INTAKE.md |
| `spec` | Before building anything non-trivial: right-sized spec method |
| `critical-thinking` | Before committing to an idea/plan/approach; when you're about to just agree |
| `stack` | Choosing the tech stack; generates `docs/standards/<stack>.md` and wires gates |
| `architect` | System design before building: boundaries, data, contracts, threats |
| `design` | Standing up the project's design & voice system |
| `scope-guard` | Before calling work done or proposing a commit |
| `design-guard` | Before delivering any UI or user-facing output |
| `verify` | Verifying a change actually works, end to end |
| `deliver` | Releasing, deploying, or handing over a milestone |
| `maintain` | Post-launch work: monitoring, updates, incidents, debt harvest |
| `handover` | Making the project transferable to another human or agent |
| `skill-author` | The project needs a new skill: how to write one correctly |
| `comply` | Compliance review (GDPR/AVG, EU AI Act, accessibility, licensing) |
| `ingest` | Convert a PDF/Office/image/data file to Markdown before reading, to save tokens |

## Conflict rule

Explicit user instruction > this file > the owning file in `docs/` > anything else.
If code and docs disagree, the code is the fact: fix the doc, and add the retired wording to the
denylist in `checks/config.json` so it can never silently return.
