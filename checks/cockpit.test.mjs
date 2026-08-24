#!/usr/bin/env node
// Self-test for the pages beside the board and the server that carries every one of them
// (checks/cockpit-page.mjs and checks/cockpit.mjs): a file as it lies on disk, the notice that
// stands in for a page this server will not give, and the headers and refusals every answer is
// served under. What may be opened is proven next door in checks/cockpit-path.test.mjs; the
// board itself in checks/board.test.mjs and checks/board-strip.test.mjs.
// Run: node --test checks/cockpit.test.mjs

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fixture, visible, get, listen } from './cockpit-fixture.mjs';
import { formatSize, renderFile, renderNotice } from './cockpit-page.mjs';
import { createBoardServer } from './cockpit.mjs';

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

// ---------------------------------------------------------------- the file page

test('a file page says which shelf it was reached from, and gets back to it in one click', () => {
  const html = renderFile(project(), 'docs/product/BRIEF.md', '# BRIEF\n\nThe shoebox.\n');
  const text = visible(html);
  // The file is what the page is for: the whole of it, as it lies on disk.
  assert.match(text, /This file as it is on disk right now, read-only/);
  assert.match(html, /<pre># BRIEF\n\nThe shoebox\.\n<\/pre>/);
  // Where it was reached from, and the one click back to exactly that shelf.
  assert.match(text, /On the shelf Why we build it/);
  assert.match(html, /<a href="\/#shelf-why">Why we build it<\/a>/);
});

test('the shelf a file page names is the one its own path puts it on', () => {
  const on = (path) => visible(renderFile(project(), path, 'x'));
  assert.match(on('docs/work/E-01/F-01/S-01-a.md'), /On the shelf What we are building now/);
  assert.match(on('docs/decisions/0021-agile-first.md'), /On the shelf What we decided and learned/);
  assert.match(on('docs/standards/GLOBAL.md'), /On the shelf How it is built/);
  // A file that stands on no shelf at all - the readers the board names live outside docs/ -
  // goes back to the board itself rather than to a shelf that would be a guess.
  const reader = renderFile(project(), 'checks/links.mjs', 'x');
  assert.match(visible(reader), /Back to the board/);
  assert.doesNotMatch(reader, /#shelf-/);
});

test('a file page speaks the project language', () => {
  const text = visible(renderFile(project({ lang: 'nl' }), 'docs/product/BRIEF.md', 'x'));
  assert.match(text, /alleen-lezen/);
  assert.match(text, /Op de plank Waarom we het bouwen/);
});

test('nothing in a file can execute as markup, and no page runs script', () => {
  const html = renderFile(project(), 'docs/product/BRIEF.md', '<script>alert(1)</script>');
  assert.doesNotMatch(html, /<script>|onload=|javascript:/i);
  assert.match(html, /&lt;script&gt;/);
  // The notice is the other page this file renders, and it is held to the same rule.
  assert.match(visible(renderNotice(project(), 'Not available.')), /Not available\. Back to the board/);
});

test('a size is named in words a reader can use', () => {
  assert.equal(formatSize(12), '12 bytes');
  assert.equal(formatSize(2048), '2 KB');
  assert.equal(formatSize(3 * 1024 * 1024), '3.0 MB');
});

// ---------------------------------------------------------------- the server

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
    // The board is the only page the server builds, and it is built from this project's files.
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
