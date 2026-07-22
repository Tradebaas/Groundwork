#!/usr/bin/env node
// Self-test for checks/check.mjs. Every check must prove it FAILS on a real violation
// and stays quiet on a clean repo: an untested gate is false confidence (decision 0005).
// Run: node checks/check.test.mjs

import { mkdtempSync, mkdirSync, writeFileSync, rmSync, symlinkSync, unlinkSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import assert from 'node:assert/strict';
import { runChecks, installHooks, checkCommitMessage } from './check.mjs';
import { needsHandoffNudge } from './handoff-nudge.mjs';

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

{ // a missing symlink leaves .claude/ empty; skills-symlink owns that repair, empty-dirs stays quiet
  const fx = fixture();
  unlinkSync(join(fx.root, '.claude', 'skills'));
  const found = runChecks(fx.root);
  try {
    assert.ok(!found.some((f) => f.check === 'empty-dirs'),
      `empty-dirs should stay quiet on .claude/, got: ${JSON.stringify(found.map((f) => f.check))}`);
    passed++;
  } catch (e) { failedTests.push(`empty-dirs-claude: ${e.message}`); }
  rmSync(fx.root, { recursive: true, force: true });
}

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

expectFail('code-file-cap', ({ put }) => // 501 lines of code, budget 500
  put('src/big.js', 'export const x = 1;\n'.repeat(501)));

expectFail('code-file-cap', ({ put }) => // escape marker without a reason does not suppress
  put('src/big.js', `// checks:allow-length\n${'export const x = 1;\n'.repeat(510)}`));

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

expectClean('code-file-cap-at-budget', ({ put }) =>
  put('src/ok.js', 'export const x = 1;\n'.repeat(499)));

expectClean('code-file-cap-allow-marker', ({ put }) =>
  put('src/generated.js', `// checks:allow-length: generated fixture for the self-test\n${'export const x = 1;\n'.repeat(510)}`));

expectClean('code-file-cap-exclude', ({ put }) => {
  put('checks/config.json', JSON.stringify({
    denylist: [], codeFileCapExclude: ['src/vendor/'],
    budgets: { agentsMdLines: 150, stateMdLines: 150, skillMdLines: 500, skillDescriptionChars: 1024 },
    allowedEmptyDirs: [], secretScanExclude: ['checks/'],
  }));
  put('src/vendor/lib.js', 'export const x = 1;\n'.repeat(510));
});

expectClean('tickets-valid', ({ put }) => {
  put('docs/README.md', ticketManifest);
  put('docs/specs/001-demo/tickets/01-a.md',
    '# 01: A\n\n- **Blocked by:** none\n- **Status:** done\n- **Traces to:** BRIEF SC-1\n\n**What to build:** demo.\n');
  put('docs/specs/001-demo/tickets/02-b.md',
    '# 02: B\n\n- **Blocked by:** 01-a\n- **Status:** ready <!-- ready | building | done -->\n- **Traces to:** BRIEF SC-2\n\n**What to build:** demo.\n');
});

expectFail('tickets', ({ put }) => { // Traces to left on the template placeholder
  put('docs/README.md', ticketManifest);
  put('docs/specs/001-demo/tickets/01-a.md',
    '# 01: A\n\n- **Blocked by:** none\n- **Status:** ready\n- **Traces to:** BRIEF SC-<n>\n\n**What to build:** demo.\n');
});

// A spec that names no scope item makes the progress overview count that item as not started
// while the work is happening (checks/progress.mjs). Silent miscounting is the failure to gate.
expectFail('spec-traces', ({ put }) => { // no Traces to line at all
  put('docs/README.md', ticketManifest);
  put('docs/specs/001-demo/spec.md', '# 001: demo\n\n- **Status:** building\n');
});

expectFail('spec-traces', ({ put }) => { // Traces to left unfilled
  put('docs/README.md', ticketManifest);
  put('docs/specs/001-demo/spec.md', '# 001: demo\n\n- **Status:** building\n- **Traces to:** TBD\n');
});

expectClean('spec-traces-valid', ({ put }) => {
  put('docs/README.md', ticketManifest);
  put('docs/specs/001-demo/spec.md', '# 001: demo\n\n- **Status:** building\n- **Traces to:** BRIEF SC-2\n');
  put('docs/specs/archive/000-old/spec.md', '# 000: old\n\n- **Status:** done\n');
});

// Once the brief defines scope, an SC-id becomes checkable. An invented or typo'd id reads as
// a trace while tracing nowhere, so it passes the eye and fails the rule.
const scopedManifest = `${ticketManifest}| \`product/BRIEF.md\` | LIVE | brief |\n`;
const BRIEF_SC1 = '# BRIEF\n\n## In scope\n\n- SC-1 the one real scope item\n';

expectFail('spec-traces', ({ put }) => { // spec names an SC-item the brief does not define
  put('docs/README.md', scopedManifest);
  put('docs/product/BRIEF.md', BRIEF_SC1);
  put('docs/specs/001-demo/spec.md', '# 001: demo\n\n- **Status:** building\n- **Traces to:** BRIEF SC-9\n');
});

expectFail('tickets', ({ put }) => { // ticket names an SC-item the brief does not define
  put('docs/README.md', scopedManifest);
  put('docs/product/BRIEF.md', BRIEF_SC1);
  put('docs/specs/001-demo/spec.md', '# 001: demo\n\n- **Status:** building\n- **Traces to:** BRIEF SC-1\n');
  put('docs/specs/001-demo/tickets/01-a.md',
    '# 01: A\n\n- **Blocked by:** none\n- **Status:** ready\n- **Traces to:** BRIEF SC-9\n\n**What to build:** demo.\n');
});

expectClean('spec-traces-known-id', ({ put }) => {
  put('docs/README.md', scopedManifest);
  put('docs/product/BRIEF.md', BRIEF_SC1);
  put('docs/specs/001-demo/spec.md', '# 001: demo\n\n- **Status:** building\n- **Traces to:** BRIEF SC-1\n');
});

// AGENTS.md allows tracing to an explicit request instead of an SC-item, so a line that names
// no id at all must stay clean: this gate checks ids, it does not force specs to carry one.
expectClean('spec-traces-explicit-request', ({ put }) => {
  put('docs/README.md', scopedManifest);
  put('docs/product/BRIEF.md', BRIEF_SC1);
  put('docs/specs/001-demo/spec.md', '# 001: demo\n\n- **Status:** building\n- **Traces to:** explicit request from the owner, 2026-07-20\n');
});

// progress.mjs counts a single .md sitting directly in docs/specs/ as a spec (specFiles), so
// the trace gate covers that shape too: a spec that counts toward progress but escapes the
// gate could steer work while naming no scope item.
expectFail('spec-traces', ({ put }) => { // single-file spec, no trace
  put('docs/README.md', ticketManifest);
  put('docs/specs/002-single.md', '# 002: single-file spec\n\n- **Status:** building\n');
});

expectClean('spec-traces-single-file-valid', ({ put }) => {
  put('docs/README.md', ticketManifest);
  put('docs/specs/002-single.md', '# 002: single\n\n- **Status:** building\n- **Traces to:** explicit request from the owner, 2026-07-22\n');
});

expectClean('spec-traces-templates-skipped', ({ put }) => { // the shipped templates sit directly in docs/specs/ with placeholder traces
  put('docs/README.md', ticketManifest);
  put('docs/specs/TEMPLATE.md', '# spec template\n\n- **Traces to:** BRIEF SC-<n> / explicit request: <link or quote>\n');
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

// --- commit-trace: the trailer that carries the trace into the shipped history ---
// Same two directions as every gate above: it must block a commit that names no scope item,
// and stay silent on the shapes git composes itself.
const SCOPED = new Set(['SC-1']);

function expectMsgFail(label, message, known = SCOPED) {
  const found = checkCommitMessage(message, known);
  try {
    assert.ok(found.length, `expected "${label}" to be blocked, but it passed`);
    passed++;
  } catch (e) { failedTests.push(`${label}: ${e.message}`); }
}

function expectMsgClean(label, message, known = SCOPED) {
  const found = checkCommitMessage(message, known);
  try {
    assert.equal(found.length, 0, `"${label}" should pass, got: ${JSON.stringify(found)}`);
    passed++;
  } catch (e) { failedTests.push(`${label}: ${e.message}`); }
}

expectMsgFail('commit-trace-missing', 'feat(checks): add a thing\n\nA body that explains why.\n');
expectMsgFail('commit-trace-empty', 'feat(checks): add a thing\n\nTraces-to:\n');
expectMsgFail('commit-trace-placeholder', 'feat(checks): add a thing\n\nTraces-to: <SC-id>\n');
expectMsgFail('commit-trace-tbd', 'feat(checks): add a thing\n\nTraces-to: TBD\n');
expectMsgFail('commit-trace-unknown-id', 'feat(checks): add a thing\n\nTraces-to: SC-99\n');
// git strips its own comments, so a trailer that only exists in the template help text is absent.
expectMsgFail('commit-trace-commented-out', 'feat(checks): add a thing\n\n# Traces-to: SC-1\n');

// Git reads only the final block as trailers. A trace anywhere else is invisible to
// `git log --format='%(trailers:key=Traces-to)'`, so a gate that accepted it would report green
// while producing nothing. These four are the shapes that actually shipped that bug once.
expectMsgFail('commit-trace-footer-after', 'feat(x): y\n\nTraces-to: SC-1\n\nGenerated with a tool\n');
expectMsgFail('commit-trace-prose-after', 'feat(x): y\n\nTraces-to: SC-1\n\nOne more thought.\n');
expectMsgFail('commit-trace-value-wrapped', 'feat(x): y\n\nTraces-to: explicit request: a value that\nwrapped onto a second line\n');
expectMsgClean('commit-trace-footer-before', 'feat(x): y\n\nbody\n\nGenerated with a tool\n\nTraces-to: SC-1\n');

expectMsgClean('commit-trace-sc-id', 'feat(checks): add a thing\n\nWhy it changed.\n\nTraces-to: SC-1\n');
expectMsgClean('commit-trace-two-ids', 'feat(checks): add a thing\n\nTraces-to: SC-1, SC-1\n');
// AGENTS.md allows tracing to an explicit request, so a trace naming no id is a valid trace.
expectMsgClean('commit-trace-explicit-request', 'fix(docs): reword\n\nTraces-to: explicit request: owner asked in session\n');
expectMsgClean('commit-trace-before-coauthor', 'feat(x): y\n\nTraces-to: SC-1\nCo-Authored-By: A B <a@b.c>\n');
// Composed by git, not authored: a merge has no scope item of its own, a revert names the sha
// it undoes, and an autosquash message is replaced when the rebase runs.
expectMsgClean('commit-trace-merge', 'Merge branch \'main\' into feat/x\n');
expectMsgClean('commit-trace-revert', 'Revert "feat(x): y"\n\nThis reverts commit abc1234.\n');
expectMsgClean('commit-trace-fixup', 'fixup! feat(x): y\n');
// A fresh copy has no scope written down yet and must not be blocked for it, exactly as
// spec-traces and tickets already behave. The trailer is still required; only the id is unchecked.
expectMsgClean('commit-trace-unscoped-brief', 'feat(x): y\n\nTraces-to: SC-99\n', null);
expectMsgFail('commit-trace-unscoped-still-needs-trailer', 'feat(x): y\n\nno trailer here\n', null);

// installHooks wires the versioned hook path (needs git on PATH).
{
  const fx = fixture();
  writeFileSync(join(fx.root, 'checks', 'hooks-placeholder'), '');
  mkdirSync(join(fx.root, 'checks', 'hooks'), { recursive: true });
  for (const hook of ['pre-commit', 'commit-msg']) {
    writeFileSync(join(fx.root, 'checks', 'hooks', hook), '#!/bin/sh\nnode checks/check.mjs || exit 1\n');
  }
  try {
    execSync('git init -q', { cwd: fx.root });
    installHooks(fx.root);
    const hooksPath = execSync('git config core.hooksPath', { cwd: fx.root }).toString().trim();
    assert.equal(hooksPath, 'checks/hooks');
    passed++;
  } catch (e) { failedTests.push(`install-hooks: ${e.message}`); }
  rmSync(fx.root, { recursive: true, force: true });
}

// handoff-nudge fires only when a turn advises a fresh session and hands over no code block.
for (const [label, text, want] of [
  ['advise clear, no block', 'Next: in a fresh session run /clear and continue.', true],
  ['verse sessie, no block', 'Start een verse sessie voor de volgende ticket.', true],
  ['advises clear WITH a code block', 'Start fresh:\n```\nRead docs/state/STATE.md\n```', false],
  ['mentions /clear but a block is present', 'Type /clear then:\n```\nprompt\n```', false],
  ['no fresh-session advice at all', 'I fixed the bug and the tests pass.', false],
  ['empty input', '', false],
]) {
  try {
    assert.equal(needsHandoffNudge(text), want, label);
    passed++;
  } catch (e) { failedTests.push(`handoff-nudge ${label}: ${e.message}`); }
}

if (failedTests.length) {
  for (const f of failedTests) console.error(`TEST FAIL ${f}`);
  console.error(`\n${passed} passed, ${failedTests.length} failed.`);
  process.exit(1);
}
console.log(`OK: ${passed} self-tests passed: every gate fails when it should.`);
