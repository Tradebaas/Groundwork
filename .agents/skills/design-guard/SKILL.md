---
name: design-guard
description: Judgment check before delivering any UI or user-facing output: screens, components, documents, emails, error messages. Catches what no linter can - layout breakage, token bypass, off-voice copy, AI-default look. Run on what actually renders, not on the code.
---

# design-guard: look at it before you ship it

Render the thing (screenshot, preview, generated document) and check *that*, not the source.
DESIGN.md and VOICE.md are the measuring stick; this catches what automation can't.

Is it a persuasion page (landing, marketing, portfolio, explainer)? Then skill `taste` carried
the build rules and its pre-flight already ran; this guard re-checks the rendered result, and
every `taste` section 11 tell that survived into the render is a finding here.

## Visual

1. **Tokens only.** Every color, size, radius, and space comes from the system: no raw values,
   no palette bypass, no near-miss grays. One accent, used sparingly; status colors via opacity.
2. **No stock-AI look.** No default blue-to-purple palette and no gradient as a baseline (solid
   fills, the project's own accent). Default to Lucide icons, one consistent set, never emoji as
   UI icons, wordmark is text unless a real logo exists. Buttons are text-only or icon-only,
   never text plus a decorative icon (a disclosure chevron is the only exception). Strak and
   minimal with generous whitespace: nothing cramped, cards/labels/text never flush against each
   other, unless the owner deliberately chose otherwise.
3. **Locks hold page-wide.** One accent used identically in every section, one theme (no
   section flipping to inverted mode mid-scroll), one corner-radius system, one icon family.
   On persuasion pages also: eyebrow labels rationed (at most 1 per 3 sections), no layout
   family repeated, no CTA label wrapping and one CTA label per intent, real images instead of
   div-built fake screenshots, every animation motivated and reduced-motion safe.
4. **Typography discipline.** Scale steps only; label and value share size and weight
   (distinction by color only); no banned weights; line lengths readable.
5. **Spacing ladder.** Air comes from consistent ladder steps, not ad-hoc gaps. Related things
   closer than unrelated things: check it actually reads that way.
6. **Layout truth.** No text over text, no wrapping button labels or prices, equal heights in
   card rows, reserved space for optional badges, sensible behavior at narrow width and with
   long content. Check the ugly states: empty, loading, error, overflow.
7. **States exist.** Hover, focus (visible!), disabled, loading, empty, error: designed, not
   browser defaults.
8. **Accessibility floor**: contrast, focus order, labels on inputs and icons, keyboard path
   through the flow. (Legal baseline: see COMPLIANCE.md.)

## Voice

9. **Reads like VOICE.md**: register, wording table respected, direct and calm; no exclamation
   inflation, no em-dash tells, no filler ("simply", "just", "please note").
10. **Errors follow the pattern**: what happened, what the user can do: no codes without words,
    no blame, no false cheer.
11. **Every value has a label**, every screen answers "what is this and what do I do here?"

## Verdict

Report findings as one line each (`<where>: <what's wrong> → <fix>`), most severe first, then
fix them before delivering. Nothing to report? Say "clean" and ship. If a finding recurs across
sessions, it wants a token, a component, or a mechanical check. Propose that once, in INTAKE. ⚓
