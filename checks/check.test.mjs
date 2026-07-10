#!/usr/bin/env node
// Self-test for checks/check.mjs. Every check must prove it FAILS on a real violation
// and stays quiet on a clean repo: an untested gate is false confidence (decision 0005).
// Run: node checks/check.test.mjs

import { mkdtempSync, mkdirSync, writeFileSync, rmSync, symlinkSync, unlinkSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import assert from 'node:assert/strict';
import { runChecks, installHooks } from './check.mjs';

function fixture() {
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

let passed = 0;
const failedTests = [];

function expectClean(label = 'clean-fixture', mutate = () => {}) {
  const fx = fixture();
  mutate(fx);
  const found = runChecks(fx.root);
  try {
    assert.equal(found.length, 0, `${label} should pass, got: ${JSON.stringify(found)}`);
    passed++;
  } catch (e) { failedTests.push(`${label}: ${e.message}`); }
  rmSync(fx.root, { recursive: true, force: true });
}

function expectFail(name, mutate) {
  const fx = fixture();
  mutate(fx);
  const found = runChecks(fx.root);
  try {
    assert.ok(found.some((f) => f.check === name),
      `expected check "${name}" to fail, got: ${JSON.stringify(found.map((f) => f.check))}`);
    passed++;
  } catch (e) { failedTests.push(`${name}: ${e.message}`); }
  rmSync(fx.root, { recursive: true, force: true });
}

expectClean();

expectFail('budget-agents', ({ put }) =>
  put('AGENTS.md', `# rules\n\nskills: \`demo\`\n${'filler line\n'.repeat(160)}`));

expectFail('agent-file-cap', ({ put }) =>
  put('product/AGENTS.md', `# rules\n${'filler line\n'.repeat(205)}`));

expectFail('bridge-claude', ({ put }) =>
  put('CLAUDE.md', '@AGENTS.md\n\nAlso: always use tabs.\n'));

expectFail('bridge-gemini', ({ put }) =>
  put('.gemini/settings.json', '{"context":{"fileName":["GEMINI.md"]}}'));

expectFail('docs-manifest', ({ put }) =>
  put('docs/rogue.md', 'not in the manifest\n'));

expectFail('links', ({ put }) =>
  put('docs/state/STATE.md', '# STATE\n\n## Handoff\n\n- Now ▶ demo\n\nsee [missing](./nope.md)\n'));

expectFail('denylist', ({ root, put }) => {
  put('checks/config.json', JSON.stringify({
    denylist: [{ pattern: 'Poppins', why: 'font was retired' }],
    budgets: { agentsMdLines: 150, stateMdLines: 150, skillMdLines: 500, skillDescriptionChars: 1024 },
    allowedEmptyDirs: [], secretScanExclude: ['checks/'],
  }));
  put('docs/state/STATE.md', '# STATE\n\n## Handoff\n\n- Now ▶ use Poppins everywhere\n');
});

expectFail('state-file', ({ put }) =>
  put('docs/state/STATE.md', '# STATE\n\nno handoff block here\n'));

expectFail('skills', ({ put }) =>
  put('.agents/skills/demo/SKILL.md', '---\nname: wrong-name\ndescription: Mismatch.\n---\n'));

expectFail('skills', ({ put }) =>
  put('.agents/skills/ghost/SKILL.md', '---\nname: ghost\ndescription: Not registered in AGENTS.md.\n---\n'));

expectFail('skills-symlink', ({ root }) =>
  unlinkSync(join(root, '.claude', 'skills')));

expectFail('secrets', ({ put }) =>
  put('docs/state/STATE.md', '# STATE\n\n## Handoff\n\n- Now ▶ demo\n- key AKIAIOSFODNN7EXAMPLE\n')); // checks:allow-secret

expectFail('prose-style', ({ put }) =>
  put('docs/state/STATE.md', '# STATE\n\n## Handoff\n\n- Now ▶ ship it — fast\n')); // em dash

expectFail('prose-style', ({ root, put }) => { // config-driven phrase ban
  put('checks/config.json', JSON.stringify({
    denylist: [], styleBans: [{ pattern: '\\bseamless(ly)?\\b', why: 'filler' }],
    budgets: { agentsMdLines: 150, stateMdLines: 150, skillMdLines: 500, skillDescriptionChars: 1024 },
    allowedEmptyDirs: [], secretScanExclude: ['checks/'],
  }));
  put('docs/state/STATE.md', '# STATE\n\n## Handoff\n\n- Now ▶ a seamlessly integrated flow\n');
});

expectFail('defer-markers', ({ put }) =>
  put('src/app.js', 'export const x = 1;\n// defer: global lock. ceiling: 100 users.\n'));

expectFail('zombie-code', ({ put }) =>
  put('src/app.js', 'export const x = 1;\n// const old = 2;\n// function dead() {\n// return old;\n'));

expectFail('empty-dirs', ({ root }) =>
  mkdirSync(join(root, 'src', 'hollow'), { recursive: true }));

// Ticket fixtures need a manifest row so docs-manifest stays quiet and only 'tickets' speaks.
const ticketManifest = '# manifest\n\n| `state/STATE.md` | LIVE | state |\n| `specs/**` | LIVE | specs |\n';

expectFail('tickets', ({ put }) => { // invalid status value
  put('docs/README.md', ticketManifest);
  put('docs/specs/001-demo/tickets/01-a.md',
    '# 01: A\n\n- **Blocked by:** none\n- **Status:** shipped\n\n**What to build:** demo.\n');
});

expectFail('tickets', ({ put }) => { // Blocked-by names a missing sibling
  put('docs/README.md', ticketManifest);
  put('docs/specs/001-demo/tickets/01-a.md',
    '# 01: A\n\n- **Blocked by:** 99-ghost\n- **Status:** ready\n\n**What to build:** demo.\n');
});

// --- sub-rules that the one-violation-per-check pass above does not reach ---

expectFail('state-file', ({ put }) =>
  put('docs/state/STATE.md', `# STATE\n\n## Handoff\n\n- Now ▶ demo\n${'log line\n'.repeat(160)}`));

expectFail('skills', ({ put }) =>
  put('.agents/skills/demo/SKILL.md', '---\nname: demo\n---\n\n# no description\n'));

expectFail('tickets', ({ put }) => { // no Status line at all
  put('docs/README.md', ticketManifest);
  put('docs/specs/001-demo/tickets/01-a.md', '# 01: A\n\n- **Blocked by:** none\n\n**What to build:** demo.\n');
});

expectFail('tickets', ({ put }) => { // no What to build line
  put('docs/README.md', ticketManifest);
  put('docs/specs/001-demo/tickets/01-a.md', '# 01: A\n\n- **Blocked by:** none\n- **Status:** ready\n');
});

expectFail('skills', ({ put }) =>
  put('.agents/skills/demo/SKILL.md',
    `---\nname: demo\ndescription: Oversized body.\n---\n${'line\n'.repeat(510)}`));

expectFail('secrets', ({ put }) => // checks:allow-secret
  put('docs/state/STATE.md',
    `# STATE\n\n## Handoff\n\n- Now ▶ demo\n- jwt eyJ${'a'.repeat(30)}.${'b'.repeat(30)}.${'c'.repeat(15)}\n`));

expectFail('skills-symlink', ({ root }) => {
  unlinkSync(join(root, '.claude', 'skills'));
  symlinkSync('../.agents', join(root, '.claude', 'skills'));
});

expectClean('crlf-tolerance', ({ put }) =>
  put('.agents/skills/demo/SKILL.md',
    '---\r\nname: demo\r\ndescription: CRLF checkout must not break parsing.\r\n---\r\n\r\n# demo\r\n'));

expectClean('denylist-exclude', ({ put }) => {
  put('checks/config.json', JSON.stringify({
    denylist: [{ pattern: 'Poppins', why: 'retired', exclude: ['docs/state/'] }],
    budgets: { agentsMdLines: 150, stateMdLines: 150, skillMdLines: 500, skillDescriptionChars: 1024 },
    allowedEmptyDirs: [], secretScanExclude: ['checks/'],
  }));
  put('docs/state/STATE.md', '# STATE\n\n## Handoff\n\n- Now ▶ Poppins is excluded here\n');
});

expectClean('gitkeep-is-intentional', ({ put }) =>
  put('docs/state/log/.gitkeep', ''));

expectClean('local-files-are-exempt', ({ put }) => // personal, never shared: no manifest, no style gate
  put('docs/state/STATE.local.md', '# local — maintainer notes with an em dash\n'));

expectClean('prose-style-allow-escape', ({ put }) =>
  put('docs/state/STATE.md', '# STATE\n\n## Handoff\n\n- Now ▶ quote the source verbatim — as written checks:allow-style\n'));

expectClean('tickets-valid', ({ put }) => {
  put('docs/README.md', ticketManifest);
  put('docs/specs/001-demo/tickets/01-a.md',
    '# 01: A\n\n- **Blocked by:** none\n- **Status:** done\n\n**What to build:** demo.\n');
  put('docs/specs/001-demo/tickets/02-b.md',
    '# 02: B\n\n- **Blocked by:** 01-a\n- **Status:** ready <!-- ready | building | done -->\n\n**What to build:** demo.\n');
});

expectClean('tickets-archive-skipped', ({ put }) => {
  put('docs/README.md', ticketManifest);
  put('docs/specs/archive/001-old/tickets/01-a.md', '# 01: A\n\n- **Status:** shipped\n');
});

expectClean('manifest-glob-classes', ({ put }) => {
  put('docs/README.md', '# manifest\n\n| `state/STATE.md` | LIVE | state |\n| `decisions/[0-9]*.md` | REF | records |\n| `specs/[0-9]*/**` | LIVE | specs |\n');
  put('docs/decisions/0001-demo.md', '# 0001\n');
  put('docs/specs/001-demo/notes.md', '# notes\n');
});

// installHooks wires the versioned hook path (needs git on PATH).
{
  const fx = fixture();
  writeFileSync(join(fx.root, 'checks', 'hooks-placeholder'), '');
  mkdirSync(join(fx.root, 'checks', 'hooks'), { recursive: true });
  writeFileSync(join(fx.root, 'checks', 'hooks', 'pre-commit'), '#!/bin/sh\nnode checks/check.mjs || exit 1\n');
  try {
    execSync('git init -q', { cwd: fx.root });
    installHooks(fx.root);
    const hooksPath = execSync('git config core.hooksPath', { cwd: fx.root }).toString().trim();
    assert.equal(hooksPath, 'checks/hooks');
    passed++;
  } catch (e) { failedTests.push(`install-hooks: ${e.message}`); }
  rmSync(fx.root, { recursive: true, force: true });
}

if (failedTests.length) {
  for (const f of failedTests) console.error(`TEST FAIL ${f}`);
  console.error(`\n${passed} passed, ${failedTests.length} failed.`);
  process.exit(1);
}
console.log(`OK: ${passed} self-tests passed: every gate fails when it should.`);
