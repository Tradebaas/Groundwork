#!/usr/bin/env node
// The guard: a deterministic no to the handful of shell commands the rulebook forbids or holds for
// the owner's yes, judged before the command runs. AGENTS.md says never bypass a gate, never
// force-push or rewrite history, and that deleting beyond the task, dropping a table or touching
// production waits for the owner. A rule in prose asks; a hook raises the cost of ignoring it to
// a visible refusal with the rule quoted back. This file is the judgment, vendor-neutral: it reads
// the tool call a harness hands it on stdin (Claude Code's PreToolUse shape, `tool_input.command`),
// or a command given as `--command <text>`, and exits 2 with the reason on stderr to block, 0 to
// let it through. Wired for Claude Code in .claude/settings.json; the same script fits any harness
// with a pre-command hook (Cursor, Gemini CLI, Copilot CLI), which is what keeps the rule from
// degrading silently elsewhere. It judges the shell forms a command can show; a script it cannot
// see into, or a rule with no shell form (weakening a check, touching production), stays prose.
//
// What it cannot read is no decision (exit 0). A guard that failed closed on every ordinary
// command would be switched off within the hour, and a switched-off guard is worse than a short
// list that always runs. The list is short on purpose: every rule here names a move the rulebook
// already forbids, judged on one command at a time so two harmless commands cannot add up to a hit,
// and judged on what the command does rather than on what it says: quoted strings and heredoc
// bodies are text a command carries (a commit message, a document, a payload), never its verb.

import { realpathSync } from 'node:fs';
import { resolve, isAbsolute, sep, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const FOOT = 'Refused by checks/guard.mjs (AGENTS.md, hard rules). If the owner has said yes, quote their words '
  + 'and let them run it, or take the route the rulebook names.';

// One shell line runs several commands; each is judged on its own.
export const segments = (command) => String(command)
  .split(/\n|;|&&|\|\||\|/).map((s) => s.trim()).filter(Boolean);

// The command without the heredoc bodies it feeds to a program: a document being appended, a
// script being run, a payload. Every rule reads this; a body is never the command's own verb.
export function withoutHeredocs(command) {
  const out = [];
  let terminator = null;
  for (const l of String(command).split('\n')) {
    if (terminator !== null) {
      if (l.trim() === terminator) terminator = null;
      continue;
    }
    const here = l.match(/<<-?\s*(['"]?)([A-Za-z_][A-Za-z0-9_]*)\1/);
    if (here) terminator = here[2];
    out.push(l);
  }
  return out.join('\n');
}

// And without the quoted strings too: a commit message, an echoed line, a grep pattern. The
// shape rules read this; the delete and data rules keep the quotes, because a target or a
// statement sits inside them.
export const withoutText = (command) => withoutHeredocs(command)
  .replace(/"(?:[^"\\]|\\.)*"/g, '""').replace(/'[^']*'/g, "''");

// The command-line clients through which a statement reaches a database. Not every client that
// exists, on purpose: the guard is a short list that always runs, and the rule in prose covers
// the rest.
const DB_CLIENT = /(^|\s)(sudo\s+)?(psql|mysql|mariadb|sqlite3|sqlcmd|mongosh|clickhouse-client|duckdb|usql|bq)\b/;

// Judged on the command with its text blanked.
const SHAPE_RULES = [
  {
    name: 'a bypassed gate',
    test: (s) => /\bgit\b.*(--no-verify\b|\bcommit\b.*\s-n\b|core\.hooksPath\s*(=|\s)\s*\S)/.test(s),
    why: 'Never bypass a gate: a red gate is information, so fix the cause or fix the gate in the open. '
      + 'Hooks are wired by node checks/check.mjs --install-hooks, never by hand.',
  },
  {
    name: 'a rewritten or deleted shared branch',
    test: (s) => /\bgit\b.*\bpush\b.*(\s--force\b|\s-f\b|--force-with-lease\b|--force-if-includes\b|\s--delete\b|\s-d\b|\s\+\S+|\s:\S+$)/.test(s)
      || /\bgit\b.*\b(filter-branch|filter-repo)\b/.test(s),
    why: 'Never force-push, delete a shared branch or rewrite history. Propose it and let the owner run it.',
  },
  {
    name: 'discarded work',
    test: (s) => /\bgit\b.*\breset\b.*--hard\b/.test(s)
      || /\bgit\b.*\bclean\b.*(\s-[a-zA-Z]*f|--force\b)/.test(s)
      || /\bgit\b.*\b(checkout|restore)\b.*\s\.\/?\s*$/.test(s),
    why: 'This throws away uncommitted work across the tree, which is irreversible. Name what would be lost and wait for the yes.',
  },
  {
    name: 'a tool with its permission checks switched off',
    test: (s) => /--dangerously-skip-permissions\b|--yolo\b|--trust-all-tools\b|--allow-all\b/.test(s),
    why: 'Never work with a tool\'s permission checks switched off, and never start one that way.',
  },
];

// Judged on the original command: the statement sits inside the quotes, and the client on the
// line is what separates a database from a mention.
const DATA_RULE = {
  name: 'a destroyed table or database',
  test: (s) => /(^|\s)dropdb\b/.test(s)
    || (DB_CLIENT.test(s) && /\b(drop\s+(table|database|schema)|truncate\s+table)\b/i.test(s)),
  why: 'Dropping or truncating data is irreversible. It waits for the owner\'s yes, and production is reached only through docs/operations/deploy.md.',
};

// A download piped straight into a shell crosses two segments, so it is judged on the whole line.
const PIPED_INSTALL = /\b(curl|wget)\b[^|]*\|\s*(sudo(\s+-\S+)*\s+)?(ba|z|da|k)?sh\b/;

// rm with -r: the targets decide. Inside the project, deleting is the agent's ordinary work; the
// project itself, the root, the home directory, the repository's history, a name the shell has
// not expanded yet, or anything outside the project is not.
const WRAPPERS = /^(?:\\|(?:sudo(?:\s+-\S+(?:\s+[^-\s]\S*)?)*|command|env|nice|time)\s+)*/;
function recursiveRemoveOutside(segment, projectDir) {
  const words = segment.replace(WRAPPERS, '').split(/\s+/);
  if (basename(words[0] || '') !== 'rm') return null;
  const flags = words.slice(1).filter((w) => w.startsWith('-'));
  const recursive = flags.some((f) => f === '--recursive' || (/^-[a-zA-Z]+$/.test(f) && /[rR]/.test(f)));
  if (!recursive) return null;
  const targets = words.slice(1).filter((w) => !w.startsWith('-')).map((w) => w.replace(/^["']|["']$/g, ''));
  for (const t of targets) {
    if (!t) continue;
    if (/^(\/|~|\*|\.\/?\*?|\.\.\/?)$/.test(t) || /^(~\/|\$)/.test(t) || /(^|\/)\.git(\/|$)/.test(t)) return t;
    const abs = isAbsolute(t) ? resolve(t) : resolve(projectDir, t);
    if (abs === projectDir || !abs.startsWith(projectDir + sep)) return t;
  }
  return null;
}

// The judgment: null lets the command through; otherwise the rule that stops it and why.
export function judge(command, { projectDir = process.cwd() } = {}) {
  const root = resolve(projectDir);
  const shapes = withoutText(command);
  if (PIPED_INSTALL.test(shapes)) {
    return { rule: 'a download piped into a shell', why: 'Read what you fetched before anything runs it; an installer is a dependency and is recorded like one.' };
  }
  for (const s of segments(shapes)) {
    for (const r of SHAPE_RULES) {
      if (r.test(s)) return { rule: r.name, why: r.why };
    }
  }
  for (const s of segments(withoutHeredocs(command))) {
    if (DATA_RULE.test(s)) return { rule: DATA_RULE.name, why: DATA_RULE.why };
    const target = recursiveRemoveOutside(s, root);
    if (target) {
      return { rule: `a recursive delete of ${target}`, why: 'Deleting the project itself, anything beyond it, or the repository\'s own history waits for the owner\'s yes. Inside the project, delete the file you mean, not the tree around it.' };
    }
  }
  return null;
}

export const reason = (verdict) => `Blocked: ${verdict.rule}. ${verdict.why} ${FOOT}`;

// ---------------------------------------------------------------- the hook

async function readStdin() {
  if (process.stdin.isTTY) return '';
  let text = '';
  for await (const chunk of process.stdin) text += chunk;
  return text;
}

async function main() {
  const at = process.argv.indexOf('--command');
  let command = at > -1 ? process.argv.slice(at + 1).join(' ') : null;
  let cwd = null;
  if (command === null) {
    const raw = await readStdin();
    if (!raw.trim()) return 0;
    let payload;
    try { payload = JSON.parse(raw); } catch { return 0; }
    command = payload?.tool_input?.command;
    cwd = payload?.cwd || null;
    if (typeof command !== 'string') return 0;
  }
  const projectDir = process.env.CLAUDE_PROJECT_DIR || cwd || process.cwd();
  const verdict = judge(command, { projectDir });
  if (!verdict) return 0;
  process.stderr.write(`${reason(verdict)}\n`);
  return 2;
}

// Am I the script being run, or a module being imported? Both sides as real paths: a URL is
// percent-encoded and a path is not, and the path a harness passes may reach this file through a
// symlink (a temp directory on macOS does), so a raw comparison would leave the guard inert, exit
// 0 on everything, from any such project path.
const invokedAs = (() => {
  try { return realpathSync(resolve(process.argv[1] || '')); } catch { return null; }
})();
if (invokedAs && invokedAs === fileURLToPath(import.meta.url)) {
  main().then((code) => process.exit(code), () => process.exit(0));
}
