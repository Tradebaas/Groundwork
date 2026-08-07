# 05: the first mechanical check on rendered quality

- **Blocked by:** 01-install-route-and-declaration.md
- **Status:** done
- **Traces to:** BRIEF SC-8

**What to build:** A project with a frontend cannot ship a page full of the tells this framework
says it refuses. The deterministic detector runs in CI beside the ecosystem's own typecheck, lint
and tests, and it runs on the developer's edits while the code is being written.

**Acceptance:**

- [x] `stack` wires the detector into the CI workflow it generates, for projects with a frontend,
      and says in `docs/standards/<stack>.md` what it checks and how a false positive is waived.
- [x] The edit hook is installed with the payload and reports findings while building.
- [x] `stack-gates` counts the detector as wired only when the CI workflow actually runs it, the
      same evidence rule the existing stack gates use, proven by a fixture in both directions.
- [x] A page carrying a known tell fails the CI job; the same page with the tell removed passes.
      Exercised for real on this repo's own explainer page in a scratch branch, not reasoned about.
- [x] Waivers are visible: a rule ignored for a file states its reason in the config, which is what
      impeccable's own ignore mechanism records.
- [x] The detector's own dependency failures fail the job loudly; nothing skips to green.
- [x] `node checks/check.mjs` and the self-test suites stay green.

**What the first mechanical look at a rendered page found:**

- **Proven on real CI, both directions.** A gradient headline on `index.html` turned the `design`
  job red (run 31212639013 on a throwaway branch, deleted after); the page without it is green
  (run 31213510003). The `gate` and `drill` jobs stayed green through both, so the new job is what
  spoke.
- **The published CLI is stricter than the payload's own detector, by a lot.** Same file, same
  cwd, same package version: `npx impeccable@latest detect index.html` reported nine findings
  where the bundled `scripts/detect.mjs` reported none. Both engines were called directly to be
  sure it was neither project config nor the design-system context. So CI runs the published CLI,
  and `stack` says to reproduce a CI finding with the CI command, because the hook's silence is
  not the gate's verdict.
- **Three of the nine were real, and the page was fixed rather than waived.** A tracked-caps pill
  above the h1 (which also carried the all-caps finding), a heading jumping h2 to h4 with no h3 in
  between, and four declarations at 11.5px, below the 12px floor for body text. The owner chose
  the eyebrow fix; the other two are plain defects.
- **Four are waived, each scoped to the one file with its reason on the entry.** Three are
  `cramped-padding` on the stat strip, a measured false positive: the cells whose `padding-left`
  is zero are exactly the cells whose `border-left` is zero, and the static engine merges those
  selectors into one element flush against a border it does not have. A five-line fixture
  reproduces it, and removing the pairing clears it. The fourth is `flat-type-hierarchy`, waived
  on the owner's call with the measurement in the reason: the rule wants about 1.25x between every
  step, a 12.5/14/16 fixture still fires, and a two-step ramp would flatten this page's labels,
  chips and captions into body text. Two more waivers predate these, from the same run: Inter as
  the body face and the tool marquee, both confirmed by the owner.
- **The gate half needed a signal that survives a fresh clone.** The payload is gitignored, so
  "does this project have an interface" cannot be answered from disk. `.impeccable/config.json`,
  which the method writes and this repo tracks on purpose, is the declaration `stack-gates` reads.
  It was watched failing on this repo by commenting the stage out, not only in fixtures.
- **The runner is the design method's own floor, not the gates'.** The `design` job sets Node 22
  because impeccable's `engines.node` asks for 22.12 or newer; the jobs beside it stay on 20, so
  which Node the gates target (intake row 50) is still open and this ticket did not decide it.
- **Not done here:** `docs/design/reference/ui-library-showcase.html` stays out of the scan. Each
  of its pages mimics one UI library's look on purpose, so its two findings are the file doing its
  job. The cockpit is not scanned either: it renders on demand from `checks/cockpit-page.mjs` and
  is a local stand rather than a published surface.
