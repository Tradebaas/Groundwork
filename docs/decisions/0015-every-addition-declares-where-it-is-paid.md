# 0015: Every addition declares where it is paid

- **Date:** 2026-07-22
- **Status:** accepted
- **Decider:** owner

## Context

Groundwork's promise is enterprise-grade delivery, and the naive way to reach it is to keep adding
rules: another line in AGENTS.md, another always-on discipline, another gate. That path drowns the
framework in its own idioms. The always-on surface is the most expensive thing a framework owns: a
line in AGENTS.md is re-read every session, on every model, in every product built on Groundwork.
`agent-file-cap` already caps that surface mechanically at 200 lines, but nothing names why the cap
matters or extends the reasoning to the cheaper tiers.

The insight that settled it: enterprise-grade is bought mostly with artifacts, not rules. A client
assessment wants to see a `SECURITY.md`, an SBOM, an audit trail exist. It does not care whether
you carry a rule to produce them. An artifact costs nothing until someone reads it, and only the
one person who needs it reads it. A rule costs every session.

## The cost gradient

Every addition is paid somewhere. Cheapest to most expensive standing cost:

| Tier | Addition | Paid |
|---|---|---|
| 1 | Artifact (SECURITY.md, SBOM, decision record, audit trail) | only when read, by the one who needs it |
| 2 | Template in `docs/` | never, until filled |
| 3 | On-demand skill | tokens, only in the session whose trigger fires |
| 4 | Check / gate | CI seconds, outside the model's context |
| 5 | Per-action rule (a line inside a skill) | every time that action runs |
| 6 | AGENTS.md line | every session, every model, every product built on Groundwork |

## Decision

Every addition to Groundwork declares where it is paid, and clears the bar for that tier:

- Tiers 1 to 3 (artifact, template, on-demand skill): near-zero standing cost, wave through. Reach
  here first.
- Tier 4 (a gate): not reflexive. Ask "what breaks without it?" An artifact's existence is usually
  its own evidence, so a warning, or nothing, beats a gate. A gate earns its place only when its
  absence lets something bad ship silently.
- Tiers 5 to 6 (per-action rule, AGENTS.md line): very high bar. The line must govern something
  that applies to essentially every relevant session and cannot be caught later at a cheaper tier.

Corollary: when an enterprise requirement lands, produce the artifact, do not carry a rule to
produce it. Climb the tiers only when forced.

## Consequences

- This principle is design-time judgment, not per-session work, so by its own test it does not
  belong in AGENTS.md. It lives here (tier 1) and is referenced from the two skills where additions
  are actually decided: `skill-author` (whether to add a skill) and `scope` (how an in-scope INTAKE
  item lands).
- `agent-file-cap` (the 200-line ceiling) stays the mechanical backstop for the one gap this
  leaves: a maintainer editing AGENTS.md with no skill in the loop. Judgment layer above mechanical
  floor, the same shape as `critical-thinking` above `scope-guard`.
- The bias is now explicit: growth defaults to artifacts and on-demand skills. Adding to the
  always-on surface is the exception that must argue for itself.
