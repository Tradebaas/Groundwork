# 02: Tickets check with self-test

- **Blocked by:** 01-ticket-format
- **Status:** ready

**What to build:** A maintainer who writes a ticket with a typo'd status or a Blocked-by
pointing at a missing file gets a red gate, not silent drift. A new `tickets` check in
`checks/check.mjs` validates every `docs/specs/*/tickets/*.md`: status is one of
`ready | building | done`, every Blocked-by entry names an existing sibling ticket, and the
file has a What to build line. Archived specs are skipped.

**Acceptance:**

- [ ] Invalid status fails the check; the failure names the file and the bad value
- [ ] Blocked-by referencing a missing ticket fails the check
- [ ] `checks/check.test.mjs` proves both failure modes and the passing case
- [ ] `node checks/check.mjs` green on this repo
