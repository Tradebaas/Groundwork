---
name: design
description: Stand up this project's design system and voice: brand intake, UI foundation choice (component library or bespoke), tokens, typography, components, tone, wording. Use after stack choice and before the first UI work, or when the owner wants the look/voice defined or changed. Asks the owner only what is genuinely theirs; derives the rest from docs/design principles.
---

# design: nothing ships looking or sounding like a default

`docs/design/DESIGN.md` and `docs/design/VOICE.md` carry the durable principles and the owner's
standing defaults. This skill turns them into *this project's* concrete system.

## 1. Ask the owner: only what is theirs

Taste questions, concise, with proposals to react to (people choose better than they specify):

1. **Brand reality**: existing logo, colors, fonts, brand guide? If yes: that is the seed;
   collect the files into `docs/design/reference/` and map them onto tokens in step 3. If no:
   the rest of this interview derives a brand direction together, so the owner is never blocked
   on "we have no designer".
2. **Feel**: confirm or adjust the standing default direction in DESIGN.md against *this*
   product and audience. Show 2-3 named directions with real product references.
3. **Accent & temperature**: one accent color family, warm or cool neutrals.
4. **Voice**: product language (NL/EN/...), register (je/u/you), confirm the standing voice
   default against this audience.
5. **References**: one product they wish this felt like, one it must never feel like.

## 2. Choose the UI foundation: one source of truth for all UI

Before deriving anything, the owner picks exactly one foundation this project's UI is built on:

- **A component library, themed with the owner's brand.** Open
  `docs/design/reference/ui-library-showcase.html` in a browser together: one page per library
  (shadcn/ui, Material UI, Chakra UI, Magic UI, Aceternity UI, Nyxhora UI, React-Bootstrap,
  React Bits, Mantine, HeroUI) plus the bespoke option, each with the same live, working
  components so the owner compares style registers fairly.
- **A bespoke system.** No library: the project's own tokens and components, derived in step 3.
  Right when the look is part of the product's value, the brand requirements are strong, or the
  owner wants zero UI dependencies. The owner can also hand over their own ideas, references,
  or existing UI code; the agent derives the system from those.

Rules for this step:

- The stack constrains the menu. The showcase's ten are React-centric; for another stack,
  research equivalents live (that is `stack` skill territory, never model memory). Verify the
  candidate's current maintenance, license, and accessibility from its official docs before
  deciding; the showcase shows style registers, not current facts.
- The owner's brand always sits on top: the library provides structure and behavior, the brand
  tokens flow in through the library's theming layer (or the token file, if bespoke).
- Record the choice as a decision record (see `docs/decisions/0009-ui-foundation-choice.md`),
  and name the foundation in DESIGN.md section 3. One foundation per project: mixing libraries
  or building raw UI beside the chosen one requires a new decision record first.

## 3. Derive the system: your job, not theirs

Fill DESIGN.md's token section: type scale + line heights, spacing ladder, radius rule, color
roles (canvas/surface/ink/accent/status: status colors used via opacity, never as new hues),
elevation rule, component inventory with states (default/hover/focus/disabled/loading/empty/
error). Fill VOICE.md: wording table, error-message pattern, the banned list, applied to this
product's register and language.

Then implement tokens **in code** as the stack dictates (CSS custom properties, design-token
file, theme object, or the chosen library's theming layer, per `docs/standards/<stack>.md`).
Code is the SSOT; DESIGN.md mirrors it (names + values), and the mirror is what `design-guard`
and future checks validate against.

## 4. Set the taste dials

For pages meant to persuade (landing, marketing, portfolio, explainer), skill `taste` carries
the per-page execution rules. Set its three dials (VARIANCE / MOTION / DENSITY) here, from the
direction the owner just confirmed, and record them in DESIGN.md section 3 so every later page
build starts from the same read.

## 5. Prove it

Build one real screen (or document/email template, whatever this product ships first) in the
system, screenshot it into `docs/design/reference/`, and review it with the owner **before**
building more. Adjust tokens from that reaction, not from theory. When the stack gains a
mechanical token check (raw hex ban, palette-bypass ban, via `stack`), prove it fails on a
violation.

## 6. Record

DESIGN.md + VOICE.md filled (TEMPLATE markers removed), tokens in code, decision records for the
chosen UI foundation and direction, STATE.md updated. Owner answers captured verbatim where
wording matters. ⚓
