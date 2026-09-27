#!/usr/bin/env node
// Self-test for the adoption drill (checks/drill-adopt.mjs) and its fixtures
// (checks/drill-adopt-fixture.mjs). Two things must hold before the drill's red means anything: each
// fixture is what it claims to be, so a knocked-out property is caught, and the drill tells
// "not built yet", "built and red" and "the drill is broken" apart.
// This suite is green while the drill itself is red by design; CI runs it first for that reason.
// Run: node checks/drill-adopt.test.mjs

import { writeFileSync, readFileSync, rmSync, unlinkSync, mkdtempSync, mkdirSync, realpathSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FIXTURES, PLANTED_SECRET, SENTINEL, BIG_FILE_LINES, buildFixture, fixtureProblems, git } from './drill-adopt-fixture.mjs';
import { ROUTE, CHECKS, StepFailure, recordBefore, walkFixture, runAdoptDrill } from './drill-adopt.mjs';

const NAMES = Object.keys(FIXTURES);
const box = () => realpathSync(mkdtempSync(join(tmpdir(), 'groundwork-adopt-test-')));

function fixture(name) {
  const parent = box();
  return { repo: buildFixture(name, parent), clean: () => rmSync(parent, { recursive: true, force: true }) };
}

// One fixture, one property knocked out, and the sentence that must name it.
function knockOut(name, breakIt, expected) {
  test(`${name}: ${expected} is caught`, () => {
    const f = fixture(name);
    breakIt(f.repo, FIXTURES[name]);
    const problems = fixtureProblems(f.repo, name);
    assert.ok(problems.some((p) => expected.test ? expected.test(p) : p.includes(expected)),
      `no problem named ${expected} in: ${JSON.stringify(problems)}`);
    f.clean();
  });
}

const commitAll = (repo, message) => {
  git(repo, ['add', '-A']);
  return git(repo, ['commit', '-q', '-m', message]);
};

for (const name of NAMES) {
  test(`${name}: builds clean, with every property it claims`, () => {
    const f = fixture(name);
    assert.deepEqual(fixtureProblems(f.repo, name), []);
    f.clean();
  });
}

// Spread across the three so each fixture's own shape is exercised at least once.
knockOut('python', (repo) => unlinkSync(join(repo, '.git', 'hooks', 'pre-commit')), 'pre-commit hook');
knockOut('ts-react', (repo) => git(repo, ['config', '--unset', 'core.hooksPath']), 'pre-commit hook');
knockOut('dotnet', (repo) => writeFileSync(join(repo, '.githooks', 'pre-commit'), '#!/bin/sh\nexit 0\n'), 'sentinel');
knockOut('dotnet', (repo) => unlinkSync(join(repo, 'CLAUDE.md')), 'CLAUDE.md');
knockOut('python', (repo) => unlinkSync(join(repo, '.github', 'workflows', 'ci.yml')), 'ci.yml');
knockOut('ts-react', (repo, spec) => {
  const lines = readFileSync(join(repo, spec.bigFile), 'utf8').split('\n');
  writeFileSync(join(repo, spec.bigFile), lines.slice(1).join('\n'));
}, `${BIG_FILE_LINES} lines`);
knockOut('python', (repo) => writeFileSync(join(repo, 'README.md'), '# ledger\n\nNo dashes here.\n'), 'em dash');
knockOut('dotnet', (repo) => rmSync(join(repo, '.venv'), { recursive: true }), '.venv/');
knockOut('ts-react', (repo) => {
  writeFileSync(join(repo, '.gitignore'), 'bin/\nobj/\n');
  commitAll(repo, 'stop ignoring .venv');
}, '.venv/');
knockOut('python', (repo) => {
  // One commit holding today's tree: the secret never appears in the history at all.
  git(repo, ['checkout', '-q', '--orphan', 'squashed']);
  commitAll(repo, 'squashed');
  git(repo, ['branch', '-q', '-D', 'main']);
  git(repo, ['branch', '-q', '-m', 'main']);
}, 'secret');
knockOut('ts-react', (repo, spec) => {
  writeFileSync(join(repo, spec.secretFile), `AWS_ACCESS_KEY_ID=${PLANTED_SECRET}\n`);
  commitAll(repo, 'put it back');
}, 'secret');
knockOut('dotnet', (repo) => writeFileSync(join(repo, '.git', SENTINEL), 'pre-commit\n'), 'sentinel already exists');
knockOut('python', (repo) => writeFileSync(join(repo, 'stray.txt'), 'uncommitted\n'), 'clean');

// The drill's own classification, with a route built for the test: a missing entry is "not
// built", a step that finds the route wanting is red for its package, anything else is a defect.
const framework = box();
const walk = (route, name = 'python') => walkFixture(name, { framework, box: box(), route, checks: [] });

test('a step whose entry file is missing is not built, and the walk stops there', async () => {
  const r = await walk([{ id: 'a', pkg: 'PKG-1', entry: ['framework', 'checks/nope.mjs'], run() {} },
    { id: 'b', pkg: 'PKG-2', run() { throw new Error('must not run'); } }]);
  assert.equal(r.defect, null);
  assert.equal(r.stop, 'a');
  assert.match(r.steps[0].note, /^not built \(PKG-1\)/);
  assert.equal(r.steps.length, 1);
});

test('a built step that finds the route wanting is red for its own package', async () => {
  const r = await walk([{ id: 'a', pkg: 'PKG-1', run() { throw new StepFailure('wanting'); } }]);
  assert.deepEqual({ defect: r.defect, stop: r.stop, note: r.steps[0].note },
    { defect: null, stop: 'a', note: 'red (PKG-1): wanting' });
});

test('a step that crashes is a defect of the drill, not red for a package', async () => {
  const r = await walk([{ id: 'a', pkg: 'PKG-1', run() { null.boom; } }]);
  assert.match(r.defect, /step a crashed/);
});

test('a fixture that does not build is a defect', async () => {
  const r = await walk([], 'cobol');
  assert.match(r.defect, /fixture cobol did not build/);
});

test('a check whose step was never reached says so instead of passing', async () => {
  const r = await walkFixture('python', { framework, box: box(),
    route: [{ id: 'assess', pkg: 'PKG-1', entry: ['framework', 'checks/nope.mjs'], run() {} }] });
  const states = Object.fromEntries(r.checks.map((c) => [c.id, c.state]));
  assert.equal(states['owner-actions'], 'ok');
  for (const id of ['governed', 'suppressions', 'baseline', 'sentinel', 'owner-ci', 'time']) {
    assert.equal(states[id], 'not reached', id);
  }
});

// The checks themselves, against a repository changed by hand the way a bad adoption would.
const check = (id) => CHECKS.find((c) => c.id === id);
function adopted(name, change) {
  const f = fixture(name);
  const ctx = { name, repo: f.repo, before: recordBefore(f.repo), ms: 1 };
  change(f.repo);
  const made = commitAll(f.repo, 'chore: adopt');
  assert.equal(made.status, 0, made.stderr);
  return { ctx, clean: f.clean };
}

test('the owner\'s hook fired on the adoption commit, and only then', () => {
  const f = fixture('ts-react');
  assert.throws(() => check('sentinel').run({ repo: f.repo }), StepFailure);
  f.clean();
  const a = adopted('ts-react', (repo) => writeFileSync(join(repo, 'NOTES.md'), 'x\n'));
  check('sentinel').run(a.ctx);
  a.clean();
});

test('a suppression added to an owner file fails; one in a new framework file does not', () => {
  const a = adopted('ts-react', (repo) => {
    writeFileSync(join(repo, 'checks.test.mjs'), '// checks:allow-secret\n');
    writeFileSync(join(repo, 'src', 'App.tsx'), '// eslint-disable-next-line\nexport const App = 1;\n');
  });
  assert.throws(() => check('suppressions').run(a.ctx), /1 inline suppression/);
  a.clean();
});

test("a changed ci.yml of the owner fails", () => {
  const a = adopted('dotnet', (repo) => writeFileSync(join(repo, '.github', 'workflows', 'ci.yml'), 'name: groundwork\n'));
  assert.throws(() => check('owner-ci').run(a.ctx), /ci\.yml/);
  a.clean();
});

test('a baseline that holds anything but the planted entries fails', () => {
  const f = fixture('python');
  const ctx = { name: 'python', repo: f.repo };
  const write = (entries) => {
    mkdirSync(join(f.repo, 'checks'), { recursive: true });
    writeFileSync(join(f.repo, 'checks', 'baseline.json'), JSON.stringify(entries));
  };
  const planted = FIXTURES.python.baseline.map((e) => ({ ...e, count: 1, debt: 'DEBT-001' }));
  write(planted);
  check('baseline').run(ctx);
  write([...planted, { gate: 'links', path: 'README.md', count: 1, debt: 'DEBT-002' }]);
  assert.throws(() => check('baseline').run(ctx), /holds 3 entries/);
  f.clean();
});

test('the route never asks the owner more than three times', () => {
  assert.ok(ROUTE.filter((s) => s.owner).length <= 3);
  assert.equal(check('owner-actions').run(), `${ROUTE.filter((s) => s.owner).length} of 3`);
});

// The real walk over the real snapshot: whatever is built today, every fixture either passes or
// stops at a step a package owns, and the drill itself reports no defect.
test('the real walk is red for packages, never for the drill', async () => {
  const log = console.log;
  console.log = () => {};
  const r = await runAdoptDrill();
  console.log = log;
  assert.notEqual(r.code, 2, JSON.stringify(r.results.map((x) => x.defect)));
  for (const f of r.results) {
    assert.equal(f.defect, null);
    for (const s of f.steps.filter((x) => x.state !== 'ok')) assert.match(s.note, /\((ADP|REL|AX)-[0-9a-z]+\)/);
  }
});
