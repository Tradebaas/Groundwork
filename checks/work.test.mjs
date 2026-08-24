#!/usr/bin/env node
// Self-test for checks/work.mjs. The board, the progress report and the later gate all read the
// work tree through this one reader, so a wrong reading is a wrong picture everywhere. Every
// derived fact and every degraded case named in the story is proven here, not assumed.
// Run: node --test checks/work.test.mjs

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rmSync } from 'node:fs';
import { fixture } from './cockpit-fixture.mjs';
import { readWork, render, field, section, numbered, taskList, verdicts, lane, LANES } from './work.mjs';

const EPIC = `# EPIC: One picture

- **Status:** open, started 2026-08-24 · **Rests on:** decision 0021

## The goal

Every project reads the same way.

## What finished means

1. The board answers the four questions.
2. Nothing is typed twice.
`;

const feature = (over = {}) => `# F: ${over.title || 'A feature that pays for itself'}

- **Epic:** One picture · **Status:** ${over.status || 'refinement'} · **Size:** ${over.size || 'M'}

- **What you can do after it.** ${over.value || 'Read the tree as facts.'}
- **What that is worth.** ${over.worth || 'One reading, everywhere.'}
- **Vision.** ${over.vision || 'Serves "the proof is the point".'}
- **Scope.** In scope, decision 0021.

## Acceptance for the feature as a whole

1. It reads.
2. It counts.
`;

const story = (over = {}) => `# ${over.id || 'S-01'}: ${over.title || 'The first slice'}

- **Feature:** F-01 something · **Status:** ${over.status || 'in progress'} · **Size:** ${over.size || 'M'}
- **Depends on:** ${over.depends === '' ? '' : over.depends || 'none'} · **Owner sign-off:** ${over.signOff || '2026-08-24'}

## Value

${over.value === '' ? '' : over.value || 'One place knows how to read a story.'}

## Acceptance

${over.criteria === '' ? '' : over.criteria || '1. [x] It reads a story.\n2. It counts them.'}

## Tasks

${over.tasks === '' ? '' : over.tasks || '- [x] Write it\n- [~] Test it\n- [ ] Wire it'}

## Review

- Technical: ${over.tech || 'pending'}
- Functional: ${over.func || 'pending'}
- Architecture: ${over.arch || 'pending'}
`;

// A full tree, used by most cases: one feature with two stories, one of them done.
function tree(extra = {}) {
  const fx = fixture({
    'docs/work/E-01-picture/epic.md': EPIC,
    'docs/work/E-01-picture/F-01-reading/feature.md': feature({ title: 'Reading the tree' }),
    'docs/work/E-01-picture/F-01-reading/S-01-first.md': story({ id: 'S-01', status: 'done', title: 'The first slice' }),
    'docs/work/E-01-picture/F-01-reading/S-02-second.md': story({ id: 'S-02', status: 'in progress', title: 'The second slice', depends: 'S-01' }),
    ...extra,
  });
  return fx;
}

const storyOf = (work, key) => work.stories.find((s) => s.key === key);

// ---------------------------------------------------------------- the facts, as the files say them

test('the tree is read as facts: epic, features, stories, with the ids from the tree itself', () => {
  const fx = tree();
  const work = readWork(fx.root);
  assert.equal(work.present, true);
  assert.deepEqual(work.epics.map((e) => e.key), ['E-01']);
  assert.equal(work.epics[0].title, 'One picture');
  assert.equal(work.epics[0].status, 'open');
  assert.equal(work.epics[0].goal, 'Every project reads the same way.');
  assert.equal(work.epics[0].finished.length, 2);
  assert.deepEqual(work.epics[0].featureKeys, ['E-01/F-01']);
  assert.deepEqual(work.features.map((f) => f.key), ['E-01/F-01']);
  assert.equal(work.features[0].title, 'Reading the tree');
  assert.deepEqual(work.features[0].storyKeys, ['E-01/F-01/S-01', 'E-01/F-01/S-02']);
  assert.equal(work.features[0].acceptance.length, 2);
  assert.match(work.features[0].vision, /the proof is the point/);
  assert.deepEqual(work.stories.map((s) => s.key), ['E-01/F-01/S-01', 'E-01/F-01/S-02']);
  fx.clean();
});

// The `**Feature:**` line inside every fixture story says F-01 something; a story in another
// folder still belongs to that folder, because containment is physical.
test('a story belongs to the folder it is in, whatever its own Feature line claims', () => {
  const fx = tree({ 'docs/work/E-01-picture/F-02-elsewhere/feature.md': feature(), 'docs/work/E-01-picture/F-02-elsewhere/S-01-first.md': story() });
  const work = readWork(fx.root);
  assert.deepEqual(work.stories.map((s) => s.key).sort(), ['E-01/F-01/S-01', 'E-01/F-01/S-02', 'E-01/F-02/S-01']);
  assert.equal(storyOf(work, 'E-01/F-02/S-01').feature, 'E-01/F-02');
  fx.clean();
});

test('a criterion marked [x] is demonstrated, the others are not, and tasks keep their tick state', () => {
  const fx = tree();
  const s = storyOf(readWork(fx.root), 'E-01/F-01/S-02');
  assert.deepEqual(s.criteria.map((c) => c.done), [true, false]);
  assert.equal(s.criteria[0].text, 'It reads a story.');
  assert.deepEqual(s.tasks.items.map((t) => t.state), ['done', 'started', 'open']);
  assert.deepEqual([s.tasks.done, s.tasks.total], [1, 3]);
  fx.clean();
});

test('a value that runs on over several lines is read whole, and fields sharing a line are separated', () => {
  const fx = tree({
    'docs/work/E-01-picture/F-01-reading/S-02-second.md': story({ id: 'S-02', depends: 'S-01', size: 'L' }),
    'docs/work/E-01-picture/F-01-reading/feature.md': `# F: Wrapping

- **Epic:** One picture · **Status:** refinement · **Size:** M

- **What you can do after it.** A sentence that does not fit on
  one line at all, and keeps going.
- **What that is worth.** Something.
- **Vision.** Somewhere.
- **Scope.** In scope.
`,
  });
  const work = readWork(fx.root);
  assert.equal(work.features[0].value, 'A sentence that does not fit on one line at all, and keeps going.');
  assert.equal(work.features[0].size, 'M');
  assert.equal(storyOf(work, 'E-01/F-01/S-02').size, 'L');
  fx.clean();
});

test('a maintainer-local file is read like the tracked one, and wins where both exist', () => {
  const fx = tree({
    'docs/work/E-01-picture/epic.local.md': EPIC.replace('One picture', 'The local goal'),
    'docs/work/E-01-picture/F-01-reading/S-03-third.local.md': story({ id: 'S-03', title: 'Local only' }),
    'docs/work/E-01-picture/F-01-reading/S-01-first.local.md': story({ id: 'S-01', status: 'preview', title: 'The local first slice' }),
  });
  const work = readWork(fx.root);
  assert.equal(work.epics[0].title, 'The local goal');
  assert.equal(storyOf(work, 'E-01/F-01/S-01').title, 'The local first slice');
  assert.equal(storyOf(work, 'E-01/F-01/S-01').lane, 'preview');
  assert.equal(storyOf(work, 'E-01/F-01/S-03').title, 'Local only');
  assert.equal(work.stories.length, 3, 'the same story is not counted twice');
  fx.clean();
});

// ---------------------------------------------------------------- what is derived

test('the lane is the status word, and only the six lanes are a status', () => {
  assert.deepEqual(LANES.map((l) => lane(l.toUpperCase())), LANES);
  assert.equal(lane('In Progress'), 'in progress');
  assert.equal(lane('to-do'), 'to do');
  assert.equal(lane('open, started 2026-08-24'), null);
  assert.equal(lane(''), null);
});

test('counts and feature progress are derived, and move when one status line moves', () => {
  const fx = tree();
  const before = readWork(fx.root);
  assert.deepEqual(before.counts.stories, { done: 1, total: 2 });
  assert.deepEqual(before.counts.features, { done: 0, total: 1 });
  assert.deepEqual(before.counts.epics, { done: 0, total: 1 });
  assert.deepEqual(before.features[0].progress, { done: 1, total: 2 });
  assert.equal(before.counts.lanes['in progress'], 1);

  fx.put('docs/work/E-01-picture/F-01-reading/S-02-second.md', story({ id: 'S-02', status: 'done', depends: 'S-01' }));
  const after = readWork(fx.root);
  assert.deepEqual(after.counts.stories, { done: 2, total: 2 });
  assert.deepEqual(after.counts.features, { done: 1, total: 1 }, 'a feature is done when its stories are');
  assert.deepEqual(after.counts.epics, { done: 1, total: 1 }, 'and an epic when its features are');
  assert.equal(after.counts.lanes['in progress'], 0);
  fx.clean();
});

test('a feature with no stories is not done, whatever its own status line says', () => {
  const fx = tree({ 'docs/work/E-01-picture/F-02-later/feature.md': feature({ status: 'backlog', title: 'Still a headline' }) });
  const work = readWork(fx.root);
  const f = work.features.find((x) => x.id === 'F-02');
  assert.equal(f.status, 'backlog');
  assert.deepEqual(f.progress, { done: 0, total: 0 });
  assert.equal(f.done, false);
  assert.equal(work.counts.features.total, 2);
  fx.clean();
});

test('ready is the six lines of the rule, and each missing one is named', () => {
  const fx = tree();
  const ready = storyOf(readWork(fx.root), 'E-01/F-01/S-02');
  assert.equal(ready.ready.ok, true);
  assert.deepEqual(ready.ready.missing, []);

  fx.put('docs/work/E-01-picture/F-01-reading/S-02-second.md', story({ id: 'S-02', value: '', criteria: '', tasks: '', size: 'XL', depends: '', signOff: 'not yet' }));
  const bare = storyOf(readWork(fx.root), 'E-01/F-01/S-02');
  assert.equal(bare.ready.ok, false);
  assert.deepEqual(bare.ready.missing.map((m) => m.key), ['value', 'criteria', 'tasks', 'size', 'depends', 'sign-off']);
  assert.equal(bare.size, null, 'a size that is not S, M or L is no size');
  assert.equal(bare.signOff, null, 'a sign-off without a date is no sign-off');
  fx.clean();
});

test('a blocker is a story that is not done yet, and a dependency that is no story at all', () => {
  const fx = tree({
    'docs/work/E-01-picture/F-01-reading/S-03-third.md': story({ id: 'S-03', depends: 'S-02, F-09/S-01' }),
  });
  const s = storyOf(readWork(fx.root), 'E-01/F-01/S-03');
  assert.deepEqual(s.dependsOn.refs, ['E-01/F-01/S-02', 'E-01/F-09/S-01'], 'what is left out is taken from where the story sits');
  assert.deepEqual(s.blockers.map((b) => b.text), [
    'waits for E-01/F-01/S-02 The second slice',
    'depends on E-01/F-09/S-01, which is no story',
  ]);
  fx.clean();
});

// A project runs several epics one after the other (owner, 2026-08-24), so the same feature and
// story numbers come back in every one of them and only the whole path is an identity.
test('a second epic has its own F-01 and S-01, and neither collides with the first', () => {
  const fx = tree({
    'docs/work/E-02-phase-two/epic.md': EPIC.replace('One picture', 'Phase two'),
    'docs/work/E-02-phase-two/F-01-first/feature.md': feature({ title: 'The first of the second phase' }),
    'docs/work/E-02-phase-two/F-01-first/S-01-first.md': story({ id: 'S-01', title: 'Its own first slice' }),
  });
  const work = readWork(fx.root);
  assert.deepEqual(work.epics.map((e) => e.key), ['E-01', 'E-02']);
  assert.deepEqual(work.features.map((f) => f.key), ['E-01/F-01', 'E-02/F-01']);
  assert.equal(storyOf(work, 'E-01/F-01/S-01').title, 'The first slice');
  assert.equal(storyOf(work, 'E-02/F-01/S-01').title, 'Its own first slice');
  assert.deepEqual(work.counts.epics, { done: 0, total: 2 });
  assert.deepEqual(work.counts.stories, { done: 1, total: 3 });
  fx.clean();
});

test('a story can depend on one in another epic, written out in full', () => {
  const fx = tree({
    'docs/work/E-02-phase-two/epic.md': EPIC.replace('One picture', 'Phase two'),
    'docs/work/E-02-phase-two/F-01-first/feature.md': feature(),
    'docs/work/E-02-phase-two/F-01-first/S-01-first.md': story({ id: 'S-01', depends: 'E-01/F-01/S-02' }),
  });
  const s = storyOf(readWork(fx.root), 'E-02/F-01/S-01');
  assert.deepEqual(s.dependsOn.refs, ['E-01/F-01/S-02']);
  assert.deepEqual(s.blockers.map((b) => b.text), ['waits for E-01/F-01/S-02 The second slice']);
  fx.clean();
});

test('a story is in the facts once, under its own key, and its parents only name it', () => {
  const fx = tree();
  const work = JSON.parse(JSON.stringify(readWork(fx.root)));
  assert.equal(JSON.stringify(work).split('"The second slice"').length - 1, 1, 'no second copy of a story to keep in step');
  assert.deepEqual(work.features[0].storyKeys, work.stories.map((s) => s.key));
  assert.deepEqual(work.epics[0].featureKeys, work.features.map((f) => f.key));
  fx.clean();
});

test('an epic written the old flat way is named as the wrong shape, not read as nothing', () => {
  const fx = tree({ 'docs/work/EPIC.md': EPIC });
  const work = readWork(fx.root);
  const problem = work.problems.find((p) => p.kind === 'shape');
  assert.match(problem.text, /an epic is a folder: move docs\/work\/EPIC.md into docs\/work\/E-01-<slug>\/epic.md/);
  assert.deepEqual(work.epics.map((e) => e.key), ['E-01'], 'the tree that is in the right shape is still read');
  fx.clean();
});

test('a dependency on a story that is done blocks nothing, and a done story reports no blockers', () => {
  const fx = tree({ 'docs/work/E-01-picture/F-01-reading/S-03-third.md': story({ id: 'S-03', depends: 'S-01' }) });
  const work = readWork(fx.root);
  assert.deepEqual(storyOf(work, 'E-01/F-01/S-03').blockers, [], 'S-01 is done');
  assert.deepEqual(storyOf(work, 'E-01/F-01/S-01').blockers, []);
  fx.clean();
});

test('review verdicts are read per role, and a no is a blocker', () => {
  const fx = tree({
    'docs/work/E-01-picture/F-01-reading/S-02-second.md': story({
      id: 'S-02', tech: 'approved 2026-08-24, reads clean', func: 'not approved 2026-08-24, the report lies about counts', arch: 'pending',
    }),
  });
  const s = storyOf(readWork(fx.root), 'E-01/F-01/S-02');
  assert.deepEqual(s.verdicts.map((v) => v.state), ['approved', 'rejected', 'pending']);
  assert.equal(s.verdicts[0].date, '2026-08-24');
  assert.equal(s.verdicts[0].reason, 'reads clean');
  assert.deepEqual(s.blockers.map((b) => b.text), ['Functional did not approve: the report lies about counts']);
  fx.clean();
});

test('a verdict without a date is not a verdict yet, and the line is kept', () => {
  const fx = tree({ 'docs/work/E-01-picture/F-01-reading/S-02-second.md': story({ id: 'S-02', tech: 'approved' }) });
  const s = storyOf(readWork(fx.root), 'E-01/F-01/S-02');
  assert.equal(s.verdicts[0].state, 'missing');
  assert.equal(s.verdicts[0].reason, 'approved');
  assert.deepEqual(s.blockers, [], 'a verdict that is not there is not a no');
  fx.clean();
});

// ---------------------------------------------------------------- degrading, never crashing

test('no docs/work at all reads as no work yet', () => {
  const fx = fixture({ 'README.md': 'a project without a work tree' });
  const work = readWork(fx.root);
  assert.equal(work.present, false);
  assert.deepEqual(work.epics, []);
  assert.deepEqual(work.counts.stories, { done: 0, total: 0 });
  assert.deepEqual(work.problems, []);
  fx.clean();
});

test('an epic folder without an epic file is reported, and what hangs under it is still read', () => {
  const fx = tree();
  rmSync(`${fx.root}/docs/work/E-01-picture/epic.md`);
  const work = readWork(fx.root);
  assert.equal(work.present, true);
  assert.equal(work.epics[0].title, 'E-01', 'an epic with no file falls back to its id');
  assert.equal(work.epics[0].goal, null);
  assert.equal(work.problems.filter((p) => p.kind === 'epic').length, 1);
  assert.equal(work.stories.length, 2, 'the features and stories under it are read anyway');
  fx.clean();
});

test('a feature folder without a feature file is reported, and its stories are still read', () => {
  const fx = tree({ 'docs/work/E-01-picture/F-02-nameless/S-01-first.md': story({ id: 'S-01' }) });
  const work = readWork(fx.root);
  const problem = work.problems.find((p) => p.kind === 'feature');
  assert.match(problem.text, /E-01\/F-02 has no feature.md/);
  assert.equal(problem.path, 'docs/work/E-01-picture/F-02-nameless');
  assert.equal(storyOf(work, 'E-01/F-02/S-01').title, 'The first slice');
  fx.clean();
});

test('a status that is no lane is reported with its path, and lands in no lane', () => {
  const fx = tree({ 'docs/work/E-01-picture/F-01-reading/S-02-second.md': story({ id: 'S-02', status: 'nearly there' }) });
  const work = readWork(fx.root);
  const s = storyOf(work, 'E-01/F-01/S-02');
  assert.equal(s.lane, null);
  assert.equal(s.done, false);
  assert.equal(s.statusText, 'nearly there');
  assert.equal(work.counts.unreadable, 1);
  const problem = work.problems.find((p) => p.kind === 'status');
  assert.match(problem.text, /E-01\/F-01\/S-02 has no readable status \("nearly there"\)/);
  assert.equal(problem.path, 'docs/work/E-01-picture/F-01-reading/S-02-second.md');
  assert.equal(Object.values(work.counts.lanes).reduce((a, b) => a + b, 0), 1, 'it is not silently counted in a lane');
  fx.clean();
});

test('a story file with nothing in it is read as an empty story, not as a crash', () => {
  const fx = tree({ 'docs/work/E-01-picture/F-01-reading/S-03-third.md': '' });
  const work = readWork(fx.root);
  const s = storyOf(work, 'E-01/F-01/S-03');
  assert.equal(s.title, 'S-03');
  assert.equal(s.lane, null);
  assert.equal(s.ready.ok, false);
  assert.equal(s.ready.missing.length, 6);
  fx.clean();
});

test('a file that is no story and a folder that is no epic or feature are ignored', () => {
  const fx = tree({ 'docs/work/E-01-picture/NOTES.md': 'loose notes', 'docs/work/scratch/F-01-x/S-01-first.md': story(), 'docs/work/E-01-picture/F-01-reading/notes.md': 'more notes' });
  const work = readWork(fx.root);
  assert.deepEqual(work.features.map((f) => f.key), ['E-01/F-01']);
  assert.equal(work.stories.length, 2);
  fx.clean();
});

// ---------------------------------------------------------------- the report

test('the report says the counts, the lane and what is missing, and says so when there is nothing', () => {
  const fx = tree();
  const text = render(readWork(fx.root));
  assert.match(text, /E-01 One picture \(open\) - 0 of 1 features done/);
  assert.match(text, /0 of 1 epics done, 0 of 1 features done, 1 of 2 stories done/);
  assert.match(text, /S-02 The second slice/);
  assert.match(text, /in progress · ready · tasks 1 of 3/);
  const empty = fixture({ 'README.md': 'nothing here' });
  assert.match(render(readWork(empty.root)), /No docs\/work\/ yet/);
  fx.clean();
  empty.clean();
});

// ---------------------------------------------------------------- the small parsers

test('the parsers read what they promise and nothing else', () => {
  assert.equal(field('- **Status:** done · **Size:** M', 'Status'), 'done');
  assert.equal(field('- **Status:** done · **Size:** M', 'Size'), 'M');
  assert.equal(field('- **Vision.** Serves the goal.', 'Vision'), 'Serves the goal.');
  assert.equal(field('**Status:** not on a bullet', 'Status'), '', 'a field lives on a bullet line');
  assert.equal(field('- **Size:** M', 'Status'), '');
  assert.equal(section('## A\n\none\n\n## B\n\ntwo', /^## A/), 'one');
  assert.equal(section('## A\n\none\n\n### A2\n\ndeeper\n\n## B\n\ntwo', /^## A$/), 'one\n\n### A2\n\ndeeper');
  assert.equal(section('## A\n\none', /^## C/), null);
  assert.deepEqual(numbered('1. [x] one\n2. two\n   still two'), [{ nr: 1, text: 'one', done: true }, { nr: 2, text: 'two still two', done: false }]);
  assert.deepEqual(taskList('- [x] a\n- [ ] b').items.map((i) => i.state), ['done', 'open']);
  assert.deepEqual(verdicts('## Review\n\n- Technical: pending').map((v) => v.state), ['pending', 'missing', 'missing']);
});
