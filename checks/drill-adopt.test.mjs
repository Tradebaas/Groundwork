#!/usr/bin/env node
// Self-test for the adoption drill (checks/drill-adopt.mjs) and its fixtures
// (checks/drill-adopt-fixture.mjs). Before the drill's report means anything, three things must
// hold: each fixture is what it claims to be, so a knocked-out property is caught; the drill tells
// "not built yet", "built and failing" and "the drill is broken" apart, each with its own exit
// code; and every check fails when the thing it checks is wrong.
// This suite is green while the walk itself is red by design; CI runs it in the `drill` job.
// Run: node checks/drill-adopt.test.mjs

import { writeFileSync, readFileSync, rmSync, unlinkSync, mkdtempSync, mkdirSync, realpathSync, chmodSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { SOURCE, git } from './drill-core.mjs';
import { FIXTURES, PLANTED_SECRET, SENTINEL, BIG_FILE_LINES, buildFixture, fixtureProblems } from './drill-adopt-fixture.mjs';
import { ROUTE, CHECKS, EXIT, StepFailure, MAX_MS, recordBefore, walkFixture, runAdoptDrill, suppressionPattern } from './drill-adopt.mjs';

const NAMES = Object.keys(FIXTURES);
const boxes = [];
const box = () => {
  const made = realpathSync(mkdtempSync(join(tmpdir(), 'groundwork-adopt-test-')));
  boxes.push(made);
  return made;
};
after(() => { for (const made of boxes) rmSync(made, { recursive: true, force: true }); });

const commitAll = (repo, message) => {
  git(repo, ['add', '-A']);
  return git(repo, ['commit', '-q', '-m', message]);
};

// ---------------------------------------------------------------- the fixtures

for (const name of NAMES) {
  test(`${name}: builds clean, with every property it claims`, () => {
    assert.deepEqual(fixtureProblems(buildFixture(name, box()), name), []);
  });
}

// One fixture, one property knocked out, and the words that must name it.
function knockOut(name, what, breakIt, expected) {
  test(`${name}: ${what} is caught`, () => {
    const repo = buildFixture(name, box());
    breakIt(repo, FIXTURES[name]);
    const problems = fixtureProblems(repo, name);
    assert.ok(problems.some((p) => p.includes(expected)), `no problem naming "${expected}" in: ${JSON.stringify(problems)}`);
  });
}

// Spread across the three so each fixture's own shape is exercised at least once.
knockOut('python', 'a deleted owner hook', (repo) => unlinkSync(join(repo, '.git', 'hooks', 'pre-commit')), 'pre-commit hook');
knockOut('ts-react', 'an unwired hook directory', (repo) => git(repo, ['config', '--unset', 'core.hooksPath']), 'pre-commit hook');
knockOut('ts-react', 'a hook that cannot run', (repo) => chmodSync(join(repo, '.husky', 'pre-commit'), 0o644), 'pre-commit hook');
knockOut('dotnet', 'a hook that leaves no sentinel', (repo) => writeFileSync(join(repo, '.githooks', 'pre-commit'), '#!/bin/sh\nexit 0\n'), 'leaves no sentinel');
knockOut('dotnet', 'a sentinel that is already there', (repo) => writeFileSync(join(repo, '.git', SENTINEL), 'pre-commit\n'), 'sentinel already exists');
knockOut('dotnet', 'a missing CLAUDE.md', (repo) => unlinkSync(join(repo, 'CLAUDE.md')), 'CLAUDE.md');
knockOut('python', 'a missing ci.yml', (repo) => unlinkSync(join(repo, '.github', 'workflows', 'ci.yml')), 'ci.yml');
knockOut('ts-react', 'a file one line short', (repo, spec) => {
  const lines = readFileSync(join(repo, spec.bigFile), 'utf8').split('\n');
  writeFileSync(join(repo, spec.bigFile), lines.slice(1).join('\n'));
}, `${BIG_FILE_LINES} lines`);
knockOut('python', 'a README without em dashes', (repo) => writeFileSync(join(repo, 'README.md'), '# ledger\n\nNo dashes here.\n'), 'em dash');
knockOut('dotnet', 'a missing .venv', (repo) => rmSync(join(repo, '.venv'), { recursive: true }), '.venv/');
knockOut('ts-react', 'a .venv that is no longer ignored', (repo) => {
  writeFileSync(join(repo, '.gitignore'), 'bin/\nobj/\n');
  commitAll(repo, 'stop ignoring .venv');
}, '.venv/');
knockOut('python', 'an ignored file no gate would fire on', (repo) => {
  writeFileSync(join(repo, '.venv', 'lib', 'site-packages', 'vendored.py'), '"""Vendored."""\n');
}, '.venv/');
knockOut('python', 'a history that never held the secret', (repo) => {
  git(repo, ['checkout', '-q', '--orphan', 'squashed']);
  commitAll(repo, 'squashed');
  git(repo, ['branch', '-q', '-D', 'main']);
  git(repo, ['branch', '-q', '-m', 'main']);
}, 'secret');
knockOut('ts-react', 'a secret still in the tree', (repo, spec) => {
  writeFileSync(join(repo, spec.secretFile), `AWS_ACCESS_KEY_ID=${PLANTED_SECRET}\n`);
  commitAll(repo, 'put it back');
}, 'secret');
knockOut('python', 'a dirty working tree', (repo) => writeFileSync(join(repo, 'stray.txt'), 'uncommitted\n'), 'not clean');

// git exports GIT_DIR and GIT_INDEX_FILE to its hooks. A drill started from inside one must still
// build its fixtures where it says, and never commit into the repository whose hook ran it.
test('a drill started inside another repository\'s hook never writes to that repository', () => {
  const decoy = join(box(), 'decoy');
  mkdirSync(decoy);
  git(decoy, ['init', '-q', '-b', 'main']);
  writeFileSync(join(decoy, 'a.txt'), 'a\n');
  commitAll(decoy, 'decoy');
  const saved = { GIT_DIR: process.env.GIT_DIR, GIT_INDEX_FILE: process.env.GIT_INDEX_FILE };
  process.env.GIT_DIR = join(decoy, '.git');
  process.env.GIT_INDEX_FILE = join(decoy, '.git', 'index');
  let repo;
  try {
    repo = buildFixture('python', box());
  } finally {
    for (const [key, value] of Object.entries(saved)) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  }
  assert.equal(git(decoy, ['rev-list', '--count', 'HEAD']).stdout.trim(), '1');
  assert.equal(git(decoy, ['status', '--porcelain']).stdout, '');
  assert.equal(git(repo, ['rev-list', '--count', 'HEAD']).stdout.trim(), '4');
});

// ---------------------------------------------------------------- how the walk classifies

const step = (id, extra = {}) => ({ id, pkg: `PKG-${id}`, built: true, owner: false, needs: [], run() {}, ...extra });
const walk = (route) => walkFixture('python', { framework: box(), box: box(), route, checks: [] });
const states = (r) => r.steps.map((s) => s.state);

test('a step not built is reported with its package, never run, and the walk goes on past it', async () => {
  let ran = false;
  const r = await walk([step('a', { built: false, entry: ['framework', 'checks/nope.mjs'], run() { ran = true; } }), step('b')]);
  assert.equal(ran, false);
  assert.equal(r.defect, null);
  assert.deepEqual(states(r), ['not built', 'ok']);
  assert.match(r.steps[0].note, /checks\/nope\.mjs is not in the framework copy/);
  assert.equal(r.steps[0].pkg, 'PKG-a');
});

test('a step that needs one that did not pass is not reached; a fallback counts as passed', async () => {
  assert.deepEqual(states(await walk([step('a', { built: false }), step('b', { needs: ['a'] })])), ['not built', 'not reached']);
  const r = await walk([step('a', { built: false, fallback: () => 'used the fallback' }), step('b', { needs: ['a'] })]);
  assert.deepEqual(states(r), ['not built', 'ok']);
  assert.match(r.steps[0].note, /used the fallback/);
});

test('a check whose step was never reached says so instead of passing', async () => {
  const r = await walkFixture('python', { framework: SOURCE, box: box(), route: [step('commit', { built: false })] });
  assert.equal(r.defect, null);
  assert.deepEqual(Object.fromEntries(r.checks.map((c) => [c.id, c.state])),
    Object.fromEntries(CHECKS.map((c) => [c.id, 'not reached'])));
});

test('a built flag that disagrees with the tree is red, in both directions', async () => {
  const framework = box();
  mkdirSync(join(framework, 'checks'));
  writeFileSync(join(framework, 'checks', 'here.mjs'), '');
  const r = await walkFixture('python', { framework, box: box(), checks: [], route: [
    step('a', { built: false, entry: ['framework', 'checks/here.mjs'] }),
    step('b', { entry: ['framework', 'checks/gone.mjs'] }),
  ] });
  assert.deepEqual(states(r), ['red', 'red']);
  assert.match(r.steps[0].note, /still marked not built/);
  assert.match(r.steps[1].note, /is gone from the framework copy/);
});

test('a built step that finds the route wanting is red for its own package', async () => {
  const r = await walk([step('a', { run() { throw new StepFailure('wanting'); } })]);
  assert.deepEqual({ defect: r.defect, state: r.steps[0].state, pkg: r.steps[0].pkg, note: r.steps[0].note },
    { defect: null, state: 'red', pkg: 'PKG-a', note: ': wanting' });
});

test('a crash or a fixture that does not build is a defect of the drill, not red for a package', async () => {
  assert.match((await walk([step('a', { run() { throw new TypeError('boom'); } })])).defect, /step a crashed/);
  const r = await walkFixture('cobol', { framework: box(), box: box(), route: [], checks: [] });
  assert.match(r.defect, /fixture cobol did not build/);
});

// Each exit code, pinned: a drill whose codes drift would print one answer and mean another.
async function quietly(run) {
  const log = console.log;
  console.log = () => {};
  try { return await run(); } finally { console.log = log; }
}
// A defect keeps its fixtures on disk for a person to inspect; the test takes them back.
async function exitOf(route, checks = []) {
  const r = await quietly(() => runAdoptDrill({ names: ['python'], route, checks }));
  if (r.box) boxes.push(r.box);
  return r.code;
}
const passing = { id: 'c', title: 'c', pkg: 'PKG-c', needs: 'a', run() {} };

test('exit 0: every step and check green', async () => assert.equal(await exitOf([step('a')], [passing]), EXIT.green));
test('exit 1: something built fails', async () => {
  assert.equal(await exitOf([step('a', { run() { throw new StepFailure('no'); } })]), EXIT.red);
  assert.equal(await exitOf([step('a')], [{ ...passing, run() { throw new StepFailure('no'); } }]), EXIT.red);
});
test('exit 2: the drill is broken', async () => {
  assert.equal(await exitOf([step('a', { run() { throw new TypeError('boom'); } })]), EXIT.defect);
  assert.equal(await exitOf([step('a')], [{ ...passing, run() { throw new TypeError('boom'); } }]), EXIT.defect);
  assert.equal((await quietly(() => runAdoptDrill({ ref: 'no-such-ref', names: [] }))).code, EXIT.defect);
});
test('exit 3: only steps not built yet stand in the way', async () => {
  assert.equal(await exitOf([step('a', { built: false }), step('b', { needs: ['a'] })], [{ ...passing, needs: 'b' }]), EXIT.notBuilt);
});

// ---------------------------------------------------------------- the route's own steps

const routeStep = (id) => ROUTE.find((s) => s.id === id);

test('the hooks step is red when a staged file that breaks a gate gets committed, and cleans up', () => {
  const repo = buildFixture('python', box());
  const before = git(repo, ['rev-parse', 'HEAD']).stdout;
  assert.throws(() => routeStep('hooks').run({ repo }), /was committed: Groundwork's pre-commit gate is not in the chain/);
  assert.equal(git(repo, ['rev-parse', 'HEAD']).stdout, before);
  assert.equal(existsSync(join(repo, 'drill-probe.md')), false);
  assert.equal(git(repo, ['status', '--porcelain']).stdout, '');
});

test('the hooks step does not count a refusal that is not about the probe', () => {
  const repo = buildFixture('python', box());
  writeFileSync(join(repo, '.git', 'hooks', 'pre-commit'), '#!/bin/sh\necho refused for an unrelated reason\nexit 1\n', { mode: 0o755 });
  assert.throws(() => routeStep('hooks').run({ repo }), /refused for another reason/);
});

// ---------------------------------------------------------------- the checks

const check = (id) => CHECKS.find((c) => c.id === id);

// A repository adopted by hand the way a bad adoption would do it: one commit on the fixture.
function adopted(name, change) {
  const repo = buildFixture(name, box());
  const ctx = { name, repo, framework: SOURCE, route: ROUTE, before: recordBefore(repo), sentinelBefore: 0, ms: 1 };
  change(repo);
  const made = commitAll(repo, 'chore: adopt');
  assert.equal(made.status, 0, made.stderr);
  return ctx;
}
const put = (repo, path, content) => {
  mkdirSync(join(repo, path, '..'), { recursive: true });
  writeFileSync(join(repo, path), content);
};

test('governed: exactly one commit on the owner\'s history, and a message gate that bites', () => {
  const twice = adopted('ts-react', (repo) => put(repo, 'NOTES.md', 'x\n'));
  put(twice.repo, 'MORE.md', 'y\n');
  commitAll(twice.repo, 'chore: and another');
  assert.throws(() => check('governed').run(twice), /exactly one commit/);
  const unarmed = adopted('ts-react', (repo) => put(repo, 'NOTES.md', 'x\n'));
  assert.throws(() => check('governed').run(unarmed), /ungoverned commit/);
});

test('assessment: one committed report that names where the secret was, without the secret', () => {
  const report = 'docs/state/log/2026-09-27-assessment.md';
  const { secretFile } = FIXTURES.dotnet;
  check('assessment').run(adopted('dotnet', (repo) => put(repo, report, `History: a key sat in ${secretFile}.\n`)));
  assert.throws(() => check('assessment').run(adopted('dotnet', (repo) => put(repo, 'NOTES.md', 'x\n'))), /found 0/);
  assert.throws(() => check('assessment').run(adopted('dotnet', (repo) => put(repo, report, 'History: clean.\n'))), /does not name/);
  assert.throws(() => check('assessment').run(adopted('dotnet', (repo) => put(repo, report, `${secretFile}: ${PLANTED_SECRET}\n`))), /repeats the secret/);
});

test('suppressions: one added to an owner file fails, one in a new framework file does not', () => {
  const ctx = adopted('ts-react', (repo) => {
    put(repo, 'checks/some.test.mjs', '// checks:allow-secret\n');
    put(repo, 'src/App.tsx', '// @ts-nocheck\nexport const App = 1;\n');
  });
  assert.throws(() => check('suppressions').run(ctx), /added 1 inline suppression/);
});

test('suppressions: the ban is read from the framework config, plus what it cannot see', () => {
  const pattern = suppressionPattern(SOURCE);
  for (const line of ['# NOQA', '# ruff: noqa', '// @ts-nocheck', '#pragma warning disable CS0168',
    '[SuppressMessage("x", "y")]', '// checks:allow-length: legacy', '# pylint: disable=all']) {
    assert.ok(pattern.test(line), line);
  }
  assert.equal(pattern.test('const total = rows.length;'), false);
  const bare = box();
  put(bare, 'checks/config.json', '{ "commentBans": [] }\n');
  assert.throws(() => suppressionPattern(bare), /no suppression ban/);
});

test('baseline: exactly the planted entries, and a broken file is red rather than a crash', () => {
  const repo = buildFixture('python', box());
  const ctx = { name: 'python', repo };
  const write = (text) => put(repo, 'checks/baseline.json', text);
  const planted = FIXTURES.python.baseline.map((e) => ({ ...e, count: 1, debt: 'DEBT-001' }));
  write(JSON.stringify(planted));
  check('baseline').run(ctx);
  write(JSON.stringify({ entries: planted }));
  check('baseline').run(ctx);
  write(JSON.stringify([...planted, { gate: 'links', path: 'README.md', count: 1 }]));
  assert.throws(() => check('baseline').run(ctx), /holds 3 entries/);
  write('{ not json');
  assert.throws(() => check('baseline').run(ctx), (e) => e instanceof StepFailure && /not JSON/.test(e.message));
  write('null');
  assert.throws(() => check('baseline').run(ctx), (e) => e instanceof StepFailure && /no list/.test(e.message));
});

test('debt: a row for every baselined gate', () => {
  check('debt').run(adopted('python', (repo) => put(repo, 'docs/state/DEBT.md', '| prose-style |\n| code-file-cap |\n')));
  assert.throws(() => check('debt').run(adopted('python', (repo) => put(repo, 'docs/state/DEBT.md', '| prose-style |\n'))), /no row for code-file-cap/);
});

test('sentinel: the owner\'s hook ran on the adoption commit, and only a commit makes it run', () => {
  const repo = buildFixture('ts-react', box());
  assert.throws(() => check('sentinel').run({ repo, sentinelBefore: 0 }), StepFailure);
  check('sentinel').run(adopted('ts-react', (r) => put(r, 'NOTES.md', 'x\n')));
});

test('owner-ci: a changed ci.yml of the owner fails', () => {
  const ctx = adopted('dotnet', (repo) => put(repo, '.github/workflows/ci.yml', 'name: groundwork\n'));
  assert.throws(() => check('owner-ci').run(ctx), /ci\.yml/);
});

test('owner-actions and time hold their limits', () => {
  assert.equal(check('owner-actions').run({ route: ROUTE }), '2 of 3');
  assert.throws(() => check('owner-actions').run({ route: [1, 2, 3, 4].map((i) => step(`s${i}`, { owner: true })) }), /asks the owner 4 times/);
  assert.throws(() => check('time').run({ ms: MAX_MS + 1 }), /took/);
});

// ---------------------------------------------------------------- the real walk

// Whatever is built on the day it runs, every fixture is either green or red for a named package,
// and the drill itself reports no defect.
test('the real walk is red only for packages, never for the drill', async () => {
  const r = await quietly(() => runAdoptDrill());
  assert.notEqual(r.code, EXIT.defect, JSON.stringify(r.results.map((f) => f.defect)));
  for (const f of r.results) {
    for (const x of [...f.steps, ...f.checks].filter((y) => y.state !== 'ok')) {
      assert.match(x.pkg, /^(ADP|REL|AX)-[0-9a-z]+(, (ADP|REL|AX)-[0-9a-z]+)*$/, `${f.name} ${x.id}`);
    }
  }
});
