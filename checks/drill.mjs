#!/usr/bin/env node
// Groundwork evidence drill: does a fresh copy still walk from download to a governed first
// commit? Every adoption claim this project makes rests on that walk, and it was proven once by
// hand on 2026-07-14 and then never again. This runs it on demand, in a throwaway directory,
// against the tracked snapshot an adopter actually receives.
// Run: node checks/drill.mjs            (--ref <sha> drills another snapshot with today's begin
//                                        bullets, --keep leaves the copy on disk to look at)
// Self-test: node checks/drill.test.mjs (every step must fail when the copy is broken).
//
// What this is not. It is not a gate on anyone's work: it inspects a copy of this repository and
// touches nothing outside its temp directory. It never runs `progress.mjs --register`, which
// would write a throwaway path into the owner's cross-project registry. And it proves only the
// mechanical half of the walk: the judgment half (the interview, what BRIEF.md ends up saying,
// the first spec) belongs to a session and cannot be scripted. `docs/operations/evidence-drill.md`
// says which `begin` bullets are covered here and which stay a person's job.

import {
  mkdtempSync, mkdirSync, rmSync, readdirSync, readFileSync, writeFileSync,
  existsSync, lstatSync, readlinkSync, copyFileSync, realpathSync,
} from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, relative, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const SOURCE = resolveSource();
function resolveSource() {
  return dirname(dirname(fileURLToPath(import.meta.url)));
}

// The suites CI proves before it trusts any gate, run here inside the copy so it is the copy's
// own code under test and never this working tree's. Keep in step with the `gate` job in
// .github/workflows/ci.yml, which is the list this one mirrors.
const SUITES = [
  'check.test.mjs', 'check-code.test.mjs', 'check-trace.test.mjs', 'check-stack.test.mjs',
  'progress.test.mjs', 'links.test.mjs',
  'cockpit-path.test.mjs', 'cockpit.test.mjs',
];

// begin's exact first commit, subject and trailer, from .agents/skills/begin/SKILL.md.
const FIRST_COMMIT = ['chore: initialize project on Groundwork',
  'Traces-to: explicit request: project initialization (begin)'];

const must = (ok, message) => { if (!ok) throw new Error(message); };

// git in the copy runs with no global or system config: the drill must measure the shipped repo,
// not whatever templates, hooks or signing key the machine running it happens to carry.
function gitEnv(copy) {
  return {
    ...process.env,
    GIT_CONFIG_GLOBAL: join(copy, 'no-global-gitconfig'),
    GIT_CONFIG_SYSTEM: join(copy, 'no-system-gitconfig'),
    GIT_AUTHOR_NAME: 'Groundwork drill', GIT_AUTHOR_EMAIL: 'drill@example.invalid',
    GIT_COMMITTER_NAME: 'Groundwork drill', GIT_COMMITTER_EMAIL: 'drill@example.invalid',
  };
}
const git = (copy, args) => spawnSync('git', args, { cwd: copy, encoding: 'utf8', env: gitEnv(copy) });
const node = (copy, args) => spawnSync(process.execPath, args, { cwd: copy, encoding: 'utf8', env: gitEnv(copy) });

// The copy reports on itself: its own enforcement.mjs, not this tree's, so a drift between the
// two shows up as a failure instead of being papered over.
async function hooksArmed(copy) {
  const mod = await import(pathToFileURL(join(copy, 'checks', 'enforcement.mjs')).href);
  return mod.enforcementReport(copy).find((s) => s.signal === 'hooks').armed;
}

function walkFiles(dir, base = dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isSymbolicLink()) out.push(relative(base, full));
    else if (entry.isDirectory()) walkFiles(full, base, out);
    else out.push(relative(base, full));
  }
  return out;
}

const numberedSpecs = (copy) => {
  const dir = join(copy, 'docs', 'specs');
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isDirectory() && /^[0-9]/.test(e.name)).map((e) => e.name);
};

const sameBytes = (a, b) => readFileSync(a).equals(readFileSync(b));

// The drill is the framework's evidence about its own copy route, and a project built on
// Groundwork inherits this file the way it inherits the CI job: present, and not about it.
// `begin` deletes the baseline folder holding what the framework itself had already shipped,
// which makes its absence the honest signal that this repository is a project now.
export const isFramework = (copy) => existsSync(join(copy, 'docs', 'specs', 'archive', '000-baseline'));

// A tar snapshot of one ref is exactly what the ZIP and degit routes hand an adopter: tracked
// files only, so every *.local.md and the whole .git go nowhere near it.
export function freshCopy(ref = 'HEAD', source = SOURCE) {
  // realpath first: on macOS the temp directory sits behind /var -> /private/var, and a step that
  // compares its own path against the copy's would quietly compare two spellings of one place.
  const box = realpathSync(mkdtempSync(join(tmpdir(), 'groundwork-drill-')));
  const copy = join(box, 'copy');
  mkdirSync(copy);
  const tarball = join(box, 'snapshot.tar');
  const made = spawnSync('git', ['archive', '--format=tar', '-o', tarball, ref],
    { cwd: source, encoding: 'utf8' });
  must(made.status === 0, `git archive ${ref} failed: ${made.stderr || made.stdout}`);
  const untarred = spawnSync('tar', ['-xf', tarball, '-C', copy], { encoding: 'utf8' });
  must(untarred.status === 0, `tar failed: ${untarred.stderr}`);
  rmSync(tarball);
  return { box, copy };
}

export const STEPS = [
  {
    id: 'copy',
    title: 'a fresh copy carries the whole framework and nothing private',
    async run(ctx) {
      const files = walkFiles(ctx.copy);
      must(files.length >= 50, `only ${files.length} files in the copy`);
      for (const needed of ['AGENTS.md', 'README.md', 'checks/check.mjs',
        'docs/state/STATE.md', '.github/workflows/ci.yml']) {
        must(existsSync(join(ctx.copy, needed)), `missing from the copy: ${needed}`);
      }
      const skills = join(ctx.copy, '.claude', 'skills');
      must(existsSync(join(ctx.copy, '.claude')) && lstatSync(skills, { throwIfNoEntry: false }),
        '.claude/skills is missing from the copy: the symlink the skills load through is gone');
      must(lstatSync(skills).isSymbolicLink(), '.claude/skills is not a symlink in the copy');
      must(readlinkSync(skills) === '../.agents/skills',
        `.claude/skills points at ${readlinkSync(skills)}`);
      const local = files.filter((f) => f.endsWith('.local.md'));
      must(local.length === 0, `maintainer-only files reached the copy: ${local.join(', ')}`);
      must(!existsSync(join(ctx.copy, '.git')), 'the copy carries a .git directory');
      return `${files.length} files, symlink intact`;
    },
  },
  {
    id: 'gates',
    title: 'the gates prove themselves, then pass, on the untouched copy',
    async run(ctx) {
      for (const suite of SUITES) {
        const r = node(ctx.copy, [join('checks', suite)]);
        must(r.status === 0, `${suite} failed in the copy:\n${r.stdout}\n${r.stderr}`);
      }
      const checks = node(ctx.copy, ['checks/check.mjs']);
      must(checks.status === 0, `check.mjs failed on an untouched copy:\n${checks.stdout}`);
      must(await hooksArmed(ctx.copy) === false,
        'the copy claims its commit gates are armed before git init');
      return `${SUITES.length} suites and check.mjs green, gates honestly reported unarmed`;
    },
  },
  {
    id: 'overview',
    title: 'the overview reads the copy',
    async run(ctx) {
      const r = node(ctx.copy, ['checks/progress.mjs']);
      must(r.status === 0, `progress.mjs failed in the copy:\n${r.stdout}\n${r.stderr}`);
      must(r.stdout.trim().length > 0, 'progress.mjs printed nothing');
      return 'rendered';
    },
  },
  {
    id: 'clearing',
    title: 'begin step 1 hands the project its own blank files',
    // defer: the clearing commands are written out here as well as in the begin skill, so a
    // bullet added there is not walked here until someone adds it. ceiling: a copy inheriting
    // Groundwork's content through a bullet this step never learned about. upgrade-when: the
    // list of bullets changes without this step changing with it, twice.
    async run(ctx) {
      const at = (...p) => join(ctx.copy, ...p);
      for (const name of ['MASTER_PROMPT.md', 'MASTER_PROMPT.local.md']) {
        rmSync(at(name), { force: true });
      }
      for (const spec of numberedSpecs(ctx.copy)) rmSync(at('docs', 'specs', spec), { recursive: true });
      rmSync(at('docs', 'specs', 'archive', '000-baseline'), { recursive: true, force: true });
      const pairs = [
        [at('docs', 'product', 'TEMPLATE-VISION.md'), at('docs', 'product', 'VISION.md')],
        [at('docs', 'product', 'TEMPLATE-BRIEF.md'), at('docs', 'product', 'BRIEF.md')],
        [at('docs', 'operations', 'TEMPLATE-DEPLOY.md'), at('docs', 'operations', 'deploy.md')],
        [at('docs', 'state', 'TEMPLATE-DEBT.md'), at('docs', 'state', 'DEBT.md')],
        [at('docs', 'compliance', 'TEMPLATE-REGISTER.md'), at('docs', 'compliance', 'REGISTER.md')],
      ];
      for (const [template, live] of pairs) {
        // Named rather than left to a raw ENOENT: with --ref this is the likeliest failure, and
        // the answer it gives is precise. Today's begin bullets are walked against an older
        // snapshot, so a missing blank means that snapshot predates the bullet, not that the
        // route is broken.
        must(existsSync(template),
          `no blank at ${relative(ctx.copy, template)} for begin to copy over ${relative(ctx.copy, live)}`);
        copyFileSync(template, live);
      }
      const configPath = at('checks', 'config.json');
      const config = JSON.parse(readFileSync(configPath, 'utf8'));
      config.denylist = [];
      writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`);

      for (const [template, live] of pairs) {
        must(sameBytes(template, live), `${relative(ctx.copy, live)} is not the blank template`);
      }
      must(JSON.parse(readFileSync(configPath, 'utf8')).denylist.length === 0,
        'the denylist still guards the origin repo of this copy');
      must(!existsSync(at('MASTER_PROMPT.md')) && !existsSync(at('MASTER_PROMPT.local.md')),
        "Groundwork's own origin brief survived the clearing");
      must(numberedSpecs(ctx.copy).length === 0, 'an in-flight spec folder survived the clearing');
      must(!existsSync(at('docs', 'specs', 'archive', '000-baseline')),
        "Groundwork's own baseline survived the clearing");
      const checks = node(ctx.copy, ['checks/check.mjs']);
      must(checks.status === 0, `check.mjs failed after the clearing:\n${checks.stdout}`);
      return `${pairs.length} files blanked, denylist emptied, gates still green`;
    },
  },
  {
    id: 'arm',
    title: 'git init and one command arm the commit gates',
    async run(ctx) {
      must(await hooksArmed(ctx.copy) === false, 'the gates were already armed before this step');
      const init = git(ctx.copy, ['init', '-q', '-b', 'main']);
      must(init.status === 0, `git init failed: ${init.stderr}`);
      const install = node(ctx.copy, ['checks/check.mjs', '--install-hooks']);
      must(install.status === 0, `--install-hooks failed:\n${install.stdout}\n${install.stderr}`);
      must(await hooksArmed(ctx.copy) === true, 'the gates are still unarmed after --install-hooks');
      return 'hooks NOT armed -> hooks armed';
    },
  },
  {
    id: 'commit',
    title: 'the first commit passes the gates it just armed',
    async run(ctx) {
      const staged = git(ctx.copy, ['add', '-A']);
      must(staged.status === 0, `git add failed: ${staged.stderr}`);
      const done = git(ctx.copy, ['commit', '-q', '-m', FIRST_COMMIT[0], '-m', FIRST_COMMIT[1]]);
      must(done.status === 0, `the first commit was rejected:\n${done.stdout}\n${done.stderr}`);
      must(git(ctx.copy, ['rev-list', '--count', 'HEAD']).stdout.trim() === '1',
        'the copy does not hold exactly one commit');
      must(git(ctx.copy, ['status', '--porcelain']).stdout.trim() === '',
        'the first commit left the working tree dirty');
      return 'committed through the real hooks';
    },
  },
  {
    id: 'bite',
    title: 'and an ungoverned commit is refused',
    async run(ctx) {
      const refused = git(ctx.copy, ['commit', '-q', '--allow-empty', '-m', 'wip']);
      must(refused.status !== 0, 'a commit with no type and no trace was accepted');
      must(git(ctx.copy, ['rev-list', '--count', 'HEAD']).stdout.trim() === '1',
        'the refused commit landed anyway');
      return 'blocked, as it should be';
    },
  },
];

export async function runDrill({ ref = 'HEAD', keep = false, requireWalk = false, source = SOURCE } = {}) {
  const out = console.log;
  const started = process.hrtime.bigint();
  const { box, copy } = freshCopy(ref, source);
  const ctx = { copy, box, ref };
  const results = [];
  let failed = null;

  out(`Groundwork evidence drill, ref ${ref}`);
  out('');
  if (!isFramework(copy)) {
    // Skipping is the friendly answer to a project that ran the wrong tool, and it would be a
    // silent green on the framework's own CI, where a drill that stops drilling is exactly the
    // failure this ticket exists to prevent. --require-walk is how that side asks for the walk
    // itself rather than for an exit code.
    out('This repository is a project built on Groundwork, not the framework itself.');
    out('The drill proves the framework\'s copy route, so there is nothing here for it to walk.');
    if (requireWalk) out('Asked to walk it anyway (--require-walk), so this counts as a failure.');
    rmSync(box, { recursive: true, force: true });
    return { ok: !requireWalk, skipped: true, failed: null, total: 0, results, copy };
  }
  for (const step of STEPS) {
    const at = process.hrtime.bigint();
    try {
      const note = await step.run(ctx);
      const ms = Number(process.hrtime.bigint() - at) / 1e6;
      results.push({ id: step.id, ok: true, ms, note });
      out(`  ok    ${step.title}  (${ms.toFixed(0)} ms)`);
      out(`        ${note}`);
    } catch (error) {
      const ms = Number(process.hrtime.bigint() - at) / 1e6;
      results.push({ id: step.id, ok: false, ms, note: error.message });
      out(`  FAIL  ${step.title}  (${ms.toFixed(0)} ms)`);
      out(`        ${error.message}`);
      failed = step.id;
      break;
    }
  }

  const total = Number(process.hrtime.bigint() - started) / 1e6;
  out('');
  if (failed) {
    // The evidence of a failure is the copy itself, so it stays on disk whatever was asked.
    out(`FAILED at "${failed}" after ${(total / 1000).toFixed(1)}s. The copy is kept at ${copy}`);
  } else {
    out(`PASSED: a fresh copy reached a governed first commit in ${(total / 1000).toFixed(1)}s.`);
    if (keep) out(`The copy is kept at ${copy}`); else rmSync(box, { recursive: true, force: true });
  }
  return { ok: !failed, failed, total, results, copy };
}

if (process.argv[1] && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))) {
  const args = process.argv.slice(2);
  const refAt = args.indexOf('--ref');
  const { ok } = await runDrill({
    ref: refAt === -1 ? 'HEAD' : args[refAt + 1],
    keep: args.includes('--keep'),
    requireWalk: args.includes('--require-walk'),
  });
  process.exit(ok ? 0 : 1);
}
