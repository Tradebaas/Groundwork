# 09: Efficiency rules in AGENTS.md and checkpoint

- **Blocked by:** 01-ticket-format
- **Status:** ready

**What to build:** The always-loaded rulebook carries the two session-economy rules the field
converged on. AGENTS.md efficiency section states: one ticket per fresh session, clear context
between tickets; checkpoint activates at ~15% of the context window, stretching to at most
~40% is the owner's call and only when finishing the current unit of work first is clearly
better, past ~40% always checkpoint. The repo `checkpoint` skill carries the same 15/40 rule
in its trigger and method. AGENTS.md stays inside its 150-line budget by tightening existing
lines, never by weakening `budget-agents`.

**Acceptance:**

- [ ] AGENTS.md states one-ticket-per-fresh-session and the 15/40 checkpoint rule
- [ ] The repo `checkpoint` skill trigger and body match the 15/40 rule
- [ ] `budget-agents` still passes at 150 lines
- [ ] `node checks/check.mjs` green
