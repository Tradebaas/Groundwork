#!/usr/bin/env node
// Self-test for the lines under the shelves (checks/board-strip.mjs): how many gates are armed
// on this machine, how much of the project's own code any of them looks at, and how the
// documents point at each other. What is proven here is that
// each line leads with the answer in the reader's own words, keeps the whole working one click
// behind it, and that a reader that fails costs the board one line rather than the page.
// These were two of the six cards on the retired /overview page; the board they now sit on is
// proven in checks/board.test.mjs. Run: node --test checks/board-strip.test.mjs

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { visible } from './board-fixture.mjs';
import { renderStrip } from './board-strip.mjs';
import { formatFloor } from './enforcement.mjs';
import { linkGraph } from './links.mjs';

// The strip renders from its reads, each of which either produced a value or threw. A test hands
// them in directly, so no fixture on disk stands between an assertion and what it is about.
// The floor read is left out entirely unless a test names one, which is also how a project that
// has not chosen a stack reaches this function.
const facts = (gates, graph, floor) => ({
  gates: gates instanceof Error ? { error: gates } : { value: gates },
  graph: graph instanceof Error ? { error: graph } : { value: graph },
  ...(floor === undefined ? {} : { floor: floor instanceof Error ? { error: floor } : { value: floor } }),
});
const NO_GRAPH = linkGraph([]);
const ARMED = [{ signal: 'hooks', armed: true, detail: 'core.hooksPath -> checks/hooks' }];

const strip = (gates, graph, opens = () => false) => renderStrip(facts(gates, graph), 'en', opens);
const stripF = (floor, gates = ARMED, graph = NO_GRAPH) => renderStrip(facts(gates, graph, floor), 'en');
// One line off the strip, so an assertion is about the line it names and not about its neighbour.
const lineOf = (html, n) => html.split('<section class="line">')[n].split('</section>')[0];

// ---------------------------------------------------------------- the gates line

test('the gates line reports this machine, and repeats the fix line when one is down', () => {
  const html = lineOf(strip([
    { signal: 'hooks', armed: true, detail: 'core.hooksPath -> checks/hooks' },
    { signal: 'CI', armed: false, detail: 'CI workflow present but no GitHub remote: it never runs.' },
    { signal: 'adapter hooks', armed: true, detail: 'wired' },
  ], NO_GRAPH), 1);
  const text = visible(html);
  // The answer is the summary itself, so a folded board still says whether it is guarded.
  assert.match(html, /<summary><span class="ttl">2 of the 3 gates on this machine are armed\.<\/span>/);
  assert.match(text, /Armed.*the checks before every commit/);
  assert.match(text, /Not armed.*no GitHub remote: it never runs/);
  // An armed signal says what it does, not how it is configured.
  assert.doesNotMatch(text, /core\.hooksPath/);
  // The whole working is behind the fold, and the reader that did the looking is named there.
  assert.match(html, /From <code>checks\/enforcement\.mjs<\/code>/);
});

test('a machine with nothing armed says so, rather than saying nothing', () => {
  const text = visible(lineOf(strip([{ signal: 'hooks', armed: false, detail: 'run --install-hooks.' }], NO_GRAPH), 1));
  assert.match(text, /0 of the 1 gates on this machine are armed/);
  assert.match(text, /Not armed/);
  assert.doesNotMatch(text, /\bArmed the\b/);
});

// ---------------------------------------------------------------- the floor line

// One floor, as the derivation in checks/check-stack.mjs hands it over: four classes answered by
// a command a workflow runs, two waived on purpose, none left open.
const FLOOR = {
  total: 6,
  proven: 4,
  waived: [
    { cls: 'dependencies', form: 'not applicable', reason: 'No third-party code ships here', path: 'docs/standards/node.md' },
    { cls: 'renders', form: 'manual', reason: 'A named walkthrough by the owner before each release', path: 'docs/standards/node.md' },
  ],
  open: [],
  files: ['docs/standards/node.md'],
};

test('the floor line leads with the count and says in the summary what proven does not buy', () => {
  const html = lineOf(stripF(FLOOR), 2);
  // The limit is in the summary and not behind the fold: a folded board still has to say it, or
  // the number alone reads as an audit that nobody performed.
  assert.match(html, /<summary><span class="ttl">4 of the 6 risk classes are proven by a command that runs\. Proven means it runs, not that what it runs is any good\.<\/span>/);
  const text = visible(html);
  assert.match(text, /Waived, on purpose and with a reason/);
  // The reason is the stack file author's own words, quoted rather than summarised.
  assert.match(text, /dependencies, waived as not applicable - No third-party code ships here/);
  assert.match(text, /renders, waived as manual - A named walkthrough by the owner/);
  // And the reader is pointed at the table itself rather than asked to trust this line.
  assert.match(text, /Answered in/);
  assert.match(text, /docs\/standards\/node\.md/);
  assert.match(html, /From <code>checks\/check-stack\.mjs<\/code>/);
});

test('a whole floor is one sentence, with no working to show', () => {
  const html = lineOf(stripF({ ...FLOOR, proven: 6, waived: [] }), 2);
  assert.match(html, /6 of the 6 risk classes/);
  assert.doesNotMatch(html, /<details>/);
});

test('a class nothing runs is named as open, never dressed up as a waiver', () => {
  const text = visible(lineOf(stripF({ ...FLOOR, proven: 3, open: ['behaves'] }), 2));
  assert.match(text, /Answered by nothing that runs/);
  assert.match(text, /behaves/);
  assert.match(text, /neither is a waiver/);
});

// Not started is not the same as failing, which is the rule the empty copy follows everywhere.
test('a project with no stack file gets no floor line, rather than a floor of zero', () => {
  for (const nothing of [null, undefined]) {
    const html = stripF(nothing);
    assert.doesNotMatch(visible(html), /risk classes/);
    // The rest of the strip is untouched by a line that is absent.
    assert.match(visible(lineOf(html, 2)), /no documents to read yet/);
  }
});

// The seam this story exists for: one derivation, two outputs. Proven by comparing the two
// renderings rather than asserting each, so a waiver cannot show up in one and not the other.
test('the board and the enforcement line carry one floor, not two readings of it', () => {
  const board = visible(lineOf(stripF(FLOOR), 2));
  const terminal = formatFloor(FLOOR).join('\n');
  assert.match(terminal, /4 of the 6/);
  assert.match(board, /4 of the 6/);
  for (const w of FLOOR.waived) {
    assert.ok(terminal.includes(w.cls) && terminal.includes(w.reason), `the terminal drops ${w.cls}`);
    assert.ok(board.includes(w.cls) && board.includes(w.reason), `the board drops ${w.cls}`);
  }
  // Both state the limit rather than implying a guarantee, in their own wording.
  assert.match(terminal, /not that what it runs is any good/);
  assert.match(board, /not that what it runs is any good/);
});

test('the floor line speaks the language the project set', () => {
  const text = visible(renderStrip(facts(ARMED, NO_GRAPH, FLOOR), 'nl'));
  assert.match(text, /4 van de 6 risicoklassen/);
  assert.match(text, /Bewezen betekent dat het draait/);
  // The class and the form keep the contract's own vocabulary in both languages: they are what
  // the stack file literally says, and a translated key would send a reader looking for a row
  // that is not there.
  assert.match(text, /dependencies, vrijgesteld als not applicable/);
});

test('nothing a stack file says can execute as markup', () => {
  const html = stripF({
    ...FLOOR,
    waived: [{ cls: '<script>alert(1)</script>', form: 'manual', reason: '<img src=x onerror=alert(2)>', path: 'p.md' }],
  });
  assert.doesNotMatch(html, /<script>alert|<img src=x/);
  assert.match(html, /&lt;script&gt;/);
});

// ---------------------------------------------------------------- the link line

test('the link line names what is load-bearing and folds the long lists behind their counts', () => {
  const pointsAtBrief = 'the brief `docs/product/BRIEF.md`';
  const graph = linkGraph([
    { path: 'AGENTS.md', text: pointsAtBrief },
    { path: 'docs/state/STATE.md', text: pointsAtBrief },
    { path: 'docs/state/DEBT.md', text: pointsAtBrief },
    // The manifest names a file from inside docs/, and it is the same document either way.
    { path: 'docs/README.md', text: 'the brief `product/BRIEF.md`' },
    { path: 'docs/product/BRIEF.md', text: 'no pointers here' },
    { path: 'docs/lonely.md', text: 'no pointers here either' },
  ]);
  const html = lineOf(strip(ARMED, graph, (p) => p === 'docs/product/BRIEF.md'), 2);
  const text = visible(html);
  // How many documents point at how many others, and what points at nothing: one line.
  assert.match(html, /<summary><span class="ttl">6 documents, with 4 links between them\. /);
  assert.match(text, /Every path spelled out lands on a document or on a file/);
  // What was counted is said behind the fold: a reader deciding to delete a file has to know.
  assert.match(text, /A link is a path a document spells out/);
  assert.match(html, /<h3>4 or more documents point at these<\/h3>/);
  assert.match(text, /docs\/product\/BRIEF\.md - 4 documents point at it/);
  assert.match(html, /<summary>Nothing points at these <span class="count">5<\/span>/);
  assert.match(html, /<summary>Every document, and what it points at <span class="count">6<\/span>/);
  // Both directions per document, which is the whole promise the card made before this line did.
  // The separator is written once between the names; stripping the markup leaves a space beside it.
  assert.match(text, /Pointed at by: AGENTS\.md ?, docs\/README\.md ?, docs\/state\/DEBT\.md ?, docs\/state\/STATE\.md/);
  assert.match(text, /Points at: docs\/product\/BRIEF\.md/);
  assert.match(text, /Points at no other document\./);
  // A name opens its file where the file route will serve it, and stays a name where it will not.
  assert.match(html, /<a href="\/file\?path=docs%2Fproduct%2FBRIEF\.md">/);
  assert.doesNotMatch(html, /href="[^"]*lonely/);
});

test('the link line counts the paths that point at nothing, and says why an orphan can be by design', () => {
  const graph = linkGraph([
    {
      path: 'AGENTS.md',
      text: 'the runner `checks/check.mjs`, made by `architect`: `docs/product/ARCHITECTURE.md`',
    },
    { path: '.agents/skills/architect/SKILL.md', text: 'the rulebook `AGENTS.md`' },
  ], { exists: (p) => p === 'checks/check.mjs' });
  const html = lineOf(strip(ARMED, graph), 2);
  // The residual is on the line itself, where a reader sees it without opening anything.
  assert.match(html, /<summary><span class="ttl">2 documents, with 1 links between them\. Paths that point at nothing: 1\.<\/span>/);
  assert.match(html, /<summary>Paths that point at nothing <span class="count">1<\/span>/);
  // The name is its own element, so stripping the markup leaves a space beside the separator.
  assert.match(visible(html), /AGENTS\.md ?: docs\/product\/ARCHITECTURE\.md/);
  assert.match(visible(html), /a name shortened to its bare filename, or prose shaped like a path/);
  // The clause sits inside the fold, next to the names it explains.
  assert.match(html, /Nothing points at these[\s\S]*the rulebook names a skill by its name[\s\S]*<\/details>/);
  // A path that lands on a file which is no document is placed, not counted as a miss.
  assert.doesNotMatch(visible(html), /check\.mjs/);
});

test('a project with nothing to draw says so, on the line and in the numbers', () => {
  const nothing = lineOf(strip(ARMED, NO_GRAPH), 2);
  assert.match(visible(nothing), /no documents to read yet/);
  // And it stops there: a fold that opened on sentences about documents this project does not
  // have would be worse than no fold.
  assert.doesNotMatch(nothing, /<details>/);
  const alone = lineOf(strip(ARMED, linkGraph([{ path: 'AGENTS.md', text: 'rules' }])), 2);
  assert.match(visible(alone), /No document is pointed at by 4 or more others/);
  assert.match(alone, /<summary>Nothing points at these <span class="count">1<\/span>/);
  // Nothing left over is stated, not left silent: an empty line would read as an unasked question.
  assert.match(visible(alone), /Every path spelled out lands on a document or on a file\./);
});

// ---------------------------------------------------------------- one reader, not the page

test('a reader that fails costs the board its own line and nothing more', () => {
  const html = strip(new Error('the enforcement report threw'), NO_GRAPH);
  assert.match(visible(html), /could not be built: the enforcement report threw/);
  assert.match(visible(html), /The rest still holds/);
  // The other line rendered anyway, which is the whole point of asking separately.
  assert.match(visible(lineOf(html, 2)), /no documents to read yet/);
  // And no page ever shows an internal trace to a reader.
  assert.doesNotMatch(html, /at Object|\.mjs:\d+/);
});

test('nothing a reader returns can execute as markup', () => {
  const html = strip([{ signal: '<script>alert(1)</script>', armed: false, detail: '<img src=x onerror=alert(2)>' }], NO_GRAPH);
  assert.doesNotMatch(html, /<script>|<img src=x/);
  assert.match(html, /&lt;script&gt;/);
});
