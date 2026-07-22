---
name: calibrate
description: Pick the model and effort level for a work session BEFORE it starts, matched to the work planned and to token cost. Load when the user asks which model or effort to use, says "which model", "calibrate", "pick a model", "effort", or describes the next session's work and wants the cheapest setup that will finish it in one pass. Never for switching mid-session; the prompt cache is per model, so a mid-session switch re-reads the whole history at full price.
---

# calibrate: right-size the model and effort before the session starts

Every session runs on one model at one effort level, and that choice is made once, at the
start. The prompt cache is scoped per model: switch mid-session and the entire conversation is
re-read at full input price. So the calibration moment is *before* the work, ideally as a cheap
throwaway question in a small-model session, and the output is a start command the user pastes.

This skill carries a method, not a model table. Model names, prices and effort levels change;
a hardcoded table would rot. What the session's tool offers today is looked up live, every time.

## The method

1. **Name the session's work.** One ticket per session (AGENTS.md efficiency rule), so the
   ticket defines the work. If the user hasn't said what the session is for, ask that one
   question first; without it there is nothing to calibrate against.

2. **Get the live lineup, never from memory and never from a saved URL.** First establish which
   tool the session will run in and which vendor's models it offers; that pair is the input, not
   an assumption. Model names, prices, effort levels *and the pages that document them* all
   change over time, so this skill deliberately hardcodes none of them. Search the web for that
   vendor's **official, current** documentation at the moment of asking (the models overview
   with pricing, plus whatever the vendor calls its reasoning dial: effort, extended thinking,
   reasoning budget) and accept only the vendor's own domains as sources. Cross-check against
   what the tool itself offers (its model picker or settings). Any model or effort level
   released after this skill was written is in scope automatically; that is the point of
   looking it up.

3. **Classify the work into a capability tier.** Tiers, not model names, so the mapping
   survives every release:
   - **Mechanical:** doc edits, renames, config changes, running checks, fixes with a known
     cause. → cheapest current model, low or medium effort.
   - **Standard build:** a spec'd feature, tests, a refactor inside one module, routine
     review. → the mid-tier all-rounder, its default effort.
   - **Hard:** architecture, debugging with unknown cause, security-sensitive work, ambiguous
     scope, work where a wrong answer is expensive. → the most capable tier, high effort.
   Map each tier to the concrete cheapest model that fills it in today's lineup from step 2.

4. **Apply the two dials correctly.** The diagnostic, whatever the vendor calls the dials:
   *didn't know enough → bigger model; didn't try hard enough → higher effort/thinking.*
   Within a tier, raise effort before jumping a model tier. Reserve the levels above the
   default high setting for work where high demonstrably fell short; they exist for the
   hardest problems, not as a default. A tool without a reasoning dial has only the model
   choice; calibrate that one dial with the same logic.

5. **Optimize for total token cost, not sticker price.** The cheapest combination is the one
   expected to finish the ticket in one pass. A too-small model that fails and forces a redo
   in a bigger one costs more than starting right-sized. When genuinely unsure between two
   tiers, take the higher one for irreversible or security-relevant work and the lower one for
   easily-verified, easily-retried work.

6. **Deliver one recommendation, paste-ready.** One combination, one reason, and the exact way
   to start it in the user's tool: the launch flag, picker command, or settings path that tool
   uses for model and effort (look it up in the tool's own docs if unsure; for example, Claude
   Code takes `claude --model <model>` plus `/effort <level>` as the first input). No menu of
   alternatives; the session protocol's "one best next step" applies here too.

## Hard boundary: never mid-session

If the running session's model turns out too small, do not advise switching models in place:
the switch drops the per-model cache and the full history is re-read at full price. The correct
move is the `checkpoint` skill (flush the handoff to STATE.md), then clear the context, then
restart with the right model via this method. Wrong calibration costs one restart; a
mid-session switch costs the whole context twice.

## Relation to the rest of the system

Calibration is judgment before the session; `checkpoint` is the handoff at the end of one.
No automated gate can check this choice, and none should: the gates guard the repo, this skill
guards the token bill. Close a calibration answer with the start command and the one-line
reason. ⚓
