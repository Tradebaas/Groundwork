---
name: stack
description: Choose the tech stack and make the project idiomatic for it. Use when the target platform/stack must be decided, when generating docs/standards/<stack>.md, or when wiring stack-specific quality gates into CI and hooks. Requires live research. Never stack facts from model memory.
---

# stack: choose deliberately, then be born current

## 1. Decide the stack: options on merit

Derive candidates from BRIEF.md (target, users, constraints, integrations, team). Present 2-3
genuinely different options with honest trade-offs (fit, ecosystem maturity, hiring/handover,
cost, compliance implications, e.g. EU data residency of managed services). Recommend one;
the owner confirms. Record as a decision record with the options and the reason.

**Verify before recommending.** Versions, support status, pricing, EU-residency: check current
authoritative sources (official docs, release pages). Model memory is a rumor with a cutoff.

## 2. Generate `docs/standards/<stack>.md`

Research what a top engineer in *this* ecosystem does **today**, from primary sources, and write
it down with versions, dates, and source links. Cover at least:

- Project layout for this stack (senior-readable, conventional, not invented).
- Language/framework idiom: the current blessed patterns, and the deprecated ones to refuse.
- Tooling: formatter, linter, type checking, test framework, dead-code detection: exact tools
  and versions, with config that enforces strictness (strict typecheck catches most AI slips).
- Dependency policy for this ecosystem (lockfiles, audit tooling, update cadence).
- The stack's sharp edges: the 5-10 mistakes agents actually make here.

`GLOBAL.md` still applies; the stack file only adds or, with stated reason, overrides.

## 3. Scaffold and wire the gates

- Scaffold the conventional project structure (official generator where one exists).
- Wire the gate chain so it runs the same everywhere:
  - **pre-commit** (`checks/hooks/pre-commit`, versioned): append fast checks (format, lint
    staged) after the Groundwork line. Cheap first.
  - **CI** (`.github/workflows/ci.yml`, or this host's equivalent): the full authority:
    checks, typecheck, lint, tests, build, dependency audit, secret scan. Replace the
    placeholder stage; CI must fail on any gate.
- Add this ecosystem's file extensions to `extraTextExtensions`/`extraCodeExtensions` in
  `checks/config.json` so the denylist/secrets/zombie checks cover the product code.
- Add the chosen tools' commands to the stack standards file so any agent can run them.
- Prove the gates work: introduce a deliberate violation, watch the gate fail, revert.
  An untested gate is false confidence.

## 4. Record

Decision record written; BRIEF.md target/stack line filled; STATE.md updated (phase, gates,
next step, usually `architect`). Retired assumptions (old candidate stacks in docs) → denylist. ⚓
