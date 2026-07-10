# 001: plan (tier L)

## Build order

Owned by the ticket graph in `tickets/`. Work the frontier: the lowest-numbered ticket whose
Blocked-by entries are all `done`, one ticket per fresh session. Current graph:

- 01 ticket format and spec-skill ticket step (no blockers)
- 02 tickets check plus self-test (blocked by 01)
- 03 plan template plus spec template upgrade (no blockers)
- 04 spec-skill interview step (blocked by 01, same file)
- 05 code-file-cap check (no blockers)
- 06 GLOBAL.md standards upgrade (no blockers)
- 07 code-review skill (blocked by 06)
- 08 CONTEXT.md glossary (blocked by 04, same file)
- 09 efficiency rules in AGENTS.md and checkpoint (blocked by 01)
- 10 decision record, reconcile, archive (blocked by all others)

## Seams and interfaces touched

- `checks/check.mjs` runChecks list: new checks are added as self-contained functions, each
  with fixtures in `checks/check.test.mjs`. This is the agreed testing seam for tickets 02
  and 05: prove the gate fails on a violation, passes on a fix.
- Skill files under `.agents/skills/`: validated by the existing `skills` check (frontmatter,
  registration in AGENTS.md, line budget). Seam for tickets 01, 04, 07, 08, 09.
- Templates under `docs/`: validated by `docs-manifest` and `links`. Seam for tickets 01, 03, 08.
- `checks/config.json` budgets: new keys only, existing keys unchanged.

## Migration / rollback

All changes are additive (new templates, new checks, extended skills). Existing Groundwork
copies are unaffected until they pull the change. Rollback is a plain git revert; no data or
state migration exists in this repo.

## Verification approach

Per ticket: `node checks/check.mjs` and `node checks/check.test.mjs` green, plus the ticket's
own acceptance checkboxes. For the whole spec: run the `verify` skill against the acceptance
criteria in spec.md, including one dry run of the new flow (interview, spec, tickets, build
one ticket, code-review) on a scratch example.
