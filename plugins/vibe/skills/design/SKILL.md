---
name: design
description: Stand up the design system and the voice, then make interfaces and user-facing output that look and sound like nobody's default. Use after the stack choice and before the first UI work, when the owner wants the look or the voice defined or changed, and before delivering anything a user sees (a screen, a document, an e-mail, an export, an error message, CLI output). The owner decides at three points, the direction, the compositions, the finish, and the render is judged, never the code.
---

# design: nothing ships looking or sounding like a default

`docs/DESIGN.md` sections 1 and 2 and `docs/design/VOICE.md` carry the durable principles and the
owner's standing taste. DESIGN.md **section 3 is written from the built world**, after the finish
review (step 4), never before: a rulebook written ahead of the build gets defended against reality
instead of describing it. `docs/PRODUCT.md` beside DESIGN.md holds what the brief does not own:
platform, brand commitments, evidence on hand, accessibility needs. A fact that stands in both
files will disagree with itself later, so PRODUCT.md points at the brief for scope, users and
purpose.

No DESIGN.md or VOICE.md in this project? Say so, ask the two questions in step 1, and write both
files from the answers before any interface work; a project without a design system gets one the
first time it needs one.

## 1. Ask the owner: only what is theirs

1. **Brand reality**: existing logo, colors, fonts, brand guide? If yes, that is binding: collect
   the files into `docs/design/reference/` and carry them as a brand commitment. If no, nothing is
   blocked; the direction round derives a brand with the owner.
2. **Voice**: product language (NL/EN/...), register (je/u/you), and whether this audience changes
   the standing voice default in VOICE.md.

Feel, accent, temperature and visual references are **not** asked here. They are the substance of
the direction round in step 3, where the owner sees them rendered instead of described.

## 2. Choose the UI foundation: one source of truth for all UI

Before anything is made, exactly one foundation is fixed for this project's UI: a **component
library** themed with the owner's brand, or a **bespoke system** of the project's own tokens and
components. Bespoke is right when the look is part of the product's value, the brand requirements
are strong, or the owner wants zero UI dependencies.

Do the research and arrive with **one** recommendation in a short paragraph: what it is, why it
fits this product, what it costs, and the one real alternative beside it with what would have to
be true to prefer it (bespoke is the named alternative to every library, and vice versa). Verify
the candidate's maintenance, licence and accessibility from its official docs, live, never model
memory. `docs/design/reference/ui-library-showcase.html` holds one page per common React library
plus the bespoke option; say it exists and open it on request, never hand it over as homework.

Record the choice as a decision record (see `docs/decisions/0009-ui-foundation-choice.md`). One
foundation per project: mixing libraries or building raw UI beside the chosen one requires a new
decision record first. The owner's brand always sits on top: the library provides structure and
behavior, the brand tokens flow in through its theming layer, or the token file if bespoke.

## 3. The three decision points, in this order

Fill VOICE.md section 3 first (wording table, error-message pattern, banned list, in this product's
register and language): copy is written during the build, so the voice exists before it. Then:

1. **The visual direction.** Derive two or three written directions from the audience's own
   culture, each with a palette and one flat SVG first viewport. Name the category default
   explicitly and make sure one candidate is not it. The owner picks. **No production code for a
   new visual world is written before this choice lands.** A direction that breaks a principle in
   DESIGN.md section 1, or quietly drops section 2 without the owner saying so, goes back for
   another round.
2. **The rendered compositions.** The chosen direction rendered as compositions (flat SVG is
   enough), approved before code exists. The build reproduces the approved composition rather
   than reinterpreting it.
3. **The finish verdict.** A fresh subagent that never saw the build thread scores the result
   against DESIGN.md, VOICE.md and the story's acceptance criteria and returns a table. Report it
   **as it stands, open items intact**, under the reviewer's own word for it; never summarized
   into a pass. Whether to fund another round or ship as it stands is the owner's call.

An addition inside a surface that already exists inherits that surface: it is not a new identity
exercise and does not run the rounds again.

**On a redesign of a live surface**, write down the commitments the new design must keep before
the direction round: URL structure and slugs, page titles and structured data, navigation labels,
form field names and order, analytics names, the wordmark, legal and consent copy. Anything on
that list that changes, changes on the owner's say-so and ships with redirects.

## 4. Record

After the finish review, DESIGN.md section 3 is written from the built world: the foundation, the
tokens as they exist in code (code is the source of truth, DESIGN.md mirrors it), the component
inventory with its states. Done means: VOICE.md filled, DESIGN.md section 3 written from the build
with its TEMPLATE markers removed, tokens in code, decision records for the foundation and for any
direction that replaced the owner's standing taste, the finish verdict reported with its open
items, STATE.md updated.

## 5. Look at it before you ship it

Render the thing (a screenshot of the running screen, the generated document, a real run of the
command) and judge *that*, never the source. Runs on every delivery through `verify`.

- **Accessibility floor**: contrast, focus order, labels on inputs and icons, a keyboard path
  through the flow; reading order and tagged structure in a document; never color alone carrying
  the meaning. **Reduced motion**: exercise `prefers-reduced-motion: reduce` and watch the content
  stay readable, do not read the CSS for it.
- **Tokens only**: every color, size, radius and space comes from DESIGN.md section 3 and the code
  that owns them. A generator that ships its library's default blue is a finding.
- **The medium's constraints**: an e-mail renders without web fonts; a document paginates with
  headers, page numbers and no orphaned heading; CLI output survives being piped to a file.
- **Layout truth on the real content**: no text over text, no wrapping prices, reserved space for
  what is optional; check empty, error, overflow and the longest value the data actually contains.
- **No stock-AI look**: a template's stock palette, a grab-bag of icons, an emoji standing in for
  one, a tracked-caps pill above the headline, gradient text, glow shadows.
- **Voice**: reads like VOICE.md; errors say what happened and what the user can do, no codes
  without words, no blame, no false cheer; every value has a label. A string in an API response, a
  log line or a toast is user-facing text and is judged here.

Report findings as one line each (`<where>: <what is wrong> → <fix>`), most severe first, fix them
before delivering, or say "clean" and ship. A finding that recurs across sessions wants a token, a
component or a mechanical check: propose that once, in INTAKE.md.
