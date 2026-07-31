#!/usr/bin/env node
// Self-test for the board's cards and the server that carries them (checks/cockpit-page.mjs and
// checks/cockpit.mjs). The board is proven to keep its promise: the owner's own sentences, a
// named card instead of an empty one, and no card taking the page down.
// What may be opened is proven next door, in checks/cockpit-path.test.mjs.
// Run: node --test checks/cockpit.test.mjs

import { execFileSync } from 'node:child_process';
import { request as httpRequest } from 'node:http';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fixture } from './cockpit-fixture.mjs';
import {
  escapeHtml, formatSize, card, progressCard, goalCard, nextStepCard, fileMapCard, gatesCard,
  linksCard, renderBoard, boardPage,
} from './cockpit-page.mjs';
import { createBoardServer } from './cockpit.mjs';
import { derive, parseManifest } from './progress.mjs';
import { linkGraph } from './links.mjs';

const BRIEF = (items) => `# BRIEF

## Product

- **Name:** Kassaboek

## In scope

${items}
`;

const SPEC = (status, traces) => `# 001: something

- **Status:** ${status}
- **Traces to:** ${traces}
`;

const project = (over = {}) => ({ name: 'Kassaboek', lang: 'en', now: null, ...over });
const items = [
  { id: 'SC-1', title: 'import receipts with the camera' },
  { id: 'SC-2', title: 'a monthly overview per customer' },
  { id: 'SC-3', title: 'export to the accountant' },
];
// What a reader actually sees, with the markup taken away.
const visible = (html) => html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

// ---------------------------------------------------------------- rendering

test('a rendered card carries the owner sentences and no internal identifiers', () => {
  const progress = derive({
    scopeItems: items,
    specs: [{ file: 'a', status: 'done', traces: ['SC-1'] }, { file: 'b', status: 'building', traces: ['SC-2'] }],
  });
  const owner = { lang: 'en', path: 'docs/product/BRIEF.md', openable: true };
  const html = renderBoard(project(), [card('Progress', owner, () => progressCard(project(), progress))]);
  const text = visible(html);
  assert.match(text, /1 of the 3 things are done/);
  assert.match(text, /import receipts with the camera/);
  assert.match(text, /Not started yet/);
  assert.doesNotMatch(text, /SC-\d|building|status/i);
  // Criterion 12: the board displays every card without client-side script.
  assert.doesNotMatch(html, /<script|onload=|javascript:/i);
  // The file that owns the fact is named, and that name opens it.
  assert.match(html, /href="\/file\?path=docs%2Fproduct%2FBRIEF\.md"/);
});

test('an undefined scope names the skill that fills it instead of showing a zero', () => {
  const html = progressCard(project(), derive({ scopeItems: [], specs: [] }));
  assert.match(visible(html), /Scope is not defined yet.*scope skill/);
  assert.match(html, /<code>scope<\/code>/);
  assert.doesNotMatch(visible(html), /0 of the/);
});

test('a card that cannot be built names its failure and the others still render', () => {
  const owner = { lang: 'en', path: 'docs/product/BRIEF.md', openable: true };
  const html = renderBoard(project(), [
    card('Progress', owner, () => { throw new Error('the brief could not be read'); }),
    card('Next step', { lang: 'en', path: 'docs/state/STATE.md', openable: true }, () => '<p>ship it</p>'),
  ]);
  assert.match(visible(html), /could not be built: the brief could not be read/);
  assert.match(visible(html), /ship it/);
});

test('an unopenable owning file is still named, just not linked', () => {
  const owner = { lang: 'en', path: 'docs/product/BRIEF.md', openable: false };
  const html = card('Progress', owner, () => '<p>x</p>');
  assert.match(visible(html), /From docs\/product\/BRIEF\.md/);
  assert.doesNotMatch(html, /<a /);
});

test('nothing in a project file can execute as markup', () => {
  assert.equal(escapeHtml('<img src=x onerror="alert(1)">'), '&lt;img src=x onerror=&quot;alert(1)&quot;&gt;');
  const html = progressCard(project(), derive({
    scopeItems: [{ id: 'SC-1', title: '<script>alert(1)</script>' }],
    specs: [],
  }));
  assert.doesNotMatch(html, /<script/);
  assert.match(html, /&lt;script&gt;/);
});

test('framing words follow the project language', () => {
  const progress = derive({ scopeItems: items, specs: [] });
  const nl = visible(renderBoard(project({ lang: 'nl' }), [
    card('Voortgang', { lang: 'nl', path: 'docs/product/BRIEF.md' }, () => progressCard(project({ lang: 'nl' }), progress)),
  ]));
  assert.match(nl, /0 van de 3 dingen zijn klaar/);
  assert.match(nl, /Uit docs\/product\/BRIEF\.md/);
});

// A finished list only grows, and on a board it is the least urgent thing there. It keeps its
// count in view and its sentences one click away; what is running is never hidden.
test('what is done folds behind its count, what is running stays open', () => {
  const progress = derive({
    scopeItems: items,
    specs: [{ file: 'a', status: 'done', traces: ['SC-1'] }, { file: 'b', status: 'building', traces: ['SC-2'] }],
  });
  const html = progressCard(project(), progress);
  assert.match(html, /<details><summary>Done <span class="count">1<\/span>/);
  assert.match(visible(html), /Done 1.*import receipts with the camera/);
  // The two groups that answer "where are we now" are not behind a click.
  assert.match(html, /<h3>Working on now<\/h3>/);
  assert.match(html, /<h3>Not started yet<\/h3>/);
});

// ---------------------------------------------------------------- the other cards

test('goal and scope: the promise in one sentence, the boundary behind its count', () => {
  const brief = {
    goal: 'Kassaboek turns a shoebox of receipts into a monthly overview the accountant accepts.',
    outOfScope: [{ title: 'payroll' }, { title: 'a second currency' }],
  };
  const html = goalCard(brief, 'en');
  assert.match(visible(html), /shoebox of receipts/);
  assert.match(html, /<summary>Deliberately not part of this <span class="count">2<\/span>/);
  assert.match(visible(html), /payroll/);
});

test('goal and scope: an unfilled brief names the skill that fills it', () => {
  for (const brief of [null, { goal: null, outOfScope: [] }]) {
    const text = visible(goalCard(brief, 'en'));
    assert.match(text, /does not say yet what this project is for.*scope skill/);
  }
  // A brief with a goal but no boundary says that too, instead of showing nothing.
  assert.match(visible(goalCard({ goal: 'one sentence', outOfScope: [] }, 'en')), /names nothing as out of scope yet/);
});

test('next step: the handoff in its own words, with every heads-up beside it', () => {
  const warnings = derive({
    scopeItems: [{ id: 'SC-1', title: 'export to the accountant' }],
    specs: [{ file: '004-vat', status: 'building', traces: ['SC-9'] }],
  }).warnings;
  const text = visible(nextStepCard('finish the `export` screen', warnings, 'en'));
  assert.match(text, /finish the export screen/);
  assert.match(text, /Heads up.*004-vat.*not in the brief/);
  // The handoff writes in backticks; the board reads them as it does everywhere else.
  assert.match(nextStepCard('finish the `export` screen', [], 'en'), /<code>export<\/code>/);
});

test('next step: no handoff, or none that names one, points at the skill that writes it', () => {
  const text = visible(nextStepCard(null, [], 'en'));
  assert.match(text, /names no next step.*checkpoint skill/);
});

test('the file map is read off the manifest rows, header and divider aside', () => {
  const rows = parseManifest(`# docs
| File | Tier | What it owns |
|---|---|---|
| \`state/STATE.md\` | LIVE | Live state and the single "what's next" |
| \`design/*.md\` ◆ | REF | Design and voice |
Rules: one fact, one owning file.
`);
  assert.deepEqual(rows.map((r) => r.path), ['state/STATE.md', 'design/*.md']);
  assert.equal(rows[0].tier, 'LIVE');
  assert.equal(rows[1].owns, 'Design and voice');
});

test('the file map keeps what is always current in view and names what owns what', () => {
  const rows = [
    { path: 'state/STATE.md', tier: 'LIVE', owns: 'Live state' },
    { path: 'design/*.md', tier: 'REF', owns: 'Design and voice' },
  ];
  const html = fileMapCard(rows, 'en', (p) => p === 'docs/state/STATE.md');
  assert.match(html, /<h3>Always current<\/h3>/);
  assert.match(html, /<summary>Current for its subject <span class="count">1<\/span>/);
  // The card's whole job: the file, and the fact it owns, on the same line.
  assert.match(visible(html), /state\/STATE\.md - Live state/);
  assert.match(visible(html), /design\/\*\.md - Design and voice/);
  // A name opens its file where the file route will serve it, and stays a name where it will not.
  assert.match(html, /<a href="\/file\?path=docs%2Fstate%2FSTATE\.md"><code>state\/STATE\.md<\/code><\/a>/);
  assert.doesNotMatch(html, /href="[^"]*design/);
  assert.match(visible(fileMapCard([], 'en')), /manifest is missing.*begin skill/);
});

test('the link card names what is load-bearing and folds the long lists behind their counts', () => {
  const pointsAtBrief = 'the brief `docs/product/BRIEF.md`';
  const graph = linkGraph([
    { path: 'AGENTS.md', text: pointsAtBrief },
    { path: 'docs/state/STATE.md', text: pointsAtBrief },
    { path: 'docs/state/DEBT.md', text: pointsAtBrief },
    // The manifest names a file from inside docs/, and it is the same document either way.
    { path: 'docs/README.md', text: 'the brief `product/BRIEF.md`' },
    { path: 'docs/product/BRIEF.md', text: 'no pointers here' },
    { path: 'docs/lonely.md', text: 'no pointers here either' },
  ]);
  const html = linksCard(graph, 'en', (p) => p === 'docs/product/BRIEF.md');
  const text = visible(html);
  assert.match(text, /6 documents, with 4 links between them/);
  // What was counted is said on the card: a reader deciding to delete a file has to know.
  assert.match(text, /A link is a path a document spells out/);
  assert.match(html, /<h3>4 or more documents point at these<\/h3>/);
  assert.match(text, /docs\/product\/BRIEF\.md - 4 documents point at it/);
  assert.match(html, /<summary>Nothing points at these <span class="count">5<\/span>/);
  assert.match(html, /<summary>Every document, and what it points at <span class="count">6<\/span>/);
  // Both directions per document, which is the card's whole promise (criterion 18).
  // The separator is written once between the names; stripping the markup leaves a space beside it.
  assert.match(text, /Pointed at by: AGENTS\.md ?, docs\/README\.md ?, docs\/state\/DEBT\.md ?, docs\/state\/STATE\.md/);
  assert.match(text, /Points at: docs\/product\/BRIEF\.md/);
  assert.match(text, /Points at no other document\./);
  // A name opens its file where the file route will serve it, and stays a name where it will not.
  assert.match(html, /<a href="\/file\?path=docs%2Fproduct%2FBRIEF\.md">/);
  assert.doesNotMatch(html, /href="[^"]*lonely/);
});

test('the link card states how many paths point at nothing, and why an orphan can be by design', () => {
  const graph = linkGraph([
    {
      path: 'AGENTS.md',
      text: 'the runner `checks/check.mjs`, made by `architect`: `docs/product/ARCHITECTURE.md`',
    },
    { path: '.agents/skills/architect/SKILL.md', text: 'the rulebook `AGENTS.md`' },
  ], { exists: (p) => p === 'checks/check.mjs' });
  const html = linksCard(graph, 'en');
  assert.match(html, /<summary>Paths that point at nothing <span class="count">1<\/span>/);
  // The name is its own element, so stripping the markup leaves a space beside the separator.
  assert.match(visible(html), /AGENTS\.md ?: docs\/product\/ARCHITECTURE\.md/);
  assert.match(visible(html), /a name shortened to its bare filename, or prose shaped like a path/);
  // The clause sits inside the fold, next to the names it explains.
  assert.match(html, /Nothing points at these[\s\S]*the rulebook names a skill by its name[\s\S]*<\/details>/);
  // A path that lands on a file which is no document is placed, not counted as a miss.
  assert.doesNotMatch(visible(html), /check\.mjs/);
});

test('a project with nothing to draw says so, on the card and in the numbers', () => {
  assert.match(visible(linksCard(linkGraph([]), 'en')), /no documents to read yet/);
  const alone = linksCard(linkGraph([{ path: 'AGENTS.md', text: 'rules' }]), 'en');
  assert.match(visible(alone), /No document is pointed at by 4 or more others/);
  assert.match(alone, /<summary>Nothing points at these <span class="count">1<\/span>/);
  // Nothing left over is stated, not left silent: an empty card would read as an unasked question.
  assert.match(visible(alone), /Every path spelled out lands on a document or on a file\./);
});

test('the gates card reports this machine, and repeats the fix line when one is down', () => {
  const html = gatesCard([
    { signal: 'hooks', armed: true, detail: 'core.hooksPath -> checks/hooks' },
    { signal: 'CI', armed: false, detail: 'CI workflow present but no GitHub remote: it never runs.' },
    { signal: 'adapter hooks', armed: true, detail: 'wired' },
  ], 'en');
  const text = visible(html);
  assert.match(text, /2 of the 3 gates on this machine are armed/);
  assert.match(text, /Armed.*the checks before every commit/);
  assert.match(text, /Not armed.*no GitHub remote: it never runs/);
  // An armed signal says what it does, not how it is configured.
  assert.doesNotMatch(text, /core\.hooksPath/);
});

test('a size is named in words a reader can use', () => {
  assert.equal(formatSize(12), '12 bytes');
  assert.equal(formatSize(2048), '2 KB');
  assert.equal(formatSize(3 * 1024 * 1024), '3.0 MB');
});

// ---------------------------------------------------------------- the server

function get(port, path, { host, method = 'GET' } = {}) {
  return new Promise((ok, bad) => {
    const req = httpRequest({
      host: '127.0.0.1', port, path, method, headers: { Host: host || `127.0.0.1:${port}` },
    }, (res) => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', (c) => { body += c; });
      res.on('end', () => ok({ status: res.statusCode, headers: res.headers, body }));
    });
    req.on('error', bad);
    req.end();
  });
}

const listen = (server) => new Promise((ok) => server.listen(0, '127.0.0.1', () => ok(server.address().port)));

test('the server answers the board, a permitted file, a refused path and a wrong Host', async () => {
  const f = fixture({
    'docs/product/BRIEF.md': BRIEF('- SC-1 import receipts with the camera\n- SC-2 a monthly overview'),
    'docs/specs/001-import/spec.md': SPEC('done', 'BRIEF SC-1'),
    'docs/design/reference/huge.md': `${'x'.repeat(600 * 1024)}\n`,
  });
  f.put('docs/design/reference/logo.png', Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x00, 0x1a]));
  const server = createBoardServer(f.root, { isIgnored: () => false });
  const port = await listen(server);
  try {
    const board = await get(port, '/');
    assert.equal(board.status, 200);
    assert.match(visible(board.body), /Kassaboek.*1 of the 2 things are done/);
    // Criterion 6: a stale page can never present itself as the live stand.
    assert.match(board.headers['cache-control'], /no-store/);

    const file = await get(port, '/file?path=docs%2Fproduct%2FBRIEF.md');
    assert.equal(file.status, 200);
    assert.match(file.body, /import receipts with the camera/);

    const escaped = await get(port, '/file?path=..%2F..%2Fetc%2Fhosts');
    assert.equal(escaped.status, 404);
    assert.match(visible(escaped.body), /Not available/);

    const unknown = await get(port, '/nothing-here');
    assert.equal(unknown.status, 404);

    // The route without its parameter at all: still an answer, never a stack trace.
    const bare = await get(port, '/file');
    assert.equal(bare.status, 404);
    assert.match(visible(bare.body), /Not available/);

    const rebound = await get(port, '/', { host: 'evil.example' });
    assert.equal(rebound.status, 403);
    assert.doesNotMatch(rebound.body, /Kassaboek/);

    // Criterion 16: the board never changes a project file, so nothing that could ask it to
    // gets as far as a path.
    const write = await get(port, '/file?path=docs%2Fproduct%2FBRIEF.md', { method: 'DELETE' });
    assert.equal(write.status, 405);

    // A file too big to read on a page, and one that is not text at all: named with its size,
    // never poured into the page.
    const huge = await get(port, '/file?path=docs%2Fdesign%2Freference%2Fhuge.md');
    assert.match(visible(huge.body), /huge\.md is 600 KB and is not shown here/);
    assert.doesNotMatch(huge.body, /xxxxx/);
    const binary = await get(port, '/file?path=docs%2Fdesign%2Freference%2Flogo.png');
    assert.match(visible(binary.body), /logo\.png is not text \(6 bytes\)/);
  } finally {
    server.close();
    f.clean();
  }
});

// The owner's ruling on the collision between criteria 9 and 15: a card always names the file
// that owns it, and the file route stays exactly as narrow as it is. Where the project keeps its
// handoff out of git, the board names it and does not offer to open it.
test('the board names a handoff the project keeps out of git, and does not link it', () => {
  const f = fixture({
    '.gitignore': '*.local.md\n',
    'docs/product/BRIEF.md': BRIEF('- SC-1 import receipts with the camera'),
    'docs/README.md': '| File | Tier | What it owns |\n|---|---|---|\n| `state/STATE.md` | LIVE | Live state |\n',
    'docs/state/STATE.local.md': '# STATE\n\n- **Now ▶** finish the export screen\n',
  });
  execFileSync('git', ['init', '-q'], { cwd: f.root, stdio: 'ignore' });
  const html = boardPage(f.root);
  assert.equal(html.split('<section class="card">').length - 1, 6, 'the board carries six cards');
  // The sixth card reads the documents of this project and names the file that does the looking.
  assert.match(visible(html), /How the documents point at each other/);
  assert.match(visible(html), /From checks\/links\.mjs/);
  assert.match(visible(html), /Next step finish the export screen/);
  assert.match(visible(html), /From docs\/state\/STATE\.local\.md/);
  assert.doesNotMatch(html, /href="[^"]*STATE\.local/);
  // Criterion 12, across the whole board and not just one card.
  assert.doesNotMatch(html, /<script|onload=|javascript:/i);
  f.clean();
});

test('a project without a brief still gets a board that says so', () => {
  const f = fixture({ 'docs/state/STATE.md': '# STATE\n' });
  const text = visible(boardPage(f.root, { isIgnored: () => false }));
  assert.match(text, /Scope is not defined yet/);
  // A zero that would read as progress on undecided scope. The gates card may honestly report
  // zero of three armed in a bare directory, and does; that is a measured fact, not a blank.
  assert.doesNotMatch(text, /0 of the \d+ things/);
  f.clean();
});
