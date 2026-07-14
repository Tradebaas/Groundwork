---
name: spec
description: Right-size and write the spec before building any change. Use before starting non-trivial work, when the user requests a feature, or when deciding whether something needs a spec at all. Prevents both drift (building unspecified things) and ceremony (specs for bugfixes).
---

# spec: as much process as the change deserves, and no more

## 1. Pick the tier: argue it, don't default upward

- **S: no spec.** Small, clear, reversible: bugfix, copy change, config tweak, single-file
  change with obvious behavior. The commit message and a test are the record. If you're
  explaining the tier choice in more than a sentence, it isn't S.
- **M: spec.md only.** A feature or change in one area, buildable in a session or two.
- **L: spec.md + plan.md.** Multi-session, multi-area, risky, or contested. Copy
  `docs/specs/TEMPLATE-PLAN.md` to plan.md: build order (owned by the ticket graph),
  seams/interfaces touched, migration/rollback, verification approach.

Two honest tests: *Would a senior write this down first?* and *Will anyone need to know why in
three months?* Yes to either → at least M.

## 2. Tier M and L: interview before writing

Build shared understanding first; a finished draft the owner can only react to is not that.
Tier S is exempt: a bugfix gets no interview. Four rules:

- **One question at a time.** Each question comes with your recommended answer and a one-line
  reason, so the owner can accept the default or push back cheaply.
- **Facts are looked up, never asked.** Whatever the repo, the docs, or the code can answer,
  you answer yourself before asking anything.
- **Decisions are put to the owner, never assumed.** Scope, trade-offs, and preferences are
  the owner's; surface each one as a question, however obvious the answer seems.
- **Pin fuzzy terms as they surface.** A word with two possible meanings goes into the glossary
  `docs/product/CONTEXT.md` right then, so the spec uses one word for one thing.
- **Write only after confirmation.** Close the interview by playing back your understanding in
  a few lines and asking the owner to confirm it. Only then start writing. Record the
  confirmation (date plus the owner's words) in the spec's sign-off line; it replaces a bare
  "approved".

## 3. Write it

Copy `docs/specs/TEMPLATE.md` to `docs/specs/<NNN>-<slug>/spec.md` (NNN = next number).
The parts that matter most:

- **Traces to** a BRIEF SC-item or an explicit request: no trace, no build (run `scope` first).
- **Acceptance criteria**: numbered, testable, phrased as observable behavior. These become the
  verification checklist; write them so `verify` can execute them without interpretation.
- **Not in this change**: the adjacent work you are deliberately not doing. This line is what
  keeps "while I'm here" out of the diff.
- **Settled decisions**: choices made during the interview, each with its one-line reason.
  Later sessions build on these instead of re-opening them; only the owner re-opens a settled
  decision. This section is what stops a fresh context from re-litigating the design.

## 4. Tier L (and multi-session M): cut tickets

When the work will not fit one session, decompose the spec into tickets before building. Copy
`docs/specs/TEMPLATE-TICKET.md` to `tickets/<NN>-<slug>.md` inside the spec folder, one file
per slice, numbered in rough build order.

- **The first ticket is a tracer bullet.** The thinnest end-to-end slice that touches every
  layer involved and proves the shape works, verified before anything widens. Later tickets
  expand from it; never build broad before one narrow path runs for real.
- **Slice vertically.** Each ticket cuts a narrow but complete path through every layer
  involved and is demoable or verifiable on its own. Never one layer per ticket.
- **Size to one fresh agent session.** Too big to finish with context to spare? Split it.
- **Declare edges.** `Blocked by:` names the sibling tickets that must be `done` first; the
  ticket graph owns the build order.
- **Build on the frontier.** Work the lowest-numbered ticket whose blockers are all `done`,
  one ticket per fresh session, clear context between tickets. STATE.md `Now ▶` points at the
  frontier ticket. Statuses: `ready | building | done`.

## 5. Sign-off and build

M and L need owner sign-off before building starts. The sign-off is the interview's
shared-understanding confirmation, recorded in the spec header; if the written spec drifted
from what was confirmed, go back to the owner before building. Set spec status `building`,
note it in STATE.md, build one criterion at a time (one ticket at a time when the spec has
tickets).

## 6. Converge when it ships

On done (with `verify` green): status `done`; reconcile every doc the change made stale: update
the owning file, add retired wording to the denylist in `checks/config.json`; move the folder to
`docs/specs/archive/`. A spec that contradicts shipped reality is worse than no spec. ⚓
