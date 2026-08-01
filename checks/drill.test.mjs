#!/usr/bin/env node
// Self-test for checks/drill.mjs: every step must fail when the copy is broken.
// A drill that cannot fail is worse than no drill, because it publishes a green result either
// way. Each test below breaks exactly the thing one step exists to notice, and requires that
// step to reject the copy.
// The clean case is not repeated here: CI runs `node checks/drill.mjs` straight after this
// suite, so a step that failed unconditionally would turn that run red. This file owns the
// other direction only.
// Run: node checks/drill.test.mjs

import { writeFileSync, rmSync, unlinkSync, symlinkSync, mkdtempSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { STEPS, freshCopy, isFramework, runDrill } from './drill.mjs';

const step = (id) => STEPS.find((s) => s.id === id);

// A copy, advanced through the steps a scenario needs before the one under test. Nothing is
// stubbed: the prefix runs the real drill steps against the real snapshot.
async function copyAt(prefix = []) {
  const { box, copy } = freshCopy();
  const ctx = { copy, box, ref: 'HEAD' };
  for (const id of prefix) await step(id).run(ctx);
  return { ...ctx, clean: () => rmSync(box, { recursive: true, force: true }) };
}

// A project that ran `begin` inherits this file and is not what it drills. The signal has to be
// right in both directions, or the drill either skips the framework or walks someone's project.
test('the framework is told apart from a project built on it', async () => {
  const c = await copyAt();
  assert.equal(isFramework(c.copy), true);
  rmSync(join(c.copy, 'docs', 'specs', 'archive', '000-baseline'), { recursive: true });
  assert.equal(isFramework(c.copy), false);
  c.clean();
});

// Skipping is right for a project and wrong for the framework's own CI, where a green tick would
// then stand for a walk that never happened. The source here is a repository that is plainly not
// Groundwork, which is the only state in which the question comes up.
test('a skip is green on its own and red when the walk was required', async () => {
  const box = mkdtempSync(join(tmpdir(), 'groundwork-drill-notframework-'));
  writeFileSync(join(box, 'README.md'), '# a project, not the framework\n');
  for (const args of [['init', '-q', '-b', 'main'], ['add', '-A'],
    ['-c', 'user.email=t@example.invalid', '-c', 'user.name=T', 'commit', '-q', '-m', 'first']]) {
    spawnSync('git', args, { cwd: box, env: { ...process.env, GIT_CONFIG_GLOBAL: join(box, 'none') } });
  }
  const skipped = await runDrill({ source: box });
  assert.deepEqual({ ok: skipped.ok, skipped: skipped.skipped }, { ok: true, skipped: true });
  const required = await runDrill({ source: box, requireWalk: true });
  assert.deepEqual({ ok: required.ok, skipped: required.skipped }, { ok: false, skipped: true });
  rmSync(box, { recursive: true, force: true });
});

// The one break the ZIP and degit routes actually cause, and the reason README ships a repair.
test('a broken .claude/skills symlink is caught', async () => {
  const c = await copyAt();
  unlinkSync(join(c.copy, '.claude', 'skills'));
  await assert.rejects(step('copy').run(c), /is missing from the copy/);
  c.clean();
});

test('a symlink pointing somewhere else is caught', async () => {
  const c = await copyAt();
  unlinkSync(join(c.copy, '.claude', 'skills'));
  symlinkSync('../.agents', join(c.copy, '.claude', 'skills'));
  await assert.rejects(step('copy').run(c), /points at/);
  c.clean();
});

// The gitignore keeps maintainer state out of every copy. If that ever slips, an adopter
// receives someone else's live project state.
test('a maintainer-only file that reached the copy is caught', async () => {
  const c = await copyAt();
  writeFileSync(join(c.copy, 'docs', 'state', 'STATE.local.md'), '# leaked\n');
  await assert.rejects(step('copy').run(c), /maintainer-only/);
  c.clean();
});

test('a copy whose own checks go red is caught', async () => {
  const c = await copyAt();
  writeFileSync(join(c.copy, 'docs', 'stray-note.md'), '# not in the manifest\n');
  await assert.rejects(step('gates').run(c), /check\.mjs failed/);
  c.clean();
});

test('an overview that does not render is caught', async () => {
  const c = await copyAt();
  writeFileSync(join(c.copy, 'checks', 'progress.mjs'), 'process.exit(1)\n');
  await assert.rejects(step('overview').run(c), /progress\.mjs failed/);
  c.clean();
});

// begin step 1 tells the owner to copy three blanks over Groundwork's own files. If one of those
// blanks is ever renamed or dropped, the instruction becomes a dead command.
test('a begin clearing command with no template left to copy is caught', async () => {
  const c = await copyAt();
  unlinkSync(join(c.copy, 'docs', 'state', 'TEMPLATE-DEBT.md'));
  await assert.rejects(step('clearing').run(c), /no blank at docs\/state\/TEMPLATE-DEBT\.md/);
  c.clean();
});

test('gates that were already armed before arming them is caught', async () => {
  const c = await copyAt(['arm']);
  await assert.rejects(step('arm').run(c), /already armed/);
  c.clean();
});

test('a first commit the gates reject is caught', async () => {
  const c = await copyAt(['arm']);
  writeFileSync(join(c.copy, 'docs', 'stray-note.md'), '# not in the manifest\n');
  await assert.rejects(step('commit').run(c), /rejected/);
  c.clean();
});

// The one that matters most: if the commit gate is not actually biting, the drill must say so
// instead of reporting a governed copy.
test('a commit gate that is not biting is caught', async () => {
  const c = await copyAt(['arm', 'commit']);
  spawnSync('git', ['config', '--unset', 'core.hooksPath'], { cwd: c.copy });
  await assert.rejects(step('bite').run(c), /accepted/);
  c.clean();
});
