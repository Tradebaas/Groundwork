# DESIGN: the design system

<!-- TEMPLATE: sections 1-2 are durable and ship with Groundwork; section 3 is filled per
     project by the `design` skill and mirrors the tokens implemented in code (code is the SSOT). -->

## 1. Principles: why things look right

1. **Whitespace is the structure.** Grouping, hierarchy, and calm come from space on a
   consistent ladder, never from boxes, lines, or color added to compensate.
2. **Monochrome carries the interface; one accent earns attention.** Ink tones (a near-black
   plus two muted steps) do all everyday work. The single accent appears only where the user
   must look: one primary action per view, active state, a key highlight. If everything is
   highlighted, nothing is.
3. **Flat surfaces, hairline edges.** Cards and panels sit flush: surface color + a faint
   1px border. Shadow is reserved for things that actually float (menus, dialogs, toasts).
4. **One type family, few weights.** A single variable font, regular/medium/semibold. Hierarchy
   comes from size and color before weight. Label and value share size and weight; the
   difference is color only.
5. **Radius is one decision.** One radius for containers, one smaller for controls inside them,
   full for pills/avatars. Never mixed per whim.
6. **States are designed, not inherited.** Hover, visible focus, disabled, loading, empty,
   error: every component ships with all of them. Empty states say what to do, not just "no data".
7. **Motion is physics, not decoration.** 120-200ms ease-out on state changes; nothing bounces,
   nothing autoplays, nothing moves that the user didn't cause.
8. **Accessible by construction.** Contrast of at least 4.5:1 for text, focus always visible,
   touch targets at least 44px, semantics before ARIA. WCAG 2.1 AA is the legal floor, not the
   ambition.
9. **One icon set, consistent.** Default to Lucide: uniform stroke icons, one weight, sized on
   the scale, colored by ink or the accent (never their own colors). Never emoji as UI icons,
   never a grab-bag of styles. A wordmark is text unless the owner supplies a real logo. A button
   carries a text label or a single icon, never both by default (a disclosure control, like an
   accordion chevron, is the one exception: there the icon is the state, not decoration).
10. **No stock-AI look.** Solid fills and solid text by default. The generic blue-to-purple
    gradient, and blue or purple as a reflex accent, are banned as defaults; pick the project's
    own accent (seed: the owner's deep teal). A gradient is only ever a small, deliberate,
    owner-approved accent, never the baseline. Any background motion stays subtle and secondary
    to reading; usability wins over decoration. For pages meant to persuade (landing, marketing,
    portfolio, explainer) the full anti-slop rulebook is skill `taste`: brief read first, three
    dials, layout and motion rules, forbidden tells. There a deliberately higher motion level
    may override principle 7, within `taste`'s reduced-motion and motivation rules.

## 2. Standing default direction (the owner's taste: seed, not straitjacket)

Captured 2026-07-06: **strak & minimaal**. Clean, generous whitespace, Swiss/Scandinavian
precision; the register of Linear, Stripe, Notion. Light, near-white canvas; near-black ink;
cool neutrals; one restrained accent (the owner's production system uses a deep teal `#2F6664`
with dark ink `#222228`, a proven starting pair, re-derive per brand). Flat cards, hairline
borders, soft-but-adult radius (12-16px containers). Confirm this direction per project with
the `design` skill; deviate only on the owner's say-so.

## 3. Tokens: THIS PROJECT <!-- filled by `design`; mirrors the code SSOT -->

- **UI foundation:** TBD <!-- set by `design`: component library name + major version, or
     "bespoke". Compare options in design/reference/ui-library-showcase.html; record the choice
     as a decision record (pattern: decisions/0009). One foundation per project. -->

| Role | Token | Value | Notes |
|---|---|---|---|
| Canvas | `--color-canvas` | TBD | page background |
| Surface | `--color-surface` | TBD | cards, panels |
| Ink | `--color-ink` | TBD | primary text |
| Ink muted | `--color-ink-muted` | TBD | labels, secondary |
| Border | `--color-border` | TBD | hairlines |
| Accent | `--color-accent` | TBD | one family, sparingly |
| Danger / Warning / Success / Info | `--color-...` | TBD | used via opacity only |

- **Taste dials:** TBD <!-- VARIANCE / MOTION / DENSITY, 1-10, set by `design` step 4 with
     skill `taste`, e.g. 5 / 3 / 3 for a minimal register. Governs persuasion pages. -->
- **Type scale:** TBD <!-- e.g. 32/24/18/16/14 + line heights; font family + weights -->
- **Spacing ladder:** TBD <!-- e.g. 4 / 8 / 12 / 16 / 24 / 32 / 48 -->
- **Radius:** TBD <!-- container / control / pill -->
- **Elevation:** TBD <!-- flat + hairline; shadow only for floating layers -->
- **Component inventory:** TBD <!-- list as they're built; each with all states -->

Code SSOT location: TBD <!-- e.g. src/styles/tokens.css, set by `design`, checked for drift -->
