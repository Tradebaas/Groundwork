---
name: begin
description: Start a freshly copied Groundwork project. Use when docs/state/STATE.md says NOT STARTED, when the user says "begin", "start", "nieuw project", or asks how to get going in an empty copy. Interviews the owner, fills the templates, sets up git and hooks, and proposes the first real step.
---

# begin: from fresh copy to working project

Run this once. When it's done, STATE.md carries real state and this skill never triggers again.

## 1. Clean the copy

- If `MASTER_PROMPT.md` exists at the root: it is the brief that built Groundwork, not part of
  any project. Delete it.
- Verify prerequisites: `git --version` and `node --version` (Node ≥ 20). Missing → tell the
  owner exactly what to install, then stop.

## 2. Interview the owner

Ask focused questions, capture answers verbatim where wording matters. Only what is genuinely
theirs to decide. Everything else you decide later, and say so.

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

- Fill `docs/product/BRIEF.md`: numbered SC-items, explicit out-of-scope, constraints.
- Fill the handoff block in `docs/state/STATE.md`: status active, phase `prepare`, Now ▶ next step.
- If personal data or AI features: add a dated line to `docs/compliance/COMPLIANCE.md` triggers.
- Rewrite `README.md`'s top half to describe *this product* (what, for whom, how to run once it
  exists); keep the "How it works" system section and this table intact for successors.

## 4. Set up the machinery

```bash
git init -b main
node checks/check.mjs --install-hooks   # wires core.hooksPath → checks/hooks (versioned)
node checks/check.mjs                   # must be green before the first commit
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
