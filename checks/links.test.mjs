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
  parseLinks, linkTargets, linkGraph, readDocuments, projectGraph, renderLinks, HUB_MIN,
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

// ---------------------------------------------------------------- paths that point at nothing

test('a path is only residual when it lands on neither a document nor a file', () => {
  const graph = linkGraph([
    {
      path: 'AGENTS.md',
      text: [
        'A document: `docs/product/BRIEF.md`. A file that is not a document: `checks/check.mjs`.',
        'Myself: `AGENTS.md`. A name a project creates later: `docs/product/ARCHITECTURE.md`,',
        'said twice: `docs/product/ARCHITECTURE.md`. A broken link: [gone](docs/gone.md).',
      ].join('\n'),
    },
    { path: 'docs/product/BRIEF.md', text: 'no pointers' },
  ], { exists: (p) => p === 'checks/check.mjs' });
  // A document, a file and the document itself all land somewhere; the same miss written twice is
  // one thing to fix, not two.
  assert.deepEqual(graph.unresolved, [
    { from: 'AGENTS.md', raw: 'docs/gone.md' },
    { from: 'AGENTS.md', raw: 'docs/product/ARCHITECTURE.md' },
  ]);
});

test('one dead file is one row, however many spellings point at it', () => {
  // A fragment is not part of the file, so a link carrying one is the same claim as the mention
  // beside it: counting both would inflate a number whose whole worth is that it can be acted on.
  const graph = linkGraph([
    { path: 'AGENTS.md', text: 'gone [twice](docs/gone.md#top), and again as `docs/gone.md`.' },
  ]);
  assert.deepEqual(graph.unresolved, [{ from: 'AGENTS.md', raw: 'docs/gone.md#top' }]);
});

test('a record of what was true then cites the past, so its mentions are history, not residual', () => {
  // What a record names is what the project called it at the time, and that citation must not
  // start decaying into the number that exists to catch a rename somebody missed. checks/check.mjs
  // skips these same three directories for the denylist and the phrase bans, for the same reason.
  const graph = linkGraph([
    { path: 'docs/decisions/0003-state-on-disk.md', text: 'we wrote `DEBT.md` and `INTAKE.md` then' },
    { path: 'docs/specs/archive/001-old/spec.md', text: 'it read `docs/old/PLAN.md` at the time' },
    { path: 'docs/state/log/2026-07.md', text: 'that session touched `checks/gone.mjs`' },
    { path: 'AGENTS.md', text: 'the ledger `docs/state/DEBT.md`' },
  ]);
  assert.deepEqual(graph.unresolved, [{ from: 'AGENTS.md', raw: 'docs/state/DEBT.md' }]);
});

test('a record still asserts what it makes clickable, so a broken link there is still reported', () => {
  // The gate fails on an asserted link wherever it is written (checks/check.mjs, links), so the
  // report has to name it too, or the two would describe the same file differently.
  const graph = linkGraph([
    { path: 'docs/decisions/0003-state-on-disk.md', text: 'see [the ledger](../state/DEBT.md), once `DEBT.md`' },
  ]);
  assert.deepEqual(graph.unresolved, [{ from: 'docs/decisions/0003-state-on-disk.md', raw: '../state/DEBT.md' }]);
});

test('without a filesystem to ask, every path that is no document counts as residual', () => {
  // The derivation stays pure: the default answers "no such file", so a caller that forgets to
  // pass the question gets an over-count it can see, never a silently emptied number.
  const graph = linkGraph([{ path: 'AGENTS.md', text: 'the runner `checks/check.mjs`' }]);
  assert.deepEqual(graph.unresolved, [{ from: 'AGENTS.md', raw: 'checks/check.mjs' }]);
});

test('the project graph asks the working tree, and never outside the project', () => {
  const outside = mkdtempSync(join(tmpdir(), 'groundwork-residual-'));
  const root = join(outside, 'project');
  const put = (p, body) => {
    mkdirSync(dirname(join(root, p)), { recursive: true });
    writeFileSync(join(root, p), body);
  };
  put('AGENTS.md', [
    'The runner `checks/check.mjs` and the brief `docs/product/BRIEF.md` both exist.',
    'The neighbour [next door](../neighbour.md) is not this project, and neither is `docs/gone.md`.',
  ].join('\n'));
  // Every spelling of the same climb. A test for the `../` prefix alone would pass all three of
  // the climbs and call a directory outside the root an answer. `..` from a document one level
  // down is the project root itself, so it resolves: the rule is where a path lands, not how it
  // is spelled.
  put('docs/deep.md', 'Up: [root](..), [two](../..), [encoded](%2e%2e/%2e%2e), [back](..\\..).');
  put('docs/product/BRIEF.md', 'the brief');
  put('checks/check.mjs', '// the runner');
  // A real file one level up. Resolving it would read outside the root, and would answer "that
  // path is fine" about a file the project does not have.
  writeFileSync(join(outside, 'neighbour.md'), 'not this project');
  assert.deepEqual(projectGraph(root).unresolved, [
    { from: 'AGENTS.md', raw: '../neighbour.md' },
    { from: 'AGENTS.md', raw: 'docs/gone.md' },
    { from: 'docs/deep.md', raw: '../..' },
    { from: 'docs/deep.md', raw: '..\\..' },
    { from: 'docs/deep.md', raw: '%2e%2e/%2e%2e' },
  ]);
  rmSync(outside, { recursive: true, force: true });
});

test('a control character in a path never reaches the terminal as one', () => {
  // The report prints what a document wrote. A terminal is a sink, so an escape sequence smuggled
  // between backticks would repaint the report around the finding it names.
  const graph = linkGraph([{ path: 'AGENTS.md', text: 'hidden `docs/\x1bcgone.md`' }]);
  const text = renderLinks({ name: 'Kassaboek', lang: 'en' }, graph);
  assert.match(text, /- AGENTS\.md: docs\/cgone\.md/);
  // Everything a control character can be, except the newlines the report is built from.
  assert.doesNotMatch(text, /[\x00-\x09\x0b-\x1f\x7f]/);
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

test('the printed report states the residual as a number, and why a skill has no inbound path', () => {
  const graph = linkGraph([
    { path: 'AGENTS.md', text: 'made by `architect`: `docs/product/ARCHITECTURE.md`' },
    { path: '.agents/skills/architect/SKILL.md', text: 'the brief `docs/product/BRIEF.md`' },
    { path: 'docs/product/BRIEF.md', text: 'nothing here' },
  ]);
  const text = renderLinks({ name: 'Kassaboek', lang: 'en' }, graph);
  assert.match(text, /Paths that point at nothing \(1\)\n {2}- AGENTS\.md: docs\/product\/ARCHITECTURE\.md/);
  assert.match(text, /a name shortened to its bare filename, or prose shaped like a path/);
  // The orphan list is mostly by design, and the clause is what keeps a reader from deleting a
  // skill file because no path leads to it.
  assert.match(text, /the rulebook names a skill by its name/);
  // Nothing left over is said as plainly as a number, so the card never goes quiet on the question.
  const clean = renderLinks({ name: 'Kassaboek', lang: 'en' }, linkGraph([
    { path: 'AGENTS.md', text: 'the brief `docs/product/BRIEF.md`' },
    { path: 'docs/product/BRIEF.md', text: 'the rulebook `AGENTS.md`' },
  ]));
  assert.match(clean, /Every path spelled out lands on a document or on a file\./);
  assert.match(clean, /Every document is pointed at by at least one other\./);
  assert.doesNotMatch(clean, /the rulebook names a skill by its name/);
});

test('a project with no documents says so instead of drawing an empty graph', () => {
  const text = renderLinks({ name: 'Kassaboek', lang: 'en' }, linkGraph([]));
  assert.match(text, /no documents to read yet/);
});

test('the report follows the project language', () => {
  const graph = linkGraph([{ path: 'AGENTS.md', text: 'niks' }]);
  assert.match(renderLinks({ name: 'Kassaboek', lang: 'nl' }, graph), /Hier wijst niets naar/);
});
