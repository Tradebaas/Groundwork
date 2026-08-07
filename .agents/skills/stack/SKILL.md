---
name: stack
description: Choose the tech stack or target platform and make the project idiomatic for it. Covers classic code stacks and hosted/low-code platforms alike (own servers, Microsoft Power Platform/Dataverse, ServiceNow, Salesforce, Google, or whatever exists by then). Use when the target platform/stack must be decided, when generating docs/standards/<stack>.md, or when wiring stack-specific quality gates into CI and hooks. Requires live research. Never stack facts from model memory.
---

# stack: choose deliberately, then be born current

"Stack" here means whatever the product is built *on*: a language and framework on
self-chosen infrastructure, or a hosted platform where the product is largely configured
(Power Platform, ServiceNow, Salesforce, Google's builders, or any successor). This skill
carries a method, not a platform table; every platform fact is looked up live from the
vendor's current official documentation, so platforms and practices that appear after this
skill was written are in scope automatically.

## 1. Decide the stack: options on merit

Derive candidates from BRIEF.md (target, users, constraints, integrations, team). Hosted
platforms are candidates on equal footing when the brief points there (existing tenant,
licensing, citizen-developer handover). Present 2-3 genuinely different options with honest
trade-offs (fit, ecosystem maturity, hiring/handover, cost, compliance implications, e.g. EU
data residency of managed services). Recommend one; the owner confirms. Record as a decision
record with the options and the reason.

**Verify before recommending.** Versions, support status, pricing, EU-residency: check current
authoritative sources (official docs, release pages). Model memory is a rumor with a cutoff.

## 2. Generate `docs/standards/<stack>.md`

Research what a top engineer in *this* ecosystem does **today**, from primary sources, and write
it down with versions, dates, and source links.

Head the file with what its readers depend on: the stack's name and version, whether it is a
hosted platform (and which one), and the date these facts were last verified against primary
sources. That header carries weight elsewhere - the platform line is what switches on the
platform route in `code-review`, `debug`, `maintain` and `deliver`, and the date is what
`maintain`'s quarterly audit tests for staleness. A file with no platform line reads downstream
as "not a platform", so a platform project that omits it loses all four routes silently. Then
cover at least:

- Project layout for this stack (senior-readable, conventional, not invented).
- Language/framework idiom: the current blessed patterns, and the deprecated ones to refuse.
- Tooling: formatter, linter, type checking, test framework, dead-code detection: exact tools
  and versions, with config that enforces strictness (strict typecheck catches most AI slips).
- Dependency policy for this ecosystem (lockfiles, audit tooling, update cadence).
- Errors & observability, implementing the GLOBAL.md floor in this ecosystem: the error idiom
  (exceptions, Result types, or error returns), global-handler wiring, the structured-logging
  library and its config, correlation-ID propagation, and the retry/circuit-breaker library
  for remote calls.
- Lint rules that make swallowed errors mechanically impossible here (empty catch blocks,
  unhandled promises or ignored error returns, debug leftovers such as stray print/log
  statements): name the exact rules and wire them into the gates in step 3.
- The stack's sharp edges: the 5-10 mistakes agents actually make here.

`GLOBAL.md` still applies; the stack file only adds or, with stated reason, overrides.

## 3. Scaffold and wire the gates

- Scaffold the conventional project structure (official generator where one exists).
- Wire the gate chain so it runs the same everywhere:
  - **pre-commit** (`checks/hooks/pre-commit`, versioned): append fast checks (format, lint
    staged) after the Groundwork line. Cheap first.
  - **CI** (`.github/workflows/ci.yml`, or this host's equivalent): the full authority:
    checks, typecheck, lint, tests, build, secret scan. Replace the placeholder stage;
    CI must fail on any gate.
  - **Supply-chain floor**, as soon as the stack has dependencies: an SBOM (software bill of
    materials) of at least top-level dependencies - the CRA legal floor - plus dependency
    audit and license scan, all wired into CI with this ecosystem's current tools.
  - **Design detector**, when the product has a user interface: a CI stage that runs the design
    method's own detector over the surfaces this project ships, beside the typecheck and the
    tests. It is deterministic, model-free and needs no key, so it belongs with the mechanical
    gates rather than with the design skill. Give the stage a runner that meets the method's
    stated `engines.node`, which can be higher than the one the rest of CI uses:

    ```yaml
    - name: The shipped surfaces carry none of the tells this framework refuses
      run: npx -y impeccable@latest detect <the paths this project ships>
    ```

    No `continue-on-error` and no fallback: a detector that cannot install is a red job, because
    a green tick standing for a scan that never ran is worse than no scan. `stack-gates` reads
    this stage and counts the detector as wired only when a workflow actually runs it. The edit
    hook needs nothing here: it is installed with the payload by
    `node checks/design-method.mjs --install`, and it reports while the code is being written.
    Run the CI command itself to reproduce a CI finding locally. Measured on 2026-08-07: the
    detector bundled with the installed payload reports less than the published CLI on the same
    file (9 findings against 0 on this repo's own page), so the hook's silence is not the gate's
    verdict.
- Add this ecosystem's file extensions to `extraTextExtensions`/`extraCodeExtensions` in
  `checks/config.json` so the denylist/secrets/zombie checks cover the product code.
- Add the chosen tools' commands to the stack standards file so any agent can run them. Where
  the detector is wired, that file also says what it looks at (the tells a rendered interface
  gives away: type, layout, color, motion, contrast, design-system drift) and how a false
  positive is retired: the narrowest exception that fits, recorded with its reason in
  `.impeccable/config.json` through the method's own `hooks ignore-value` command, never by
  editing the config by hand and never by widening the rule off the whole project. A finding
  nobody examined is not a false positive.
- Prove the gates work: introduce a deliberate violation, watch the gate fail, revert.
  An untested gate is false confidence.

## Platform route: when the product is configured, not coded

When the chosen stack is a hosted platform, the same four steps apply with these mappings.
Research each mapping live in the vendor's current ALM/DevOps documentation for that platform;
name the doc and date in the standards file.

- **Source in git stays the rule.** Use the platform's official route to bring configuration
  under version control (solution/app export tooling, source-control integration, IaC where
  offered). The repo remains the review surface and the undo button; work never lives only in
  the platform's editor.
- **Standards file covers the platform's craft**, from primary sources, current: environment
  strategy (dev/test/prod), naming conventions, the platform's blessed patterns and the
  deprecated ones, connector/integration governance, licensing and cost traps, EU data
  residency, and the 5-10 mistakes builders actually make on this platform today.
- **Map every gate to the platform's equivalent** (built-in analyzers, solution checkers,
  automated test support, pipeline tooling). A gate with no platform equivalent becomes a named
  manual check in the standards file and a `defer:` entry, never a silent drop.
- **Verify means the platform's runtime**: exercise the flow, app, or generated document in a
  real dev environment, not just a clean export.

## 4. Record

Decision record written; BRIEF.md target/stack line filled; STATE.md updated (phase, gates,
next step, usually `architect`). Retired assumptions (old candidate stacks in docs) → denylist. ⚓
