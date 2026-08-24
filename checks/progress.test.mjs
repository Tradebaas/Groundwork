#!/usr/bin/env node
// Self-test for checks/progress.mjs. The report is only useful if it is honest, so every
// failure mode named in the spec is proven here, not assumed.
// Run: node --test checks/progress.test.mjs

import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseBrief, parseSpec, parseManifest, manifestMatcher, derive, readProject,
  readRegistry, writeRegistry, registerProject, cmdLine, isSpecPath,
} from './progress.mjs';
import { renderFull, renderLine, warningText, WORDS } from './progress-report.mjs';

const BRIEF = (items) => `# BRIEF

## Product

- **Name:** Kassaboek

## In scope

${items}

## Out of scope, explicitly

- SC-99 never mentioned here as scope
`;

function fixture(files = {}) {
  const root = mkdtempSync(join(tmpdir(), 'groundwork-progress-'));
  const put = (p, body) => {
    mkdirSync(dirname(join(root, p)), { recursive: true });
    writeFileSync(join(root, p), body);
  };
  for (const [p, body] of Object.entries(files)) put(p, body);
  return { root, put };
}

const spec = (status, traces) => `# 001: something

- **Status:** ${status}
- **Traces to:** ${traces}
`;

// ---------------------------------------------------------------- reading

test('brief: scope items are read with their own wording', () => {
  const b = parseBrief(BRIEF('- SC-1 bonnen importeren met de camera\n- SC-2 maandoverzicht per klant'));
  assert.equal(b.name, 'Kassaboek');
  assert.deepEqual(b.items.map((i) => i.id), ['SC-1', 'SC-2']);
  assert.equal(b.items[0].title, 'bonnen importeren met de camera');
});

// A testable capability rarely fits on one line. The overview quotes these back to the owner
// verbatim, so half a sentence is a broken report, not a cosmetic issue.
test('brief: a scope item wrapped over several lines is read whole', () => {
  const b = parseBrief(BRIEF([
    '- SC-1 de eigenaar ziet per project de uren,',
    '  filterbaar per maand,',
    '  zonder de repo te openen',
    '- SC-2 maandoverzicht per klant',
  ].join('\n')));
  assert.equal(b.items[0].title, 'de eigenaar ziet per project de uren, filterbaar per maand, zonder de repo te openen');
  assert.equal(b.items.length, 2);
});

test('brief: an unfilled template is not scope', () => {
  const b = parseBrief(BRIEF('- SC-1 TBD'));
  assert.deepEqual(b.items, []);
  assert.equal(b.placeholders, 1);
});

test('brief: out-of-scope items are not counted as scope', () => {
  const b = parseBrief(BRIEF('- SC-1 een echt scope-punt'));
  assert.equal(b.items.length, 1);
});

test('spec: status and traces are read; the bare template is not a status', () => {
  assert.deepEqual(parseSpec(spec('done', 'BRIEF SC-2')), { status: 'done', traces: ['SC-2'], tracesDeclared: true });
  assert.equal(parseSpec(spec('draft | approved | building | done | dropped', 'BRIEF SC-<n>')).status, null);
});

// ---------------------------------------------------------------- deriving

const items = [
  { id: 'SC-1', title: 'importeren' },
  { id: 'SC-2', title: 'overzicht' },
  { id: 'SC-3', title: 'export' },
];

// The manifest is the one table saying which file owns which fact. The docs-manifest gate fails
// when no row covers a file; the board reads the covering row's sentence onto a shelf. Both ask
// the matcher below, so a row one of them can see is a row the other can see too.
test('manifest: a row is a backticked path, a tier and a sentence, header and divider aside', () => {
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

test('manifest: which row covers a file, by name and by pattern, and what covers nothing', () => {
  const covers = manifestMatcher([
    { path: 'decisions/TEMPLATE.md', tier: 'REF', owns: 'The skeleton' },
    { path: 'decisions/[0-9]*.md', tier: 'REF', owns: 'Decision records, numbered' },
    { path: 'specs/archive/**', tier: 'ARCHIVE', owns: 'Shipped specs' },
  ]);
  assert.equal(covers('decisions/0021-agile-first.md').owns, 'Decision records, numbered');
  assert.equal(covers('specs/archive/000-baseline/spec.md').owns, 'Shipped specs');
  // A file named in full carries its own sentence, even where a pattern would also catch it.
  assert.equal(covers('decisions/TEMPLATE.md').owns, 'The skeleton');
  // A single star stops at the folder boundary; a file no row covers is answered as such.
  assert.equal(covers('decisions/deeper/0001-x.md'), null);
  assert.equal(covers('tools/handy.md'), null);
});

test('a scope item is done, in progress, or not started', () => {
  const p = derive({
    scopeItems: items,
    specs: [
      { file: 'a', status: 'done', traces: ['SC-1'] },
      { file: 'b', status: 'building', traces: ['SC-2'] },
    ],
  });
  assert.deepEqual(p.items.map((i) => i.state), ['done', 'doing', 'todo']);
  assert.deepEqual([p.done, p.doing, p.todo, p.total], [1, 1, 1, 3]);
});

test('a dropped spec leaves its scope item not started', () => {
  const p = derive({ scopeItems: items, specs: [{ file: 'a', status: 'dropped', traces: ['SC-1'] }] });
  assert.equal(p.items[0].state, 'todo');
  assert.equal(p.done, 0);
});

// The worked example that ships with Groundwork is fiction carrying the fictional brief's
// SC-ids. Once a real project defines the same id, counting it would credit the owner with work
// nobody did, and before that it would nag about a spec pointing at nothing. Neither happens.
test('the worked example is never counted as this project work, and never warned about', () => {
  const example = { file: '007-pickup-slots', status: 'example', traces: ['SC-1', 'SC-9'] };
  const p = derive({ scopeItems: items, specs: [example] });
  assert.deepEqual([p.done, p.doing, p.todo], [0, 0, 3]);
  assert.deepEqual(p.warnings, []);
});

test('a spec pointing at an unknown scope item is surfaced, not swallowed', () => {
  const p = derive({ scopeItems: items, specs: [{ file: 'ghost', status: 'done', traces: ['SC-9'] }] });
  assert.equal(p.done, 0);
  assert.deepEqual(p.warnings, [{ kind: 'unknownItem', spec: 'ghost' }]);
});

test('two unfinished specs claiming one scope item: the furthest wins and the clash is reported', () => {
  const p = derive({
    scopeItems: items,
    specs: [
      { file: 'a', status: 'building', traces: ['SC-1'] },
      { file: 'b', status: 'approved', traces: ['SC-1'] },
    ],
  });
  assert.equal(p.items[0].state, 'doing');
  assert.deepEqual(p.warnings, [{ kind: 'doubleClaim', title: items[0].title, specs: ['a', 'b'] }]);
});

test('a later spec supersedes a finished claim: the item still counts done, and nobody is warned', () => {
  const p = derive({
    scopeItems: items,
    specs: [
      { file: 'shipped-it-first', status: 'done', traces: ['SC-1'] },
      { file: 'doing-it-again', status: 'building', traces: ['SC-1'] },
    ],
  });
  assert.equal(p.items[0].state, 'done');
  assert.deepEqual(p.warnings, []);
});

test('two finished specs on one scope item are history, not a clash', () => {
  const p = derive({
    scopeItems: items,
    specs: [
      { file: 'a', status: 'done', traces: ['SC-1'] },
      { file: 'b', status: 'done', traces: ['SC-1'] },
    ],
  });
  assert.equal(p.items[0].state, 'done');
  assert.deepEqual(p.warnings, []);
});

test('no scope items means not defined, never a zero count', () => {
  const p = derive({ scopeItems: [], specs: [] });
  assert.equal(p.defined, false);
});

// ---------------------------------------------------------------- rendering

const project = (over = {}) => ({ name: 'Kassaboek', lang: 'nl', now: 'PDF-export afmaken', ...over });

test('the full report uses whole sentences and no internal identifiers', () => {
  const progress = derive({
    scopeItems: items,
    specs: [{ file: 'a', status: 'done', traces: ['SC-1'] }, { file: 'b', status: 'building', traces: ['SC-2'] }],
  });
  const text = renderFull(project(), progress);
  assert.match(text, /1 van de 3 dingen zijn klaar/);
  assert.match(text, /importeren/);
  assert.doesNotMatch(text, /SC-\d|building|status/i);
});

// The report's promise is that the owner reads it without translating. The warnings used to
// escape that promise, speaking in SC-ids and spec statuses to the one person who cannot use them.
test('warnings speak the project language and name no internal identifiers', () => {
  const drifted = derive({ scopeItems: items, specs: [{ file: '002-drift', status: 'building', traces: ['SC-9'] }] });
  const nl = renderFull(project(), drifted);
  assert.match(nl, /Let op/);
  assert.match(nl, /het plan "002-drift" levert iets op wat niet in de brief staat/);
  assert.doesNotMatch(nl, /SC-\d|building/i);

  const clash = derive({
    scopeItems: items,
    specs: [{ file: 'a', status: 'building', traces: ['SC-1'] }, { file: 'b', status: 'draft', traces: ['SC-1'] }],
  });
  const en = renderFull(project({ lang: 'en' }), clash);
  assert.match(en, /is being worked on from 2 plans at once \(a, b\)/);
  assert.doesNotMatch(en, /SC-\d|building/i);
});

test('an undefined scope says so instead of reporting progress', () => {
  const text = renderFull(project(), derive({ scopeItems: [], specs: [] }));
  assert.match(text, /scope is nog niet bepaald/i);
  assert.doesNotMatch(text, /0 van de/);
});

test('the one-liner stays within its length limit', () => {
  const long = Array.from({ length: 8 }, (_, n) => ({ id: `SC-${n + 1}`, title: 'a scope item with a deliberately very long description '.repeat(2) }));
  const line = renderLine(project(), derive({ scopeItems: long, specs: [] }));
  assert.ok(line.length <= 120, `line was ${line.length} chars`);
  assert.match(line, /^Kassaboek: 0 van de 8 klaar/);
});

test('the one-liner carries a heads-up marker, and keeps it when the line is truncated', () => {
  const drifted = { file: 'a', status: 'building', traces: ['SC-9'] };
  const short = renderLine(project(), derive({ scopeItems: items, specs: [drifted] }));
  assert.match(short, /⚠ 1× let op$/);
  assert.match(renderLine(project({ lang: 'en' }), derive({ scopeItems: items, specs: [drifted] })), /⚠ 1 heads-up$/);

  const long = Array.from({ length: 8 }, (_, n) => ({ id: `SC-${n + 1}`, title: 'a scope item with a deliberately very long description '.repeat(2) }));
  const line = renderLine(project(), derive({ scopeItems: long, specs: [drifted] }));
  assert.ok(line.length <= 120, `line was ${line.length} chars`);
  assert.match(line, /\.\.\. · ⚠ 1× let op$/);
});

test('framing words follow the project language, English by default', () => {
  const progress = derive({ scopeItems: items, specs: [] });
  assert.match(renderLine(project({ lang: 'en' }), progress), /0 of 3 done/);
  assert.match(renderLine(project(), progress), /0 van de 3 klaar/);
});

// ---------------------------------------------------------------- what counts as a spec

// Archiving is where a spec ends up, not what kind of document it is: `spec` §6 tells every
// finished spec to move to docs/specs/archive/, so both shapes have to survive the move. The
// exclusions matter just as much: a folder spec keeps its tickets beside it, and those are not
// specs of their own - counting them would report work that no scope item ever asked for.
test('a spec is recognised by shape, in the archive as well as outside it', () => {
  for (const p of [
    'docs/specs/008-status.md',
    'docs/specs/008-status.local.md',
    'docs/specs/007-pickup/spec.md',
    'docs/specs/archive/009-discovery.local.md',
    'docs/specs/archive/000-baseline/spec.md',
  ]) assert.equal(isSpecPath(p), true, `${p} must count as a spec`);

  for (const p of [
    'docs/specs/TEMPLATE.md',
    'docs/specs/TEMPLATE-TICKET.md',
    'docs/specs/007-pickup/tickets/01-slot-picker.md',
    'docs/specs/archive/007-pickup/tickets/01-slot-picker.md',
    'docs/specs/archive/007-pickup/TEMPLATE.md',
    'docs/product/BRIEF.md',
  ]) assert.equal(isSpecPath(p), false, `${p} must not count as a spec`);
});

// A warning has to name its own evidence: the spec it points at is the only thing telling the
// owner where to look. A folder spec is known by its folder, a single-file spec by its file name,
// and archive/ is a spec root exactly like docs/specs/ is - so an archived single-file spec has to
// keep its own name instead of reporting itself as "archive", which names no document at all.
test('a spec is named by its own name in the archive too', () => {
  const { root } = fixture({
    'docs/product/BRIEF.md': BRIEF('- SC-1 bonnen importeren'),
    'docs/specs/archive/002-overzicht.local.md': spec('done', 'BRIEF SC-9'),
  });
  assert.deepEqual(derive(readProject(root)).warnings, [
    { kind: 'unknownItem', spec: '002-overzicht.local.md' },
  ]);
  rmSync(root, { recursive: true, force: true });
});

// ---------------------------------------------------------------- whole project

test('a real project directory is read end to end', () => {
  const { root } = fixture({
    'docs/product/BRIEF.md': BRIEF('- SC-1 bonnen importeren\n- SC-2 maandoverzicht'),
    'docs/specs/001-import/spec.md': spec('done', 'BRIEF SC-1'),
    'docs/specs/archive/000-old/spec.md': spec('done', 'BRIEF SC-2'),
    'docs/specs/TEMPLATE.md': spec('draft | approved | done', 'BRIEF SC-<n>'),
    'docs/state/STATE.md': '# STATE\n\n- **Now ▶** de export afmaken\n',
    'docs/design/VOICE.md': '- **Product language:** Nederlands · **Register:** je\n',
  });
  const p = readProject(root);
  assert.equal(p.lang, 'nl');
  assert.equal(p.now, 'de export afmaken');
  // Shipped work lives in the archive; it must keep counting as done.
  assert.equal(derive(p).done, 2);
  rmSync(root, { recursive: true, force: true });
});

// The defect this proves: a single-file spec that obeys `spec` §6 and moves to archive/ on done
// used to leave the derived set entirely, so its scope item silently flipped back to not started.
// Obeying the framework's own instruction must never cost a finished item.
test('a single-file spec keeps counting after it is archived on done', () => {
  const files = {
    'docs/product/BRIEF.md': BRIEF('- SC-1 bonnen importeren\n- SC-2 maandoverzicht'),
    'docs/specs/001-import/spec.md': spec('done', 'BRIEF SC-1'),
    'docs/state/STATE.md': '# STATE\n',
  };
  const before = fixture({ ...files, 'docs/specs/002-overzicht.md': spec('done', 'BRIEF SC-2') });
  const after = fixture({ ...files, 'docs/specs/archive/002-overzicht.md': spec('done', 'BRIEF SC-2') });
  assert.equal(derive(readProject(before.root)).done, 2);
  assert.equal(derive(readProject(after.root)).done, 2, 'archiving a spec must not undo the work');
  rmSync(before.root, { recursive: true, force: true });
  rmSync(after.root, { recursive: true, force: true });
});

test('a missing brief does not crash the report', () => {
  const { root } = fixture({ 'docs/state/STATE.md': '# STATE\n' });
  assert.equal(derive(readProject(root)).defined, false);
  rmSync(root, { recursive: true, force: true });
});

// ---------------------------------------------------------------- project list

test('the project list tolerates a missing or malformed file', () => {
  const { root } = fixture({ 'bad.json': 'not json at all' });
  assert.deepEqual(readRegistry(join(root, 'nope.json')), {});
  assert.deepEqual(readRegistry(join(root, 'bad.json')), {});
  rmSync(root, { recursive: true, force: true });
});

test('the proactive line stays quiet when nothing moved, but keeps reporting an open heads-up', () => {
  const clean = fixture({
    'docs/product/BRIEF.md': BRIEF('- SC-1 bonnen importeren'),
    'docs/specs/001-import/spec.md': spec('building', 'BRIEF SC-1'),
  });
  const file = join(clean.root, 'list.json');
  assert.match(cmdLine(clean.root, file), /0 of 1 done/);
  assert.equal(cmdLine(clean.root, file), null, 'an unchanged stand must not repeat');

  // Same project, now with work pointing outside the brief: the line must come back every turn.
  clean.put('docs/specs/002-drift/spec.md', spec('building', 'BRIEF SC-9'));
  const first = cmdLine(clean.root, file);
  assert.match(first, /⚠/);
  assert.equal(cmdLine(clean.root, file), first, 'an open heads-up must survive the dedupe');
  rmSync(clean.root, { recursive: true, force: true });
});

test('registering is idempotent', () => {
  const { root } = fixture({});
  const file = join(root, 'list.json');
  assert.equal(registerProject('/tmp/demo-project', file), true);
  assert.equal(registerProject('/tmp/demo-project', file), false);
  assert.deepEqual(Object.keys(readRegistry(file)), ['/tmp/demo-project']);
  writeRegistry({ '/tmp/other': { lastLine: null } }, file);
  assert.deepEqual(Object.keys(readRegistry(file)), ['/tmp/other']);
  rmSync(root, { recursive: true, force: true });
});
