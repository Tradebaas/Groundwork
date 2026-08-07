# 01: the payload installs, and every gate stays green

- **Blocked by:** none
- **Status:** done
- **Traces to:** BRIEF SC-8

**What to build:** A Groundwork project can install impeccable at its current release, and the
repo stays honest about it: the checks pass with the payload present, the payload is not committed,
and anyone can see from one command whether the design method is installed here.

This is the tracer. It runs on this repo, which has its own frontend (the explainer page and the
cockpit), so the path is proven on real files rather than on a fixture alone.

**Acceptance:**

- [x] `node checks/design-method.mjs --install` completes in this repo and leaves a usable skill
      behind, reachable through the `.claude/skills` symlink. It runs
      `npx impeccable@latest install --providers=claude --scope=project`, then moves the payload
      to `.agents/skills/impeccable` and restores the symlink, because upstream deliberately
      drops a `.claude/skills` link that points at another provider's skills dir. Rerunning it is
      a no-op: the second run refreshes through the symlink and leaves it standing.
- [x] The install refuses early and says why when Node is below what impeccable requires, instead
      of half-writing. The requirement is read from the package's own `engines.node` (22.12 or
      newer at v3.5.0), never typed into our text where an upstream bump would leave it stale.
- [x] `checks/config.json` declares the payload path as third-party, with the reason written in the
      entry, and `config-invariants` accepts it while still rejecting an entry that would hide
      `docs/standards/`, one that would hide `checks/`, and one that gives no reason.
- [x] `node checks/check.mjs` passes with the payload installed. Specifically: prose style, the
      denylist, the agent-file cap, the code-file cap, the deferral contract, zombie code, the
      skills registry and the document map do not measure it. The secrets gate still reads it.
- [x] An undeclared directory holding the same banned typography still fails prose style, proven by
      a fixture in the existing runner suite.
- [x] A declared third-party skill directory does not have to appear in the AGENTS.md skills table,
      while an ordinary skill still fails when it is missing from the table. Both proven by
      fixtures, and the explainer's skills count leaves the installed payload out, so the page
      states the same number on a fresh clone as on a machine that has run the install.
- [x] `.gitignore` ignores the payload and keeps impeccable's shared artifacts tracked
      (`.impeccable/config.json`, `.impeccable/design.json`, `.impeccable/critique/`), following the
      block impeccable documents, with our own marker comment saying where it came from.
- [x] `node checks/check.mjs` reports the design method beside hooks, CI and adapter hooks, in both
      states: installed with its version, or not installed.
- [x] The self-test suites and the drill stay green.

**What the tracer found, and what it cost:**

- **Upstream removes our symlink on purpose.** `.claude/skills -> ../.agents/skills` is what
  impeccable calls a legacy in-project provider link, and its installer drops it so each harness
  gets its own compiled build. The route installs the Claude build and then restores decision
  0002's arrangement, which also keeps the Claude-only frontmatter (`user-invocable`,
  `allowed-tools`) that the Codex build does not carry. The `skills-symlink` gate is the net if a
  future release changes this again.
- **The declaration needed a home, and check.mjs was at its cap.** `config-invariants` moved to
  `checks/check-config.mjs` with its own suite, the same split `code-file-cap` forced on PR #69.
  The gate registry is unchanged: same names, same count.
- **`code-file-cap` was reading the exclusion list itself** instead of the runner's one reader,
  so the two could drift. It now uses `isVendored`, which is what that reader exists for.
- **The document map leaves the payload out, and that one is precaution rather than repair.**
  Measured: the 40 markdown files impeccable ships hold zero broken asserted links today, so the
  links gate would have stayed green. What it would not have stayed is readable: the map went from
  97 documents to 137, burying what this project actually says under somebody else's pages, and an
  upstream typo in a release we do not control would turn a gate red on a file we cannot fix.
- **Not done here:** the install runs with `--no-hooks`, so nothing is wired into
  `.claude/settings.local.json` yet. The detector becomes a CI gate and an edit hook in ticket 05,
  which is where that belongs.
