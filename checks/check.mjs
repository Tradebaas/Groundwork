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
import { join, dirname, resolve, relative, extname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
// The brief is parsed in exactly one place; the progress overview already owns that reading.
import { parseBrief, parseManifest, manifestMatcher, isSpecPath, BRIEF_PATH, MANIFEST_PATH } from './progress.mjs';
// What counts as a link, and which files are this project's documents, are defined once and
// read here and by the board.
import { parseLinks, linkTargets, readDocuments, forTerminal, SKIP_DIRS } from './links.mjs';
import { enforcementReport, formatReport, floorFor } from './enforcement.mjs';
// Gate families live in their own files, composed into the registry below: what a source file
// may contain and how long it may be, the trace chain from brief to commit, whether a stack's
// own gates are wired, and the config's self-gate, which also owns the third-party declaration.
import { codeChecks } from './check-code.mjs';
import { checkCommitMessage, traceChecks } from './check-trace.mjs';
import { stackChecks } from './check-stack.mjs';
import { configChecks, thirdPartyMatcher } from './check-config.mjs';

// The commit-msg hook and the self-test have always imported this from here; it is authored in
// check-trace.mjs with the rest of the chain, and stays reachable at its published address.
export { checkCommitMessage };

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

// The SC-ids the brief actually defines, or null when scope is not written down yet. A project
// that has not run `scope` has nothing to validate against and must not be blocked for it.
function scopeIds(root) {
  const p = join(root, BRIEF_PATH);
  if (!existsSync(p)) return null;
  const { items } = parseBrief(read(p));
  return items.length ? new Set(items.map((i) => i.id)) : null;
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
  // What this project did not write: a declared third-party payload (checks/config.json), read
  // by every gate that measures this repo's own writing. House style governs what this repo
  // writes; measuring somebody else's payload would force a patch on every upstream release.
  const isThirdParty = thirdPartyMatcher(cfg);
  // What counts as generated or vendored code is one fact, read by the length cap and by the
  // deferral contract. Written once so the two can never drift apart.
  const isVendored = (r) => isThirdParty(r) || (cfg.codeFileCapExclude || []).some((x) => r.startsWith(x) || r.endsWith(x));

  // Which gate is speaking is the runner's bookkeeping, so a family file reports a failure the
  // same way a gate written here does: it calls fail(), and the loop below names the caller.
  // Several gates quote a file's own words back (a broken link, a skill name, a number an HTML
  // page states), and every finding ends up on a terminal, so the strip belongs where a finding
  // is made and not at one message that happened to be noticed.
  let current = '';
  const fail = (msg) => failures.push({ check: current, msg: forTerminal(msg) });
  // What the gate families in their own files need, read once here: the walked tree, the config,
  // the SC-ids the brief defines, and this runner's readers. Passed rather than imported back
  // out of this file, so the dependency runs one way and nothing walks the repo twice.
  const ctx = { root, cfg, tree, textFiles, known, isVendored, fail, read, lines, rel, CODE_EXT };

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
        if (isThirdParty(rel(root, f))) continue;
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
      // The manifest is read in exactly one place, and matched by the one rule the board reads
      // its rows through: two readers of one table drift, and a row the gate cannot see is a
      // document nobody has to list.
      const covers = manifestMatcher(parseManifest(read(join(root, MANIFEST_PATH))));
      for (const f of tree.files) {
        const r = rel(root, f);
        if (!r.startsWith('docs/') || r === MANIFEST_PATH || r.endsWith('.gitkeep')) continue;
        if (!covers(r.slice('docs/'.length))) {
          fail(`${r} is not listed in docs/README.md: every docs file needs a manifest row.`);
        }
      }
    },

    'links'() {
      for (const doc of readDocuments(root)) {
        for (const link of parseLinks(doc.text)) {
          // A markdown link is an assertion: the writer made it clickable, so a target that is
          // not there is broken. A backticked path is a mention, and a mention that resolves to
          // nothing is prose: this framework's own documents name files a project creates later.
          if (!link.asserted) continue;
          // An assertion has exactly one place it can land: the document it was written in.
          const [target] = linkTargets(doc.path, link);
          if (!existsSync(join(root, target))) fail(`${doc.path}: broken link to ${link.raw}`);
        }
      }
    },

    'denylist'() {
      const entries = (cfg.denylist || []).map((e) => ({ ...e, re: new RegExp(e.pattern, 'i') }));
      if (!entries.length) return;
      for (const f of textFiles) {
        const r = rel(root, f);
        if (r.startsWith('checks/') || r.startsWith('docs/specs/archive/')
          || r.startsWith('docs/state/log/') || r.startsWith('docs/decisions/') || isThirdParty(r)) continue;
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
        if (r.startsWith('checks/') || isThirdParty(r)) continue;
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
      const dirs = new Set();
      for (const entry of readdirSync(skillsDir, { withFileTypes: true })) {
        if (!entry.isDirectory()) continue;
        dirs.add(entry.name);
        // A declared third-party skill is somebody else's work, installed rather than authored
        // here: it carries no row in our routing table and is not held to our frontmatter
        // budgets. It stays in `dirs`, so the reverse direction below still catches a table row
        // whose directory is gone.
        if (isThirdParty(`.agents/skills/${entry.name}`)) continue;
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
      // reverse direction; only skills-table rows open with a backticked name in the first cell
      for (const m of agents.matchAll(/^\|\s*`([a-z0-9-]+)`\s*\|/gm)) {
        if (!dirs.has(m[1])) fail(`the AGENTS.md skills table lists "${m[1]}" but .agents/skills/${m[1]} does not exist: remove the row or restore the skill`);
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
        fail('.claude/skills symlink is missing or not a symlink. Run: ln -sfn ../.agents/skills .claude/skills. No symlink support (Windows without Developer Mode)? Set "skipSymlinkCheck": "<why>" in checks/config.json, with the reason as the value, and point your tool at .agents/skills directly.');
      }
    },

    ...codeChecks(ctx),
    ...traceChecks(ctx),
    ...stackChecks(ctx),
    ...configChecks(ctx),

    'explainer-stats'() {
      // The explainer page states counts of what this repo holds. A typed count goes stale the
      // moment a skill or a decision is added, and a public page that is quietly wrong is worse
      // than one that says nothing: where page and repo disagree, the repo is the fact (SC-11).
      // So the element holding a countable number carries data-derive="<key>", and its own text
      // is compared against the directory that owns the count. Numbers that are claims rather
      // than counts (one rulebook, zero tokens for the gates) carry no marker and stay typed.
      // A page without markers, or no page at all, leaves this gate silent. That silence is
      // what a product built on Groundwork needs: it inherits this page, whose numbers describe
      // the framework it was copied from and not the product, so `begin` strips the markers out
      // of the copy.
      const page = join(root, 'index.html');
      if (!existsSync(page)) return;
      const count = (dir, keep) => {
        const p = join(root, dir);
        if (!existsSync(p)) return null;
        return readdirSync(p, { withFileTypes: true }).filter(keep).length;
      };
      // The gates that run from their own hook and so never appear in the registry below. Named
      // rather than counted, because nothing in this file can find them: one hook, one gate, the
      // way `skills` reports several rules under one name.
      const hookGates = ['commit-msg'];
      const sources = {
        // The registry this runner walks, plus those. Reading the object itself is what keeps
        // the number honest: a gate added or removed moves the count the same day.
        gates: () => Object.keys(checks).length + hookGates.length,
        // Skills this project wrote. A declared third-party payload is installed, not authored,
        // and it is gitignored, so counting it would make the page say a different number on a
        // machine that has run the install than on a fresh clone.
        skills: () => count(join('.agents', 'skills'),
          (e) => e.isDirectory() && !isThirdParty(`.agents/skills/${e.name}`)),
        // Numbered records only: TEMPLATE.md is the form to fill in, not a decision.
        decisions: () => count(join('docs', 'decisions'), (e) => e.isFile() && /^\d+-.+\.md$/.test(e.name)),
      };
      const knownKeys = Object.keys(sources).join(', ');
      const html = read(page);
      const lineAt = (i) => html.slice(0, i).split('\n').length;
      for (const m of html.matchAll(/data-derive=(["'])([^"']*)\1/g)) {
        const key = m[2];
        const at = `index.html:${lineAt(m.index)}`;
        // Own keys only: an inherited name like "constructor" is truthy on any object and would
        // read as a known source while naming nothing.
        if (!Object.hasOwn(sources, key)) {
          fail(`${at} data-derive="${key}" names nothing this repo can count. Known keys: ${knownKeys}.`);
          continue;
        }
        // The count is the marked element's own text, read no further than its closing tag and
        // stripped of the styling around it. Reading past that tag would let the gate pick up
        // the number of the element next door and call the page correct on someone else's count.
        const rest = html.slice(m.index);
        const open = rest.indexOf('>');
        const close = rest.indexOf('</div>');
        const typed = open !== -1 && close > open
          ? rest.slice(open + 1, close).replace(/<[^>]*>/g, '').trim()
          : '';
        if (!/^\d+$/.test(typed)) {
          fail(`${at} the data-derive="${key}" element reads "${typed}" where a count belongs: the marker goes on the element whose own text is the number.`);
          continue;
        }
        const actual = sources[key]();
        if (actual === null) {
          fail(`${at} states ${typed} ${key}, but the directory that would prove it is gone: restore it, or drop the marker.`);
        } else if (Number(typed) !== actual) {
          fail(`${at} states ${typed} ${key}; this repo holds ${actual}. The repo is the fact: fix the page.`);
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
  // Report, never block (enforcement.mjs): the tier line is information; the exit code stays
  // with the checks alone. Skipped under CI, whose runner clone would misread as degradation,
  // and a crashed report is named rather than allowed to take the checks down with it.
  if (!process.env.CI) {
    try {
      for (const line of formatReport(enforcementReport(root))) console.log(line);
      // The floor beside the signals: armed gates say nothing about how much of this project's
      // own code any of them looks at. Silent until a stack is declared (E-02/F-01/S-03).
      for (const line of floorFor(root)) console.log(line);
    } catch (e) {
      console.log(`enforcement: self-report crashed (${e.message}); the checks below still decide.`);
    }
  }
  if (failures.length) {
    for (const f of failures) console.error(`FAIL [${f.check}] ${f.msg}`);
    console.error(`\n${failures.length} finding(s). Fix the cause; never weaken the gate.`);
    process.exit(1);
  }
  console.log('OK: all checks passed.');
}
