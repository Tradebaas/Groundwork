# 03: taste is retired, and nothing points at a skill that is gone

- **Blocked by:** 02-begin-and-design-route-into-impeccable.md
- **Status:** ready
- **Traces to:** BRIEF SC-8

**What to build:** The framework carries one rulebook for building an interface. `taste` is
removed, everything that named it points at the method that replaced it, and the retired wording
can never quietly return.

Before deleting, each of taste's rules is checked against impeccable's craft floor and Persuade
mode. Anything genuinely not covered (the three dials, the redesign protocol's preserve-or-overhaul
read, the SEO migration risk) moves to the file that owns it rather than disappearing, and the
decision record states where each went.

**Acceptance:**

- [ ] Every rule in `taste` is accounted for: covered by impeccable, moved to a named file, or
      dropped with a reason. The mapping is written in the decision record, not in a commit message.
- [ ] `.agents/skills/taste/` is gone and its row is out of the AGENTS.md skills table.
- [ ] Every pointer that named it is repointed: DESIGN.md principle 10, `design`, `design-guard`,
      and any doc the links gate finds.
- [ ] Decision 0012 is marked superseded, naming the decision that replaced it, and stays readable
      as the record of why the earlier choice was right at the time.
- [ ] The retired wording is in the denylist in `checks/config.json`, so a later session cannot
      reintroduce a rulebook that no longer exists.
- [ ] `node checks/check.mjs`, the links gate and the self-test suites stay green.
