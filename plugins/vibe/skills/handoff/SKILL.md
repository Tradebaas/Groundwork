---
name: handoff
description: Write the handoff that lets the next session, or the next person, continue without this conversation. Use at the end of a ticket before /clear, when the user says "handoff", "checkpoint", "fresh session" or "save state", at a milestone, before a break, or when someone else takes the project over. Deep mode (a stranger must be able to continue in ten minutes) when a person or tool changes.
---

# handoff: the repo must speak for itself

A fresh session reads `docs/state/STATE.md` first, so the handoff has one home: STATE.md. Never a
second document, never the chat. Two depths, same file:

- **Session handoff**, the default: park the current train of work so a fresh, cheap session
  resumes it. Write from what is already in the conversation; open a file only for a fact that is
  genuinely missing.
- **Transfer handoff**, when a person or tool changes, at a milestone, or on request: the same
  block, plus the audit below, because the reader has none of your context.

No STATE.md in this project? Say so in one line and write the handoff block into a new
`docs/state/STATE.md` with the shape below; a project without one gets one the first time it needs it.

## The block at the top of STATE.md, literally true right now

- **Status / Phase / Branch / HEAD** current.
- **Gates:** the real state with the number: "checks green, tests 42/42, CI green @ <sha>".
- **Now ▶** the single exact next action, concrete enough to start cold. Not "continue work" but
  "wire the Stop hook into settings.json per the plan in the log entry below".
- **Blocked on:** what waits on the owner or an external thing, else clear it.

Then one dated log entry, newest first, tight and skimmable: **Done** (a few bullets), **Docs
touched** (links, never restated content), **Lessons** (only what a fresh session would otherwise
rediscover the hard way: a dead end, a non-obvious constraint, a decision with its reason),
**Stopped at** (mirrors Now ▶).

Route facts to their owner, not into the handoff: a decision to `docs/decisions/`, deferred work
to a `defer:` marker plus `docs/state/DEBT.md`, new scope to `docs/state/INTAKE.md`, a correction
the owner gave twice to INTAKE.md as an improvement row. Keep STATE.md under 150 lines; overflow
moves the oldest log entries to `docs/state/log/YYYY-MM.md`. Keep secrets, tokens, credential URLs
and personal data out: name where a credential lives, never its value. Run `node checks/check.mjs`
if the project has it, so you never hand off a red repo.

## Transfer handoff: walk it as the stranger would

1. `README.md`: do the start instructions still hold for this project?
2. STATE.md handoff block: literally true, including the gates line. A stale handoff is the most
   damaging lie in the system.
3. `docs/product/BRIEF.md`: does it still describe the product that exists?
4. Can the stranger run it? Setup steps, `.env.example` complete, seed data, runbooks in
   `docs/operations/`. Follow them literally; fix what is wrong, do not annotate around it.
5. Secrets and access: nothing secret in the repo; who grants what is named in
   `docs/operations/access.md`.
6. Open threads: in-flight specs at their real status, INTAKE triaged or queued, DEBT.md
   reconciled with the `defer:` markers in the code.

Fix everything fixable now. What you cannot fix becomes a named gap in STATE.md: a named gap is
transferable, a hidden one is not. If a separate "handover document" feels needed, the repo is
failing this skill; fix the repo instead.

## Hand control back

End with one line confirming the handoff is in STATE.md, the literal command for a fresh session
(`/clear` in Claude Code), and the resume prompt in a code block so it copies in one click:

```
Read docs/state/STATE.md and continue from the Now ▶ action.
```

Never clear the context yourself and never delete anything; clearing is the owner's call.
