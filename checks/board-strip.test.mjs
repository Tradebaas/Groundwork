#!/usr/bin/env node
// Self-test for the two lines under the shelves (checks/board-strip.mjs): how many gates are
// armed on this machine, and how the documents point at each other. What is proven here is that
// each line leads with the answer in the reader's own words, keeps the whole working one click
// behind it, and that a reader that fails costs the board one line rather than the page.
// These were two of the six cards on the retired /overview page; the board they now sit on is
// proven in checks/board.test.mjs. Run: node --test checks/board-strip.test.mjs

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { visible } from './cockpit-fixture.mjs';
import { renderStrip } from './board-strip.mjs';
import { linkGraph } from './links.mjs';

// The strip renders from two reads, each of which either produced a value or threw. A test hands
// them in directly, so no fixture on disk stands between an assertion and what it is about.
const facts = (gates, graph) => ({
  gates: gates instanceof Error ? { error: gates } : { value: gates },
  graph: graph instanceof Error ? { error: graph } : { value: graph },
});
const NO_GRAPH = linkGraph([]);
const ARMED = [{ signal: 'hooks', armed: true, detail: 'core.hooksPath -> checks/hooks' }];

const strip = (gates, graph, opens = () => false) => renderStrip(facts(gates, graph), 'en', opens);
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
