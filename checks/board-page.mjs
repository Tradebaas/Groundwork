// The board: the whole project on one page. What it is for and what it is not, the round in
// flight, six lanes with the cards in them, the four shelves that hold every document, and the
// two lines that say whether the gates are armed and how the documents point at each other.
// Facts in, one page out - nothing is stored, nothing is generated ahead of time. Every lane,
// count, blocker and next step comes from checks/work.mjs through the derivation
// checks/progress.mjs already exposes, so moving one story's status line moves its card and no
// second administration exists to keep in step (decision 0021).
// The shelves are checks/shelves.mjs, the two lines checks/board-strip.mjs, the shell they render
// in checks/board-shell.mjs; serving is checks/board-server.mjs and the file page
// checks/board-document.mjs.
// One derivation, two outputs (decision 0021): served on this machine, or printed as one
// self-contained file (`--page`, E-01/F-04/S-05). The file is the picture of the repository at
// the moment it was made, so it carries that moment and opens nothing; everything else on it is
// the same page, built by the same code.
// Story: docs/work/E-01-agile-first/F-04-board/S-04-four-shelves-and-the-file-pages (local).

import { readProject, readBrief, readHandoff, derive, BRIEF_PATH } from './progress.mjs';
import { WORDS, warningText, headline, nothingPlanned } from './progress-report.mjs';
import { LANES } from './work.mjs';
import { decidePath, ignoreLookup } from './board-path.mjs';
import { shelfDocuments, SHELF_WORDS } from './shelves.mjs';
import { navModel, sidebar } from './board-nav.mjs';
import { icon } from './board-icons.mjs';
import { readStrip, stripPaths, renderStrip } from './board-strip.mjs';
import {
  shellWords, escapeHtml, sentence, pathName, lead, list, folded, card, attempt, page, stamp,
  fileHref,
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
    sub: 'Every story in the lane its own status line puts it in, and every document on the shelf its path puts it on.',
    purpose: 'What this project is for',
    noGoal: 'The brief does not say yet what this project is for. Run the `scope` skill to write it down.',
    outOfScope: 'Deliberately not part of this',
    noOutOfScope: 'The brief names nothing as out of scope yet, so the boundary is still open.',
    stand: 'Where the project stands',
    inFlight: 'Epic in flight',
    featuresDone: (d, t) => `${d} of ${t} features done`,
    storiesDone: (d, t) => `${d} of ${t} stories done`,
    otherEpics: 'Other epics',
    noStories: 'This epic is not cut into stories yet.',
    laneEmpty: 'Nothing here.',
    heldOf: (n, limit) => `${n} of ${limit} allowed`,
    allowed: (limit) => `${limit} allowed`,
    start: 'Start', epic: 'Epic', features: 'Features', boardShort: 'Board',
    navLabel: 'This project',
    // A subject's name in the sidebar is short enough to sit on one line; the question it is
    // short for is the heading of the page it opens, where the length earns its place.
    navNames: {
      why: 'Why we build it', now: 'Building now', built: 'How it is built',
      learned: 'What we learned', other: 'Elsewhere',
    },
    inFolder: (n) => `${n} documents`,
    notInGit: 'kept out of git, so this board does not open it',
    tasksHead: 'Tasks', storiesHead: 'Stories', acceptanceHead: 'Acceptance',
    finishedHead: 'What finished means', goalHead: 'The goal',
    worthHead: 'What that is worth', visionHead: 'Which choice it serves',
    ofDone: (d, t) => `${d} of ${t} done`,
    noEpic: 'No round has been planned yet.',
    tasks: (d, t) => `tasks ${d} of ${t}`,
    misses: (what) => `Still missing: ${what}`,
    storyLabel: 'Story',
    sizeLabel: 'Size',
  },
  nl: {
    board: 'Het bord',
    sub: 'Elke story staat in de baan die zijn eigen statusregel hem geeft, en elk document op de plank waar zijn pad het neerzet.',
    purpose: 'Waar dit project voor is',
    noGoal: 'De brief zegt nog niet waar dit project voor is. Draai de `scope`-skill om dat vast te leggen.',
    outOfScope: 'Bewust geen onderdeel hiervan',
    noOutOfScope: 'De brief noemt nog niets buiten scope, dus de grens ligt nog open.',
    stand: 'Waar het project staat',
    inFlight: 'Epic in uitvoering',
    featuresDone: (d, t) => `${d} van ${t} features klaar`,
    storiesDone: (d, t) => `${d} van ${t} stories klaar`,
    otherEpics: 'Andere epics',
    noStories: 'Deze epic is nog niet in stories geknipt.',
    laneEmpty: 'Hier staat niets.',
    heldOf: (n, limit) => `${n} van ${limit} toegestaan`,
    allowed: (limit) => `${limit} toegestaan`,
    start: 'Start', epic: 'Epic', features: 'Features', boardShort: 'Bord',
    navLabel: 'Dit project',
    navNames: {
      why: 'Waarom we het bouwen', now: 'Nu in aanbouw', built: 'Hoe het gebouwd is',
      learned: 'Wat we geleerd hebben', other: 'Elders',
    },
    inFolder: (n) => `${n} documenten`,
    notInGit: 'buiten git gehouden, dus dit bord opent het niet',
    tasksHead: 'Taken', storiesHead: 'Stories', acceptanceHead: 'Acceptatie',
    finishedHead: 'Wat klaar betekent', goalHead: 'Het doel',
    worthHead: 'Wat dat waard is', visionHead: 'Welke keuze het dient',
    ofDone: (d, t) => `${d} van ${t} klaar`,
    noEpic: 'Er is nog geen ronde gepland.',
    tasks: (d, t) => `taken ${d} van ${t}`,
    misses: (what) => `Mist nog: ${what}`,
    storyLabel: 'Story',
    sizeLabel: 'Maat',
  },
};

// One object per language, so a caller asks once and gets the shell's sentences, the stand's
// sentences, the shelves' and the board's own. Each set owns its own keys, and the merge is the
// only place they meet. The two lines under the shelves gather their own, next door.
const boardWords = (lang) => ({
  ...shellWords(lang),
  ...(WORDS[lang] || WORDS.en),
  ...(SHELF_WORDS[lang] || SHELF_WORDS.en),
  ...(BOARD_WORDS[lang] || BOARD_WORDS.en),
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
    // The steps themselves, on the card. A board that shows only a fraction says how far the
    // work is; one that shows the steps says what is actually left, which is what a person
    // reading a lane wants to know.
    out.push(`<ul class="steps">${story.tasks.items.map((t) => `<li class="t-${t.state}">`
      + `${t.state === 'done' ? icon('circle-check') : icon('chevron-right')}`
      + `<span>${sentence(t.text)}</span></li>`).join('')}</ul>`);
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
  const body = stories.length
    ? `<div class="cards" tabindex="0" role="group" aria-label="${escapeHtml(laneName(name))}">`
      + `${stories.join('')}</div>`
    : `<p class="empty">${escapeHtml(w.laneEmpty)}</p>`;
  // Over the limit is stated, never refused: the lane still shows every card it holds, and the
  // whole lane says so rather than one number inside it.
  const over = limit !== undefined && stories.length > limit ? ' over' : '';
  const tail = (limit === undefined ? '' : `<span class="wip">${escapeHtml(w.allowed(limit))}</span>`)
    + `<span class="count">${stories.length}</span>`;
  return `<section class="lane lane-${name.replace(/\s+/g, '-')}${over}">`
    + `<details${OPEN_LANES.has(name) ? ' open' : ''}>`
    + `<summary><span class="ttl">${escapeHtml(laneName(name))}</span>`
    + `<span class="tail">${tail}</span></summary>`
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

// What this project is for, and what it is deliberately not. The promise in one sentence and the
// boundary that keeps it a promise, both from the brief. The scope items themselves are the
// stand next door, so they are not claimed twice.
function purposeCard(brief, lang, w, opens) {
  return card(w.purpose, { lang, path: BRIEF_PATH, opens }, () => {
    if (!brief?.goal) return lead(w.noGoal, sentence);
    const outside = brief.outOfScope || [];
    return [
      lead(brief.goal),
      outside.length
        ? folded(w.outOfScope, outside.length, list(outside.map((i) => i.title)))
        : `<p class="note">${escapeHtml(w.noOutOfScope)}</p>`,
    ].join('\n');
  });
}

// The round the project is in, what that round is for, how far the whole project is, and what
// happens next. A copy that has planned no round still gets this card: the stand and the next
// step are what a person opens the page for, and neither depends on a work tree existing.
function roundCard(progress, epic, now, lang, w, opens) {
  const owner = { lang, path: epic?.path, opens };
  return card(epic ? w.inFlight : w.stand, owner, () => {
    const out = [];
    if (epic) {
      out.push(lead(epic.title));
      if (epic.goal) out.push(`<p>${sentence(epic.goal)}</p>`);
    }
    // How far the whole project is, in the words the terminal report already uses for it, so the
    // page and the terminal can never word one stand differently. A project that has planned
    // nothing names the step that is missing instead of showing a zero: scope first, and the
    // work tree after it.
    if (progress.defined) {
      out.push(`<p class="${epic ? 'hint' : 'lead'}">${escapeHtml(headline(w, progress))}.</p>`);
      if (!epic) out.push(`<p class="hint">${escapeHtml(w.noWork)}</p>`);
    } else {
      out.push(lead(nothingPlanned(w, progress), sentence));
    }
    out.push(`<h3>${escapeHtml(w.nextStep)}</h3>`);
    out.push(now ? `<p>${sentence(now)}</p>` : `<p>${sentence(w.noNextStep)}</p>`);
    // What the reader could not place is said here rather than left to a lane that will never
    // show it: a story with an unreadable status is in no lane at all.
    for (const warn of progress.warnings) {
      out.push(`<p class="note">${escapeHtml(w.heads)}: ${sentence(warningText(w, warn))}</p>`);
    }
    return out.join('\n');
  });
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

// The one line under the title that is about the page rather than about the project: where it was
// read from. A served board was read as it opened; a file says the moment it was made instead, and
// adds that the names in it are names, because its reader has no repository beside them.
const readFrom = (w, made) => (made ? `${w.made(stamp(made))} ${w.names}` : w.live);

function renderBoard(project, body, w, made, nav = '', heading = null, sub = null) {
  return page({
    lang: project.lang,
    nav,
    // A served board is a frame that holds still; a file made with --page is a document.
    // The stamp is what tells them apart everywhere else on this page, so it tells them apart here.
    frame: !made,
    title: `${project.name}: ${(heading || w.board).toLowerCase()}`,
    body: [
      `<h1>${escapeHtml(heading || project.name)}</h1>`,
      `<p class="sub">${escapeHtml(sub || `${w.sub} ${readFrom(w, made)}`)}</p>`,
      body,
    ].join('\n'),
  });
}

// The epic in flight is the first one that is not finished: rule 1 of decision 0021 runs them one
// after the other, so the first unfinished one is the round the project is in. When every round is
// finished the last one is still what the lanes are about, which keeps the page free of a state
// that says nothing.
const inFlightEpic = (epics) => epics.find((e) => !e.done) || epics[epics.length - 1] || null;

// Which of the names the page is about to show the file route will actually serve. Asked once
// for the whole page: git is a process, and a board that names every document would otherwise
// spawn one per name. A file the project keeps out of git is named rather than linked, which is
// Groundwork's own work tree and its own handoff.
function opensOn(root, names, deps) {
  const isIgnored = ignoreLookup(root, names.filter(Boolean));
  return (path) => Boolean(path) && decidePath(root, path, { isIgnored, ...deps }).ok;
}

// A printed board has no route to point at, so every name on it stays a name and the git question
// above is never asked: it exists to decide which names open, and none of them do.
const NEVER = () => false;

// The board, for the machine it is served on and for the file it is printed as. `made` is a Date
// on a printed one and absent on a served one. It is the only input that is not read off disk,
// and the only thing that changes the page: everything else is derived the same way for both, so
// a lane, a card, a shelf or a count cannot reach one output and miss the other.
// What every page this board serves needs before it can render: the project, its words, the
// documents, and the one git question asked once for every name the page will carry.
export function context(root, { made = null, ...deps } = {}) {
  const project = readProject(root);
  const progress = derive(project);
  const w = boardWords(project.lang);
  const epic = inFlightEpic(project.work.epics);
  const docs = attempt(() => shelfDocuments(root));
  const facts = readStrip(root);
  const opens = made ? NEVER : opensOn(root, [
    BRIEF_PATH,
    epic?.path,
    ...project.work.stories.map((s) => s.path),
    ...project.work.features.map((f) => f.path),
    ...(docs.value || []).map((d) => d.path),
    ...stripPaths(facts),
  ], deps);
  return { project, progress, w, epic, docs: docs.value || [], docsError: docs.error || null,
    facts, opens, made };
}

export const shellFor = (c, here) => sidebar(c.project.name,
  navModel(c.rootPath, c.docs, c.w, c.opens), c.w, { here, failure: c.docsError });

// The way in: what this project is for, where the round stands, and the two derived lines. The
// lanes are not here - they are the board, which is its own page.
export function startPage(root, opts = {}) {
  const c = context(root, opts);
  c.rootPath = root;
  const body = [
    `<div class="top">${purposeCard(readBrief(root), c.project.lang, c.w, c.opens)}`
      + `${roundCard(c.progress, c.epic, readHandoff(root).now, c.project.lang, c.w, c.opens)}</div>`,
    renderStrip(c.facts, c.project.lang, c.opens, c.made),
  ].filter(Boolean).join('\n');
  return renderBoard(c.project, body, c.w, c.made, shellFor(c, '/'));
}

// The board, and only the board: the lanes, the stories in them, and the steps on each story.
export function boardOnlyPage(root, opts = {}) {
  const c = context(root, opts);
  c.rootPath = root;
  const { work } = c.project;
  const body = c.epic
    ? `${lanes(work, c.epic.key, c.w, c.opens)}`
      + `${otherEpics(work.epics.filter((e) => e.key !== c.epic.key), c.w)}`
    : `<p class="empty">${escapeHtml(c.w.noEpic)}</p>`;
  return renderBoard(c.project, body, c.w, c.made, shellFor(c, '/board'), c.w.board,
    c.epic ? c.epic.title : c.w.noEpic);
}

// Kept so a printed file is still one page that answers the whole question: the start, then the
// lanes under it. It carries no sidebar: a file with one page in it has nowhere to navigate to,
// and an address that answers nothing off the network is worse than no address at all. Every name
// it holds is still there, set as a name.
export function boardPage(root, { made = null, ...deps } = {}) {
  const c = context(root, { made, ...deps });
  c.rootPath = root;
  const { work } = c.project;
  const body = [
    `<div class="top">${purposeCard(readBrief(root), c.project.lang, c.w, c.opens)}`
      + `${roundCard(c.progress, c.epic, readHandoff(root).now, c.project.lang, c.w, c.opens)}</div>`,
    c.epic ? lanes(work, c.epic.key, c.w, c.opens) : '',
    c.epic ? otherEpics(work.epics.filter((e) => e.key !== c.epic.key), c.w) : '',
    renderStrip(c.facts, c.project.lang, c.opens, c.made),
  ].filter(Boolean).join('\n');
  return renderBoard(c.project, body, c.w, c.made);
}

export { renderBoard, storyCard, lanes, inFlightEpic };
