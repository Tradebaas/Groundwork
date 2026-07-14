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
  where the last one stopped instead of re-deriving the project in chat.
- **Discipline built in.** One always-loaded rulebook, an on-demand skill library covering every
  phase (scope, spec, architecture, design, verification, debugging, code review, delivery,
  maintenance, compliance), and automated checks that gate every commit at zero token cost.
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

Then open the folder in your IDE / agent and say **`begin`** (or load the `begin` skill). It
interviews you about scope and goals, sets up git and the hooks, fills the templates, and proposes
the first real step. (Design taste comes later, when the `design` skill needs it.)

That's it. The agent takes it from there. The rules in [AGENTS.md](AGENTS.md) tell it how.

## How it works

- **[AGENTS.md](AGENTS.md)** is the single always-loaded rulebook, written to the open
  [agents.md](https://agents.md) standard that all major agent tools read. `CLAUDE.md` (Claude
  Code) and `.gemini/settings.json` (Gemini CLI) are thin bridge files that point to it. Never
  edit those.
- **[.agents/skills/](.agents/skills/)** holds the expert methods (scoping, spec, stack choice,
  design, verification, debugging, code review, delivery, maintenance, compliance ...) in the
  open
  [Agent Skills](https://agentskills.io) format. They load on demand, so they cost no context
  until needed. `.claude/skills` is a symlink to this directory.
- **[docs/](docs/)** is the project's externalized memory: live state and session handoff,
  scope, specs, decisions, standards, design system, compliance register. Agents read state from
  disk instead of re-deriving it every session. [docs/README.md](docs/README.md) is the manifest.
- **[checks/](checks/)** enforces hygiene mechanically: `node checks/check.mjs` validates the
  docs manifest, link integrity, retired-fact denylist, file and source-code budgets, spec-ticket
  integrity, skill format, secrets, and more: zero model tokens spent. CI runs it on every push.
  The checks test themselves (`node checks/check.test.mjs`): a gate that isn't tested is false
  confidence.

## Requirements

- Any AI coding agent. No vendor lock-in: one rulebook, open standards, plain Markdown.
- Node.js ≥ 20 for `checks/` (the only tooling dependency until you choose a stack).
- On Windows: enable Developer Mode so the `.claude/skills` symlink survives
  `git clone -c core.symlinks=true` or ZIP extraction. No symlink support? Set
  `"skipSymlinkCheck": true` in `checks/config.json` and point your tool at `.agents/skills/`
  directly.
- After every fresh clone: `node checks/check.mjs --install-hooks` (wires the versioned
  pre-commit gate).

## What lives where

| Path | What it is |
|---|---|
| `AGENTS.md` | Always-on rules + routing table (the front door for agents) |
| `README.md` | This file (the front door for humans) |
| `.agents/skills/` | Skill library: expert methods, loaded on demand |
| `docs/` | Project memory: state, scope, specs, decisions, standards, design, compliance |
| `checks/` | Zero-token enforcement: hygiene checks + their self-tests |
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
