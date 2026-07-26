#!/usr/bin/env node
// Self-test for checks/cockpit.mjs. The file route is the one place where this repository
// serves anything at all, so its decision is proven here directly, in every spelling that has
// ever been used to leave a root. The board itself is proven to keep its promise: the owner's
// own sentences, a named card instead of an empty one, and no card taking the page down.
// Run: node --test checks/cockpit.test.mjs

import { mkdtempSync, mkdirSync, writeFileSync, symlinkSync, unlinkSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { request as httpRequest } from 'node:http';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  decidePath, hostAllowed, escapeHtml, formatSize,
  card, progressCard, renderBoard, boardPage, createBoardServer,
} from './cockpit.mjs';
import { derive } from './progress.mjs';

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
    join(f.root, 'docs', 'inside.md'),
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

test('a project without a brief still gets a board that says so', () => {
  const f = fixture({ 'docs/state/STATE.md': '# STATE\n' });
  const text = visible(boardPage(f.root, { isIgnored: () => false }));
  assert.match(text, /Scope is not defined yet/);
  assert.doesNotMatch(text, /0 of the/);
  f.clean();
});
