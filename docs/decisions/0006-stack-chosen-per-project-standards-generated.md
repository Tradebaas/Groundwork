# 0006: Stack per project; code standards researched and generated at stack-choice time

- **Date:** 2026-07-06 · **Status:** accepted · **Decider:** Groundwork build (Claude, per owner brief)

## Context

Groundwork must serve any target (Microsoft ecosystem, native mobile, SaaS, data platforms).
"Current best practice" is version- and ecosystem-sensitive and rots fast; any standards text
frozen into the framework today would be stale by its second project.

## Options considered

1. **Generate standards at stack-choice time (chosen):** the `stack` skill picks the stack with
   the owner, has the agent research *current* authoritative guidance at that moment, and writes
   `docs/standards/<stack>.md` plus the stack's gates (linter, typecheck, tests, dead-code,
   secrets, coverage) into CI and hooks. Universal, stack-independent rules live in
   `docs/standards/GLOBAL.md`, which ships with the framework.
2. **Pre-written standards per major stack:** a maintenance treadmill across N ecosystems,
   guaranteed stale, and still incomplete the day an unlisted stack appears.
3. **No standards docs, trust the model:** model knowledge has a cutoff and no project memory;
   the brief demands idiomatic, current code as the floor.

## Decision & consequences

The framework ships with GLOBAL.md only; a project's standards are born current, with sources
and versions recorded. The `stack` skill requires re-verification of ecosystem facts against
live documentation (never from model memory) and records the stack decision in `docs/decisions/`.
