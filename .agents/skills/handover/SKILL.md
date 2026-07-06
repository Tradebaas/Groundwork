---
name: handover
description: Make the project fully transferable to another human or agent with zero verbal context. Use at milestones, before breaks, when a new person/tool joins, or when the owner asks "can someone else take this over?". Also the end-of-session discipline when significant work happened.
---

# handover — the repo must speak for itself

The test is always the same: **a competent stranger, any IDE, any model, gets only the repo —
can they continue within ten minutes?** If anything requires this conversation, your memory, or
files outside the repo, the handover is broken.

## The audit

Walk it as the stranger would:

1. `README.md` → do the copy/start instructions still hold for this project?
2. `AGENTS.md` routing table → does every row point at a file that exists and is current?
3. `docs/state/STATE.md` handoff block → status, phase, branch, gates, Now ▶, blockers — is it
   literally true *right now*? Stale handoff is the most damaging lie in the system.
4. `docs/product/BRIEF.md` → does it still describe the product that exists?
5. Can the stranger run it? Setup steps, env vars (`.env.example` complete?), seed data,
   `docs/operations/` runbooks — follow them literally; fix what's wrong, don't annotate around
   it. A fresh clone must also re-run `node checks/check.mjs --install-hooks` — is that step
   where the stranger will see it (README/setup)?
6. Secrets and access: nothing secret in the repo, and a named list of what access a successor
   must be granted (where credentials live, who grants them) in `docs/operations/access.md`.
7. Open threads: in-flight specs at their real status; INTAKE triaged or explicitly queued;
   DEBT.md reconciled with `defer:` markers.

Fix everything fixable now. What you can't fix, write down as an explicit gap in STATE.md —
a named gap is transferable; a hidden one isn't.

## Human handover (milestone/project end)

Add a dated entry to STATE.md's log: what was delivered, where it runs, the three things a
successor must know first, and the owner's open decisions. If the successor is non-technical,
point them at README; if technical, at AGENTS.md. Nothing else to produce — if a separate
"handover document" feels needed, the repo is failing this skill; fix the repo instead. ⚓
