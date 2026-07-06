---
name: design
description: Stand up this project's bespoke design system and voice — tokens, typography, components, tone, wording. Use after stack choice and before the first UI work, or when the owner wants the look/voice defined or changed. Asks the owner only what is genuinely theirs; derives the rest from docs/design principles.
---

# design — nothing ships looking or sounding like a default

`docs/design/DESIGN.md` and `docs/design/VOICE.md` carry the durable principles and the owner's
standing defaults. This skill turns them into *this project's* concrete system.

## 1. Ask the owner — only what is theirs

Taste questions, concise, with proposals to react to (people choose better than they specify):

1. **Brand reality**: existing logo, colors, fonts, brand guide? (If yes: that's the seed —
   collect the files into `docs/design/reference/`.)
2. **Feel**: confirm or adjust the standing default direction in DESIGN.md against *this*
   product and audience. Show 2–3 named directions with real product references.
3. **Accent & temperature**: one accent color family, warm or cool neutrals.
4. **Voice**: product language (NL/EN/…), register (je/u/you), confirm the standing voice
   default against this audience.
5. **References**: one product they wish this felt like, one it must never feel like.

## 2. Derive the system — your job, not theirs

Fill DESIGN.md's token section: type scale + line heights, spacing ladder, radius rule, color
roles (canvas/surface/ink/accent/status — status colors used via opacity, never as new hues),
elevation rule, component inventory with states (default/hover/focus/disabled/loading/empty/
error). Fill VOICE.md: wording table, error-message pattern, the banned list, applied to this
product's register and language.

Then implement tokens **in code** as the stack dictates (CSS custom properties, design-token
file, theme object — per `docs/standards/<stack>.md`). Code is the SSOT; DESIGN.md mirrors it
(names + values), and the mirror is what `design-guard` and future checks validate against.

## 3. Prove it

Build one real screen (or document/email template — whatever this product ships first) in the
system, screenshot it into `docs/design/reference/`, and review it with the owner **before**
building more. Adjust tokens from that reaction, not from theory. When the stack gains a
mechanical token check (raw hex ban, palette-bypass ban — via `stack`), prove it fails on a
violation.

## 4. Record

DESIGN.md + VOICE.md filled (TEMPLATE markers removed), tokens in code, decision record for the
chosen direction, STATE.md updated. Owner answers captured verbatim where wording matters. ⚓
