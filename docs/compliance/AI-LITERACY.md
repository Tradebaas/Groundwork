# AI literacy (EU AI Act Article 4)

<!-- TEMPLATE: ships filled, because the way of working it describes ships with Groundwork:
     AI coding agents operated under this repo's rulebook. Per project, `comply` keeps the
     "Who is covered" line true and re-checks this note at the quarterly audit. -->

Article 4 of the EU AI Act asks providers and deployers of AI systems to take measures that
support the AI literacy of the people operating them, matched to their role and context. The
Digital Omnibus on AI softened the original wording into an obligation of effort: no level of
literacy has to be guaranteed in any individual, so a working system of measures is what
evidence looks like here. A team building software with AI coding agents professionally is a
deployer, so this project is in scope. Since when it applies, which act amended it and the
enforcement dates are the register's facts: `COMPLIANCE.md` §1, AI Act row.

## The measures

The working system is the literacy program: nobody operates an agent here outside it.

| Article 4 expects | Where this project implements it |
|---|---|
| Rules for operating the AI | `AGENTS.md`: decision ladder, hard rules (honesty, gates, verify before done) |
| Awareness of AI limits | Skills `critical-thinking` (counters agreement bias), `verify` and `debug` (output is proven, not trusted), `code-review` (fresh-eyes axes) |
| Human oversight | Owner signs off on scope and merges; decisions recorded in `docs/decisions/` |
| Output controls | `checks/` gates, git hooks and CI: agent output never ships unchecked |
| Onboarding | Read `AGENTS.md`, then this note; the `handover` skill keeps the repo cold-start complete |

The failure modes these measures target, by name: models state wrong things confidently,
agree with the user too readily, drift on long sessions, and produce plausible-looking code
that does not work. Each has a counter in the table above.

## Who is covered

- The project owner and every contributor operating an AI agent on this repo, by default.
- **This project's specifics:** one maintainer, who is both owner and only regular operator of
  the agents. Outside contributions arrive as pull requests and are covered by the same measures,
  because the rulebook and the gates apply to the change, not to who wrote it. Reviewed
  2026-07-31. <!-- roles/people using AI tooling here. AI features in the product itself belong
  in COMPLIANCE.md §2 ("AI features"), not here -->

Review cadence: with `comply`, at every first delivery and at the quarterly audit.
