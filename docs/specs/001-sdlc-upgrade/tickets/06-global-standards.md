# 06: GLOBAL.md standards upgrade

- **Blocked by:** none
- **Status:** ready

**What to build:** A developer (or agent) reading `docs/standards/GLOBAL.md` finds numbers,
not only adjectives: the code-file cap (500 lines, and aim well under it), function-length
guidance (a function that no longer fits on a screen is doing two jobs), the deep-modules
principle (few small stable entry points hiding real implementation depth, no pass-through
layers), and the TDD rule: red before green at seams agreed in the spec, refactoring belongs
to the review stage, never mixed into the implementing diff.

**Acceptance:**

- [ ] GLOBAL.md names the file cap and points at the `code-file-cap` check as enforcement
- [ ] Deep-modules principle stated in two or three plain sentences
- [ ] Red-before-green at pre-agreed seams stated; refactor-at-review stated
- [ ] File stays lean (under 60 lines) and `node checks/check.mjs` green
