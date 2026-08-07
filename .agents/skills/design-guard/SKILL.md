---
name: design-guard
description: Judgment check before delivering user-facing output the installed design method does not carry: generated documents, e-mails, exports, error and CLI output, and interfaces on platforms it has no guidance for (game engines, console, embedded, print). For a frontend it re-checks the render against its direction contract and the finish verdict instead of opening a second hunt. Run on what actually renders, not on the code.
---

# design-guard: look at it before you ship it

Render the thing (screenshot, preview, generated document, a real run of the command) and check
*that*, not the source. DESIGN.md and VOICE.md are the measuring stick; this catches what
automation cannot.

Impeccable, the installed design method, owns the making of a frontend: its craft floor, its
detector and its finish reviewer are the rulebook for one, and this skill does not carry a second
copy of it. Route first, then check.

| What you are about to deliver | Who judges it |
|---|---|
| A web, iOS, Android or adaptive interface | The method built it. Section 2: re-check, never re-hunt |
| A generated document, e-mail, export, error message, CLI or log output, notification | This skill. Section 3 |
| An interface on a platform the method does not carry: Unity, Godot and other game engines, console UIs, embedded and kiosk displays, TV, print | This skill. Section 3, and the verdict says no design method covered it |

## 1. The floors, on every route

Neither of these is negotiable by a direction, a template, or a medium, and neither is stated in
the method's own guidance, so they are checked here whatever route you took.

- **Accessibility floor**: contrast, focus order, labels on inputs and icons, keyboard path
  through the flow. (Legal baseline: see COMPLIANCE.md.) On a document: reading order and tagged
  structure. In any medium: never color alone carrying the meaning.
- **Reduced motion** (DESIGN.md principle 7): anything that moves collapses to static under the
  user's `prefers-reduced-motion: reduce`, with the content still readable. Exercise the
  preference, do not read the CSS for it.

## 2. A frontend: re-check against what was committed

The craft floor already ran, the detector already ran, and a reviewer that never saw the build
thread already scored the result. Start from those, and report what is still open.

1. **The direction contract was kept.** It is the opening comment in the artifact (THESIS,
   OWN-WORLD, STORY, FIRST VIEWPORT, FORM). Read it beside the render: a block describing
   something the page does not do is the finding. A contract the production build erased is its
   own finding, because nothing can be audited against it.
2. **The FINISH line is discharged.** The contract closes with the run's exit condition. A page
   that looks complete with the finish review never run is abandoned, not done.
3. **The finish verdict travels as it stands.** Its open items stay open until they are fixed,
   under the reviewer's own disposition word. Never summarized into a pass.
4. **The live-surface contract, on a redesign** (`design` step 3): URLs and slugs, page titles
   and structured data, navigation labels, form field names and their order, analytics names, the
   wordmark, legal and consent copy. Anything on that list that moved without the owner saying so
   is a finding, and what does move ships with redirects.
5. **DESIGN.md section 3 still mirrors the built world.** It is written from the build after the
   finish review; code is the source of truth, so tokens that moved since leave a stale mirror.

Scoring typography, spacing, palette or layout tells again is not this skill's job: that ground
belongs to the craft floor and the detector, which already ran. If something there is genuinely
wrong, the answer is another round of the method, not a private list here.

## 3. Output the method does not carry

Nothing else judges these, so judge them fully. On a platform the method has no guidance for, the
platform's own published guidelines are the missing rulebook: read them, check against them, and
name the gap in the verdict rather than implying coverage that does not exist.

**Visual**

1. **Tokens only.** Every color, size, radius and space comes from DESIGN.md section 3 and the
   code that owns them: no raw values, no palette bypass, no near-miss grays. A generator that
   ships its library's default blue is a finding, not a detail.
2. **The medium's own constraints are honored.** An e-mail renders without web fonts and without
   the CSS its clients strip. A document paginates: headers, page numbers, no heading orphaned at
   a page foot, tables that survive a break. A CLI survives being piped to a file, with no escape
   sequences left in it, and stays readable where the terminal wraps it.
3. **Layout truth on the real content.** No text over text, no wrapping labels or prices, equal
   heights in a row, reserved space for what is optional. Check the ugly cases: empty, error,
   overflow, the longest value your data actually contains.
4. **No stock-AI look.** DESIGN.md principles 9 and 10 bind here too: a template's stock palette,
   a grab-bag of icons and an emoji standing in for one reach a document and an e-mail as easily
   as a screen, and no detector is watching this medium.

**Voice**

5. **Reads like VOICE.md**: register, wording table respected, direct and calm. Its banned-phrasing
   list is explicitly judgment rather than mechanical, and this is the check that catches it.
6. **Errors follow the pattern**: what happened, what the user can do; no codes without words, no
   blame, no false cheer. This is the rule that leaks furthest: a string in an API response, a log
   line or a toast is user-facing text and is judged here.
7. **Every value has a label**, and the output answers "what is this and what do I do with it".

## Verdict

Report findings as one line each (`<where>: <what's wrong> → <fix>`), most severe first, then fix
them before delivering. Name the route you took, so the reader knows what was judged and by whom.
Nothing to report? Say "clean" and ship. If a finding recurs across sessions, it wants a token, a
component, or a mechanical check. Propose that once, in INTAKE. ⚓
