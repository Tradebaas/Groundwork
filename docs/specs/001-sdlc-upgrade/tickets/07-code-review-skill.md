# 07: code-review skill

- **Blocked by:** 06-global-standards
- **Status:** done

**What to build:** Before substantial work is committed, the diff gets reviewed on two
independent axes, each with fresh eyes (subagents where the tool has them, sequential fresh
passes otherwise): (a) standards conformance against `docs/standards/`, seeded with a named
baseline of about 12 classic code smells (mysterious name, duplicated code, feature envy,
data clumps, primitive obsession, repeated switches, shotgun surgery, divergent change,
speculative generality, message chains, middle man, refused bequest); (b) spec fidelity,
quoting the spec line for every finding, flagging both missing behavior and scope creep.
Findings come back by severity; the axes are never merged into one ranked list. Skip anything
tooling already enforces.

**Acceptance:**

- [x] `.agents/skills/code-review/SKILL.md` exists and is registered in AGENTS.md
- [x] Both axes, the smell baseline, and the never-merge rule are in the skill
- [x] The skill states when it runs: before committing substantial work, after `verify`
- [x] `node checks/check.mjs` green (skills check validates registration)
