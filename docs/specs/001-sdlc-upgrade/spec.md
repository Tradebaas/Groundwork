# 001: Ticket layer, spec interview, code review, token discipline

- **Status:** building
- **Traces to:** explicit owner request (2026-07-10): "ik wil echt dat dit Groundwork project de
  gebruiker 100% meeneemt in alle best practices, qua token efficientie, code kwaliteit"; owner
  approved the five-phase improvement plan in the same session.
- **Owner sign-off:** approved 2026-07-10 ("Ja is goed doe maar!"), after review of the clean-copy
  guarantees (criteria 14 and 15).

## Why

Groundwork's spec method is right-sized and field-conform, but an audit against current best
practice (Matt Pocock's skills v1.1, GitHub Spec Kit, AWS Kiro, Beads, Anthropic guidance,
obra's superpowers) found five gaps: no persistent ticket layer (multi-session work survives
only as prose in STATE.md), no plan template for tier L, no interview step before writing a
spec, no line caps or review discipline for source code, and no domain glossary or explicit
context-budget rule. This change closes those gaps while keeping decision 0004's right-sizing:
every addition is opt-in by tier, markdown-native, and zero-dependency.

## What: acceptance criteria

Ticket layer:

1. The `spec` skill defines a ticket step for tier L (and tier M when multi-session): the spec
   folder gains `tickets/NN-<slug>.md` files, each a vertical slice sized to one fresh agent
   session, with the fields What to build, Blocked by, Status (`ready | building | done`), and
   acceptance checkboxes. A ticket template exists and is listed in the docs manifest.
2. `node checks/check.mjs` fails on a ticket with an invalid status or a Blocked-by reference
   to a ticket file that does not exist; the self-test proves both failure modes.
3. A plan template for tier L exists (migration/rollback, verification approach) and states
   that build order is owned by the ticket graph. Listed in the docs manifest.
4. STATE.md guidance: for ticketed work, `Now ▶` points at the frontier ticket (the first
   ticket whose blockers are all done), one ticket per fresh session.

Spec quality:

5. The `spec` skill instructs an interview before writing: one question at a time, each with a
   recommended answer; facts are looked up in the repo, decisions are put to the owner; and an
   explicit confirmation gate ("shared understanding confirmed") replaces bare sign-off.
6. The spec template gains a testing seams section (which stable interfaces the change is
   tested at, agreed before building) and suggests EARS phrasing for criteria (WHEN <condition>
   THE SYSTEM SHALL <behavior>) where it fits.
7. The spec template states the anti-staleness rule: no product source-code paths or line
   numbers inside specs; describe behavior, not layers. Framework artifacts (docs, skills,
   checks) may be named, they are the deliverable in this repo.

Code quality:

8. `node checks/check.mjs` fails when a source-code file exceeds its line budget (default 500,
   configurable per project in `checks/config.json`, with a marker-comment escape hatch); the
   self-test proves it. Governance-file budgets are unchanged.
9. `docs/standards/GLOBAL.md` names the numbers (code-file cap, function-length guidance),
   the deep-modules principle (small stable interfaces over shallow pass-through modules), and
   the TDD rule: red before green at pre-agreed seams, refactoring belongs to review.
10. A `code-review` skill exists and is registered in AGENTS.md: two independent axes run with
    fresh context where the tool supports it: (a) standards conformance, including a named
    baseline of about 12 classic code smells; (b) spec fidelity, quoting the spec line for
    each finding. Findings are reported by severity; the two axes are never merged into one
    ranked list.

Token discipline:

11. A domain glossary mechanism exists: a CONTEXT.md template (term, one-to-two-line
    definition, Avoid-list of banned synonyms), listed in the docs manifest and wired into the
    `begin`, `scope`, and `spec` skills so terms are captured where they first appear.
12. The AGENTS.md efficiency section states: one ticket per fresh session; checkpoint
    activates at ~15% context, stretching to at most ~40% is the owner's call and only when
    finishing the current unit of work first is clearly better; past ~40% always checkpoint.
    The repo `checkpoint` skill carries the same rule.
13. A decision record explains the ticket layer as a refinement (not reversal) of decision
    0004: right-sizing stays, decomposition becomes trackable.

Clean copies (zero maintainer context in a user's repo):

14. `begin` step 1 (Clean the copy) also deletes any non-archived `docs/specs/[0-9]*` folder
    found in a fresh copy: in-flight specs are Groundwork's own maintainer work and never the
    new owner's.
15. This spec itself is never archived into the tracked repo. On completion its folder is
    deleted; the decision record and git history are the durable record. The worked example
    that ships in `docs/specs/archive/` is a compact fictional product spec (spec.md plus two
    tickets) so users see the format without any Groundwork-development context.

## Not in this change

- A wayfinder-style planning skill (the interview step plus tickets cover most of it; revisit
  when a real project hits a too-big-for-one-map case).
- GitHub or Linear issue sync for tickets (markdown in the repo is the portable default).
- A database-backed tracker (Beads-style) or ready-work CLI; the frontier rule is enough.
- Spec Kit-style constitution pipeline (AGENTS.md plus checks already own that role).
- Micro-task granularity (2-5 minute steps); tickets stay session-sized.
- A CONTEXT-MAP.md convention for multi-context monorepos (for example several apps on one
  database); record the need, design it when the first such project starts.

## Risks & open questions

- AGENTS.md sits near its 150-line budget; the efficiency additions must fit by tightening
  existing lines, never by weakening the `budget-agents` check.
- The code-file cap must not fire on vendored or generated files; the check needs the same
  exclude discipline as the secrets check.
- EARS is a suggestion, not a mandate; enforcing it mechanically would recreate the ceremony
  decision 0004 rejected.
