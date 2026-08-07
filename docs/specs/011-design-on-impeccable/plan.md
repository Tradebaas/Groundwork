# 011: plan (tier L)

## Build order

Owned by the ticket graph in `tickets/`. Work the frontier, one ticket per fresh session.

- 01 install route and third-party declaration (no blockers, tracer)
- 02 begin and design route into impeccable (blocked by 01)
- 03 retire taste (blocked by 02)
- 04 design-guard keeps what impeccable does not cover (blocked by 03)
- 05 the detector becomes a real gate (blocked by 01)
- 06 artifact ownership, decision record, doc reconciliation (blocked by 02, 03, 04, 05)

Ticket 01 is the tracer: it installs the payload into this repo, declares it, keeps every gate
green, and makes the installed state visible. Nothing widens before that narrow path runs for
real, because every later ticket assumes a payload that a green check run tolerates.

## Seams and interfaces touched

- **`checks/config.json` plus `check.mjs`'s `isVendored` reader.** The third-party declaration
  reuses the existing one-fact-one-place idiom, and extends it from the code gates to the text
  gates and the skills registry. Proven by fixtures in the existing runner suite: declared path
  with banned typography stays green, undeclared path still fails.
- **`checks/enforcement.mjs`.** Gains one reported state, the design method, beside hooks, CI and
  adapter hooks. Proven in both states.
- **`checks/check-stack.mjs`.** The detector counts as wired only when the CI workflow runs it,
  the same evidence rule the other stack gates use.
- **The AGENTS.md routing table and the skills gate.** A declared third-party skill directory is
  exempt from the registry requirement; an ordinary skill still must appear.
- **The skills themselves (`begin`, `design`, `design-guard`, `verify`, `stack`, `maintain`).**
  Their seam is their trigger and their handoff, not their internals.
- **`docs/DESIGN.md`, `docs/product/BRIEF.md` and PRODUCT.md.** The seam is which file owns
  which fact; the links gate and the docs manifest prove the pointers.

## Migration / rollback

Existing copies of Groundwork keep working: nothing here is required for a project that has no
interface, and a project already mid-build keeps its current DESIGN.md until it chooses to run the
new route. The one destructive step is ticket 03, the removal of `taste`; its content is covered by
impeccable's craft floor, and the decision record states what moved where, so a revert is a plain
`git revert` of that ticket's commit plus restoring the AGENTS.md row.

Rollback of the whole spec is a git revert plus `rm -rf .agents/skills/impeccable`, since the
payload is gitignored and nothing in the repo depends on its internals.

## Verification approach

Per ticket: the gates every commit already runs (`node checks/check.mjs`, the four self-test
suites, progress, links, cockpit, drill), plus that ticket's own acceptance list.

For the spec as a whole, `verify` runs the twelve acceptance criteria end to end, and criteria 1,
2 and 4 are exercised for real rather than reasoned about: a scratch project gets set up through
`begin`, the install is run and its failure path is forced once by cutting the network, and one
small surface is taken through the three approval points to confirm the owner is actually asked
before code exists. What cannot be exercised in a scratch run is stated as such.
