#!/usr/bin/env node
// Self-test for the navigation the board hangs in: the sidebar, the four subjects under it, the
// pages it offers, and the shelf rule that decides which subject a document belongs to
// (checks/board-nav.mjs and checks/shelves.mjs, rendered through checks/board-page.mjs and served
// by checks/board-server.mjs).
// What is proven here is that a reader who follows a link is never left somewhere with no way on,
// that a row is only offered when there is something behind it, and that a docs/ folder which
// cannot be read says so rather than reading as a project with no documents.
// The lanes and the cards are proven in checks/board.test.mjs, the printed file in
// checks/board-file.test.mjs, and what may be opened at all in checks/board-path.test.mjs.
// Story: docs/work/E-01-agile-first/F-04-board/S-07-the-board-gets-its-look (local).
// Run: node --test checks/board-nav.test.mjs

import { execFileSync } from 'node:child_process';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  fixture, project, STORY,
  visible, laneOf, chapterOf, chapterCount, get, listen,
} from './board-fixture.mjs';
import { startPage, boardOnlyPage } from './board-page.mjs';
import { shelfFor, OTHER } from './shelves.mjs';
import { createBoardServer } from './board-server.mjs';

// ---------------------------------------------------------------- the four shelves
test('a document stands on the shelf its path puts it on, and one the rule does not know is named anyway', () => {
  const f = project({ 'S-01-a': STORY('S-01', 'A card', { status: 'to do' }) });
  // Nothing but the two files changes between the two renders.
  assert.doesNotMatch(visible(startPage(f.root)), /VISION|handy/);
  f.put('docs/product/VISION.md', '# VISION\n');
  f.put('docs/tools/handy.md', '# A folder the rule never heard of\n');
  const html = startPage(f.root);

  // Redrawn for S-07: the shelves are the sidebar's chapters now, so this is where the rule shows.
  // What it proves is unchanged - a path the rule knows lands on its own shelf, and one it has
  // never heard of lands on the named catch-all rather than falling off the page.
  assert.match(chapterOf(html, 'Why we build it'), /VISION/, 'a path the rule knows lands on its shelf');
  assert.match(chapterOf(html, 'Elsewhere'), /handy/, 'a path it does not know lands on the named one');
  // The other direction: neither document is anywhere else in the navigation.
  assert.doesNotMatch(chapterOf(html, 'Elsewhere'), /VISION/);
  assert.doesNotMatch(chapterOf(html, 'Why we build it'), /handy/);
  // Retired with the section that carried it: the catch-all used to explain itself in a sentence
  // under its documents. A chapter has no room for one, and the owner's distillation of
  // 2026-08-25 chose the name to carry the meaning instead. The name is asserted above.
  f.clean();
});

// Retired by S-07, recorded here because a test that is simply gone leaves no trace of what
// stopped being true: "a row says what its document owns in the manifest own words, pattern rows
// included". A shelf row used to carry the manifest's sentence about the fact a document owns.
// The sidebar names a document by its own heading instead, so no manifest sentence reaches any
// page, and shelfDocuments no longer gathers one. The manifest itself is still gated, by the
// docs-manifest check in checks/check.mjs, which is where that rule belongs.

test('the shelf rule answers on its own: a path in, a shelf out', () => {
  assert.equal(shelfFor('docs/product/BRIEF.md'), 'why');
  assert.equal(shelfFor('docs/work/E-01-shop/F-01-till/S-01-a.md'), 'now');
  assert.equal(shelfFor('docs/standards/GLOBAL.md'), 'built');
  assert.equal(shelfFor('docs/decisions/0021-agile-first.md'), 'learned');
  // The narrower row wins over the folder it sits inside, in both directions.
  assert.equal(shelfFor('docs/product/ARCHITECTURE.md'), 'built');
  assert.equal(shelfFor('docs/specs/archive/000-baseline/spec.md'), 'learned');
  assert.equal(shelfFor('docs/specs/012-a-shipped-change.md'), 'now');
  assert.equal(shelfFor('docs/tools/handy.md'), OTHER);
  // A file that is no project document at all stands on no shelf, and says so.
  assert.equal(shelfFor('checks/links.mjs'), null);
  assert.equal(shelfFor(null), null);
});

test('a document the project keeps out of git is never a door that does not open', () => {
  const f = project({ 'S-01-a': STORY('S-01', 'A card', { status: 'to do' }) }, {
    '.gitignore': '*.local.md\n',
    'docs/state/STATE.local.md': '# STATE\n\n- **Now ▶** finish the till\n',
    'docs/state/DEBT.md': '# DEBT\n',
  });
  execFileSync('git', ['init', '-q'], { cwd: f.root, stdio: 'ignore' });
  const html = startPage(f.root);
  // Redrawn for S-07. This used to read "named on its shelf, and not linked", because a shelf
  // listed every document it held. The sidebar the owner signed off on 2026-08-25 lists only rows
  // that open, so an untracked document is not offered there at all. The half that mattered is
  // the half that stayed: the board never shows a door that does not open.
  assert.doesNotMatch(html, /href="[^"]*STATE\.local/, 'no link to a file the file route refuses');
  assert.doesNotMatch(chapterOf(html, 'Building now'), /STATE\.local/, 'and no row standing for one');
  // Its neighbour is tracked, so that one does open: the rule is git's answer, not the folder.
  assert.match(chapterOf(html, 'Building now'), /<a class="plink" href="\/file\?path=docs%2Fstate%2FDEBT\.md"/);
  // The handoff it holds is still read, and still the next step on the board. A file this board
  // will not serve is still a file this board reads, and those two were never the same question.
  assert.match(visible(html), /Next step finish the till/);
  f.clean();
});

// ---------------------------------------------------------------- the empty copy
test('a copy with no manifest, no brief and no work tree reads as not started', () => {
  const f = fixture({});
  const html = startPage(f.root);
  const text = visible(html);
  // Redrawn for S-07. Four shelves used to stand on the page whether or not they held anything,
  // each saying it was empty. The sidebar the owner signed off on 2026-08-25 names a subject only
  // when there is something behind the name, because a row that opens nothing is a row a reader
  // has to check to learn it was pointless. An empty copy therefore has no chapters at all, and
  // that has to read as not started rather than as broken, which is what the rest of this asks.
  assert.equal(chapterCount(html), 0, 'no subject is invented for a project with no documents');
  assert.doesNotMatch(text, /could not be built/, 'and nothing failed: there is nothing yet');
  // The way in is still there, so an empty copy is navigable rather than a wall.
  for (const dest of ['/', '/board', '/epic', '/features']) {
    assert.match(html, new RegExp(`href="${dest}"`), `the way to ${dest} stands`);
  }
  assert.match(text, /Scope is not defined yet/);
  // A zero would read as progress on undecided scope, so none is shown; the next step still
  // names the skill that writes one.
  assert.doesNotMatch(text, /0 of the \d+ things/);
  assert.match(text, /names no next step.*checkpoint skill/);
  // The way in has no lanes on it by design; the page that does has none to show either.
  assert.doesNotMatch(boardOnlyPage(f.root), /<section class="lane[ "]/, 'and no empty lanes');
  f.clean();
});

test('a docs folder that cannot be read is named on the page, never shown as empty shelves', () => {
  // A name that is no folder at all is the portable stand-in for a folder that cannot be read:
  // both leave readdir throwing something other than "it is not there".
  const f = fixture({ docs: 'this is a file where a folder should be\n' });
  const html = startPage(f.root);
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
test('the front door answers the question, and the lanes are one click behind it', async () => {
  const planned = project({ 'S-01-a': STORY('S-01', 'A card in a lane', { status: 'to do' }) });
  const server = createBoardServer(planned.root, { isIgnored: () => false });
  const port = await listen(server);
  try {
    const front = await get(port, '/');
    assert.equal(front.status, 200);
    // Redrawn for S-07. The board was one page; it is five now, and the way in is the one that
    // answers what the project is for and where it stands. The lanes did not disappear from the
    // board, they became the page the sidebar's second row opens, which is asserted below.
    assert.match(visible(front.body), /What this project is for/);
    assert.match(visible(front.body), /gates on this machine are armed/);
    assert.match(visible(front.body), /documents, with \d+ links between them/);
    assert.doesNotMatch(visible(front.body), /A card in a lane/, 'the way in is not the lanes');
    assert.match(front.body, /href="\/board"/, 'and it offers the way to them');

    // One click behind it: the lanes, with the card in the lane its own status line puts it in.
    const board = await get(port, '/board');
    assert.equal(board.status, 200);
    assert.match(visible(board.body), /A card in a lane/, 'the lanes are their own page');
    assert.match(laneOf(board.body, 'To do'), /A card in a lane/);

    // And no page links at the retired route any more.
    assert.doesNotMatch(front.body, /href="\/overview"/);
    assert.doesNotMatch(board.body, /href="\/overview"/);

    const retired = await get(port, '/overview');
    assert.equal(retired.status, 404, 'the route answers like any other unknown path');
    assert.equal(retired.status, (await get(port, '/nothing-here')).status);
    assert.match(visible(retired.body), /Not available/);
  } finally { server.close(); planned.clean(); }
});

test('every page the sidebar offers answers, and carries the sidebar itself', async () => {
  const f = project({
    'S-01-a': STORY('S-01', 'Waiting to be picked up', { status: 'to do' }),
    'S-02-b': STORY('S-02', 'Under the hands', { status: 'in progress' }),
  });
  const server = createBoardServer(f.root, { isIgnored: () => false });
  const port = await listen(server);
  try {
    // The five pages S-07 built, plus the folder index behind a folded row. A followed link that
    // arrived somewhere with no way onward was the whole reason the sidebar exists, so the page
    // answering is only half of what is asked here: it has to carry the way out as well.
    const routes = ['/', '/board', '/epic', '/features',
      '/feature?key=E-01%2FF-01', '/folder?path=docs%2Fwork'];
    for (const route of routes) {
      const page = await get(port, route);
      assert.equal(page.status, 200, `${route} answers`);
      assert.match(page.body, /<nav class="side"/, `${route} carries the sidebar`);
      assert.match(page.body, /href="\/board"/, `${route} offers the way on`);
      // Nothing runs on any of them, which is the promise the whole board is served under.
      assert.doesNotMatch(page.body, /<script|onclick=/, `${route} runs nothing`);
    }
    // A key that names no feature is refused the way any unknown path is, rather than rendering
    // an empty page that reads as a feature with nothing in it.
    const nowhere = await get(port, '/feature?key=E-09%2FF-09');
    assert.equal(nowhere.status, 404);
  } finally { server.close(); f.clean(); }
});

test('a document behind a folded row is still placed: the chapter opens and the place is marked', async () => {
  // More documents in one folder than the sidebar will list, so the row it gets stands for the
  // folder rather than for any one of them. Without this, a reader who followed a link into that
  // folder met a sidebar with nothing open and nothing marked - which is the dead end the sidebar
  // was built to end, arriving by another door.
  const f = project({ 'S-01-a': STORY('S-01', 'A card', { status: 'to do' }) }, Object.fromEntries(
    Array.from({ length: 6 }, (_, i) => [`docs/decisions/000${i + 1}-one.md`, `# 000${i + 1}: one\n`]),
  ));
  const server = createBoardServer(f.root, { isIgnored: () => false });
  const port = await listen(server);
  try {
    const page = await get(port, '/file?path=docs%2Fdecisions%2F0003-one.md');
    assert.equal(page.status, 200);
    const chapter = chapterOf(page.body, 'What we learned');
    assert.match(chapter, /aria-current="location"/, 'the place the document sits in is marked');
    assert.match(chapter, /href="\/folder\?path=docs%2Fdecisions"/, 'and it is the folder row');
    // "location", never "page": the folder is where this document is, not what is being shown.
    assert.doesNotMatch(chapter, /aria-current="page"/);
    // The chapter holding it is open, because no script runs here to open it afterwards.
    assert.match(page.body, /<div class="topic"><details open>[\s\S]*?What we learned/,
      'and the chapter it belongs to arrives open');

    // The other direction: a document with a row of its own is the page, not a location.
    const own = await get(port, '/file?path=docs%2Fproduct%2FBRIEF.md');
    assert.match(chapterOf(own.body, 'Why we build it'), /aria-current="page"/);
  } finally { server.close(); f.clean(); }
});
