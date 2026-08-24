// The cockpit board: project facts in, one page out.
// Every card renders from the file that owns its fact, at the moment of viewing: nothing is
// copied into a view, nothing is stored, nothing is generated ahead of time. A board that keeps
// its own copy of the numbers becomes a second claim on the truth and rots, which is why the
// progress overview derives instead of storing, and why this renders on the server instead of
// shipping data to a browser application.
// What may be opened is decided next door in checks/cockpit-path.mjs; serving is
// checks/cockpit.mjs. Nothing here touches the network.
// Spec: docs/specs/010-cockpit (maintainer-local).

import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  readProject, readBrief, readHandoff, parseManifest, derive,
  BRIEF_PATH, MANIFEST_PATH,
} from './progress.mjs';
import { WORDS, warningText, headline, nothingPlanned } from './progress-report.mjs';
import { WORK_DIR } from './work.mjs';
import { enforcementReport } from './enforcement.mjs';
import { decidePath, ignoreLookup } from './cockpit-path.mjs';
import { projectGraph, LINK_WORDS, HUB_MIN } from './links.mjs';
import {
  shellWords, escapeHtml, sentence, fileHref, pathName, list, lead, folded, page,
} from './board-shell.mjs';

// The gates card and the link card report on the project as a whole rather than on one document,
// so the file each names is the one that does the looking.
const ENFORCEMENT_PATH = 'checks/enforcement.mjs';
const LINKS_PATH = 'checks/links.mjs';

// The board's own framing words. Everything with content in it comes from the project's
// documents through progress.mjs, so only these connectors live here.
export const BOARD = {
  en: {
    stand: 'Where the project stands',
    progress: 'Progress',
    goal: 'Goal and scope',
    noGoal: 'The brief does not say yet what this project is for. Run the `scope` skill to write it down.',
    outOfScope: 'Deliberately not part of this',
    noOutOfScope: 'The brief names nothing as out of scope yet, so the boundary is still open.',
    fileMap: 'Where everything lives',
    noFileMap: 'The documents manifest is missing, so there is no map of which file owns which fact. '
      + 'The `begin` skill puts the project documents in place.',
    tiers: { LIVE: 'Always current', REF: 'Current for its subject', ARCHIVE: 'Kept as history' },
    gates: 'Gates on this machine',
    armedOf: (n, t) => `${n} of the ${t} gates on this machine are armed`,
    headArmed: 'Armed',
    headNotArmed: 'Not armed',
    signals: {
      hooks: 'the checks before every commit',
      CI: 'the check that runs where it cannot be skipped',
      'adapter hooks': 'the reminders the agent gets during a session',
      'design method': 'the method the interface is designed with',
    },
    cardFailed: (why) => `This card could not be built: ${why}. The other cards still hold.`,
    broke: 'The board could not be built. The reason is printed where you started it.',
    readOnly: 'This file as it is on disk right now, read-only.',
    refused: 'Not available.',
    notShown: (name, size) => `${name} is ${size} and is not shown here. Open it on disk.`,
    binary: (name, size) => `${name} is not text (${size}) and is not shown here.`,
  },
  nl: {
    stand: 'Waar het project staat',
    progress: 'Voortgang',
    goal: 'Doel en scope',
    noGoal: 'De brief zegt nog niet waar dit project voor is. Draai de `scope`-skill om dat vast te leggen.',
    outOfScope: 'Bewust geen onderdeel hiervan',
    noOutOfScope: 'De brief noemt nog niets buiten scope, dus de grens ligt nog open.',
    fileMap: 'Waar alles staat',
    noFileMap: 'Het documentenoverzicht ontbreekt, dus er is geen kaart van welk bestand welk feit bezit. '
      + 'De `begin`-skill zet de projectdocumenten klaar.',
    tiers: { LIVE: 'Altijd actueel', REF: 'Actueel voor zijn onderwerp', ARCHIVE: 'Bewaard als geschiedenis' },
    gates: 'Poorten op deze machine',
    armedOf: (n, t) => `${n} van de ${t} poorten op deze machine staan scherp`,
    headArmed: 'Scherp',
    headNotArmed: 'Niet scherp',
    signals: {
      hooks: 'de controles voor elke commit',
      CI: 'de controle die draait waar niemand hem kan overslaan',
      'adapter hooks': 'de herinneringen die de agent tijdens een sessie krijgt',
      'design method': 'de methode waarmee de interface wordt ontworpen',
    },
    cardFailed: (why) => `Deze kaart kon niet worden opgebouwd: ${why}. De andere kaarten kloppen nog.`,
    broke: 'Het overzicht kon niet worden opgebouwd. De reden staat waar je het gestart hebt.',
    readOnly: 'Dit bestand zoals het nu op schijf staat, alleen-lezen.',
    refused: 'Niet beschikbaar.',
    notShown: (name, size) => `${name} is ${size} en wordt hier niet getoond. Open het op schijf.`,
    binary: (name, size) => `${name} is geen tekst (${size}) en wordt hier niet getoond.`,
  },
};

export const words = (lang) => ({
  ...shellWords(lang), ...(WORDS[lang] || WORDS.en), ...(BOARD[lang] || BOARD.en),
});
export function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} bytes`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// A card builds or it names its failure. One card that cannot be built never takes the board
// down with it, because a half-empty board still answers most of the question.
// owner: { lang, path, openable } - the file that owns this card's content. It is named either
// way; it is a link only when the file route will actually serve it.
export function card(title, owner, build) {
  const w = words(owner?.lang);
  let body;
  try {
    body = build();
  } catch (e) {
    body = `<p class="note">${escapeHtml(w.cardFailed(e.message))}</p>`;
  }
  const path = owner?.path;
  let src = '';
  if (path) {
    const named = owner.openable === false
      ? escapeHtml(path)
      : `<a href="${fileHref(path)}">${escapeHtml(path)}</a>`;
    src = `<p class="src">${escapeHtml(w.source)} ${named}</p>`;
  }
  return `<section class="card">\n<h2>${escapeHtml(title)}</h2>\n${body}\n${src}\n</section>`;
}

// The progress card, straight off the existing derivation: the same states, the same counting
// rules, the same items the text report produces. No second judgment lives here.
export function progressCard(project, progress) {
  const w = WORDS[project.lang] || WORDS.en;
  if (!progress.defined) return lead(nothingPlanned(w, progress), sentence);
  const out = [lead(`${headline(w, progress)}.`)];
  const group = (head, state, fold) => {
    const titles = progress.items.filter((i) => i.state === state).map((i) => i.title);
    if (!titles.length) return;
    // What is finished is the one group that only grows, and the least urgent thing on the
    // card. It folds away behind its count so the stand stays a glance instead of a paragraph;
    // what is running and what is left stay open, because that is the question being asked.
    out.push(fold ? folded(head, titles.length, list(titles))
      : `<h3>${escapeHtml(head)}</h3>\n${list(titles)}`);
  };
  group(w.headDone, 'done', true);
  group(w.headDoing, 'doing', false);
  group(w.headTodo, 'todo', false);
  return out.join('\n');
}

// Goal and scope: the promise in one sentence, and the boundary that keeps it a promise. The
// scope items themselves belong to the progress card, so they are not claimed twice.
export function goalCard(brief, lang) {
  const w = words(lang);
  if (!brief?.goal) return lead(w.noGoal, sentence);
  const outside = brief.outOfScope || [];
  return [
    lead(brief.goal),
    outside.length
      ? folded(w.outOfScope, outside.length, list(outside.map((i) => i.title)))
      : `<p class="note">${escapeHtml(w.noOutOfScope)}</p>`,
  ].join('\n');
}

// The next step in the handoff's own words, and every heads-up the overview raises. Both are
// things to act on, so they stand together instead of being scattered over the board.
export function nextStepCard(now, warnings, lang) {
  const w = words(lang);
  const rw = WORDS[lang] || WORDS.en;
  // The handoff writes in the project's own shorthand, backticks and all, and the board reads
  // those the way every other card does.
  const out = [now ? lead(now, sentence) : lead(w.noNextStep, sentence)];
  for (const warn of warnings) {
    out.push(`<p class="note">${escapeHtml(rw.heads)}: ${sentence(warningText(rw, warn))}</p>`);
  }
  return out.join('\n');
}

const TIER_ORDER = ['LIVE', 'REF', 'ARCHIVE'];
const tierRank = (tier) => {
  const i = TIER_ORDER.indexOf(tier);
  return i === -1 ? TIER_ORDER.length : i;
};

// Manifest paths are written from inside docs/, which is also where the file route has to be
// pointed for the name to open.
export function fileMapCard(rows, lang, opens = () => false) {
  const w = words(lang);
  if (!rows.length) return lead(w.noFileMap, sentence);
  const groups = new Map();
  for (const r of rows) {
    if (!groups.has(r.tier)) groups.set(r.tier, []);
    groups.get(r.tier).push(r);
  }
  const row = (r) => `<li>${pathName(`docs/${r.path}`, opens, r.path)} - ${sentence(r.owns)}</li>`;
  // What must always be current comes first and stays open; the rest is reference, and folds.
  return [...groups.entries()]
    .sort((a, b) => tierRank(a[0]) - tierRank(b[0]))
    .map(([tier, items], i) => {
      const head = w.tiers[tier] || tier;
      const body = `<ul>${items.map(row).join('')}</ul>`;
      return i === 0 ? `<h3>${escapeHtml(head)}</h3>\n${body}` : folded(head, items.length, body);
    })
    .join('\n');
}

// Which enforcement actually runs here. A fresh clone silently loses the machine-local layers,
// so a card that only ever said "armed" would be the most expensive lie on the board.
export function gatesCard(signals, lang) {
  const w = words(lang);
  const named = (s) => w.signals[s.signal] || s.signal;
  const armed = signals.filter((s) => s.armed);
  const degraded = signals.filter((s) => !s.armed);
  const out = [lead(`${w.armedOf(armed.length, signals.length)}.`)];
  if (armed.length) out.push(`<h3>${escapeHtml(w.headArmed)}</h3>\n${list(armed.map(named))}`);
  if (degraded.length) {
    out.push(`<h3>${escapeHtml(w.headNotArmed)}</h3>`);
    // The fix line comes from the report itself, so the board and the terminal say the same
    // thing about what to do.
    for (const s of degraded) out.push(`<p class="note">${sentence(`${named(s)} - ${s.detail}`)}</p>`);
  }
  return out.join('\n');
}

// Which document points at which, so the question behind moving or deleting a file has an answer
// before the move: what nothing points at can go, and what many documents lean on is a decision.
// The words come from the link module, because the one-shot command says the same sentences.
export function linksCard(graph, lang, opens = () => false) {
  const w = LINK_WORDS[lang] || LINK_WORDS.en;
  if (!graph.documents.length) return lead(w.noDocuments);
  const named = (path) => pathName(path, opens);
  const names = (paths) => paths.map(named).join(', ');
  const out = [
    lead(`${w.summary(graph.documents.length, graph.links)}.`),
    // What a link is, said on the card: a reader deciding whether a file is safe to delete has
    // to know what was counted. It is a footnote to the number above it, not a second headline.
    `<p class="hint">${escapeHtml(w.whatCounts)}</p>`,
  ];
  out.push(graph.hubs.length
    ? `<h3>${escapeHtml(w.hubs(HUB_MIN))}</h3>\n<ul>${graph.hubs
      .map((h) => `<li>${named(h.path)} - ${escapeHtml(w.hubCount(h.count))}</li>`).join('')}</ul>`
    : `<p class="note">${escapeHtml(w.noHubs(HUB_MIN))}</p>`);
  out.push(graph.orphans.length
    ? folded(w.orphans, graph.orphans.length, `<ul>${graph.orphans.map((p) => `<li>${named(p)}</li>`).join('')}</ul>`
      // Most of an orphan list is by design, and a reader who does not know that reads it as a
      // list of dead files. The clause is inside the fold, next to the names it explains.
      + `\n<p class="hint">${escapeHtml(w.orphansWhy)}</p>`)
    : `<p class="note">${escapeHtml(w.noOrphans)}</p>`);
  // The residual, as a number: what the two questions above could not place. Reported, never
  // gated - the card is where the number waits for a rename to prove it catches one.
  out.push(graph.unresolved.length
    ? folded(w.unresolved, graph.unresolved.length,
      // The target is set as the path it is, and never as a link: there is nothing to open, which
      // is the whole finding.
      `<ul>${graph.unresolved.map((m) => `<li>${named(m.from)}: <code>${escapeHtml(m.raw)}</code></li>`).join('')}</ul>`
      + `\n<p class="hint">${escapeHtml(w.unresolvedWhy)}</p>`)
    : `<p class="note">${escapeHtml(w.noUnresolved)}</p>`);
  // Both directions per document, which is the whole card; it folds because it is as long as the
  // project has documents.
  const each = graph.documents.map((d) => `<li>${named(d.path)}<ul>`
    + `<li>${d.outbound.length ? `${escapeHtml(w.pointsAt)}: ${names(d.outbound)}` : escapeHtml(w.pointsAtNothing)}</li>`
    + `<li>${d.inbound.length ? `${escapeHtml(w.pointedAtBy)}: ${names(d.inbound)}` : escapeHtml(w.pointedAtByNothing)}</li>`
    + '</ul></li>').join('');
  out.push(folded(w.each, graph.documents.length, `<ul>${each}</ul>`));
  return out.join('\n');
}

export function renderOverview(project, cards) {
  const w = words(project.lang);
  return page({
    lang: project.lang,
    title: `${project.name}: ${w.stand.toLowerCase()}`,
    body: [
      `<h1>${escapeHtml(project.name)}</h1>`,
      `<p class="sub">${escapeHtml(w.stand)}. ${escapeHtml(w.live)} `
        + `<a href="/">${escapeHtml(w.back)}</a></p>`,
      ...cards,
    ].join('\n'),
  });
}

export function renderFile(project, relPath, text) {
  const w = words(project.lang);
  return page({
    lang: project.lang,
    title: relPath,
    body: [
      `<h1>${escapeHtml(relPath)}</h1>`,
      `<p class="sub">${escapeHtml(w.readOnly)} <a href="/">${escapeHtml(w.back)}</a></p>`,
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

// ---------------------------------------------------------------- the board, from a project

function readManifest(root) {
  const p = resolve(root, MANIFEST_PATH);
  return existsSync(p) ? parseManifest(readFileSync(p, 'utf8')) : [];
}

// A read that fails is carried to the card that owns it, where a failure is named, instead of
// taking the page down on its way there (criterion 23).
const attempt = (fn) => { try { return { value: fn() }; } catch (error) { return { error }; } };
const unwrap = ({ value, error }) => { if (error) throw error; return value; };

export function overviewPage(root, deps = {}) {
  const project = readProject(root);
  const progress = derive(project);
  const handoff = readHandoff(root);
  const w = words(project.lang);
  const linkWords = LINK_WORDS[project.lang] || LINK_WORDS.en;
  // Read before the cards, so the one ignore question below can cover every name they will show.
  const manifest = attempt(() => readManifest(root));
  const graph = attempt(() => projectGraph(root));
  // A card names the file that owns it either way. It links only where the file route will
  // actually serve that file, so the board never hands a reader a door that does not open:
  // the maintainer's own handoff is kept out of git, and stays a name.
  // Which of them git ignores is asked once for the whole page: a card that names every document
  // would otherwise spawn a process per name.
  const isIgnored = ignoreLookup(root, [
    BRIEF_PATH, MANIFEST_PATH, handoff.path, ENFORCEMENT_PATH, LINKS_PATH,
    ...(manifest.value || []).map((r) => `docs/${r.path}`),
    ...(graph.value?.documents || []).map((d) => d.path),
  ]);
  const opens = (path) => Boolean(path) && decidePath(root, path, { isIgnored, ...deps }).ok;
  const from = (path) => ({ lang: project.lang, path, openable: opens(path) });
  // Read in the order the question is asked: what is this, where does it stand, what is next,
  // where does everything live, how does it hang together, and is any of this actually being
  // enforced here.
  return renderOverview(project, [
    card(w.goal, from(BRIEF_PATH), () => goalCard(readBrief(root), project.lang)),
    // Which file owns the stand moved with the source: a project that plans its work in
    // docs/work/ is counted from there, and the card must name what it actually read.
    card(w.progress, from(progress.source === 'work' ? WORK_DIR : BRIEF_PATH), () => progressCard(project, progress)),
    card(w.nextStep, from(handoff.path), () => nextStepCard(handoff.now, progress.warnings, project.lang)),
    card(w.fileMap, from(MANIFEST_PATH), () => fileMapCard(unwrap(manifest), project.lang, opens)),
    card(linkWords.heading, from(LINKS_PATH), () => linksCard(unwrap(graph), project.lang, opens)),
    card(w.gates, from(ENFORCEMENT_PATH), () => gatesCard(enforcementReport(root), project.lang)),
  ]);
}
