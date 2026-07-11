---
name: taste
description: Anti-slop build rules for pages meant to persuade: landing pages, marketing sites, portfolios, explainers, and redesigns of those. Load before designing or building such a page, when the user asks for a landing page, marketing site, portfolio or redesign, and whenever frontend output risks the templated AI-default look. Not for dashboards, dense product UI or admin panels: there DESIGN.md and design-guard govern directly. Adapted from leonxlnx/taste-skill.
---

# taste: read the brief, then design past the defaults

AI-built marketing pages fail in one recognizable way: the model skips the brief and ships its
default aesthetic. This skill is the counterweight. Infer the design language first, set three
dials, then build under rules that block the known tells.

How it fits Groundwork: DESIGN.md (principles, tokens) and VOICE.md (language) stay the
measuring stick. `design` stands up the system once per project; this skill governs decisions
while a persuasion page is being built; `design-guard` judges the rendered result. Stack facts
and implementation patterns (component code, animation skeletons) come from
`docs/standards/<stack>.md` and live research, never from model memory. Upstream source, with
per-stack code skeletons for scroll patterns: https://github.com/leonxlnx/taste-skill (MIT).

## 1. The design read: before any code

Read these signals from the brief, in order:

1. **Page kind**: landing (SaaS, consumer, agency, event), portfolio, explainer, editorial,
   redesign (preserve or overhaul: section 12).
2. **Vibe words** the owner used: "minimal", "calm", "premium", "playful", "serious B2B",
   "editorial", "experimental", "dark tech".
3. **References**: URLs, screenshots, named products, competitors.
4. **Audience**: the audience picks the aesthetic, not your taste. A procurement panel and a
   design-conscious consumer need different pages.
5. **Existing brand assets**: logo, colors, type, photography. On redesigns these are starting
   material, not optional input.
6. **Quiet constraints**: accessibility-first audiences, public sector, regulated industries,
   kids' products. Constraints override aesthetic preference.

Then declare one line before generating anything:
**"Reading this as: [page kind] for [audience], in a [vibe] language, leaning toward
[foundation or aesthetic family]."**

Brief genuinely ambiguous? Ask exactly one question (for example "closer to Linear-clean or to
Awwwards-experimental?"), never a question dump. Confident? Declare the read and proceed.

**Anti-default discipline.** Never reach by reflex for: purple-blue gradients, a centered hero
over a dark mesh, three equal feature cards, glassmorphism on everything, infinite
micro-animations, Inter plus slate-900. Those are model defaults, not decisions
(DESIGN.md principle 10 is the standing ban).

## 2. Set the three dials

Every layout, motion, and density decision below is gated by three dials (1 to 10):

- **VARIANCE**: 1 = perfect symmetry, 10 = artistic chaos
- **MOTION**: 1 = static, 10 = cinematic choreography
- **DENSITY**: 1 = art gallery, 10 = cockpit

Infer the values from the design read; state them with the read and record them in DESIGN.md
section 3. Presets (VARIANCE / MOTION / DENSITY):

| Read | Dials |
|---|---|
| Minimal, calm, editorial, Linear-register | 5 / 3 / 3 |
| Landing, SaaS mainstream | 7 / 6 / 4 |
| Landing, agency or creative | 9 / 8 / 3 |
| Premium consumer, luxury | 7 / 6 / 3 |
| Portfolio (designer 8/7/3, developer 6/5/4) | see left |
| Trust-first, public sector, regulated | 3 / 2 / 5 |
| Redesign, preserve | match existing, motion +1 |
| Redesign, overhaul | variance +2, motion +2 |

Dial meaning in practice: low VARIANCE is a symmetric grid; 4-7 allows offsets, mixed aspect
ratios; 8+ allows masonry, fractional grids, large deliberate empty zones. Low MOTION is hover
and focus states only; 4-7 is eased transitions and load-in cascades; 8+ is scroll-driven
choreography. Low DENSITY is huge section gaps; high DENSITY drops card boxes for hairlines and
sets numbers in mono. High-variance layouts always collapse to a strict single column below
tablet width; declare that fallback in the same component, never assume it.

## 3. Choose the foundation honestly

- The project's UI foundation decision (`design` step 2, decision pattern 0009) binds here: one
  foundation per project, brand tokens on top, no second system introduced for one page.
- If the brief reads like an established design system (enterprise SaaS, Material-flavored,
  public-sector GOV.UK/USWDS register, Shopify or Atlassian surface), use the official package
  for it. Never recreate a known system's CSS by hand, and never import a system's tokens only
  to override most of them.
- If the brief is an aesthetic without an official package (glassmorphism, bento, brutalism,
  editorial, dark tech, kinetic typography), build it with the project's own tokens and say so
  in comments: borrowed inspiration, not an official system. "Apple Liquid Glass" on the web is
  always a labeled approximation.
- Verify current package names, versions, and install commands live (`stack` skill territory);
  check the dependency exists in the project before importing anything.

## 4. Layout rules

**Hero.**
- Fits the initial viewport: headline at most 2 lines, subtext at most 20 words and 4 lines,
  primary CTA visible without scrolling. Too much copy means the value proposition is unclear;
  cut copy, do not shrink the rule.
- Plan font scale and hero asset together. A 4-line hero headline is a font-size error.
- Top padding capped around 6rem desktop; hero content never floats halfway down the viewport.
- At most 4 text elements: one eyebrow OR brand strip (or neither), headline, subtext, CTAs
  (1 primary, at most 1 secondary). No trust micro-strip, pricing teaser, tagline under the
  CTAs, or feature bullets inside the hero; those get their own section below.
- The hero needs a real visual (section 7). Text plus a gradient blob is a placeholder.
- A "trusted by" logo wall lives in its own section under the hero, never inside it.
- Centered heroes only when VARIANCE is 4 or lower or the brief is a manifesto; otherwise
  split, asymmetric, or left-aligned compositions.

**Navigation.** One line at desktop (condense or move to a menu if it does not fit), height at
most 80px, default 64-72px.

**Section rhythm.**
- **Eyebrow rationing**: at most 1 small uppercase label above a heading per 3 sections, hero
  included. The check is mechanical: count uppercase-tracked micro-labels; more than
  ceil(sections / 3) fails. Default alternative: no eyebrow, the headline is enough.
- **Layout family repetition**: a layout family (3-column cards, full-width quote,
  image-text split, bento) appears at most once per page; a page of 8 sections needs at least
  4 different families.
- **Zigzag cap**: at most 2 consecutive image-text-split sections; break the third with a
  full-width section, vertical stack, bento, or marquee.
- **Split-header ban**: no "big headline left, small explainer paragraph floating right" as a
  section header. Stack them: headline, then body at readable measure. The split earns its
  place only when the right column carries a real visual or interactive element.

**Bento and grids.**
- Exactly as many cells as there is content; never a filler or empty tile.
- Background diversity: in any multi-cell grid, 2-3 cells carry a real image, tint, or pattern;
  all-white text cards read as template output.
- Grid over flex arithmetic: CSS grid with explicit columns, never percentage calc chains.
- Full-height sections use dynamic viewport units, not the static viewport height that jumps on
  mobile browsers.

## 5. Typography

- The project's type tokens (DESIGN.md section 3) bind. One family, few weights, scale steps
  only; hierarchy by size and color before weight.
- **Sans display is the default** for creative, premium, agency, and portfolio briefs alike.
  "Creative brief, so serif" is the single most-tested AI tell. A serif is justified only when
  the brand brief names one, or the register is genuinely editorial, luxury, publication, or
  heritage AND you can articulate why that serif fits that brand. Never reuse the same serif
  across consecutive projects, and never reach for the two LLM-favorite display serifs
  (Fraunces, Instrument Serif) by default.
- **Emphasis inside a headline**: italic or bold of the same family. Never a serif word
  injected into a sans headline for visual interest.
- **Italic descenders**: an italic display word containing y, g, j, p, or q clips under tight
  leading; keep line-height at least 1.1 and reserve bottom padding.
- Body text at a readable measure (about 65 characters); no oversized screaming headlines,
  hierarchy comes from weight and color before raw scale.

## 6. Color and theme

- One accent family, locked page-wide (DESIGN.md principles 2 and 10). A warm-gray page does
  not get a blue CTA in section 7; audit every component against the lock before shipping.
- Neutral base, saturation restrained; accent chosen for the brand, not the model's habit.
  If the brand genuinely is purple, execute purple with intent; the ban is on the reflex.
- **Premium-consumer palette rotation**: for luxury, artisan, wellness, and craft briefs the
  AI default is warm cream backgrounds with brass, clay, or oxblood accents and espresso text.
  Banned as a reflex. Rotate real alternatives: cold luxury (silver, chrome, smoke), forest
  (deep green, bone, amber), true off-black with warm tan, cobalt with cream, terracotta with
  slate, olive with brick, or monochrome with one saturated pop. Only use the cream-and-brass
  family when the brand brief names those colors and you can say why.
- **Theme lock**: one theme (light, dark, or system) per page, set at the root. Sections never
  flip to the inverted mode mid-scroll; background tints stay within the theme family. A
  deliberate full theme switch as a story device is allowed once per page, only when the brief
  asks for it.
- Design both modes from the start when the platform supports it; keep hierarchy, brand
  recognition, and contrast in both. No pure black or pure white surfaces; off-black and
  off-white keep depth. Test both modes before finishing.

## 7. Imagery and assets

Persuasion pages are visual products; a text-only page is not minimalism, it is unfinished.

Priority order for images:
1. **An image-generation tool** available in the environment: use it for section-specific
   assets (hero, product, texture, mood) at the right aspect ratio.
2. **Real photography**: brand assets from the brief, or seeded placeholder photography
   (picsum with a descriptive seed) and openly licensed sources when allowed.
3. **Neither available**: leave clearly labeled placeholder slots with exact dimensions and
   tell the owner which images are needed. Never fill the gap with hand-rolled SVG
   illustrations or fake screenshots built from styled divs.

Hard rules:
- **No div-built fake product UI** (fake task lists, fake terminals, fake dashboards). Use a
  real screenshot, a generated image, a real live component preview, or nothing.
- **Logo walls** use real SVG marks (Simple Icons or the brand's own files), never styled text
  wordmarks; invented brands get a simple generated SVG monogram. Logos only: no category
  labels under them. Logos must work in both themes.
- **Icons**: one family per project, from the owner's standing default in DESIGN.md
  (principle 9); lock one stroke width; never hand-drawn icon paths, never emoji as icons.
- Hand-rolled decorative SVG only when the brief asks for it and the mark is simple geometry.

## 8. Copy on the page

VOICE.md governs all language, including the mechanically enforced typography bans and the
banned-phrase list. On top of that, for persuasion pages:

- **Copy self-audit before done**: reread every visible string (headlines, buttons, captions,
  alt text, footer). Rewrite anything grammatically broken, cute-but-unclear, mock-poetic, or
  performatively humble. Plain beats clever-but-wrong, every time.
- **Fake-precise numbers**: statistics and spec values either come from real data, or are
  explicitly labeled as sample data, or they go. Never invent engineering precision.
- **Believable content**: no placeholder-people names (the "Jane Doe" effect), no generic
  egg avatars, no startup-slop brand names; use locale-appropriate, specific, realistic data.
- **Quotes**: at most 3 lines of body, real typographic quotes or none, attribution with name
  plus role (never a bare first name).
- **One copy register per page**: do not mix technical mono metadata, editorial prose, and
  marketing punch unless the brand voice explicitly does.
- CTA labels: at most 3 words, one label per intent for the whole page ("Get in touch" and
  "Let's talk" on one page is a fail), never wrapping to a second line at desktop.

## 9. Motion

- **Motion must be motivated.** Before adding any animation, name what it communicates:
  hierarchy, storytelling, feedback, or state transition. "It looks cool" is not a reason; an
  animation you cannot justify in one sentence gets cut.
- **Motion claimed is motion shown.** MOTION above 4 means the page actually moves: hero
  entrance, scroll reveals on key sections, hover physics on CTAs. Cannot ship working motion
  in scope? Drop the dial to 3 and ship clean static; never half-working choreography.
- **Reduced motion is mandatory** above MOTION 3: infinite loops, parallax, scroll hijacks, and
  pointer physics all collapse to static under the user's reduced-motion preference.
- Animate only transform and opacity; never top, left, width, height. No raw scroll-event
  listeners or per-frame state updates; use the platform's observer or scroll-driven APIs, or
  the animation library's scroll primitives (per `docs/standards/<stack>.md`).
- At most one marquee per page. One animation library per component tree. Grain and noise
  overlays only on fixed non-interactive layers, never on scrolling containers.
- Scroll-pinned patterns (sticky stacks, horizontal pans) follow the canonical skeletons in the
  upstream repo: pin at viewport top, scrub the inner track, clean up on unmount.
- DESIGN.md principle 7 (nothing moves uncaused) stays the default for product UI; a persuasion
  page may raise MOTION deliberately, within the rules above.

## 10. States and accessibility

- Full state cycles, not the happy path: skeleton loaders shaped like the final layout, empty
  states that say what to do, inline error states.
- **Button and form contrast**: every CTA readable against its background (WCAG AA, 4.5:1 body,
  3:1 large text); ghost buttons over photography get a scrim or border. Inputs, placeholders,
  focus rings, helper and error text all pass contrast against their section background.
- Labels above inputs, error text below, never placeholder-as-label.
- Tactile press feedback on interactive elements (a 1px translate or 2 percent scale).
- The accessibility floor of DESIGN.md principle 8 and COMPLIANCE.md applies unchanged.

## 11. Forbidden tells (hard bans, brief-override only)

The recognizable signatures of AI-generated pages. Each is banned unless the brief explicitly
asks for it:

- Version labels in the hero (BETA, EARLY ACCESS, v0.6) outside a genuine launch brief.
- Section-number eyebrows ("001 / Capabilities"), pagination labels on tiles, numbered scroll
  cues, "index of work" range labels, generic step labels ("Step 1 / Step 2": the verb is the
  label).
- Scroll cues of any kind ("scroll to explore", animated mouse icons).
- Decorative status dots on nav items, list rows, or badges; a dot only ever shows real
  semantic state, at most one per section.
- Locale, time, or weather strips ("LIS 14:23, 18 degrees") unless the product is genuinely
  place- or timezone-centric; a plain footer address is fine.
- Pills or tags overlaid on photos; photo-credit captions as decoration; version footers on
  marketing pages; live-stock counters without real data.
- Decoration text strips at the hero bottom ("DESIGN. BUILD. SHIP.") unless they are real
  navigation.
- Poetic section labels ("From the field", "On our desks"); "Quietly trusted by" social-proof
  headers; micro-meta sentences under eyebrows. Plain functional labels or none.
- Hairline crosshair grids as pure decoration; vertical rotated text outside genuinely
  experimental briefs; broken-and-italicized headline splits as a default move.
- Both a top and bottom border on every row of a long list; scoring bars with filled background
  tracks as comparison visuals on a marketing page.
- Long lists as bare bulleted lists: more than 5 items wants grouped chunks, a card grid, tabs,
  scroll-snap pills, or a "view full list" disclosure.
- Custom mouse cursors, neon outer glows, oversaturated accents, gradient text on large
  headers.
- Middle dots as the universal separator (at most one per metadata line).
- Em and en dashes anywhere on the page: already mechanically banned repo-wide (VOICE.md,
  `checks/check.mjs`), and doubly a tell in rendered UI.

## 12. Redesign protocol

Misreading the mode is the biggest source of bad redesign output. Detect it first: greenfield,
preserve (modernize without breaking the brand), or overhaul (new visual language, same content
and structure). Ambiguous? Ask once.

**Audit before touching**: current brand tokens, information architecture and conversion paths,
which content blocks do work and which are filler, signature patterns to keep, tells and broken
layouts to retire, the existing site's dial reading (that is the starting point, not the
baseline), and the SEO baseline (slugs, titles, structured data): SEO migration is the top
redesign risk.

**Preserve unless asked**: information architecture, slugs and anchors, nav labels, copy voice,
existing accessibility wins, analytics-tracked names and form fields.

**Modernization levers, in order of lift per unit of risk**: typography refresh; spacing and
rhythm; color recalibration (keep the brand accent); a motion layer on existing components;
hero and key-section recomposition; full block replacement only when a block is unsalvageable.
Sound structure and content? Targeted evolution (levers 1-4) gives most of the value at less
than half the risk of a full redesign.

**Never change silently**: URL structure, primary nav labels, form field names or order, the
logo or wordmark, legal and consent copy.

## 13. Pre-flight, then design-guard

Before calling the page done, check the built output against this skill: design read declared;
dials stated and recorded; hero within budget (2-line headline, 20-word subtext, 4 text
elements, CTA above the fold, real visual); eyebrow count within ration; no repeated layout
family; accent and theme locked page-wide; serif and palette justified or absent; every CTA
contrasting, non-wrapping, one label per intent; real images, no fake screenshots; copy
self-audited; every animation motivated and reduced-motion safe; full state cycles present; no
tell from section 11. Any miss means the page is not done.

Then render it and run `design-guard` on the result, as always. Report the design read, the
dials, and any deliberate overrides (with their reason) in one short block. ⚓
