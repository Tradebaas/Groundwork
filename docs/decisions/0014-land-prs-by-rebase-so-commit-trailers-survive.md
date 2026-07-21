# 0014: Land PRs by rebase so commit trailers survive

- **Date:** 2026-07-21
- **Status:** accepted
- **Decider:** owner

## Context

Decision: every commit carries a `Traces-to:` trailer, so a sha resolves back to the requirement
it served (the gate lives in `checks/check.mjs`, wired as a `commit-msg` hook and re-proven in
CI). The trailer is only worth anything if it survives onto `main`, because `main` is the history
an auditor reads and the only place a change list can be generated from.

This repo squash-merged. Two PRs landed before the problem surfaced, and both are on `main` today
carrying a trace that `git log --format='%(trailers:key=Traces-to)'` returns nothing for.

Git parses only the final block of a message as trailers. GitHub composes the squash message
itself, and does two things that break that block:

1. it hard-wraps long lines, so a trailer value splits across two lines and stops being a trailer;
2. it appends its own `Co-authored-by:` block after a blank line, which then becomes the final
   block, putting anything above it outside the trailer block.

The second is unconditional. No wording, ordering or length discipline in the PR body avoids it.

## Decision

PRs land on `main` by rebase. The authored commits arrive unchanged, so the trailer that the hook
validated locally and CI re-proved is the exact trailer on `main`.

Squash is disabled at the host (`allow_squash_merge=false`) rather than discouraged in prose. A
setting someone can pick by accident is not a guarantee, and this failure is silent: the gate
stays green while the artifact it exists to produce comes back empty.

## Alternatives rejected

- **Keep squash, put the trailer in the PR body.** Tried, and it is what failed twice. Broken by
  construction because of the appended co-author block, not by a fixable mistake.
- **Keep squash, accept no trace on `main`.** Gives up the reason the trace was built. The hook
  would still force the question at commit time, which has value, but the audit artifact is the
  point.
- **Merge commits instead of rebase.** Also preserves the commits and their trailers, and was not
  chosen only because it gives up the linear history the owner wants. Still a valid fallback.
- **Rewrite the two untraced commits on `main`.** Rejected: rewriting shared history to improve
  an audit trail damages the thing it is meant to protect. They stay as they are, and this record
  explains why.

## Consequences

- `main` shows every commit of a PR rather than one per PR. Granularity is the price of the trace.
- The `trace` CI job no longer validates the PR body; the commit range is the whole check.
- Products generated from Groundwork inherit the rebase rule via `docs/standards/GLOBAL.md`. A
  host without a rebase option needs merge commits, not squash.
