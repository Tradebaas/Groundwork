// Dated evidence: the facts this project stamps with the day they were checked, and how many of
// those stamps are older than a quarter. The compliance table carries a verified date per regime,
// the register a verified date per row, the stack file the day its sources were read, the backup
// runbook the day the restore was last proven, the agent-security runbook its last review. Each
// is true on the day it was written and rots silently after; the skills say "quarterly" in prose,
// and prose does not count days. This does, and reports the number where the owner already reads
// the floor. Report, never block: a stale stamp is information, and re-verifying is a session
// (`comply`, `maintain`), not a fix a gate can demand at commit time. The board renders the same
// two lines from the same reads (checks/board-strip.mjs), in the words below, so a stale stamp
// cannot show in one place and not the other.

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { HANDOFF_PATHS } from './progress.mjs';

// A quarter, in days, with the slack a calendar quarter needs.
export const QUARTER_DAYS = 92;

// The words, once, for the terminal (English) and the board (the project's language). Content
// always comes from the files; only these connectors are translated.
export const EVIDENCE_WORDS = {
  en: {
    allFresh: (n) => `evidence: all ${n} dated facts were verified within the last quarter.`,
    staleOf: (k, n) => `evidence: ${k} of the ${n} dated facts are older than a quarter, or not a day that has passed; re-verify them (comply, maintain) or say why they still hold.`,
    staleItem: (s) => (Number.isFinite(s.ageDays) && s.ageDays >= 0
      ? `${s.label}: verified ${s.date}, ${s.ageDays} days ago`
      : `${s.label}: "${s.date}" is not a day that has passed`),
    headStale: 'Older than a quarter',
    runbooks: (total, files, phase) => `runbooks: ${total} fields still hold the template's placeholders in ${files.join(', ')} while the phase is ${phase}; deliver fills them before a release, maintain keeps them true.`,
    runbookItem: (n) => `${n} field${n === 1 ? '' : 's'}`,
    headRunbooks: 'Still the template\'s',
  },
  nl: {
    allFresh: (n) => `bewijs: alle ${n} gedateerde feiten zijn het afgelopen kwartaal geverifieerd.`,
    staleOf: (k, n) => `bewijs: ${k} van de ${n} gedateerde feiten zijn ouder dan een kwartaal, of geen dag die al voorbij is; verifieer ze opnieuw (comply, maintain) of zeg waarom ze nog gelden.`,
    staleItem: (s) => (Number.isFinite(s.ageDays) && s.ageDays >= 0
      ? `${s.label}: geverifieerd ${s.date}, ${s.ageDays} dagen geleden`
      : `${s.label}: "${s.date}" is geen dag die al voorbij is`),
    headStale: 'Ouder dan een kwartaal',
    runbooks: (total, files, phase) => `draaiboeken: ${total} velden zijn nog de sjabloontekst in ${files.join(', ')} terwijl de fase ${phase} is; deliver vult ze voor een release, maintain houdt ze waar.`,
    runbookItem: (n) => `${n} veld${n === 1 ? '' : 'en'}`,
    headRunbooks: 'Nog sjabloontekst',
  },
};

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

// The stamps, and the ones that need a look on the given day, each with its age: older than a
// quarter, or a date that is not a day that has passed (unreadable, or in the future), which is
// not evidence of anything and would otherwise count as fresh.
export function datedEvidence(root, today = new Date()) {
  const stamps = datedStamps(root);
  const stale = stamps
    .map((s) => ({ ...s, ageDays: days(new Date(`${s.date}T00:00:00Z`), today) }))
    .filter((s) => !Number.isFinite(s.ageDays) || s.ageDays < 0 || s.ageDays > QUARTER_DAYS);
  return { stamps, stale };
}

// ---------------------------------------------------------------- the runbooks

// The phase the handoff declares, in one word, from the file that owns it.
export function phaseOf(root) {
  for (const rel of HANDOFF_PATHS) {
    const p = join(root, rel);
    if (!existsSync(p)) continue;
    const m = read(p).match(/^- \*\*Phase:\*\*\s*([a-z]+)/mi);
    return m ? m[1].toLowerCase() : null;
  }
  return null;
}

// The runbooks a shipped product runs on, and how many fields in them are still the template's
// angle-bracket placeholders. Only the runbooks every product needs count: the deploy template is
// Groundwork's own until `deliver` fills it, the drill runbook is the framework's, and the
// agent-security runbook is filled only where an organization asks for it. A placeholder inside
// backticks is an instruction that quotes one, not a field.
const RUNBOOKS = ['deploy.md', 'backup-restore.md', 'incident-response.md', 'monitoring.md', 'access.md'];
export function runbookPlaceholders(root) {
  const out = [];
  for (const f of RUNBOOKS) {
    const p = join(root, 'docs', 'operations', f);
    if (!existsSync(p)) continue;
    let inComment = false;
    lines(p).forEach((l, i) => {
      // Placeholders inside an HTML comment are the template's own explanation, not a field.
      let text = l;
      if (inComment) {
        if (!text.includes('-->')) return;
        text = text.slice(text.indexOf('-->') + 3);
        inComment = false;
      }
      text = text.replace(/<!--[\s\S]*?-->/g, '');
      if (text.includes('<!--')) { text = text.slice(0, text.indexOf('<!--')); inComment = true; }
      text = text.replace(/`[^`]*`/g, '').replace(/`[^`]*$/, '');
      const n = (text.match(/<[^<>]+>/g) || []).length;
      if (n) out.push({ path: `docs/operations/${f}`, line: i + 1, fields: n });
    });
  }
  return out;
}

// Said only once the phase is deliver or maintain: before that, an unfilled runbook is the plan,
// not a hole. A count, never a block: which value goes in a field is the owner's to know.
export const runbooksSaid = ({ placeholders, phase }) => ['deliver', 'maintain'].includes(phase) && placeholders.length > 0;
export const runbookFiles = (placeholders) => [...new Set(placeholders.map((p) => p.path.replace('docs/operations/', '')))];
export const runbookPerFile = (placeholders) => {
  const per = new Map();
  for (const p of placeholders) per.set(p.path, (per.get(p.path) || 0) + p.fields);
  return [...per].map(([path, fields]) => ({ path, fields }));
};
export const runbookTotal = (placeholders) => placeholders.reduce((n, p) => n + p.fields, 0);
export function formatRunbooks(root, placeholders = runbookPlaceholders(root), phase = phaseOf(root)) {
  if (!runbooksSaid({ placeholders, phase })) return [];
  return [EVIDENCE_WORDS.en.runbooks(runbookTotal(placeholders), runbookFiles(placeholders), phase)];
}

// One line the owner reads beside the floor, then one per stale stamp. A project with no stamp
// yet (a fresh copy, before comply and stack have run) has nothing to say, and says nothing.
export function formatEvidence({ stamps, stale }) {
  const w = EVIDENCE_WORDS.en;
  if (!stamps.length) return [];
  if (!stale.length) return [w.allFresh(stamps.length)];
  const out = [w.staleOf(stale.length, stamps.length)];
  for (const s of stale) out.push(`  - ${w.staleItem(s)} (${s.path}:${s.line})`);
  return out;
}
