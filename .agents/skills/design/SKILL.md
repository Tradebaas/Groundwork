---
name: design
description: Stand up this project's design system and voice, and run the making of an interface through impeccable, the installed design method. Covers brand intake, the UI foundation choice (component library or bespoke), voice and wording, and the owner's three decision points: the visual direction, the rendered compositions, and the finish verdict. Use after stack choice and before the first UI work, or when the owner wants the look or the voice defined or changed. Asks the owner only what is genuinely theirs; hands the rest to the method.
---

# design: nothing ships looking or sounding like a default

Groundwork does not make interfaces itself. Making one runs on **impeccable**, the design method
`begin` installs per project (`node checks/design-method.mjs --install`; the enforcement line at
the top of `node checks/check.mjs` says whether this project has it, and which release). This skill
is the Groundwork side of that seam. It carries what is genuinely ours, hands it over as binding
input, and holds open the three points where the owner decides.

`docs/design/DESIGN.md` sections 1 and 2 and `docs/design/VOICE.md` carry the durable principles
and the owner's standing defaults. DESIGN.md **section 3 is not written here**: it is recorded from
the world that was actually built, after the finish review (step 5). A rulebook written before the
build gets defended against reality instead of describing it.

No design method installed (a project that started without an interface, a failed install recorded
in STATE.md)? Install it first. Everything below assumes it is there.

## 1. Ask the owner: only what is theirs

Two questions, and only these: the method asks the rest at the point where the answer changes the
work, and asking twice is how an owner learns their answers do not travel.

1. **Brand reality**: existing logo, colors, fonts, brand guide? If yes, that is binding: collect
   the files into `docs/design/reference/` and carry them over as a brand commitment in step 3. If
   no, nothing is blocked; the direction round derives a brand with the owner.
2. **Voice**: product language (NL/EN/...), register (je/u/you), and whether this audience changes
   the standing voice default in VOICE.md.

Feel, accent, temperature and visual references are **not** asked here. They are the substance of
the direction round in step 3, where the owner sees them rendered instead of described, and asking
for them twice would seed the answer before that round can do its work.

## 2. Choose the UI foundation: one source of truth for all UI

Before anything is made, the owner picks exactly one foundation this project's UI is built on. It
stays a Groundwork decision, made here, that the method then builds within.

- **A component library, themed with the owner's brand.** Open
  `docs/design/reference/ui-library-showcase.html` in a browser together: one page per library
  (shadcn/ui, Material UI, Chakra UI, Magic UI, Aceternity UI, Nyxhora UI, React-Bootstrap,
  React Bits, Mantine, HeroUI) plus the bespoke option, each with the same live, working
  components so the owner compares style registers fairly.
- **A bespoke system.** No library: the project's own tokens and components. Right when the look is
  part of the product's value, the brand requirements are strong, or the owner wants zero UI
  dependencies. The owner can also hand over their own ideas, references, or existing UI code.

Rules for this step:

- The foundation is an expensive-to-reverse choice: run the `critical-thinking` moves before
  recommending one. Bespoke is the named alternative to every library, and vice versa.
- The stack constrains the menu. The showcase's ten are React-centric; for another stack,
  research equivalents live (that is `stack` skill territory, never model memory). Verify the
  candidate's current maintenance, license, and accessibility from its official docs before
  deciding; the showcase shows style registers, not current facts.
- The owner's brand always sits on top: the library provides structure and behavior, the brand
  tokens flow in through the library's theming layer (or the token file, if bespoke).
- Record the choice as a decision record (see `docs/decisions/0009-ui-foundation-choice.md`). It
  travels into step 3 as a constraint the build must hold, and lands in DESIGN.md section 3 when
  that section is written. One foundation per project: mixing libraries or building raw UI beside
  the chosen one requires a new decision record first.

## 3. Hand over, then hold the three decision points

Fill VOICE.md section 3 first (wording table, error-message pattern, banned list, in this
product's register and language). Copy is written during the build, so the voice exists before it.

Then hand the method its input, once, and let it run:

- **Product truth it must not ask twice for.** `docs/product/BRIEF.md` and
  `docs/product/CONTEXT.md` already hold the users, the purpose, the positioning, the constraints
  and the domain terms, captured by `begin` in the owner's own words. The method's `init` step
  writes its own product record: give it those two files as the source, play the extracted answers
  back for a one-line confirmation each, and let it interview only for what it genuinely adds and
  Groundwork never captured: platform (web, iOS, Android, adaptive), brand commitments, the
  evidence actually on hand, and accessibility needs beyond the floor. An owner who has just sat
  through `begin`'s interview answers nothing here twice.
- **The binding design input.** DESIGN.md section 1 (the ten principles) is a floor: a direction
  may build any world it likes on top of it, and may not break it. Section 2 (the owner's standing
  taste) is the pinned seed, and the method honors a pinned brief. The owner may replace section 2
  for this project, at the direction round below, in their own words; nobody else may drop it. Also
  hand over VOICE.md section 3 and the foundation decision from step 2.
- **The accessibility floor** in principle 8 and `docs/compliance/COMPLIANCE.md` is not negotiable
  by any direction.

The owner decides at three points, in this order. This is the order of work:

1. **The visual direction.** The method derives candidate worlds from the audience's own culture,
   an external roll assigns which one is built so runs cannot converge on the category default, and
   the owner chooses on a decision page with palettes, first viewports and honest risks, with
   re-roll and steer available. **No production code for a new visual world is written before this
   choice lands.** A direction that breaks the floor in section 1, or quietly drops section 2
   without the owner saying so, is sent back for another round; it is not accepted and fixed later.
2. **The rendered compositions.** The chosen direction is rendered as compositions and approved
   before code exists. The build then reproduces the approved composition rather than
   reinterpreting it.

   **No image generation on this machine?** Then draw them yourself, as flat SVG, and say in one
   line that you did. Every card in a round goes through one shared frame: same size, same matte
   unfinish, only the product name and one real headline legible, everything else greeked. This is
   not decoration. A direction round where the catalogue's challengers carry hosted reference
   plates and the assigned direction carries an empty slot is a rigged comparison, and the owner
   will feel the pull without being able to name it. Measured on this repo, 2026-08-06: without
   generation the assigned card and the standing exit render empty while every challenger shows a
   picture.
3. **The finish verdict.** A reviewer that never saw the build thread scores the result and returns
   a table. Report it **as it stands, open items intact**, under the reviewer's own word for it. A
   table with open findings is never handed back as a pass, and never summarized into one. Whether
   to fund another round or ship as it stands is the owner's call.

An addition inside a surface that already exists inherits that surface: it is not a new identity
exercise, and it does not run this round again.

## 4. Set the taste dials

For pages meant to persuade (landing, marketing, portfolio, explainer), skill `taste` carries
the per-page execution rules. Set its three dials (VARIANCE / MOTION / DENSITY) here, from the
direction the owner chose, and record them in DESIGN.md section 3 so every later page build starts
from the same read.

## 5. Record

After the finish review, DESIGN.md section 3 is written from the built world: the foundation from
step 2, the tokens as they exist in code (code is the SSOT, DESIGN.md mirrors it), the component
inventory with its states, and the code SSOT location. That mirror is what `design-guard` and the
mechanical checks validate against.

Done means: VOICE.md filled and DESIGN.md section 3 written from the build (TEMPLATE markers
removed), tokens in code, decision records for the UI foundation and for any direction that
replaced the owner's standing taste, the finish verdict reported with its open items, and STATE.md
updated. Owner answers captured verbatim where wording matters. ⚓
