# 0001: One canonical rulebook: AGENTS.md with thin per-tool bridges

- **Date:** 2026-07-06 · **Status:** accepted · **Decider:** Groundwork build (Claude, per owner brief)

## Context

The system must behave identically in every IDE/agent (Claude Code, Cursor, Copilot, Codex,
Gemini CLI, Windsurf, JetBrains, ...) without forking its rules per tool. As of mid-2026 the
AGENTS.md convention is stewarded by the Linux Foundation, used by 60k+ projects, and read
natively by every major tool except Claude Code (reads CLAUDE.md; Anthropic officially documents
the `@AGENTS.md` import bridge) and Gemini CLI (needs one settings line).

## Options considered

1. **AGENTS.md canonical + one-line bridges (chosen):** native for most tools, zero duplication,
   bridges are trivially verifiable by `checks/check.mjs`.
2. **CLAUDE.md canonical:** vendor-specific; every other tool would need a pointer to a
   Claude-named file. Wrong direction for a tool-agnostic system.
3. **Generated copies via a sync tool (Ruler/rulesync):** real duplication with a build step and
   a third-party dependency, to solve a problem the bridges already solve for free.

## Decision & consequences

`AGENTS.md` is the only rulebook; hard budget ≤150 lines (research: adherence drops and cost
rises beyond ~150-300 lines; every line must earn its place). `CLAUDE.md` contains only
`@AGENTS.md`; `.gemini/settings.json` points context at AGENTS.md. The check script fails the
build if a bridge gains content of its own or the budget is exceeded. Rule details that don't fit
the budget live in skills and `docs/`, loaded on demand.
