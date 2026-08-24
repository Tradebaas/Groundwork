#!/usr/bin/env node
// Self-test for the board: the header, the lanes, the cards, the four shelves and the front door
// (checks/board-page.mjs and checks/shelves.mjs, plus the routes in checks/cockpit.mjs that reach
// them). What is proven here is that the page is a pure function of what is on disk - move one
// status line and the card moves, add one document and it appears on a shelf, with no other edit -
// and that a card says everything a person needs and nothing they do not.
// The two lines under the shelves are proven in checks/board-strip.test.mjs, the file page and
// the server's own answers in checks/cockpit.test.mjs, and what may be opened at all in
// checks/cockpit-path.test.mjs.
// Run: node --test checks/board.test.mjs

import { execFileSync } from 'node:child_process';
import { writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  fixture, project, BRIEF, EPIC, FEATURE, STORY,
  visible, idChip, laneOf, shelfOf, get, listen,
} from './cockpit-fixture.mjs';
import { boardPage, WIP } from './board-page.mjs';
import { card } from './board-shell.mjs';
import { shelfFor, SHELVES, OTHER } from './shelves.mjs';
import { createBoardServer } from './cockpit.mjs';

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
  assert.match(visible(lane), /2 of 1 allowed/);
  // Over the limit is stated, never enforced: both cards are still on the board.
  assert.match(lane, idChip('S-01'));
  assert.match(lane, idChip('S-02'));
  f.clean();
});

test('a lane the rule says nothing about shows its count and no limit', () => {
  const f = project({ 'S-01-a': STORY('S-01', 'Just a card', { status: 'backlog' }) });
  const lane = laneOf(boardPage(f.root), 'Backlog');
  assert.match(lane, /<span class="wip">1<\/span>/);
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
  assert.doesNotMatch(html, /<section class="lane">/);
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
  assert.doesNotMatch(html, /<section class="lane">/);
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
  assert.match(visible(laneOf(after, 'In progress')), /1 of 1 allowed/);
  f.clean();
});

// ---------------------------------------------------------------- the four shelves

// A manifest with one literal row and one pattern row, which is the pair criterion 3 is about.
const MANIFEST = `# docs

| File | Tier | What it owns |
|---|---|---|
| \`product/VISION.md\` | LIVE | Purpose: mission, vision, who it serves |
| \`decisions/[0-9]*.md\` ◆ | REF | Decision records, numbered |
`;

test('a document stands on the shelf its path puts it on, and one the rule does not know is named anyway', () => {
  const f = project({ 'S-01-a': STORY('S-01', 'A card', { status: 'to do' }) });
  // Nothing but the two files changes between the two renders.
  assert.doesNotMatch(visible(boardPage(f.root)), /VISION\.md|handy\.md/);
  f.put('docs/product/VISION.md', '# VISION\n');
  f.put('docs/tools/handy.md', '# A folder the rule never heard of\n');
  const html = boardPage(f.root);

  assert.match(shelfOf(html, 'why'), /product\/VISION\.md/, 'a path the rule knows lands on its shelf');
  assert.match(shelfOf(html, OTHER), /tools\/handy\.md/, 'a path it does not know lands on the named one');
  // The other direction: neither document is anywhere else on the page.
  assert.doesNotMatch(shelfOf(html, OTHER), /VISION\.md/);
  for (const key of SHELVES) assert.doesNotMatch(shelfOf(html, key), /handy\.md/);
  // The catch-all says why it exists, rather than reading as a filing mistake.
  assert.match(visible(shelfOf(html, OTHER)), /folder the shelf rule does not know/);
  f.clean();
});

test('the shelf rule answers on its own: a path in, a shelf out', () => {
  assert.equal(shelfFor('docs/product/BRIEF.md'), 'why');
  assert.equal(shelfFor('docs/work/E-01-shop/F-01-till/S-01-a.md'), 'now');
  assert.equal(shelfFor('docs/standards/GLOBAL.md'), 'built');
  assert.equal(shelfFor('docs/decisions/0021-agile-first.md'), 'learned');
  // The narrower row wins over the folder it sits inside, in both directions.
  assert.equal(shelfFor('docs/product/ARCHITECTURE.md'), 'built');
  assert.equal(shelfFor('docs/specs/archive/000-baseline/spec.md'), 'learned');
  assert.equal(shelfFor('docs/specs/010-cockpit.md'), 'now');
  assert.equal(shelfFor('docs/tools/handy.md'), OTHER);
  // A file that is no project document at all stands on no shelf, and says so.
  assert.equal(shelfFor('checks/links.mjs'), null);
  assert.equal(shelfFor(null), null);
});

test('a row says what its document owns in the manifest own words, pattern rows included', () => {
  const f = project({ 'S-01-a': STORY('S-01', 'A card', { status: 'to do' }) }, {
    'docs/README.md': MANIFEST,
    'docs/product/VISION.md': '# VISION\n',
    'docs/decisions/0001-first.md': '# 0001\n',
    'docs/decisions/0002-second.md': '# 0002\n',
  });
  const html = boardPage(f.root);
  assert.match(visible(shelfOf(html, 'why')), /product\/VISION\.md - Purpose: mission, vision, who it serves/);
  // One pattern row stands for many files, and every one of them carries that row's sentence.
  const learned = visible(shelfOf(html, 'learned'));
  assert.match(learned, /decisions\/0001-first\.md - Decision records, numbered/);
  assert.match(learned, /decisions\/0002-second\.md - Decision records, numbered/);
  // The rows are the files, never the manifest row itself: a pattern opens nothing.
  assert.doesNotMatch(learned, /\[0-9\]/);
  // A document no row covers is named and says nothing further.
  assert.match(visible(shelfOf(html, 'now')), /work\/E-01-shop\/epic\.md/);
  f.clean();
});

test('a document the project keeps out of git is named on its shelf, and not linked', () => {
  const f = project({ 'S-01-a': STORY('S-01', 'A card', { status: 'to do' }) }, {
    '.gitignore': '*.local.md\n',
    'docs/state/STATE.local.md': '# STATE\n\n- **Now ▶** finish the till\n',
    'docs/state/DEBT.md': '# DEBT\n',
  });
  execFileSync('git', ['init', '-q'], { cwd: f.root, stdio: 'ignore' });
  const html = boardPage(f.root);
  const now = shelfOf(html, 'now');
  assert.match(visible(now), /state\/STATE\.local\.md/, 'it is named');
  assert.doesNotMatch(now, /href="[^"]*STATE\.local/, 'and it is not a door that does not open');
  // Its neighbour is tracked, so that one does open: the rule is git's answer, not the folder.
  assert.match(now, /<a href="\/file\?path=docs%2Fstate%2FDEBT\.md">/);
  // The handoff it holds is still read, and still the next step on the board.
  assert.match(visible(html), /Next step finish the till/);
  f.clean();
});

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
  const text = visible(boardPage(f.root));
  assert.match(text, /Waar dit project voor is/);
  assert.match(text, /Wat we nu bouwen/, 'the shelves speak it too');
  assert.match(text, /poorten op deze machine staan scherp/, 'and so do the two lines');
  f.clean();
});

// ---------------------------------------------------------------- the empty copy

test('a copy with no manifest, no brief and no work tree still shows four shelves', () => {
  const f = fixture({});
  const html = boardPage(f.root);
  const text = visible(html);
  // Not started, never an error: every shelf is named and says it holds nothing.
  for (const key of SHELVES) {
    assert.match(visible(shelfOf(html, key)), /No document here yet/, `the ${key} shelf stands`);
    assert.match(shelfOf(html, key), /<span class="wip">0<\/span>/);
  }
  // The catch-all only appears when it holds something, so an empty copy has exactly four.
  assert.equal(html.split('<section class="shelf"').length - 1, SHELVES.length);
  assert.match(text, /Scope is not defined yet/);
  // A zero would read as progress on undecided scope, so none is shown; the next step still
  // names the skill that writes one.
  assert.doesNotMatch(text, /0 of the \d+ things/);
  assert.match(text, /names no next step.*checkpoint skill/);
  assert.doesNotMatch(html, /<section class="lane">/);
  f.clean();
});

test('a docs folder that cannot be read is named on the page, never shown as empty shelves', () => {
  // A name that is no folder at all is the portable stand-in for a folder that cannot be read:
  // both leave readdir throwing something other than "it is not there".
  const f = fixture({ docs: 'this is a file where a folder should be\n' });
  const html = boardPage(f.root);
  assert.match(visible(html), /could not be built:/);
  assert.match(visible(html), /The rest still holds/);
  // A silent empty shelf would read as a project with no documents, which is the lie this
  // catches. The rest of the board is still there.
  assert.doesNotMatch(html, /<section class="shelf"/);
  assert.match(visible(html), /What this project is for/);
  assert.match(visible(html), /gates on this machine are armed/);
  f.clean();
});

// ---------------------------------------------------------------- the routes

test('the board is the whole front door, and the page it replaced is gone', async () => {
  const planned = project({ 'S-01-a': STORY('S-01', 'A card in a lane', { status: 'to do' }) });
  const server = createBoardServer(planned.root, { isIgnored: () => false });
  const port = await listen(server);
  try {
    const front = await get(port, '/');
    assert.equal(front.status, 200);
    assert.match(visible(front.body), /A card in a lane/, 'the front door is the board');
    // Everything the six cards answered is on it: goal and boundary, the stand, the next step,
    // the documents, the gates and the links.
    assert.match(visible(front.body), /What this project is for/);
    assert.match(visible(front.body), /What we are building now/);
    assert.match(visible(front.body), /gates on this machine are armed/);
    assert.match(visible(front.body), /documents, with \d+ links between them/);
    // And no page links at the retired route any more.
    assert.doesNotMatch(front.body, /href="\/overview"/);

    const retired = await get(port, '/overview');
    assert.equal(retired.status, 404, 'the route answers like any other unknown path');
    assert.equal(retired.status, (await get(port, '/nothing-here')).status);
    assert.match(visible(retired.body), /Not available/);
  } finally { server.close(); planned.clean(); }
});
