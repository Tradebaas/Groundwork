#!/usr/bin/env node
// Groundwork work reader: docs/work/ turned into facts.
// Run: node checks/work.mjs           the work tree in plain language
//      node checks/work.mjs --json    the same facts, for tooling
//
// This file only ever READS. Every lane, count, readiness list and blocker below is derived at
// read time from the file that owns the fact, so there is no second place to maintain and the
// board (F-04) renders what this returns rather than keeping its own administration.
// Story: docs/work/E-01-agile-first/F-04-board/S-01-the-work-reader (maintainer-local).
//
// ---------------------------------------------------------------- the shape it parses
// This header is the one description of what an epic, a feature and a story file must carry.
// Templates and the gate that enforces them are F-02 and F-03; this reader only reads.
//
//   docs/work/E-nn-<slug>/epic.md          the goal of one round, and what finished means for
//                                          it. `- **Status:** <word>, ...`, `## The goal`,
//                                          `## What finished means` (numbered)
//   .../F-nn-<slug>/feature.md             `- **Status:** · **Size:**` on one line, then the
//                                          bullets `**What you can do after it.**`,
//                                          `**What that is worth.**`, `**Vision.**`,
//                                          `**Scope.**`, and `## Acceptance ...` (numbered)
//   .../F-nn-<slug>/S-nn-<slug>.md         `- **Feature:** · **Status:** · **Size:**` and
//                                          `- **Depends on:** · **Owner sign-off:**`, then
//                                          `## Value`, `## Acceptance` (numbered, `1. [x]` means
//                                          demonstrated), `## Tasks` (`- [x]`, `- [~]`, `- [ ]`),
//                                          `## Review` (one line per role)
//
// Rules that follow from that shape, and are not written down anywhere else:
//   - An id comes from the folder or the file name, never from a line inside the file, because
//     containment is physical (decision 0021): a story is in one feature, a feature is in one
//     epic, and neither can claim another. A project runs several epics, one after the other.
//     The `**Feature:**` line is a courtesy for a human reader; the folder is the fact.
//   - A key is the path through that tree: `E-01`, `E-01/F-04`, `E-01/F-04/S-01`. Numbering
//     therefore restarts inside each parent, and no id is ambiguous.
//   - A `<name>.local.md` is read exactly like `<name>.md` and wins where both exist, the way
//     the session protocol prefers STATE.local.md. That is what lets a maintainer keep a work
//     tree out of git while the tooling still sees it.
//   - A status word is one of LANES below and nothing else. Anything else is unreadable, and an
//     unreadable status is reported, never quietly treated as backlog or as done.
//   - A dependency is written the way a relative path is: `S-nn` is a story in the same feature,
//     `F-nn/S-nn` one elsewhere in the same epic, `E-nn/F-nn/S-nn` one in another epic. The rest
//     of that line is prose and is left alone.
//   - A feature's or an epic's own status says only how far its refinement got; everything
//     countable about it is derived from what it contains. So it is done when its children are,
//     whatever its own line says, and that line speaks only for one that is still empty.

import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const WORK_DIR = 'docs/work';
// The six lanes of decision 0021, in board order. The status word and the lane are the same
// word on purpose: one word per thing, so no mapping table can drift.
export const LANES = ['backlog', 'refinement', 'to do', 'in progress', 'review', 'done'];
// "review", not "preview": rule 6 of the decision and the story file's own section already use
// that word, and one word per thing is the rule this whole rebuild is built on.
export const ROLES = [['tech', 'Technical'], ['func', 'Functional'], ['arch', 'Architecture']];

const read = (p) => (existsSync(p) && statSync(p).isFile() ? readFileSync(p, 'utf8').replace(/\r\n/g, '\n') : null);
const tidy = (t) => (t || '').replace(/<!--[\s\S]*?-->/g, '').replace(/\s+/g, ' ').trim();
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// ---------------------------------------------------------------- parsing

// A `- **Label:** value` field, also when several sit on one line separated by a middot, and
// also when the value runs on across indented lines. Reading half a sentence back to the owner
// is a broken report, not a cosmetic issue, so a wrapped value is joined whole.
export function field(text, label) {
  const lines = (text || '').split('\n');
  const re = new RegExp(`\\*\\*${esc(label)}[:.]?\\*\\*\\s*(.*)$`);
  for (let i = 0; i < lines.length; i += 1) {
    if (!lines[i].startsWith('- ')) continue;
    const m = lines[i].match(re);
    if (!m) continue;
    const next = m[1].indexOf('**');
    if (next >= 0) return tidy(m[1].slice(0, next).replace(/·\s*$/, ''));
    let value = m[1];
    for (let j = i + 1; j < lines.length && /^\s+\S/.test(lines[j]); j += 1) value += ` ${lines[j].trim()}`;
    return tidy(value);
  }
  return '';
}

// The body under a heading, up to the next heading of the same or a higher level.
export function section(text, headingRe) {
  const lines = (text || '').split('\n');
  const i = lines.findIndex((l) => /^#{2,}\s/.test(l) && headingRe.test(l));
  if (i < 0) return null;
  const level = lines[i].match(/^#+/)[0].length;
  const out = [];
  for (let j = i + 1; j < lines.length; j += 1) {
    const m = lines[j].match(/^(#+)\s/);
    if (m && m[1].length <= level) break;
    out.push(lines[j]);
  }
  return out.join('\n').trim();
}

// Numbered criteria. `1. [x] ...` marks one that has been demonstrated.
export function numbered(block) {
  const out = [];
  for (const line of (block || '').split('\n')) {
    const m = line.match(/^(\d+)\.\s+(\[([ xX~])\]\s*)?(.*)$/);
    if (m) out.push({ nr: Number(m[1]), text: m[4], done: /x/i.test(m[3] || '') });
    else if (out.length && /^\s+\S/.test(line)) out[out.length - 1].text += ` ${line.trim()}`;
  }
  return out.map((c) => ({ ...c, text: tidy(c.text) }));
}

// The task list: the steps an agent ticks while the work happens.
export function taskList(block) {
  const items = [];
  for (const line of (block || '').split('\n')) {
    const m = line.match(/^- \[([ xX~])\]\s*(.*)$/);
    if (m) items.push({ state: /x/i.test(m[1]) ? 'done' : m[1] === '~' ? 'started' : 'open', text: m[2] });
    else if (items.length && /^\s+\S/.test(line)) items[items.length - 1].text += ` ${line.trim()}`;
  }
  const list = items.map((i) => ({ ...i, text: tidy(i.text) }));
  return { items: list, done: list.filter((i) => i.state === 'done').length, total: list.length };
}

// One line per review role: "pending", or a verdict with its date and its reason. A verdict
// without a date is not a verdict yet, so it is reported as missing with the line kept.
export function verdicts(text) {
  const block = section(text, /^## Review/) || '';
  return ROLES.map(([key, label]) => {
    const line = (block.match(new RegExp(`^- ${label}:\\s*(.*)$`, 'm')) || [])[1];
    if (line === undefined) return { key, label, state: 'missing', date: '', reason: '' };
    if (/^pending\b/i.test(line)) return { key, label, state: 'pending', date: '', reason: '' };
    const m = line.match(/^(not approved|approved)[,:.]?\s*(\d{4}-\d{2}-\d{2})[,:.]?\s*(.*)$/i);
    if (!m) return { key, label, state: 'missing', date: '', reason: tidy(line) };
    return { key, label, state: /^approved/i.test(m[1]) ? 'approved' : 'rejected', date: m[2], reason: tidy(m[3]) };
  });
}

// A status word, or null when it is not one of the six lanes.
export function lane(value) {
  const v = tidy(value).toLowerCase().split(/[,;(·]/)[0].replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim();
  return LANES.includes(v) ? v : null;
}

// Dependencies, read the way a relative path is read: what is left out is taken from where the
// story itself sits.
export function refsIn(text, featureKey) {
  const [epic, feature] = featureKey.split('/');
  return [...new Set([...(text || '').matchAll(/\b(?:(E-\d{2})\/)?(?:(F-\d{2})\/)?(S-\d{2})\b/g)]
    .map((m) => `${m[1] || epic}/${m[2] || feature}/${m[3]}`))];
}

// ---------------------------------------------------------------- reading the tree

// The maintainer-local name wins, so a work tree kept out of git is still the one being read.
function pick(dir, name) {
  for (const candidate of [`${name}.local.md`, `${name}.md`]) {
    const file = join(dir, candidate);
    const text = read(file);
    if (text !== null) return { text, file };
  }
  return null;
}

const title = (text, fallback) => tidy((text.match(/^#\s+(.+)$/m) || [, fallback])[1])
  .replace(/^(?:EPIC|E-\d{2}|F(?:-\d{2})?|S-\d{2}):\s*/, '');

const folders = (dir, re) => readdirSync(dir, { withFileTypes: true })
  .filter((e) => e.isDirectory() && re.test(e.name)).map((e) => e.name).sort();

function readStory(dir, root, name, featureKey, problems) {
  const { text, file } = pick(dir, name);
  const id = name.match(/^(S-\d{2})/)[1];
  const key = `${featureKey}/${id}`;
  const path = relative(root, file);
  const statusText = field(text, 'Status');
  const readLane = lane(statusText);
  if (!readLane) problems.push({ kind: 'status', ref: key, path, text: `${key} has no readable status ("${statusText || 'no Status line'}"), so it is in no lane` });
  const dependsText = field(text, 'Depends on');
  const size = field(text, 'Size');
  return {
    id, key, feature: featureKey, epic: featureKey.split('/')[0], title: title(text, id), path,
    statusText, lane: readLane, done: readLane === 'done',
    size: /^[SML]$/.test(size) ? size : null,
    signOff: (field(text, 'Owner sign-off').match(/\d{4}-\d{2}-\d{2}/) || [null])[0],
    value: tidy(section(text, /^## Value/)) || null,
    dependsOn: { text: dependsText, refs: refsIn(dependsText, featureKey).filter((r) => r !== key) },
    criteria: numbered(section(text, /^## Acceptance/)),
    tasks: taskList(section(text, /^## Tasks/)),
    verdicts: verdicts(text),
  };
}

function readFeature(epicDir, root, folder, epicId, problems) {
  const dir = join(epicDir, folder);
  const id = folder.match(/^(F-\d{2})/)[1];
  const key = `${epicId}/${id}`;
  const names = [...new Set(readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isFile() && /^S-\d{2}-.+\.md$/.test(e.name))
    .map((e) => e.name.replace(/\.local\.md$|\.md$/, '')))].sort();
  // The stories are handed back to readWork, which keeps the one list. A feature names its own
  // by key: a story written down twice is the second administration this reader exists to avoid.
  const stories = names.map((n) => readStory(dir, root, n, key, problems));
  const storyKeys = stories.map((s) => s.key);
  const found = pick(dir, 'feature');
  if (!found) {
    problems.push({ kind: 'feature', ref: key, path: relative(root, dir), text: `${key} has no feature.md, so it states no value` });
    return { feature: { id, key, epic: epicId, slug: folder, title: id, path: null, status: null, size: null, value: null, worth: null, vision: null, scope: null, acceptance: [], storyKeys }, stories };
  }
  const { text, file } = found;
  const size = field(text, 'Size');
  return {
    feature: {
      id, key, epic: epicId, slug: folder, title: title(text, id), path: relative(root, file),
      status: lane(field(text, 'Status')), size: /^[SML]$/.test(size) ? size : null,
      value: field(text, 'What you can do after it') || null,
      worth: field(text, 'What that is worth') || null,
      vision: field(text, 'Vision') || null,
      scope: field(text, 'Scope') || null,
      acceptance: numbered(section(text, /^## Acceptance/)),
      storyKeys,
    },
    stories,
  };
}

function readEpic(base, root, folder, problems) {
  const dir = join(base, folder);
  const id = folder.match(/^(E-\d{2})/)[1];
  const read = folders(dir, /^F-\d{2}-/).map((f) => readFeature(dir, root, f, id, problems));
  const features = read.map((r) => r.feature);
  const stories = read.flatMap((r) => r.stories);
  const featureKeys = features.map((f) => f.key);
  const found = pick(dir, 'epic');
  if (!found) {
    problems.push({ kind: 'epic', ref: id, path: relative(root, dir), text: `${id} has no epic.md, so this round has no stated goal` });
    return { epic: { id, key: id, slug: folder, title: id, path: null, status: null, goal: null, finished: [], featureKeys }, features, stories };
  }
  const { text, file } = found;
  return {
    epic: {
      id, key: id, slug: folder, title: title(text, id), path: relative(root, file),
      status: field(text, 'Status').split(/[,·]/)[0].trim().toLowerCase() || null,
      goal: tidy(section(text, /^## The goal/)) || null,
      finished: numbered(section(text, /^## What finished means/)),
      featureKeys,
    },
    features,
    stories,
  };
}

// ---------------------------------------------------------------- deriving

// Everything below is derived from the lines above and stored nowhere. Kept free of file
// reading so it can be tested directly.
export function derive(work) {
  const byKey = new Map(work.stories.map((s) => [s.key, s]));
  for (const s of work.stories) {
    const missing = [];
    if (!s.value) missing.push({ key: 'value', text: 'a value sentence' });
    if (!s.criteria.length) missing.push({ key: 'criteria', text: 'numbered acceptance criteria' });
    if (!s.tasks.total) missing.push({ key: 'tasks', text: 'its tasks' });
    if (!s.size) missing.push({ key: 'size', text: 'a size (S, M or L)' });
    if (!s.dependsOn.text) missing.push({ key: 'depends', text: 'its dependencies ("none" is an answer)' });
    if (!s.signOff) missing.push({ key: 'sign-off', text: "the owner's sign-off" });
    s.ready = { ok: missing.length === 0, missing };
    s.blockers = [];
    if (s.done) continue;
    for (const ref of s.dependsOn.refs) {
      const dep = byKey.get(ref);
      if (!dep) s.blockers.push({ kind: 'story', ref, text: `depends on ${ref}, which is no story` });
      else if (!dep.done) s.blockers.push({ kind: 'story', ref, text: `waits for ${ref} ${dep.title}` });
    }
    for (const v of s.verdicts) {
      if (v.state === 'rejected') s.blockers.push({ kind: 'review', ref: v.key, text: `${v.label} did not approve: ${v.reason}` });
    }
  }
  // A parent is done when what it contains is done, and an empty one is not done at all: there
  // is nothing to derive it from, and its own status line only says how far refinement got.
  const roll = (parent, children) => {
    const done = children.filter((c) => c.done).length;
    parent.progress = { done, total: children.length };
    parent.done = children.length > 0 && done === children.length;
  };
  const storiesOf = (f) => work.stories.filter((s) => s.feature === f.key);
  for (const f of work.features) roll(f, storiesOf(f));
  for (const e of work.epics) roll(e, work.features.filter((f) => f.epic === e.key));
  const tally = (list) => ({ done: list.filter((x) => x.done).length, total: list.length });
  work.counts = {
    epics: tally(work.epics),
    features: tally(work.features),
    stories: tally(work.stories),
    lanes: Object.fromEntries(LANES.map((l) => [l, work.stories.filter((s) => s.lane === l).length])),
    unreadable: work.stories.filter((s) => !s.lane).length,
  };
  return work;
}

export function readWork(root, dir = WORK_DIR) {
  const base = join(root, dir);
  const problems = [];
  const empty = { root, path: dir, present: false, epics: [], features: [], stories: [], problems };
  if (!existsSync(base) || !statSync(base).isDirectory()) return derive(empty);
  // An epic is a folder, so a loose EPIC.md is someone writing the old flat shape: say so,
  // rather than reporting an empty tree at a project that has clearly been planned.
  if (pick(base, 'EPIC')) problems.push({ kind: 'shape', ref: dir, path: dir, text: `an epic is a folder: move ${dir}/EPIC.md into ${dir}/E-01-<slug>/epic.md` });
  const read = folders(base, /^E-\d{2}-/).map((f) => readEpic(base, root, f, problems));
  return derive({
    root, path: dir, present: true, problems,
    epics: read.map((r) => r.epic),
    features: read.flatMap((r) => r.features),
    stories: read.flatMap((r) => r.stories),
  });
}

// ---------------------------------------------------------------- reporting

export function render(work) {
  if (!work.present) return `No ${work.path}/ yet, so there is no work to read.`;
  const out = [];
  const c = work.counts;
  out.push(`${c.epics.done} of ${c.epics.total} epics done, ${c.features.done} of ${c.features.total} features done, ${c.stories.done} of ${c.stories.total} stories done`);
  for (const e of work.epics) {
    out.push('', `${e.id} ${e.title} (${e.status || 'no status'}) - ${e.progress.done} of ${e.progress.total} features done`);
    for (const f of work.features.filter((x) => x.epic === e.key)) {
      out.push(`  ${f.id} ${f.title} - ${f.progress.done} of ${f.progress.total} stories done${f.status ? ` (${f.status})` : ''}`);
      for (const s of work.stories.filter((x) => x.feature === f.key)) {
        const marks = [s.lane || 'unreadable status', s.ready.ok ? 'ready' : `not ready: misses ${s.ready.missing.map((m) => m.text).join(', ')}`,
          ...(s.tasks.total ? [`tasks ${s.tasks.done} of ${s.tasks.total}`] : []),
          ...s.blockers.map((b) => b.text)];
        out.push(`    ${s.id} ${s.title}`, `        ${marks.join(' · ')}`);
      }
    }
  }
  if (work.problems.length) out.push('', 'Problems:', ...work.problems.map((p) => `  - ${p.text} (${p.path})`));
  return out.join('\n');
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) {
  const work = readWork(process.cwd());
  console.log(process.argv.includes('--json') ? JSON.stringify(work, null, 2) : render(work));
}
