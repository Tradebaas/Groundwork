---
name: scope
description: Define, sharpen, or change project scope, and triage docs/state/INTAKE.md. Use when scope is unclear or contested, when new wishes/feedback arrive, when the owner asks for "more" mid-build, or when work doesn't trace to BRIEF.md. Scope changes only happen here, never silently during a build task.
---

# scope: the boundary is a decision, not a feeling

`docs/product/BRIEF.md` is the single measuring stick. This skill is the only path that changes it.

## Sharpening scope

For each candidate capability, make it earn its place:

1. Which user, in which situation, is blocked without it?
2. Does an existing capability (SC-item), a platform feature, or an off-the-shelf product
   already cover it? (Decision ladder: don't rebuild what exists.)
3. Can version one ship without it? If yes, it goes to *Out of scope* or INTAKE with a trigger.

Write results as numbered, testable SC-items. Vague scope ("a dashboard") is not scope; scope
says what the user can *do* ("SC-3: owner sees per-project hours, filterable by month").
Phrase each one so the owner recognizes it without a translation: their words, no jargon, no
component names. The progress overview quotes these lines back to them verbatim
(`node checks/progress.mjs`), so a line only they can read is a line they cannot check.

A fuzzy word in any answer ("you said account: the Customer or the User?") gets pinned in the
glossary `docs/product/CONTEXT.md` the moment it surfaces.

## Triage: INTAKE.md

Nothing is built from INTAKE. Per item, propose one of:

- **In scope** → owner signs off → add/extend an SC-item → gets a spec (`spec` skill).
- **Out of scope** → record the reason in BRIEF's out-of-scope list. Say it plainly; a parked
  good idea is not a rejection of the person.
- **Later** → stays in INTAKE with an explicit revisit trigger ("after launch", "if >100 users").
- **Bug** → not a scope question; goes straight to a fix with a regression test.

For an in-scope item, name the cheapest tier that delivers it (decision 0015: an artifact or
on-demand skill before a gate, a gate before an always-on rule); the tier is part of the
recommendation.

Present triage as a batch with your recommendation per item; the owner decides, you record.

## Changing scope mid-build

- A scope change during a build task means: **stop the task**, run this skill, then resume.
- Every widening gets named as such, with its cost (time, complexity, risk) stated before the
  owner decides. Silent widening is the failure mode this skill exists to prevent.
- Narrowing is allowed and healthy. Move the dropped SC-item to out-of-scope with the reason,
  archive its spec as `dropped`.

## Record

BRIEF.md updated (one fact, one place), INTAKE.md rows decided, significant scope decisions →
`docs/decisions/`. Update STATE.md if the current work changed. ⚓
