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
// The derivation itself is pure: documents in, who points at whom out. No filesystem, so it can
// be tested against fixtures directly.
// Spec: docs/specs/010-cockpit (maintainer-local).

import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, posix, isAbsolute } from 'node:path';

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
export function linkGraph(documents) {
  const rows = new Map(documents.map((d) => [d.path, { path: d.path, inbound: new Set(), outbound: new Set() }]));
  let links = 0;
  for (const doc of documents) {
    const row = rows.get(doc.path);
    for (const link of parseLinks(doc.text)) {
      const hit = linkTargets(doc.path, link).find((c) => rows.has(c));
      // A document pointing at itself is a table of contents, not a link between documents.
      if (!hit || hit === doc.path || row.outbound.has(hit)) continue;
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
    noOrphans: 'Every document is pointed at by at least one other.',
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
    noOrphans: 'Elk document wordt door minstens een ander aangewezen.',
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
  out.push('', w.each);
  for (const doc of graph.documents) {
    out.push(`  ${doc.path}`);
    out.push(doc.outbound.length ? `    ${w.pointsAt}: ${doc.outbound.join(', ')}` : `    ${w.pointsAtNothing}`);
    out.push(doc.inbound.length ? `    ${w.pointedAtBy}: ${doc.inbound.join(', ')}` : `    ${w.pointedAtByNothing}`);
  }
  return out.join('\n');
}
