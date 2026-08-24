// The two pages beside the board: one file as it lies on disk, and the notice that stands in for
// a page this server will not give. Both render in the same shell as the board itself
// (checks/board-shell.mjs), so a reader who follows a name off the board stays in one place.
// What may be opened is decided in checks/cockpit-path.mjs; serving is checks/cockpit.mjs; the
// board is checks/board-page.mjs. Nothing here touches the network.
//
// Until E-01/F-04/S-04 this file also held six cards on a page of their own at /overview. That
// page is retired: what it answered is on the board, where the four shelves (checks/shelves.mjs)
// replaced its file map and the two lines under them (checks/board-strip.mjs) its gates and its
// links. Spec: docs/specs/010-cockpit (maintainer-local).

import { shelfFor, SHELF_WORDS } from './shelves.mjs';
import { shellWords, escapeHtml, page } from './board-shell.mjs';

// The framing words these two pages need beyond the shell's own. Everything else on a file page
// is the file.
export const FILE_WORDS = {
  en: {
    onShelf: 'On the shelf',
    readOnly: 'This file as it is on disk right now, read-only.',
    refused: 'Not available.',
    notShown: (name, size) => `${name} is ${size} and is not shown here. Open it on disk.`,
    binary: (name, size) => `${name} is not text (${size}) and is not shown here.`,
    broke: 'The board could not be built. The reason is printed where you started it.',
  },
  nl: {
    onShelf: 'Op de plank',
    readOnly: 'Dit bestand zoals het nu op schijf staat, alleen-lezen.',
    refused: 'Niet beschikbaar.',
    notShown: (name, size) => `${name} is ${size} en wordt hier niet getoond. Open het op schijf.`,
    binary: (name, size) => `${name} is geen tekst (${size}) en wordt hier niet getoond.`,
    broke: 'Het overzicht kon niet worden opgebouwd. De reden staat waar je het gestart hebt.',
  },
};

export const words = (lang) => ({
  ...shellWords(lang), ...(SHELF_WORDS[lang] || SHELF_WORDS.en), ...(FILE_WORDS[lang] || FILE_WORDS.en),
});

export function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} bytes`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Where a reader came from, and the one click back. The shelf is not remembered and not passed
// along: it is read off the path by the same rule that put the file on that shelf, so a link
// somebody kept says the same thing tomorrow. A file that stands on no shelf (the readers the two
// lines under the shelves name, which live outside docs/) goes back to the board itself.
function backFrom(relPath, w) {
  const shelf = shelfFor(relPath);
  return shelf
    ? `${escapeHtml(w.onShelf)} <a href="/#shelf-${shelf}">${escapeHtml(w.shelfNames[shelf])}</a>.`
    : `<a href="/">${escapeHtml(w.back)}</a>`;
}

export function renderFile(project, relPath, text) {
  const w = words(project.lang);
  return page({
    lang: project.lang,
    title: relPath,
    body: [
      `<h1>${escapeHtml(relPath)}</h1>`,
      `<p class="sub">${escapeHtml(w.readOnly)} ${backFrom(relPath, w)}</p>`,
      `<pre>${escapeHtml(text)}</pre>`,
    ].join('\n'),
  });
}

export function renderNotice(project, notice) {
  const w = words(project.lang);
  return page({
    lang: project.lang,
    title: notice,
    body: [
      `<h1>${escapeHtml(notice)}</h1>`,
      `<p class="sub"><a href="/">${escapeHtml(w.back)}</a></p>`,
    ].join('\n'),
  });
}
