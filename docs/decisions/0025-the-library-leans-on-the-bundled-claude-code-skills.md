# 0025: The library leans on Claude Code's bundled skills, keeps its own judgment, and no project link hides them

- **Date:** 2026-11-03 · **Status:** accepted, supersedes the `.claude/skills` half of 0002 ·
  **Decider:** owner (Remon) + agent

## Context

Claude Code ships its own `/verify` (builds and runs the app and drives the change in it, recording
the launch recipe as a project skill), `/code-review` (hunts correctness bugs with verified
findings and effort levels), `/security-review`, `/run` and `/debug` (its own session log). The
library's `verify`, `code-review`, `debug` and `handoff` were written before those existed. Laid
side by side on 2026-11-03: `code-review` and `debug` do work nothing bundled does (the
gate-weakening scan, standards, spec and message fidelity, the floor; reproduce-first debugging of
the product rather than of Claude Code), `verify` overlapped on the running and was unique only in
the predictions, the unverifiable list and the record, and `handoff` restated a rule the owner's
global CLAUDE.md and AGENTS.md already carry. Meanwhile the `.claude/skills` symlink of decision
0002 made every library skill a project skill in a governed copy, and Claude Code lets a project
skill named `verify` or `code-review` replace the bundled one: on seven of the owner's projects
`/code-review` ran the library's fidelity review and never the bug hunt. The owner's direction:
grow with what Anthropic builds and recommends instead of maintaining a parallel copy of it.

## Options considered

1. **Lean on the bundled skills, keep the judgment, drop the link (chosen):** `verify` becomes the
   frame around the bundled `/verify` (gates, predictions, edges, the unverifiable, the record);
   `code-review` runs the bundled `/code-review` first and keeps the scan and the axes, with
   `/security-review` ahead of axis C; `debug` stays and points at `/run` for the repro;
   `handoff` goes, its block shape moves into the STATE.md template and AGENTS.md's session rule,
   its transfer audit into `deliver`. The `.claude/skills` link goes from the framework, the gate
   that demanded it now rejects it, and `.agents/skills` stays for tools that read the standard.
2. **Remove all four and send everyone to the bundled commands:** loses the gate scan, the spec
   and message fidelity and the floor, which no bundled skill checks, and the four are named 22
   times across the library.
3. **Keep all four as they were:** two verifications and two reviews with the same names, the
   bundled ones unreachable on every governed copy, and a library that has to re-learn what
   Anthropic ships next.

## Decision & consequences

- The plugin has thirteen skills. `verify` and `code-review` name the bundled skill they run and
  how to reach it (`Skill verify`, never `vibe:verify`), so a copy without the link resolves it.
- A project with a `.claude/skills` *directory* of its own is fine and expected: the bundled
  `/verify` records its launch recipe there, and Claude Code runs a project `verify` before every
  commit. Only a *link* is rejected, at the top or as one linked skill inside the directory
  (`claude-skills-link`, which replaces `skills-symlink`, and the drill's copy step).
  `skipSymlinkCheck` has nothing left to switch off and is rejected as stale config.
- DEBT-005 is paid by this. Copies taken before this date carry the link and an older gate that
  demands it: the owner removes the link and the old `.agents/skills` snapshot by hand, per copy,
  as decision 0017 already says copies take improvements.
- Watch for: a bundled skill changing shape under the library (the frame names what it relies on,
  the running and the bug hunt, not how), and a project where `Skill verify` resolves to a stale
  recorded recipe rather than the bundled skill; the recipe is the project's to refresh.
