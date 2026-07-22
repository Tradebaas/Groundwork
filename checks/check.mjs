#!/usr/bin/env node
// Groundwork checks: zero-token enforcement of repo hygiene.
// Run: node checks/check.mjs        (also wired as pre-commit hook and CI stage)
//      node checks/check.mjs --install-hooks
// Every rule here is deterministic. Rules that need judgment live in skills, not here.
// A check that crashes counts as FAILED: a silent gate is worse than none (decision 0005).
// Self-test: node checks/check.test.mjs (every check must prove it fails on a violation).

import {
  readFileSync, readdirSync, existsSync, readlinkSync, chmodSync,
} from 'node:fs';
import { execSync } from 'node:child_process';
import { join, dirname, resolve, relative, extname, isAbsolute, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
// The brief is parsed in exactly one place; the progress overview already owns that reading.
import { parseBrief, isSpecPath } from './progress.mjs';

const TEXT_EXT = new Set([
  '.md', '.json', '.yml', '.yaml', '.txt', '.toml', '.xml', '.svg', '.html', '.css',
  '.js', '.mjs', '.cjs', '.ts', '.tsx', '.jsx', '.sh', '.py', '.cs', '.java', '.go',
  '.rb', '.swift', '.kt', '.php', '.sql', '.env', '.rs', '.c', '.cpp', '.h', '.hpp',
  '.dart', '.vue', '.svelte', '.scala', '.ex', '.exs', '.tf', '.lua', '.ps1',
]);
const CODE_EXT = new Set([
  '.js', '.mjs', '.cjs', '.ts', '.tsx', '.jsx', '.py', '.cs', '.java', '.go', '.rb',
  '.swift', '.kt', '.php', '.rs', '.c', '.cpp', '.h', '.hpp', '.dart', '.scala',
  '.ex', '.exs', '.lua',
]);
const SKIP_DIRS = new Set(['.git', 'node_modules', 'dist', 'build', 'coverage', '.next']);

function walk(root, dir = root, out = { files: [], dirs: [] }) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isSymbolicLink()) continue;
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      out.dirs.push(full);
      walk(root, full, out);
    } else {
      out.files.push(full);
    }
  }
  return out;
}

// CRLF checkouts must not break any check (.gitattributes forces LF, this is the backstop).
const read = (p) => readFileSync(p, 'utf8').replace(/\r\n/g, '\n');
const lines = (p) => read(p).split('\n');
const rel = (root, p) => relative(root, p).split('\\').join('/');

function globToRegex(glob) {
  // Supports **, *, and [...] classes; everything else is literal.
  let re = '';
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i];
    if (c === '*') {
      if (glob[i + 1] === '*') { re += '.*'; i++; } else re += '[^/]*';
    } else if (c === '[') {
      const end = glob.indexOf(']', i);
      if (end === -1) { re += '\\['; continue; }
      re += glob.slice(i, end + 1);
      i = end;
    } else {
      re += c.replace(/[.+?^${}()|\\]/g, '\\$&');
    }
  }
  return new RegExp(`^${re}$`);
}

// The value half of a trace, shared by the three artifacts that carry one: spec files, ticket
// files, and commit messages. One reading of "filled in" and one reading of "which SC-ids does
// this name", so the three gates cannot drift apart as they are edited.
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

// The SC-ids the brief actually defines, or null when scope is not written down yet. A project
// that has not run `scope` has nothing to validate against and must not be blocked for it.
function scopeIds(root) {
  const p = join(root, 'docs', 'product', 'BRIEF.md');
  if (!existsSync(p)) return null;
  const { items } = parseBrief(read(p));
  return items.length ? new Set(items.map((i) => i.id)) : null;
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

export function runChecks(root) {
  const failures = [];
  const cfg = JSON.parse(read(join(root, 'checks', 'config.json')));
  for (const e of cfg.extraTextExtensions || []) TEXT_EXT.add(e);
  for (const e of cfg.extraCodeExtensions || []) CODE_EXT.add(e);
  const known = scopeIds(root);
  const tree = walk(root);
  // *.local.md is personal, never shared (.gitignore). The checks walk the working tree, not the
  // git index, so without this they would gate gitignored files: a maintainer's CLAUDE.local.md or
  // STATE.local.md could fail the pre-commit hook. Drop them from every file-based check.
  tree.files = tree.files.filter((f) => !basename(f).endsWith('.local.md'));
  const textFiles = tree.files.filter((f) => TEXT_EXT.has(extname(f)) || f.endsWith('.gitignore'));

  const checks = {
    'budget-agents'() {
      const n = lines(join(root, 'AGENTS.md')).length;
      if (n > cfg.budgets.agentsMdLines) {
        fail(`AGENTS.md is ${n} lines (budget ${cfg.budgets.agentsMdLines}). Every line must earn its place: move detail into a skill or docs/.`);
      }
    },

    'agent-file-cap'() {
      // Hard ceiling for EVERY AGENTS.md / CLAUDE.md anywhere in the tree, including products
      // built on Groundwork: past this length an agent rulebook stops being loaded in full, so
      // it silently stops governing. The root AGENTS.md has a stricter budget (budget-agents);
      // this is the universal backstop. Older configs without the key fall back to 200.
      const cap = cfg.budgets.agentFileHardCapLines ?? 200;
      for (const f of tree.files) {
        const base = basename(f);
        if (base !== 'AGENTS.md' && base !== 'CLAUDE.md') continue;
        const n = lines(f).length;
        if (n > cap) {
          fail(`${rel(root, f)} is ${n} lines (hard cap ${cap}): an AGENTS.md/CLAUDE.md past ${cap} lines stops being read in full. Move detail into a skill or docs/.`);
        }
      }
    },

    'bridge-claude'() {
      const body = read(join(root, 'CLAUDE.md')).trim();
      if (body !== '@AGENTS.md') {
        fail('CLAUDE.md must contain exactly "@AGENTS.md". Rules belong in AGENTS.md, one rulebook (decision 0001).');
      }
    },

    'bridge-gemini'() {
      const p = join(root, '.gemini', 'settings.json');
      if (!existsSync(p) || !JSON.stringify(JSON.parse(read(p))).includes('AGENTS.md')) {
        fail('.gemini/settings.json must point context at AGENTS.md (decision 0001).');
      }
    },

    'docs-manifest'() {
      const tableRows = read(join(root, 'docs', 'README.md')).split('\n')
        .filter((l) => l.trimStart().startsWith('|'));
      const listed = tableRows.flatMap((l) => [...l.matchAll(/`([^`]+)`/g)].map((m) => m[1]))
        .filter((p) => !p.includes(' ') && (p.includes('/') || p.includes('.')));
      const literals = new Set(listed.filter((p) => !/[*[]/.test(p)));
      const patterns = listed.filter((p) => /[*[]/.test(p)).map(globToRegex);
      for (const f of tree.files) {
        const r = rel(root, f);
        if (!r.startsWith('docs/') || r === 'docs/README.md' || r.endsWith('.gitkeep')) continue;
        const inDocs = r.slice('docs/'.length);
        if (!literals.has(inDocs) && !patterns.some((re) => re.test(inDocs))) {
          fail(`${r} is not listed in docs/README.md: every docs file needs a manifest row.`);
        }
      }
    },

    'links'() {
      const mdFiles = tree.files.filter((f) => f.endsWith('.md'));
      for (const f of mdFiles) {
        const prose = read(f).replace(/```[\s\S]*?```/g, '');
        for (const m of prose.matchAll(/\[[^\]]*\]\(([^)\s]+)\)/g)) {
          const target = m[1].split('#')[0];
          if (!target || /^(https?:|mailto:)/.test(target) || isAbsolute(target)) continue;
          if (!existsSync(resolve(dirname(f), decodeURI(target)))) {
            fail(`${rel(root, f)}: broken link to ${m[1]}`);
          }
        }
      }
    },

    'denylist'() {
      const entries = (cfg.denylist || []).map((e) => ({ ...e, re: new RegExp(e.pattern, 'i') }));
      if (!entries.length) return;
      for (const f of textFiles) {
        const r = rel(root, f);
        if (r.startsWith('checks/') || r.startsWith('docs/specs/archive/')
          || r.startsWith('docs/state/log/') || r.startsWith('docs/decisions/')) continue;
        const content = lines(f);
        for (const e of entries) {
          if ((e.exclude || []).some((x) => r.includes(x))) continue;
          content.forEach((line, i) => {
            if (e.re.test(line)) fail(`${r}:${i + 1} matches retired fact /${e.pattern}/: ${e.why}`);
          });
        }
      }
    },

    'prose-style'() {
      // AI-tell typography that may never appear in any text (AGENTS.md Language rule, decision 0008).
      // Deterministic characters only; judgment tells (cliche phrasing) live in VOICE.md + design-guard.
      // checks:allow-style on a line is the escape hatch (e.g. a spec quoting source text verbatim).
      const chars = [
        ['—', 'em dash', 'rewrite with a period, comma, colon, or parentheses'],
        ['–', 'en dash', 'use a hyphen, or "to" for a number range'],
        ['…', 'ellipsis character', 'type three periods (...)'],
        ['‘', 'curly quote', 'use a straight quote'],
        ['’', 'curly quote', 'use a straight quote'],
        ['“', 'curly quote', 'use a straight quote'],
        ['”', 'curly quote', 'use a straight quote'],
      ];
      const phrases = (cfg.styleBans || []).map((e) => ({ ...e, re: new RegExp(e.pattern, 'i') }));
      // The phrase bans skip the files that legitimately name the tells (VOICE.md defines them,
      // decision records and archives may quote them), same idiom as the denylist. Typography is
      // banned everywhere but checks/, which must hold the literal characters to detect them.
      const phraseSkip = (r) => r.startsWith('checks/') || r.startsWith('docs/decisions/')
        || r.startsWith('docs/specs/archive/') || r.startsWith('docs/state/log/')
        || r === 'docs/design/VOICE.md';
      for (const f of textFiles) {
        const r = rel(root, f);
        if (r.startsWith('checks/')) continue;
        const scanPhrases = !phraseSkip(r);
        lines(f).forEach((line, i) => {
          if (line.includes('checks:allow-style')) return;
          for (const [ch, what, fix] of chars) {
            if (line.includes(ch)) {
              fail(`${r}:${i + 1} contains a ${what}: ${fix}. Deliberate (quoting source text)? Append "checks:allow-style" to that line.`);
            }
          }
          if (scanPhrases) {
            for (const e of phrases) {
              if (e.re.test(line)) fail(`${r}:${i + 1} reads as AI boilerplate (/${e.pattern}/): ${e.why}`);
            }
          }
        });
      }
    },

    'state-file'() {
      const p = join(root, 'docs', 'state', 'STATE.md');
      const body = read(p);
      const n = body.split('\n').length;
      if (n > cfg.budgets.stateMdLines) {
        fail(`STATE.md is ${n} lines (budget ${cfg.budgets.stateMdLines}): rotate old log entries to docs/state/log/.`);
      }
      if (!body.includes('## Handoff')) fail('STATE.md is missing its "## Handoff" block.');
      if (!body.includes('Now ▶')) fail('STATE.md is missing its "Now ▶" line: the single next step.');
    },

    'skills'() {
      const skillsDir = join(root, '.agents', 'skills');
      const agents = read(join(root, 'AGENTS.md'));
      for (const entry of readdirSync(skillsDir, { withFileTypes: true })) {
        if (!entry.isDirectory()) continue;
        const p = join(skillsDir, entry.name, 'SKILL.md');
        if (!existsSync(p)) { fail(`skill "${entry.name}" has no SKILL.md`); continue; }
        const body = read(p);
        const fm = body.match(/^---\n([\s\S]*?)\n---/);
        if (!fm) { fail(`skill "${entry.name}": SKILL.md has no frontmatter`); continue; }
        const name = (fm[1].match(/^name:\s*(.+)$/m) || [])[1]?.trim();
        const desc = (fm[1].match(/^description:\s*(.+)$/m) || [])[1]?.trim();
        if (name !== entry.name) fail(`skill "${entry.name}": frontmatter name "${name}" must equal the directory name`);
        if (name && !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(name)) fail(`skill "${entry.name}": name must be lowercase-hyphenated`);
        if (!desc) fail(`skill "${entry.name}": description is required (it is the load trigger)`);
        else if (desc.length > cfg.budgets.skillDescriptionChars) fail(`skill "${entry.name}": description exceeds ${cfg.budgets.skillDescriptionChars} chars`);
        const bodyLines = body.split('\n').length;
        if (bodyLines > cfg.budgets.skillMdLines) fail(`skill "${entry.name}": ${bodyLines} lines (budget ${cfg.budgets.skillMdLines}): move reference material to files next to SKILL.md`);
        if (!agents.includes(`\`${entry.name}\``)) fail(`skill "${entry.name}" is not registered in the AGENTS.md skills table`);
      }
    },

    'skills-symlink'() {
      if (cfg.skipSymlinkCheck) return;
      const p = join(root, '.claude', 'skills');
      try {
        if (readlinkSync(p).split('\\').join('/').replace(/\/+$/, '') !== '../.agents/skills') {
          fail('.claude/skills must be a symlink to ../.agents/skills (decision 0002).');
        }
      } catch {
        fail('.claude/skills symlink is missing or not a symlink. Run: ln -sfn ../.agents/skills .claude/skills. No symlink support (Windows without Developer Mode)? Set "skipSymlinkCheck": true in checks/config.json and point your tool at .agents/skills directly.');
      }
    },

    'secrets'() {
      const patterns = [
        [/-----BEGIN (RSA |EC |OPENSSH |PGP )?PRIVATE KEY(?: BLOCK)?-----/, 'private key material'],
        [/\bAKIA[0-9A-Z]{16}\b/, 'AWS access key id'],
        [/\beyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}\b/, 'JWT'],
        [/\b(api[_-]?key|client[_-]?secret|password|auth[_-]?token)\b["']?\s*[:=]\s*["'][^"'\s]{16,}["']/i, 'hardcoded credential'],
      ];
      for (const f of textFiles) {
        const r = rel(root, f);
        if ((cfg.secretScanExclude || []).some((x) => r.startsWith(x) || r.endsWith(x))) continue;
        lines(f).forEach((line, i) => {
          if (line.includes('checks:allow-secret')) return;
          for (const [re, what] of patterns) {
            if (re.test(line)) fail(`${r}:${i + 1} looks like a ${what}. Real secret? Rotate it NOW, then use the environment. False positive (an example string)? Append "checks:allow-secret" to that line.`);
          }
        });
      }
    },

    'defer-markers'() {
      for (const f of textFiles) {
        const r = rel(root, f);
        if (r.startsWith('checks/')) continue;
        const content = lines(f);
        content.forEach((line, i) => {
          // A wrapped marker may carry its trigger on the next line or two.
          const vicinity = content.slice(i, i + 3).join(' ');
          if (/(\/\/|#|<!--)\s*defer:/i.test(line) && !/upgrade-when:/i.test(vicinity)) {
            fail(`${r}:${i + 1} defer: marker without "upgrade-when:": untriggered deferrals rot silently (AGENTS.md format).`);
          }
        });
      }
    },

    'zombie-code'() {
      const looksLikeCode = /^\s*(\/\/|#)\s*(.*[;{}]\s*$|(const|let|var|function|def |import |return |if\s*\(|for\s*\())/;
      for (const f of tree.files.filter((x) => CODE_EXT.has(extname(x)))) {
        const r = rel(root, f);
        if (r.startsWith('checks/')) continue;
        let run = 0;
        lines(f).forEach((line, i) => {
          run = looksLikeCode.test(line) ? run + 1 : 0;
          if (run === 3) fail(`${r}:${i - 1} 3+ consecutive lines of commented-out code: delete it; git remembers.`);
        });
      }
    },

    'code-file-cap'() {
      // A source file past this size stops fitting in one read for a reviewer or an agent, so
      // the gate turns red before the file turns unreadable. Rare legitimate case (generated
      // files, vendored code): a "checks:allow-length: <reason>" line in the file, or a
      // codeFileCapExclude path in config, mirroring the secrets-check exclude discipline.
      // Older configs without the key fall back to 500.
      const cap = cfg.budgets.codeFileMaxLines ?? 500;
      for (const f of tree.files.filter((x) => CODE_EXT.has(extname(x)))) {
        const r = rel(root, f);
        if ((cfg.codeFileCapExclude || []).some((x) => r.startsWith(x) || r.endsWith(x))) continue;
        const content = lines(f);
        if (content.length <= cap) continue;
        const marker = content.find((l) => l.includes('checks:allow-length'));
        if (marker) {
          if (!/checks:allow-length\s*:?\s*\S/.test(marker)) {
            fail(`${r}: checks:allow-length needs a reason (e.g. "checks:allow-length: generated file"), so the exception stays auditable.`);
          }
          continue;
        }
        fail(`${r} is ${content.length} lines (budget ${cap}): split it by responsibility. Generated or vendored? Add "checks:allow-length: <reason>" in the file or a codeFileCapExclude entry in checks/config.json.`);
      }
    },

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

    'empty-dirs'() {
      // A dir with only a .gitkeep is intentionally kept; a truly empty dir is clutter.
      for (const d of tree.dirs) {
        // An empty .claude/ means the skills symlink is gone; skills-symlink owns that repair.
        if (rel(root, d) === '.claude') continue;
        const entries = readdirSync(d);
        if (entries.length === 0 && !(cfg.allowedEmptyDirs || []).includes(rel(root, d))) {
          fail(`${rel(root, d)}/ is empty: delete it, or add a .gitkeep if it must exist.`);
        }
      }
    },
  };

  let current = '';
  const fail = (msg) => failures.push({ check: current, msg });
  for (const [name, fn] of Object.entries(checks)) {
    current = name;
    try {
      fn();
    } catch (e) {
      failures.push({ check: name, msg: `check crashed (${e.message}): a crashed gate is a failed gate.` });
    }
  }
  return failures;
}

export function installHooks(root) {
  // Hooks live versioned in checks/hooks/ so every clone gets them; this only wires the path.
  if (!existsSync(join(root, '.git'))) throw new Error('no .git directory: run git init first');
  for (const hook of ['pre-commit', 'commit-msg']) {
    chmodSync(join(root, 'checks', 'hooks', hook), 0o755);
  }
  execSync('git config core.hooksPath checks/hooks', { cwd: root });
  return 'core.hooksPath -> checks/hooks (re-run after every fresh clone)';
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  if (process.argv.includes('--install-hooks')) {
    console.log(`hooks wired: ${installHooks(root)}`);
    process.exit(0);
  }
  const msgFlag = process.argv.indexOf('--commit-msg');
  if (msgFlag !== -1) {
    const path = process.argv[msgFlag + 1];
    if (!path) {
      console.error('FAIL [commit-msg] --commit-msg needs the path to the message file.');
      process.exit(1);
    }
    const found = checkCommitMessage(read(path), scopeIds(root));
    if (found.length) {
      for (const f of found) console.error(`FAIL [${f.check}] ${f.msg}`);
      console.error('\nThe commit is not lost: git kept your message, fix it and commit again.');
      process.exit(1);
    }
    process.exit(0);
  }
  const failures = runChecks(root);
  if (failures.length) {
    for (const f of failures) console.error(`FAIL [${f.check}] ${f.msg}`);
    console.error(`\n${failures.length} finding(s). Fix the cause; never weaken the gate.`);
    process.exit(1);
  }
  console.log('OK: all checks passed.');
}
