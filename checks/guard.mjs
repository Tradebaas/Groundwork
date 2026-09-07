#!/usr/bin/env node
// The guard: a deterministic no to the handful of shell commands the rulebook forbids or holds for
// the owner's yes, judged before the command runs. AGENTS.md says never bypass a gate, never
// force-push or rewrite history, and that deleting beyond the task, dropping a table or touching
// production waits for the owner. A rule in prose is advisory; a hook is not (decision 0005's
// argument, applied to the agent's own hands). This file is the judgment, vendor-neutral: it reads
// the tool call a harness hands it on stdin (Claude Code's PreToolUse shape, `tool_input.command`),
// or a command given as `--command <text>`, and exits 2 with the reason on stderr to block, 0 to
// let it through. Wired for Claude Code in .claude/settings.json; the same script fits any harness
// with a pre-command hook (Cursor, Gemini CLI, Copilot CLI), which is what keeps the rule from
// degrading silently elsewhere.
//
// What it cannot read is no decision (exit 0). A guard that failed closed on every ordinary
// command would be switched off within the hour, and a switched-off guard is worse than a short
// list that always runs. The list is short on purpose: every rule here names a move the rulebook
// already forbids, judged on one command at a time so two harmless commands cannot add up to a hit.

import { resolve, isAbsolute, sep } from 'node:path';

const FOOT = 'Refused by checks/guard.mjs (AGENTS.md, hard rules). If the owner has said yes, quote their words '
  + 'and let them run it, or take the route the rulebook names.';

// One shell line runs several commands; each is judged on its own.
export const segments = (command) => String(command)
  .split(/\n|;|&&|\|\||\|/).map((s) => s.trim()).filter(Boolean);

// The command-line clients through which a statement reaches a database. Not every client that
// exists, on purpose: the guard is a short list that always runs, and the rule in prose covers
// the rest.
const DB_CLIENT = /(^|\s)(sudo\s+)?(psql|mysql|mariadb|sqlite3|sqlcmd|mongosh|clickhouse-client|duckdb|usql|bq)\b/;

const RULES = [
  {
    name: 'a bypassed gate',
    test: (s) => /\bgit\b.*(--no-verify\b|\bcommit\b.*\s-n\b|core\.hooksPath)/.test(s),
    why: 'Never bypass a gate: a red gate is information, so fix the cause or fix the gate in the open. '
      + 'Hooks are wired by node checks/check.mjs --install-hooks, never by hand.',
  },
  {
    name: 'a rewritten or deleted shared branch',
    test: (s) => /\bgit\b.*\bpush\b.*(\s--force\b|\s-f\b|--force-with-lease\b|--force-if-includes\b|\s--delete\b|\s-d\b|\s\+\S+|\s\S*:\S*$)/.test(s)
      || /\bgit\b.*\b(filter-branch|filter-repo)\b/.test(s),
    why: 'Never force-push, delete a shared branch or rewrite history. Propose it and let the owner run it.',
  },
  {
    name: 'discarded work',
    test: (s) => /\bgit\b.*\breset\b.*--hard\b/.test(s)
      || /\bgit\b.*\bclean\b.*\s-[a-zA-Z]*f/.test(s)
      || /\bgit\b.*\b(checkout|restore)\b(\s+--)?\s+\.\/?\s*$/.test(s),
    why: 'This throws away uncommitted work across the tree, which is irreversible. Name what would be lost and wait for the yes.',
  },
  {
    name: 'a tool with its permission checks switched off',
    test: (s) => /--dangerously-skip-permissions\b|--yolo\b|--trust-all-tools\b|--allow-all\b/.test(s),
    why: 'Never work with a tool\'s permission checks switched off, and never start one that way.',
  },
  {
    // Only where the words reach a database. A search, a read or a script that merely contains
    // them is how the agent finds out where the schema lives, and this rule refused its own
    // author's edit on its first live run for exactly that: the phrase sat inside a heredoc.
    name: 'a destroyed table or database',
    test: (s) => DB_CLIENT.test(s) && /\b(drop\s+(table|database|schema)|truncate\s+table)\b/i.test(s),
    why: 'Dropping or truncating data is irreversible. It waits for the owner\'s yes, and production is reached only through docs/operations/deploy.md.',
  },
];

// A download piped straight into a shell crosses two segments, so it is judged on the whole line.
const PIPED_INSTALL = /\b(curl|wget)\b[^|]*\|\s*(sudo\s+)?(ba|z|da|k)?sh\b/;

// rm with -r: the targets decide. Inside the project, deleting is the agent's ordinary work; the
// root, the home directory, the repository's history, or anything outside the project is not.
function recursiveRemoveOutside(segment, projectDir) {
  const words = segment.replace(/^sudo\s+/, '').split(/\s+/);
  if (words[0] !== 'rm') return null;
  const flags = words.slice(1).filter((w) => w.startsWith('-'));
  const recursive = flags.some((f) => f === '--recursive' || (/^-[a-zA-Z]+$/.test(f) && /[rR]/.test(f)));
  if (!recursive) return null;
  const targets = words.slice(1).filter((w) => !w.startsWith('-')).map((w) => w.replace(/^["']|["']$/g, ''));
  for (const t of targets) {
    if (/^(\/|~|\$HOME|\$\{HOME\}|\*|\.|\.\.|\.\/|\.git|\.git\/)$/.test(t) || /^(~|\$HOME|\$\{HOME\})\//.test(t)) return t;
    if (/(^|\/)\.git\/?$/.test(t)) return t;
    const abs = isAbsolute(t) ? resolve(t) : resolve(projectDir, t);
    const inside = abs === projectDir || abs.startsWith(projectDir + sep);
    if (!inside) return t;
  }
  return null;
}

// The judgment: null lets the command through; otherwise the rule that stops it and why.
export function judge(command, { projectDir = process.cwd() } = {}) {
  const root = resolve(projectDir);
  if (PIPED_INSTALL.test(String(command))) {
    return { rule: 'a download piped into a shell', why: 'Read what you fetched before anything runs it; an installer is a dependency and is recorded like one.' };
  }
  for (const s of segments(command)) {
    for (const r of RULES) {
      if (r.test(s)) return { rule: r.name, why: r.why };
    }
    const target = recursiveRemoveOutside(s, root);
    if (target) {
      return { rule: `a recursive delete of ${target}`, why: 'Deleting beyond the project, or the repository\'s own history, waits for the owner\'s yes. Inside the project, delete the file you mean, not the tree around it.' };
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

if (process.argv[1] && resolve(process.argv[1]) === new URL(import.meta.url).pathname) {
  main().then((code) => process.exit(code), () => process.exit(0));
}
