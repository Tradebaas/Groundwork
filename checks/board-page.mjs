// The board: six lanes with the cards in them, above a header that says how far the whole
// project is. Facts in, one page out - nothing is stored, nothing is generated ahead of time.
// Every lane, count, blocker and next step below comes from checks/work.mjs through the
// derivation checks/progress.mjs already exposes, so moving one story's status line moves its
// card and no second administration exists to keep in step (decision 0021).
// The shell it renders in is checks/board-shell.mjs; serving is checks/cockpit.mjs; the six
// cards beside it are checks/cockpit-page.mjs.
// Story: docs/work/E-01-agile-first/F-04-board/S-03-the-lanes-and-the-cards (maintainer-local).

import { readProject, readHandoff, derive } from './progress.mjs';
import { WORDS, warningText, headline } from './progress-report.mjs';
import { LANES } from './work.mjs';
import { decidePath, ignoreLookup } from './cockpit-path.mjs';
import {
  shellWords, escapeHtml, sentence, pathName, lead, folded, page,
} from './board-shell.mjs';

// Rule 6 of decision 0021: one story being built, two in review. The board shows the number and
// refuses nothing - the gate that acts on it is F-03, and a board that blocked work would be a
// second place where the rule lives.
export const WIP = { 'in progress': 1, review: 2 };

// What the owner settled on 2026-08-24: what is coming and what is finished folds away, what is
// being worked on stays in view. Everything else about a lane is derived, so this is the one
// preference the board holds.
const OPEN_LANES = new Set(['to do', 'in progress', 'review']);

// The board's own framing words. Everything with content in it comes from the project's own
// files, so only these connectors live here. The lane names are deliberately absent: a lane is
// named by the status word the story file itself carries (work.mjs LANES), and a table that
// translated them would be the second administration this whole rebuild is against.
const BOARD_WORDS = {
  en: {
    board: 'The board',
    sub: 'Every story in the lane its own status line puts it in.',
    more: 'Goal, files, links and gates',
    inFlight: 'Epic in flight',
    featuresDone: (d, t) => `${d} of ${t} features done`,
    storiesDone: (d, t) => `${d} of ${t} stories done`,
    otherEpics: 'Other epics',
    noStories: 'This epic is not cut into stories yet.',
    laneEmpty: 'Nothing here.',
    heldOf: (n, limit) => `${n} of ${limit} allowed`,
    tasks: (d, t) => `tasks ${d} of ${t}`,
    misses: (what) => `Still missing: ${what}`,
    storyLabel: 'Story',
    sizeLabel: 'Size',
  },
  nl: {
    board: 'Het bord',
    sub: 'Elke story staat in de baan die zijn eigen statusregel hem geeft.',
    more: 'Doel, bestanden, verwijzingen en poorten',
    inFlight: 'Epic in uitvoering',
    featuresDone: (d, t) => `${d} van ${t} features klaar`,
    storiesDone: (d, t) => `${d} van ${t} stories klaar`,
    otherEpics: 'Andere epics',
    noStories: 'Deze epic is nog niet in stories geknipt.',
    laneEmpty: 'Hier staat niets.',
    heldOf: (n, limit) => `${n} van ${limit} toegestaan`,
    tasks: (d, t) => `taken ${d} van ${t}`,
    misses: (what) => `Mist nog: ${what}`,
    storyLabel: 'Story',
    sizeLabel: 'Maat',
  },
};

// One object per language, so a caller asks once and gets the shell's sentences, the stand's
// sentences and the board's own.
const boardWords = (lang) => ({
  ...shellWords(lang), ...(WORDS[lang] || WORDS.en), ...(BOARD_WORDS[lang] || BOARD_WORDS.en),
});

// A lane is named by the status word itself, with the first letter raised. That is mechanical,
// not a mapping: nothing here can say a different word than the file does.
const laneName = (l) => l.charAt(0).toUpperCase() + l.slice(1);

// ---------------------------------------------------------------- one card

// What a person needs in order to decide whether to act on this story, and nothing else. A card
// with nothing wrong says nothing extra, so every mark below is conditional on there being
// something to say.
//
// Readiness gaps and blockers are shown while a story is still moving. A finished story's
// readiness is history, and the reader already stops deriving blockers for it, so the two agree.
// Their sentences are the reader's own (work.mjs), reused rather than reworded here: it says what
// it found, and saying it a second time in different words is how two accounts of one fact start.
function storyCard(story, feature, w, opens = () => false) {
  // An id and a single letter say nothing when they are heard rather than seen, so each carries
  // the word that names it, for a reader who is not looking at the row it sits in.
  const chip = (label, value, extra = '') => `<span class="chip${extra}">`
    + `<span class="vh">${escapeHtml(label)} </span>${escapeHtml(value)}</span>`;
  const out = [`<header>${chip(w.storyLabel, story.id)}`
    + (story.size ? ` ${chip(w.sizeLabel, story.size, ' size')}` : '')
    + '</header>'];
  out.push(`<h4>${escapeHtml(story.title)}</h4>`);
  if (feature) out.push(`<p class="feat">${escapeHtml(`${feature.id} ${feature.title}`)}</p>`);
  // The value is rendered whole. It is the one line the story wrote about why it is worth doing,
  // and a board that cut it short would be deciding what the file said.
  if (story.value) out.push(`<p>${sentence(story.value)}</p>`);
  if (story.tasks.total) {
    const pct = Math.round((story.tasks.done / story.tasks.total) * 100);
    out.push(`<span class="bar" aria-hidden="true"><i style="width:${pct}%"></i></span>`);
    out.push(`<p class="hint">${escapeHtml(w.tasks(story.tasks.done, story.tasks.total))}</p>`);
  }
  if (!story.done && !story.ready.ok) {
    out.push(`<p class="hint">${escapeHtml(w.misses(story.ready.missing.map((m) => m.text).join(', ')))}</p>`);
  }
  if (story.blockers.length) {
    out.push(`<ul class="marks block">${story.blockers
      .map((b) => `<li>${escapeHtml(b.text)}</li>`).join('')}</ul>`);
  }
  out.push(`<footer>${pathName(story.path, opens)}</footer>`);
  return `<article class="wcard">${out.join('\n')}</article>`;
}

// ---------------------------------------------------------------- the lanes

// One lane, with its count in the summary so a collapsed one still says how much it holds, and
// the work-in-progress number beside it where decision 0021 sets one.
function lane(name, stories, w) {
  const limit = WIP[name];
  const tail = limit === undefined ? String(stories.length) : w.heldOf(stories.length, limit);
  const body = stories.length
    ? `<div class="cards">${stories.join('')}</div>`
    : `<p class="empty">${escapeHtml(w.laneEmpty)}</p>`;
  // Over the limit is stated, never refused: the lane still shows every card it holds.
  const over = limit !== undefined && stories.length > limit ? ' over' : '';
  return `<section class="lane"><details${OPEN_LANES.has(name) ? ' open' : ''}>`
    + `<summary><span class="ttl">${escapeHtml(laneName(name))}</span>`
    + `<span class="tail"><span class="wip${over}">${escapeHtml(tail)}</span></span></summary>`
    + `\n${body}</details></section>`;
}

function lanes(work, epicKey, w, opens) {
  const byKey = new Map(work.features.map((f) => [f.key, f]));
  const mine = work.stories.filter((s) => s.epic === epicKey);
  if (!mine.length) return `<p class="empty">${escapeHtml(w.noStories)}</p>`;
  return `<div class="lanes">${LANES.map((name) => lane(
    name,
    mine.filter((s) => s.lane === name).map((s) => storyCard(s, byKey.get(s.feature), w, opens)),
    w,
  )).join('')}</div>`;
}

// ---------------------------------------------------------------- the header

// The project, the round it is in, what that round is for, how far the whole project is, and what
// happens next. Everything a person opens this page to find out before they look at a lane.
function header(progress, epic, now, w, opens) {
  const out = [`<h2>${escapeHtml(w.inFlight)}</h2>`];
  out.push(lead(epic.title));
  if (epic.goal) out.push(`<p>${sentence(epic.goal)}</p>`);
  // How far the whole project is, in the words the terminal report already uses for it.
  out.push(`<p class="hint">${escapeHtml(headline(w, progress))}.</p>`);
  out.push(`<h3>${escapeHtml(w.nextStep)}</h3>`);
  out.push(now ? `<p>${sentence(now)}</p>` : `<p>${sentence(w.noNextStep)}</p>`);
  // What the reader could not place is said here rather than left to a lane that will never show
  // it: a story with an unreadable status is in no lane at all.
  for (const warn of progress.warnings) {
    out.push(`<p class="note">${escapeHtml(w.heads)}: ${sentence(warningText(w, warn))}</p>`);
  }
  if (epic.path) out.push(`<p class="src">${escapeHtml(w.source)} ${pathName(epic.path, opens)}</p>`);
  return `<section class="card">${out.join('\n')}</section>`;
}

// An epic that is not the one in flight is listed with its own progress and stays folded, so a
// project that has finished a round and started the next shows both without the finished one
// taking the page.
function otherEpics(epics, w) {
  if (!epics.length) return '';
  const rows = epics.map((e) => `<li>${escapeHtml(e.title)} - `
    + `${escapeHtml(w.featuresDone(e.progress.done, e.progress.total))}</li>`).join('');
  return `<section class="card"><h2>${escapeHtml(w.otherEpics)}</h2>`
    + `${folded(w.otherEpics, epics.length, `<ul>${rows}</ul>`)}</section>`;
}

// ---------------------------------------------------------------- the page

function renderBoard(project, body, w) {
  return page({
    lang: project.lang,
    title: `${project.name}: ${w.board.toLowerCase()}`,
    body: [
      `<h1>${escapeHtml(project.name)}</h1>`,
      `<p class="sub">${escapeHtml(w.sub)} ${escapeHtml(w.live)} `
        + `<a href="/overview">${escapeHtml(w.more)}</a></p>`,
      body,
    ].join('\n'),
  });
}

// The epic in flight is the first one that is not finished: rule 1 of decision 0021 runs them one
// after the other, so the first unfinished one is the round the project is in. When every round is
// finished the last one is still what the lanes are about, which keeps the page free of a state
// that says nothing.
const inFlightEpic = (epics) => epics.find((e) => !e.done) || epics[epics.length - 1] || null;

export function boardPage(root, deps = {}) {
  const project = readProject(root);
  const progress = derive(project);
  const w = boardWords(project.lang);
  const { work } = project;
  const epic = inFlightEpic(work.epics);
  // A copy that has planned nothing yet reads as not started, never as an error.
  if (!epic) return renderBoard(project, `<section class="card"><p>${sentence(w.noWork)}</p></section>`, w);
  const now = readHandoff(root).now;
  // Which of the files this page names git ignores is asked once for the whole page: a board that
  // named every story would otherwise spawn a process per name. A file the project keeps out of
  // git is named rather than linked, which is Groundwork's own work tree.
  const isIgnored = ignoreLookup(root, [epic.path, ...work.stories.map((s) => s.path)]);
  const opens = (path) => Boolean(path) && decidePath(root, path, { isIgnored, ...deps }).ok;
  return renderBoard(project, [
    header(progress, epic, now, w, opens),
    lanes(work, epic.key, w, opens),
    otherEpics(work.epics.filter((e) => e.key !== epic.key), w),
  ].join('\n'), w);
}
