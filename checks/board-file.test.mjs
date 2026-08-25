#!/usr/bin/env node
// Self-test for the board printed as one file someone else can open (`--page`, E-01/F-04/S-05).
// What is proven here is that the file is the same picture as the served board and not a second
// one: the two outputs are held to one derivation by a diff, so a card, a lane, a shelf or a
// count can never be added to one and forgotten in the other. Beside that, the three things that
// may differ, and only those: every name is a name because there is no route to open it on, the
// page says the moment it was made instead of claiming to be live, and the gates line says where
// it was read rather than pointing at the machine the reader happens to be on.
// The board itself is proven in checks/board.test.mjs and the two lines under it in
// checks/board-strip.test.mjs. Run: node --test checks/board-file.test.mjs

import { execFileSync } from 'node:child_process';
import { readdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  fixture, project, BRIEF, STORY, visible,
} from './board-fixture.mjs';
import { boardPage } from './board-page.mjs';

// A moment no wall clock in this test's lifetime can produce, so a stamp that matches it can only
// have come from the clock the render was handed.
const MADE = new Date('2001-02-03T04:05:06Z');
const STAMP = '2001-02-03 04:05 UTC';

// The three sentences, written out rather than imported. They are the contract this story is
// about, and a suite that read them from the same table the page renders from would agree with
// any wording, including a wrong one.
const LIVE = 'Read from the project files the moment you opened this page. Nothing here is stored.';
const WHEN = `Made from the project files on ${STAMP}. This is the picture at that moment, `
  + 'not the project as it is now.';
const NAMES = 'Every file name here is a file in the project&#39;s repository; this picture does '
  + 'not carry the files themselves.';
const HERE = /(\d+) of the (\d+) gates on this machine are armed\./;
const THERE = (n, t) => `${n} of the ${t} gates were armed on the machine where this file was made.`;

// A project with something on every part of the board: a goal and a boundary, cards in three
// lanes, documents on three shelves, and enough pointers between them for the link line to have
// an answer. The printed file has to carry all of it, unchanged.
const SOMETHING = () => project({
  'S-01-a': STORY('S-01', 'Waiting to be picked up', { status: 'to do' }),
  'S-02-b': STORY('S-02', 'Under the hands', { status: 'in progress' }),
  'S-03-c': STORY('S-03', 'Finished', { status: 'done' }),
}, {
  'docs/product/BRIEF.md': `${BRIEF}
- **One sentence:** Kassaboek turns a shoebox of receipts into a monthly overview.

## In scope

- SC-1 import receipts with the camera

## Out of scope

- payroll
`,
  'docs/README.md': `# Documents

| Document | Owns |
|---|---|
| \`product/BRIEF.md\` | Scope, goals and the success criteria |
| \`decisions/0001-first.md\` | Decision records, numbered |
`,
  'docs/decisions/0001-first.md': '# 0001: the first one\n\nSee the brief `docs/product/BRIEF.md`.\n',
  'docs/state/DEBT.md': '# DEBT\n\nNothing owed yet.\n',
});

// ---------------------------------------------------------------- one derivation, two outputs

test('the printed file is the same picture as the served board, down to the last count', () => {
  const f = SOMETHING();
  const served = boardPage(f.root);
  const printed = boardPage(f.root, { made: MADE });
  // The served board is walked forward by exactly the three rules the story allows, and what
  // comes out has to be the printed file character for character. Anything else that differs -
  // a lane, a card, a shelf, a number, a sentence - fails here, which is the whole point of
  // asserting the difference rather than asserting each output on its own.
  const asPrinted = served
    .replace(LIVE, `${WHEN} ${NAMES}`)
    .replace(HERE, (m, n, t) => THERE(n, t))
    // A name is a name: the anchor goes, the name it wrapped stays exactly as it was.
    .replace(/<a href="\/file\?path=[^"]*">(<code>[^<]*<\/code>)<\/a>/g, '$1')
    // The fourth rule, added by S-07. A served page is a frame: it fills the window and the
    // containers in it scroll, so the lanes stay where the reader put them. A file is one long
    // document that scrolls the ordinary way, and the class is the whole of that difference.
    .replace(' class="frame"', '');
  assert.equal(asPrinted, printed);
  // And the served board really did carry all three, so the diff above proved something.
  assert.match(served, new RegExp(LIVE));
  assert.match(served, HERE);
  assert.match(served, /<a href="\/file\?path=/);
  f.clean();
});

// ---------------------------------------------------------------- nothing to fetch, nothing to open

test('the printed file points nowhere: no anchor in it, and no address to fetch', () => {
  const f = SOMETHING();
  const printed = boardPage(f.root, { made: MADE });
  assert.doesNotMatch(printed, /<a[\s>]/, 'no anchor element at all');
  assert.doesNotMatch(printed, /href=|src=|<script|<link|<iframe/, 'nothing is fetched');
  assert.doesNotMatch(printed, /url\(|@import/, 'and the style sheet fetches nothing either');
  // What it does carry is the whole look, inline, so it renders the same off the network.
  assert.match(printed, /<style>/);
  // The names are still all there; they are set as names.
  const text = visible(printed);
  assert.match(text, /docs\/product\/BRIEF\.md/);
  assert.match(text, /decisions\/0001-first\.md/);
  assert.match(text, /S-01-a\.md/);
  // And the sentence that tells a reader what those names are, and where the files are not.
  assert.match(printed, new RegExp(NAMES));
  assert.match(text, /this picture does not carry the files themselves/);
  f.clean();
});

// ---------------------------------------------------------------- when, and where

test('the printed file says the moment it was made, and never that it is live', () => {
  const f = SOMETHING();
  const text = visible(boardPage(f.root, { made: MADE }));
  assert.match(text, new RegExp(`Made from the project files on ${STAMP}`));
  assert.match(text, /the picture at that moment, not the project as it is now/);
  assert.doesNotMatch(text, /the moment you opened this page/, 'the served sentence is gone');
  assert.doesNotMatch(text, /Nothing here is stored/);
  f.clean();
});

test('the moment on it comes from the clock it was handed, never from the wall', () => {
  const f = SOMETHING();
  const early = visible(boardPage(f.root, { made: new Date('1999-12-31T23:58:00Z') }));
  const late = visible(boardPage(f.root, { made: new Date('2038-01-19T03:14:07Z') }));
  assert.match(early, /Made from the project files on 1999-12-31 23:58 UTC\./);
  // Seconds are dropped, and the zone is said: a bare local time is a riddle to a reader who is
  // not on the machine that made the file.
  assert.match(late, /Made from the project files on 2038-01-19 03:14 UTC\./);
  assert.doesNotMatch(late, /03:14:07/);
  f.clean();
});

test('the gates line says where it was read, in both languages', () => {
  const f = SOMETHING();
  const printed = visible(boardPage(f.root, { made: MADE }));
  assert.match(printed, /gates were armed on the machine where this file was made\./);
  assert.doesNotMatch(printed, /on this machine are armed/);

  const nl = project({ 'S-01-a': STORY('S-01', 'Een kaart', { status: 'to do' }) }, {
    'docs/design/VOICE.md': '# VOICE\n\n- **Product language:** Nederlands\n',
  });
  const dutch = visible(boardPage(nl.root, { made: MADE }));
  assert.match(dutch, /poorten stonden scherp op de machine waar dit bestand is gemaakt\./);
  assert.doesNotMatch(dutch, /op deze machine staan scherp/);
  // The other two sentences follow the project's language too, like every sentence the board
  // frames itself with.
  assert.match(dutch, new RegExp(`Gemaakt uit de projectbestanden op ${STAMP}`));
  assert.match(dutch, /Elke bestandsnaam hier is een bestand in de repository van het project/);
  assert.doesNotMatch(dutch, /op het moment dat je deze pagina opende/);
  nl.clean();
  f.clean();
});

// ---------------------------------------------------------------- the empty copy

test('a copy that has planned nothing prints too, and reads as not started', () => {
  const f = fixture({});
  const printed = boardPage(f.root, { made: MADE });
  const text = visible(printed);
  assert.match(printed, /^<!doctype html>/);
  assert.match(printed, /<\/html>\n$/);
  assert.match(text, /Scope is not defined yet/);
  assert.match(text, new RegExp(`Made from the project files on ${STAMP}`));
  // Redrawn for S-07: the shelves became the sidebar's chapters, and a printed file has no
  // sidebar at all, because there is nowhere in it to navigate to. What has to hold is that an
  // empty copy still prints as not started rather than as a failure, which the rest of this asks.
  assert.doesNotMatch(printed, /<section class="lane[ "]/);
  assert.doesNotMatch(printed, /<a[\s>]/);
  // Not an error and not a blank page: the file still says what to do next.
  assert.match(text, /names no next step/);
  f.clean();
});

// ---------------------------------------------------------------- the command

// Every file in the project, with its size and the moment it was last written. Asked twice around
// the command, this is what "writes nothing" means: not one file added, removed, or touched.
// Read off the filesystem rather than out of git, because a copy that has not been initialised yet
// still has to be able to run this suite - which is exactly what the evidence drill does.
function treeStamp(root) {
  return readdirSync(root, { recursive: true, withFileTypes: true })
    .filter((e) => e.isFile() && !`${e.parentPath || e.path}/`.includes('/.git/'))
    .map((e) => {
      const full = join(e.parentPath || e.path, e.name);
      const st = statSync(full);
      return `${full} ${st.size} ${st.mtimeMs}`;
    })
    .sort()
    .join('\n');
}

test('the command prints the whole document and writes nothing', () => {
  const root = dirname(dirname(fileURLToPath(import.meta.url)));
  const before = treeStamp(root);
  // Run from somewhere else entirely: the command reads the project the script belongs to, and
  // the directory it was started in is only there to catch a stray write.
  const here = fixture({});
  const out = execFileSync('node', [join(root, 'checks/progress.mjs'), '--page'], {
    cwd: here.root, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024,
  });
  assert.match(out, /^<!doctype html>/);
  assert.match(out, /<\/html>\n$/);
  assert.match(out, /Made from the project files on \d{4}-\d\d-\d\d \d\d:\d\d UTC\./);
  assert.doesNotMatch(out, /<a[\s>]/);
  // Standard output and nowhere else: not into the directory it was run from, and not one byte
  // into the project it read. Nothing can be committed by accident, which is why it prints.
  assert.deepEqual(readdirSync(here.root), []);
  assert.equal(treeStamp(root), before);
  here.clean();
});
