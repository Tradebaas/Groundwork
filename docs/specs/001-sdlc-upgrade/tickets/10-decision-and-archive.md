# 10: Decision record, reconcile, land clean

- **Blocked by:** 01-ticket-format, 02-tickets-check, 03-plan-and-spec-templates, 04-spec-interview, 05-code-file-cap, 06-global-standards, 07-code-review-skill, 08-context-glossary, 09-efficiency-rules
- **Status:** ready

**What to build:** The change lands honestly, completely, and leaves zero maintainer context
in the shipped repo. A new decision record explains the ticket layer as a refinement of
decision 0004 (right-sizing stays; decomposition becomes trackable) and cites the sources
(Pocock v1.1, Beads, Kiro waves, Anthropic harness guidance). `begin` step 1 learns to delete
non-archived spec folders from a fresh copy. A compact fictional example spec (spec.md plus
two tickets) ships in `docs/specs/archive/` as the worked example of the format. Every doc
made stale by this spec is reconciled, retired wording goes to the denylist, `verify` runs
against all fifteen acceptance criteria in spec.md, and this spec folder is then deleted from
the tracked repo (decision record and git history are the record).

**Acceptance:**

- [ ] Decision record exists and links decision 0004
- [ ] `begin` step 1 deletes non-archived `docs/specs/[0-9]*` folders on a fresh copy
- [ ] Fictional example spec with tickets in `docs/specs/archive/`, manifest-covered
- [ ] `verify` report: every spec.md criterion checked, failures named honestly, including a
      dry run of clone-plus-begin in a scratch directory (fresh copy starts clean)
- [ ] This spec folder deleted from the tracked tree; `node checks/check.mjs` green
