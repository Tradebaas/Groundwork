// What counts as a link, in one place: the broken-link gate (checks/check.mjs) and the board's
// link card (checks/cockpit-page.mjs) read it from here. Two copies would drift, and a board
// that shows links nobody polices is worse than no card at all (spec 010, criterion 21).
//
// A document points at another one in two spellings, and this project uses both:
//   - a markdown link, `[the brief](../product/BRIEF.md)`, resolved from the pointing document.
//     It is an assertion: the writer made it clickable, so a target that is not there is broken
//     and the gate says so.
//   - a path between backticks, `docs/product/BRIEF.md`, which is how the rulebook and the
//     skills name a file. It is a mention: it is a link when it resolves, and prose when it does
//     not, because Groundwork's own documents name files a project has not created yet
//     (`docs/product/ARCHITECTURE.md` before `architect` runs) and shorthands that are not paths.
//
// A mention that resolves to nothing is prose most of the time, and a dead path the rest of the
// time, and nothing here can tell those apart. So the ones left over are counted and shown rather
// than gated: a number a reader can act on, which is also the number that has to catch a real
// rename before a gate is worth arguing for (INTAKE row 12).
//
// The derivation itself is pure: documents in, who points at whom out. The one filesystem
// question it needs (does this path exist?) is injected, so it can be tested against fixtures
// directly; `projectGraph` is where that question gets its real answer.
// Spec: docs/specs/010-cockpit (maintainer-local).

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative, resolve, sep, posix, isAbsolute } from 'node:path';

// Not part of the project: build output and other people's code. Shared with the gate's own walk
// so "which directories are not this project" has one answer.
export const SKIP_DIRS = new Set(['.git', 'node_modules', 'dist', 'build', 'coverage', '.next']);

// A fenced block is a sample, not a pointer: code that shows a path is not the document pointing
// at it. The gate has always read prose this way.
const FENCE = /```[\s\S]*?```/g;
const MD_LINK = /\[[^\]]*\]\(([^)\s]+)\)/g;
const CODE_SPAN = /`([^`\n]+)`/g;
const EXTERNAL = /^(https?:|mailto:)/;
// A mention has to be spelled like a file to be one: no spaces (that is a command line), a real
// extension at the end, and none of the marks that make a pattern rather than a path - a glob
// (`standards/*.md`), a placeholder (`docs/standards/<stack>.md`), a home path (`~/.claude`), or
// a tool's own prefix (`@AGENTS.md`).
const NOT_A_PATH = /[\s*?<>[\]|"']|^[~@]|:\/\//;
// Three kinds of document record what was true then rather than what is true now: a decision
// record, an archived spec, and a rotated log entry. They name files as the project named them
// at the time, so a citation there is history and not a pointer that rotted, and it must not
// decay into the number that exists to catch a rename somebody missed. checks/check.mjs skips
// these same three for the denylist and the phrase bans, on the same reading of what the
// document is for. Mentions only: a markdown link is an assertion its writer made clickable,
// the gate fails on it wherever it stands, and the report says what the gate says.
const HISTORY_DIRS = ['docs/decisions/', 'docs/specs/archive/', 'docs/state/log/'];
const citesThePast = (path) => HISTORY_DIRS.some((d) => path.startsWith(d));
const HAS_EXTENSION = /\.[a-z0-9]{1,6}$/i;

// A malformed escape is a broken link, never a crashed check: the path is read as written.
const decode = (target) => { try { return decodeURI(target); } catch { return target; } };

// The links a document spells out. `raw` is what the writer typed, so a failure can quote it
// back; `asserted` separates the two spellings above.
export function parseLinks(text) {
  const prose = String(text).replace(FENCE, '');
  const links = [];
  for (const m of prose.matchAll(MD_LINK)) {
    const target = m[1].split('#')[0];
    if (!target || EXTERNAL.test(target) || isAbsolute(target)) continue;
    links.push({ raw: m[1], target, asserted: true });
  }
  for (const m of prose.matchAll(CODE_SPAN)) {
    const mention = m[1].trim();
    const target = mention.split('#')[0];
    if (!target || NOT_A_PATH.test(mention) || !HAS_EXTENSION.test(target) || isAbsolute(target)) continue;
    links.push({ raw: mention, target, asserted: false });
  }
  return links;
}

// Where a link can land, in the order it is meant. A markdown link is a hyperlink and resolves
// from the document that carries it, which is the only reading a browser or an editor gives it.
// A mention resolves from the document first and from the project root second, because this
// project names a file both ways: `state/STATE.md` inside the docs manifest, and
// `docs/state/STATE.md` everywhere else.
export function linkTargets(fromPath, link) {
  const here = posix.normalize(posix.join(posix.dirname(fromPath), decode(link.target)));
  const from = (p) => p.replace(/^\.\//, '').replace(/\/+$/, '');
  return link.asserted ? [from(here)] : [...new Set([from(here), from(posix.normalize(decode(link.target)))])];
}

// Pointed at by this many documents or more is load-bearing: moving or deleting it is a decision,
// not a tidy-up. A stated number beats a clever ranking, which would crown a hub in a project
// that has none.
export const HUB_MIN = 4;

// documents: [{ path, text }] in, who points at whom out. Pure on purpose (testing seam).
//
// `exists` answers the second question a path can be asked. The graph is between documents, so a
// path landing on `checks/check.mjs` is no edge - but it is not a failure either, and most of what
// a document names beyond its neighbours is exactly that, so counting those as misses would bury
// the ones a reader can act on. What is left after both questions is the residual: written as a
// path, and nothing is there when you follow it. It is reported as a number and never gated,
// because the honest remainder still holds names a project creates later
// (`docs/product/ARCHITECTURE.md` before `architect` runs), and an allowance list for those is the
// thing that rots (INTAKE row 12, decision 0013's warning-before-gate route).
export function linkGraph(documents, { exists = () => false } = {}) {
  const rows = new Map(documents.map((d) => [d.path, { path: d.path, inbound: new Set(), outbound: new Set() }]));
  const unresolved = [];
  let links = 0;
  for (const doc of documents) {
    const row = rows.get(doc.path);
    // The same path written twice in one document is one claim about one file, so it is one row
    // here: repetition would inflate the number without adding anything to fix. The key is the
    // target rather than what the writer typed, or a link carrying a fragment would count a second
    // time against the same file.
    const asked = new Set();
    for (const link of parseLinks(doc.text)) {
      const candidates = linkTargets(doc.path, link);
      const hit = candidates.find((c) => rows.has(c));
      if (!hit) {
        // A markdown link among these is also a red gate (checks/check.mjs, links); a mention is
        // only ever reported. Both are the same fact to a reader deciding whether a path is dead,
        // except where the document is a record of what was true then (HISTORY_DIRS above).
        const cited = !link.asserted && citesThePast(doc.path);
        if (!cited && !asked.has(link.target) && !candidates.some(exists)) unresolved.push({ from: doc.path, raw: link.raw });
        asked.add(link.target);
        continue;
      }
      // A document pointing at itself is a table of contents, not a link between documents.
      if (hit === doc.path || row.outbound.has(hit)) continue;
      row.outbound.add(hit);
      rows.get(hit).inbound.add(doc.path);
      links += 1;
    }
  }
  const byPath = (a, b) => a.localeCompare(b);
  const list = [...rows.values()]
    .map((r) => ({ path: r.path, inbound: [...r.inbound].sort(byPath), outbound: [...r.outbound].sort(byPath) }))
    .sort((a, b) => byPath(a.path, b.path));
  return {
    documents: list,
    links,
    unresolved: unresolved.sort((a, b) => byPath(a.from, b.from) || byPath(a.raw, b.raw)),
    orphans: list.filter((d) => !d.inbound.length).map((d) => d.path),
    hubs: list.filter((d) => d.inbound.length >= HUB_MIN)
      .map((d) => ({ path: d.path, count: d.inbound.length }))
      .sort((a, b) => b.count - a.count || byPath(a.path, b.path)),
  };
}

// The project's documents, read once for whoever asks: the gate polices exactly the set the
// board draws.
export function readDocuments(root) {
  const documents = [];
  const walk = (dir) => {
    let entries;
    try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const entry of entries) {
      // A symlink is the same document under a second name, and following one can leave the
      // project entirely.
      if (entry.isSymbolicLink()) continue;
      const full = join(dir, entry.name);
      if (entry.isDirectory()) { if (!SKIP_DIRS.has(entry.name)) walk(full); continue; }
      if (!entry.name.endsWith('.md')) continue;
      documents.push({
        path: relative(root, full).split('\\').join('/'),
        text: readFileSync(full, 'utf8').replace(/\r\n/g, '\n'),
      });
    }
  };
  walk(root);
  return documents.sort((a, b) => a.path.localeCompare(b.path));
}

// The project's own graph, built once here so the board and the one-shot command cannot answer
// the same question differently, and the only place the filesystem gets asked anything.
//
// A candidate that climbs out of the project is not this project's file, and answering "that one
// is fine" about it would hide a dead path behind a stat of the disk outside the root. Containment
// is decided the way checks/cockpit-path.mjs decides it, because a spelling test is not
// containment: `../..` normalizes to `..`, which starts with no `../` at all, and a Windows
// checkout can spell the same climb with backslashes that posix normalizing leaves alone.
// resolve() folds every spelling into one absolute path, and only then is it compared.
export function projectGraph(root) {
  const base = resolve(root);
  const exists = (p) => {
    const full = resolve(base, p);
    return (full === base || full.startsWith(base + sep)) && existsSync(full);
  };
  return linkGraph(readDocuments(root), { exists });
}

// The framing words for both surfaces, so the page and the one-shot command say the same thing.
export const LINK_WORDS = {
  en: {
    heading: 'How the documents point at each other',
    summary: (docs, links) => `${docs} documents, with ${links} links between them`,
    whatCounts: 'A link is a path a document spells out: a markdown link, or a path between backticks.',
    noDocuments: 'There are no documents to read yet.',
    hubs: (n) => `${n} or more documents point at these`,
    hubCount: (n) => `${n} documents point at it`,
    noHubs: (n) => `No document is pointed at by ${n} or more others, so nothing is load-bearing yet.`,
    orphans: 'Nothing points at these',
    orphansWhy: 'A file is named without a path too: the rulebook names a skill by its name and points at the decision records by their directory, so no path leads to those.',
    noOrphans: 'Every document is pointed at by at least one other.',
    unresolved: 'Paths that point at nothing',
    unresolvedWhy: 'Written as a path, and nothing is there when you follow it: a rename nobody followed, a name shortened to its bare filename, or prose shaped like a path. A file named inside a decision record, an archived spec or a rotated log entry is not counted: that is what the project called it at the time.',
    noUnresolved: 'Every path spelled out lands on a document or on a file.',
    each: 'Every document, and what it points at',
    pointsAt: 'Points at',
    pointsAtNothing: 'Points at no other document.',
    pointedAtBy: 'Pointed at by',
    pointedAtByNothing: 'No document points at it.',
  },
  nl: {
    heading: 'Hoe de documenten naar elkaar wijzen',
    summary: (docs, links) => `${docs} documenten, met ${links} verwijzingen ertussen`,
    whatCounts: 'Een verwijzing is een pad dat een document uitschrijft: een markdown-link, of een pad tussen backticks.',
    noDocuments: 'Er zijn nog geen documenten om te lezen.',
    hubs: (n) => `${n} of meer documenten wijzen hiernaar`,
    hubCount: (n) => `${n} documenten wijzen ernaar`,
    noHubs: (n) => `Geen enkel document wordt door ${n} of meer andere aangewezen, dus nog niets is dragend.`,
    orphans: 'Hier wijst niets naar',
    orphansWhy: 'Een bestand wordt ook zonder pad genoemd: het rulebook noemt een skill bij naam en wijst de decision records per map aan, dus daar leidt geen pad heen.',
    noOrphans: 'Elk document wordt door minstens een ander aangewezen.',
    unresolved: 'Paden die nergens heen wijzen',
    unresolvedWhy: 'Uitgeschreven als pad, en er staat niets waar het heen wijst: een hernoeming die niemand volgde, een naam ingekort tot alleen de bestandsnaam, of proza in de vorm van een pad. Een bestand dat genoemd wordt in een decision record, een gearchiveerde spec of een gearchiveerd logboek telt niet mee: zo heette het toen.',
    noUnresolved: 'Elk uitgeschreven pad komt uit bij een document of een bestand.',
    each: 'Elk document, en waar het naar wijst',
    pointsAt: 'Wijst naar',
    pointsAtNothing: 'Wijst naar geen enkel ander document.',
    pointedAtBy: 'Aangewezen door',
    pointedAtByNothing: 'Geen enkel document wijst hiernaar.',
  },
};

// The same derivation as plain text, for the terminal (criterion 20). The board renders the same
// facts as a card; neither is the source of the other.
export function renderLinks(project, graph) {
  const w = LINK_WORDS[project.lang] || LINK_WORDS.en;
  const out = [project.name, '', w.heading, ''];
  if (!graph.documents.length) {
    out.push(w.noDocuments);
    return out.join('\n');
  }
  out.push(`${w.summary(graph.documents.length, graph.links)}.`, w.whatCounts, '');
  out.push(graph.hubs.length ? w.hubs(HUB_MIN) : w.noHubs(HUB_MIN));
  for (const hub of graph.hubs) out.push(`  - ${hub.path} (${w.hubCount(hub.count)})`);
  out.push('', graph.orphans.length ? `${w.orphans} (${graph.orphans.length})` : w.noOrphans);
  for (const path of graph.orphans) out.push(`  - ${path}`);
  if (graph.orphans.length) out.push(w.orphansWhy);
  out.push('', graph.unresolved.length ? `${w.unresolved} (${graph.unresolved.length})` : w.noUnresolved);
  // The only place this report prints text a document wrote rather than text it derived, and a
  // terminal is a sink: an escape sequence between backticks would repaint the report around it.
  for (const miss of graph.unresolved) out.push(`  - ${miss.from}: ${miss.raw.replace(/[\x00-\x1f\x7f]/g, '')}`);
  if (graph.unresolved.length) out.push(w.unresolvedWhy);
  out.push('', w.each);
  for (const doc of graph.documents) {
    out.push(`  ${doc.path}`);
    out.push(doc.outbound.length ? `    ${w.pointsAt}: ${doc.outbound.join(', ')}` : `    ${w.pointsAtNothing}`);
    out.push(doc.inbound.length ? `    ${w.pointedAtBy}: ${doc.inbound.join(', ')}` : `    ${w.pointedAtByNothing}`);
  }
  return out.join('\n');
}
