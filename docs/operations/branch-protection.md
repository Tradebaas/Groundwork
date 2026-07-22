# Branch protection runbook

<!-- Merge rules for `main`, enforced by GitHub itself - the one layer local hooks and CI cannot
     cover (a clone that never ran --install-hooks, a direct push). Owner/admin action: run from
     the repo root with gh authenticated; gh fills {owner}/{repo} from the current directory, so
     the commands work unchanged in every product copy. Classic branch protection, not rulesets:
     one repo, one idempotent command. Free on public repos; private repos need a paid plan. -->

## Desired state

- **Pull request required, zero approvals.** Nothing reaches `main` by direct push. Zero
  approvals because GitHub forbids approving your own PR: on a solo repo, one required review
  blocks every merge. The merge click stays with the owner.
- **Required checks `gate` and `trace`,** pinned to the GitHub Actions app (id 15368) so no
  other app can report green under those names. The names are the job ids in
  `.github/workflows/ci.yml`; rename the jobs, update the `checks` array here and re-apply.
- **Admins included.** The rules bind the owner too; emergency hatch below.
- **Conversation resolution required.** Open review threads block the merge.
- **Deliberately off:** `strict` (up-to-date-before-merge; the flow is one PR at a time,
  rebased before merge anyway) and `required_linear_history` (rebase merges keep history
  linear in practice). Force pushes and deletions are blocked by default once protection exists.

## Apply

The endpoint replaces the whole config on every call: always send the full desired state.
A delta-only body silently resets every omitted setting to off.

```sh
gh api --method PUT 'repos/{owner}/{repo}/branches/main/protection' --input - <<'JSON'
{
  "required_status_checks": {
    "strict": false,
    "checks": [
      { "context": "gate", "app_id": 15368 },
      { "context": "trace", "app_id": 15368 }
    ]
  },
  "enforce_admins": true,
  "required_pull_request_reviews": { "required_approving_review_count": 0 },
  "restrictions": null,
  "required_conversation_resolution": true
}
JSON
```

## Verify

```sh
gh api 'repos/{owner}/{repo}/branches/main/protection' --jq '{
  pr_required: (.required_pull_request_reviews != null),
  approvals: .required_pull_request_reviews.required_approving_review_count,
  checks: [.required_status_checks.checks[].context],
  admins_included: .enforce_admins.enabled,
  conversations: .required_conversation_resolution.enabled
}'
```

Expected:

```json
{
  "pr_required": true,
  "approvals": 0,
  "checks": ["gate", "trace"],
  "admins_included": true,
  "conversations": true
}
```

## Emergency hatch

For platform outages only (Actions down, a required check that can never run) - never for a
red gate; a red gate is information (AGENTS.md hard rule). Lift only the admin binding, act,
re-arm:

```sh
gh api --method DELETE 'repos/{owner}/{repo}/branches/main/protection/enforce_admins'  # lift
gh api --method POST 'repos/{owner}/{repo}/branches/main/protection/enforce_admins'    # re-arm
```

Then run Verify above: `admins_included` must read `true` again.
