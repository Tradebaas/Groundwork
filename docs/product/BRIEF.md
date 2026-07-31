# BRIEF: what this project is and is not

<!-- This is Groundwork's OWN scope: the framework is dogfooded on itself, so the SC-id trace
     gate bites here too. Starting a project from a fresh copy? This file is not your template:
     `TEMPLATE-BRIEF.md` next to it is, and `begin` §1 puts it in place for you.

     Written 2026-07-26 in a scope session with the owner, from VISION.local.md. One person
     decides everything here, so no external sign-off exists; the discovery rows are still
     answered in full, because Groundwork is public software that other people depend on. -->

## Product

- **Name:** Groundwork
- **One sentence:** Groundwork lets one person build anything from a weekend project to
  enterprise-grade software with an AI agent, and stay secure, in scope and provably done
  while doing it.
- **Current situation & cost of doing nothing:** AI agents made building software cheap. They
  did not make judgment, memory, proof or restraint cheap. Without structure an agent starts
  every session with amnesia, drifts out of scope, agrees with bad ideas, ships the machine
  default look, and claims "done" without evidence. The builder carries that risk personally:
  rework, quality no serious client would accept, and no trail anyone can audit a year later.
- **Owner (decides scope):** Remon Panman
- **Target & stack:** plain Markdown, a dependency-free Node check script (Node >= 20), git
  hooks, GitHub Actions for CI and GitHub Pages for the explainer. Vendor-neutral on two open
  standards: AGENTS.md for the rulebook and Agent Skills for the method library.

## Users

One individual at the wheel. Team and organization features are out of scope, but the product
that individual builds may be any size, from a weekend project to enterprise-grade software.
Four situations the framework is built for:

- The consultant or implementer delivering on someone else's platform, who needs discovery that
  forces the why, the data sources and the definition of done.
- The builder without a code background, who cannot check the code personally and therefore
  needs an agent that is forced to verify, review and prove.
- The professional developer or junior, who wants senior discipline around their work without
  hiring the seniors.
- The owner of Groundwork itself: the framework is its own first reference customer.

## Stakeholders & sign-off

- The owner decides everything. There is no external sign-off, no sponsor and no committee.
- Adopters have influence through intake, not a veto.

## In scope

- SC-1 Someone copies the repo, or lays it over a project they already have, says "begin", and
  reaches a first governed commit with scope written, state on disk and gates running, without the
  maintainer.
- SC-2 Work nobody asked for is named and parked instead of built, and every change traces to
  a written scope item or a recorded request.
- SC-3 The project remembers itself: a new session, a different tool or a reader a year later
  picks up the state and the decisions from files, not from chat history.
- SC-4 Nothing non-trivial gets built before what it must do is written down, at a size
  proportional to the change.
- SC-5 A security and code-quality floor holds without the builder having to know the rules:
  input validation, authorization, error handling, no secrets in code, accessibility.
- SC-6 A claim of "done" carries evidence: the change was exercised end to end and reviewed
  with fresh eyes, and a failure is reported as a failure.
- SC-7 The EU and Dutch obligations that apply are identified, and each one has a dated
  verification against its real source.
- SC-8 What ships does not read or look machine-made: the design and the words follow a system
  the owner chose.
- SC-9 Releasing, running and handing over to another person or agent is a repeatable route,
  not an improvisation.
- SC-10 The owner sees where the project stands without reading the repo.
- SC-11 The written record never outranks the code: what the code can prove is not restated in
  prose, and where the two disagree the code is the fact and the document gets fixed.
- SC-12 Shortcuts are marked where they are taken and land in a ledger, so debt stays visible
  and small instead of invisible and permanent.

## Out of scope, explicitly

- An IDE, a CLI, an installer or a scaffolder. Groundwork is copied into place, whether or not a
  project is already there; there is nothing to run.
- A mechanism that pulls later framework changes into an existing copy. Improvements travel as a
  versioned release, a changelog and a written route the owner follows by hand (decision 0017);
  merging them safely into a project that has edited its own copy is a package manager, which is a
  second product.
- A code generator or a component library. It carries method, not implementation.
- Prebuilt stack, design or legal knowledge frozen into the repo. That knowledge is researched
  live at the moment of decision and written down with a date and a source. This is what keeps
  one small repo current without a rewrite.
- Team or organization features for the framework itself: shared dashboards, role management,
  multi-user workflow. One person is at the wheel.
- A paid tier, a license gate or a marketplace. MIT, free, no friction.
- A troupe of role-playing personas standing in for a team.
- A promise that no human has to think. At high stakes it complements a human audit, it does
  not replace one.
- Anything that only works in one agent tool. A capability that cannot degrade visibly
  elsewhere does not get built.
- Building and proving AI features inside the product being built (evals, prompt regression,
  non-determinism testing). Parked in intake; trigger: the first project with a real AI feature.

## Systems & integrations

- GitHub: the template and degit copy routes, Actions for CI, Pages for the explainer.
- git hooks and Node for the checks. No services, no accounts, no network at check time.
- The AGENTS.md and Agent Skills standards, and the agent tools through thin adapters.
- No systems of record, and no personal data processed by the framework itself.

## Constraints

- Zero runtime dependencies. The checks run on plain Node and test themselves.
- AGENTS.md stays at most 200 lines, enforced. Past that it silently stops governing.
- Source files stay well under the agent read window; a session checkpoints at about 15 percent
  of the context window, and 40 percent is the ceiling.
- English throughout the repo. Product-facing language is a per-project choice.
- MIT licensed, free, no paid tier.
- Vendor-neutral: never a forked rule set per tool. What only some tools enforce degrades
  visibly, never silently.
- Groundwork is itself software placed on the EU market, so the CRA and the PLD apply to it.
  See `docs/compliance/COMPLIANCE.md`.
- Run budget: a public repo plus Pages. No servers, no paid services, no operational cost.

## Rollout & adoption

Copy before the project exists (GitHub template or degit), then say "begin". A project that already
exists takes the same route with its own history kept: `begin` asks which of the two it is and
adapts (decision 0018). The explainer page is the front door, English first. Each release is tagged
and carries a changelog, so a copy can tell which Groundwork it holds and what has moved since
(decision 0017).

## Success criteria

Baseline is 2026-07-26. The owner is the reader for all five.

| Criterion | Baseline | Target | Read |
|---|---|---|---|
| A stranger reaches a first governed commit alone | never rehearsed by anyone but the maintainer | the copy to first commit route completes without help, twice in a row, on the two supported agent tools | 2026-09-01, then before every release |
| Others actually use it | 0 external adopters, 0 outside issues | 3 projects not owned by the maintainer, and at least 1 correction flowing back as intake | 2026-12-01 |
| The framework passes its own gates without special pleading | own brief blank, so the trace gate was inert on itself | gates green on main, own brief filled, every change traced | monthly, first read 2026-09-01 |
| It stays small enough to be read | AGENTS.md 126 lines, 21 skills, 16 decisions | AGENTS.md never over 200 lines, every addition names where it is paid | quarterly audit, first read 2026-10-01 |
| A skeptical reader finds the discipline real | never reviewed by an outsider | at least one external technical reader reports back, findings become intake | 2026-12-01 |
