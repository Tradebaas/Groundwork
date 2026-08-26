#!/usr/bin/env node
// Self-test for the board: the header, the lanes, the cards, the sidebar the documents hang in
// and the front door (checks/board-page.mjs, checks/board-nav.mjs and checks/shelves.mjs, plus the
// routes in checks/board-server.mjs that reach them). What is proven here is that the page is a pure function of what is on disk - move one
// status line and the card moves, add one document and it appears on a shelf, with no other edit -
// and that a card says everything a person needs and nothing they do not.
// The lines under the shelves are proven in checks/board-strip.test.mjs, the file page and
// the server's own answers in checks/board-server.test.mjs, and what may be opened at all in
// checks/board-path.test.mjs.
// Run: node --test checks/board.test.mjs

import { writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  fixture, project, BRIEF, EPIC, FEATURE, STORY,
  visible, idChip, laneOf,
} from './board-fixture.mjs';
import { boardPage, startPage, WIP } from './board-page.mjs';
import { card } from './board-shell.mjs';

// ---------------------------------------------------------------- the lanes

test('every story stands in the lane its own status line puts it in, and in no other', () => {
  const f = project({
    'S-01-a': STORY('S-01', 'Waiting to be picked up', { status: 'backlog' }),
    'S-02-b': STORY('S-02', 'Being sharpened', { status: 'refinement' }),
    'S-03-c': STORY('S-03', 'Ready to build', { status: 'to do' }),
    'S-04-d': STORY('S-04', 'Under the hands', { status: 'in progress' }),
    'S-05-e': STORY('S-05', 'Being looked at', { status: 'review' }),
    'S-06-f': STORY('S-06', 'Finished', { status: 'done' }),
  });
  const html = boardPage(f.root);
  const where = [['Backlog', 'S-01'], ['Refinement', 'S-02'], ['To do', 'S-03'],
    ['In progress', 'S-04'], ['Review', 'S-05'], ['Done', 'S-06']];
  for (const [name, id] of where) {
    const lane = laneOf(html, name);
    assert.match(lane, idChip(id), `${id} belongs in ${name}`);
    // The other direction: no lane holds a card that is not its own.
    for (const [other, stranger] of where) {
      if (other === name) continue;
      assert.doesNotMatch(lane, idChip(stranger), `${stranger} is not in ${name}`);
    }
  }
  f.clean();
});

test('the lanes open and close as the owner settled', () => {
  const f = project(Object.fromEntries(
    ['backlog', 'refinement', 'to do', 'in progress', 'review', 'done']
      .map((lane, i) => [`S-0${i + 1}-x`, STORY(`S-0${i + 1}`, `Card ${i + 1}`, { status: lane })]),
  ));
  const html = boardPage(f.root);
  for (const name of ['To do', 'In progress', 'Review']) {
    assert.match(laneOf(html, name), /<details open>/, `${name} stands open`);
  }
  for (const name of ['Backlog', 'Refinement', 'Done']) {
    const lane = laneOf(html, name);
    assert.match(lane, /<details>/, `${name} is folded`);
    assert.doesNotMatch(lane, /<details open>/, `${name} is not open`);
  }
  f.clean();
});

test('a lane with nothing in it says so instead of standing empty', () => {
  const f = project({ 'S-01-a': STORY('S-01', 'The only card', { status: 'to do' }) });
  const lane = laneOf(boardPage(f.root), 'Review');
  assert.match(visible(lane), /Nothing here/);
  assert.doesNotMatch(lane, /<article/);
  f.clean();
});

// ---------------------------------------------------------------- the cards

test('a card carries what a person needs to decide whether to act on it', () => {
  const f = project({
    'S-01-dep': STORY('S-01', 'Not finished yet', { status: 'in progress' }),
    'S-02-mark': STORY('S-02', 'The one with everything', {
      status: 'review',
      size: 'L',
      value: 'The whole reason this card exists.',
      depends: 'S-01',
      signOff: 'not yet',
      tasks: ['- [x] one', '- [x] two', '- [ ] three', '- [ ] four'],
      review: ['pending', 'not approved, 2026-08-24, the totals do not add up', 'pending'],
    }),
  });
  const card = laneOf(boardPage(f.root), 'Review');
  const text = visible(card);
  assert.match(text, /The one with everything/);
  assert.match(text, /The till/, 'its feature is named');
  assert.match(card, /<span class="chip size"><span class="vh">Size <\/span>L<\/span>/, 'its size is on it, and says what the letter means');
  assert.match(text, /The whole reason this card exists/, 'what it is worth');
  assert.match(text, /tasks 2 of 4/, 'how far its tasks got');
  assert.match(card, /<i style="width:50%">/, 'and the same number as a bar');
  assert.match(text, /Still missing: the owner/, 'what readiness it misses');
  assert.match(text, /waits for E-01\/F-01\/S-01 Not finished yet/, 'what is blocking it');
  assert.match(text, /Functional did not approve: the totals do not add up/, 'which verdict said no');
  assert.match(text, /S-02-mark\.md/, 'and the file that owns all of it');
  f.clean();
});

test('a card with nothing wrong says nothing extra', () => {
  const f = project({
    'S-01-clean': STORY('S-01', 'Nothing wrong with it', {
      status: 'to do', tasks: ['- [x] one', '- [x] two'],
    }),
  });
  const card = laneOf(boardPage(f.root), 'To do');
  assert.match(visible(card), /Nothing wrong with it/);
  assert.match(visible(card), /tasks 2 of 2/);
  assert.doesNotMatch(visible(card), /Still missing/);
  assert.doesNotMatch(card, /marks block/);
  f.clean();
});

test('a finished card is not scolded for readiness it no longer needs', () => {
  const f = project({
    'S-01-old': STORY('S-01', 'Shipped long ago', { status: 'done', signOff: 'not yet' }),
  });
  const done = laneOf(boardPage(f.root), 'Done');
  assert.match(visible(done), /Shipped long ago/);
  assert.doesNotMatch(visible(done), /Still missing/);
  f.clean();
});

test('nothing in a story file can execute as markup', () => {
  const f = project({
    'S-01-x': STORY('S-01', '<script>alert(1)</script>', { value: '<img src=x onerror=alert(2)>' }),
  });
  const html = boardPage(f.root);
  assert.doesNotMatch(html, /<script>/);
  assert.doesNotMatch(html, /<img src=x/);
  assert.match(html, /&lt;script&gt;/);
  f.clean();
});

// ---------------------------------------------------------------- the rule that is shown

test('the work-in-progress numbers are shown, and the board refuses nothing', () => {
  const f = project({
    'S-01-a': STORY('S-01', 'One too many', { status: 'in progress' }),
    'S-02-b': STORY('S-02', 'And the other', { status: 'in progress' }),
  });
  const lane = laneOf(boardPage(f.root), 'In progress');
  assert.equal(WIP['in progress'], 1);
  // Redrawn for S-07: the lane says its limit and its count as two marks in the summary rather
  // than as one sentence, so a folded lane can still show both down its edge. Both numbers are
  // asserted, which is the whole of what the sentence carried.
  assert.match(lane, /<span class="wip">1 allowed<\/span>/, 'the limit the rule sets');
  assert.match(lane, /<span class="count">2<\/span>/, 'and what the lane actually holds');
  // Over the limit is stated, never enforced: both cards are still on the board.
  assert.match(lane, idChip('S-01'));
  assert.match(lane, idChip('S-02'));
  f.clean();
});

test('a lane the rule says nothing about shows its count and no limit', () => {
  const f = project({ 'S-01-a': STORY('S-01', 'Just a card', { status: 'backlog' }) });
  const lane = laneOf(boardPage(f.root), 'Backlog');
  assert.match(lane, /<span class="count">1<\/span>/, 'the count is always there');
  assert.doesNotMatch(lane, /class="wip"/, 'and no limit is invented for a lane that has none');
  assert.doesNotMatch(visible(lane), /allowed/);
  f.clean();
});

// ---------------------------------------------------------------- more than one round

test('an epic that is not in flight is listed with its progress and stays folded', () => {
  const f = project({ 'S-01-now': STORY('S-01', 'The round we are in', { status: 'to do' }) }, {
    'docs/work/E-00-phase-zero/epic.md': EPIC('Phase zero'),
    'docs/work/E-00-phase-zero/F-01-pilot/feature.md': FEATURE('The pilot'),
    'docs/work/E-00-phase-zero/F-01-pilot/S-01-shipped.md': STORY('S-01', 'Shipped in phase zero', { status: 'done' }),
  });
  const html = boardPage(f.root);
  const text = visible(html);
  // The finished round is named with its own progress, and does not take the page.
  assert.match(text, /Other epics/);
  assert.match(text, /Phase zero - 1 of 1 features done/);
  assert.match(html, /<summary>Other epics <span class="count">1<\/span><\/summary>/);
  assert.doesNotMatch(html, /<details open><summary>Other epics/);
  // Its stories stay in their own round: the lanes are the round in flight.
  assert.doesNotMatch(text, /Shipped in phase zero/);
  assert.match(visible(laneOf(html, 'To do')), /The round we are in/);
  f.clean();
});

test('a project with one round says nothing about other rounds', () => {
  const f = project({ 'S-01-a': STORY('S-01', 'The only round', { status: 'to do' }) });
  assert.doesNotMatch(visible(boardPage(f.root)), /Other epics/);
  f.clean();
});

test('a card that cannot be built names its failure, and the rest of the board still holds', () => {
  const html = card('Progress', { lang: 'en', path: 'docs/product/BRIEF.md' }, () => {
    throw new Error('the brief could not be read');
  });
  assert.match(visible(html), /could not be built: the brief could not be read/);
  assert.match(visible(html), /The rest still holds/);
  // A card names its owning file either way, and here nothing said the file may be opened.
  assert.match(visible(html), /From docs\/product\/BRIEF\.md/);
  assert.doesNotMatch(html, /<a /);
});

// ---------------------------------------------------------------- the empty copy

test('a copy that has planned nothing reads as not started, never as an error', () => {
  const f = fixture({ 'docs/product/BRIEF.md': BRIEF });
  const html = boardPage(f.root);
  // The sentence is the one the terminal report gives the same project: a brief with nothing in
  // scope is missing its scope, and being told to cut an epic first would be the wrong step.
  assert.match(visible(html), /Scope is not defined yet/);
  assert.doesNotMatch(html, /<section class="lane[ "]/);
  f.clean();
});

test('scope written down but no work tree yet names the step that is missing', () => {
  const f = fixture({
    'docs/product/BRIEF.md': `${BRIEF}\n## In scope\n\n- SC-1 import receipts with the camera\n`,
  });
  const text = visible(boardPage(f.root));
  assert.match(text, /0 of the 1 things are done/, 'the stand is still counted');
  assert.match(text, /No work is planned yet.*Cut the epic into features and stories/);
  f.clean();
});

test('an epic with no stories yet says so instead of showing six empty lanes', () => {
  const f = fixture({
    'docs/product/BRIEF.md': BRIEF,
    'docs/work/E-01-shop/epic.md': EPIC('A shop that sells'),
    'docs/work/E-01-shop/F-01-till/feature.md': FEATURE('The till'),
  });
  const html = boardPage(f.root);
  assert.match(visible(html), /not cut into stories yet/);
  assert.doesNotMatch(html, /<section class="lane[ "]/);
  f.clean();
});

// ---------------------------------------------------------------- the header

test('the header answers how far the project is, and what happens next', () => {
  const f = project({
    'S-01-a': STORY('S-01', 'Finished', { status: 'done' }),
    'S-02-b': STORY('S-02', 'Not finished', { status: 'to do' }),
  }, { 'docs/state/STATE.md': '# STATE\n\n- **Now ▶** finish the till.\n' });
  const text = visible(boardPage(f.root));
  assert.match(text, /Epic in flight A shop that sells/);
  assert.match(text, /A shop that sells in one round/, 'the goal, from the epic file');
  assert.match(text, /0 of the 1 features are done, 1 of 2 stories/);
  assert.match(text, /Next step finish the till/);
  // Nothing internal reaches a reader: no SC-id, no status word, no script anywhere.
  assert.doesNotMatch(text, /SC-\d|refinement/);
  assert.doesNotMatch(boardPage(f.root), /<script|onload=|javascript:/i);
  f.clean();
});

test('what the reader could not place is said in the header, not swallowed by a lane', () => {
  const f = project({ 'S-01-a': STORY('S-01', 'Nowhere to stand', { status: 'somewhere else' }) });
  const html = boardPage(f.root);
  assert.match(visible(html), /has no readable status/);
  // A story in no lane is on no lane, and the heads-up is the only place it is reported.
  for (const name of ['Backlog', 'Refinement', 'To do', 'In progress', 'Review', 'Done']) {
    assert.doesNotMatch(laneOf(html, name), idChip('S-01'));
  }
  f.clean();
});

// ---------------------------------------------------------------- nothing is stored

test('moving one status line moves the card, with no other edit', () => {
  const f = project({ 'S-01-a': STORY('S-01', 'The travelling card', { status: 'to do' }) });
  const file = join(f.root, 'docs/work/E-01-shop/F-01-till/S-01-a.md');
  assert.match(laneOf(boardPage(f.root), 'To do'), /The travelling card/);

  const before = readFileSync(file, 'utf8');
  writeFileSync(file, before.replace('**Status:** to do', '**Status:** in progress'));
  const after = boardPage(f.root);
  assert.match(laneOf(after, 'In progress'), /The travelling card/);
  assert.doesNotMatch(laneOf(after, 'To do'), /The travelling card/);
  // The count moved with it, because it was never written down anywhere to move.
  assert.match(laneOf(after, 'In progress'), /<span class="count">1<\/span>/);
  assert.match(laneOf(after, 'To do'), /<span class="count">0<\/span>/);
  f.clean();
});

// ---------------------------------------------------------------- the four shelves

// ---------------------------------------------------------------- the header

test('the header says what the project is for, and what it is deliberately not', () => {
  const f = project({ 'S-01-a': STORY('S-01', 'A card', { status: 'to do' }) }, {
    'docs/product/BRIEF.md': `${BRIEF}
- **One sentence:** Kassaboek turns a shoebox of receipts into a monthly overview.

## Out of scope

- payroll
- a second currency
`,
  });
  const html = boardPage(f.root);
  const text = visible(html);
  assert.match(text, /What this project is for Kassaboek turns a shoebox of receipts/);
  assert.match(html, /<summary>Deliberately not part of this <span class="count">2<\/span>/);
  assert.match(text, /payroll/);
  // Beside the epic's own goal, not instead of it.
  assert.match(text, /A shop that sells in one round/);
  assert.match(html, /<a href="\/file\?path=docs%2Fproduct%2FBRIEF\.md">/, 'and the brief it came from opens');
  f.clean();
});

test('a brief with no goal, or no boundary, says which is missing instead of showing nothing', () => {
  const bare = project({ 'S-01-a': STORY('S-01', 'A card', { status: 'to do' }) });
  assert.match(visible(boardPage(bare.root)), /does not say yet what this project is for.*scope skill/);
  bare.clean();

  const noBoundary = project({ 'S-01-a': STORY('S-01', 'A card', { status: 'to do' }) }, {
    'docs/product/BRIEF.md': `${BRIEF}\n- **One sentence:** One sentence, no boundary.\n`,
  });
  const text = visible(boardPage(noBoundary.root));
  assert.match(text, /One sentence, no boundary/);
  assert.match(text, /names nothing as out of scope yet/);
  noBoundary.clean();
});

test('the framing words follow the project language', () => {
  const f = project({ 'S-01-a': STORY('S-01', 'Een kaart', { status: 'to do' }) }, {
    'docs/design/VOICE.md': '# VOICE\n\n- **Product language:** Nederlands\n',
  });
  const html = startPage(f.root);
  const text = visible(html);
  assert.match(text, /Waar dit project voor is/);
  // The sidebar speaks it too, in its own name for itself and in the subjects under it. The
  // chapters a project has depend on what is in its docs/, so the one asserted here is the one
  // this fixture's brief puts there.
  assert.match(html, /aria-label="Dit project"/, 'the sidebar names itself in it');
  assert.match(text, /Waarom we het bouwen/, 'and so do the subjects under it');
  assert.match(text, /Bord/, 'and the destinations beside them');
  assert.match(text, /poorten op deze machine staan scherp/, 'and so do the lines under them');
  f.clean();
});

// ---------------------------------------------------------------- the empty copy

// ---------------------------------------------------------------- the routes

