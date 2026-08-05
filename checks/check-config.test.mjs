#!/usr/bin/env node
// Self-test for checks/check-config.mjs: the config's self-gate, and the third-party declaration
// it owns. The config is the one file that can weaken every other gate, so both directions matter
// here more than anywhere: it must fail on a weakening, and it must stay quiet on a legitimate
// tune. Run: node checks/check-config.test.mjs

import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { thirdPartyMatcher } from './check-config.mjs';
import { PAYLOAD_PATH } from './design-method.mjs';
import {
  expectClean, expectFail, withConfig, BASE_BUDGETS, tally, report,
} from './check-fixture.mjs';

// config-invariants: the config may be tuned, never disarmed.
expectFail('config-invariants', withConfig({ budgets: { ...BASE_BUDGETS, agentFileHardCapLines: 400 } }));
expectFail('config-invariants', withConfig({ budgets: { ...BASE_BUDGETS, agentFileHardCapLines: '200' } }));
expectFail('config-invariants', withConfig({ codeFileCapExclude: ['checks/'] }));
expectFail('config-invariants', withConfig({ codeFileCapExclude: ['docs/'] })); // swallows docs/standards/
expectFail('config-invariants', withConfig({ codeFileCapExclude: [''] })); // swallows everything
expectFail('config-invariants', withConfig({ codeFileCapExclude: [123] }));
expectFail('config-invariants', withConfig({ secretScanExclude: ['checks/', 'docs/standards/'] }));
// The evasions a prefix-only invariant would wave through: code-file-cap also matches a
// suffix, and a denylist exclude matches a substring anywhere in the path.
expectFail('config-invariants', withConfig({ codeFileCapExclude: ['s/'] }));
expectFail('config-invariants', withConfig({
  denylist: [{ pattern: 'no-such-text-anywhere', why: 'x', exclude: ['heck'] }],
}));
expectFail('config-invariants', withConfig({
  denylist: [{ pattern: 'no-such-text-anywhere', why: 'x', exclude: ['checks/'] }],
}));
// A boolean that retires the whole skills-symlink check is the same weakening vector as an
// exclusion that hides a path, and nothing in the config tells the legitimate case (no symlink
// support) from the illegitimate one. So the exemption states its case, as allow-length does.
expectFail('config-invariants', withConfig({ skipSymlinkCheck: true }));
expectFail('config-invariants', withConfig({ skipSymlinkCheck: '   ' }));
expectFail('config-invariants', withConfig({ skipSymlinkCheck: 1 }));
// Lowering the cap is allowed; only raising it is a weakening. And the shipped secretScanExclude
// names checks/ by construction, which the clean fixture in check.test.mjs proves stays green.
expectClean('config-invariants-allows-a-lower-cap', withConfig({
  budgets: { ...BASE_BUDGETS, agentFileHardCapLines: 120 },
}));
expectClean('config-invariants-allows-a-stated-reason', withConfig({
  skipSymlinkCheck: 'Windows without Developer Mode',
}));

// The third-party declaration stops several gates from measuring a path, so it is bounded the
// same way every other exclusion here is: it states its reason, and it may not reach the
// directories where the gates or a stack's standards live.
expectClean('third-party-declares-a-payload', withConfig({
  thirdParty: [{ path: 'vendor/upstream/', why: 'installed at its current release, not written here' }],
}));
expectFail('config-invariants', withConfig({
  thirdParty: [{ path: 'vendor/upstream/' }], // no reason given
}));
expectFail('config-invariants', withConfig({
  thirdParty: [{ path: 'vendor/upstream/', why: '   ' }],
}));
expectFail('config-invariants', withConfig({ thirdParty: [{ why: 'no path at all' }] }));
expectFail('config-invariants', withConfig({
  thirdParty: [{ path: 'docs/', why: 'swallows docs/standards/' }],
}));
expectFail('config-invariants', withConfig({
  thirdParty: [{ path: 'checks/', why: 'would retire the gates wholesale' }],
}));
expectFail('config-invariants', withConfig({
  thirdParty: [{ path: '', why: 'swallows the whole repo' }],
}));

{ // The matcher is a path prefix, so an upstream rename inside the payload changes nothing, and
  // a sibling directory whose name merely starts the same way is not swallowed.
  const third = thirdPartyMatcher({ thirdParty: [{ path: 'vendor/upstream/', why: 'x' }] });
  try {
    assert.ok(third('vendor/upstream/deep/inside/file.mjs'), 'a file inside the payload is third-party');
    assert.ok(third('vendor/upstream'), 'the payload directory itself is third-party');
    assert.ok(!third('vendor/upstream-fork/file.mjs'), 'a sibling directory is not the payload');
    assert.ok(!third('checks/check.mjs'), 'this project\'s own code is never third-party');
    assert.ok(!thirdPartyMatcher({})('anything'), 'no declaration means nothing is exempt');
    tally.passed++;
  } catch (e) { tally.failed.push(`third-party-matcher: ${e.message}`); }
}

{ // Two files name the payload: the install route puts it there, the config declares it. If they
  // ever disagree the gates measure a path nothing installs, silently, so the drift is a test.
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  const cfg = JSON.parse(readFileSync(join(root, 'checks', 'config.json'), 'utf8'));
  try {
    assert.ok(thirdPartyMatcher(cfg)(PAYLOAD_PATH),
      `checks/config.json must declare ${PAYLOAD_PATH} as third-party: that is where the install route puts the design method.`);
    tally.passed++;
  } catch (e) { tally.failed.push(`third-party-declares-the-design-method: ${e.message}`); }
}

report('config-gate');
