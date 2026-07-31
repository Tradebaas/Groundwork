---
description: What is done and what is left, in plain language. Add "all" for every project.
allowed-tools: Bash(node:*)
---

Report progress. Arguments given: $ARGUMENTS

- No arguments: run `node checks/progress.mjs` and show its output as is.
- Arguments containing "all" or "alles": run `node checks/progress.mjs --all` and show its
  output as is.
- Arguments containing "board", "page", "serve" or "scherm": hand the owner the line
  `node checks/progress.mjs --serve` to run in their own terminal, and say it stays running
  until they stop it. Do not start it yourself: it is a server, so it never returns.
- Arguments containing "links", "verwijzingen" or "graph": run `node checks/progress.mjs --links`
  and show its output as is. It says which document points at which, what nothing points at, what
  enough documents point at to be load-bearing, and how many paths point at nothing.

The script already writes in the project's own language and phrasing. Pass it through without
rewriting, summarizing, or adding commentary. When it reports something under "Heads up" or
"Let op", name the one action that would resolve it, in one sentence.
