# VOICE: how the product reads and sounds

<!-- TEMPLATE: §1-2 ship with Groundwork; §3 is filled per project by the `design` skill.
     Applies to ALL user-facing text: UI, errors, emails, documents, notifications, docs. -->

## 1. Principles

1. **Direct and calm.** Say what is, what happened, what to do. No hedging, no drama, no cheer
   that the situation doesn't warrant. Short sentences win.
2. **The user is busy, not stupid.** Explain consequences, skip the lecture. Never blame
   ("you entered an invalid date" becomes "this field needs a date, like 06-07-2026").
3. **Errors follow one pattern:** what happened, then what the user can do, then (if useful)
   where to get help. Never a bare code, never "something went wrong" without a next step.
4. **Consistency beats variety.** One term per concept, everywhere: pick it once in the
   wording table and never synonym-shuffle.
5. **No AI tells.** This is a hard rule (AGENTS.md Language) and it covers every file in the
   repo, not only product copy. If it reads like a model wrote it, rewrite it.
   - **Banned typography (mechanically enforced by `checks/check.mjs`):** em dash, en dash,
     ellipsis character, curly quotes. Use a period, comma, colon, parentheses, a plain hyphen,
     "to" for ranges, and three periods for an ellipsis. Straight quotes only.
   - **Banned phrasing:** "simply / just / easily", "delve", "seamless", "leverage" (as a verb),
     "robust / powerful / cutting-edge" as filler, "it's important/worth noting that", "in
     today's ... world", "a testament to", "unlock the power/potential", "game-changer", "at the
     end of the day". The unambiguous ones are in `checks/config.json` styleBans; the rest are
     judgment, caught by `design-guard`.
   - **Banned habits:** the rule-of-three cadence ("fast, simple, and reliable") on repeat,
     "not just X, but Y" framing, exclamation inflation, "please note", emoji used as icons,
     boilerplate enthusiasm ("great choice!"), filler apologies, and closing summaries that
     restate what was just said.
6. **Numbers, dates, money are sacred.** Formatted per locale, labeled, never ambiguous.

## 2. Standing default register (the owner's taste)

Captured 2026-07-06: **direct & nuchter**, short, clear, no fluff; says what's happening and
what to do. Confirm per project; the product language (Dutch, English, other) and form of address
(je/u/you) are per-project decisions recorded below.

## 3. THIS PROJECT <!-- filled by `design` -->

- **Product language:** TBD · **Register / address:** TBD <!-- je / u / you -->
- **Product name written as:** TBD

### Wording table <!-- one term per concept; grows as the product grows -->

| Concept | We say | Never |
|---|---|---|
| TBD | TBD | TBD |

### Error pattern (localized)

> TBD <!-- what happened, then what to do, localized. e.g. EN "Saving failed. Check your
     connection and try again." / NL "Opslaan is niet gelukt. Controleer je verbinding en probeer
     het opnieuw." -->

### Voice examples <!-- 3 real strings, written the right way, as calibration -->

- TBD
