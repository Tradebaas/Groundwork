#!/usr/bin/env node
// Self-test for checks/check-trace.mjs: the chain BRIEF -> spec -> ticket -> commit. Every gate
// must prove it FAILS on a real violation and stays quiet on a clean repo (decision 0005).
// Run: node checks/check-trace.test.mjs

import assert from 'node:assert/strict';
import { checkCommitMessage } from './check.mjs';
import { fixture, expectClean, expectFail, ticketManifest, tally, report } from './check-fixture.mjs';

expectFail('tickets', ({ put }) => { // invalid status value
  put('docs/README.md', ticketManifest);
  put('docs/specs/001-demo/tickets/01-a.md',
    '# 01: A\n\n- **Blocked by:** none\n- **Status:** shipped\n\n**What to build:** demo.\n');
});

expectFail('tickets', ({ put }) => { // Blocked-by names a missing sibling
  put('docs/README.md', ticketManifest);
  put('docs/specs/001-demo/tickets/01-a.md',
    '# 01: A\n\n- **Blocked by:** 99-ghost\n- **Status:** ready\n\n**What to build:** demo.\n');
});

expectFail('tickets', ({ put }) => { // no Status line at all
  put('docs/README.md', ticketManifest);
  put('docs/specs/001-demo/tickets/01-a.md', '# 01: A\n\n- **Blocked by:** none\n\n**What to build:** demo.\n');
});

expectFail('tickets', ({ put }) => { // no What to build line
  put('docs/README.md', ticketManifest);
  put('docs/specs/001-demo/tickets/01-a.md', '# 01: A\n\n- **Blocked by:** none\n- **Status:** ready\n');
});

expectClean('tickets-valid', ({ put }) => {
  put('docs/README.md', ticketManifest);
  put('docs/specs/001-demo/tickets/01-a.md',
    '# 01: A\n\n- **Blocked by:** none\n- **Status:** done\n- **Traces to:** BRIEF SC-1\n\n**What to build:** demo.\n');
  put('docs/specs/001-demo/tickets/02-b.md',
    '# 02: B\n\n- **Blocked by:** 01-a\n- **Status:** ready <!-- ready | building | done -->\n- **Traces to:** BRIEF SC-2\n\n**What to build:** demo.\n');
});

expectFail('tickets', ({ put }) => { // Traces to left on the template placeholder
  put('docs/README.md', ticketManifest);
  put('docs/specs/001-demo/tickets/01-a.md',
    '# 01: A\n\n- **Blocked by:** none\n- **Status:** ready\n- **Traces to:** BRIEF SC-<n>\n\n**What to build:** demo.\n');
});

// A spec that names no scope item makes the progress overview count that item as not started
// while the work is happening (checks/progress.mjs). Silent miscounting is the failure to gate.
expectFail('spec-traces', ({ put }) => { // no Traces to line at all
  put('docs/README.md', ticketManifest);
  put('docs/specs/001-demo/spec.md', '# 001: demo\n\n- **Status:** building\n');
});

expectFail('spec-traces', ({ put }) => { // Traces to left unfilled
  put('docs/README.md', ticketManifest);
  put('docs/specs/001-demo/spec.md', '# 001: demo\n\n- **Status:** building\n- **Traces to:** TBD\n');
});

expectClean('spec-traces-valid', ({ put }) => {
  put('docs/README.md', ticketManifest);
  put('docs/specs/001-demo/spec.md', '# 001: demo\n\n- **Status:** building\n- **Traces to:** BRIEF SC-2\n');
  put('docs/specs/archive/000-old/spec.md', '# 000: old\n\n- **Status:** done\n');
});

// Once the brief defines scope, an SC-id becomes checkable. An invented or typo'd id reads as
// a trace while tracing nowhere, so it passes the eye and fails the rule.
const scopedManifest = `${ticketManifest}| \`product/BRIEF.md\` | LIVE | brief |\n`;
const BRIEF_SC1 = '# BRIEF\n\n## In scope\n\n- SC-1 the one real scope item\n';

expectFail('spec-traces', ({ put }) => { // spec names an SC-item the brief does not define
  put('docs/README.md', scopedManifest);
  put('docs/product/BRIEF.md', BRIEF_SC1);
  put('docs/specs/001-demo/spec.md', '# 001: demo\n\n- **Status:** building\n- **Traces to:** BRIEF SC-9\n');
});

expectFail('tickets', ({ put }) => { // ticket names an SC-item the brief does not define
  put('docs/README.md', scopedManifest);
  put('docs/product/BRIEF.md', BRIEF_SC1);
  put('docs/specs/001-demo/spec.md', '# 001: demo\n\n- **Status:** building\n- **Traces to:** BRIEF SC-1\n');
  put('docs/specs/001-demo/tickets/01-a.md',
    '# 01: A\n\n- **Blocked by:** none\n- **Status:** ready\n- **Traces to:** BRIEF SC-9\n\n**What to build:** demo.\n');
});

expectClean('spec-traces-known-id', ({ put }) => {
  put('docs/README.md', scopedManifest);
  put('docs/product/BRIEF.md', BRIEF_SC1);
  put('docs/specs/001-demo/spec.md', '# 001: demo\n\n- **Status:** building\n- **Traces to:** BRIEF SC-1\n');
});

// AGENTS.md allows tracing to an explicit request instead of an SC-item, so a line that names
// no id at all must stay clean: this gate checks ids, it does not force specs to carry one.
expectClean('spec-traces-explicit-request', ({ put }) => {
  put('docs/README.md', scopedManifest);
  put('docs/product/BRIEF.md', BRIEF_SC1);
  put('docs/specs/001-demo/spec.md', '# 001: demo\n\n- **Status:** building\n- **Traces to:** explicit request from the owner, 2026-07-20\n');
});

// progress.mjs counts a single .md sitting directly in docs/specs/ as a spec (specFiles), so
// the trace gate covers that shape too: a spec that counts toward progress but escapes the
// gate could steer work while naming no scope item.
expectFail('spec-traces', ({ put }) => { // single-file spec, no trace
  put('docs/README.md', ticketManifest);
  put('docs/specs/002-single.md', '# 002: single-file spec\n\n- **Status:** building\n');
});

expectClean('spec-traces-single-file-valid', ({ put }) => {
  put('docs/README.md', ticketManifest);
  put('docs/specs/002-single.md', '# 002: single\n\n- **Status:** building\n- **Traces to:** explicit request from the owner, 2026-07-22\n');
});

expectClean('spec-traces-templates-skipped', ({ put }) => { // the shipped templates sit directly in docs/specs/ with placeholder traces
  put('docs/README.md', ticketManifest);
  put('docs/specs/TEMPLATE.md', '# spec template\n\n- **Traces to:** BRIEF SC-<n> / explicit request: <link or quote>\n');
});

expectClean('tickets-archive-skipped', ({ put }) => {
  put('docs/README.md', ticketManifest);
  put('docs/specs/archive/001-old/tickets/01-a.md', '# 01: A\n\n- **Status:** shipped\n');
});

// --- commit-trace: the trailer that carries the trace into the shipped history ---
// Same two directions as every gate above: it must block a commit that names no scope item,
// and stay silent on the shapes git composes itself.
const SCOPED = new Set(['SC-1']);

function expectMsgFail(label, message, known = SCOPED, check = null) {
  const found = checkCommitMessage(message, known);
  try {
    assert.ok(found.length, `expected "${label}" to be blocked, but it passed`);
    // Pin the failing check when named, so a case cannot silently pass for another reason.
    if (check) assert.ok(found.some((f) => f.check === check), `expected "${label}" to fail on ${check}, got: ${JSON.stringify(found)}`);
    tally.passed++;
  } catch (e) { tally.failed.push(`${label}: ${e.message}`); }
}

function expectMsgClean(label, message, known = SCOPED) {
  const found = checkCommitMessage(message, known);
  try {
    assert.equal(found.length, 0, `"${label}" should pass, got: ${JSON.stringify(found)}`);
    tally.passed++;
  } catch (e) { tally.failed.push(`${label}: ${e.message}`); }
}

expectMsgFail('commit-trace-missing', 'feat(checks): add a thing\n\nA body that explains why.\n');
expectMsgFail('commit-trace-empty', 'feat(checks): add a thing\n\nTraces-to:\n');
expectMsgFail('commit-trace-placeholder', 'feat(checks): add a thing\n\nTraces-to: <SC-id>\n');
expectMsgFail('commit-trace-tbd', 'feat(checks): add a thing\n\nTraces-to: TBD\n');
expectMsgFail('commit-trace-unknown-id', 'feat(checks): add a thing\n\nTraces-to: SC-99\n');
// git strips its own comments, so a trailer that only exists in the template help text is absent.
expectMsgFail('commit-trace-commented-out', 'feat(checks): add a thing\n\n# Traces-to: SC-1\n');

// Git reads only the final block as trailers. A trace anywhere else is invisible to
// `git log --format='%(trailers:key=Traces-to)'`, so a gate that accepted it would report green
// while producing nothing. These four are the shapes that actually shipped that bug once.
expectMsgFail('commit-trace-footer-after', 'feat(x): y\n\nTraces-to: SC-1\n\nGenerated with a tool\n');
expectMsgFail('commit-trace-prose-after', 'feat(x): y\n\nTraces-to: SC-1\n\nOne more thought.\n');
expectMsgFail('commit-trace-value-wrapped', 'feat(x): y\n\nTraces-to: explicit request: a value that\nwrapped onto a second line\n');
expectMsgClean('commit-trace-footer-before', 'feat(x): y\n\nbody\n\nGenerated with a tool\n\nTraces-to: SC-1\n');

expectMsgClean('commit-trace-sc-id', 'feat(checks): add a thing\n\nWhy it changed.\n\nTraces-to: SC-1\n');
expectMsgClean('commit-trace-two-ids', 'feat(checks): add a thing\n\nTraces-to: SC-1, SC-1\n');
// AGENTS.md allows tracing to an explicit request, so a trace naming no id is a valid trace.
expectMsgClean('commit-trace-explicit-request', 'fix(docs): reword\n\nTraces-to: explicit request: owner asked in session\n');
expectMsgClean('commit-trace-before-coauthor', 'feat(x): y\n\nTraces-to: SC-1\nCo-Authored-By: A B <a@b.c>\n');
// Composed by git, not authored: a merge has no scope item of its own, a revert names the sha
// it undoes, and an autosquash message is replaced when the rebase runs.
expectMsgClean('commit-trace-merge', 'Merge branch \'main\' into feat/x\n');
expectMsgClean('commit-trace-revert', 'Revert "feat(x): y"\n\nThis reverts commit abc1234.\n');
expectMsgClean('commit-trace-fixup', 'fixup! feat(x): y\n');
// A fresh copy has no scope written down yet and must not be blocked for it, exactly as
// spec-traces and tickets already behave. The trailer is still required; only the id is unchecked.
expectMsgClean('commit-trace-unscoped-brief', 'feat(x): y\n\nTraces-to: SC-99\n', null);
expectMsgFail('commit-trace-unscoped-still-needs-trailer', 'feat(x): y\n\nno trailer here\n', null);

// --- commit-subject: the Conventional Commit shape GLOBAL.md mandates ---
// Format only, on the same parsed subject and the same git-composed exemptions as commit-trace
// (the merge/revert/fixup cases above prove the exemptions for both checks). The type list stays
// open: GLOBAL.md's own list ends in "...", and v1.0.0 allows types beyond feat and fix.
expectMsgFail('commit-subject-no-type', 'Add a thing\n\nTraces-to: SC-1\n', SCOPED, 'commit-subject');
expectMsgFail('commit-subject-uppercase-type', 'Feat(checks): add a thing\n\nTraces-to: SC-1\n', SCOPED, 'commit-subject');
expectMsgFail('commit-subject-colon-missing', 'feat add a thing\n\nTraces-to: SC-1\n', SCOPED, 'commit-subject');
expectMsgFail('commit-subject-space-missing', 'feat:add a thing\n\nTraces-to: SC-1\n', SCOPED, 'commit-subject');
expectMsgFail('commit-subject-space-before-colon', 'feat : add a thing\n\nTraces-to: SC-1\n', SCOPED, 'commit-subject');
expectMsgFail('commit-subject-empty-description', 'feat(checks): \n\nTraces-to: SC-1\n', SCOPED, 'commit-subject');
expectMsgFail('commit-subject-empty-scope', 'feat(): add a thing\n\nTraces-to: SC-1\n', SCOPED, 'commit-subject');
expectMsgFail('commit-subject-blank-scope', 'feat( ): add a thing\n\nTraces-to: SC-1\n', SCOPED, 'commit-subject');
expectMsgClean('commit-subject-bare-type', 'chore: tidy the hook comments\n\nTraces-to: SC-1\n');
expectMsgClean('commit-subject-breaking', 'feat(api)!: drop the v1 routes\n\nTraces-to: SC-1\n');
expectMsgClean('commit-subject-slash-scope', 'docs(state/log): rotate the July log\n\nTraces-to: SC-1\n');

report('trace-chain');
