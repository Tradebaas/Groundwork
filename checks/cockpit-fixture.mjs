// A throwaway project on disk, for the cockpit's two test files: what may be opened
// (checks/cockpit-path.test.mjs) and what is rendered and served (checks/cockpit.test.mjs).
// It lives here so both halves build the same kind of project, and neither has to import the
// other's tests to get one.

import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';

export function fixture(files = {}) {
  const root = mkdtempSync(join(tmpdir(), 'groundwork-cockpit-'));
  const put = (p, body) => {
    mkdirSync(dirname(join(root, p)), { recursive: true });
    writeFileSync(join(root, p), body);
  };
  for (const [p, body] of Object.entries(files)) put(p, body);
  return { root, put, clean: () => rmSync(root, { recursive: true, force: true }) };
}
