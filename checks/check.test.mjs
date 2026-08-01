#!/usr/bin/env node
// Self-test for checks/check.mjs: the document, rulebook and config gates it still owns, plus
// the runner's own wiring (hooks, the enforcement self-report, the handoff nudge). Every check
// must prove it FAILS on a real violation and stays quiet on a clean repo: an untested gate is
// false confidence (decision 0005). The three gate families that live in their own files are
// proven next door, by check-code.test.mjs, check-trace.test.mjs and check-stack.test.mjs.
// Run: node checks/check.test.mjs

import { mkdtempSync, mkdirSync, writeFileSync, rmSync, symlinkSync, unlinkSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { execSync } from 'node:child_process';
import { join } from 'node:path';
import assert from 'node:assert/strict';
import { runChecks, installHooks } from './check.mjs';
import { needsHandoffNudge } from './handoff-nudge.mjs';
import { enforcementReport, formatReport } from './enforcement.mjs';
import {
  fixture, expectClean, expectFail, withConfig, BASE_BUDGETS, tally, report,
} from './check-fixture.mjs';

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

// The other half of the one link definition (checks/links.mjs): a path between backticks is a
// mention, and a mention that resolves to nothing is prose. This framework's own documents name
// files a project creates later, so demanding that every one of them exists would fail a fresh
// copy for saying what it is for.
expectClean('links-mention-is-prose', ({ put }) =>
  put('docs/state/STATE.md', '# STATE\n\n## Handoff\n\n- Now ▶ write `docs/product/ARCHITECTURE.md`\n'));

{ // The gate quotes back the path a document wrote, and a terminal is a sink: an escape sequence
  // smuggled into a link would repaint the report around the finding that names it.
  const fx = fixture();
  fx.put('docs/state/STATE.md', '# STATE\n\n## Handoff\n\n- Now ▶ demo\n\nsee [gone](./go\x1b[2Kne.md)\n');
  const msg = runChecks(fx.root).find((f) => f.check === 'links')?.msg || '';
  try {
    assert.match(msg, /broken link to \.\/go\[2Kne\.md/, `the gate should quote the path back, got: ${msg}`);
    assert.doesNotMatch(msg, /[\x00-\x1f\x7f]/, `a finding is one line of printable text, got: ${JSON.stringify(msg)}`);
    tally.passed++;
  } catch (e) { tally.failed.push(`links-message-strips-control-characters: ${e.message}`); }
  rmSync(fx.root, { recursive: true, force: true });
}

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

expectFail('skills', ({ put }) => // reverse direction: a table row whose skill directory is gone
  put('AGENTS.md', '# rules\n\nskills: `demo`\n\n| `phantom` | listed in the table, no directory |\n'));

expectClean('skills-table-row-backed-by-directory', ({ put }) =>
  put('AGENTS.md', '# rules\n\n| `demo` | the routing row for the demo skill |\n'));

expectFail('skills-symlink', ({ root }) =>
  unlinkSync(join(root, '.claude', 'skills')));

{ // a missing symlink leaves .claude/ empty; skills-symlink owns that repair, empty-dirs stays quiet
  const fx = fixture();
  unlinkSync(join(fx.root, '.claude', 'skills'));
  const found = runChecks(fx.root);
  try {
    assert.ok(!found.some((f) => f.check === 'empty-dirs'),
      `empty-dirs should stay quiet on .claude/, got: ${JSON.stringify(found.map((f) => f.check))}`);
    tally.passed++;
  } catch (e) { tally.failed.push(`empty-dirs-claude: ${e.message}`); }
  rmSync(fx.root, { recursive: true, force: true });
}

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
// names checks/ by construction, which the clean fixture above already proves stays green.
expectClean('config-invariants-allows-a-lower-cap', withConfig({
  budgets: { ...BASE_BUDGETS, agentFileHardCapLines: 120 },
}));
expectClean('config-invariants-allows-a-stated-reason', withConfig({
  skipSymlinkCheck: 'Windows without Developer Mode',
}));

expectFail('empty-dirs', ({ root }) =>
  mkdirSync(join(root, 'src', 'hollow'), { recursive: true }));

// The explainer's numbers. The fixture holds exactly one skill directory, so a page claiming
// one skill is in sync and any other number is drift. The gates key is proven by the absurd
// number rather than a hardcoded one: pinning the expected count here would mean editing this
// test every time a gate is added, which is the very staleness the check exists to stop.
const statPage = (key, n) =>
  `<div class="stat"><div class="n" data-derive="${key}">${n}</div><div class="l">label</div></div>\n`;

expectClean('explainer-stats-in-sync', ({ put }) => put('index.html', statPage('skills', 1)));

expectClean('explainer-stats-unmarked-number-is-a-claim', ({ put }) =>
  put('index.html', '<div class="stat"><div class="n">42</div><div class="l">a claim</div></div>\n'));

expectClean('explainer-stats-em-wrapped', ({ put }) => // the strip styles one number with <em>
  put('index.html', '<div class="stat"><div class="n" data-derive="skills"><em>1</em></div></div>\n'));

expectClean('explainer-stats-decisions-skip-the-template', ({ put }) => {
  put('docs/README.md', '# manifest\n\n| `state/STATE.md` | LIVE | state |\n| `decisions/*.md` | LIVE | decisions |\n');
  put('docs/decisions/0001-real.md', '# 0001: a recorded decision\n');
  put('docs/decisions/TEMPLATE.md', '# NNNN: the form, not a decision\n');
  put('index.html', statPage('decisions', 1));
});

expectFail('explainer-stats', ({ put }) => put('index.html', statPage('skills', 7))); // drift

expectFail('explainer-stats', ({ put }) => put('index.html', statPage('gates', 999)));

expectFail('explainer-stats', ({ put }) => // a key nothing can count
  put('index.html', statPage('wombats', 3)));

expectFail('explainer-stats', ({ put }) => // an inherited name is not a source either
  put('index.html', statPage('constructor', 3)));

expectFail('explainer-stats', ({ put }) => // the marker is read whichever quotes the page uses
  put('index.html', "<div class=\"stat\"><div class='n' data-derive='skills'>7</div></div>\n"));

expectFail('explainer-stats', ({ put }) => // the count is the whole text, not the digits in front
  put('index.html', statPage('skills', '1.000')));

expectFail('explainer-stats', ({ put }) => // the source directory this page counts is gone
  put('index.html', statPage('decisions', 0)));

// A marked element with no number of its own, next to a stat that does carry one: the empty
// marker must speak for itself. Reading on past its closing tag would borrow the neighbour's 1,
// which happens to match this fixture, and the gate would call a page with a hole in it correct.
expectFail('explainer-stats', ({ put }) =>
  put('index.html', `<div class="stat"><div class="n" data-derive="skills"></div></div>\n${statPage('skills', 1)}`));

// --- sub-rules that the one-violation-per-check pass above does not reach ---

expectFail('state-file', ({ put }) =>
  put('docs/state/STATE.md', `# STATE\n\n## Handoff\n\n- Now ▶ demo\n${'log line\n'.repeat(160)}`));

expectFail('skills', ({ put }) =>
  put('.agents/skills/demo/SKILL.md', '---\nname: demo\n---\n\n# no description\n'));

expectFail('skills', ({ put }) =>
  put('.agents/skills/demo/SKILL.md',
    `---\nname: demo\ndescription: Oversized body.\n---\n${'line\n'.repeat(510)}`));

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

expectClean('manifest-glob-classes', ({ put }) => {
  put('docs/README.md', '# manifest\n\n| `state/STATE.md` | LIVE | state |\n| `decisions/[0-9]*.md` | REF | records |\n| `specs/[0-9]*/**` | LIVE | specs |\n');
  put('docs/decisions/0001-demo.md', '# 0001\n');
  put('docs/specs/001-demo/notes.md', '# notes\n');
});

// --- enforcement self-report: report, never block (GAP C-2) ---
// Each signal proves both directions, like every gate above; the report itself must never
// throw, whatever the directory looks like: a missing piece is a degraded signal, not a crash.

function expectSignal(label, mutate, name, armed, needle = null) {
  const fx = fixture();
  mutate(fx);
  const report = enforcementReport(fx.root);
  rmSync(fx.root, { recursive: true, force: true });
  try {
    const s = report.find((x) => x.signal === name);
    assert.equal(s.armed, armed, `${label}: expected ${name} armed=${armed}, got: ${JSON.stringify(s)}`);
    if (needle) assert.ok(s.detail.includes(needle), `${label}: detail should mention "${needle}", got: ${s.detail}`);
    tally.passed++;
  } catch (e) { tally.failed.push(`${label}: ${e.message}`); }
}

expectSignal('enforcement-hooks-no-git', () => {}, 'hooks', false, 'git init');
expectSignal('enforcement-hooks-fresh-clone', ({ root }) =>
  execSync('git init -q', { cwd: root }), 'hooks', false, '--install-hooks');
expectSignal('enforcement-hooks-armed', ({ root }) =>
  execSync('git init -q && git config core.hooksPath checks/hooks', { cwd: root }), 'hooks', true);
expectSignal('enforcement-ci-no-workflow', ({ root }) =>
  execSync('git init -q && git remote add origin https://github.com/example/demo.git', { cwd: root }),
'CI', false, 'workflow');
expectSignal('enforcement-ci-no-remote', ({ root, put }) => {
  execSync('git init -q', { cwd: root });
  put('.github/workflows/ci.yml', 'name: ci\n');
}, 'CI', false, 'GitHub remote');
expectSignal('enforcement-ci-armed', ({ root, put }) => {
  execSync('git init -q && git remote add origin https://github.com/example/demo.git', { cwd: root });
  put('.github/workflows/ci.yml', 'name: ci\n');
}, 'CI', true);
expectSignal('enforcement-adapter-missing', () => {}, 'adapter hooks', false, '.claude/settings.json');
expectSignal('enforcement-adapter-empty-hooks', ({ put }) =>
  put('.claude/settings.json', '{"hooks":{}}'), 'adapter hooks', false);
expectSignal('enforcement-adapter-unparseable', ({ put }) =>
  put('.claude/settings.json', 'not json'), 'adapter hooks', false);
expectSignal('enforcement-adapter-wired', ({ put }) =>
  put('.claude/settings.json', '{"hooks":{"Stop":[{"hooks":[{"type":"command","command":"node x"}]}]}}'),
'adapter hooks', true);

{ // a bare directory still yields all three signals, formatted with a fix line per degraded one
  const bare = mkdtempSync(join(tmpdir(), 'groundwork-bare-'));
  try {
    const report = enforcementReport(bare);
    assert.equal(report.length, 3, 'always exactly three signals');
    const lines = formatReport(report);
    assert.ok(lines[0].startsWith('enforcement: '), 'summary line names the tier');
    assert.equal(lines.length, 4, 'three degraded signals get three fix lines under the summary');
    tally.passed++;
  } catch (e) { tally.failed.push(`enforcement-bare-dir: ${e.message}`); }
  rmSync(bare, { recursive: true, force: true });
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
    tally.passed++;
  } catch (e) { tally.failed.push(`handoff-nudge ${label}: ${e.message}`); }
}

// The wave-2 bans ship as data, so prove the real list bites rather than a test stand-in:
// chat residue and a citation artifact, caught by the patterns this repo actually ships.
for (const residue of ['As an AI, I hope this helps.', 'See the guide (utm_source=chatgpt.com).']) {
  expectFail('prose-style', (fx) => {
    const shipped = JSON.parse(readFileSync(new URL('./config.json', import.meta.url), 'utf8'));
    withConfig({ styleBans: shipped.styleBans })(fx);
    fx.put('docs/state/STATE.md', `# STATE\n\n## Handoff\n\n- Now ▶ ${residue}\n`);
  });
}

// Every test above drives a fixture config, so a typo in a pattern this repo actually SHIPS
// would surface only when someone runs the gate for real. Compile the shipped lists once: a
// broken regex makes the whole check crash, and a ban with no "why" is an order without a reason.
try {
  const shipped = JSON.parse(readFileSync(new URL('./config.json', import.meta.url), 'utf8'));
  const broken = [];
  for (const key of ['denylist', 'styleBans', 'commentBans']) {
    for (const e of shipped[key] || []) {
      try { new RegExp(e.pattern, 'i'); } catch (err) { broken.push(`${key} /${e.pattern}/: ${err.message}`); }
      if (!String(e.why || '').trim()) broken.push(`${key} /${e.pattern}/ has no "why"`);
    }
  }
  assert.deepEqual(broken, [], 'shipped config patterns must all compile and explain themselves');
  tally.passed++;
} catch (e) { tally.failed.push(`shipped-config-patterns: ${e.message}`); }
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
    tally.passed++;
  } catch (e) { tally.failed.push(`install-hooks: ${e.message}`); }
  rmSync(fx.root, { recursive: true, force: true });
}

report('runner and document gate');
