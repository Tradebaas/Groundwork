# 0013: Scope enforcement stays judgment, with two mechanical anchors

- **Date:** 2026-07-20 · **Status:** accepted · **Decider:** owner (scope session, 2026-07-20)

## Context

An audit of "how does this project guarantee we stay in scope?" found that almost every part of
the answer was instruction to the model, not mechanism. Of eighteen deterministic checks, only
`spec-traces` and `tickets` touched scope, and both verified form only: that a `Traces to:` line
was filled in, never that it pointed at anything real. `Traces to: SC-999` passed the gate. The
one automatic channel to the owner, the Stop hook running `progress.mjs --line`, dropped the
warnings that `derive()` had already computed, so a session that built unrequested work while
the counts stayed flat produced complete silence.

Four gaps came out of that audit. This decision records what was done with each, because the
ones that were rejected matter more than the one that was built.

## Options considered

1. **Validate SC-ids against BRIEF.md (chosen, built).** The logic already existed in
   `progress.mjs derive()` as a non-blocking warning. Promoting it to a gate in `check.mjs`
   costs a helper and two call sites, and it only fires when a line names an SC-id that the
   brief does not define. Specs may still trace to an explicit request instead, per AGENTS.md,
   so a line naming no id stays clean. A project whose brief has no scope yet is skipped: a
   fresh copy cannot be blocked for not having run `scope`.
2. **A check that reads the diff (rejected).** The real hole, and the one mechanism cannot fill:
   "was this change requested?" is not computable. The nearest deterministic proxy, flagging new
   files that no live spec mentions, misfires on tier S work (which by design has no spec), on
   tests, on docs and on refactors. A gate that cries wolf gets switched off, or worse, teaches
   the owner that red gates are noise. `code-review` axis B and the owner reading the diff cover
   this with judgment, which is the right instrument.
3. **A `Verified by:` gate on specs at `done` (deferred, not rejected).** Item state comes from
   spec status, so a model writing `Status: done` makes the overview report the scope item done
   with no evidence. Requiring a done spec to name its verification artifact has real teeth
   against that, but it touches the spec template and every existing spec. Queued in intake
   rather than folded into this change.
4. **Make `scope-guard` leave a mechanical trace (rejected).** A marker the agent writes itself
   proves nothing about the thinking the same agent may have skipped. It would convert an honest
   judgment step into a checkbox and buy false confidence. This is precisely why it is a skill.

## Decision & consequences

Scope enforcement in Groundwork is judgment first, anchored by two mechanical facts: a trace
must exist (`spec-traces`, `tickets`), and any SC-id it names must exist in the brief. Everything
beyond that is skills and the owner's eyes, deliberately.

Alongside the gate, the progress report's warnings were rewritten as structured facts rendered
at display time, so they follow the project language and stop naming SC-ids and spec statuses at
the one reader who cannot use them. `progress.test.mjs` already asserted that the report carries
no internal identifiers; the warnings path had been escaping that promise.

Cost to watch: the new gate blocks a spec written ahead of the brief it will trace to. That is
intended, it forces `scope` to run first, but it will read as friction the first time it bites
mid-build. If that turns out to be common in practice rather than rare, the answer is to fix the
workflow, not to soften the gate.
