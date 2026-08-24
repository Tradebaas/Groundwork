// The four shelves under the lanes: why we build it, what we are building now, how it is built,
// what we decided and learned. Beside the round in flight, this is the whole project - and every
// row on a shelf is a document that exists on disk, opening on the file route.
//
// Two rules live here, and only here:
//  1. Which shelf a document stands on. Its path decides, through the one table below. A shelf is
//     a view of the tree, never a second place a document is registered (decision 0021), so no
//     file has to be classified by hand and no copy of this project migrates a manifest to get
//     one. A path the table does not know still lands on a named shelf.
//  2. What a row says. The sentence is the manifest's own, found through the same matcher the
//     docs-manifest gate uses (progress.mjs), so no document is described twice.
// Story: docs/work/E-01-agile-first/F-04-board/S-04-four-shelves-and-the-file-pages (local).

import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { parseManifest, manifestMatcher, MANIFEST_PATH } from './progress.mjs';
import { SKIP_DIRS } from './links.mjs';
import { escapeHtml, sentence, pathName } from './board-shell.mjs';

const DOCS = 'docs';

// The four shelves, in the order a person asks the questions: why are we doing this, what is on
// the bench, how is it built, what did we settle. Their keys are what the rule below returns.
export const SHELVES = ['why', 'now', 'built', 'learned'];

// Where a document lands when the table below has never heard of its folder. It is a shelf of its
// own rather than a wrong one, and it only appears when it holds something: an empty catch-all
// would be a question nobody asked, and a document filed under the wrong heading is worse than a
// document filed under an honest one.
export const OTHER = 'other';

// The one table. First match wins, so a path that ends in "/" is a folder and anything else is
// one named file; the narrower row is written above the wider one it sits inside.
const RULE = [
  // The system map answers how, not why, so it leaves the folder its neighbours belong to.
  ['docs/product/ARCHITECTURE.md', 'built'],
  ['docs/product/', 'why'],
  // A rotated log is history; the live handoff, the debt and the intake are the bench.
  ['docs/state/log/', 'learned'],
  ['docs/state/', 'now'],
  // A shipped spec is what we decided; an open one is what we are building.
  ['docs/specs/archive/', 'learned'],
  ['docs/specs/', 'now'],
  ['docs/work/', 'now'],
  ['docs/decisions/', 'learned'],
  ['docs/standards/', 'built'],
  ['docs/operations/', 'built'],
  ['docs/compliance/', 'built'],
  ['docs/design/', 'built'],
  ['docs/DESIGN.md', 'built'],
  ['docs/PRODUCT.md', 'built'],
  // The manifest says where every document lives and which fact it owns, which is part of how
  // this project is built rather than of what it is for.
  ['docs/README.md', 'built'],
];

// A path in, a shelf out. Null for a path that is no project document at all: the board names
// files outside docs/ too (the reader that counts the gates, the one that draws the links), and
// those stand on no shelf.
export function shelfFor(relPath) {
  if (typeof relPath !== 'string' || !relPath.startsWith(`${DOCS}/`)) return null;
  for (const [where, shelf] of RULE) {
    if (where.endsWith('/') ? relPath.startsWith(where) : relPath === where) return shelf;
  }
  return OTHER;
}

// The shelf names, and the two sentences the shelves need beyond them. Everything with project
// content in it comes from the project's own files, so only these connectors live here.
export const SHELF_WORDS = {
  en: {
    shelfNames: {
      why: 'Why we build it',
      now: 'What we are building now',
      built: 'How it is built',
      learned: 'What we decided and learned',
      other: 'Not on a shelf yet',
    },
    shelfEmpty: 'No document here yet.',
    otherWhy: 'These sit in a folder the shelf rule does not know, so they are named here rather '
      + 'than left off the page.',
  },
  nl: {
    shelfNames: {
      why: 'Waarom we het bouwen',
      now: 'Wat we nu bouwen',
      built: 'Hoe het gebouwd is',
      learned: 'Wat we besloten en geleerd hebben',
      other: 'Nog op geen plank',
    },
    shelfEmpty: 'Hier staat nog geen document.',
    otherWhy: 'Deze staan in een map die de plankregel niet kent, dus worden ze hier genoemd in '
      + 'plaats van weggelaten.',
  },
};

// ---------------------------------------------------------------- the documents

function walk(dir, relDir, out) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch (e) {
    // A project with no docs/ yet has nothing on its shelves, which is a state and not a
    // failure. Anything else - a folder that cannot be read, a name that is no folder at all -
    // is carried up and named on the page, never quietly rendered as a shelf holding nothing.
    if (e.code === 'ENOENT') return out;
    throw e;
  }
  for (const e of entries) {
    if (e.isSymbolicLink()) continue;
    const r = `${relDir}/${e.name}`;
    if (e.isDirectory()) {
      if (!SKIP_DIRS.has(e.name)) walk(join(dir, e.name), r, out);
      continue;
    }
    // A folder keeper is not a document; it is how git carries an empty folder.
    if (e.name === '.gitkeep') continue;
    out.push(r);
  }
  return out;
}

// Every document in docs/, with the shelf it stands on and the manifest's own words for what it
// owns. Files the manifest does not cover (a project's gitignored working notes, a folder written
// before its manifest row) are still listed: the shelves show what is on disk, and a row with no
// sentence is an honest row.
export function shelfDocuments(root) {
  const manifest = resolve(root, MANIFEST_PATH);
  const covers = manifestMatcher(existsSync(manifest) ? parseManifest(readFileSync(manifest, 'utf8')) : []);
  return walk(resolve(root, DOCS), DOCS, [])
    .sort((a, b) => a.localeCompare(b))
    .map((path) => {
      const row = covers(path.slice(`${DOCS}/`.length));
      return { path, shelf: shelfFor(path), owns: row?.owns || null };
    });
}

// ---------------------------------------------------------------- the shelves themselves

// A document, named the way the manifest names it (from inside docs/) and opening on its full
// path, with the fact it owns beside it in the manifest's own words. A file no row covers is
// named and says nothing further: inventing a sentence for it would be the second description
// this shelf exists to avoid.
function row(doc, opens) {
  const name = pathName(doc.path, opens, doc.path.slice(`${DOCS}/`.length));
  return `<li>${name}${doc.owns ? ` - ${sentence(doc.owns)}` : ''}</li>`;
}

// One shelf: folded behind the number of documents it holds, and named even when it holds none.
// The id is what a file page comes back to.
function shelf(key, docs, w, opens) {
  const body = docs.length
    ? `<ul class="docs">${docs.map((d) => row(d, opens)).join('')}</ul>`
      + (key === OTHER ? `\n<p class="hint">${escapeHtml(w.otherWhy)}</p>` : '')
    : `<p class="empty">${escapeHtml(w.shelfEmpty)}</p>`;
  return `<section class="shelf" id="shelf-${key}"><details>`
    + `<summary><span class="ttl">${escapeHtml(w.shelfNames[key])}</span>`
    + `<span class="tail"><span class="wip">${docs.length}</span></span></summary>`
    + `\n${body}</details></section>`;
}

export function renderShelves(docs, w, opens = () => false) {
  // Everything the four shelves do not claim goes to the named one, rather than the OTHER key
  // alone. A shelf added to the rule above and forgotten here would otherwise take its documents
  // off the page silently, and no document may disappear from the board.
  const stray = docs.filter((d) => !SHELVES.includes(d.shelf));
  return `<div class="shelves">`
    + `${SHELVES.map((key) => shelf(key, docs.filter((d) => d.shelf === key), w, opens)).join('')}`
    + `${stray.length ? shelf(OTHER, stray, w, opens) : ''}</div>`;
}
