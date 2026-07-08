# STATE: live project state

<!-- TEMPLATE: filled by the `begin` skill, then maintained every session (AGENTS.md session
     protocol). This is the ONLY live planning document; no other file tracks current work. -->

## Handoff: read this first

- **Status:** NOT STARTED. Fresh copy of Groundwork. Load the `begin` skill.
- **Phase:** TBD <!-- prepare | design | build | verify | deliver | maintain -->
- **Branch / HEAD:** TBD
- **Gates:** TBD <!-- e.g. "checks green, tests 42/42, CI green @ <sha>" -->
- **Now ▶** run `begin`
- **Blocked on:** TBD

## Log

<!-- Newest first. Per session one short dated entry: what changed, what was decided (link the
     decision), what is next. Keep this file under 150 lines: when it grows past that, move the
     oldest entries to docs/state/log/YYYY-MM.md (the manifest pattern already covers those). -->

### 2026-07-08 - hard cap: any AGENTS.md/CLAUDE.md never past 200 lines

- Added the `agent-file-cap` check: every file named `AGENTS.md` or `CLAUDE.md` anywhere in the
  tree (including products built on Groundwork) is hard-capped at 200 lines (`budgets.agentFileHardCapLines`).
  The root AGENTS.md keeps its stricter 150 budget (`budget-agents`); this is the universal backstop.
- Self-test added; `node checks/check.mjs` and the test suite (29) are green.
- Same rule set globally in `~/.claude/CLAUDE.md` (out of repo, noted here for the handover audit)
  so it also holds outside Groundwork projects.

### 2026-07-08 - token-saving: checkpoint skill + context-usage nudge

- Added the `checkpoint` skill (flush a lean mid-session handoff into this file, then `/clear` to
  resume in a fresh, cheaper context) and registered it in `AGENTS.md`.
- Out-of-repo helper, noted here for the handover audit: a Claude Code Stop hook at
  `~/.claude/hooks/checkpoint-reminder.mjs` (wired in `~/.claude/settings.json`) nudges the user
  once a session passes ~150k context tokens. It only ever suggests, fails safe (silent no-op if
  the transcript format changes), and is global, so it is NOT under version control here.
- Declined the token tools from the viral thread (third-party MCP servers / proxies): the trust
  surface and risk of silent context loss outweigh the savings for a repo this small.
