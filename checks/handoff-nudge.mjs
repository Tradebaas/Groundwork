#!/usr/bin/env node
// Suggest-only handoff reminder, wired as a Stop hook from the Claude adapter (.claude/settings.json)
// alongside the progress line. It reads the turn just finished and, when that turn advises a fresh
// session without a paste-ready prompt, prints one line so the resume steps are never left implicit
// (AGENTS.md efficiency rule; skill `checkpoint` owns the hand-back format). It only ever suggests:
// it never blocks a turn and never errors out, so it cannot get in the way of a session.
//
// The pure decision (needsHandoffNudge) is vendor-neutral and self-tested in check.test.mjs. Only
// the thin transcript reader below is specific to Claude Code's JSONL format; another tool wires
// its own adapter to its own transcript, exactly as the git hooks are per tool.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const ADVISES_CLEAR = [
  /\/clear\b/i,
  /\bverse sessie\b/i,
  /\bfresh session\b/i,
  /\bnieuwe sessie\b/i,
  /\bstart(?:\s+a)?\s+fresh\b/i,
];

// True when a turn tells the user to start a fresh session but hands over no code block. A code
// block present is read as "the resume prompt was given" and stays silent, favouring a missed
// nudge over a false one: a reminder that cries wolf gets switched off (decision 0013).
// defer: any code block suppresses the nudge, even one that holds only steps and not the resume
// prompt. ceiling: a turn that shows commands in a block but omits the paste-ready prompt slips
// through. upgrade-when: that specific miss is observed, then require a block that references STATE.
export function needsHandoffNudge(text) {
  if (typeof text !== 'string' || !text) return false;
  if (text.includes('```')) return false;
  return ADVISES_CLEAR.some((re) => re.test(text));
}

function lastAssistantText(transcriptPath) {
  const lines = readFileSync(transcriptPath, 'utf8').split('\n').filter(Boolean);
  let text = '';
  for (const line of lines) {
    let entry;
    try { entry = JSON.parse(line); } catch { continue; }
    if (entry?.type !== 'assistant' || !entry.message) continue;
    const content = entry.message.content;
    if (typeof content === 'string') text = content;
    else if (Array.isArray(content)) {
      text = content.filter((b) => b?.type === 'text').map((b) => b.text).join('\n');
    }
  }
  return text;
}

async function main() {
  try {
    const chunks = [];
    for await (const c of process.stdin) chunks.push(c);
    const { transcript_path: transcriptPath } = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
    if (!transcriptPath) return;
    if (needsHandoffNudge(lastAssistantText(transcriptPath))) {
      console.log(
        'Handoff reminder: this turn advises a fresh session but includes no paste-ready prompt. '
        + 'Per skill `checkpoint`, hand back the literal fresh-session command and the resume prompt '
        + 'in a code block.',
      );
    }
  } catch {
    // A reminder must never disrupt the session: on any error, stay silent and exit clean.
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main();
}
