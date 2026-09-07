#!/usr/bin/env node
// Self-test for the dated-evidence reader (checks/evidence.mjs): every stamp the project carries
// is found where it lives, its age is counted against a fixed day, the ones older than a quarter
// are named with their place, a placeholder is not a stamp, and a project with no stamp says
// nothing at all.

import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { datedStamps, datedEvidence, formatEvidence, QUARTER_DAYS, phaseOf, runbookPlaceholders, formatRunbooks } from './evidence.mjs';

function fixture(files = {}) {
  const root = mkdtempSync(join(tmpdir(), 'groundwork-evidence-'));
  for (const [p, body] of Object.entries(files)) {
    mkdirSync(dirname(join(root, p)), { recursive: true });
    writeFileSync(join(root, p), body);
  }
  return { root, clean: () => rmSync(root, { recursive: true, force: true }) };
}

const TODAY = new Date('2026-09-07T12:00:00Z');

const FILES = {
  'docs/compliance/COMPLIANCE.md': '# COMPLIANCE\n\n| Regime | Dates verified | Applies when | Key obligations |\n|---|---|---|---|\n'
    + '| **GDPR / AVG** (2016/679) | 2026-07-22 | any personal data | in force |\n'
    + '| **EU AI Act** (2024/1689) | 2026-09-01 | any AI feature | Art 50 |\n',
  'docs/compliance/REGISTER.md': '# Register\n\n| Id | Regime | Obligation | Status | Evidence |\n|---|---|---|---|---|\n'
    + '| C-4 | PLD | liability | n/a | Art 2(2) excludes it. Verified 2026-03-01. |\n'
    + '| C-5 | GDPR | minimisation | met | index.html, verified 2026-08-30: no cookies. |\n',
  'docs/standards/node.md': '# Node standards\n\n- **Stack:** Node · **Platform:** no · **Verified:** 2026-05-05\n',
  'docs/standards/TEMPLATE-STACK.md': '# TEMPLATE\n\n- **Verified:** 2020-01-01\n',
  'docs/operations/backup-restore.md': '# Backup\n\n- **Last real restore:** 2026-08-20 - the owner, into staging, fine\n',
  'docs/operations/agent-security.md': '# Agent security\n\nLast review: <date, by whom>.\n',
};

test('every stamp is found where it lives, and a template or a placeholder is not one', () => {
  const f = fixture(FILES);
  const stamps = datedStamps(f.root);
  assert.deepEqual(stamps.map((s) => [s.label, s.date]), [
    ['GDPR / AVG (regimes table)', '2026-07-22'],
    ['EU AI Act (regimes table)', '2026-09-01'],
    ['C-4 (register)', '2026-03-01'],
    ['C-5 (register)', '2026-08-30'],
    ['node standards, sources read', '2026-05-05'],
    ['last real restore', '2026-08-20'],
  ]);
  assert.ok(stamps.every((s) => s.line > 0 && s.path.startsWith('docs/')));
  f.clean();
});

test('the ones older than a quarter are named with their age and their place', () => {
  const f = fixture(FILES);
  const { stamps, stale } = datedEvidence(f.root, TODAY);
  assert.equal(stamps.length, 6);
  assert.deepEqual(stale.map((s) => s.label), ['C-4 (register)', 'node standards, sources read']);
  assert.equal(stale[0].ageDays, 190);
  const text = formatEvidence({ stamps, stale });
  assert.equal(text[0], 'evidence: 2 of the 6 dated facts are older than a quarter, or not a day that has passed; re-verify them (comply, maintain) or say why they still hold.');
  assert.match(text[1], /^  - C-4 \(register\): verified 2026-03-01, 190 days ago \(docs\/compliance\/REGISTER\.md:5\)$/);
  assert.match(text[2], /node standards, sources read: verified 2026-05-05, 125 days ago/);
  f.clean();
});

test('a date that is not a day that has passed needs a look too, and is said so', () => {
  const f = fixture({ 'docs/standards/x.md': '- **Verified:** 2026-13-45\n', 'docs/standards/y.md': '- **Verified:** 2099-01-01\n' });
  const { stale } = datedEvidence(f.root, TODAY);
  assert.equal(stale.length, 2);
  const text = formatEvidence(datedEvidence(f.root, TODAY));
  assert.match(text[0], /^evidence: 2 of the 2 dated facts/);
  assert.match(text[1], /x standards, sources read: "2026-13-45" is not a day that has passed/);
  assert.match(text[2], /"2099-01-01" is not a day that has passed/);
  f.clean();
});

test('a quarter is the boundary: the day after it is stale, the day itself is not', () => {
  const on = (date) => datedEvidence(fixture({
    'docs/standards/x.md': `- **Verified:** ${date}\n`,
  }).root, TODAY).stale.length;
  const edge = new Date(TODAY); edge.setUTCDate(edge.getUTCDate() - QUARTER_DAYS);
  const over = new Date(TODAY); over.setUTCDate(over.getUTCDate() - QUARTER_DAYS - 1);
  assert.equal(on(edge.toISOString().slice(0, 10)), 0);
  assert.equal(on(over.toISOString().slice(0, 10)), 1);
});

test('unfilled runbook fields are counted once the phase is deliver or maintain, and not before', () => {
  const RUNBOOK = '# Backup\n\n<!-- TEMPLATE: fill <every field> before first delivery. -->\n\n'
    + '- **Data:** <what and where>\n- **Schedule:** <how often>\n1. `git tag -a vX.Y.Z <sha>` is not a field\n- **Last real restore:** <date> - <who>\n';
  const shipped = fixture({
    'docs/state/STATE.md': '# STATE\n\n- **Phase:** maintain. Since 2026-08-01.\n',
    'docs/operations/backup-restore.md': RUNBOOK,
    'docs/operations/access.md': '# Access\n\n| <e.g. hosting> | <console> |\n',
    'docs/operations/evidence-drill.md': '# Drill\n\n<not counted: the framework\'s own>\n',
  });
  assert.equal(phaseOf(shipped.root), 'maintain');
  const found = runbookPlaceholders(shipped.root);
  assert.deepEqual(found.map((p) => [p.path, p.line, p.fields]), [
    ['docs/operations/backup-restore.md', 5, 1],
    ['docs/operations/backup-restore.md', 6, 1],
    ['docs/operations/backup-restore.md', 8, 2],
    ['docs/operations/access.md', 3, 2],
  ]);
  assert.deepEqual(formatRunbooks(shipped.root), [
    'runbooks: 6 fields still hold the template\'s placeholders in backup-restore.md, access.md while the phase is maintain; deliver fills them before a release, maintain keeps them true.',
  ]);
  shipped.clean();
  const building = fixture({
    'docs/state/STATE.md': '# STATE\n\n- **Phase:** build\n',
    'docs/operations/backup-restore.md': RUNBOOK,
  });
  assert.deepEqual(formatRunbooks(building.root), []);
  building.clean();
  const filled = fixture({
    'docs/state/STATE.md': '# STATE\n\n- **Phase:** deliver\n',
    'docs/operations/backup-restore.md': '# Backup\n\n- **Data:** the orders database\n- **Last real restore:** 2026-08-20 - the owner\n',
  });
  assert.deepEqual(formatRunbooks(filled.root), []);
  filled.clean();
});

test('all fresh is said in one line, and no stamp at all is said with silence', () => {
  const fresh = fixture({ 'docs/standards/x.md': '- **Verified:** 2026-09-01\n' });
  assert.deepEqual(formatEvidence(datedEvidence(fresh.root, TODAY)),
    ['evidence: all 1 dated facts were verified within the last quarter.']);
  fresh.clean();
  const empty = fixture({ 'docs/compliance/TEMPLATE-REGISTER.md': '# blank\n' });
  assert.deepEqual(formatEvidence(datedEvidence(empty.root, TODAY)), []);
  empty.clean();
});
