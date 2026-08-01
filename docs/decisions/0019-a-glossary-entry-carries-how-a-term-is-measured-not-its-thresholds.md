# 0019: a glossary entry carries how a term is measured, and stops at the threshold

- **Date:** 2026-08-01 · **Status:** accepted · **Decider:** owner (triage 2026-08-01), agent

## Context

`docs/product/CONTEXT.md` told a project to write down what its words mean and nothing further:
"Definitions cover language, nothing else. No implementation detail in this file." In a domain
with real business rules that leaves a hole. A term like "sufficient income" can be defined as
the income that qualifies an applicant, agreed by everyone in the room, and still leave every
load-bearing question open: over which period, on which basis, counting whose income. Each
session then answers those three questions again, usually in passing and usually differently,
and the answer only becomes visible once it is already inside code.

The gap is narrow and worth naming precisely. What the glossary was missing is not the rule that
decides the outcome. It is the measurement the rule needs before it can be applied at all. Those
are two different things, and only one of them belongs in a document nobody can execute.

This is the smallest piece of the ontology argument in J. Jansonius, "Goal-Driven Decision
Tables" (2026), which the owner raised on 2026-07-31. The full claim, that a project should carry
a domain ontology, is not proposed here and was not adopted.

## Options considered

1. **A permission with a stop-line.** Chosen. An entry may settle how a term is measured, which
   period, which basis, who counts, and stops before the threshold value and the rules that
   branch on it. Those belong in a spec, where a test can execute them. The permission costs
   nothing on a project that has no such terms, because nothing requires it to be used.
2. **Leave the rule as it stands:** rejected. It is the status quo that produced the hole, and
   the measurement has to be settled somewhere. Left out of the glossary it lands in code, which
   is the one place the owner cannot read it.
3. **A required "Measurement" section on every entry:** rejected. It would put ceremony on every
   glossary line in every project to serve the minority that have regulated or financial terms,
   and an empty required section teaches agents to fill it with noise. The owner's steer of
   2026-08-01 was explicitly against rule-bloat.
4. **Drop the stop-line and let entries carry the rules too:** rejected, and this is the option
   the decision exists to refuse. A glossary holding thresholds and branching is a second spec
   written in prose, with no test behind it and no gate over it. It breaks SC-11 directly: the
   written record would then state what only the code can prove, and the two would drift.

## Decision & consequences

The third rule in the `CONTEXT.md` template comment is retired and replaced by the permission
above. The old wording is in the `denylist` in `checks/config.json`, per the AGENTS.md conflict
rule, so it cannot quietly return. A second worked example carries the stop-line concretely:
"Sufficient income" is defined as gross income of applicant and co-applicant over the last 12
calendar months, before tax, and the line that says what makes it sufficient points at the spec.

Easier: the questions that decide what a term measures get settled once, in the file a session
already reads, instead of being re-derived per session or discovered inside code. A term that is
argued about for an hour leaves a record of the argument's outcome.

Harder: the boundary is now a judgment call rather than a flat ban, and judgment calls drift.
The example is doing the work a rule cannot do here, which is why it is in the template rather
than in a skill.

Watch for: entries growing a threshold as a parenthetical, since that is how this becomes a
second spec one word at a time. If a glossary entry ever needs a number to be understood, the
entry is describing a rule, and the rule belongs in a spec. Nothing enforces that mechanically,
and a gate is deliberately not proposed: a check cannot tell a measurement basis from a
threshold, and the number in "the last 12 calendar months" is exactly the kind it would fire on.
