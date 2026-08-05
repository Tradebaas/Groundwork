# 02: setup installs it, and design work runs through it

- **Blocked by:** 01-install-route-and-declaration.md
- **Status:** ready
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

- [ ] `begin` asks once whether the product has a user interface, and installs impeccable only then,
      reporting the installed version.
- [ ] A failed install is reported in one line naming what is unavailable, lands in STATE.md as a
      named blocker, and does not stop setup.
- [ ] What `begin` already captured (users, purpose, positioning, constraints) reaches impeccable's
      init instead of being asked again; the owner is asked only what init genuinely adds.
- [ ] `design` names impeccable as the method for making an interface, and states the three
      approval points as the order of work.
- [ ] DESIGN.md sections 1 and 2 are handed over as binding input before a direction is chosen, and
      a direction that ignores them is sent back rather than accepted.
- [ ] The UI-foundation choice (decision 0009) still happens on the Groundwork side and still lands
      as a decision record.
- [ ] Exercised for real: one small surface is taken from nothing to a built screen, and the owner
      is asked at all three points, with no production code for the visual world written before the
      direction is chosen.
- [ ] `node checks/check.mjs` and the self-test suites stay green.
