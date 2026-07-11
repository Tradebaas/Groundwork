# 0011: A ticket layer makes multi-session work trackable; right-sizing stays

- **Date:** 2026-07-10 · **Status:** accepted · **Decider:** owner (spec 001 sign-off, 2026-07-10)

## Context

Decision 0004 chose right-sized specs (S/M/L) over a mandatory pipeline. It left a gap for
tier L: work spanning several agent sessions survived only as prose in STATE.md, so build
order, blockers and progress had to be re-derived each session. An audit against current
practice (Matt Pocock's skills v1.1, Beads' dependency-tracked issue graph, AWS Kiro's task
waves, Anthropic's guidance on session-sized units of work) found the same fix everywhere:
decompose big changes into persistent, dependency-aware slices sized to one fresh session.

## Options considered

1. **Markdown tickets inside the spec folder (chosen):** `tickets/NN-<slug>.md`, one vertical
   slice per file with Blocked-by, Status and acceptance checks; the frontier rule (lowest
   ticket with all blockers done) replaces a separate planner. Zero dependencies, checked by
   `checks/check.mjs`, portable to any tool.
2. **Database-backed tracker (Beads-style) or issue sync (GitHub/Linear):** adds a runtime or
   service dependency for what a folder of markdown already does at this scale.
3. **Keep prose-only STATE.md:** re-deriving state each session is exactly the token and
   drift cost spec 001 set out to remove.

## Decision & consequences

Tickets refine 0004, they do not reverse it: tier S and M stay as they were, and the ticket
step is opt-in for tier L (and multi-session M). Decomposition becomes trackable across
sessions: one ticket per fresh session, STATE.md points at the frontier, the `tickets` check
gates status and blocker integrity. Cost to watch: ticket files are more governance text to
keep honest; the check owns the mechanical part, `spec` and `scope-guard` own the judgment.

One exception, owned here: specs for Groundwork's own development (like spec 001, which
introduced this layer) are deleted on completion, never archived into the tracked repo. Git
history plus the decision record are their durable record, and `begin` deletes any in-flight
ones from a fresh copy. The tracked `docs/specs/archive/` carries only a fictional worked
example of the format; projects built on Groundwork archive their shipped specs there
normally, per the `spec` skill.
