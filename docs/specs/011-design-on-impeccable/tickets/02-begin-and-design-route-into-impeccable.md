# 02: setup installs it, and design work runs through it

- **Blocked by:** 01-install-route-and-declaration.md
- **Status:** done
- **Traces to:** BRIEF SC-8

**What to build:** Someone starting a project that has an interface gets the design method
installed during setup, without answering the same interview twice, and the first real screen is
built through impeccable with the owner deciding at three points: the visual direction, the
rendered compositions, and the finish verdict.

`design` stops being a method of its own and becomes the Groundwork side of the seam: it carries
what is genuinely ours (the owner's principles and standing taste as binding input, the UI
foundation decision, the language and accessibility floor) and hands the making of the design to
impeccable.

**Acceptance:**

- [x] `begin` asks once whether the product has a user interface, and installs impeccable only then,
      reporting the installed version.
- [x] A failed install is reported in one line naming what is unavailable, lands in STATE.md as a
      named blocker, and does not stop setup.
- [x] What `begin` already captured (users, purpose, positioning, constraints) reaches impeccable's
      init instead of being asked again; the owner is asked only what init genuinely adds.
- [x] `design` names impeccable as the method for making an interface, and states the three
      approval points as the order of work.
- [x] DESIGN.md sections 1 and 2 are handed over as binding input before a direction is chosen, and
      a direction that ignores them is sent back rather than accepted.
- [x] The UI-foundation choice (decision 0009) still happens on the Groundwork side and still lands
      as a decision record.
- [x] Exercised for real: one small surface is taken from nothing to a built screen, and the owner
      is asked at all three points, with no production code for the visual world written before the
      direction is chosen.
- [x] `node checks/check.mjs` and the self-test suites stay green.

**What the run measured** (scratch project, not in this repo; the owner chose a throwaway so no
product is built here to demonstrate the methodology):

- The three points held. The owner re-rolled once, chose a challenger over the assigned direction,
  picked composition C of three, and received the finish verdict as `disposition: fix` with six
  open items, reported unsummarized.
- **Finding, now written into `design`: without image generation the decision page is rigged.**
  Catalogue challengers carry hosted reference plates while the assigned direction and the standing
  exit render empty slots. The remedy that worked is drawing every card's sketch as flat SVG through
  one shared frame.
- **Finding, left open:** the shipped `impeccable-finish-reviewer` is not registered as an agent in
  this harness, so the review ran in-thread from `degraded/finish-reviewer.md` and inherited the
  build thread's framing. That is the method's own fallback, disclosed as it requires, but a review
  that cannot get fresh eyes is weaker than the one the spec assumes.
- Chrome's window minimum (485px here) makes `--window-size=390` a crop rather than a mobile
  layout, so a mobile screenshot taken that way misreports overflow. Driving the viewport over CDP
  is what measures it.
