// Dated evidence: the facts this project stamps with the day they were checked, and how many of
// those stamps are older than a quarter. The compliance table carries a verified date per regime,
// the register a verified date per row, the stack file the day its sources were read, the backup
// runbook the day the restore was last proven, the agent-security runbook its last review. Each
// is true on the day it was written and rots silently after; the skills say "quarterly" in prose,
// and prose does not count days. This does, and reports the number where the owner already reads
// the floor. Report, never block: a stale stamp is information, and re-verifying is a session
// (`comply`, `maintain`), not a fix a gate can demand at commit time.
//
// defer: the terminal prints this line and the board does not yet. ceiling: a stale stamp shows in
// one place and not the other, the shape E-02/F-01/S-03 removed for waivers. upgrade-when: the next
// board story, which adds the line under the floor the way the floor was added under the gates.

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

// A quarter, in days, with the slack a calendar quarter needs.
export const QUARTER_DAYS = 92;

const ISO = /\d{4}-\d{2}-\d{2}/;
const read = (p) => readFileSync(p, 'utf8');
const lines = (p) => read(p).split('\n');

// Every dated stamp the project carries: { path, line, label, date }. The label is what a reader
// would call the fact, in the words of the file that holds it.
export function datedStamps(root) {
  const stamps = [];
  const add = (path, i, label, date) => stamps.push({ path, line: i + 1, label, date });

  // The regimes table: the second cell of every regime row is the day that row was verified.
  const compliance = join(root, 'docs', 'compliance', 'COMPLIANCE.md');
  if (existsSync(compliance)) {
    lines(compliance).forEach((l, i) => {
      if (!l.startsWith('| **')) return;
      const cells = l.split('|').slice(1, -1).map((c) => c.trim());
      const regime = cells[0].replace(/\*\*/g, '').replace(/\s*\(.*$/, '').trim();
      const m = (cells[1] || '').match(ISO);
      if (m) add('docs/compliance/COMPLIANCE.md', i, `${regime} (regimes table)`, m[0]);
    });
  }

  // The register: a row says when it was verified in its own words.
  const register = join(root, 'docs', 'compliance', 'REGISTER.md');
  if (existsSync(register)) {
    lines(register).forEach((l, i) => {
      for (const m of l.matchAll(/\bverified:?\s*(\d{4}-\d{2}-\d{2})/gi)) {
        const row = l.startsWith('|') ? l.split('|')[1].trim() : 'register';
        add('docs/compliance/REGISTER.md', i, `${row} (register)`, m[1]);
      }
    });
  }

  // The stack file: the day its sources were read. Templates carry no date.
  const standards = join(root, 'docs', 'standards');
  if (existsSync(standards)) {
    for (const f of readdirSync(standards).filter((n) => n.endsWith('.md') && !n.startsWith('TEMPLATE'))) {
      lines(join(standards, f)).forEach((l, i) => {
        const m = l.match(/\*\*Verified:\*\*\s*(\d{4}-\d{2}-\d{2})/);
        if (m) add(`docs/standards/${f}`, i, `${f.replace(/\.md$/, '')} standards, sources read`, m[1]);
      });
    }
  }

  // The runbooks that prove something on a date: the last real restore, the last review of what
  // the agent may reach. A placeholder is not a stamp; the runbook check owns unfilled fields.
  const runbooks = [
    ['docs/operations/backup-restore.md', /\*\*Last real restore:\*\*\s*(\d{4}-\d{2}-\d{2})/, 'last real restore'],
    ['docs/operations/agent-security.md', /Last review:\s*(\d{4}-\d{2}-\d{2})/, 'agent security, last review'],
  ];
  for (const [rel, re, label] of runbooks) {
    const p = join(root, rel);
    if (!existsSync(p)) continue;
    lines(p).forEach((l, i) => {
      const m = l.match(re);
      if (m) add(rel, i, label, m[1]);
    });
  }
  return stamps;
}

const days = (from, to) => Math.floor((to - from) / 86400000);

// The stamps, and the ones older than a quarter on the given day, each with its age.
export function datedEvidence(root, today = new Date()) {
  const stamps = datedStamps(root);
  const stale = stamps
    .map((s) => ({ ...s, ageDays: days(new Date(`${s.date}T00:00:00Z`), today) }))
    .filter((s) => s.ageDays > QUARTER_DAYS);
  return { stamps, stale };
}

// One line the owner reads beside the floor, then one per stale stamp. A project with no stamp
// yet (a fresh copy, before comply and stack have run) has nothing to say, and says nothing.
export function formatEvidence({ stamps, stale }) {
  if (!stamps.length) return [];
  if (!stale.length) return [`evidence: all ${stamps.length} dated facts were verified within the last quarter.`];
  const out = [`evidence: ${stale.length} of the ${stamps.length} dated facts are older than a quarter; re-verify them (comply, maintain) or say why they still hold.`];
  for (const s of stale) {
    out.push(`  - ${s.label}: verified ${s.date}, ${s.ageDays} days ago (${s.path}:${s.line})`);
  }
  return out;
}
