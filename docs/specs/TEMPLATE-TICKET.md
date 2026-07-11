# Ticket template: copy per slice

<!-- Made by the `spec` skill for tier L (and multi-session tier M) work.
     Location: docs/specs/<NNN>-<slug>/tickets/<NN>-<slug>.md, one file per slice, numbered in
     rough build order. Never a single combined task list: one ticket, one file, one session. -->

# <NN>: <title>

- **Blocked by:** <sibling ticket filenames, comma-separated, or "none">
- **Status:** ready <!-- ready | building | done -->

**What to build:** <The end-to-end behavior this slice delivers, written from the user's
perspective. A slice cuts a narrow but complete path through every layer involved (vertical),
is demoable or verifiable on its own, and fits one fresh agent session. Describe behavior,
never a layer-by-layer implementation list.>

**Acceptance:**

- [ ] <observable check, phrased so `verify` can execute it without interpretation>
- [ ] <observable check>

---

Working rules (the `spec` skill owns the details): build on the frontier, the lowest-numbered
ticket whose blockers are all `done`; one ticket per fresh session, clear context between
tickets; STATE.md `Now ▶` points at the frontier ticket.
