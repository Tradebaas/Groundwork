#!/usr/bin/env node
// Self-test for the cockpit: the path decision, the board's cards, and the server that carries
// them (checks/cockpit-path.mjs, cockpit-page.mjs, cockpit.mjs).
// The file route is the one place where this repository serves anything at all, so its decision
// is proven here directly, in every spelling that has ever been used to leave a root. The board itself is proven to keep its promise: the owner's
// own sentences, a named card instead of an empty one, and no card taking the page down.
// Run: node --test checks/cockpit.test.mjs

import { mkdtempSync, mkdirSync, writeFileSync, symlinkSync, unlinkSync, rmSync, realpathSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { request as httpRequest } from 'node:http';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { decidePath, hostAllowed } from './cockpit-path.mjs';
import {
  escapeHtml, formatSize, card, progressCard, goalCard, nextStepCard, fileMapCard, gatesCard,
  renderBoard, boardPage,
} from './cockpit-page.mjs';
import { createBoardServer } from './cockpit.mjs';
import { derive, parseManifest } from './progress.mjs';

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

function fixture(files = {}) {
  const root = mkdtempSync(join(tmpdir(), 'groundwork-cockpit-'));
  const put = (p, body) => {
    mkdirSync(dirname(join(root, p)), { recursive: true });
    writeFileSync(join(root, p), body);
  };
  for (const [p, body] of Object.entries(files)) put(p, body);
  return { root, put, clean: () => rmSync(root, { recursive: true, force: true }) };
}

const project = (over = {}) => ({ name: 'Kassaboek', lang: 'en', now: null, ...over });
const items = [
  { id: 'SC-1', title: 'import receipts with the camera' },
  { id: 'SC-2', title: 'a monthly overview per customer' },
  { id: 'SC-3', title: 'export to the accountant' },
];
// What a reader actually sees, with the markup taken away.
const visible = (html) => html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

// ---------------------------------------------------------------- the path decision

test('a normal project file inside the root is served', () => {
  const f = fixture({ 'docs/product/BRIEF.md': BRIEF('- SC-1 iets') });
  const d = decidePath(f.root, 'docs/product/BRIEF.md', { isIgnored: () => false });
  assert.equal(d.ok, true);
  assert.equal(d.rel, 'docs/product/BRIEF.md');
  f.clean();
});

// Every spelling that has ever walked out of a document root. The answer is identical each
// time, so a caller learns nothing from which refusal it got.
test('a path that leaves the root is refused, in every spelling', () => {
  const f = fixture({ 'docs/inside.md': 'inside' });
  writeFileSync(join(f.root, '..', 'groundwork-cockpit-outside.md'), 'secret');
  const nope = { isIgnored: () => false };
  for (const spelling of [
    '../groundwork-cockpit-outside.md',
    'docs/../../groundwork-cockpit-outside.md',
    './../groundwork-cockpit-outside.md',
    '..%2Fgroundwork-cockpit-outside.md',
    '%2e%2e/groundwork-cockpit-outside.md',
    '..\\groundwork-cockpit-outside.md',
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
  rmSync(join(f.root, '..', 'groundwork-cockpit-outside.md'), { force: true });
  f.clean();
});

// A link is judged by where it lands, not by where it sits.
test('a symlink whose target is outside the root is refused', () => {
  const f = fixture({ 'docs/inside.md': 'inside' });
  const outside = join(f.root, '..', 'groundwork-cockpit-target.md');
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
  const loop = join(f.root, '..', 'groundwork-cockpit-loop');
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
  writeFileSync(join(f.root, 'docs/design/reference/logo.png'), Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x00, 0x1a]));
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
  assert.equal(html.split('<section class="card">').length - 1, 5, 'the board carries five cards');
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
