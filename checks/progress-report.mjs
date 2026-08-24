#!/usr/bin/env node
// What the stand is called: the framing words in both languages, and the two shapes the report
// takes - the full report and the one line the Stop hook shows. Split out of progress.mjs when
// that file outgrew its budget; the judgment (what is done, what is left) stays there, and this
// file only says it. The board (checks/cockpit-page.mjs) renders the same facts through the same
// words, so the page and the terminal can never word the stand differently.

// The framing words. Content always comes from the project's own documents, so only these
// connectors need translating. VOICE.md decides which set is used. Exported because the board
// (checks/cockpit.mjs) renders the same facts and must say them in the same words.
export const WORDS = {
  en: {
    doneOfTotal: (d, t) => `${d} of the ${t} things are done`,
    shortDone: (d, t) => `${d} of ${t} done`,
    doneOfTotalWork: (fd, ft, sd, st) => `${fd} of the ${ft} features are done, ${sd} of ${st} stories`,
    shortDoneWork: (fd, ft, sd, st) => `${fd} of ${ft} features, ${sd} of ${st} stories done`,
    noWork: 'No work is planned yet. Cut the epic into features and stories, then this overview '
      + 'can report on it.',
    // The reader already says what it found, in English, and saying it a second time here would
    // be the duplication this whole rebuild is against. Dutch is added next door, not repeated.
    workProblem: (p) => p.text,
    headDone: 'Done',
    headDoing: 'Working on now',
    headTodo: 'Not started yet',
    now: 'now',
    next: 'next',
    noScope: 'Scope is not defined yet. Run the `scope` skill to write down what this project '
      + 'will do, then this overview can report on it.',
    heads: 'Heads up',
    headsShort: (n) => `${n} heads-up${n === 1 ? '' : 's'}`,
    nothingYet: 'Nothing is done yet',
    unknownItem: (spec) => `the plan "${spec}" says it delivers something that is not in the brief. `
      + 'Either it belongs in the brief, or it should not be built.',
    doubleClaim: (title, specs) => `"${title}" is being worked on from ${specs.length} plans at once `
      + `(${specs.join(', ')}). One of them owns it; the others should say so.`,
  },
  nl: {
    doneOfTotal: (d, t) => `${d} van de ${t} dingen zijn klaar`,
    shortDone: (d, t) => `${d} van de ${t} klaar`,
    doneOfTotalWork: (fd, ft, sd, st) => `${fd} van de ${ft} features zijn klaar, ${sd} van de ${st} stories`,
    shortDoneWork: (fd, ft, sd, st) => `${fd} van ${ft} features, ${sd} van ${st} stories klaar`,
    noWork: 'Er is nog geen werk gepland. Knip de epic in features en stories, dan kan dit '
      + 'overzicht erover rapporteren.',
    workProblem: (p) => ({
      status: `${p.ref} heeft geen leesbare status, dus staat op geen enkele baan.`,
      feature: `${p.ref} heeft geen feature.md, dus zegt niet welke waarde het levert.`,
      epic: `${p.ref} heeft geen epic.md, dus deze ronde heeft geen doel op papier.`,
      shape: `Een epic is een map: verplaats ${p.path}/EPIC.md naar ${p.path}/E-01-<slug>/epic.md.`,
    }[p.kind] || p.text),
    headDone: 'Klaar',
    headDoing: 'Nu mee bezig',
    headTodo: 'Nog niet begonnen',
    now: 'nu',
    next: 'daarna',
    noScope: 'De scope is nog niet bepaald. Draai de `scope`-skill om vast te leggen wat dit '
      + 'project gaat doen, dan kan dit overzicht erover rapporteren.',
    heads: 'Let op',
    headsShort: (n) => `${n}× let op`,
    nothingYet: 'Er is nog niets klaar',
    unknownItem: (spec) => `het plan "${spec}" levert iets op wat niet in de brief staat. `
      + 'Of het hoort in de brief, of het moet niet gebouwd worden.',
    doubleClaim: (title, specs) => `aan "${title}" wordt vanuit ${specs.length} plannen tegelijk gewerkt `
      + `(${specs.join(', ')}). Eén ervan is eigenaar; de andere moeten dat zeggen.`,
  },
};

// A warning fact turned into the owner's own sentence. The spec folder name stays: it is how
// they find the file, and unlike an SC-id it says something on its own.
export function warningText(w, warn) {
  if (warn.kind === 'work') return w.workProblem(warn.problem);
  if (warn.kind === 'unknownItem') return w.unknownItem(warn.spec);
  return w.doubleClaim(warn.title, warn.specs);
}

// The one sentence that says where a project stands, and the one that says nothing is planned
// yet. Both depend on which source was counted, and both are needed by the report, the one-line
// nudge and the board, so neither is written down in a renderer.
export function headline(w, progress) {
  return progress.source === 'work'
    ? w.doneOfTotalWork(progress.done, progress.total, progress.stories.done, progress.stories.total)
    : w.doneOfTotal(progress.done, progress.total);
}
export function headlineShort(w, progress) {
  return progress.source === 'work'
    ? w.shortDoneWork(progress.done, progress.total, progress.stories.done, progress.stories.total)
    : w.shortDone(progress.done, progress.total);
}
export const nothingPlanned = (w, progress) => (progress.source === 'work' ? w.noWork : w.noScope);

export function renderFull(project, progress) {
  const w = WORDS[project.lang] || WORDS.en;
  const out = [project.name];
  if (!progress.defined) {
    out.push('', nothingPlanned(w, progress));
    return out.join('\n');
  }
  out.push('', `${headline(w, progress)}.`, '');
  const group = (head, state) => {
    const list = progress.items.filter((i) => i.state === state);
    if (!list.length) return;
    out.push(head);
    for (const i of list) out.push(`  - ${i.title}`);
    out.push('');
  };
  group(w.headDone, 'done');
  group(w.headDoing, 'doing');
  group(w.headTodo, 'todo');
  if (project.now) out.push(`${w.now}: ${project.now}`);
  if (progress.warnings.length) {
    out.push('', `${w.heads}:`);
    for (const warn of progress.warnings) out.push(`  - ${warningText(w, warn)}`);
  }
  return out.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd();
}

const LINE_MAX = 120;

export function renderLine(project, progress) {
  const w = WORDS[project.lang] || WORDS.en;
  if (!progress.defined) return `${project.name}: ${nothingPlanned(w, progress).split('.')[0]}`.slice(0, LINE_MAX);
  const doing = progress.items.find((i) => i.state === 'doing');
  const next = progress.items.find((i) => i.state === 'todo');
  const parts = [`${project.name}: ${headlineShort(w, progress)}`];
  if (doing) parts.push(`${w.now}: ${doing.title}`);
  else if (project.now) parts.push(`${w.now}: ${project.now}`);
  if (next) parts.push(`${w.next}: ${next.title}`);
  // Work that traces nowhere is the one thing this line must never drop, so the marker is
  // reserved its space first and the titles are what gives way when the line runs long.
  const flag = progress.warnings.length ? ` · ⚠ ${w.headsShort(progress.warnings.length)}` : '';
  const room = LINE_MAX - flag.length;
  const line = parts.join(' · ');
  return (line.length <= room ? line : `${line.slice(0, room - 3).trimEnd()}...`) + flag;
}
