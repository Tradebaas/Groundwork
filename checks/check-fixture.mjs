// The harness the three check suites share: one fixture repo, one way to assert that a gate
// fires, one way to assert that a clean repo stays quiet, one tally and one report. A suite
// that built its own fixture would drift from the others and prove less than it claims.
// Used by check.test.mjs, check-code.test.mjs and check-trace.test.mjs.

import { mkdtempSync, mkdirSync, writeFileSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import assert from 'node:assert/strict';
import { runChecks } from './check.mjs';

export function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'groundwork-test-'));
  const put = (p, body) => {
    mkdirSync(dirname(join(root, p)), { recursive: true });
    writeFileSync(join(root, p), body);
  };
  put('checks/config.json', JSON.stringify({
    denylist: [],
    budgets: { agentsMdLines: 150, stateMdLines: 150, skillMdLines: 500, skillDescriptionChars: 1024 },
    allowedEmptyDirs: [],
    secretScanExclude: ['checks/'],
  }));
  put('AGENTS.md', '# rules\n\nskills: `demo`\n');
  put('CLAUDE.md', '@AGENTS.md\n');
  put('.gemini/settings.json', '{"context":{"fileName":["AGENTS.md"]}}');
  put('docs/README.md', '# manifest\n\n| `state/STATE.md` | LIVE | state |\n');
  put('docs/state/STATE.md', '# STATE\n\n## Handoff\n\n- Now ▶ demo\n');
  put('.agents/skills/demo/SKILL.md', '---\nname: demo\ndescription: Demo skill for the self-test.\n---\n\n# demo\n');
  mkdirSync(join(root, '.claude'), { recursive: true });
  symlinkSync('../.agents/skills', join(root, '.claude', 'skills'));
  return { root, put };
}

// One run's score. Assertions written out in a suite (a commit message, an enforcement signal)
// add to it directly; expectClean and expectFail below do it for the file gates.
export const tally = { passed: 0, failed: [] };

export function expectClean(label = 'clean-fixture', mutate = () => {}) {
  const fx = fixture();
  mutate(fx);
  const found = runChecks(fx.root);
  try {
    assert.equal(found.length, 0, `${label} should pass, got: ${JSON.stringify(found)}`);
    tally.passed++;
  } catch (e) { tally.failed.push(`${label}: ${e.message}`); }
  rmSync(fx.root, { recursive: true, force: true });
}

export function expectFail(name, mutate) {
  const fx = fixture();
  mutate(fx);
  const found = runChecks(fx.root);
  try {
    assert.ok(found.some((f) => f.check === name),
      `expected check "${name}" to fail, got: ${JSON.stringify(found.map((f) => f.check))}`);
    tally.passed++;
  } catch (e) { tally.failed.push(`${name}: ${e.message}`); }
  rmSync(fx.root, { recursive: true, force: true });
}

// Several tests need a config that differs from the fixture's in one key. One helper beats a
// copy of the base object per test, and keeps each test's intent on one line.
export const BASE_BUDGETS = { agentsMdLines: 150, stateMdLines: 150, skillMdLines: 500, skillDescriptionChars: 1024 };
export const withConfig = (extra) => ({ put }) => put('checks/config.json', JSON.stringify({
  denylist: [], allowedEmptyDirs: [], secretScanExclude: ['checks/'], budgets: BASE_BUDGETS, ...extra,
}));

// Ticket and spec fixtures need a manifest row so docs-manifest stays quiet and only the gate
// under test speaks.
export const ticketManifest = '# manifest\n\n| `state/STATE.md` | LIVE | state |\n| `specs/**` | LIVE | specs |\n';

// The last line of every suite: what it proved, or what it failed to prove and a red exit.
export function report(suite) {
  if (tally.failed.length) {
    for (const f of tally.failed) console.error(`TEST FAIL ${f}`);
    console.error(`\n${tally.passed} passed, ${tally.failed.length} failed.`);
    process.exit(1);
  }
  console.log(`OK: ${tally.passed} ${suite} self-tests passed: every gate fails when it should.`);
}
