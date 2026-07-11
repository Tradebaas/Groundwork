# 0012: Frontend persuasion pages follow the `taste` skill, adapted from leonxlnx/taste-skill

- **Date:** 2026-07-11 · **Status:** accepted · **Decider:** owner (Remon) + agent

## Context

Groundwork covered design setup (`design`, decision 0007) and a final rendered-output check
(`design-guard`), but carried no execution rulebook for the page type AI assistants fail at
most visibly: landing pages, marketing sites, portfolios and explainers, where models default
to a recognizable templated look. The open-source skill
https://github.com/leonxlnx/taste-skill (design-taste-frontend, MIT) encodes exactly that
missing layer: brief inference before code, three configuration dials, layout and motion
discipline, and a long list of empirically collected "AI tells". The owner asked to base
Groundwork's UI/design approach on it.

## Options considered

1. **Adapt it as a new skill `taste`, rebase `design`/`design-guard`/DESIGN.md on it (chosen):**
   the upstream content is a per-page build method, a layer that did not exist yet; the
   existing skills keep their distinct jobs (system setup, final check) and gain pointers.
2. **Replace `design` or `design-guard` with the upstream skill verbatim:** wrong fit. Neither
   covers the same job, and the verbatim file breaks house rules: em dashes and curly quotes
   (mechanically banned), 1207 lines (budget is 500), React/Tailwind/GSAP specifics that
   contradict decision 0006 (stack chosen per project), and a Phosphor-first icon rule that
   contradicts the owner's standing Lucide default (decision 0007 territory).
3. **Fold the rules into DESIGN.md:** would bloat an always-relevant template with rules that
   only persuasion pages need; skills exist to load such methods on demand.

## Decision & consequences

`.agents/skills/taste/SKILL.md` carries the adapted method: design read, dials
(VARIANCE / MOTION / DENSITY, recorded in DESIGN.md section 3 by `design` step 4), honest
foundation choice, layout/typography/color/imagery/copy/motion rules, forbidden tells, redesign
protocol, pre-flight. Conflicts resolved toward Groundwork's owning docs: icon family stays the
owner's DESIGN.md default (upstream itself allows an explicit owner preference to win); language
rules defer to VOICE.md; stack-specific skeletons stay upstream (linked), fetched when the
project's stack matches. DESIGN.md principle 7 (nothing moves uncaused) stays the product-UI
default; persuasion pages may deliberately raise the motion dial under `taste`'s
reduced-motion and motivation rules. Watch for: upstream evolves (re-sync deliberately, not
automatically), and dial values must actually land in DESIGN.md per project or the skill
degrades to taste-by-vibes.
