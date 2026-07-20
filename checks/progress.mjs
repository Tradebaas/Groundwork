#!/usr/bin/env node
// Groundwork progress: a plain-language answer to "what is done and what is left".
// Run: node checks/progress.mjs            full report for this project
//      node checks/progress.mjs --line     one line, if the stand changed or a heads-up is open
//      node checks/progress.mjs --all      one line per registered project
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

const read = (p) => readFileSync(p, 'utf8').replace(/\r\n/g, '\n');
const SPEC_DONE = 'done';
const SPEC_INACTIVE = new Set(['dropped']);

// The framing words. Content always comes from the project's own documents, so only these
// connectors need translating. VOICE.md decides which set is used.
const WORDS = {
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

export function parseBrief(text) {
  const name = (text.match(/^- \*\*Name:\*\*\s*(.+)$/m) || [])[1]?.trim();
  const section = text.split(/^## /m).find((s) => /^In scope\b/i.test(s)) || '';
  const items = [];
  for (const m of section.matchAll(/^[-*]\s*\**\s*(SC-\d+)\**[:.]?\s*(.*)$/gm)) {
    items.push({ id: m[1], title: m[2].replace(/\s*<!--.*$/, '').trim() });
  }
  // A template still carrying its placeholders is not scope; saying "0 of 1 done" would read
  // as progress on something that was never decided.
  const real = items.filter((i) => i.title && !/^TBD\b/i.test(i.title));
  return { name: name && !/^TBD\b/i.test(name) ? name : null, items: real, placeholders: items.length - real.length };
}

export function parseSpec(text) {
  const statusLine = (text.match(/^- \*\*Status:\*\*\s*(.+)$/m) || [])[1] || '';
  // The unfilled template lists every status on one line; that is a placeholder, not a status.
  const status = statusLine.includes('|') ? null : statusLine.trim().split(/\s+/)[0]?.toLowerCase() || null;
  const tracesLine = (text.match(/^- \*\*Traces to:\*\*\s*(.+)$/m) || [])[1] || '';
  const traces = [...tracesLine.matchAll(/SC-\d+/g)].map((m) => m[0]);
  return { status, traces, tracesDeclared: Boolean(tracesLine.trim()) };
}

function specFiles(root) {
  const dir = join(root, 'docs', 'specs');
  const out = [];
  const walk = (d, depth) => {
    let entries;
    try { entries = readdirSync(d, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      const full = join(d, e.name);
      if (e.isDirectory()) { if (depth < 4) walk(full, depth + 1); continue; }
      if (!e.name.endsWith('.md') || e.name.startsWith('TEMPLATE')) continue;
      // A spec is either <folder>/spec.md or a single file sitting directly in docs/specs/.
      if (e.name === 'spec.md' || depth === 0) out.push(full);
    }
  };
  walk(dir, 0);
  return out;
}

function handoffNow(root) {
  // The session protocol reads STATE.local.md when it exists; this follows the same rule.
  for (const f of ['STATE.local.md', 'STATE.md']) {
    const p = join(root, 'docs', 'state', f);
    if (!existsSync(p)) continue;
    const line = (read(p).match(/^- \*\*Now ▶\*\*\s*(.+)$/m)
      || read(p).match(/Now ▶\*{0,2}\s*(.+)$/m) || [])[1];
    if (line) return line.replace(/<!--.*?-->/g, '').replace(/\*\*/g, '').trim();
  }
  return null;
}

function language(root) {
  const p = join(root, 'docs', 'design', 'VOICE.md');
  if (!existsSync(p)) return 'en';
  const declared = (read(p).match(/\*\*Product language:\*\*\s*([^·|\n]+)/) || [])[1] || '';
  return /nederlands|dutch|\bnl\b/i.test(declared) ? 'nl' : 'en';
}

export function readProject(root) {
  const briefPath = join(root, 'docs', 'product', 'BRIEF.md');
  const brief = existsSync(briefPath) ? parseBrief(read(briefPath)) : { name: null, items: [], placeholders: 0 };
  const specs = specFiles(root).map((f) => ({ file: basename(dirname(f)) === 'specs' ? basename(f) : basename(dirname(f)), ...parseSpec(read(f)) }));
  return {
    root,
    name: brief.name || basename(root),
    lang: language(root),
    scopeItems: brief.items,
    specs,
    now: handoffNow(root),
  };
}

// ---------------------------------------------------------------- deriving

// The whole judgment of this tool lives here: scope items in, a state per item out.
// Kept free of file reading so it can be tested directly against fixtures.
export function derive({ scopeItems, specs }) {
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
