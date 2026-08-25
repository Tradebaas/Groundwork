// The four shelves every document in the project stands on: why we build it, what we are building
// now, how it is built, what we decided and learned. They are the sidebar's four chapters, and
// every row under one is a document that exists on disk, opening on the file route.
//
// One rule lives here, and only here: which shelf a document stands on. Its path decides, through
// the one table below. A shelf is a view of the tree, never a second place a document is
// registered (decision 0021), so no file has to be classified by hand and no copy of this project
// migrates a manifest to get one. A path the table does not know still lands on a named shelf.
// Story: docs/work/E-01-agile-first/F-04-board/S-04-four-shelves-and-the-file-pages (local),
//        then S-07, which moved the shelves off the board page and into the sidebar.

import { readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { SKIP_DIRS } from './links.mjs';

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

// The shelf names. Everything with project content in it comes from the project's own files, so
// only these connectors live here.
export const SHELF_WORDS = {
  en: {
    shelfNames: {
      why: 'Why we build it',
      now: 'What we are building now',
      built: 'How it is built',
      learned: 'What we decided and learned',
      other: 'Not on a shelf yet',
    },
  },
  nl: {
    shelfNames: {
      why: 'Waarom we het bouwen',
      now: 'Wat we nu bouwen',
      built: 'Hoe het gebouwd is',
      learned: 'Wat we besloten en geleerd hebben',
      other: 'Nog op geen plank',
    },
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

// Every document in docs/, with the shelf it stands on. A document the manifest does not cover
// (a project's gitignored working notes, a folder written before its manifest row) is listed just
// the same: this says what is on disk, and nothing else decides whether a document exists.
export function shelfDocuments(root) {
  return walk(resolve(root, DOCS), DOCS, [])
    .sort((a, b) => a.localeCompare(b))
    .map((path) => ({ path, shelf: shelfFor(path) }));
}
