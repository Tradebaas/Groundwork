// The lines under the shelves: how many gates are armed on this machine, how much of this
// project's own code any of them actually looks at, and how the project's documents point at
// each other. Each says its answer in one sentence and folds the detail the reader behind it
// produces, so the board ends with a handful of facts rather than a handful of pages.
// Every sentence is a reader's own (checks/enforcement.mjs, checks/check-stack.mjs,
// checks/links.mjs), quoted rather than reworded: the terminal and the board must never word one
// fact differently. The floor line reads the same derivation the enforcement line prints, so a
// waiver cannot show up in one place and not the other (E-02/F-01/S-03).
// Moved here when the four shelves took the board and /overview was retired
// (E-01/F-04/S-04); until then these were two of the six cards in checks/board-document.mjs.

import { enforcementReport } from './enforcement.mjs';
import { floorReport } from './check-stack.mjs';
import { projectGraph, LINK_WORDS, HUB_MIN } from './links.mjs';
import {
  shellWords, escapeHtml, sentence, pathName, list, folded, attempt,
} from './board-shell.mjs';

// Each line reports on the project as a whole rather than on one document, so the file each
// names is the one that does the looking.
const ENFORCEMENT_PATH = 'checks/enforcement.mjs';
const FLOOR_PATH = 'checks/check-stack.mjs';
const LINKS_PATH = 'checks/links.mjs';

// The gates line's own framing. What is armed and what is not comes from the report.
// The answer comes in two, because a gate is armed somewhere. Served, that somewhere is the
// machine the reader is on. Printed as one file (E-01/F-04/S-05) it is not: the reader is
// somewhere else, later, so the line says where the reading was done instead of pointing at a
// machine the report never saw.
const GATE_WORDS = {
  en: {
    armedOf: (n, t) => `${n} of the ${t} gates on this machine are armed`,
    armedThere: (n, t) => `${n} of the ${t} gates were armed on the machine where this file was made`,
    headArmed: 'Armed',
    headNotArmed: 'Not armed',
    signals: {
      hooks: 'the checks before every commit',
      CI: 'the check that runs where it cannot be skipped',
      'adapter hooks': 'the reminders the agent gets during a session',
      'design method': 'the method the interface is designed with',
    },
  },
  nl: {
    armedOf: (n, t) => `${n} van de ${t} poorten op deze machine staan scherp`,
    armedThere: (n, t) => `${n} van de ${t} poorten stonden scherp op de machine waar dit bestand is gemaakt`,
    headArmed: 'Scherp',
    headNotArmed: 'Niet scherp',
    signals: {
      hooks: 'de controles voor elke commit',
      CI: 'de controle die draait waar niemand hem kan overslaan',
      'adapter hooks': 'de herinneringen die de agent tijdens een sessie krijgt',
      'design method': 'de methode waarmee de interface wordt ontworpen',
    },
  },
};

// The floor line's own framing. The count comes from the derivation; the second sentence is the
// limit, and it sits in the summary rather than behind the fold on purpose: a folded board still
// has to say what "proven" does not buy, or the number alone reads as an audit nobody performed.
// This line needs no served-or-printed split the way the gates line does: a floor is read off the
// stack file and the workflows, both tracked, so it says the same thing wherever it is read.
const FLOOR_WORDS = {
  en: {
    floorAnswer: (n, t) => `${n} of the ${t} risk classes are proven by a command that runs. `
      + 'Proven means it runs, not that what it runs is any good.',
    headWaived: 'Waived, on purpose and with a reason',
    headOpen: 'Answered by nothing that runs',
    waivedAs: (cls, form) => `${cls}, waived as ${form}`,
    openWhy: 'A class here is either unanswered or answers with a command no workflow runs. The '
      + 'gate refuses both; neither is a waiver.',
    answeredIn: 'Answered in',
  },
  nl: {
    floorAnswer: (n, t) => `${n} van de ${t} risicoklassen worden bewezen door een commando dat `
      + 'draait. Bewezen betekent dat het draait, niet dat wat het draait deugt.',
    headWaived: 'Vrijgesteld, bewust en met reden',
    headOpen: 'Beantwoord door niets dat draait',
    waivedAs: (cls, form) => `${cls}, vrijgesteld als ${form}`,
    openWhy: 'Een klasse hier is niet beantwoord, of antwoordt met een commando dat geen enkele '
      + 'workflow draait. De poort weigert allebei; geen van beide is een vrijstelling.',
    answeredIn: 'Beantwoord in',
  },
};

// The three reads this strip needs. Done before anything renders, so the page can ask git once
// which of the names below it is allowed to open.
export const readStrip = (root) => ({
  gates: attempt(() => enforcementReport(root)),
  floor: attempt(() => floorReport(root)),
  graph: attempt(() => projectGraph(root)),
});

// Every file name these lines will show, for that one ignore lookup.
export const stripPaths = (facts) => [
  ENFORCEMENT_PATH, FLOOR_PATH, LINKS_PATH,
  ...(facts.floor?.value?.files || []),
  ...(facts.graph.value?.documents || []).map((d) => d.path),
];

// ---------------------------------------------------------------- one line

// A summary that is the answer, and a fold that is the working. A line that cannot be built says
// so where its answer would have stood, and the other line still renders.
function line(w, read, answer, detail, owner, opens) {
  if (read.error) {
    return `<section class="line"><p class="note">${escapeHtml(w.partFailed(read.error.message))}</p></section>`;
  }
  const said = `<span class="ttl">${escapeHtml(answer(read.value))}</span>`;
  // A reader with nothing to report has no working to show, and a fold that opens on sentences
  // about documents a project does not have would be worse than no fold.
  const body = detail(read.value);
  if (!body) return `<section class="line">${said}</section>`;
  const src = `<p class="src">${escapeHtml(w.source)} ${pathName(owner, opens)}</p>`;
  return `<section class="line"><details><summary>${said}</summary>\n${body}\n${src}</details></section>`;
}

// Which enforcement actually runs here. A fresh clone silently loses the machine-local layers,
// so a line that only ever said "armed" would be the most expensive lie on the board.
function gatesDetail(signals, w) {
  const named = (s) => w.signals[s.signal] || s.signal;
  const armed = signals.filter((s) => s.armed);
  const degraded = signals.filter((s) => !s.armed);
  const out = [];
  if (armed.length) out.push(`<h3>${escapeHtml(w.headArmed)}</h3>\n${list(armed.map(named))}`);
  if (degraded.length) {
    out.push(`<h3>${escapeHtml(w.headNotArmed)}</h3>`);
    // The fix line comes from the report itself, so the board and the terminal say the same
    // thing about what to do.
    for (const s of degraded) out.push(`<p class="note">${sentence(`${named(s)} - ${s.detail}`)}</p>`);
  }
  return out.join('\n');
}

// What the six classes are answered with, for the reader who wants to know which hole they are
// standing in. A whole floor produces nothing here, and the line stays a single sentence.
function floorDetail(floor, w, opens) {
  const out = [];
  if (floor.waived.length) {
    out.push(`<h3>${escapeHtml(w.headWaived)}</h3>`);
    // The reason is the stack file author's own, never reworded here: it is the whole content of
    // the waiver, and the board is quoting it rather than summarising it.
    for (const x of floor.waived) out.push(`<p class="note">${sentence(`${w.waivedAs(x.cls, x.form)} - ${x.reason}`)}</p>`);
  }
  if (floor.open.length) {
    out.push(`<h3>${escapeHtml(w.headOpen)}</h3>`);
    out.push(list(floor.open));
    out.push(`<p class="hint">${escapeHtml(w.openWhy)}</p>`);
  }
  if (!out.length) return '';
  // Where the answers live, so the reader can go read the table rather than trust this summary.
  out.push(`<p class="hint">${escapeHtml(w.answeredIn)} ${floor.files.map((f) => pathName(f, opens)).join(', ')}</p>`);
  return out.join('\n');
}

// The floor line exists only once a stack does. A project that has not chosen one has not failed
// to answer the six classes, it has not been asked yet, and a line reading "0 of the 6" would be
// the board's own version of the false confidence this gate exists to remove.
function floorLine(read, w, opens) {
  if (!read || (!read.error && !read.value)) return '';
  return line(w, read, (f) => w.floorAnswer(f.proven, f.total), (f) => floorDetail(f, w, opens),
    FLOOR_PATH, opens);
}

// Which document points at which, so the question behind moving or deleting a file has an answer
// before the move: what nothing points at can go, and what many documents lean on is a decision.
function linksDetail(graph, w, opens) {
  if (!graph.documents.length) return '';
  const named = (path) => pathName(path, opens);
  const names = (paths) => paths.map(named).join(', ');
  // What a link is, said on the line: a reader deciding whether a file is safe to delete has to
  // know what was counted. It is a footnote to the number above it, not a second headline.
  const out = [`<p class="hint">${escapeHtml(w.whatCounts)}</p>`];
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
  if (graph.unresolved.length) {
    // The target is set as the path it is, and never as a link: there is nothing to open, which
    // is the whole finding.
    out.push(folded(w.unresolved, graph.unresolved.length,
      `<ul>${graph.unresolved.map((m) => `<li>${named(m.from)}: <code>${escapeHtml(m.raw)}</code></li>`).join('')}</ul>`
      + `\n<p class="hint">${escapeHtml(w.unresolvedWhy)}</p>`));
  }
  // Both directions per document, which is the whole detail; it folds because it is as long as
  // the project has documents.
  const each = graph.documents.map((d) => `<li>${named(d.path)}<ul>`
    + `<li>${d.outbound.length ? `${escapeHtml(w.pointsAt)}: ${names(d.outbound)}` : escapeHtml(w.pointsAtNothing)}</li>`
    + `<li>${d.inbound.length ? `${escapeHtml(w.pointedAtBy)}: ${names(d.inbound)}` : escapeHtml(w.pointedAtByNothing)}</li>`
    + '</ul></li>').join('');
  out.push(folded(w.each, graph.documents.length, `<ul>${each}</ul>`));
  return out.join('\n');
}

// The one sentence the link line leads with: how many documents point at how many others, and
// what points at nothing. Both halves are the link reader's own wording.
const linksAnswer = (graph, w) => (graph.documents.length
  ? `${w.summary(graph.documents.length, graph.links)}. `
    + (graph.unresolved.length ? `${w.unresolved}: ${graph.unresolved.length}.` : w.noUnresolved)
  : w.noDocuments);

// The lines, in the project's own language. The word sets are gathered here rather than
// handed in, so a caller cannot hand this file a set that words a gate differently than the
// terminal does. `made` is the moment a printed board was made, and null on a served one: the
// only thing that changes here is which of the two gate sentences is true.
export function renderStrip(facts, lang, opens = () => false, made = null) {
  const w = { ...shellWords(lang), ...(GATE_WORDS[lang] || GATE_WORDS.en) };
  const fw = { ...shellWords(lang), ...(FLOOR_WORDS[lang] || FLOOR_WORDS.en) };
  const lw = LINK_WORDS[lang] || LINK_WORDS.en;
  const armed = made ? w.armedThere : w.armedOf;
  return '<div class="strip">'
    + line(w, facts.gates, (s) => `${armed(s.filter((x) => x.armed).length, s.length)}.`,
      (s) => gatesDetail(s, w), ENFORCEMENT_PATH, opens)
    // Directly under the gates, because it is the question the gates line invites: they are
    // armed, and this is how much of this project's own code any of them looks at.
    + floorLine(facts.floor, fw, opens)
    + line(w, facts.graph, (g) => linksAnswer(g, lw), (g) => linksDetail(g, lw, opens), LINKS_PATH, opens)
    + '</div>';
}
