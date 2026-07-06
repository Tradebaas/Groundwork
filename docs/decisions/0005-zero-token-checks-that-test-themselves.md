# 0005: Enforcement is a dependency-free script, and the gates test themselves

- **Date:** 2026-07-06 · **Status:** accepted · **Decider:** Groundwork build (Claude, per owner brief)

## Context

Repo hygiene rules that live only in prose decay; model-enforced rules cost tokens every session
and are skipped under pressure. The studied production system proves both halves: its custom
zero-token check script is its strongest asset, *and* its flagship check was silently dead for
months (regex never matched; violations leaked). A green light from an untested gate is worse
than no gate. Documented 2026 incidents also show agents bypassing hooks via `--no-verify`.

## Options considered

1. **Single-file Node script (`checks/check.mjs`), no dependencies, plus a self-test (chosen):**
   deterministic checks for everything checkable: manifest completeness, link integrity,
   retired-fact denylist across the configured text file types, size budgets (AGENTS.md, STATE.md,
   skills), skill frontmatter, bridge integrity, secret patterns, `defer:` marker hygiene, empty
   dirs. `check.test.mjs` builds fixture violations and asserts every check actually fails.
2. **Standard toolchain only (ESLint/Biome/pre-commit):** stack-specific, so unavailable before
   the stack exists; none of them check governance artifacts (manifests, denylists, budgets).
   They join later via the `stack` skill; they don't replace this layer.
3. **Prose rules + model vigilance:** the most expensive and least reliable option; rejected on
   the evidence above.

## Decision & consequences

Node ≥20 is the system's only pre-stack dependency. Layered enforcement: the script locally, the
same script in CI (the unbypassable authority), and AGENTS.md's "never bypass a gate" rule with
`--no-verify` explicitly banned. Every new mechanical rule goes into the script *with* a fixture
test; rules a script can't check go into guard skills (the judgment layer above the floor).
