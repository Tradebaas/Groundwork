# Ticket template: copy per slice

<!-- Made by the `spec` skill for tier L (and multi-session tier M) work.
     Location: docs/specs/<NNN>-<slug>/tickets/<NN>-<slug>.md, one file per slice, numbered in
     rough build order. Never a single combined task list: one ticket, one file, one session. -->

# <NN>: <title>

- **Blocked by:** <sibling ticket filenames, comma-separated, or "none">
- **Status:** ready <!-- ready | building | done -->
- **Traces to:** BRIEF SC-<n> <!-- the scope item this slice serves; inherited from the spec.
  Without it the progress overview cannot attribute the work (`node checks/progress.mjs`). -->

**What to build:** <The end-to-end behavior this slice delivers, written from the user's
perspective. A slice cuts a narrow but complete path through every layer involved (vertical),
is demoable or verifiable on its own, and fits one fresh agent session. Describe behavior,
never a layer-by-layer implementation list.>

**Acceptance:**

- [ ] <observable check, phrased so `verify` can execute it without interpretation>
- [ ] <observable check>

---

Build order: work the frontier; the rule lives in the `spec` skill. STATE.md `Now ▶` points at
the frontier ticket.
