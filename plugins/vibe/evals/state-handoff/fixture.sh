#!/usr/bin/env bash
# A project with a STATE.md whose handoff block is one ticket behind.
set -eu
mkdir -p docs/state src/auth src/routes
cat > docs/state/STATE.md <<'MD'
# STATE

## Handoff

- **Status:** building · **Phase:** auth · **Branch:** main · **HEAD:** 9f8e7d6
- **Gates:** tests 9/9 green
- **Now ▶** write src/auth/limiter.mjs: 3 attempts, then a 15 minute lockout, with tests
- **Blocked on:** nothing

## Log

### 2026-10-09

- **Done:** session store, password hashing
- **Docs touched:** none
- **Lessons:** none
- **Stopped at:** the limiter is next
MD
printf 'export function limiter() {}\n' > src/auth/limiter.mjs
printf 'export function login() {}\n' > src/routes/login.mjs
