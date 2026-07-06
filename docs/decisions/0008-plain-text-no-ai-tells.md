# 0008: plain text, no AI tells, banned across every file and every product

- **Date:** 2026-07-06 · **Status:** accepted · **Decider:** owner (Remon), built by Claude

## Context

Text produced by AI models carries recognisable tells: em dashes as a rhythm device, curly
quotes, ellipsis characters, and boilerplate phrasing (rule-of-three cadence and the words listed
in VOICE.md). The owner does not want this style anywhere: not in Groundwork's own
governance files, and not in any product built on the framework. A written preference alone rots;
it needs a home that owns the rule and a gate that cannot be bypassed.

## Options considered

1. **Rule in AGENTS.md + owned list in VOICE.md + mechanical gate in checks (chosen):** the
   always-loaded rulebook states the ban, VOICE.md owns the full list (including judgment tells),
   and `checks/check.mjs` fails the build on the deterministic ones. One fact per owning file, and
   the mechanical part needs zero tokens and zero trust.
2. **Documentation only (VOICE.md prose):** relies on every agent reading and obeying it every
   time. That is exactly the drift the gates exist to stop.
3. **Ban every suspect phrase mechanically:** a large word denylist produces false positives on
   legitimate technical writing, which trains people to bypass the gate. Rejected: the gate covers
   only what is unambiguous.

## Decision & consequences

`checks/check.mjs` gains a `prose-style` check that bans AI typography (em dash, en dash, ellipsis
character, curly quotes) in every scanned text file, plus a configurable `styleBans` phrase list
in `checks/config.json` seeded with high-confidence tells. A `checks:allow-style` line marker is
the escape hatch for a deliberate case (a spec quoting source text). The judgment tells that no
regex can catch stay in VOICE.md and are enforced by `design-guard`. The check excludes `checks/`
itself, since the detection code must hold the literal characters. Easier now: the house style is
uniform and self-enforcing. Watch for: `styleBans` growing too eager; keep it to phrases with no
legitimate technical use, and push the rest to judgment.
