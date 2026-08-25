// The sidebar: four destinations, four subjects, one word per row. It is the whole navigation of
// this board and the first thing anyone who adopts Groundwork sees of their own project, so it is
// held to one rule above all others: a person finds where they are going without reading.
//
// The shape follows the way Confluence tells a team to lay a project space out - a shallow tree of
// subjects with their pages under them, and an index page per kind rather than every file in the
// navigation. Groundwork's own four shelves (decision 0021, Diataxis) are those subjects.
//
// What is deliberately not in here, and why:
//  - The work tree. Its epic, features and stories are the three derived pages at the top; listing
//    the same files again would put every card in the tree twice.
//  - Templates. They are scaffolding for the agent, not pages the owner reads, and four of them
//    carry the same title as the document they are a blank of.
//  - Anything the file route will not serve. In navigation, a row you cannot open is not a
//    destination; it is a status report, and it is named on the index page where the reason fits.
//  - Any folder holding more than FOLD_AT documents. That folder becomes one row to its own index
//    page. Twenty-one decisions under one heading is a filing cabinet, not a choice.
// None of that hides a document: every one of them is named on an index page one click away.
//
// Sources: Atlassian, "Organize and customize your Confluence space" and "Best practices for a
// great page tree experience"; Confluence Data Center, "Blueprints" (an index page per kind,
// linked from the sidebar).

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { SHELVES, OTHER } from './shelves.mjs';
import { escapeHtml, fileHref } from './board-shell.mjs';
import { icon } from './board-icons.mjs';

// Past this many documents a folder stops being a list and becomes a place.
const FOLD_AT = 3;

// Which icon a row gets. Its path decides, first match wins, the way the shelf rule does: no file
// is tagged by hand, and a project that adds a folder still gets a sensible face.
const ICONS = [
  ['docs/product/VISION', 'eye'],
  ['docs/product/BRIEF', 'crosshair'],
  ['docs/product/CONTEXT', 'book-a'],
  ['docs/product/ARCHITECTURE', 'network'],
  ['docs/state/INTAKE', 'inbox'],
  ['docs/state/DEBT', 'triangle-alert'],
  ['docs/state/log', 'history'],
  ['docs/state/', 'square-pen'],
  ['docs/specs/archive', 'archive'],
  ['docs/specs', 'file-text'],
  ['docs/decisions', 'scale'],
  ['docs/standards', 'compass'],
  ['docs/compliance', 'shield-check'],
  ['docs/operations', 'list-checks'],
  ['docs/design', 'palette'],
  ['docs/DESIGN', 'palette'],
  ['docs/PRODUCT', 'layers'],
  ['docs/README', 'book-open'],
];

const iconFor = (path) => (ICONS.find(([p]) => path.startsWith(p)) || [, 'file-text'])[1];

// A navigation label is a name, not a title. A document's own first heading is written for the
// page it opens ("BRIEF: what this project is and is not"), and the part before the colon is the
// name a person would say out loud, so that is what a row carries. The full heading goes in the
// row's title attribute, where a reader who wants it can still get it.
const shortLabel = (heading, relPath) => {
  const named = heading.match(/^([A-Za-z][A-Za-z0-9 -]{1,18}?)\s*[:(]/);
  if (named) {
    const word = named[1].trim();
    return word.length > 3 && word === word.toUpperCase()
      ? word.charAt(0) + word.slice(1).toLowerCase()
      : word;
  }
  if (heading.length <= 22) return heading;
  const stem = relPath.split('/').pop().replace(/\.local\.md$|\.md$|\.html$/, '');
  // A two-letter opening word is an initialism (ui, ai, eu), not a word to sentence-case.
  return stem.replace(/[-_]/g, ' ')
    .replace(/^([a-z]{2})\b/, (m2) => m2.toUpperCase())
    .replace(/^([a-z])/, (ch) => ch.toUpperCase());
};

// What a page is called, read from the file itself: the heading is where a reader would look for
// it and the only place it is written down.
export function headingOf(root, relPath) {
  try {
    const head = readFileSync(resolve(root, relPath), 'utf8').slice(0, 2000);
    const m = head.match(/^#\s+(.+?)\s*$/m);
    if (m) return m[1].replace(/^(?:EPIC|E-\d{2}|F(?:-\d{2})?|S-\d{2}):\s*/, '').trim();
  } catch { /* a file that cannot be read is named by its path, like any other */ }
  return relPath.slice('docs/'.length).replace(/\.local\.md$|\.md$/, '');
}

// Two names this project's own files carry that read badly as a row, and nowhere else to put
// the mapping: it is about wording, which is this file's business.
const RENAME = { 'docs/README.md': 'Manifest', 'docs/PRODUCT.md': 'Product record' };

export const titleOf = headingOf;

// A short name for a folder, from the folder itself. "docs/state/log" -> "Log".
const folderLabel = (dir) => {
  const last = dir.split('/').pop();
  return last.charAt(0).toUpperCase() + last.slice(1);
};

const IS_WORK = (p) => p.startsWith('docs/work/');
const IS_TEMPLATE = (p) => /(^|\/)TEMPLATE[-.]/i.test(p) || /-TEMPLATE\.md$/i.test(p)
  || /(^|\/)[a-z-]*template[a-z-]*\.md$/i.test(p);
// Which place a document belongs to: the first folder under docs/, so an archive full of spec
// folders counts as one archive instead of one row per spec. A file lying loose in docs/ is its
// own place, because there is nothing above it to fold into.
const sectionOf = (p) => {
  const parts = p.split('/');
  return parts.length > 2 ? `${parts[0]}/${parts[1]}` : p;
};

// What to call a folded place: the deepest folder every document in it shares. The log lives at
// docs/state/log while the rest of docs/state does not, so it is called Log and not State.
const commonDir = (paths) => {
  const split = paths.map((p) => p.slice(0, p.lastIndexOf('/')).split('/'));
  const first = split[0];
  let i = 0;
  while (i < first.length && split.every((s2) => s2[i] === first[i])) i += 1;
  return first.slice(0, i).join('/');
};

// The four destinations the work tree earns. They sit above the subjects, permanently, because
// they are what a person opened this board for - not peers of a document.
const DESTINATIONS = (w) => [
  { href: '/', label: w.start, icon: 'house' },
  { href: '/board', label: w.boardShort, icon: 'columns-3' },
  { href: '/epic', label: w.epic, icon: 'target' },
  { href: '/features', label: w.features, icon: 'layers' },
];

export const folderHref = (dir) => `/folder?path=${encodeURIComponent(dir)}`;

export function navModel(root, docs, w, opens = () => true) {
  const live = docs.filter((d) => !IS_WORK(d.path) && !IS_TEMPLATE(d.path) && opens(d.path));
  return [...SHELVES, OTHER].map((key) => {
    const mine = live.filter((d) => (SHELVES.includes(d.shelf) ? d.shelf : OTHER) === key);
    if (!mine.length) return null;
    // Folders first, so a subject reads as a few places and then a few pages.
    const byDir = new Map();
    for (const d of mine) {
      const dir = sectionOf(d.path);
      if (!byDir.has(dir)) byDir.set(dir, []);
      byDir.get(dir).push(d);
    }
    const rows = [];
    for (const [, held] of [...byDir].sort((a, b) => b[1].length - a[1].length)) {
      const dir = commonDir(held.map((d) => d.path));
      if (held.length > FOLD_AT) {
        // The count is what the page behind this row will show, not what survived the filters:
        // a row standing in for a place says how much is in the place.
        const inPlace = docs.filter((d) => d.path.startsWith(`${dir}/`)).length;
        rows.push({
          href: folderHref(dir), label: folderLabel(dir), icon: iconFor(`${dir}/`),
          count: inPlace, full: dir, dir,
        });
      } else if (held.length === 1 && held[0].path.split('/').length > 2) {
        // A folder holding one document is a concept with an instance in it, so the row carries
        // the concept: "Standards", not the name of the single file that happens to fill it.
        rows.push({
          href: fileHref(held[0].path), label: folderLabel(dir), icon: iconFor(held[0].path),
          full: headingOf(root, held[0].path), path: held[0].path,
        });
      } else {
        for (const d of held) {
          const heading = headingOf(root, d.path);
          rows.push({
            href: fileHref(d.path),
            label: RENAME[d.path] || shortLabel(heading, d.path),
            icon: iconFor(d.path), full: heading, path: d.path,
          });
        }
      }
    }
    // Two rows that read the same are two rows a person has to open to tell apart. When a short
    // name collides, both fall back to the file's own name, which is the thing that differs.
    const seen = new Map();
    for (const r of rows) seen.set(r.label, (seen.get(r.label) || 0) + 1);
    for (const r of rows) {
      if (seen.get(r.label) > 1 && r.path) {
        r.label = r.path.split('/').pop().replace(/\.local\.md$|\.md$/, '');
      }
    }
    return { key, label: w.navNames[key], rows };
  }).filter(Boolean);
}

// ---------------------------------------------------------------- the sidebar itself

// Which document a route is showing, so a row standing for a folder can tell whether the reader
// is inside it. Anything that is not a file route is nobody's document.
const shownBy = (here) => {
  const m = /^\/file\?path=(.*)$/.exec(here || '');
  if (!m) return null;
  try { return decodeURIComponent(m[1]); } catch { return null; }
};

// A row is marked when it is the page, and also when it is the place the page sits in: a folder
// holding more documents than fit gets one row, and without this a reader who followed a link
// into it would meet a sidebar with nothing open and nothing marked, which is the dead end this
// navigation exists to end. The two are told apart the way ARIA tells them apart - "page" is this
// page, "location" is where in the tree this page is - so neither claims to be the other.
const marks = (p, here) => {
  if (p.href === here) return 'page';
  const doc = shownBy(here);
  return p.dir && doc && doc.startsWith(`${p.dir}/`) ? 'location' : null;
};

const row = (p, here) => {
  const mark = marks(p, here);
  const on = mark !== null;
  return `<li><a class="plink${on ? ' on' : ''}" href="${escapeHtml(p.href)}"`
    + `${on ? ` aria-current="${mark}"` : ''}`
    + `${p.full ? ` title="${escapeHtml(p.full)}"` : ''}>`
    + `${icon(p.icon)}<span>${escapeHtml(p.label)}</span>`
    + `${p.count ? `<b class="n">${p.count}</b>` : ''}</a></li>`;
};

// A chapter arrives closed. What a person meets is four destinations and four names, and the
// documents are one click behind the name they belong to - which is the whole point of grouping
// them. The one exception is the chapter holding the page you are on: no script runs here, so a
// closed chapter would leave a document page with nothing saying where in the project it sits.
// failure: the reason docs/ could not be walked, when it could not. It is said where the subjects
// would have stood, because a sidebar that quietly shows no documents reads as a project with
// none, and that is the one thing this navigation may never say by accident.
export function sidebar(name, model, w, { here = '/', failure = null } = {}) {
  const groups = model.map((g) => {
    const holdsHere = g.rows.some((p) => marks(p, here) !== null);
    return `<div class="topic"><details${holdsHere ? ' open' : ''}>`
      + `<summary><span class="ttl">${escapeHtml(g.label)}</span>${icon('chevron-right')}</summary>`
      + `<ul>${g.rows.map((p) => row(p, here)).join('')}</ul></details></div>`;
  }).join('');
  const subjects = failure
    ? `<p class="note">${escapeHtml(w.partFailed(failure.message))}</p>`
    : groups;
  return `<nav class="side" aria-label="${escapeHtml(w.navLabel)}">`
    + `<a class="mark" href="/">${escapeHtml(name)}</a>`
    + `<ul class="dest">${DESTINATIONS(w).map((p) => row(p, here)).join('')}</ul>`
    + `${subjects}</nav>`;
}
