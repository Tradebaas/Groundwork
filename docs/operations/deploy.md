# Deploy runbook

<!-- Required by the `deliver` skill: nothing deploys except via this file, and first delivery
     writes it. Fill every placeholder before the first deploy. Secrets never live here - this
     file points to where they live. A runbook that lies is worse than none: keep it current. -->

## Target

- **Environment(s):** <name and URL of each, e.g. production https://..., staging https://...>
- **Hosting / platform:** <where it runs>
- **Credentials:** <where the deploy credentials live (secret manager, keychain, CI secrets) and
  who holds them. Never the values.>

## Deploy

<!-- The exact, ordered steps to ship a release. A new maintainer runs these without asking. -->

1. <step>
2. <step>
3. <step>

## Verify

- **Live URL:** <where to confirm the release is up>
- **Smoke checks:** <the critical user flows to exercise against the real environment after deploy,
  per the `verify` skill. List them by name. A green build is not a live check.>

## Rollback

<!-- How to get back to the last good state, fast, under pressure. The `maintain` skill calls this
     "rollback per runbook" during an incident. Write it so it works when you are stressed. -->

1. <step>
2. <step>
