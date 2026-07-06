---
name: verify
description: Prove a change actually works before it counts as done. Use after building any non-trivial change, before deliver, and whenever claiming something works. Exercises real behavior end-to-end — green tools alone are not verification.
---

# verify — evidence, not confidence

A change is verified when its observable behavior matches its acceptance criteria, and you have
seen that behavior yourself. "Should work", "compiles", "tests pass" are not that.

## 1. The floor: every gate green

Run the full chain and paste real results, not summaries of results:
`node checks/check.mjs`, then the stack gates (typecheck, lint, tests, build — commands are in
`docs/standards/<stack>.md`). Red gate → stop, fix, rerun. Never weaken a gate to pass it.

## 2. The point: exercise the change

- Take the spec's acceptance criteria (tier S: the request itself) and walk them **end to end**
  in the closest thing to reality available: run the app, call the endpoint, click the flow,
  render the document. Per criterion: what you did → what you observed.
- Probe the edges the criteria imply: empty input, wrong input, unauthorized user, the second
  run (idempotency), the slow path. The first bug is usually one step off the happy path.
- UI change → also run `design-guard` on what appeared on screen.
- Bug fix → reproduce the bug first on the old behavior (or its regression test), then show it
  gone. A fix you never saw fail is a guess.

## 3. What you cannot verify

Some things this environment can't exercise (production data, real payment, app-store review).
Name them explicitly: "verified: A, B; not verifiable here: C — needs <what> — tracked in
STATE.md". Unverifiable-and-silent is how "works on my machine" ships.

## 4. Converge and record

- Reconcile docs the verified change made stale; retired wording → denylist
  (`checks/config.json`). Spec status → `done`, folder → archive (see `spec`).
- STATE.md: gates line updated with the evidence summary ("checks green, tests 61/61, criteria
  4/4 exercised"), Now ▶ next step.

Report format — per criterion one line: `✓/✗ <criterion> — <what was observed>`, then the
gates line, then anything unverifiable. No prose padding. ⚓
