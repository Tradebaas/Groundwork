---
name: code-review
description: Review the diff of substantial work before it is committed, after `verify` has passed. Two always-on review axes with fresh eyes (standards conformance and spec fidelity) plus a security axis that fires only on auth, payments, PII, external input, crypto or uploads, each reported by severity and never merged into one list. Use before committing any change bigger than a trivial fix.
---

# code-review: fresh eyes on the diff, one axis at a time

Runs before substantial work is committed, after `verify` has passed. Trivial changes (a typo,
a one-line fix with an obvious cause) skip it; everything with a spec gets it. The subject is
the actual diff about to be committed, not the intention behind it.

## Ground rules

- **Independent axes, fresh eyes each.** Two axes always run (A and B); a third (C) runs only
  when the diff is security-sensitive, per its own trigger below. If your tool has subagents, give
  each axis that runs its own subagent with only the inputs named below. Without subagents, run
  them as sequential passes, re-reading the diff from scratch each time and carrying no
  conclusions across.
- **Skip what tooling already enforces.** Formatting, line caps, denylist, secrets and the rest
  of `checks/check.mjs` plus the stack gates are the machines' job. A finding a gate would have
  caught means the gates were not run; stop and run them.
- **Report by severity per axis: blocker, major, minor.** The axes are never merged into
  one ranked list. Each finding names the file and location, states the problem, and proposes
  the smallest fix.

## Axis A: standards conformance

Inputs: the diff, `docs/standards/GLOBAL.md`, and the stack file in `docs/standards/`.
Question: does this code meet the written standards, and is it free of the classic smells?

Baseline of twelve smells to check by name, beyond whatever the standards say:

1. Mysterious name: the name needs the implementation to be understood.
2. Duplicated code: the same knowledge written twice.
3. Feature envy: a function that mostly manipulates another module's data.
4. Data clumps: the same group of values traveling together unbundled.
5. Primitive obsession: domain concepts passed around as bare strings and numbers.
6. Repeated switches: the same case analysis dispatched in several places.
7. Shotgun surgery: one conceptual change forcing edits in many files.
8. Divergent change: one file edited for many unrelated reasons.
9. Speculative generality: hooks and options for a future nobody scheduled.
10. Message chains: reaching through object after object to get one value.
11. Middle man: a layer that only forwards to the next layer.
12. Refused bequest: inheriting an interface and ignoring most of it.

## Axis B: spec fidelity

Inputs: the diff and the spec (tier S: the request as recorded). Question: does the diff do
exactly what the spec says, no less and no more?

- **Missing behavior:** an acceptance criterion or stated requirement the diff does not
  satisfy. Quote the spec line in the finding.
- **Scope creep:** behavior in the diff that no spec line asks for. Quote the nearest spec
  line it exceeds, or state that no line covers it. Creep goes to INTAKE.md, not into the
  commit.
- Every finding on this axis quotes the spec; a fidelity finding without a spec quote is an
  opinion and belongs on axis A or nowhere.

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
classic breaks? Seven breaks to check by name, drawn from the OWASP Top 10 classes plus GDPR/AVG
data minimization (grounds: NIST SSDF PW.7, ISO/IEC 27001:2022 A.8.28):

1. Missing authorization: an action or query that confirms the caller is logged in but not that
   this caller may touch this specific record.
2. Unsanitized sink: external input reaching a query, shell command, path, template, or redirect
   without being parameterized, encoded, or allow-listed for that sink.
3. Fail-open check: an auth or validation branch whose failure path falls through to allow
   instead of deny, the floor's "fail closed" read backwards.
4. Sensitive data leaking sideways: a secret, token, or PII field flowing into a log, a URL, an
   error message, or a client response that should not carry it.
5. Weak or hand-rolled crypto: a home-grown cipher or token scheme, a predictable random source
   for a security value, an unsalted or fast password hash, a secret compared non-constant-time.
6. Trusting the client's file: an upload accepted on its client-supplied name or type, written to
   an executable or web-served path, or stored with no size or type bound.
7. Collecting more than needed: new personal data gathered or kept past the stated purpose
   (GDPR/AVG data minimization).

Report at blocker, major, or minor like the other axes, each finding naming the surface, the
concrete break, and the smallest fix. A security finding sits on the never-simplify-away floor
(AGENTS.md): a blocker here is fixed, not accepted away.

## After the review

Blockers are fixed before the commit; the fix goes back through `verify`. Majors are fixed or
explicitly accepted by the owner. Minors are fixed cheaply now or recorded (INTAKE.md for
ideas, DEBT.md with a `defer:` marker for accepted debt). Refactoring findings are applied
here, in the review stage, as their own change: never folded into the implementing diff
(see `docs/standards/GLOBAL.md`). Report the outcome per axis in a few lines, then proceed
to `scope-guard` and the commit. ⚓
