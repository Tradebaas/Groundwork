# 03: Plan template and spec template upgrade

- **Blocked by:** none
- **Status:** done

**What to build:** An agent starting tier L work copies a plan skeleton instead of improvising
one, and the spec skeleton itself teaches the new rules. `docs/specs/TEMPLATE-PLAN.md` covers:
build order (owned by the ticket graph), seams and interfaces touched, migration/rollback,
verification approach. `docs/specs/TEMPLATE.md` gains: a testing seams section, the EARS
suggestion for acceptance criteria (WHEN <condition> THE SYSTEM SHALL <behavior>), and the
anti-staleness rule (no product source paths or line numbers in specs).

**Acceptance:**

- [x] `docs/specs/TEMPLATE-PLAN.md` exists, with a manifest row in `docs/README.md`
- [x] `docs/specs/TEMPLATE.md` has the seams section, EARS suggestion, anti-staleness rule
- [x] The `spec` skill references the plan template for tier L
- [x] `node checks/check.mjs` green
