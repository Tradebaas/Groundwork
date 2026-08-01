// The trace chain, in one file: BRIEF -> spec -> ticket -> commit. Four artifacts carry the same
// "Traces to:" fact, so one reading of "filled in" and one reading of "which SC-ids does this
// name" serve all four, and the gates cannot drift apart as they are edited.
// Part of checks/check.mjs, which composes these gates into its registry and owns the run.

import { existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { isSpecPath } from './progress.mjs';

// The value half of a trace, shared by the three artifacts that carry one: spec files, ticket
// files, and commit messages.
const traceValue = (line) => (line || '').replace(/<!--[\s\S]*$/, '').trim();
const traceFilled = (line) => {
  const v = traceValue(line);
  return Boolean(v) && !v.includes('<') && !/^TBD\b/i.test(v);
};
const traceUnknownIds = (line, known) => {
  if (!known) return [];
  const named = new Set([...traceValue(line).matchAll(/SC-\d+/g)].map((m) => m[0]));
  return [...named].filter((id) => !known.has(id));
};

const traceLine = (body) => (body.match(/^- \*\*Traces to:\*\*\s*(.+)$/m) || [])[1];

// A filled-in "Traces to:" line: present, and not still carrying the template's placeholders.
function tracesTo(body) {
  return traceFilled(traceLine(body));
}

// SC-ids named in a "Traces to:" line that the brief does not define. A typo'd or invented id
// reads as a trace while tracing nowhere, which is exactly what "no trace, no build" forbids.
// Work may also trace to an explicit request instead, so a line naming no SC-id is left alone.
function unknownScopeIds(body, known) {
  return traceUnknownIds(traceLine(body), known);
}

// The commit message is the only artifact that survives into the shipped history, so the trace
// has to be on it: given a sha, the SC-id resolves back through the brief to the requirement it
// served. Without this the chain runs BRIEF -> spec -> ticket and then goes dark, and no
// system-generated list of "what changed, serving what" can be produced after the fact.
export function checkCommitMessage(message, known) {
  const failures = [];
  const fail = (check, msg) => failures.push({ check, msg });
  // git strips its own comment lines before storing the message; strip them here too, so a
  // commented-out example trailer in a template cannot satisfy the gate.
  const body = message.replace(/\r\n/g, '\n').split('\n').filter((l) => !l.startsWith('#')).join('\n');
  const subject = body.trim().split('\n')[0] || '';

  // Not authored units of work: git composes merge and revert subjects itself (a revert names
  // the sha it undoes, which is already a trace), and autosquash messages are replaced on rebase.
  if (!subject) return failures;
  if (/^(Merge|Revert) /.test(subject) || /^(fixup|squash)! /.test(subject)) return failures;

  // GLOBAL.md mandates Conventional Commits v1.0.0; this is the mechanical shape of that
  // mandate: lowercase type, optional (scope), optional ! for a breaking change, then ": "
  // and a description. v1.0.0 itself reads types case-insensitively; this repo canonicalizes
  // on lowercase, as GLOBAL.md's examples do. The type list stays open on purpose (GLOBAL.md's
  // list ends in "...", and v1.0.0 allows types beyond feat and fix); imperative mood and
  // "scoped small" need judgment and stay with review.
  if (!/^[a-z]+(\([^\s()]+\))?!?: \S/.test(subject)) {
    fail('commit-subject', `subject "${subject}" is not a Conventional Commit. Shape: "type(scope): what changed", e.g. "fix(checks): reject empty scopes" - lowercase type (feat, fix, docs, chore, ...), scope optional, "!" before ":" for a breaking change.`);
  }

  // Git decides what a trailer is: the last block of the message, on one line, with nothing but
  // trailers after it. Matching the key anywhere in the text instead would pass a message whose
  // trailer `git log --format='%(trailers:key=Traces-to)'` cannot read, leaving the gate green
  // and the artifact it exists to produce empty. Use the reader's own parser, so the two cannot
  // disagree. Git missing or failing here raises, and a crashed gate is a failed gate.
  const parsed = execSync('git interpret-trailers --parse', { input: body, encoding: 'utf8' });
  const entry = parsed.split('\n').find((t) => /^Traces-to:/i.test(t));
  if (entry === undefined) {
    fail('commit-trace', 'missing "Traces-to:" trailer. The LAST block of the message must be trailers only, with the trace on one line: "Traces-to: SC-3", or "Traces-to: explicit request: <what was asked>". A line of prose (or a footer) after it puts the trace outside the block and git stops reading it as a trailer.');
    return failures;
  }
  const line = entry.replace(/^Traces-to:[ \t]*/i, '');
  if (!traceFilled(line)) {
    fail('commit-trace', '"Traces-to:" is empty or still a placeholder: a trailer that names nothing traces nowhere.');
  }
  for (const id of traceUnknownIds(line, known)) {
    fail('commit-trace', `Traces-to names ${id}, which BRIEF.md does not define. Fix the id, or run \`scope\` to put the item in the brief first.`);
  }
  return failures;
}

// The two file gates of the chain. The runner supplies what it already read once: the tree, the
// SC-ids the brief defines, and its own readers, so nothing here walks the repo a second time.
export const traceChecks = ({ root, tree, known, fail, read, rel }) => ({
  'tickets'() {
    // Ticket files carry the build frontier (spec skill, docs/specs/TEMPLATE-TICKET.md). A
    // typo'd status or a Blocked-by naming a missing sibling silently corrupts the frontier
    // rule, so the machine-read fields are gated. Archived specs are history, not live work.
    const STATUSES = ['ready', 'building', 'done'];
    for (const f of tree.files) {
      const r = rel(root, f);
      if (!/^docs\/specs\/.+\/tickets\/[^/]+\.md$/.test(r) || r.startsWith('docs/specs/archive/')) continue;
      const body = read(f);
      const status = (body.match(/^- \*\*Status:\*\*\s*(\S+)/m) || [])[1];
      if (!status) fail(`${r}: missing "- **Status:**" line (${STATUSES.join(' | ')}).`);
      else if (!STATUSES.includes(status)) fail(`${r}: status "${status}" is not one of ${STATUSES.join(' | ')}.`);
      const blocked = (body.match(/^- \*\*Blocked by:\*\*\s*(.+)$/m) || [])[1]?.trim();
      if (!blocked) fail(`${r}: missing "- **Blocked by:**" line (sibling ticket names, or "none").`);
      else if (blocked !== 'none') {
        for (const entry of blocked.split(',').map((s) => s.trim()).filter(Boolean)) {
          const sibling = join(dirname(f), entry.endsWith('.md') ? entry : `${entry}.md`);
          if (!existsSync(sibling)) fail(`${r}: Blocked-by "${entry}" names no sibling ticket file.`);
        }
      }
      if (!/^\*\*What to build:\*\*/m.test(body)) {
        fail(`${r}: missing "**What to build:**" line: a ticket without behavior is not buildable.`);
      }
      if (!tracesTo(body)) {
        fail(`${r}: missing or unfilled "- **Traces to:**" line: work that names no scope item cannot be attributed to one.`);
      }
      for (const id of unknownScopeIds(body, known)) {
        fail(`${r}: Traces-to names ${id}, which BRIEF.md does not define. Fix the id, or run \`scope\` to put the item in the brief first.`);
      }
    }
  },

  'spec-traces'() {
    // A spec that does not name the scope item it serves breaks two things at once: the
    // AGENTS.md rule "no trace, no build", and the progress overview, which then reports the
    // scope item as not started while the work is happening. A silently wrong count is worse
    // than no count, so this is a gate rather than a note. Archived specs are history.
    for (const f of tree.files) {
      const r = rel(root, f);
      // What counts as a spec file is progress.mjs's isSpecPath: one definition, so the
      // counted set and the gated set cannot drift apart. Two deliberate differences remain:
      // archived specs are history (skipped here), and *.local.md files never reach this
      // loop at all (dropped from tree.files above): personal specs are counted, never gated.
      if (!isSpecPath(r) || r.startsWith('docs/specs/archive/')) continue;
      const body = read(f);
      if (!tracesTo(body)) {
        fail(`${r}: missing or unfilled "- **Traces to:**" line. Name the BRIEF SC-item this change serves, or the explicit request it answers (run \`scope\` first if neither exists).`);
      }
      for (const id of unknownScopeIds(body, known)) {
        fail(`${r}: Traces-to names ${id}, which BRIEF.md does not define. Fix the id, or run \`scope\` to put the item in the brief first.`);
      }
    }
  },
});
