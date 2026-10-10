#!/usr/bin/env bash
# A spec for one behavior, a module that lacks it, and a state directory for what is out of scope.
set -eu
mkdir -p docs/specs/001-sort-by-date docs/state src
cat > docs/specs/001-sort-by-date/spec.md <<'MD'
# 001: list items newest first

## Acceptance criteria

- `listItems(items)` returns the items sorted by `createdAt`, newest first.
- Two items with the same `createdAt` keep their input order.
- The input array is not mutated.
MD
printf '# INTAKE\n\nUntriaged feedback and ideas. Nothing is built from here.\n\n| Date | From | Item | Status |\n|---|---|---|---|\n' > docs/state/INTAKE.md
cat > src/list.mjs <<'JS'
export function listItems(items) {
  return items;
}
JS
