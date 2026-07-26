<!-- BASELINE RECORD, not a plan. Groundwork was built before its own scope was written down, so
     on the day the brief landed eleven of its twelve capabilities already existed and none of
     them had a spec claiming it. Without this record the progress overview would report "0 of 12
     done" about a framework that ships, which is a false report about the project's own state.
     This is also the pattern for any brownfield project adopting Groundwork: write one baseline
     record of what already exists, then spec forward from there. -->

# 000: Baseline, what Groundwork already delivered when its scope was written

- **Status:** done
- **Traces to:** BRIEF SC-1, SC-2, SC-3, SC-4, SC-5, SC-6, SC-7, SC-8, SC-9, SC-11, SC-12
- **Owner sign-off:** approved 2026-07-26 in the scope session that wrote the brief ("Ik wil
  altijd dat we gelijk uitvoeren wat nodig is. Geen tech dept opbouwen.")

## Why

The framework had shipped every capability above across roughly forty merged changes before
anyone wrote `docs/product/BRIEF.md`. Scope arrived last, which is the normal order for a
project that started as a working system rather than as a plan. The gap that leaves is not in
the software but in the record: the trace chain runs BRIEF to spec to ticket to commit, and for
these eleven capabilities the chain starts at a brief written after the fact.

Rather than invent eleven retroactive specs nobody wrote, this single record states what was
true on 2026-07-26 and where the evidence for it lives.

## What was delivered

Each capability below is live in the repository and covered by the gates that run on every
commit. The evidence is the repository itself, not a claim in this file.

- **SC-1** `begin` takes a fresh copy through cleanup, interview, challenge, templates, machinery
  and a first governed commit.
- **SC-2** `scope`, `scope-guard` and the SC-id trace gate in `checks/check.mjs`; intake exists
  so that findings are recorded instead of built.
- **SC-3** The session protocol in `AGENTS.md`, `docs/state/STATE.md`, `checkpoint`, `handover`
  and sixteen decision records.
- **SC-4** `spec` with its S/M/L tiers, plus the spec, plan and ticket templates.
- **SC-5** The security floor in `AGENTS.md`, `docs/standards/`, and axis C of `code-review`.
- **SC-6** `verify`, `debug` and `code-review`, plus the honesty rule that a failure is reported
  as a failure.
- **SC-7** `comply` and `docs/compliance/COMPLIANCE.md`, with every obligation carrying a dated
  verification against its source.
- **SC-8** `design`, `design-guard`, `taste`, `docs/design/DESIGN.md` and `docs/design/VOICE.md`,
  with the prose-style check enforcing the mechanical part.
- **SC-9** `deliver`, `maintain`, `handover` and `docs/operations/`.
- **SC-11** The conflict rule in `AGENTS.md`: where code and docs disagree the code is the fact,
  and the retired wording goes on the denylist so it cannot silently return.
- **SC-12** `defer:` markers at the site of every deliberate simplification, harvested into
  `docs/state/DEBT.md`.

SC-10, the cockpit that shows project state without reading the repo, is deliberately absent:
it is the one capability in the brief that was not built, and it has its own spec ahead of it.

## Verification

The gates that prove these capabilities keep working are `node checks/check.mjs`, the self-tests
in `checks/check.test.mjs` and `checks/progress.test.mjs`, and CI on every pull request. This
record adds no behavior, so it needs no test of its own.
