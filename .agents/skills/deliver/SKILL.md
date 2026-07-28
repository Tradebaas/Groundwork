---
name: deliver
description: Release, deploy, or hand over a milestone in a disciplined, repeatable way. Use when shipping to users, deploying to an environment, tagging a release, or closing out a milestone. Nothing ships that verify hasn't passed.
---

# deliver: shipping is a procedure, not an event

## 0. Entry conditions: all of them

- `verify` passed on everything in this release (evidence in STATE.md, not memory).
- `code-review` clean on everything in this release (blockers and majors resolved), or its
  trivial-tier skip recorded in STATE.md (`verify` §4 routes this).
- `scope-guard` clean; specs in this release at status `done`.
- CI green on the exact commit being shipped. Local green is not CI green. No CI yet (no
  remote/host)? Wire it now. First delivery is the moment. Genuinely impossible? Run the full
  gate chain on a fresh clean checkout and record that explicit exception in STATE.md. On
  GitHub, a first release also protects `main`: the owner applies the runbook
  `docs/operations/branch-protection.md` with repo admin.
- On a platform stack (the stack file's header declares a hosted platform): the target instance
  and the repo still agree. Export the environment fresh and compare it against what is
  committed; whatever was changed directly in the platform editor since the last export is
  brought into the repo or deliberately dropped, and either way it happens before the release,
  not during it. A repo that is behind its own instance ships a release that overwrites work
  nobody reviewed. This is the platform's standard failure mode and the one CI cannot see:
  green on the commit says nothing about what the instance holds.
- The product holds persistent data → `docs/operations/backup-restore.md` exists and the
  restore has been performed once, for real. An untested restore is a hope, not a backup.
- Compliance register (`docs/compliance/COMPLIANCE.md`) has no open blocking item. For a first
  release or new data/AI processing, run `comply` first. A first release also proves the root
  `SECURITY.md` holds: the reporting channel works (on GitHub: private vulnerability reporting
  enabled in the repo settings), and once the product is placed on the market its support
  period is published (`comply` fills the marked fields).

## 1. The release

1. Version it: semantic version derived from Conventional Commits (breaking → major, feat →
   minor, fix → patch). Tag: `vX.Y.Z`.
2. Changelog: generate from commits since the last tag, edit for a human reader: what changed
   *for the user*, in the product's voice.
3. Deploy **only** via the runbook `docs/operations/deploy.md`. First delivery? Write that
   runbook now (target, credentials location (never in the repo), steps, verification URL,
   rollback procedure) and test it by following it literally, from a clean state.
4. Post-deploy verification: the runbook's smoke checks against the real environment: the
   critical flows, not a browse-around. Record results.
5. Rollback is part of delivery: before shipping, know the one command/procedure that undoes
   this release, and that it works.

## 2. Milestone handover

Deliverable milestone for a client/owner → run `handover` so the repo is cold-start complete,
and demo against BRIEF's success criteria: per SC-item in this milestone, show it working.

A demo proves capability, not value: it works, and nobody has measured yet whether the promised
value arrived. So before the milestone closes, every shipped SC-item's measurement plan in BRIEF
carries a concrete read date ("quarterly" gets a date) and a named reader, set with the owner
because the measurement is theirs, and `maintain`'s loop reads it when that date passes. An
SC-item BRIEF marks `n/a` has nothing to schedule; a quantified criterion with no plan at all is
a `scope` question, not a delivery blocker.

## 3. Record

STATE.md: phase (`maintain` after first production release), release line (version, date, sha,
environment), Now ▶. Deferred-but-shipped debt: DEBT.md rows checked against what shipped.
New operational facts (URLs, dashboards, schedules) → `docs/operations/`, listed in the
manifest. What this release cycle taught, a missing runbook step included, routes to INTAKE.md
as a candidate like any session lesson (`checkpoint`, step 3 of its method, owns that rule).
Report: version, where it now runs, evidence of the smoke checks, one next step. ⚓
