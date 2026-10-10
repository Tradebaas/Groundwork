---
name: code-review
description: Review the diff of substantial work after `verify` and before the commit: a gate-weakening scan, then fresh-eyes axes for standards and for spec plus commit-message fidelity, plus a security axis on auth, payments, PII, external input, crypto or uploads, each reported by severity. Use before committing anything bigger than a trivial fix.
---

# code-review: fresh eyes on the diff, one axis at a time

Runs before substantial work is committed, after `verify` has passed. Trivial changes (a typo,
a one-line fix with an obvious cause) skip it; everything with a spec gets it. The subject is
the actual diff about to be committed, not the intention behind it.

## Ground rules

- **Independent axes, fresh eyes each.** Two axes always run (A and B); a third (C) runs only
  when the diff is security-sensitive, per its own trigger below. Each axis that runs goes to its
  own agent with only the inputs named below: `vibe:review-standards` for A, `vibe:review-fidelity`
  for B, `vibe:review-security` for C. They run on Sonnet and return findings, so the build thread
  never reads the diff a second time. Where the agents are not available, run the axes as
  sequential passes, re-reading the diff from scratch each time and carrying no conclusions
  across.
- **Skip what tooling already enforces.** Formatting, lint, secrets and whatever else this
  project's gates run (its hooks, its CI, `checks/check.mjs` where Groundwork is in place) are the
  machines' job. A finding a gate would have caught means the gates were not run; stop and run them.
- **Report by severity per axis: blocker, major, minor.** The axes are never merged into
  one ranked list. Each finding names the file and location, states the problem, and proposes
  the smallest fix.

## First: did this diff weaken a gate?

The axes below hand formatting, denylist, secrets and the rest of `checks/check.mjs` to the
machines. That hand-off holds only while the machines still run at full strength, so this scan
comes first on every review. It is mechanical and needs no fresh eyes: one pass over the diff,
looking for the moves that lower the bar instead of clearing it.

- **A test stopped running:** deleted, renamed out of what the runner collects, marked skipped or
  pending (`.skip`, `xit`, `@pytest.mark.skip`, a commented-out body), or parked by an `.only`
  that takes its neighbors with it.
- **A test stopped asserting:** the name survives, but the assertion is gone, softened to a
  truthiness check, or rewritten to expect whatever the code now produces.
- **A threshold moved the easy way:** a coverage minimum, a line or size budget, a lint severity
  dropped to warning, an allowed-failures count raised.
- **A check switched off:** a rule disabled in config, a strictness flag flipped, an entry
  dropped from `checks/config.json`, a CI step removed or made non-blocking, a hook shortened,
  `--no-verify` anywhere.
- **A suppression appeared at the call site:** `eslint-disable`, `@ts-ignore`, `# noqa`,
  `# type: ignore` and their kin.

A hit is a blocker unless the diff makes the case in the open, in the same commit: the behavior
under test genuinely went away with the code, or the gate itself was wrong and the message or
spec says why and what replaced it. Silence is the tell. AGENTS.md forbids bypassing a gate;
this is the one moment when the bypass is still visible as a diff instead of as a habit.

## Axis A: standards conformance

Inputs: the diff, `docs/standards/GLOBAL.md`, and the stack file in `docs/standards/`; a project
without those files is judged against its stack's own idiom as the official documentation states
it. Question: does this code meet the written standards, and is it free of the classic smells?

The thirteen smells to check by name, and how seven of them go quiet on a platform stack, are in
`references/smells.md`; read it when this axis runs, not before.

## Axis B: spec and message fidelity

Inputs: the diff, the spec (tier S: the request as recorded), and the commit message about to be
used. Question: does the diff do exactly what the spec says, no less and no more, and does the
message describe the diff that is actually there?

- **Missing behavior:** an acceptance criterion or stated requirement the diff does not
  satisfy. Quote the spec line in the finding.
- **Scope creep:** behavior in the diff that no spec line asks for. Quote the nearest spec
  line it exceeds, or state that no line covers it. Creep goes to INTAKE.md, not into the
  commit.
- **Message drift:** the message and the diff describe different work. The type is wrong for
  what changed (`fix:` on new behavior, `docs:` on a code change), the subject names the
  intention rather than what a reader will find in the diff, a second change rides along
  unmentioned, or the `Traces-to:` trailer names an item this diff does not serve. A welcome
  extra is still undeclared work: name it in the message or lift it out of the commit.
- Every finding here quotes its source: the spec line for behavior, and for message drift the
  subject plus the hunk it fails to cover. A fidelity finding with nothing quoted is an opinion
  and belongs on axis A or nowhere.

## Axis C: security (conditional)

Runs only when the diff touches at least one of these six surfaces. When it touches none, record
"axis C: not triggered" and skip it - this is what keeps the axis off the cost of every review
(decision 0015): a login form pays for it, a copy change does not.

- **auth**: authentication, sessions, tokens, identity, or access-control decisions.
- **payments**: money movement, billing, orders, anything with a price.
- **PII**: personal data read, stored, exported, or logged (a GDPR/AVG surface).
- **external input**: any value crossing a trust boundary - request bodies and params, webhook
  and third-party payloads, file contents, message-queue data.
- **crypto**: encryption, hashing, signing, token or key generation, security-relevant randomness.
- **uploads**: files received from a client (a high-risk case of external input, named on its
  own because it breaks in its own ways).

Inputs: the diff, the security floor in `docs/standards/GLOBAL.md`, and the stack file. The
secrets scan and the dependency audit already run as gates; this axis is the design judgment they
cannot make. Question: on the surfaces the diff touches, does it hold the floor and avoid the
classic breaks? The seven breaks to check by name, drawn from the OWASP Top 10 classes plus
GDPR/AVG data minimization, are in `references/security-breaks.md`; read it when this axis runs.

Report at blocker, major, or minor like the other axes, each finding naming the surface, the
concrete break, and the smallest fix. A security finding sits on the never-simplify-away floor
(`docs/standards/GLOBAL.md`): a blocker here is fixed, not accepted away.

## After the review

Blockers are fixed before the commit; the fix goes back through `verify`. Majors are fixed, or
put to the owner one at a time as a consequence for a user (what breaks for whom, and what
accepting it costs), with your recommended answer; a major the owner accepts is recorded where
it lands, never left in the chat. Minors are fixed cheaply now or recorded (INTAKE.md for
ideas, DEBT.md with a `defer:` marker for accepted debt). Refactoring findings are applied
here, in the review stage, as their own change: never folded into the implementing diff
(see `docs/standards/GLOBAL.md`). Report the outcome per axis in a few lines, then proceed
to the commit.
