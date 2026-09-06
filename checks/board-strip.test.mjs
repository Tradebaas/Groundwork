#!/usr/bin/env node
// Self-test for the two lines at the foot of the board (checks/board-strip.mjs): how many gates
// are armed on this machine, and how much of the project's own code any of them looks at. What is
// proven here is that each line leads with the answer in the reader's own words, keeps the whole
// working one click behind it, and that a reader that fails costs the board one line rather than
// the page.
// These were two of the six cards on the retired /overview page; the board they now sit on is
// proven in checks/board.test.mjs. Run: node --test checks/board-strip.test.mjs

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { visible } from './board-fixture.mjs';
import { renderStrip } from './board-strip.mjs';
import { formatFloor } from './enforcement.mjs';

// The strip renders from its reads, each of which either produced a value or threw. A test hands
// them in directly, so no fixture on disk stands between an assertion and what it is about.
// The floor read is left out entirely unless a test names one, which is also how a project that
// has not chosen a stack reaches this function.
const facts = (gates, floor) => ({
  gates: gates instanceof Error ? { error: gates } : { value: gates },
  ...(floor === undefined ? {} : { floor: floor instanceof Error ? { error: floor } : { value: floor } }),
});
const ARMED = [{ signal: 'hooks', armed: true, detail: 'core.hooksPath -> checks/hooks' }];

const strip = (gates, opens = () => false) => renderStrip(facts(gates), 'en', opens);
const stripF = (floor, gates = ARMED) => renderStrip(facts(gates, floor), 'en');
// One line off the strip, so an assertion is about the line it names and not about its neighbour.
const lineOf = (html, n) => html.split('<section class="line">')[n].split('</section>')[0];

// ---------------------------------------------------------------- the gates line

test('the gates line reports this machine, and repeats the fix line when one is down', () => {
  const html = lineOf(strip([
    { signal: 'hooks', armed: true, detail: 'core.hooksPath -> checks/hooks' },
    { signal: 'CI', armed: false, detail: 'CI workflow present but no GitHub remote: it never runs.' },
    { signal: 'adapter hooks', armed: true, detail: 'wired' },
  ]), 1);
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

test('the reader behind a line opens where the file route serves it, and stays a name where it does not', () => {
  const served = lineOf(strip(ARMED, (p) => p === 'checks/enforcement.mjs'), 1);
  assert.match(served, /<a href="\/file\?path=checks%2Fenforcement\.mjs">/);
  assert.doesNotMatch(lineOf(strip(ARMED), 1), /<a[\s>]/);
});

test('a machine with nothing armed says so, rather than saying nothing', () => {
  const text = visible(lineOf(strip([{ signal: 'hooks', armed: false, detail: 'run --install-hooks.' }]), 1));
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
    // The rest of the strip is untouched by a line that is absent: the gates line stands alone.
    assert.equal(html.split('<section class="line">').length - 1, 1);
    assert.match(visible(lineOf(html, 1)), /armed/);
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
  const text = visible(renderStrip(facts(ARMED, FLOOR), 'nl'));
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

// ---------------------------------------------------------------- what the strip carries

test('the strip is two lines, the gates and the floor, and carries no link map', () => {
  // The document graph was the third line and half of the page's words (E-01/F-04/S-08). It is a
  // maintainer's view, printed by `progress.mjs --links` in the terminal, and the board is the
  // owner's page: nothing on it is about the repository unless the owner unfolds it.
  const html = stripF({ ...FLOOR, waived: [] });
  assert.equal(html.split('<section class="line">').length - 1, 2);
  assert.doesNotMatch(visible(html), /documents, with|links between them|points at nothing|Nothing points at these/);
  assert.doesNotMatch(html, /checks\/links\.mjs/);
});

// ---------------------------------------------------------------- one reader, not the page

test('a reader that fails costs the board its own line and nothing more', () => {
  const html = stripF(FLOOR, new Error('the enforcement report threw'));
  assert.match(visible(html), /could not be built: the enforcement report threw/);
  assert.match(visible(html), /The rest still holds/);
  // The other line rendered anyway, which is the whole point of asking separately.
  assert.match(visible(lineOf(html, 2)), /risk classes/);
  // And no page ever shows an internal trace to a reader.
  assert.doesNotMatch(html, /at Object|\.mjs:\d+/);
});

test('nothing a reader returns can execute as markup', () => {
  const html = strip([{ signal: '<script>alert(1)</script>', armed: false, detail: '<img src=x onerror=alert(2)>' }]);
  assert.doesNotMatch(html, /<script>|<img src=x/);
  assert.match(html, /&lt;script&gt;/);
});
