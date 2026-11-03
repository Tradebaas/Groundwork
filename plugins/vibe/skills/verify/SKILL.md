---
name: verify
description: Prove a change actually works before it counts as done. Use after building any non-trivial change, before deliver, and whenever claiming something works. Predicts per acceptance criterion, runs the change end to end through Claude Code's bundled /verify, names what could not be verified, and records the evidence. Green tools alone are not verification.
---

# verify: evidence, not confidence

A change is verified when its observable behavior matches its acceptance criteria, and you have
seen that behavior yourself. "Should work", "compiles", "tests pass" are not that.

The running is Claude Code's job: the bundled `/verify` (the `verify` skill that ships with Claude
Code, reached as `Skill verify`, never `vibe:verify`) builds and launches the app from the
project's recorded recipe or infers one, drives the change in the running app and refuses to fall
back to tests or type checks. This skill is what sits around that run: the gates before it, the
predictions it is held to, the edges it must probe, what it could not reach, and where the
evidence lands. Never reimplement the launch here; when the bundled skill cannot launch the
project, let it record the recipe it worked out (`.claude/skills/verify/SKILL.md` at the repo root;
Claude Code 2.1.286 and later also runs a project skill of that name before each commit, by its
own commit instructions) rather than scripting a launch in the conversation.

## 1. The floor: every gate green

Run the full chain and paste real results, not summaries of results:
`node checks/check.mjs` where the project has it, then the stack gates (typecheck, lint, tests,
build; commands are in `docs/standards/<stack>.md`). Red gate: stop, fix, rerun. Never weaken a
gate to pass it.

## 2. The point: exercise the change

- **Predict first.** Take the spec's acceptance criteria (tier S: the request itself) and write,
  per criterion, what you expect to see before anything runs. A pass you did not predict proves
  only that something happened; a prediction that turns out wrong is the finding, and the real
  behavior gets explained and traced to a rule before the criterion counts as met.
- **Run it through the bundled `/verify`**, handing it the criteria and the predictions. It
  exercises the change in the closest thing to reality available: the running app, the endpoint,
  the clicked flow. Where there is no app to launch (a library, a document, a check script),
  exercise the change the nearest way: call the function on real input, render the document, run
  the command. Per criterion: predicted, done, observed.
- **Probe the edges** the criteria imply: empty input, wrong input, unauthorized user, the second
  run (idempotency), the slow path. The first bug is usually one step off the happy path.
- **Keep the long things at arm's length.** A test run, a build or a log enters the context as
  its counts and its failures (tail, grep, or a subagent that reads it and returns two lines), so
  the transcript carries the conclusion and not the log; the full output stays on disk for the
  report.
- **Real dependency, or the double the spec names.** A path that passed because a fallback
  returned canned data (a sample response, a stub, a default) is a failure, and the fallback is a
  finding: it carries a `defer:` marker with its trigger, or it goes.
- **User-facing output: judge what rendered, never the code.** A screenshot of the running
  screen, the generated document, a real run of the command, judged per `design` section 5
  (accessibility floor, tokens, the medium's constraints, layout on real content, voice). This is
  the `renders` answer of the stack's floor table.
- **Bug fix: reproduce first** on the old behavior (or its regression test), then show it gone.
  A fix you never saw fail is a guess. Cause unknown, or a fix attempt already failed? Run the
  `debug` skill's loop before trying again.

## 3. What you cannot verify

Some things this environment can't exercise (production data, real payment, app-store review).
Name them explicitly: "verified: A, B; not verifiable here: C, needs <what>, tracked in
STATE.md". Unverifiable-and-silent is how "works on my machine" ships.

## 4. Converge and record

- Substantial change (per `code-review`'s own bar)? Hand the diff to `code-review` now, before
  any status flips: findings must land while they can still change the work. Blocker fixes come
  back through sections 1 and 2. Trivial tier: record "code-review: skipped (trivial)" in
  STATE.md instead.
- Reconcile docs the verified change made stale; retired wording goes to the denylist
  (`checks/config.json`). Spec: `Verified by:` names this run's artifact (the suite and its
  count, the walk, the log entry), status `done`, folder to archive (see `spec`).
- STATE.md, where the project has it: gates line updated with the evidence summary ("checks
  green, tests 61/61, criteria 4/4 exercised"), `Now ▶` the next step.

Report format, per criterion one line: `✓/✗ <criterion>: <what was observed>`, then the
gates line, then anything unverifiable. No prose padding.
