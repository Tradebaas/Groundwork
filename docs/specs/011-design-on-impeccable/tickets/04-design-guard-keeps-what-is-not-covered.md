# 04: design-guard judges what impeccable does not

- **Blocked by:** 03-retire-taste.md
- **Status:** ready
- **Traces to:** BRIEF SC-8

**What to build:** One judgment check before delivering user-facing output, with no duplicated
lists. Impeccable owns the frontend, so `design-guard` stops restating its rules and keeps the
ground it actually covers: generated documents, e-mails, error messages, exports, and anything
rendered on a platform impeccable does not carry.

For a frontend, `design-guard` re-checks the rendered result against its own direction contract and
the finish verdict, and reports what is still open. It never re-opens a hunt the finish reviewer
already closed.

**Acceptance:**

- [ ] `design-guard` no longer restates rules that impeccable's craft floor owns; what remains is
      what it alone covers, plus the render check against the direction contract.
- [ ] Output that is not an interface (a generated document, an e-mail, an error message) is still
      fully covered, proven on a real example.
- [ ] Platforms impeccable does not carry (game engines, console and embedded interfaces) are named
      as this skill's ground, so nobody assumes coverage that does not exist.
- [ ] `verify` still routes a UI change to the right check, and its pointer is correct.
- [ ] The accessibility floor and its link to COMPLIANCE.md survive the edit unchanged.
- [ ] `node checks/check.mjs` and the self-test suites stay green.
