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
  parseBrief, parseSpec, derive, readProject, renderFull, renderLine,
  readRegistry, writeRegistry, registerProject, cmdLine,
} from './progress.mjs';

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

test('a spec pointing at an unknown scope item is surfaced, not swallowed', () => {
  const p = derive({ scopeItems: items, specs: [{ file: 'ghost', status: 'done', traces: ['SC-9'] }] });
  assert.equal(p.done, 0);
  assert.deepEqual(p.warnings, [{ kind: 'unknownItem', spec: 'ghost' }]);
});

test('two specs claiming one scope item: the furthest wins and the clash is reported', () => {
  const p = derive({
    scopeItems: items,
    specs: [
      { file: 'a', status: 'building', traces: ['SC-1'] },
      { file: 'b', status: 'done', traces: ['SC-1'] },
    ],
  });
  assert.equal(p.items[0].state, 'done');
  assert.deepEqual(p.warnings, [{ kind: 'doubleClaim', title: items[0].title, specs: ['a', 'b'] }]);
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
    specs: [{ file: 'a', status: 'building', traces: ['SC-1'] }, { file: 'b', status: 'done', traces: ['SC-1'] }],
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
