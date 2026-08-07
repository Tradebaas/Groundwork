# 011: design runs on impeccable, and the owner decides at three points

- **Status:** done <!-- all twelve criteria met; 1, 2 and 4 exercised on a scratch project 2026-08-07 -->
- **Verified:** 2026-08-07, `verify` over the whole spec. Criterion 1 on a scratch copy of this repo
  (fresh copy reports the method not armed, `--install` prints `impeccable 4.0.4 installed`, payload
  gitignored, symlink restored, `check.mjs` green). Criterion 2 by cutting the network at the
  registry: one line, exit 1, nothing written, setup continues; the Node-floor refusal proven the
  same way. Criterion 4's first approval point end to end: the roll assigned, the decision page
  served and blocked on the owner, the choice came back, and the project held no artifact code at
  that moment. Approval points 2 and 3 could not be exercised without a real surface to build and an
  owner to answer; what that surfaced about the finish reviewer on this harness is written into the
  `design` skill.
- **Traces to:** BRIEF SC-8 ("What ships does not read or look machine-made: the design and the
  words follow a system the owner chose") plus the owner's explicit request of 2026-08-05:
  "Ik wil https://github.com/pbakaus/impeccable vooral als de methodiek om het design te maken.
  Laat het werken met wat we al hebben staan."
- **Owner sign-off:** Getekend 2026-08-05 door de eigenaar: impeccable wordt de methodiek om
  design te maken, de zes forks staan zoals ze beantwoord zijn, en de bouw begint bij ticket 01.
- **Ownership of SC-8:** the archived baseline spec 000 shipped SC-8's first version and stays the
  record of it. From this spec on, the design half of SC-8 (how an interface is made and judged) is
  owned here; the words half stays with VOICE.md and the prose gate.

## Why

Groundwork's design layer is three skills and two documents, and it has no mechanical floor at
all: of the 22 gates, not one looks at a rendered interface. Beyond that, the owner sees the work
exactly once, at `design` step 5, after the visual direction has already been chosen by the model
and built. Everything before that moment is model taste, and the failure mode this repo cares
about most, output that reads as machine-made, is decided in precisely that unwatched stretch.

Impeccable (Apache-2.0, v3.5.0 at the time of writing) closes both halves. Its method picks a
visual world out of seven candidates drawn from the audience's own culture, hands the choice to
the owner on a browser decision page with palettes, first viewports and honest risks, renders
compositions for approval before code exists, builds against the approved composition, and closes
with a review by an agent that never saw the build thread. Underneath that sits a deterministic
detector: 59 rules, no model, no API key, the shape of a gate this repo already knows how to run.

The owner's requirement is control that arrives in time to change the outcome, on any product
type, at a level that reads as the work of a senior studio.

## What: acceptance criteria

1. WHEN `begin` sets up a project whose product has a user interface, THE SYSTEM SHALL install
   impeccable at its current release into that project and report the installed version to the
   owner. A project with no interface is not made to carry it.
2. WHEN the installation cannot complete (no network, no npm, a refused download), THE SYSTEM
   SHALL say so in one line, record the gap in STATE.md, and continue setup rather than failing
   the project.
3. WHEN impeccable is installed, `node checks/check.mjs` SHALL pass unchanged. Its payload is
   declared third-party in `checks/config.json`, which exempts it from the gates that measure this
   project's own writing (prose style, denylist, agent-file cap, code-file cap, the deferral
   contract, zombie code), from the skills registry and its count, and from the document map that
   the links gate and the board draw. Every other gate, the secret scan included, still applies to
   it, and `config-invariants` still bounds the list: a declaration states its reason and may not
   reach `checks/` or `docs/standards/`.
4. WHEN a new surface or a replacement visual world is built, the owner SHALL be asked at three
   points, in this order: the visual direction, the rendered compositions, and the finish verdict.
   No production code for a new visual world is written before the direction is chosen, and the
   finish verdict is reported with its open items intact, never summarized into a pass.
5. `docs/DESIGN.md` sections 1 and 2 (the ten principles and the owner's standing taste)
   SHALL remain binding input that impeccable reads before choosing a direction, and section 3
   SHALL be written from the built world after the finish review, not before the build.
6. PRODUCT.md SHALL hold only what `docs/product/BRIEF.md` does not already own (platform, stack,
   brand commitments, evidence on hand, accessibility needs) and SHALL point at BRIEF.md for
   scope, users and purpose. No fact is stated in both files.
7. The skill `taste` SHALL be gone: removed from `.agents/skills/`, from the AGENTS.md table, and
   from every pointer that names it, with decision 0012 marked superseded and its retired wording
   added to the denylist.
8. `design-guard` SHALL no longer restate the frontend build rules. It judges user-facing output
   that impeccable does not cover (documents, e-mails, error messages, generated files) and
   re-checks a rendered interface against its direction contract.
9. WHEN the project has a frontend, `stack` SHALL wire the impeccable detector into CI beside the
   ecosystem's own typecheck, lint and tests, and the edit hook SHALL be installed so tells surface
   while the code is being written. `stack-gates` SHALL count the detector as wired only when the
   CI job actually runs it.
10. `maintain`'s dependency round SHALL refresh impeccable, so "the current release" stays true
    after the first day.
11. A decision record SHALL carry the whole choice: why an external methodology beats another
    in-house skill, what it supersedes, and what it costs.
12. `node checks/check.mjs`, `node checks/progress.mjs`, the links gate and the self-test suites
    SHALL be green at the end, and no document SHALL still describe the retired arrangement.

## Failure modes

- **Install fails (offline, proxy, npm refusal).** The owner sees one line naming what failed and
  what design work is unavailable until it is installed; setup continues; the gap lands in STATE.md
  as a named blocker. Nothing silently falls back to model defaults without saying so.
- **Upstream renames or restructures the payload.** Our pointers name the skill and its commands,
  never internal file paths, so a rename degrades to "the command was not found" instead of a
  broken repo. The third-party declaration is a path prefix, which survives internal moves.
- **A project sits below the Node version impeccable requires.** The install step reads that
  requirement from the package that states it (`engines.node`, 22.12 or newer at v3.5.0) and
  refuses before writing anything, rather than half-installing. The floor is never typed into our
  own text, so an upstream bump does not leave a stale number behind.
- **The detector's dependencies fail to resolve in CI.** The detector job fails loudly like any
  other gate. It never gets skipped to make a build green.
- **Payload absent on a fresh clone.** The payload is gitignored, so a clone starts without it.
  `enforcement.mjs` reports the design method as not installed, in the same line where it already
  reports hooks and CI, so the state is visible rather than assumed.

## Settled decisions

- **Installed per project at its current release, never vendored into Groundwork.** The owner asked
  for the latest version, always. A vendored copy pins a version and turns every upstream release
  into hand work, which decision 0017 accepts for our own text but would be a poor trade for 2.3 MB
  of somebody else's.
- **The payload is gitignored, like a dependency.** It is reinstalled and refreshed, not committed.
  The shared artifacts impeccable produces (`.impeccable/config.json`, `design.json`, the critique
  reports) stay tracked, per its own documented split.
- **The gates declare it third-party rather than measure it.** Chosen by the owner on 2026-08-05.
  This repo's house style governs what this repo writes; measuring an external skill's prose would
  force a patch on every update, which is the drift that makes "always current" impossible. The
  declaration is one list in `checks/config.json`, in the open, bounded by `config-invariants`.
- **`taste` is retired rather than kept beside it.** Chosen by the owner on 2026-08-05. Its rules
  are covered by impeccable's craft floor and Persuade mode; two anti-slop rulebooks side by side
  is the situation AGENTS.md exists to prevent.
- **DESIGN.md's world is written after the build.** Chosen by the owner on 2026-08-05, following
  impeccable's own reasoning: a rulebook written before the build gets defended against reality.
  The owner's principles and standing taste keep their place as input that binds the choice.
- **Three approval points, not two and not four.** Chosen by the owner on 2026-08-05. Live browser
  iteration stays available on request rather than becoming a per-screen obligation.
- **The detector runs in CI and as an edit hook.** Chosen by the owner on 2026-08-05. It is the
  first mechanical check on rendered quality this framework has ever had.

## Testing seams

- `checks/check.mjs` plus its self-test suite: the third-party declaration is proven by a fixture
  that puts a file with banned typography inside a declared payload path and asserts the run stays
  green, and a second fixture that asserts an undeclared path still fails.
- `checks/enforcement.mjs`: the design-method line is asserted in both states, installed and not.
- `checks/check-stack.mjs`: the detector counts as wired only when the CI workflow runs it, proven
  the way the existing stack gates are proven.
- The skills registry gate: a fixture asserts a declared third-party skill directory does not have
  to appear in the AGENTS.md table, while an ordinary skill still must.
- The links gate and `docs/README.md` manifest: every pointer this change moves is proven by the
  gates that already own it.

## Not in this change

- No product is built to demonstrate the methodology. The owner's standing call on proof holds.
- No change to VOICE.md or the prose gate: language rules are not what this change touches.
- No native or game-engine design guidance beyond what impeccable ships (web, iOS, Android,
  adaptive). Unity, Godot and console interfaces stay with `design-guard` and are named as a limit,
  not silently implied to be covered.
- No replacement of `docs/design/reference/ui-library-showcase.html` or the UI-foundation decision
  (0009). The foundation choice stays a Groundwork decision that impeccable builds within.
- No change to the cockpit, the explainer or the gate count they state.

## Risks and open questions

- **Node floor.** Impeccable requires Node 22.12 or newer (its own `engines.node` at v3.5.0),
  while which Node this repo's gates target is still open (intake row 50). This change states the
  requirement for the design method only, and does not settle the gates' own floor.
- **Two interviews at project start.** `begin` already interviews the owner, and impeccable's init
  interviews again for product truth. Ticket 02 must feed what `begin` already knows into init so
  the owner is not asked the same thing twice. If that cannot be made clean, the honest fallback is
  to let init ask only its platform and stack questions.
- **A third-party methodology can move under us.** The mitigation is that our pointers name
  commands, not internals, and that `maintain` refreshes deliberately rather than automatically.
