---
name: checkpoint
description: Flush a lean mid-session handoff into STATE.md so you can /clear and resume the same work in a fresh, cheap context. Load when one chat session has used roughly 15% of the context window (the activation point; past ~40% it is urgent), when the session feels long or slow, or when the user says "checkpoint", "handoff", "samenvatting", "tokens sparen", "verse sessie" or "/clear en verder". Not for milestones or transfer to another person: that is `handover`.
---

# checkpoint: reset the context, keep the thread

Long sessions get expensive: every turn re-sends the whole history. A checkpoint writes down
just enough for a fresh session to pick up exactly where this one stopped, so you can `/clear`
and continue at a fraction of the token cost. The fresh session already reads STATE.md first
(AGENTS.md session protocol, step 1), so the handoff has one home: STATE.md. Do not create a
second document.

This is the *light* sibling of `handover`. `handover` transfers the project to a stranger at a
milestone and runs a full audit. `checkpoint` just parks the current train of work so you can
resume it yourself in a clean session. If the work is actually being handed to someone else or a
milestone is closing, use `handover` instead.

## When to fire

- Roughly 15% of the context window is spent in this session, or the session is long and
  every turn feels heavy. Fire *before* the harness auto-summarizes, so the handoff is yours and
  accurate, not a lossy machine summary.
- The user asks for it, or is about to `/clear`.
- Do not fire for a two-message session: there is nothing to save and the checkpoint itself costs
  tokens.

The 15% mark is the activation point: propose the checkpoint there by default. Stretching past it
to at most ~40% is the user's call, and only when finishing the current unit of work first is
clearly better than parking it. Past ~40%, always checkpoint: advise it urgently, before quality
degrades and the handoff turns lossy. Suggest, do not force, and never run `/clear` on the
user's behalf. An optional global Stop hook (`~/.claude/hooks/checkpoint-reminder.mjs`) surfaces
this reminder automatically once context crosses the threshold; it only ever suggests.

## The method (do it from context you already have; do not re-read the repo)

The whole point is to spend few tokens. Write from what is already in this conversation. Only
open a file if a fact is genuinely missing.

1. **Update the handoff block at the top of `docs/state/STATE.md`** so it is literally true right
   now. Every field earns its place:
   - **Status / Phase / Branch / HEAD** current.
   - **Gates:** the real state (checks, tests, CI), with the number. "checks green, tests 42/42".
   - **Now ▶** the single exact next action, concrete enough to start cold. Not "continue work"
     but "wire the Stop hook into settings.json per the plan in the log entry below".
   - **Blocked on:** anything waiting on the user or an external thing, else clear it.
2. **Add one dated Log entry** (newest first) with, tight and skimmable:
   - **Done:** what changed this session, in a few bullets.
   - **Docs touched:** the files a resumer must open first, as links. Point, do not restate.
   - **Lessons / gotchas:** only what a fresh session would otherwise rediscover the hard way
     (a dead end tried, a non-obvious constraint, a decision and its reason). Skip the obvious.
   - **Stopped at:** the precise point work paused, mirroring Now ▶.
3. **Route facts to their owner, not into the checkpoint.** A real decision goes to
   `docs/decisions/`; deferred work gets a `defer:` marker plus a line in `docs/state/DEBT.md`;
   new scope goes to `docs/state/INTAKE.md`. STATE.md links to them; it does not absorb them.
4. **Keep STATE.md under its 150-line budget.** If the Log overflows, move the oldest entries to
   `docs/state/log/YYYY-MM.md` (the existing manifest pattern), do not trim the new entry.
5. **Run `node checks/check.mjs`** so you never hand off a repo that is already red.

## Then hand control back to the user

End your turn with a short block the user can act on without thinking:

- One line confirming the handoff is written to STATE.md.
- The instruction: **run `/clear`** to start a fresh session.
- The resume line to paste into that session, for example:
  `Read docs/state/STATE.md and continue from the Now ▶ action.`
  (The session protocol reads STATE.md anyway; the paste just makes it explicit and works even in
  a tool that does not auto-load AGENTS.md.)

Do not run `/clear` yourself and do not delete anything. Clearing is the user's call.

## Relation to the automated gates and the rest of the system

A checkpoint is a discipline, not a check. `checks/check.mjs` only enforces that STATE.md stays
under budget and the prose stays clean; it cannot judge whether Now ▶ is truly resumable. That
judgment is this skill's job. A checkpoint that leaves Now ▶ vague has failed even with all gates
green. When the fresh session starts, it should need this file and nothing from the old chat. ⚓
