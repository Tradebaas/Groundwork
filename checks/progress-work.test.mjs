#!/usr/bin/env node
// Self-test for the half of checks/progress.mjs that counts a project from docs/work/: which
// source it chooses, what a feature's state is derived from, and what the report then says in
// both languages. The tree itself is read by checks/work.mjs and proven in its own suite; this
// file never re-proves the parsing.
// Run: node --test checks/progress-work.test.mjs

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fixture } from './cockpit-fixture.mjs';
import { derive, readProject } from './progress.mjs';
import { renderFull, renderLine, warningText, WORDS } from './progress-report.mjs';

const BRIEF = (items) => `# BRIEF

## Product

- **Name:** Kassaboek

## In scope

${items}
`;

// A project that plans its work in docs/work/ is counted from there and not from the brief's
// scope list (decision 0021). The tree itself is read by checks/work.mjs and proven in its own
// suite; what is proven here is the choice of source, and what the report then says.

const EPIC_FILE = `# EPIC: The round

- **Status:** open · **Rests on:** decision 0021

## The goal

One picture.
`;

const featureFile = (title) => `# F: ${title}

- **Epic:** The round · **Status:** refinement · **Size:** M

- **What you can do after it.** Something worth having.
- **Vision.** Serves the first choice.
`;

const storyFile = (status) => `# S-01: A slice

- **Feature:** F-01 · **Status:** ${status} · **Size:** M
- **Depends on:** none · **Owner sign-off:** 2026-08-24

## Value

A slice worth building.

## Acceptance

1. It works.

## Tasks

- [ ] Build it

## Review

- Technical: pending
`;

// One epic, one feature, one story in the lane the case is about.
function workProject(status, extra = {}) {
  return fixture({
    'docs/product/BRIEF.md': BRIEF('- SC-1 the brief still says something\n- SC-2 and something else'),
    'docs/work/E-01-round/epic.md': EPIC_FILE,
    'docs/work/E-01-round/F-01-first/feature.md': featureFile('The first feature'),
    'docs/work/E-01-round/F-01-first/S-01-slice.md': storyFile(status),
    ...extra,
  });
}

test('a project with a work tree is counted from it, and one without is counted from the brief', () => {
  const withWork = workProject('in progress');
  const p1 = readProject(withWork.root);
  const d1 = derive(p1);
  assert.equal(d1.source, 'work');
  assert.deepEqual(d1.items.map((i) => i.title), ['The first feature'], 'the features are the items');
  assert.deepEqual([d1.done, d1.total], [0, 1]);
  assert.deepEqual(d1.stories, { done: 0, total: 1 });
  assert.equal(p1.scopeItems.length, 2, 'the brief is still read for everything else');

  const briefOnly = fixture({ 'docs/product/BRIEF.md': BRIEF('- SC-1 one thing\n- SC-2 another') });
  const d2 = derive(readProject(briefOnly.root));
  assert.equal(d2.source, 'brief');
  assert.deepEqual([d2.done, d2.total], [0, 2]);
  withWork.clean();
  briefOnly.clean();
});

test('an empty work folder is not a work tree, so the brief still answers', () => {
  const fx = fixture({
    'docs/product/BRIEF.md': BRIEF('- SC-1 one thing'),
    'docs/work/README.md': 'nothing planned here yet',
  });
  const d = derive(readProject(fx.root));
  assert.equal(d.source, 'brief');
  assert.deepEqual([d.done, d.total], [0, 1]);
  fx.clean();
});

test('a feature is done, being worked on, or not started, from the stories under it', () => {
  for (const [status, state] of [['backlog', 'todo'], ['refinement', 'todo'], ['to do', 'todo'],
    ['in progress', 'doing'], ['review', 'doing'], ['done', 'done']]) {
    const fx = workProject(status);
    const d = derive(readProject(fx.root));
    assert.equal(d.items[0].state, state, `a story in ${status} makes its feature ${state}`);
  fx.clean();
  }
});

test('a feature with one story finished and one still open is being worked on', () => {
  const fx = workProject('done', {
    'docs/work/E-01-round/F-01-first/S-02-other.md': storyFile('backlog').replace('S-01', 'S-02'),
  });
  const d = derive(readProject(fx.root));
  assert.equal(d.items[0].state, 'doing');
  assert.deepEqual(d.stories, { done: 1, total: 2 });
  fx.clean();
});

test('with more than one epic, a feature says which one it belongs to', () => {
  const fx = workProject('done', {
    'docs/work/E-02-later/epic.md': EPIC_FILE.replace('The round', 'The later round'),
    'docs/work/E-02-later/F-01-first/feature.md': featureFile('Its own first feature'),
  });
  const d = derive(readProject(fx.root));
  assert.deepEqual(d.items.map((i) => i.title), ['The round: The first feature', 'The later round: Its own first feature']);
  assert.deepEqual(d.epics, { done: 1, total: 2 });
  fx.clean();
});

test('the report and the one-line nudge say the work numbers, in the project language', () => {
  const fx = workProject('in progress');
  const project = readProject(fx.root);
  const progress = derive(project);
  const full = renderFull(project, progress);
  assert.match(full, /0 of the 1 features are done, 0 of 1 stories\./);
  assert.match(full, /The first feature/);
  assert.match(renderLine(project, progress), /0 of 1 features, 0 of 1 stories done/);

  const dutch = renderFull({ ...project, lang: 'nl' }, progress);
  assert.match(dutch, /0 van de 1 features zijn klaar, 0 van de 1 stories\./);
  fx.clean();
});

test('a work tree with no feature in it says so, in its own words, not the brief\'s', () => {
  const fx = fixture({
    'docs/product/BRIEF.md': BRIEF('- SC-1 one thing'),
    'docs/work/E-01-round/epic.md': EPIC_FILE,
  });
  const project = readProject(fx.root);
  const progress = derive(project);
  assert.equal(progress.source, 'work');
  assert.equal(progress.defined, false);
  assert.match(renderFull(project, progress), /No work is planned yet/);
  assert.match(renderFull({ ...project, lang: 'nl' }, progress), /Er is nog geen werk gepland/);
  fx.clean();
});

test('what the reader could not read becomes the heads-up, said once in English and once in Dutch', () => {
  const fx = workProject('nearly there');
  const project = readProject(fx.root);
  const progress = derive(project);
  assert.equal(progress.warnings.length, 1);
  assert.equal(progress.warnings[0].kind, 'work');
  assert.match(warningText(WORDS.en, progress.warnings[0]), /E-01\/F-01\/S-01 has no readable status/);
  assert.match(warningText(WORDS.nl, progress.warnings[0]), /E-01\/F-01\/S-01 heeft geen leesbare status/);
  assert.match(renderFull(project, progress), /Heads up:/);
  assert.match(renderLine(project, progress), /⚠/);
  fx.clean();
});
