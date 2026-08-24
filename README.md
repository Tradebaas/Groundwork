# Groundwork

Groundwork is the operating system for AI-assisted software projects. It is a folder you copy
before your project exists. Open the copy with any capable AI coding agent (Claude Code, Cursor,
Copilot, Codex, Gemini CLI, Windsurf, JetBrains, any) and it tells that agent how to take your
idea from first conversation to delivered, maintained software, at a quality level a large
company would accept.

## The value it adds

An AI agent without structure has predictable failure modes: every session starts with amnesia,
scope drifts, quality depends on the day, and tokens burn on re-explaining the project.
Groundwork removes those failure modes by design:

- **Memory on disk.** State, scope, decisions and standards live in files. A new session reads
  where the last one stopped instead of re-deriving the project in chat, and those same files
  answer, in plain language, what is done and what is still left.
- **Discipline built in.** One always-loaded rulebook, an on-demand skill library covering every
  phase (scope, spec, architecture, design, verification, debugging, code review, delivery,
  maintenance, compliance, plus session calibration of model and effort), and automated checks
  that gate every commit at zero token cost.
- **Token efficiency by design.** Skills load only when needed, large work is cut into
  one-session tickets, and every fact lives in one file that everything else points to.
- **No lock-in.** Plain Markdown and open standards, readable by any agent, any model, any
  editor, today and after the next tool switch.

Want the full story first? An interactive explainer ships with the repo: see it live at
**https://tradebaas.github.io/Groundwork/**, or open [index.html](index.html) in any browser.

## Start a project

Start from a clean copy that carries **none of Groundwork's git history**: your project deserves
its own first commit, not ours. Pick one:

- **On GitHub (best):** click **Use this template**, then **Create a new repository**. You get a
  fresh repo with a single initial commit and no Groundwork history.
- **From the CLI:** `npx degit Tradebaas/Groundwork my-project` copies the latest snapshot with no
  history. degit breaks the `.claude/skills` symlink; restore it once with
  `ln -sfn ../.agents/skills .claude/skills` (the `begin` skill also repairs it).
- **Or:** download the ZIP from the green **Code** button and unzip it (see the symlink note under
  Requirements).

Avoid a plain `git clone` for this: it drags Groundwork's entire commit history, and our
development choices, into your project. If you cloned anyway, `begin` resets git so your first
commit is a true root.

Then open the folder in your IDE / agent and say **`begin`** (or load the `begin` skill).
Already have a PRD, project description or even a vague idea? Paste it right there: `begin`
treats it as the primary source and only interviews you for what it leaves open. From those
answers it sets up git and the hooks, fills the templates, and proposes the first real step.
(Design taste comes later, when the `design` skill needs it.)

That's it. The agent takes it from there. The rules in [AGENTS.md](AGENTS.md) tell it how.

## Already have a project?

Groundwork lays over a repo that exists, without touching its history. Take a copy the same way as
above, then move its contents into your project root, minus the four files that describe a product
rather than the framework: keep your own `README.md`, `LICENSE`, `.gitignore` and `index.html`.
Merge Groundwork's ignore entries into yours by hand, and read the explainer from the copy you
took. Everything else is framework and lands as is, merging into `docs/` and `.github/` if you
already have those. Where a name collides, copy it in under a temporary name and merge by hand:
nothing here is worth losing your own file over. If your tool broke the `.claude/skills` symlink on
the way, restore it with `ln -sfn ../.agents/skills .claude/skills`.

Then say **`begin`** as above. It reads which of the two situations it is and adapts: your git
history stays, the interview takes its answers from your code first, one baseline record states
what already shipped so the overview does not report a running product as nothing done, and the
first `node checks/check.mjs` is treated as a measurement instead of a verdict. Real code turns
those gates red on contact, and the point is a starting position you can see, in
[docs/state/DEBT.md](docs/state/DEBT.md), not a cleanup marathon before you may work.
Why one route and not a separate installer:
[decision 0018](docs/decisions/0018-an-existing-project-adopts-groundwork-through-begin.md).

## Version, and taking later improvements

Every release is tagged and described in [CHANGELOG.md](CHANGELOG.md), so a copy can tell which
Groundwork it holds. Improvements travel by hand and on purpose: read the changelog from your
version forward, copy in the files you want, and keep everything you have made your own. There is
no updater, and there will not be one: your copy has edited skills, tuned checks and its own rules
by then, and merging that safely is a package manager, not a framework.
[Decision 0017](docs/decisions/0017-copies-take-improvements-by-hand-from-tagged-releases.md)
records the reasoning.

## How it works

- **[AGENTS.md](AGENTS.md)** is the single always-loaded rulebook, written to the open
  [agents.md](https://agents.md) standard that all major agent tools read. `CLAUDE.md` (Claude
  Code) and `.gemini/settings.json` (Gemini CLI) are thin bridge files that point to it. Never
  edit those.
- **[.agents/skills/](.agents/skills/)** holds the expert methods (scoping, spec, stack choice,
  design, verification, debugging, code review, delivery, maintenance, compliance, session
  calibration ...) in the open
  [Agent Skills](https://agentskills.io) format. They load on demand, so they cost no context
  until needed. `.claude/skills` is a symlink to this directory.
- **[docs/](docs/)** is the project's externalized memory: live state and session handoff,
  scope, specs, decisions, standards, design system, compliance register. Agents read state from
  disk instead of re-deriving it every session. [docs/README.md](docs/README.md) is the manifest.
- **[checks/](checks/)** enforces hygiene mechanically: `node checks/check.mjs` validates the
  docs manifest, link integrity, retired-fact denylist, file and source-code budgets, spec-ticket
  integrity, skill format, secrets, and more: zero model tokens spent. CI runs it on every push.
  A `commit-msg` hook adds the last link in the chain: every commit names the scope item it
  serves, so a sha resolves back to a requirement instead of to someone's memory.
  The checks test themselves: every gate has to prove it fails on a violation before it is
  trusted, and `.github/workflows/ci.yml` runs those suites ahead of the checks, because a gate
  that isn't tested is false confidence. The copy route is tested the same way: on every push,
  `node checks/drill.mjs` unpacks a fresh copy, walks it to a first governed commit and throws it
  away again, so the promise at the top of this file is checked by machine instead of asserted
  (runbook: [docs/operations/evidence-drill.md](docs/operations/evidence-drill.md)). The same directory holds `node checks/progress.mjs`: a read-only, plain-language
  answer to "what is done and what is left", derived from the brief, the specs and the handoff,
  with `--all` covering every project you have started this way. Add `--serve` and the same
  answer opens as a page on this machine only: the goal, the stand, the next step, which file
  owns which fact, how the documents point at each other, and whether the gates are armed on
  this clone. Every card is read from the file that owns it at the moment you open the page, and
  nothing is stored. `--page` prints that same board as one self-contained HTML file, for someone
  who has to look but has no repository, no server and no checkout: it says when it was made, it
  names every file without linking to any, and it carries none of them.

## Requirements

- Any AI coding agent. No vendor lock-in: one rulebook, open standards, plain Markdown.
- Node.js ≥ 20 for `checks/` (the only tooling dependency until you choose a stack).
- On Windows: enable Developer Mode so the `.claude/skills` symlink survives
  `git clone -c core.symlinks=true` or ZIP extraction. No symlink support? Set
  `"skipSymlinkCheck": "<why>"` in `checks/config.json`, with your reason as the value, and point
  your tool at `.agents/skills/` directly.
- After every fresh clone: `node checks/check.mjs --install-hooks` (wires the versioned
  pre-commit and commit-msg gates).

## What lives where

| Path | What it is |
|---|---|
| `AGENTS.md` | Always-on rules + routing table (the front door for agents) |
| `README.md` | This file (the front door for humans) |
| `.agents/skills/` | Skill library: expert methods, loaded on demand |
| `docs/` | Project memory: state, scope, specs, decisions, standards, design, compliance |
| `checks/` | Zero-token enforcement: hygiene checks + their self-tests, plus the progress overview |
| `index.html` + `fonts/` | The interactive explainer of this system (the live version linked above) |
| `.github/workflows/ci.yml` | CI quality gate (extended per stack by the `stack` skill) |

Templates you fill per project are marked `TEMPLATE` at the top; the `begin` and follow-up
skills fill them in the right order. Files without that marker are the system itself.

## License

MIT: see [LICENSE](LICENSE). Use it, copy it, adapt it, ship with it, for anything. No
attribution required (though it's appreciated). Each project you build on Groundwork sets its
own license via the `comply` skill.

## Handing over

Everything an agent or human needs is in the repo: state in `docs/state/STATE.md`, decisions in
`docs/decisions/`, the rest via the routing table in `AGENTS.md`. To hand the project to someone
else (different IDE, different model), give them the repo. Nothing lives outside it.
