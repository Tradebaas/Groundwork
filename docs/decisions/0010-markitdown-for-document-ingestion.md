# 0010: markitdown is the document-to-Markdown ingestion tool, on demand only

- **Date:** 2026-07-06 · **Status:** accepted · **Decider:** owner (Remon), built by Claude

## Context

Building a product often means reading source material that is not Markdown: PDFs, Office files,
images, data dumps. Reading those directly is expensive (binary bulk spends tokens on noise) or
impossible for an agent. A standard, tool-agnostic way to turn them into clean Markdown first
saves tokens on every such task and keeps ingestion consistent across IDEs and models.

## Options considered

1. **Adopt markitdown as an on-demand skill (chosen):** Microsoft markitdown converts PDF, Office,
   images, audio, HTML, and data files to Markdown; it is MIT-licensed, actively maintained, has a
   CLI, a Python API, and an MCP server. Wired as the `ingest` skill plus an Efficiency pointer, so
   it costs nothing until an agent needs it and adds no always-on dependency.
2. **Vendor the markitdown source into the repo:** copies a whole Python codebase into a framework
   that is otherwise plain Markdown plus Node checks. Breaks "pointers over copies" and "use the
   dependency, do not re-implement it". Rejected.
3. **Make it a hard requirement with its own gate:** forces Python 3.10+ on every project, even
   pure-Node ones that never touch a PDF. Too heavy for a benefit that is task-specific. Rejected.

## Decision & consequences

markitdown is the project's ingestion tool, documented in the `ingest` skill (install, CLI, MCP,
Python API, output rules, security floor, verify step). It stays opt-in: Node remains Groundwork's
only always-on requirement; `pip install 'markitdown[all]'` (Python 3.10+) happens only when a
task actually converts a file. Easier now: any agent has one consistent, low-token way to read
documents, and a product that must parse uploads has a vetted library to reach for. Watch for: the
optional LLM image-description and Azure Document Intelligence features send content to a third
party (a `comply` question), and conversion is lossy, so critical numbers and wording get
spot-checked against the source (the skill's verify step).
