# 05: the first mechanical check on rendered quality

- **Blocked by:** 01-install-route-and-declaration.md
- **Status:** done
- **Traces to:** BRIEF SC-8

**What to build:** A project with a frontend cannot ship a page full of the tells this framework
says it refuses. The deterministic detector runs in CI beside the ecosystem's own typecheck, lint
and tests, and it runs on the developer's edits while the code is being written.

**Acceptance:**

- [ ] `stack` wires the detector into the CI workflow it generates, for projects with a frontend,
      and says in `docs/standards/<stack>.md` what it checks and how a false positive is waived.
- [ ] The edit hook is installed with the payload and reports findings while building.
- [ ] `stack-gates` counts the detector as wired only when the CI workflow actually runs it, the
      same evidence rule the existing stack gates use, proven by a fixture in both directions.
- [ ] A page carrying a known tell fails the CI job; the same page with the tell removed passes.
      Exercised for real on this repo's own explainer page in a scratch branch, not reasoned about.
- [ ] Waivers are visible: a rule ignored for a file states its reason in the config, which is what
      impeccable's own ignore mechanism records.
- [ ] The detector's own dependency failures fail the job loudly; nothing skips to green.
- [ ] `node checks/check.mjs` and the self-test suites stay green.
