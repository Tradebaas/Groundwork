# 0007: Bespoke design & voice per project, seeded from the owner's captured defaults

- **Date:** 2026-07-06 · **Status:** accepted · **Decider:** Groundwork build (Claude, per owner brief)

## Context

Nothing may ship with a generic "AI default" look or voice. Design taste is genuinely the
owner's, and every owner's taste differs, so the framework captures the owner's defaults per
project (the `design` skill's intake) rather than baking one brand's preferences into the
template. Groundwork's own language is English; product language is set per project.

## Options considered

1. **Principles + defaults in the framework, tokens per project (chosen):** `docs/design/`
   ships the durable layer (principles, quality rules a linter can't check, the owner's
   defaults) as TEMPLATEs; the `design` skill derives each project's concrete tokens
   (type scale, color, spacing, radius, components) and voice rules with the owner, per brand.
2. **One fixed design system shipped in the framework:** one brand's tokens forced onto every
   project; exactly the generic-default failure the brief bans, just with better taste.
3. **Fully per-project from scratch every time:** re-asks the owner what is already known,
   re-derives principles, and drifts across projects. Wasteful and inconsistent.

## Decision & consequences

Four-layer defense against design drift, adopted from the studied production system: tokens in
code (SSOT) → mirrored spec doc (drift-checked) → `design-guard` judgment skill for un-lintable
rules (typography discipline, spacing ladder, accent restraint, no AI-tell punctuation in copy)
→ screenshot audit at delivery. The `design` skill asks the owner only what is genuinely
theirs (brand, feel, wording); everything else it decides from the principles.
