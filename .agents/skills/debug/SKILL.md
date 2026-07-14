---
name: debug
description: Systematic debugging when a failure's cause is unknown: reproduce first, isolate, fix the root cause once, prove it with a regression test. Use when a bug, crash, failing test or wrong output has no obvious cause, when a fix attempt did not work, or before claiming a stubborn bug fixed. For production incidents: stabilize first per `maintain`, then run this loop.
---

# debug: from symptom to proven root cause

A fix you never saw fail is a guess (`verify`). This loop turns an unknown failure into a
proven fix at the lowest cost. Production incident? Stabilize first per `maintain` (rollback
beats diagnosis under fire), then run this loop calmly.

## The loop

1. **Read the actual error.** The message, the stack, the failing line. Capture expected vs
   actual behavior verbatim before touching anything: the error usually says more than the
   first theory about it.
2. **Reproduce before fixing.** A failing automated test at the nearest seam is the goal; a
   minimal script is the fallback. Shrink the repro until removing anything makes the bug
   disappear. What you cannot reproduce you cannot fix, only disturb.
3. **Check what changed.** Most bugs live in the newest diff: recent commits, dependency
   bumps, config or environment changes. `git bisect` beats rereading the whole system.
4. **Hypothesize, test one change at a time.** Rank hypotheses by likelihood and cost of
   testing; each experiment changes exactly one thing and names its predicted outcome before
   running. Two simultaneous changes make the result unreadable. Expect horses, not zebras:
   the common cause outranks the exotic one until evidence says otherwise.
5. **Fix the root cause, once.** The fix goes where the cause lives, not where the symptom
   showed (decision ladder: understand, then fix the cause once). A symptom patch that leaves
   the cause in place is not progress, and per debug hygiene a change that demonstrably fixed
   nothing gets reverted, not left in.
6. **Prove and clean.** The repro test passes and stays as the regression test; every debug
   shim (prints, sleeps, forced branches, commented-out calls) is removed; the full gate
   chain runs green.

## Record

A non-obvious cause is lesson material: one gotcha line in STATE.md's log, so the next
session skips the dead end. For production incidents, the ten-line post-mortem belongs to
`maintain`. ⚓
