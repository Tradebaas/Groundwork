---
name: architect
description: Design the system before building it: module boundaries, data model, integration contracts, environments, threat model. Use after stack choice and before the first build session, and again when a change would cross or move a boundary. Produces docs/product/ARCHITECTURE.md and decision records.
---

# architect: decide the shape once, before the code hardens it

Architecture is the set of decisions that are expensive to reverse. Make them deliberately,
record them, and keep the map current. Scale the depth to the project: a small tool needs a
page; a platform needs the full pass.

## The pass

1. **Boundaries.** Cut the system into modules along the domain's natural seams (what changes
   together lives together). Per module: what it owns, what it exposes, what it may never reach
   into. These rules become mechanically enforced when the stack's tooling allows (import
   restrictions: wire via `stack`).
2. **Data.** The core entities, who owns each, where truth lives, what is derived. Personal
   data flagged per entity (feeds the compliance register). Retention and deletion are schema
   decisions, not afterthoughts.
3. **Contracts.** Every integration (API, queue, file, third-party service): the contract, the
   failure mode, the timeout/retry stance, and what the user sees when it's down. A contract
   without a failure plan is half a contract.
4. **Environments.** Local → test → production: what exists, what differs, where config and
   secrets live per environment, how data gets seeded. One command to run locally, documented.
5. **Threats.** A lightweight pass over the real risks: who can reach what, where untrusted
   input enters, what the abuse cases are, what the blast radius of a leaked credential is.
   Mitigations become requirements in specs, not wishes.
6. **The 10× question.** Where does this design break at 10× the users/data? Mark those spots
   with `defer:` markers (ceiling + upgrade trigger) instead of building for scale now.

## Record

- The map goes in `docs/product/ARCHITECTURE.md`: modules, data ownership, contracts,
  environments. Current state, one page if possible, diagrams as text (Mermaid) so any tool
  renders and diffs them.
- Each expensive-to-reverse choice gets a decision record (options, why). Boundary rules that
  tooling can enforce get wired by `stack`; the rest are checked by `scope-guard`'s ladder.
- STATE.md updated; next step is usually `design` (visual system) or the first spec.

When a later change moves a boundary: update the map in the same change. An architecture doc
that describes the old system is worse than none (denylist the retired shape). ⚓
