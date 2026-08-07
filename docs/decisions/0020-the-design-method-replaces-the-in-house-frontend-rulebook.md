# 0020: The installed design method replaces Groundwork's in-house frontend rulebook

- **Date:** 2026-08-07 · **Status:** accepted · **Decider:** owner (Remon) + agent

## Context

Decision 0012 gave this framework `taste`: an adapted, in-house rulebook for the page type models
fail at most visibly. It was the right answer while nothing better was installed. Spec 011 installs
impeccable per project as the method that makes an interface, and impeccable carries its own craft
floor, its own list of category defaults to refuse, and a deterministic detector of 59 rules. Two
anti-slop rulebooks side by side is exactly the situation AGENTS.md exists to prevent: one fact,
one place. The owner chose retirement over coexistence on 2026-08-05.

## Options considered

1. **Retire `taste`, move what the method does not carry to the file that owns it (chosen):** one
   rulebook governs a build, and the pieces that are genuinely Groundwork's (the accessibility
   floor, the live-surface contract, the foundation choice) live where they were already owned.
2. **Keep both, `taste` for persuasion pages and the method for the rest:** every page type would
   need a routing rule, and the two would drift on the first upstream release. A build would have
   to be judged against two lists that disagree.
3. **Keep `taste` as the house overlay on top of the method:** an overlay is a patch on somebody
   else's file by another name, and it re-creates the update cost the per-project install exists to
   avoid (spec 011's settled decisions).

## Where each retired rule went

| `taste` section | Where it lives now |
|---|---|
| 1 Design read | Method: new-work section 1 (what is already true) and 2 (one round of questions per mode) |
| 2 Three dials (VARIANCE / MOTION / DENSITY) | **Dropped.** See below |
| 3 Foundation choice | Unchanged and unmoved: `design` step 2 and decision 0009. `taste` only restated it |
| 4 Layout rules | Method: craft floor (cards, nested cards, kicker ban, section numbers, spacing), new-work section 6 (first viewport, scroll pacing); detector rules `kicker-above-heading`, `hero-eyebrow-chip`, `numbered-section-labels`, `oversized-h1`, `edge-flush-cards`, `cramped-padding`, `monotonous-spacing` |
| 5 Typography | Method: craft floor (measure, scale, tracking floor), new-work section 4 (face selection, with its own list of overused faces); detector `overused-font`, `italic-serif-display`, `flat-type-hierarchy`, `line-length`, `tiny-text`, `wide-tracking`, `tight-leading` |
| 6 Color and theme | Method: new-work section 4 (color strategy, the named default-palette calibration, light or dark chosen from the use scene); detector `ai-color-palette`, `cream-palette`, `gradient-text`, `dark-glow`, `radial-halo`. The rule to design both light and dark from the start is **dropped**: the method picks one theme from the real use scene, and a surface that needs both says so in its own brief |
| 7 Imagery and assets | Method: craft floor (no glyphs for icons, no chrome standing in for content), new-work section 6 (author the assets, verified real imagery); detector `shape-assembled-illustration`, `broken-image`, `icon-tile-stack`. The icon family stays the owner's default in DESIGN.md principle 9 |
| 8 Copy on the page | VOICE.md and the prose gate keep language, unchanged. Method: craft floor (the product's own language), `clarify`, and the truth rule in new-work section 3 (claims stay uninventable, demonstration data is labelled); detector `marketing-buzzword`, `aphoristic-cadence`, `theater-slop-phrase`, `em-dash-overuse` |
| 9 Motion | Method: craft floor (one authored moment), new-work section 6 (motion as the form's own material); detector `bounce-easing`, `layout-transition`, `marquee`, `pulsing-dot`, `content-hidden-at-rest`. **Moved:** the reduced-motion obligation, which the method's own guidance never states, is now DESIGN.md principle 7, where it binds every direction |
| 10 States and accessibility | Method: craft floor (states, contrast); detector `low-contrast`, `gray-on-color`. The legal floor stays DESIGN.md principle 8 and COMPLIANCE.md |
| 11 Forbidden tells | Method: the craft floor's Refuse list and the 59 detector rules. Ticket 05 makes the detector a gate |
| 12 Redesign protocol | Preserve-or-overhaul is the method's own four-way read (new-work section 1, plus "refinement preserves, redesign replaces"). **Moved:** the SEO and migration half, which the method does not carry at all, is now the live-surface contract in `design` step 3: URLs and slugs, titles and structured data, nav labels, form field and analytics names, wordmark, legal and consent copy |
| 13 Pre-flight | Method: the finish reviewer and its verdict, reported with its open items (`design` step 3). `design-guard` re-checks the render against the direction contract |

**Why the dials are dropped rather than moved.** They are a model-set configuration of a page,
fixed before the owner sees anything, which is precisely the unwatched stretch spec 011 exists to
close. The method decides the same things in the open and further down: a committed direction
contract, a color strategy chosen at page scale, and motion authored once as the form's own. A
numeric knob beside that contract would be a second, weaker answer to a question already settled.

## Decision & consequences

`taste` is gone from `.agents/skills/`, from the AGENTS.md table, from DESIGN.md principle 10, from
`design`, from `design-guard` and from the explainer. Decision 0012 is superseded, not deleted: it
stays the record of why an in-house rulebook was right while nothing better was installed. The
retired wording is in the denylist in `checks/config.json`, so the dials and the upstream pointer
cannot quietly return in a later session.

Easier: one rulebook governs a build, and it updates by reinstalling rather than by hand. Harder:
the rules now live in somebody else's file, so a rule this framework wants to keep has to be
carried in a Groundwork file, as the reduced-motion floor and the live-surface contract now are.
Watch for: an upstream release that drops a rule the table above credits to it. `maintain`'s
dependency round is where that gets noticed, and the answer is to move the rule back into a
Groundwork file, never to fork the method.
