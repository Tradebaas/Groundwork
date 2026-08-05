#!/usr/bin/env node
// Self-test for checks/check-code.mjs: the gates that read source code. Every one must prove it
// FAILS on a real violation and stays quiet on a clean repo (decision 0005).
// Run: node checks/check-code.test.mjs
// Two of these gates ask the same question first - is this text a comment on this line? - so
// both directions of that answer are proven here: a trailing comment is a comment, and text
// that only looks like one, inside a string, is not.

import assert from 'node:assert/strict';
import { commentOn } from './check-code.mjs';
import { expectClean, expectFail, withConfig, tally, report } from './check-fixture.mjs';

// The shared answer, pinned directly: the gates below reach it only through a fixture repo, and
// these are the lines where a careless edit to it would go quiet rather than red.
for (const [line, want] of [
  ['const a = 1; // trailing', ' trailing'],
  ['x = 1  # hash trailing', ' hash trailing'],
  ['a = 1; /* block */', ' block */'],
  [' * body of a block comment', ' body of a block comment'],
  ['<p>x</p> <!-- markup -->', ' markup -->'],
  ['const url = "https://x.test/a";', null],   // an opener inside a string stays a string
  ['const s = "// not a comment";', null],
  ['this.#count = 1;', null],                  // a private field, not a hash comment
  ['color = "#fff"', null],
  ['const q = "it\'s fine"; // after an apostrophe', ' after an apostrophe'],
]) {
  try {
    assert.equal(commentOn(line), want);
    tally.passed++;
  } catch (e) { tally.failed.push(`commentOn ${JSON.stringify(line)}: ${e.message}`); }
}


expectFail('secrets', ({ put }) =>
  put('docs/state/STATE.md', '# STATE\n\n## Handoff\n\n- Now ▶ demo\n- key AKIAIOSFODNN7EXAMPLE\n')); // checks:allow-secret

expectFail('defer-markers', ({ put }) =>
  put('src/app.js', 'export const x = 1;\n// defer: global lock. ceiling: 100 users.\n'));

const APOLOGY = [{ pattern: '\\bfor now\\b', why: 'unmarked deferral' }];
const withApology = (extra = {}) => withConfig({ commentBans: APOLOGY, ...extra });

// The commentBans half of the defer contract: an apology in a comment is a deferral that
// skipped the marker, so nothing can grep for it later.
expectFail('defer-markers', (fx) => {
  withApology()(fx);
  fx.put('src/app.js', 'export const x = 1;\n// one global lock for now.\n');
});
// A comment does not have to open the line. The trailing form is what most code actually
// writes, so each comment style proves it here: the gate read only leading comments once, and
// `x = 1; // for now` walked past every ban while the same words on their own line failed.
expectFail('defer-markers', (fx) => { // line comment, C family
  withApology()(fx);
  fx.put('src/app.js', 'export const x = 1; // one global lock for now.\n');
});
expectFail('defer-markers', (fx) => { // hash comment, Python and shell family
  withApology()(fx);
  fx.put('src/app.py', 'x = 1  # one global lock for now\n');
});
expectFail('defer-markers', (fx) => { // block comment, trailing
  withApology()(fx);
  fx.put('src/app.js', 'export const x = 1; /* one global lock for now */\n');
});
expectFail('defer-markers', (fx) => { // block comment, continuation line
  withApology()(fx);
  fx.put('src/app.js', '/**\n * One global lock for now.\n */\nexport const x = 1;\n');
});
expectFail('defer-markers', (fx) => { // markup comment, trailing
  withApology()(fx);
  fx.put('src/page.php', '<?= $x ?> <!-- one global lock for now -->\n');
});

// ... and the ways it must stay quiet, because a noisy gate gets switched off. The first two
// are the honesty half of the same helper: text that merely looks like a comment opener is
// still a string, and reading it as a comment would fail a file that defers nothing.
expectClean('comment-ban-ignores-non-comment', (fx) => {
  withApology()(fx);
  fx.put('src/app.js', 'export const label = "closed for now";\n');
});
expectClean('comment-ban-reads-past-a-string', (fx) => {
  withApology()(fx);
  fx.put('src/app.js', 'export const help = "see /docs // for now";\n');
});
expectClean('comment-ban-reads-past-a-hash-in-a-string', (fx) => {
  withApology()(fx);
  fx.put('src/app.py', 'label = "# for now"\n');
});
expectClean('comment-ban-is-code-only', (fx) => {
  withApology()(fx);
  fx.put('docs/state/STATE.md', '# STATE\n\n## Handoff\n\n- Now ▶ good enough for now\n');
});
expectClean('comment-ban-skips-vendored', (fx) => {
  withApology({ codeFileCapExclude: ['vendor/'] })(fx);
  fx.put('vendor/bundle.js', '// patched for now\n');
});
expectClean('comment-ban-yields-to-marker', (fx) => {
  withApology()(fx);
  fx.put('src/app.js', '// defer: one lock for now. ceiling: 100 users. upgrade-when: 100 users.\n');
});

expectFail('zombie-code', ({ put }) =>
  put('src/app.js', 'export const x = 1;\n// const old = 2;\n// function dead() {\n// return old;\n'));

expectFail('code-file-cap', ({ put }) => // 501 lines of code, budget 500
  put('src/big.js', 'export const x = 1;\n'.repeat(501)));

expectFail('code-file-cap', ({ put }) => // escape marker without a reason does not suppress
  put('src/big.js', `// checks:allow-length\n${'export const x = 1;\n'.repeat(510)}`));

// The exemption is a declaration a file makes about itself, so only a comment that opens with
// the marker grants it. A file that merely mentions the marker - a test fixture, a doc snippet,
// the very code implementing it - was exempting itself, which is a gate switched off by accident.
expectFail('code-file-cap', ({ put }) => // inside a string literal: a mention, not a comment
  put('src/big.js', `const sample = '// checks:allow-length: not mine to grant';\n${'export const x = 1;\n'.repeat(510)}`));

expectFail('code-file-cap', ({ put }) => // prose about the marker, mid-comment: still a mention
  put('src/big.js', `// the escape hatch is a "checks:allow-length: <reason>" line in the file\n${'export const x = 1;\n'.repeat(510)}`));

expectFail('secrets', ({ put }) => // checks:allow-secret
  put('docs/state/STATE.md',
    `# STATE\n\n## Handoff\n\n- Now ▶ demo\n- jwt eyJ${'a'.repeat(30)}.${'b'.repeat(30)}.${'c'.repeat(15)}\n`));

expectClean('code-file-cap-at-budget', ({ put }) =>
  put('src/ok.js', 'export const x = 1;\n'.repeat(499)));

expectClean('code-file-cap-allow-marker', ({ put }) =>
  put('src/generated.js', `// checks:allow-length: generated fixture for the self-test\n${'export const x = 1;\n'.repeat(510)}`));

expectClean('code-file-cap-allow-marker-trailing', ({ put }) => // a declaration may sit after code
  put('src/generated.js', `export const x = 1; // checks:allow-length: generated fixture\n${'export const x = 1;\n'.repeat(510)}`));

expectClean('code-file-cap-exclude', ({ put }) => {
  put('checks/config.json', JSON.stringify({
    denylist: [], codeFileCapExclude: ['src/vendor/'],
    budgets: { agentsMdLines: 150, stateMdLines: 150, skillMdLines: 500, skillDescriptionChars: 1024 },
    allowedEmptyDirs: [], secretScanExclude: ['checks/'],
  }));
  put('src/vendor/lib.js', 'export const x = 1;\n'.repeat(510));
});

// A declared third-party payload is code this project did not write: neither its length budget
// nor its comment discipline is ours to enforce. The declaration is the only difference between
// this fixture and the two failing ones above, and the secrets gate still reads every line of it.
expectClean('code-gates-skip-a-declared-payload', ({ put }) => {
  put('checks/config.json', JSON.stringify({
    denylist: [],
    budgets: { agentsMdLines: 150, stateMdLines: 150, skillMdLines: 500, skillDescriptionChars: 1024 },
    allowedEmptyDirs: [], secretScanExclude: ['checks/'],
    thirdParty: [{ path: 'vendor/upstream/', why: 'installed at its current release, not written here' }],
  }));
  put('vendor/upstream/big.js', 'export const x = 1;\n'.repeat(510));
  put('vendor/upstream/dead.js', 'export const x = 1;\n// const old = 2;\n// function dead() {\n// return old;\n');
  put('vendor/upstream/apology.js', '// patched for now\n');
});

report('code-gate');
