// The gates that read source code rather than documents: what a file may not contain (secrets,
// unmarked deferrals, commented-out code) and how long it may be. Three of the four have to
// answer the same question first - is this text a comment? - so that answer is written once here.
// Part of checks/check.mjs, which composes these gates into its registry and owns the run.

import { extname } from 'node:path';

// One honest answer to "what on this line is a comment?", read by the two gates that ask it.
// They were wrong in opposite directions: code-file-cap took its escape marker from anywhere in
// the file, string literals included, and defer-markers saw a comment only when the line opened
// with one, so a trailing "// for now" walked past every ban that the same words on their own
// line tripped. Line-scoped and language-agnostic, like the rest of these checks: quoted text is
// stepped over so an opener inside a string stays a string, and the first real opener wins. A
// body line of a block comment is recognised by its leading "*", which is how every language
// with block comments writes them. Returns the comment text, or null when the line has none.
// Unbalanced quotes (a Rust lifetime, a prose apostrophe) swallow the rest of the line and the
// answer becomes null: a gate that stays quiet on an odd line beats one that fails on it. The
// one place it reads a comment that is not there is Python's floor division, "a // b", and what
// it hands the caller is an operand rather than prose, which no ban in commentBans matches.
export function commentOn(line) {
  if (/^\s*\*/.test(line)) return line.replace(/^\s*\*+/, '');
  let quote = null;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (quote) {
      if (c === '\\') i++;
      else if (c === quote) quote = null;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') { quote = c; continue; }
    if (c === '/' && (line[i + 1] === '/' || line[i + 1] === '*')) return line.slice(i + 2);
    if (line.startsWith('<!--', i)) return line.slice(i + 4);
    // A "#" opens a comment at the start of a word, which is what Python and the shells agree
    // on. Mid-token it is a private field, a fragment or a colour, and not a comment at all.
    if (c === '#' && (i === 0 || /\s/.test(line[i - 1]))) return line.slice(i + 1);
  }
  return null;
}

// The runner supplies what it already read once: the walked tree, the config, and its own
// readers, so nothing here walks the repo a second time.
export const codeChecks = ({ root, cfg, tree, textFiles, isVendored, fail, lines, rel, CODE_EXT }) => ({
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
    // Two halves of one contract. The marker half: a defer: that names no trigger rots.
    // The commentBans half is its negative image - a comment that apologises for a
    // simplification ("for now", "in a real app") is a deferral that skipped the marker, so
    // nothing can ever grep for it. Comments in code files only: "for now" is legitimate in a
    // string, a UI label or prose, and only a comment can apologise for the code beside it.
    const apologies = (cfg.commentBans || []).map((e) => ({ ...e, re: new RegExp(e.pattern, 'i') }));
    for (const f of textFiles) {
      const r = rel(root, f);
      if (r.startsWith('checks/')) continue;
      // Generated and vendored code is not this project's deferral to make or to mark, and it
      // is already named once in config for the length cap. One list, both meanings.
      const vendored = isVendored(r);
      const isCode = CODE_EXT.has(extname(f));
      const content = lines(f);
      content.forEach((line, i) => {
        // A wrapped marker may carry its trigger on the next line or two.
        const vicinity = content.slice(i, i + 3).join(' ');
        if (/(\/\/|#|<!--)\s*defer:/i.test(line) && !/upgrade-when:/i.test(vicinity)) {
          fail(`${r}:${i + 1} defer: marker without "upgrade-when:": untriggered deferrals rot silently (AGENTS.md format).`);
        }
        if (!isCode || vendored || line.includes('checks:allow-style')) return;
        // The apology is judged on the comment alone, wherever it opens on the line: the same
        // words in the code beside it are a label or a message, and not a deferral at all.
        const comment = commentOn(line);
        if (comment === null) return;
        // A line that already carries the marker is the documented case, not the apology.
        if (/defer:/i.test(vicinity)) return;
        for (const e of apologies) {
          if (e.re.test(comment)) {
            fail(`${r}:${i + 1} comment defers without a marker (/${e.pattern}/): ${e.why}. Deliberate wording? Append "checks:allow-style" to that line.`);
          }
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
    // files, vendored code): an escape marker in a comment of the file itself, or a
    // codeFileCapExclude path in config, mirroring the secrets-check exclude discipline.
    // The marker has to OPEN that comment, because the exemption is a declaration a file makes
    // about itself: a file that merely mentions the marker in prose or ships it inside a
    // fixture string is talking about the escape hatch, not asking for it, and reading a
    // mention as a grant is how this gate came off a test file and off the runner itself.
    // Older configs without the key fall back to 500.
    const cap = cfg.budgets.codeFileMaxLines ?? 500;
    for (const f of tree.files.filter((x) => CODE_EXT.has(extname(x)))) {
      const r = rel(root, f);
      if ((cfg.codeFileCapExclude || []).some((x) => r.startsWith(x) || r.endsWith(x))) continue;
      const content = lines(f);
      if (content.length <= cap) continue;
      const marker = content.map(commentOn).find((c) => c !== null && /^\s*checks:allow-length\b/.test(c));
      if (marker !== undefined) {
        if (!/^\s*checks:allow-length\s*:?\s*\S/.test(marker)) {
          fail(`${r}: checks:allow-length needs a reason (e.g. "checks:allow-length: generated file"), so the exception stays auditable.`);
        }
        continue;
      }
      fail(`${r} is ${content.length} lines (budget ${cap}): split it by responsibility. Generated or vendored? Open a comment in the file with "checks:allow-length: <reason>", or add a codeFileCapExclude entry in checks/config.json.`);
    }
  },
});
