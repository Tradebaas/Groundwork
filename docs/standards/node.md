# Node standards: Groundwork's own stack

- **Stack:** Node (ES modules, no build step) · **Platform:** no · **Verified:** 2026-08-26

This framework is written in the stack it ships: plain `.mjs` modules and Markdown, run directly by
Node, with no dependencies at all. `GLOBAL.md` is the cross-stack floor and applies here unchanged;
this file adds only what is true of this stack. How the project is built and governed lives in
`AGENTS.md`, not here.

## The floor

| Class | The risk it covers | Form | Answer |
|---|---|---|---|
| `builds` | It does not assemble or deploy, and finds out in production | not applicable | Nothing is assembled: modules run directly under Node, and the one published artifact is a tracked HTML file |
| `behaves` | It does not do what it claims, and nothing says so before a user does | command | `node checks/drill.mjs` |
| `analyzed` | Defects a machine can see are shipped because no machine looked | command | `node checks/check.mjs` |
| `dependencies` | Third-party code arrives with known holes, unknown licences, or unrecorded | not applicable | There is no package manifest and no third-party code, so there is nothing to audit, licence or list in a bill of materials |
| `secrets` | Keys, tokens and passwords ship inside the product | command | `node checks/check.mjs` |
| `renders` | What a person actually sees is broken, unreadable or unusable | command | `npx -y impeccable@latest detect index.html` |

On `behaves`: the drill unpacks a fresh copy, runs every gate suite inside it and walks it to a
governed first commit. The sixteen suites also run one by one in the gate job, ahead of the checks
they prove, so a suite that stops running is a red build rather than a quiet gap.

On `analyzed`, and stated as a gap rather than dressed up as an answer: that command runs this
project's own static analysis - secret scanning, dead-code detection, file-size limits - and
nothing a linter or a type checker would catch. Swallowed errors, unused bindings and unhandled
rejections are found by review here, not by a machine.

On `dependencies`: verifiable rather than asserted, and it stops being true the day a dependency is
added. The waiver is the reason to notice that day.
