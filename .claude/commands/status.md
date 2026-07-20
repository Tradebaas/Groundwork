---
description: What is done and what is left, in plain language. Add "all" for every project.
allowed-tools: Bash(node:*)
---

Report progress. Arguments given: $ARGUMENTS

- No arguments: run `node checks/progress.mjs` and show its output as is.
- Arguments containing "all" or "alles": run `node checks/progress.mjs --all` and show its
  output as is.

The script already writes in the project's own language and phrasing. Pass it through without
rewriting, summarizing, or adding commentary. When it reports something under "Heads up" or
"Let op", name the one action that would resolve it, in one sentence.
