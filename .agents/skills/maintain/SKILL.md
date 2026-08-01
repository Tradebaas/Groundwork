---
name: maintain
description: Keep a shipped product healthy: monitoring, updates, incidents, debt, periodic audits, retirement. Use after first production release, on a maintenance session, when dependencies need updating, when something broke in production, to harvest defer: markers into the debt ledger, or when a product, environment or integration is being retired and its data and access must actually go.
---

# maintain: the product is now a running system

Maintenance sessions still follow the session protocol: STATE.md first, one task, state updated.
Maintenance is scope-bound too; "while maintaining" is not a license to rebuild.

## Observability: you cannot maintain what you cannot see

First maintenance session: confirm the minimum exists, or create it and record it in
`docs/operations/monitoring.md`:
- Errors are captured somewhere a human looks (error tracking, log alerts, per stack).
- The critical flow has a heartbeat: you find out it broke before the user tells you.
- Failure of background jobs/integrations is *visible*, not silently swallowed. The studied
  production system's worst bugs were invisible failures marked "done".

## The maintenance loop (each session, in this order)

1. **Signals**: errors, alerts, intake since last session. Triage bugs (fix + regression test)
   from wishes (INTAKE.md → `scope`).
2. **Dependencies**: audit for known vulnerabilities (blocking; fix now), then routine updates
   in small, verified batches: never a big-bang upgrade with feature work mixed in. On a
   platform stack (the stack file's header declares a hosted platform) the audit has the same
   job and different subjects: connectors and the permissions they carry, installed managed
   solutions and store apps, plugins and custom code registered in the instance, and the
   vendor's own release and deprecation notices. Those last ones move on the vendor's schedule
   rather than yours, which is what makes a platform go stale while every project file sits
   untouched.
3. **Debt harvest**: `grep -rn "defer:" --exclude-dir=.git .` → reconcile with DEBT.md. Flag
   markers whose upgrade trigger has fired, and `no-trigger` markers (those rot silently).
   Paying debt is a proposed, owner-approved task like any other.
4. **Drift check**: `node checks/check.mjs` + spot-check that STATE.md, BRIEF and reality still
   agree. Docs describing a system that no longer exists → fix + denylist.
5. **Success metrics**: a read date in BRIEF's measurement plan that has passed gets read now,
   and the number written next to its criterion in BRIEF, dated. Nothing due, nothing to do.
   Measured below target is a finding for `scope`, not a defect for `debug`: the capability
   works, the value did not arrive.

## Incidents

Something is broken for real users: fix first, understand fully, *then* improve. Open
`docs/operations/incident-response.md` alongside step 1: its notification clocks (AP,
NCSC-NL, ENISA) count from the moment of awareness, not from the fix.
1. Stabilize (rollback per runbook is a fine fix). 2. Root cause: the actual one, not the
first plausible one. 3. Regression test. 4. Ten-line post-mortem in `docs/operations/`:
what, impact, cause, fix, what now detects it earlier. No blame, no essay.

## Periodic audit (quarterly, or before major phases)

One focused pass: security posture, compliance register still current (`comply`), backup
restore proven again (a restore you haven't run this quarter is a rumor), unused code/deps
(stack dead-code tooling), skill library still curated, STATE.md log rotated.

The stack standards file ages the same way the compliance register does. Its header carries the
date those facts were last verified; when that date is more than a quarter old, or the stack has
shipped a major version since, re-verify the file against the vendor's live documentation and
re-stamp the header (`stack` owns how, and its rule that a stack fact from model memory is a
rumor with a cutoff). The major-version half fires on the news rather than on the calendar: a
release that deprecates what the standards file blesses is worth knowing about in the week it
lands, not in the quarter it lands.

Findings → INTAKE/DEBT with severity; fix nothing unasked.

## End of life: retiring a product, an environment, or an integration

`comply` makes two promises that only come due here: the retention periods written in the
register's processing record, and deletion that is implemented rather than described. This is
where they are kept. Decommissioning is a proposed, owner-approved task like paying debt, never
a cleanup done in passing, and it is the one maintenance job whose evidence someone may ask for
years later.

- **The data goes, per the record.** Every purpose in `docs/compliance/REGISTER.md`'s
  processing record names a retention period; at end of life each one is deleted, or exported
  first to the destination the owner agreed. Backups, replicas and analytics copies hold the
  same personal data and outlive the primary store, so name when they expire too - a deletion
  proven only against the live database is a deletion visible only from the front.
- **The access goes with it.** Credentials, API tokens, service accounts, connectors, webhooks
  and third-party processor accounts created for this product are revoked at their source, and
  the processor agreements that covered them are ended. A key nobody revoked outlives the
  product it belonged to and has no owner left to notice it.
- **Say what happened, where the promise lived.** Record per purpose what was deleted or
  exported and on what date, in the register that carried the retention promise, and note the
  retirement in STATE.md. An undocumented deletion and a forgotten one look identical
  afterwards. ⚓
