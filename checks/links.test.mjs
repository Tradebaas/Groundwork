#!/usr/bin/env node
// Self-test for checks/links.mjs: the one definition of a link, and the graph derived from it.
// The definition is shared by the broken-link gate and the board, so it is proven here once,
// in both spellings this project uses, rather than twice through its two callers.
// Run: node --test checks/links.test.mjs

import { mkdtempSync, mkdirSync, writeFileSync, symlinkSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseLinks, linkTargets, linkGraph, readDocuments, renderLinks, HUB_MIN,
} from './links.mjs';

// ---------------------------------------------------------------- what counts as a link

test('both spellings are read, and only what is spelled like a path', () => {
  const links = parseLinks([
    'The brief is [here](../product/BRIEF.md) and the handoff is `docs/state/STATE.md`.',
    'Not pointers: [the site](https://example.com), [mail](mailto:hallo@example.nl),',
    '[the disk](/etc/passwd), [an anchor](#scope).',
    'Not paths: `node checks/check.mjs --all`, `standards/*.md`, `docs/standards/<stack>.md`,',
    '`~/.claude/settings.json`, `@AGENTS.md`, `scope`, `SC-10`, `--serve`.',
    '```',
    'A fenced sample shows [a link](nope.md) and a path `docs/gone.md`; neither points at anything.',
    '```',
  ].join('\n'));
  assert.deepEqual(links.map((l) => `${l.asserted ? 'link' : 'mention'} ${l.target}`), [
    'link ../product/BRIEF.md',
    'mention docs/state/STATE.md',
  ]);
});

test('a fragment is not part of the file, but the failure quotes what was written', () => {
  const [link] = parseLinks('see [scope](../product/BRIEF.md#in-scope)');
  assert.equal(link.target, '../product/BRIEF.md');
  assert.equal(link.raw, '../product/BRIEF.md#in-scope');
});

test('a malformed escape is a broken link, never a crashed check', () => {
  const [link] = parseLinks('see [half](docs/%zz.md)');
  assert.deepEqual(linkTargets('AGENTS.md', link), ['docs/%zz.md']);
});

test('an assertion resolves from its own document, a mention from the document or the root', () => {
  // A markdown link is a hyperlink: an editor and a browser both read it from the file it sits in.
  assert.deepEqual(
    linkTargets('docs/decisions/0001-rulebook.md', { target: '../state/STATE.md', asserted: true }),
    ['docs/state/STATE.md'],
  );
  // A mention is how this project names a file, and it names it both ways: from inside the docs
  // manifest, and spelled out from the root everywhere else.
  assert.deepEqual(
    linkTargets('docs/README.md', { target: 'state/STATE.md', asserted: false }),
    ['docs/state/STATE.md', 'state/STATE.md'],
  );
  assert.deepEqual(
    linkTargets('AGENTS.md', { target: 'docs/state/STATE.md', asserted: false }),
    ['docs/state/STATE.md'],
  );
});

// ---------------------------------------------------------------- the graph

test('both spellings become an edge, counted once, and never to itself', () => {
  const graph = linkGraph([
    {
      path: 'AGENTS.md',
      text: 'The brief `docs/product/BRIEF.md`, said again [here](docs/product/BRIEF.md), and me: `AGENTS.md`.',
    },
    { path: 'docs/product/BRIEF.md', text: 'This one points nowhere.' },
  ]);
  assert.equal(graph.links, 1);
  assert.deepEqual(graph.documents.find((d) => d.path === 'AGENTS.md').outbound, ['docs/product/BRIEF.md']);
  assert.deepEqual(graph.documents.find((d) => d.path === 'docs/product/BRIEF.md').inbound, ['AGENTS.md']);
});

test('a mention that lands on no document is prose, not a link', () => {
  // Groundwork's own documents name files a project creates later. Counting those as links would
  // draw a graph of documents that do not exist.
  const graph = linkGraph([{ path: 'AGENTS.md', text: 'made by `architect`: `docs/product/ARCHITECTURE.md`' }]);
  assert.equal(graph.links, 0);
  assert.deepEqual(graph.orphans, ['AGENTS.md']);
});

test('what nothing points at, and what enough documents point at to be load-bearing', () => {
  const pointer = (n) => ({ path: `docs/decisions/000${n}.md`, text: 'per the rulebook `AGENTS.md`' });
  const graph = linkGraph([
    { path: 'AGENTS.md', text: 'no pointers' },
    { path: 'docs/lonely.md', text: 'no pointers' },
    ...Array.from({ length: HUB_MIN }, (_, i) => pointer(i + 1)),
  ]);
  assert.deepEqual(graph.hubs, [{ path: 'AGENTS.md', count: HUB_MIN }]);
  // A document that points at something is still an orphan when nothing points back at it.
  assert.deepEqual(graph.orphans, [
    ...Array.from({ length: HUB_MIN }, (_, i) => `docs/decisions/000${i + 1}.md`),
    'docs/lonely.md',
  ]);
  // One pointer short is not a hub: "many" is a stated number, not a ranking.
  const thin = linkGraph([
    { path: 'AGENTS.md', text: 'no pointers' },
    ...Array.from({ length: HUB_MIN - 1 }, (_, i) => pointer(i + 1)),
  ]);
  assert.deepEqual(thin.hubs, []);
});

// ---------------------------------------------------------------- reading the documents

test('the documents are the markdown files of the project, and nothing else', () => {
  const root = mkdtempSync(join(tmpdir(), 'groundwork-links-'));
  const put = (p, body) => {
    mkdirSync(dirname(join(root, p)), { recursive: true });
    writeFileSync(join(root, p), body);
  };
  put('AGENTS.md', 'rules\r\nwith windows line endings\r\n');
  put('docs/product/BRIEF.md', 'the brief');
  put('docs/design/logo.svg', '<svg/>');
  put('node_modules/pkg/README.md', 'somebody else code');
  put('.git/COMMIT_EDITMSG.md', 'not a document');
  put('.agents/skills/demo/SKILL.md', 'a skill');
  // The same document under a second name, the way `.claude/skills` mirrors `.agents/skills`.
  // It points at a real file inside the project on purpose: a link into nowhere would prove
  // nothing about whether links are followed. Reading it twice would double every link it
  // carries and invent a document nobody wrote.
  symlinkSync('../AGENTS.md', join(root, 'docs', 'mirror.md'));
  const documents = readDocuments(root);
  assert.deepEqual(documents.map((d) => d.path), [
    '.agents/skills/demo/SKILL.md', 'AGENTS.md', 'docs/product/BRIEF.md',
  ]);
  // A CRLF checkout must read exactly like an LF one, or a link goes missing on Windows.
  assert.equal(documents.find((d) => d.path === 'AGENTS.md').text, 'rules\nwith windows line endings\n');
  rmSync(root, { recursive: true, force: true });
});

// ---------------------------------------------------------------- the one-shot report

test('the printed report answers both directions, and names hubs and orphans', () => {
  const graph = linkGraph([
    { path: 'AGENTS.md', text: 'the brief `docs/product/BRIEF.md`' },
    { path: 'docs/product/BRIEF.md', text: 'nothing here' },
    { path: 'docs/lonely.md', text: 'nothing here either' },
  ]);
  const text = renderLinks({ name: 'Kassaboek', lang: 'en' }, graph);
  assert.match(text, /Kassaboek/);
  assert.match(text, /3 documents, with 1 links between them/);
  assert.match(text, /No document is pointed at by 4 or more others/);
  assert.match(text, /Nothing points at these \(2\)\n {2}- AGENTS\.md\n {2}- docs\/lonely\.md/);
  assert.match(text, /AGENTS\.md\n {4}Points at: docs\/product\/BRIEF\.md\n {4}No document points at it\./);
  assert.match(text, /docs\/product\/BRIEF\.md\n {4}Points at no other document\.\n {4}Pointed at by: AGENTS\.md/);
});

test('a project with no documents says so instead of drawing an empty graph', () => {
  const text = renderLinks({ name: 'Kassaboek', lang: 'en' }, linkGraph([]));
  assert.match(text, /no documents to read yet/);
});

test('the report follows the project language', () => {
  const graph = linkGraph([{ path: 'AGENTS.md', text: 'niks' }]);
  assert.match(renderLinks({ name: 'Kassaboek', lang: 'nl' }, graph), /Hier wijst niets naar/);
});
