# 04: Spec interview step

- **Blocked by:** 01-ticket-format
- **Status:** ready

**What to build:** Before any tier M or L spec is written, the owner is interviewed instead of
handed a draft: one question at a time, each with the agent's recommended answer; facts are
looked up in the repo (never asked), decisions are put to the owner (never assumed); writing
starts only after the owner confirms shared understanding, and that confirmation replaces the
bare "approved" sign-off line. The `spec` skill carries this method; the template's sign-off
field records the confirmation.

**Acceptance:**

- [ ] The `spec` skill has the interview step with all four rules above
- [ ] The template sign-off line reflects confirmed shared understanding
- [ ] Tier S is explicitly exempt (no interview for a bugfix)
- [ ] `node checks/check.mjs` green
