---
name: skill-author
description: Create a new project-fitting skill correctly, or decide that none is needed. Use when the project repeatedly needs expert guidance the existing skills don't carry, when the user asks for a new skill, or when the same correction has been given three times.
---

# skill-author: grow the library deliberately, or not at all

The studied failure mode is real: a library of 557 imported skills with 3 in use. Skills are
context spent on every session's listing. Each one must earn that.

## 1. Should this be a skill? (ladder: stop at the first rung)

1. **One-off knowledge?** Put it in the task, not the library.
2. **A durable fact or rule?** It belongs in the owning doc (`docs/standards/`, DESIGN.md,
   AGENTS.md if truly universal), not a skill.
3. **Mechanically checkable?** Add a check to `checks/check.mjs` + a fixture test. Never send
   a model to do a linter's job.
4. **Recurring *method* requiring judgment** (a way of working you'd teach a new senior hire)
   → that is a skill. The trigger: you've needed it three times, or you know you will.

## 2. Write it

Create `.agents/skills/<name>/SKILL.md` (open Agent Skills standard):

- **Frontmatter**: `name` = directory name (lowercase, hyphens, ≤64 chars); `description` ≤1024
  chars stating *what it does* **and** *when to load it*. Write the trigger phrases the moment
  of need actually contains; this line is all the model sees when deciding to load it.
- **Body ≤500 lines**, imperative, information-dense. Structure: purpose (one line) → the
  method (numbered, decision points explicit; ladders beat essays) → what to record →
  how it relates to the automated gates (judgment layer above, never duplicate of).
- Heavy reference material goes in files next to SKILL.md, linked one level deep, loaded only
  when needed. No code snippets that will go stale: point at the living source instead.
- End the body's report instruction with the ⚓ convention if the skill produces user output.

## 3. Register and validate

- Add one row to the skills table in `AGENTS.md` (keep the ≤150-line budget: if it doesn't
  fit, something else must leave; that trade-off is the point).
- Run `node checks/check.mjs`. It validates frontmatter, name/dir match, and budgets.
- Test the trigger: describe the situation to a fresh session and confirm the skill loads.

## 4. Maintain

Skills decay in three ways: **sediment** (steps that stopped being needed but never left),
**sprawl** (one skill quietly absorbing a second job: split it), and **no-ops** (rules so vague
no behavior would change: sharpen or delete). After using a skill, reread it and prune what
decayed in that same session. The skills table in `AGENTS.md` is the library's router: every
skill earns its row by being findable from its moment of need, and a skill nobody has loaded in
months is a candidate for deletion. Check before big milestones. Deleting a wrong or dead skill
is maintenance, not loss; note it in STATE.md's log. ⚓
