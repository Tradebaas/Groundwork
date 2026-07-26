#!/usr/bin/env node
// Groundwork progress: a plain-language answer to "what is done and what is left".
// Run: node checks/progress.mjs            full report for this project
//      node checks/progress.mjs --line     one line, if the stand changed or a heads-up is open
//      node checks/progress.mjs --all      one line per registered project
//      node checks/progress.mjs --serve    the same stand as a page, on this machine only
//      node checks/progress.mjs --links    which document points at which, plus orphans and hubs
//      node checks/progress.mjs --json     the derived facts, for tooling
//      node checks/progress.mjs --register add this project to the per-user list (`begin`)
//
// This file only ever READS project documents. Every number is derived fresh from the files
// that already own the fact (BRIEF.md, the specs, STATE.md), so there is no second place to
// maintain and nothing to keep in sync. The only thing it writes is the per-user list of
// projects in the home directory, which holds no project content.
// Spec: docs/specs/008-status-overzicht (maintainer-local).

import { readFileSync, readdirSync, existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, resolve, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { homedir } from 'node:os';
// The link graph is derived next door, from the one definition of a link the gate also uses.
import { readDocuments, linkGraph, renderLinks } from './links.mjs';

const read = (p) => readFileSync(p, 'utf8').replace(/\r\n/g, '\n');
const SPEC_DONE = 'done';
const SPEC_INACTIVE = new Set(['dropped']);
// A worked example ships with Groundwork to show the format filled in; it is fiction, and it
// names SC-ids from the fictional brief it belongs to. Every project that later defines those
// same ids would otherwise see the example credited as its own finished work, or warned about
// as a spec pointing at nothing. It is not this project's work, so it never counts as any.
const SPEC_EXAMPLE = 'example';

// The framing words. Content always comes from the project's own documents, so only these
// connectors need translating. VOICE.md decides which set is used. Exported because the board
// (checks/cockpit.mjs) renders the same facts and must say them in the same words.
export const WORDS = {
  en: {
    doneOfTotal: (d, t) => `${d} of the ${t} things are done`,
    shortDone: (d, t) => `${d} of ${t} done`,
    headDone: 'Done',
    headDoing: 'Working on now',
    headTodo: 'Not started yet',
    now: 'now',
    next: 'next',
    noScope: 'Scope is not defined yet. Run the `scope` skill to write down what this project '
      + 'will do, then this overview can report on it.',
    heads: 'Heads up',
    headsShort: (n) => `${n} heads-up${n === 1 ? '' : 's'}`,
    nothingYet: 'Nothing is done yet',
    unknownItem: (spec) => `the plan "${spec}" says it delivers something that is not in the brief. `
      + 'Either it belongs in the brief, or it should not be built.',
    doubleClaim: (title, specs) => `"${title}" is being worked on from ${specs.length} plans at once `
      + `(${specs.join(', ')}). One of them owns it; the others should say so.`,
  },
  nl: {
    doneOfTotal: (d, t) => `${d} van de ${t} dingen zijn klaar`,
    shortDone: (d, t) => `${d} van de ${t} klaar`,
    headDone: 'Klaar',
    headDoing: 'Nu mee bezig',
    headTodo: 'Nog niet begonnen',
    now: 'nu',
    next: 'daarna',
    noScope: 'De scope is nog niet bepaald. Draai de `scope`-skill om vast te leggen wat dit '
      + 'project gaat doen, dan kan dit overzicht erover rapporteren.',
    heads: 'Let op',
    headsShort: (n) => `${n}× let op`,
    nothingYet: 'Er is nog niets klaar',
    unknownItem: (spec) => `het plan "${spec}" levert iets op wat niet in de brief staat. `
      + 'Of het hoort in de brief, of het moet niet gebouwd worden.',
    doubleClaim: (title, specs) => `aan "${title}" wordt vanuit ${specs.length} plannen tegelijk gewerkt `
      + `(${specs.join(', ')}). Eén ervan is eigenaar; de andere moeten dat zeggen.`,
  },
};

// ---------------------------------------------------------------- reading

const tidy = (t) => t.replace(/\s*<!--[\s\S]*$/, '').replace(/\s+/g, ' ').trim();
// A template still carrying its placeholders is not an answer; saying "0 of 1 done" would read
// as progress on something that was never decided.
const placeholder = (t) => !t || /^TBD\b/i.test(t);
const section = (text, head) => text.split(/^## /m).find((s) => head.test(s)) || '';

// Anything worth writing rarely fits in 95 columns, so a value runs on across indented lines
// and is read whole: half a sentence quoted back at the owner is a broken report, not a
// cosmetic issue. A blank line or a line that starts something new ends the value.
function joinWrapped(lines, i, first) {
  let value = first;
  for (let j = i + 1; j < lines.length && /^\s+\S/.test(lines[j]); j += 1) value += ` ${lines[j].trim()}`;
  return value;
}

function fieldValue(text, label) {
  const lines = text.split('\n');
  const head = new RegExp(`^- \\*\\*${label}:\\*\\*\\s*(.*)$`);
  for (let i = 0; i < lines.length; i += 1) {
    const m = lines[i].match(head);
    if (m) return tidy(joinWrapped(lines, i, m[1]));
  }
  return '';
}

// The same rule for a list: one bullet is one item, however many lines it takes.
const SCOPE_BULLET = /^[-*]\s*\**\s*(SC-\d+)\**[:.]?\s*(.*)$/;
const PLAIN_BULLET = /^[-*]\s+(.*)$/;

function bulletItems(text, re, withId) {
  const items = [];
  let current = null;
  for (const line of text.split('\n')) {
    const start = line.match(re);
    if (start) {
      current = withId ? { id: start[1], title: start[2] } : { title: start[1] };
      items.push(current);
    } else if (current && /^\s+\S/.test(line)) {
      current.title += ` ${line.trim()}`;
    } else {
      current = null;
    }
  }
  for (const i of items) i.title = tidy(i.title);
  return items;
}

export function parseBrief(text) {
  const name = fieldValue(text, 'Name');
  const goal = fieldValue(text, 'One sentence');
  const items = bulletItems(section(text, /^In scope\b/i), SCOPE_BULLET, true);
  const real = items.filter((i) => !placeholder(i.title));
  return {
    name: placeholder(name) ? null : name,
    goal: placeholder(goal) ? null : goal,
    items: real,
    outOfScope: bulletItems(section(text, /^Out of scope\b/i), PLAIN_BULLET, false)
      .filter((i) => !placeholder(i.title)),
    placeholders: items.length - real.length,
  };
}

export function parseSpec(text) {
  const statusLine = (text.match(/^- \*\*Status:\*\*\s*(.+)$/m) || [])[1] || '';
  // The unfilled template lists every status on one line; that is a placeholder, not a status.
  const status = statusLine.includes('|') ? null : statusLine.trim().split(/\s+/)[0]?.toLowerCase() || null;
  const tracesLine = (text.match(/^- \*\*Traces to:\*\*\s*(.+)$/m) || [])[1] || '';
  const traces = [...tracesLine.matchAll(/SC-\d+/g)].map((m) => m[0]);
  return { status, traces, tracesDeclared: Boolean(tracesLine.trim()) };
}

// Where the shared documents live, in one place: the parser home owns these paths, and the gate
// (check.mjs) and the board (cockpit.mjs) read them from here rather than each spelling a path
// again. The handoff is a list because the session protocol prefers a maintainer-local file
// whenever one exists.
export const BRIEF_PATH = 'docs/product/BRIEF.md';
export const MANIFEST_PATH = 'docs/README.md';
export const HANDOFF_PATHS = ['docs/state/STATE.local.md', 'docs/state/STATE.md'];

// The manifest already has to list every document, and the gate already fails when one is
// missing from it, so the map of which file owns which fact is read straight off it.
export function parseManifest(text) {
  const rows = [];
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('|')) continue;
    const cells = trimmed.split('|').slice(1, -1).map((c) => c.trim());
    // The header and the divider carry no backticked path, which is what makes a row a row.
    const path = cells.length >= 3 ? (cells[0].match(/`([^`]+)`/) || [])[1] : null;
    if (path) rows.push({ path, tier: cells[1], owns: cells[2] });
  }
  return rows;
}

// One definition of what counts as a spec: <folder>/spec.md, or a single .md sitting directly
// in docs/specs/; the TEMPLATE files are skeletons, not specs. Shared with check.mjs's
// spec-traces gate so the counted set and the gated set cannot drift apart (the gap that
// motivated it: single-file specs counted here escaped the gate there).
export function isSpecPath(relPath) {
  if (relPath.split('/').pop().startsWith('TEMPLATE')) return false;
  return /^docs\/specs\/(.+\/spec|[^/]+)\.md$/.test(relPath);
}

function specFiles(root) {
  const dir = join(root, 'docs', 'specs');
  const out = [];
  const walk = (d, depth, relDir) => {
    let entries;
    try { entries = readdirSync(d, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      const full = join(d, e.name);
      const r = `${relDir}/${e.name}`;
      if (e.isDirectory()) { if (depth < 4) walk(full, depth + 1, r); continue; }
      if (isSpecPath(r)) out.push(full);
    }
  };
  walk(dir, 0, 'docs/specs');
  return out;
}

// The next step, and the file it came from. The board names that file on its card, so the
// lookup order lives here rather than being guessed a second time.
export function readHandoff(root) {
  let owning = null;
  for (const rel of HANDOFF_PATHS) {
    const p = join(root, rel);
    if (!existsSync(p)) continue;
    if (!owning) owning = rel;
    const lines = read(p).split('\n');
    for (let i = 0; i < lines.length; i += 1) {
      const m = lines[i].match(/^- \*\*Now ▶\*\*\s*(.+)$/) || lines[i].match(/Now ▶\*{0,2}\s*(.+)$/);
      if (!m) continue;
      const now = joinWrapped(lines, i, m[1])
        .replace(/<!--.*?-->/g, '').replace(/\*\*/g, '').replace(/\s+/g, ' ').trim();
      if (now) return { path: rel, now };
    }
  }
  return { path: owning, now: null };
}

function language(root) {
  const p = join(root, 'docs', 'design', 'VOICE.md');
  if (!existsSync(p)) return 'en';
  const declared = (read(p).match(/\*\*Product language:\*\*\s*([^·|\n]+)/) || [])[1] || '';
  return /nederlands|dutch|\bnl\b/i.test(declared) ? 'nl' : 'en';
}

// The brief as its own document. The board renders more of it than the overview counts, so it
// reads the file through this rather than through the derived project.
export function readBrief(root) {
  const p = join(root, BRIEF_PATH);
  return existsSync(p) ? parseBrief(read(p)) : null;
}

export function readProject(root) {
  const brief = readBrief(root) || { name: null, items: [], goal: null, outOfScope: [], placeholders: 0 };
  const specs = specFiles(root).map((f) => ({ file: basename(dirname(f)) === 'specs' ? basename(f) : basename(dirname(f)), ...parseSpec(read(f)) }));
  return {
    root,
    name: brief.name || basename(root),
    lang: language(root),
    scopeItems: brief.items,
    specs,
    now: readHandoff(root).now,
  };
}

// ---------------------------------------------------------------- deriving

// The whole judgment of this tool lives here: scope items in, a state per item out.
// Kept free of file reading so it can be tested directly against fixtures.
export function derive({ scopeItems, specs: allSpecs }) {
  const specs = allSpecs.filter((s) => s.status !== SPEC_EXAMPLE);
  // Warnings are kept as facts, not sentences: the wording is chosen at render time so it can
  // follow the project's language and stay free of the internal ids the report never shows.
  const warnings = [];
  const known = new Set(scopeItems.map((i) => i.id));
  for (const s of specs) {
    if (s.traces.some((t) => !known.has(t))) warnings.push({ kind: 'unknownItem', spec: s.file });
  }
  const items = scopeItems.map((item) => {
    const mine = specs.filter((s) => s.traces.includes(item.id) && !SPEC_INACTIVE.has(s.status));
    let state = 'todo';
    if (mine.some((s) => s.status === SPEC_DONE)) state = 'done';
    else if (mine.length) state = 'doing';
    if (mine.length > 1) {
      warnings.push({ kind: 'doubleClaim', title: item.title, specs: mine.map((s) => s.file) });
    }
    return { ...item, state, specs: mine.map((s) => s.file) };
  });
  const count = (st) => items.filter((i) => i.state === st).length;
  return {
    defined: items.length > 0,
    total: items.length,
    done: count('done'),
    doing: count('doing'),
    todo: count('todo'),
    items,
    warnings,
  };
}

// ---------------------------------------------------------------- rendering

// A warning fact turned into the owner's own sentence. The spec folder name stays: it is how
// they find the file, and unlike an SC-id it says something on its own.
export function warningText(w, warn) {
  if (warn.kind === 'unknownItem') return w.unknownItem(warn.spec);
  return w.doubleClaim(warn.title, warn.specs);
}

export function renderFull(project, progress) {
  const w = WORDS[project.lang] || WORDS.en;
  const out = [project.name];
  if (!progress.defined) {
    out.push('', w.noScope);
    return out.join('\n');
  }
  out.push('', `${w.doneOfTotal(progress.done, progress.total)}.`, '');
  const group = (head, state) => {
    const list = progress.items.filter((i) => i.state === state);
    if (!list.length) return;
    out.push(head);
    for (const i of list) out.push(`  - ${i.title}`);
    out.push('');
  };
  group(w.headDone, 'done');
  group(w.headDoing, 'doing');
  group(w.headTodo, 'todo');
  if (project.now) out.push(`${w.now}: ${project.now}`);
  if (progress.warnings.length) {
    out.push('', `${w.heads}:`);
    for (const warn of progress.warnings) out.push(`  - ${warningText(w, warn)}`);
  }
  return out.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd();
}

const LINE_MAX = 120;

export function renderLine(project, progress) {
  const w = WORDS[project.lang] || WORDS.en;
  if (!progress.defined) return `${project.name}: ${w.noScope.split('.')[0]}`.slice(0, LINE_MAX);
  const doing = progress.items.find((i) => i.state === 'doing');
  const next = progress.items.find((i) => i.state === 'todo');
  const parts = [`${project.name}: ${w.shortDone(progress.done, progress.total)}`];
  if (doing) parts.push(`${w.now}: ${doing.title}`);
  else if (project.now) parts.push(`${w.now}: ${project.now}`);
  if (next) parts.push(`${w.next}: ${next.title}`);
  // Work that traces nowhere is the one thing this line must never drop, so the marker is
  // reserved its space first and the titles are what gives way when the line runs long.
  const flag = progress.warnings.length ? ` · ⚠ ${w.headsShort(progress.warnings.length)}` : '';
  const room = LINE_MAX - flag.length;
  const line = parts.join(' · ');
  return (line.length <= room ? line : `${line.slice(0, room - 3).trimEnd()}...`) + flag;
}

// ---------------------------------------------------------------- per-user project list

// Deliberately outside any repository and free of project content: it holds paths and the last
// line already shown, nothing more. No assumption about where anyone keeps their projects.
const registryPath = () => join(homedir(), '.groundwork', 'projects.json');

export function readRegistry(file = registryPath()) {
  try {
    const parsed = JSON.parse(read(file));
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch { return {}; }
}

export function writeRegistry(data, file = registryPath()) {
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);
}

export function registerProject(root, file = registryPath()) {
  const data = readRegistry(file);
  const key = resolve(root);
  if (!data[key]) { data[key] = { lastLine: null }; writeRegistry(data, file); return true; }
  return false;
}

// ---------------------------------------------------------------- commands

function reportFor(root) {
  const project = readProject(root);
  return { project, progress: derive(project) };
}

function cmdAll() {
  const data = readRegistry();
  const paths = Object.keys(data);
  if (!paths.length) return 'No projects registered yet. Each project registers itself when `begin` runs.';
  const lines = [];
  for (const p of paths) {
    // A project that moved, was deleted, or cannot be read must never take down the rest.
    try {
      if (!existsSync(p)) continue;
      const { project, progress } = reportFor(p);
      lines.push(renderLine(project, progress));
    } catch {
      lines.push(`${basename(p)}: could not be read, skipped`);
    }
  }
  return lines.length ? lines.join('\n') : 'No readable projects in the list.';
}

export function cmdLine(root, file = registryPath()) {
  // The proactive channel: one line, and only when the stand actually moved. A line that
  // repeats an unchanged stand becomes wallpaper and stops being read.
  const { project, progress } = reportFor(root);
  if (!progress.defined) return null;
  const line = renderLine(project, progress);
  const data = readRegistry(file);
  const key = resolve(root);
  const seen = data[key]?.lastLine;
  // An open heads-up is the exception to the dedupe. It means work points outside the brief,
  // and it keeps saying so every turn until it is resolved: silence would read as approval,
  // and a fresh session after /clear would otherwise never hear about it at all.
  if (seen === line && !progress.warnings.length) return null;
  data[key] = { ...(data[key] || {}), lastLine: line };
  writeRegistry(data, file);
  return line;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  const arg = process.argv[2] || '';
  try {
    if (arg === '--register') {
      console.log(registerProject(root) ? `registered: ${root}` : `already registered: ${root}`);
    } else if (arg === '--all') {
      console.log(cmdAll());
    } else if (arg === '--serve') {
      // One command answers "where do we stand", as text or as a page. The server lives in its
      // own module and is loaded only here, so the report and the Stop-hook line stay cheap.
      // Loaded after this module finishes evaluating, never awaited here: the board imports
      // this file back, and a top-level await would leave the two waiting on each other.
      const flag = process.argv.indexOf('--port');
      const port = flag === -1 ? undefined : Number(process.argv[flag + 1]);
      if (flag !== -1 && !Number.isInteger(port)) {
        console.error('progress: --port needs a number, for example: --serve --port 8322');
        process.exitCode = 1;
      } else {
        import('./cockpit.mjs')
          .then(({ serve }) => serve(root, port === undefined ? {} : { port }))
          .catch((e) => {
            console.error(`progress: the board could not start (${e.message})`);
            process.exitCode = 1;
          });
      }
    } else if (arg === '--links') {
      // The same derivation the board's link card renders, without starting a server.
      console.log(renderLinks(readProject(root), linkGraph(readDocuments(root))));
    } else if (arg === '--json') {
      const { project, progress } = reportFor(root);
      console.log(JSON.stringify({ ...project, progress }, null, 2));
    } else if (arg === '--line') {
      const line = cmdLine(root);
      // Stop-hook contract: a JSON systemMessage surfaces the line, silence when nothing moved.
      if (line) process.stdout.write(JSON.stringify({ systemMessage: line }));
    } else {
      const { project, progress } = reportFor(root);
      console.log(renderFull(project, progress));
    }
  } catch (e) {
    // Reporting is never allowed to break a session or a commit.
    if (arg !== '--line') console.error(`progress: could not build the report (${e.message})`);
  }
}
