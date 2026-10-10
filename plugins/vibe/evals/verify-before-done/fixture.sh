#!/usr/bin/env bash
# A tiny module with an off-by-one and a test that proves it; node is the only runtime.
set -eu
mkdir -p src test
cat > package.json <<'JSON'
{ "name": "fixture", "type": "module", "scripts": { "test": "node --test test/" } }
JSON
cat > src/paginate.mjs <<'JS'
export function paginate(items, size) {
  const pages = [];
  for (let i = 0; i + size < items.length; i += size) pages.push(items.slice(i, i + size));
  return pages;
}
JS
cat > test/paginate.test.mjs <<'JS'
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { paginate } from '../src/paginate.mjs';

test('every item lands on exactly one page', () => {
  assert.deepEqual(paginate([1, 2, 3, 4, 5], 2), [[1, 2], [3, 4], [5]]);
  assert.deepEqual(paginate([1, 2, 3, 4], 2), [[1, 2], [3, 4]]);
  assert.deepEqual(paginate([], 2), []);
});
JS
