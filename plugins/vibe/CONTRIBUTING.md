# Contributing to the vibe plugin

The plugin is the library: `skills/` (one directory per skill), `agents/` (the review agents),
`hooks/hooks.json` (the guard and the handoff echo) and `checks/guard.mjs`. Every file here is
loaded into sessions on every machine the plugin is installed on, so each one must earn its place.
The studied failure mode is a library of hundreds of imported skills with three in use.

## 1. Should this be a skill? Stop at the first rung

1. **One-off knowledge?** Put it in the task, not the library.
2. **A durable fact or rule?** It belongs in the owning doc of the project it is about
   (`docs/standards/`, DESIGN.md, AGENTS.md if truly universal), never in a skill.
3. **Mechanically checkable?** Add a check to `checks/check.mjs` with a fixture test. Never send
   a model to do a linter's job.
4. **A recurring method that needs judgment**, the way of working you would teach a new senior
   hire: that is a skill. The trigger: you have needed it three times, or you know you will.

## 2. Write it

Create `skills/<name>/SKILL.md`:

- **Frontmatter**: `name` equals the directory name (lowercase, hyphens, at most 64 chars);
  `description` at most 1024 chars stating what it does and when to load it, in the words the
  moment of need actually contains. This line is all the model sees when deciding to load it, and
  the descriptions of all skills together must stay under the budget in `checks/config.json`.
- `disable-model-invocation: true` on a skill the owner starts by hand (`/vibe:start`,
  `/vibe:begin`, `/vibe:deliver`). Its body then costs nothing until invoked; only the name and
  description stay in context.
- No `model:` in a skill or agent unless the work truly needs a different model. A pinned model
  that differs from the session model rebuilds the prompt cache on every invocation.
- **Body at most 500 lines**, imperative, dense. Shape: purpose in one line, the method as
  numbered steps with explicit decision points, what to record, and how it relates to the
  automated gates (judgment above them, never a duplicate of them).
- Reference material goes in `references/` next to SKILL.md, linked one level deep and read only
  when that step runs. No code snippets that go stale: point at the living source.
- A skill that works in any repository names the Groundwork files as an option ("where the
  project has `docs/state/STATE.md`"), never as a precondition. The governance layer is laid over
  a project by `begin`, on request.

## 3. Validate

- `node checks/check.mjs` from the repository root: frontmatter, name and directory match, budgets.
- `claude plugin validate --strict ./plugins/vibe`: the manifest, the hooks and the agents.
- Test the trigger with `claude plugin eval`: an eval case in `evals/` that describes the moment of
  need without naming the skill, and a grader that checks the skill was used. A skill that does not
  load from its own description does not exist.

## 4. Maintain

Skills decay in three ways: **sediment** (steps that stopped being needed but never left),
**sprawl** (one skill quietly absorbing a second job: split it) and **no-ops** (rules so vague no
behavior would change: sharpen or delete). After using a skill, reread it and prune what decayed in
that same session. `/skill-doctor` reports which skills loaded and which never did; a skill nobody
has loaded in months is a candidate for deletion. Deleting a wrong or dead skill is maintenance,
not loss.
