# 03: Plan template and spec template upgrade

- **Blocked by:** none
- **Status:** ready

**What to build:** An agent starting tier L work copies a plan skeleton instead of improvising
one, and the spec skeleton itself teaches the new rules. `docs/specs/TEMPLATE-PLAN.md` covers:
build order (owned by the ticket graph), seams and interfaces touched, migration/rollback,
verification approach. `docs/specs/TEMPLATE.md` gains: a testing seams section, the EARS
suggestion for acceptance criteria (WHEN <condition> THE SYSTEM SHALL <behavior>), and the
anti-staleness rule (no product source paths or line numbers in specs).

**Acceptance:**

- [ ] `docs/specs/TEMPLATE-PLAN.md` exists, with a manifest row in `docs/README.md`
- [ ] `docs/specs/TEMPLATE.md` has the seams section, EARS suggestion, anti-staleness rule
- [ ] The `spec` skill references the plan template for tier L
- [ ] `node checks/check.mjs` green
