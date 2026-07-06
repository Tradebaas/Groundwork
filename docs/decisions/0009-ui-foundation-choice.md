# 0009: every project picks exactly one UI foundation before the first screen

- **Date:** 2026-07-06 · **Status:** accepted · **Decider:** owner (Remon), built by Claude

## Context

Groundwork enforces a strict design system, but until now the `design` skill assumed the system
is always built from scratch. Real projects differ: some owners bring a full brand guide, some
have nothing, some want the speed and tested accessibility of an existing component library, and
some need a fully bespoke look. Without an explicit choice point, the agent decides silently and
the project ends up with a mixed UI stack that no one chose.

## Options considered

1. **One explicit foundation choice inside the `design` skill, with a live showcase (chosen):**
   the owner chooses a component library or a bespoke system as the single UI source of truth,
   compares options in `docs/design/reference/ui-library-showcase.html` (working demos, one page
   per library), and the choice lands as a decision record plus a DESIGN.md entry. Brand tokens
   always sit on top through the library's theming layer or the project's own token file.
2. **Always bespoke (previous implicit behavior):** maximum control, but slow for owners who
   just want a solid themed library, and it ignores brand guides that already exist.
3. **Let the agent pick a library per task:** fastest to start, but produces mixed foundations
   and untraceable look-and-feel decisions. This is exactly the drift Groundwork exists to stop.

## Decision & consequences

The `design` skill gains a "UI foundation" step: import the owner's brand guide or derive one
together, then choose one foundation (a library from the showcase, an equivalent for the chosen
stack, or bespoke) and record it here in `docs/decisions/`. DESIGN.md section 3 names the
foundation and where its theme/token SSOT lives in code. One foundation per project: adding a
second library or building beside the chosen one requires a new decision record first. The
showcase page is a hand-built impression for comparing style registers; current library facts
(maintenance, license, stack fit) are always verified live via the `stack` skill before the
decision. Easier now: owners choose with their eyes, and every project's UI traces to one
recorded choice. Watch for: the showcase aging; refresh it when the ecosystem shifts.
