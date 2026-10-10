---
name: start
description: Open a work session the cheap way: read the handoff, pin the ticket, and pick the session shape (plan mode, goal, loop, routine, advisor, subagent, model) from one table so the owner never has to. Run as the first command of a session with /vibe:start, or when the owner asks which Claude feature to use for a piece of work.
disable-model-invocation: true
---

# start: one ticket, one session, the right shape

Model and effort are set once, globally, and never switched mid-session: each model has its own
prompt cache, and a switch re-reads the whole history at full price. What this skill picks is the
*shape* of the session around that fixed model.

## 1. Where we are

- `docs/state/STATE.md` exists: read its handoff block and nothing else; it is the starting point,
  checked against the latest commits before you act on `Now ▶`.
- No STATE.md: ask in one line what this session is for. Do not propose a governance layer;
  `begin` lays one down only when the owner asks for it.

## 2. The ticket

One ticket per session. If the owner names more than one, take the first and park the rest in
STATE.md's `Now ▶` chain or in INTAKE.md. When the ticket is done: `handoff`, then `/clear`.

## 3. The shape, from this table

| Situation | Do this | Not this |
| --- | --- | --- |
| The diff cannot be described in one sentence | plan mode first (Shift+Tab); the owner approves the plan | build and roll back |
| "Keep going until the tests pass" or any condition the output can prove | `/goal "<condition>, or stop after 20 turns"`, in auto mode | a `/loop` that resends the whole context every few minutes |
| Waiting on CI, a deploy, a remote job | `/loop 8m check <what>`, or the Monitor tool when the session has it | polling by hand, or a loop under the cache lifetime |
| Recurring work that must run without this machine | a routine via `/schedule`, on Sonnet, with a self-contained prompt | a local `/loop`, which expires after 7 days |
| A hard call where plan quality decides the outcome | `/advisor opus` beside the session model; toggling it keeps the cache | `opusplan` or `/model` mid-session |
| Reading logs, test output, many files | a subagent on Sonnet that returns the conclusion | pulling the output into this context |
| Two failed corrections on the same problem | `/clear` with a better first prompt, or `/rewind` to the turn before the dead end | a third attempt in a context full of the first two |
| Fable | only for the hard tier, chosen before the session starts | as the default |
| Agent teams, `ultracode` | only for work that is genuinely parallel and independent | as a speed-up for ordinary tickets |
| A plugin skill that pins its own `model` | start the session on that model (Code Apps skills pin Sonnet, Power Automate skills pin Opus) | invoking it from a session on another model: every call is a model switch |

## 4. Say it in two lines

State the ticket and the shape you chose, then start. No menu, no recap of this table.
