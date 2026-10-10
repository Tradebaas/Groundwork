---
description: The owner ends a ticket and will clear the session. The handoff lands in docs/state/STATE.md as a literally true block with one next action, and the reply ends with the resume prompt.
tags: [state]
max_turns: 15
allowed_tools: [Read, Glob, Grep, Skill]
---

We just finished the login rate limiter in src/auth/limiter.mjs (3 attempts, then a 15 minute lockout), tests 12/12 green, committed as a1b2c3d. Next up is wiring it into the login route in src/routes/login.mjs. I'm going to clear the session now, wrap it up.
