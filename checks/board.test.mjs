#!/usr/bin/env node
// Self-test for the board: the lanes, the cards and the front door (checks/board-page.mjs, and
// the routes in checks/cockpit.mjs that reach it). What is proven here is that the page is a
// pure function of the work tree - move one status line and the card moves, with no other edit -
// and that a card says everything a person needs and nothing they do not.
// The six cards beside it are proven in checks/cockpit.test.mjs; what may be opened, in
// checks/cockpit-path.test.mjs.
// Run: node --test checks/board.test.mjs

import { request as httpRequest } from 'node:http';
import { writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fixture } from './cockpit-fixture.mjs';
import { boardPage, WIP } from './board-page.mjs';
import { createBoardServer } from './cockpit.mjs';

// ---------------------------------------------------------------- a project on disk

const BRIEF = '# BRIEF\n\n## Product\n\n- **Name:** Kassaboek\n';

const EPIC = (title) => `# EPIC: ${title}

- **Status:** open

## The goal

${title} in one round.

## What finished means

1. It runs where people can use it.
`;

const FEATURE = (title) => `# F: ${title}

- **Status:** refinement · **Size:** M

- **What you can do after it.** ${title}, working.
- **What that is worth.** Time back.

## Acceptance for the feature as a whole

1. It works.
`;

// One story file, written the way the reader's parse contract says one is written. Everything a
// test wants to vary is a field, so a test says what it is about and nothing else.
const STORY = (id, title, over = {}) => {
  const o = {
    status: 'to do', size: 'M', value: 'Worth doing, in one sentence.', depends: 'none',
    signOff: '2026-08-24', tasks: ['- [x] one', '- [ ] two'], review: ['pending', 'pending', 'pending'],
    ...over,
  };
  return `# ${id}: ${title}

- **Feature:** F-01 · **Status:** ${o.status} · **Size:** ${o.size}
- **Depends on:** ${o.depends} · **Owner sign-off:** ${o.signOff}

## Value

${o.value}

## Acceptance

1. It does the thing.

## Tasks

${o.tasks.join('\n')}

## Review

- Technical: ${o.review[0]}
- Functional: ${o.review[1]}
- Architecture: ${o.review[2]}
`;
};

// A project whose whole work tree is one epic with one feature: stories in, board out.
function project(stories, extra = {}) {
  const files = { 'docs/product/BRIEF.md': BRIEF, ...extra };
  files['docs/work/E-01-shop/epic.md'] = EPIC('A shop that sells');
  files['docs/work/E-01-shop/F-01-till/feature.md'] = FEATURE('The till');
  for (const [name, body] of Object.entries(stories)) {
    files[`docs/work/E-01-shop/F-01-till/${name}.md`] = body;
  }
  return fixture(files);
}

// What a reader actually sees, with the markup and the style sheet taken away.
const visible = (html) => html.replace(/<style[\s\S]*?<\/style>/, '')
  .replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

// A card's own id chip. The label a screen reader hears sits inside it, so the id is what follows
// that label, and nothing else on the page has that shape - a blocker sentence naming the same
// story is prose, not a chip.
const idChip = (id) => new RegExp(`</span>${id}</span>`);

// The page cut into its lanes, so a test can ask what stands in one lane without matching across
// the whole page. The lane keeps its own markup: the fold state is part of what is asserted.
function laneOf(html, name) {
  const sections = html.split('<section class="lane">').slice(1);
  const found = sections.find((s) => s.includes(`<span class="ttl">${name}</span>`));
  assert.ok(found, `no lane called ${name} on the page`);
  return found.split('</section>')[0];
}

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

// ---------------------------------------------------------------- the empty copy

test('a copy that has planned nothing reads as not started, never as an error', () => {
  const f = fixture({ 'docs/product/BRIEF.md': BRIEF });
  const html = boardPage(f.root);
  assert.match(visible(html), /No work is planned yet/);
  assert.doesNotMatch(html, /<section class="lane">/);
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

// ---------------------------------------------------------------- the routes

function get(port, path) {
  return new Promise((ok, fail) => {
    const req = httpRequest({ host: '127.0.0.1', port, path, method: 'GET' }, (res) => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', (c) => { body += c; });
      res.on('end', () => ok({ status: res.statusCode, body }));
    });
    req.on('error', fail);
    req.end();
  });
}

const listen = (server) => new Promise((ok) => server.listen(0, '127.0.0.1', () => ok(server.address().port)));

test('the served page opens on the board, with the six cards one route along', async () => {
  const planned = project({ 'S-01-a': STORY('S-01', 'A card in a lane', { status: 'to do' }) });
  const server = createBoardServer(planned.root, { isIgnored: () => false });
  const port = await listen(server);
  try {
    const front = await get(port, '/');
    assert.equal(front.status, 200);
    assert.match(visible(front.body), /A card in a lane/, 'the front door is the board');
    assert.match(front.body, /<a href="\/overview">/, 'and it names where the rest went');
    const overview = await get(port, '/overview');
    assert.equal(overview.status, 200);
    assert.match(visible(overview.body), /Where the project stands/, 'the six cards keep answering');
    assert.match(overview.body, /<a href="\/">/, 'and point back at the board');
  } finally { server.close(); planned.clean(); }

  // A project that has planned nothing yet opens on the same door, and says so rather than
  // failing: what the six cards answer is still one click away.
  const briefOnly = fixture({ 'docs/product/BRIEF.md': BRIEF });
  const second = createBoardServer(briefOnly.root, { isIgnored: () => false });
  const secondPort = await listen(second);
  try {
    const front = await get(secondPort, '/');
    assert.equal(front.status, 200);
    assert.match(visible(front.body), /No work is planned yet/);
    assert.match(front.body, /<a href="\/overview">/);
    assert.equal((await get(secondPort, '/overview')).status, 200);
  } finally { second.close(); briefOnly.clean(); }
});
