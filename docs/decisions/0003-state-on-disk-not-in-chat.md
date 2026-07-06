# 0003 — Project state lives on disk: STATE.md handoff, decisions, ledgers

- **Date:** 2026-07-06 · **Status:** accepted · **Decider:** Groundwork build (Claude, per owner brief)

## Context

Context windows degrade measurably as they fill (Chroma "context rot", 18 models), sessions end,
tools differ. Anything an agent must know next session has to be re-derivable for free — which
means written down, in a known place, small enough to read cheaply.

## Options considered

1. **Structured state files with a handoff block + rotation (chosen)** — one live file
   (`docs/state/STATE.md`, ≤150 lines, oldest log entries rotate to `state/log/`), plus owning
   files per fact type: decisions (`docs/decisions/`), debt (`DEBT.md` + `defer:` site markers),
   untriaged input (`INTAKE.md`).
2. **One big status document** — the studied production system's 49KB status file proves this
   self-defeats: the anti-re-derivation tool becomes the token sink.
3. **Tool-native memory (Claude auto-memory, Windsurf memories, …)** — per-vendor, not in the
   repo, not transferable to the next person or tool. Unacceptable as the system of record.

## Decision & consequences

Session protocol in AGENTS.md: read the handoff block first, update state last, one fact one
place, prefer pointers over copies. Deliberate simplifications are marked at the site
(`defer: … ceiling: … upgrade-when: …`) so they're grep-recoverable at zero standing cost. The
check script enforces the size budget and the handoff block's presence.
