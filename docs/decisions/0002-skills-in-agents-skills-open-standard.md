# 0002 — Skill library in `.agents/skills/`, Agent Skills open standard

- **Date:** 2026-07-06 · **Status:** accepted · **Decider:** Groundwork build (Claude, per owner brief)

## Context

Expert methods (scoping, spec, design, verify, deliver, …) must load on demand, not sit in every
context window. Anthropic's Agent Skills format became an open standard (agentskills.io, Dec
2025) adopted by ~40 tools; `.agents/skills/` emerged as the vendor-neutral project location read
by Codex, Cursor, Copilot, Gemini CLI, Windsurf and Amp. Claude Code still reads `.claude/skills/`.

## Options considered

1. **`.agents/skills/` + `.claude/skills` symlink (chosen)** — one physical library, standard
   format, native discovery in effectively every tool. Symlink needs Windows Developer Mode;
   documented fallback: point the tool at `.agents/skills/` directly.
2. **`.claude/skills/` as the physical home** — works in many tools via compat reads, but not in
   Codex/Gemini, and names the neutral thing after one vendor.
3. **Custom `docs/skills/` format** — invisible to every tool's native skill discovery; loses
   progressive disclosure (metadata always loaded, body on trigger) for nothing.

## Decision & consequences

A curated library of 13 skills (deliberately small — curation beats accumulation; the studied
production system carries 557 bulk-imported skills of which 3 are used). Each skill: standard
frontmatter (`name` = directory name, trigger-rich `description`), body ≤500 lines, references
one level deep. `checks/check.mjs` validates frontmatter, budgets, and the symlink. New skills
only via the `skill-author` method.
