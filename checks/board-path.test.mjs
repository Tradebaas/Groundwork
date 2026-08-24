#!/usr/bin/env node
// Self-test for checks/board-path.mjs: what the board may open, and who may ask.
// The file route is the one place where this repository serves anything at all, so its decision
// is proven here directly, in every spelling that has ever been used to leave a root, and never
// through the server. It has its own page for the same reason the decision does: a security seam
// is easier to keep honest when nothing else shares the page it is on.
// Run: node --test checks/board-path.test.mjs

import { writeFileSync, symlinkSync, unlinkSync, rmSync, realpathSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { decidePath, hostAllowed, ignoreLookup } from './board-path.mjs';
import { fixture } from './board-fixture.mjs';

// ---------------------------------------------------------------- the path decision

test('a normal project file inside the root is served', () => {
  const f = fixture({ 'docs/product/BRIEF.md': '# BRIEF' });
  const d = decidePath(f.root, 'docs/product/BRIEF.md', { isIgnored: () => false });
  assert.equal(d.ok, true);
  assert.equal(d.rel, 'docs/product/BRIEF.md');
  f.clean();
});

// Every spelling that has ever walked out of a document root. The answer is identical each
// time, so a caller learns nothing from which refusal it got.
test('a path that leaves the root is refused, in every spelling', () => {
  const f = fixture({ 'docs/inside.md': 'inside' });
  writeFileSync(join(f.root, '..', 'groundwork-board-outside.md'), 'secret');
  const nope = { isIgnored: () => false };
  for (const spelling of [
    '../groundwork-board-outside.md',
    'docs/../../groundwork-board-outside.md',
    './../groundwork-board-outside.md',
    '..%2Fgroundwork-board-outside.md',
    '%2e%2e/groundwork-board-outside.md',
    '..\\groundwork-board-outside.md',
    '/etc/hosts',
    // An absolute path is refused as a spelling, even when it names a file that is inside the
    // project. Both forms of the root are asked for: on a machine where the temp directory is
    // itself a symlink, only the second one reaches the containment check as a real prefix,
    // and a guard that leans on containment alone serves it (caught by CI on Linux).
    join(f.root, 'docs', 'inside.md'),
    join(realpathSync(f.root), 'docs', 'inside.md'),
    'C:\\Windows\\win.ini',
    '',
    '   ',
  ]) {
    assert.deepEqual(decidePath(f.root, spelling, nope), { ok: false }, `permitted: ${spelling}`);
  }
  rmSync(join(f.root, '..', 'groundwork-board-outside.md'), { force: true });
  f.clean();
});

// A link is judged by where it lands, not by where it sits.
test('a symlink whose target is outside the root is refused', () => {
  const f = fixture({ 'docs/inside.md': 'inside' });
  const outside = join(f.root, '..', 'groundwork-board-target.md');
  writeFileSync(outside, 'secret');
  symlinkSync(outside, join(f.root, 'docs', 'escape.md'));
  assert.deepEqual(decidePath(f.root, 'docs/escape.md', { isIgnored: () => false }), { ok: false });
  rmSync(outside, { force: true });
  f.clean();
});

// A path is spelled from inside the project or it is refused, even when it would loop back in
// through a link outside the root.
test('a path spelled from outside the root is refused even when it lands inside', () => {
  const f = fixture({ 'docs/inside.md': 'inside' });
  const loop = join(f.root, '..', 'groundwork-board-loop');
  // unlink, not rm: the link points at a directory, and only the link may go.
  const drop = () => { try { unlinkSync(loop); } catch { /* not there */ } };
  drop();
  symlinkSync(f.root, loop);
  const asked = `../${loop.split('/').pop()}/docs/inside.md`;
  assert.deepEqual(decidePath(f.root, asked, { isIgnored: () => false }), { ok: false });
  drop();
  f.clean();
});

test('the git directory, environment files and keys are refused', () => {
  const f = fixture({
    '.git/config': '[core]',
    '.env': 'TOKEN=live-secret',
    '.env.production': 'TOKEN=live-secret',
    'deploy.key': 'PRIVATE KEY',
    'node_modules/pkg/index.js': 'module.exports = 1',
  });
  const nope = { isIgnored: () => false };
  for (const p of ['.git/config', '.env', '.env.production', 'deploy.key', 'node_modules/pkg/index.js']) {
    assert.deepEqual(decidePath(f.root, p, nope), { ok: false }, `permitted: ${p}`);
  }
  f.clean();
});

// What the project keeps out of git is what the owner already decided is not shared. The board
// is not the place where that decision quietly stops holding.
test('a file the project ignores in git is refused', () => {
  const f = fixture({
    '.gitignore': '*.local.md\n',
    'docs/state/STATE.local.md': 'private handoff',
    'docs/state/STATE.md': 'shared handoff',
  });
  execFileSync('git', ['init', '-q'], { cwd: f.root, stdio: 'ignore' });
  assert.equal(decidePath(f.root, 'docs/state/STATE.local.md').ok, false);
  assert.equal(decidePath(f.root, 'docs/state/STATE.md').ok, true);
  f.clean();
});

// A board that names every document would spawn a git process per name. One question for the
// page keeps the answers identical and the render fast.
test('the ignore question is asked once for a page, and a name it did not expect still gets one', () => {
  const f = fixture({
    '.gitignore': '*.local.md\n',
    'docs/state/STATE.local.md': 'private handoff',
    'docs/state/STATE.md': 'shared handoff',
    'docs/product/BRIEF.md': 'the brief',
  });
  execFileSync('git', ['init', '-q'], { cwd: f.root, stdio: 'ignore' });
  const asked = [];
  const single = (root, p) => { asked.push(p); return false; };
  const isIgnored = ignoreLookup(f.root, ['docs/state/STATE.local.md', 'docs/state/STATE.md'], { ask: single });
  // The batch answers exactly what the one-at-a-time question answers.
  assert.equal(isIgnored(f.root, 'docs/state/STATE.local.md'), true);
  assert.equal(isIgnored(f.root, 'docs/state/STATE.md'), false);
  assert.deepEqual(asked, [], 'a pre-asked name never spawns git a second time');
  // A path that resolved somewhere the page did not expect is still judged, never waved through.
  assert.equal(isIgnored(f.root, 'docs/product/BRIEF.md'), false);
  assert.deepEqual(asked, ['docs/product/BRIEF.md']);
  f.clean();
});

// git reads the batch one path per line, so a file name carrying a line break would split into
// two and the answers would slide onto the wrong paths. An ignored file must never come back as
// permitted because of how it is spelled.
test('a name with a line break in it is asked about on its own, never through the batch', () => {
  const f = fixture({ '.gitignore': 'secret*\n' });
  const withBreak = 'secret\nnotes.md';
  f.put(withBreak, 'private');
  execFileSync('git', ['init', '-q'], { cwd: f.root, stdio: 'ignore' });
  const asked = [];
  const isIgnored = ignoreLookup(f.root, [withBreak, 'docs/state/STATE.md'], {
    ask: (root, p) => { asked.push(p); return true; },
  });
  assert.equal(isIgnored(f.root, withBreak), true);
  assert.deepEqual(asked, [withBreak], 'the name went to the single question, not into the batch');
  // The real decision agrees: git itself, asked one path at a time, refuses it.
  assert.equal(decidePath(f.root, withBreak).ok, false);
  f.clean();
});

test('a directory that is no git repository ignores nothing, as the single question does too', () => {
  const f = fixture({ 'docs/state/STATE.local.md': 'private handoff' });
  const isIgnored = ignoreLookup(f.root, ['docs/state/STATE.local.md']);
  assert.equal(isIgnored(f.root, 'docs/state/STATE.local.md'), false);
  assert.equal(decidePath(f.root, 'docs/state/STATE.local.md').ok, true);
  f.clean();
});

test('a missing file and a directory are refused like anything else', () => {
  const f = fixture({ 'docs/inside.md': 'inside' });
  const nope = { isIgnored: () => false };
  assert.deepEqual(decidePath(f.root, 'docs/nothing-here.md', nope), { ok: false });
  assert.deepEqual(decidePath(f.root, 'docs', nope), { ok: false });
  assert.deepEqual(decidePath(f.root, 'docs/inside.md\0.png', nope), { ok: false });
  f.clean();
});

// ---------------------------------------------------------------- the Host check

test('only a loopback Host is answered', () => {
  for (const h of ['localhost', 'localhost:8321', '127.0.0.1', '127.0.0.1:8321', '127.1.2.3', '[::1]:8321']) {
    assert.equal(hostAllowed(h), true, `refused: ${h}`);
  }
  // A page on another site can point a name it controls at 127.0.0.1; the Host header is what
  // that attack cannot fake, so this is the line that stops it reading the owner's files.
  for (const h of ['evil.example', 'evil.example:8321', '10.0.0.5', 'localhost.evil.example', '', undefined, '::1']) {
    assert.equal(hostAllowed(h), false, `answered: ${h}`);
  }
});
