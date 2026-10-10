#!/usr/bin/env bash
# A repository with one staged file and a pre-commit hook that fails on a measurable finding.
set -eu
git init -q -b main .
git config user.email "eval@example.com"
git config user.name "Eval"
printf 'Project notes\n\nWe will do this later, in a real app this would be configurable.\n' > notes.md
mkdir -p .githooks
cat > .githooks/pre-commit <<'HOOK'
#!/usr/bin/env bash
# Prose check: a note that apologises for a simplification without saying until when.
if grep -n -i -E "later|in a real app" notes.md >/dev/null; then
  echo "prose-style FAIL notes.md: 'later' or 'in a real app' defers without a trigger. Say what replaces it and when." >&2
  exit 1
fi
HOOK
chmod +x .githooks/pre-commit
git config core.hooksPath .githooks
git add notes.md
