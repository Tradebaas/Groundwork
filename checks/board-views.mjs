// The pages an epic and a feature get of their own. The board next door is only the board - the
// lanes, the stories in them and the steps on each story - so the things a person reads rather
// than scans live here, one page each, the way a project space gives every subject its own page
// and an index page that lists the kind.
//
// Nothing on these pages is stored: an epic page is its epic.md read at view time, a feature page
// is its feature.md and the stories that physically sit in its folder. The file that owns the
// fact is named at the bottom of every one of them.

import { escapeHtml, sentence, pathName, lead, card, page, fileHref } from './board-shell.mjs';
import { context, shellFor, renderBoard, storyCard } from './board-page.mjs';
import { icon } from './board-icons.mjs';
import { headingOf, folderHref } from './board-nav.mjs';

const bar = (done, total) => {
  const pct = total ? Math.round((done / total) * 100) : 0;
  return `<span class="bar" aria-hidden="true"><i style="width:${pct}%"></i></span>`;
};

// The reader hands back a criterion as { nr, text, done }, so a demonstrated one can say so.
const numbered = (items) => (items.length
  ? `<ol class="crit">${items.map((c) => `<li class="${c.done ? 'met' : 'open'}">`
    + `${sentence(c.text)}</li>`).join('')}</ol>` : '');

// ---------------------------------------------------------------- the epic

export function epicPage(root, opts = {}) {
  const c = context(root, opts);
  c.rootPath = root;
  const { w, epic, project } = c;
  if (!epic) {
    return renderBoard(project, `<p class="empty">${escapeHtml(w.noEpic)}</p>`, w, c.made,
      shellFor(c, '/epic'), w.epic, w.noEpic);
  }
  const features = project.work.features.filter((f) => f.epic === epic.key);
  const body = [
    card(w.goalHead, { lang: project.lang, path: epic.path, opens: c.opens }, () => [
      epic.goal ? lead(epic.goal, sentence) : '',
      bar(epic.progress.done, epic.progress.total),
      `<p class="hint">${escapeHtml(w.ofDone(epic.progress.done, epic.progress.total))}</p>`,
      epic.finished.length ? `<h3>${escapeHtml(w.finishedHead)}</h3>${numbered(epic.finished)}` : '',
    ].filter(Boolean).join('\n')),
    `<h2 class="sech">${icon('layers')}${escapeHtml(w.features)}</h2>`,
    `<div class="grid">${features.map((f) => featureTile(f, w)).join('')}</div>`,
  ].join('\n');
  return renderBoard(project, body, w, c.made, shellFor(c, '/epic'), w.epic, epic.title);
}

// ---------------------------------------------------------------- the features

const featureHref = (key) => `/feature?key=${encodeURIComponent(key)}`;

function featureTile(f, w) {
  return `<a class="tile" href="${featureHref(f.key)}">`
    + `<header><span class="chip">${escapeHtml(f.id)}</span>`
    + (f.size ? `<span class="chip size">${escapeHtml(f.size)}</span>` : '')
    + (f.status ? `<span class="chip size">${escapeHtml(f.status)}</span>` : '')
    + '</header>'
    + `<h4>${escapeHtml(f.title)}</h4>`
    + (f.value ? `<p>${sentence(f.value)}</p>` : '')
    + bar(f.progress.done, f.progress.total)
    + `<p class="hint">${escapeHtml(w.ofDone(f.progress.done, f.progress.total))}</p></a>`;
}

export function featuresPage(root, opts = {}) {
  const c = context(root, opts);
  c.rootPath = root;
  const { w, project } = c;
  const mine = project.work.features.filter((f) => !c.epic || f.epic === c.epic.key);
  const body = mine.length
    ? `<div class="grid">${mine.map((f) => featureTile(f, w)).join('')}</div>`
    : `<p class="empty">${escapeHtml(w.noEpic)}</p>`;
  return renderBoard(project, body, w, c.made, shellFor(c, '/features'), w.features,
    c.epic ? c.epic.title : w.noEpic);
}

// One feature, whole: what you can do after it, what that is worth, which choice in the vision it
// serves, what it has to satisfy, and the stories that sit in its folder.
export function featurePage(root, key, opts = {}) {
  const c = context(root, opts);
  c.rootPath = root;
  const { w, project } = c;
  const f = project.work.features.find((x) => x.key === key);
  if (!f) return null;
  const stories = project.work.stories.filter((s) => s.feature === f.key);
  const body = [
    card(w.afterHead,
      { lang: project.lang, path: f.path, opens: c.opens }, () => [
        f.value ? lead(f.value, sentence) : '',
        bar(f.progress.done, f.progress.total),
        `<p class="hint">${escapeHtml(w.ofDone(f.progress.done, f.progress.total))}</p>`,
        f.worth ? `<h3>${escapeHtml(w.worthHead)}</h3><p>${sentence(f.worth)}</p>` : '',
        f.vision ? `<h3>${escapeHtml(w.visionHead)}</h3><p>${sentence(f.vision)}</p>` : '',
        f.acceptance.length
          ? `<h3>${escapeHtml(w.acceptanceHead)}</h3>${numbered(f.acceptance)}` : '',
      ].filter(Boolean).join('\n')),
    `<h2 class="sech">${icon('folder-tree')}${escapeHtml(w.storiesHead)}</h2>`,
    stories.length
      // No card here names its feature: the page is that feature, and a card that repeated it
      // would say the same thing as many times as the feature has stories.
      ? `<div class="cards wide">${stories.map((s) => storyCard(s, null, w, c.opens)).join('')}</div>`
      : `<p class="empty">${escapeHtml(w.laneEmpty)}</p>`,
  ].join('\n');
  return renderBoard(project, body, w, c.made, shellFor(c, '/features'), f.title,
    `${f.id} - ${f.status || ''}`.trim());
}

// ---------------------------------------------------------------- a folder, as its own page

// Where a folded folder row goes. It lists what the sidebar chose not to carry - every document
// in that folder, including the templates and the ones the file route will not serve, because
// this is the page where a name that opens nothing can be given its reason. Nothing is hidden
// by the sidebar; it is only moved one click away.
export function folderPage(root, dir, opts = {}) {
  const c = context(root, opts);
  c.rootPath = root;
  const { w, project } = c;
  if (typeof dir !== 'string' || !dir.startsWith('docs/') || dir.includes('..')) return null;
  // Everything under the folder, not only its immediate children: an archive of spec folders is
  // one place, and the row in the sidebar counts it as one.
  const held = c.docs.filter((d) => d.path.startsWith(`${dir}/`));
  if (!held.length) return null;
  const rows = held.map((d) => {
    const heading = escapeHtml(headingOf(root, d.path));
    const name = escapeHtml(d.path.slice(`${dir}/`.length));
    return `<li>${c.opens(d.path)
      ? `<a href="${fileHref(d.path)}"><b>${heading}</b><span>${name}</span></a>`
      : `<span class="dead"><b>${heading}</b><span>${name} - ${escapeHtml(w.notInGit)}</span></span>`}</li>`;
  }).join('');
  const body = `<ul class="index">${rows}</ul>`;
  return renderBoard(project, body, w, c.made, shellFor(c, folderHref(dir)),
    dir.split('/').pop().replace(/^./, (ch) => ch.toUpperCase()), w.inFolder(held.length));
}

export { page, pathName, escapeHtml };
