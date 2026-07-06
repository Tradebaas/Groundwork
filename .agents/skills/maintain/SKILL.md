---
name: maintain
description: Keep a shipped product healthy — monitoring, updates, incidents, debt, periodic audits. Use after first production release, on a maintenance session, when dependencies need updating, when something broke in production, or to harvest defer: markers into the debt ledger.
---

# maintain — the product is now a running system

Maintenance sessions still follow the session protocol: STATE.md first, one task, state updated.
Maintenance is scope-bound too — "while maintaining" is not a license to rebuild.

## Observability — you cannot maintain what you cannot see

First maintenance session: confirm the minimum exists, or create it and record it in
`docs/operations/monitoring.md`:
- Errors are captured somewhere a human looks (error tracking, log alerts — per stack).
- The critical flow has a heartbeat: you find out it broke before the user tells you.
- Failure of background jobs/integrations is *visible*, not silently swallowed — the studied
  production system's worst bugs were invisible failures marked "done".

## The maintenance loop (each session, in this order)

1. **Signals**: errors, alerts, intake since last session. Triage bugs (fix + regression test)
   from wishes (INTAKE.md → `scope`).
2. **Dependencies**: audit for known vulnerabilities (blocking; fix now), then routine updates
   in small, verified batches — never a big-bang upgrade with feature work mixed in.
3. **Debt harvest**: `grep -rn "defer:" --exclude-dir=.git .` → reconcile with DEBT.md. Flag
   markers whose upgrade trigger has fired, and `no-trigger` markers (those rot silently).
   Paying debt is a proposed, owner-approved task like any other.
4. **Drift check**: `node checks/check.mjs` + spot-check that STATE.md, BRIEF and reality still
   agree. Docs describing a system that no longer exists → fix + denylist.

## Incidents

Something is broken for real users: fix first, understand fully, *then* improve.
1. Stabilize (rollback per runbook is a fine fix). 2. Root cause — the actual one, not the
first plausible one. 3. Regression test. 4. Ten-line post-mortem in `docs/operations/`:
what, impact, cause, fix, what now detects it earlier. No blame, no essay.

## Periodic audit (quarterly, or before major phases)

One focused pass: security posture, compliance register still current (`comply`), backup
restore proven again (a restore you haven't run this quarter is a rumor), unused code/deps
(stack dead-code tooling), skill library still curated, STATE.md log rotated.
Findings → INTAKE/DEBT with severity; fix nothing unasked. ⚓
