# 0004 — Right-sized specs: three tiers instead of a mandatory pipeline

- **Date:** 2026-07-06 · **Status:** accepted · **Decider:** Groundwork build (Claude, per owner brief)

## Context

Spec-driven development frameworks (GitHub Spec Kit, OpenSpec, Kiro, BMAD) all fight scope drift
with upfront specs — and all draw the same 2026 criticism: ceremony/scale mismatch (a bugfix
becoming 4 user stories with 16 acceptance criteria), review burden, and spec-drift once code
moves on. Practitioner consensus converged on right-sizing: match the process weight to the
change, keep the spec next to the code, and reconcile docs with reality when the change ships.

## Options considered

1. **Three tiers, owner-gated, with a converge step (chosen)** — S: build directly (commit +
   tests are the record); M: one spec.md with acceptance criteria; L: spec.md + plan.md for
   multi-session work. Owner sign-off before building M/L. On delivery: reconcile stale docs,
   denylist retired wording, archive the spec.
2. **Adopt Spec Kit / OpenSpec wholesale** — adds a CLI and Python/Node toolchain dependency,
   per-tool integration churn, and a fixed ceremony the criticism is aimed at. The valuable ideas
   (constitution, converge, deltas) are absorbable without the machinery.
3. **No spec method** — drift is guaranteed with agents; scope discipline is a hard requirement
   of the brief.

## Decision & consequences

The `spec` skill owns tier selection and the honesty rule that tier choice is argued, not
defaulted upward. Specs trace to numbered BRIEF scope items. Drift is attacked from both ends:
specs written before building, denylist + manifest checks catching stale docs after.
