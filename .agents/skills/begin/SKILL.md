---
name: begin
description: Start a freshly copied Groundwork project. Use when docs/state/STATE.md says NOT STARTED, when the user says "begin", "start", "nieuw project", or asks how to get going in an empty copy - also when they open with an existing PRD, project description, or idea text: that material is this skill's input. Interviews the owner (or extracts the answers from their material), fills the templates, sets up git and hooks, and proposes the first real step.
---

# begin: from fresh copy to working project

Run this once. When it's done, STATE.md carries real state and this skill never triggers again.

## 1. Clean the copy

Do this housekeeping silently: it is plumbing, not progress. Report on it only if something
went wrong or needs the owner's action; a list of deleted template files is noise to them.

- If a `MASTER_PROMPT.md` or `MASTER_PROMPT.local.md` exists at the root: it is Groundwork's own
  origin brief, not part of any project. Delete it. (Fresh copies no longer carry it: it is
  gitignored at source. This clears it from older copies made while it was still tracked.)
- Delete any non-archived spec folder: `docs/specs/[0-9]*` directories are in-flight Groundwork
  maintainer work, never the new owner's. Keep `docs/specs/archive/` (it holds the worked
  example) and the `TEMPLATE*.md` files.
- Reset `"denylist"` in `checks/config.json` to `[]`: its entries guard the origin repo's
  retired wording, never this project's. Keep `styleBans` intact (those are generic).
- Keep `docs/decisions/0001-0012`: they document the system this project just inherited (why
  the rulebook, skills and checks work the way they do). This project's own decisions start
  at 0013.
- Verify prerequisites: `git --version` and `node --version` (Node ≥ 20). Missing → tell the
  owner exactly what to install, then stop.

## 2. Interview the owner

**Material first.** Ask whether the owner already has anything written: a PRD, project
description, pitch, notes, or a rough idea dump. Take it now (pasted text or a file; convert
non-Markdown files with the `ingest` skill) and treat it as the primary source: extract answers
to the questions below from it, play each extracted answer back for a one-line confirmation,
and interview only for the gaps. A vague idea is a valid starting point: capture what the owner
does know, record the rest in BRIEF.md as explicitly open, and let `scope` sharpen it (step 5
routes there).

For whatever the material leaves open, interview **one question per message**, never a batch:
announce upfront how many questions are coming ("question 1 of 5"), keep that counter on every
question, and go as deep per topic as it takes to make the answer concrete before moving on.
Capture answers verbatim where wording matters. Only what is genuinely theirs to decide.
Everything else you decide later, and say so.

1. **Product**: name; one sentence: what it does, for whom, why now.
2. **Users**: who, in what situation, on which devices.
3. **Scope**: the 3-7 capabilities version one must have. Then explicitly: what is *not* in it.
4. **Constraints**: deadline, budget sensitivity, integrations, data residency, personal data
   (yes/no: feeds the compliance register), any AI features (EU AI Act relevance).
5. **Success**: how the owner will know it worked.
6. **Ownership**: who signs off on scope changes (default: the owner you're talking to).

Do **not** ask about stack (that's the `stack` skill, argued on merit) or design details (the
`design` skill asks those when the time comes).

## 3. Write it down

- Fill `docs/product/BRIEF.md`: numbered SC-items, explicit out-of-scope, constraints. Write
  each SC-item in the owner's own words, as something they would recognize without translation:
  the progress overview quotes these lines back to them (`node checks/progress.mjs`).
- Seed the glossary `docs/product/CONTEXT.md` with the domain terms the interview surfaced;
  the file's template comment defines the entry format.
- Fill the handoff block in `docs/state/STATE.md`: status active, phase `prepare`, Now ▶ next step.
- Fill the §2 register header in `docs/compliance/COMPLIANCE.md`: set "Personal data processed",
  "AI features" and "Applicable regimes", dated. Either first field a yes → `comply` runs before
  first delivery.
- Rewrite `README.md` for *this product*: the top half (what, for whom, how to run once it
  exists) replaces Groundwork's pitch, and "Start a project" goes with it (that section is
  copy-the-template onboarding, done by now). Keep "How it works", "Requirements", "What lives
  where" and "Handing over" intact for successors; the License section is the owner's call
  (`comply` sets it).

## 4. Set up the machinery

First, if a `.git/` directory exists the copy still carries Groundwork's commit history (it was
cloned, not made with "Use this template", `degit`, or a ZIP). The project must start from its own
root, so remove it: `rm -rf .git`. Skip this only if that `.git` already holds the owner's own work.

If `.claude/skills` is not a symlink to `../.agents/skills` (degit and some ZIP tools break it),
restore it: `ln -sfn ../.agents/skills .claude/skills`. On Windows without symlink support: set
`"skipSymlinkCheck": true` in `checks/config.json` and point the tool at `.agents/skills/` directly.

```bash
git init -b main
node checks/check.mjs --install-hooks   # wires core.hooksPath → checks/hooks (versioned)
node checks/check.mjs                   # must be green before the first commit
node checks/progress.mjs --register     # adds this project to the owner's cross-project overview
git add -A && git commit -m "chore: initialize project on Groundwork"
```

If the owner has a remote (GitHub gets CI from `.github/workflows/ci.yml`; another host needs
its equivalent: port it before first delivery), wire it and push. If not, note in STATE.md
that CI is a `deliver` precondition still to be wired.

## 5. Hand off

Update STATE.md, then propose exactly one next step, normally:
- Scope needs sharpening → `scope`
- Scope is solid → `stack`, then `architect`, then `design`.

Report: what you recorded, what you decided yourself, and that single next step. ⚓
