# 01: Ticket format and spec-skill ticket step

- **Blocked by:** none
- **Status:** done

**What to build:** A project owner running the `spec` skill on tier L work (or multi-session
tier M) ends up with a `tickets/` folder next to spec.md: one markdown file per vertical
slice, each demoable on its own and sized to one fresh agent session, carrying What to build,
Blocked by, Status, and acceptance checkboxes. A template shows the format; the skill explains
slicing (complete narrow path through every layer, never one layer), blocking edges, and the
frontier rule.

**Acceptance:**

- [x] `docs/specs/TEMPLATE-TICKET.md` exists, with a manifest row in `docs/README.md`
- [x] The `spec` skill has a ticket step: when to decompose, how to slice, frontier rule
- [x] Spec status values gain nothing; ticket statuses are `ready | building | done`
- [x] `node checks/check.mjs` green
