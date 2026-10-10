# 0024: Claude first: the library ships as the `vibe` plugin, the governance layer stays optional

- **Date:** 2026-10-10 · **Status:** accepted, supersedes the bridges of 0001 and the project
  location of 0002 · **Decider:** owner (Remon) + agent

## Context

Decisions 0001 and 0002 made the framework tool-agnostic: AGENTS.md as the rulebook with a bridge
file per tool, and the skills in `.agents/skills/` so every agent tool finds them in the project.
Since then the owner builds with Claude Code only, on four or five projects at once, and most of
those projects are not Groundwork copies at all. The library lived inside each copy, so a project
that was never copied from Groundwork had none of it, and a project that was carried a snapshot
that drifted from the next. The weekly token budget was the trigger: a 141-line rulebook, twenty
skill descriptions and a design payload loaded into every session, on every project, whether the
session needed them or not.

## Options considered

1. **One Claude Code plugin, `vibe`, installed per machine; Groundwork governance laid over a
   project only through `begin` (chosen):** the skills, three review agents on Sonnet and the
   guard travel with the owner instead of with the project. Any repository gets them. A project
   that wants the full layer (AGENTS.md, `docs/`, `checks/`, the hooks) asks for it with
   `/vibe:begin`. Updates are one `claude plugin update` instead of a copy per project.
2. **Keep the library in every project and add the plugin beside it:** two copies of each skill
   in a governed project's context, and two places to update. The duplication is the cost 0001
   was written to avoid.
3. **Keep the tool-agnostic layout and skip the plugin:** every non-Groundwork project stays
   without the library, which is the situation the owner asked to end.

## Decision & consequences

- `plugins/vibe/` is the library's physical home, with `.claude-plugin/marketplace.json` at the
  repository root so `claude plugin marketplace add Tradebaas/Groundwork` finds it. Fourteen
  skills (`start` and `handoff` are new; `checkpoint`, `handover`, `calibrate`, `critical-thinking`,
  `scope-guard`, `design-guard`, `ingest` and `skill-author` are folded in or retired),
  `agents/review-standards.md`, `agents/review-fidelity.md` and `agents/review-security.md` on
  Sonnet so `code-review` never reads a diff twice in the build thread, and `hooks/hooks.json`
  with the guard and the handoff echo on compaction. `start`, `begin`, `deliver` and `maintain`
  carry `disable-model-invocation: true`: the owner starts them, so their bodies cost nothing
  until then.
- `.agents/skills` is a symlink into the plugin, so a tool without plugins and the Agent Skills
  standard still find the files in a copy. The Gemini bridge and its gate are gone; CLAUDE.md
  keeps its one line because Claude Code is the tool.
- AGENTS.md shrinks to what must be true in every session on a governed project: the session
  protocol, four hard rules, the map of where everything lives, the conflict rule. The decision
  ladder and the floors live in `docs/standards/GLOBAL.md`, which `code-review` reads; the rest
  was either a skill's job already or a sentence the owner's global CLAUDE.md says once.
- The skills no longer register in AGENTS.md; the plugin manifest is the registry and the skills
  gate reads the directory.
- `defer:` `checks/guard.mjs` exists twice, in `checks/` for the project hooks, the enforcement
  line and the drill, and in `plugins/vibe/checks/` for the plugin hook. `ceiling:` the two drift
  on the first edit to one of them. `upgrade-when:` the drill and the enforcement line read the
  plugin's copy, after which the project copy goes.
- `defer:` a governed project with the plugin installed sees each skill twice, once as
  `vibe:<name>` and once through `.claude/skills`. `ceiling:` doubled skill descriptions in
  context on those projects only. `upgrade-when:` `begin` learns to drop the `.claude/skills`
  symlink when the plugin is present, which is a change to the drill's expectations as well.

Easier: the library is one install per machine and one update, and it works on a bare
repository. Harder: a project without the governance layer has no STATE.md, so `start` and
`handoff` have to work from the conversation and offer the file rather than assume it. Watch for:
a skill that still names a Groundwork file as a precondition instead of as an option; the
contributing guide in the plugin names that rule.
