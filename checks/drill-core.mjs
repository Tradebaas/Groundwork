// What the two evidence drills share: where the framework is, how git runs inside a throwaway
// directory, how a fresh copy is unpacked, and how the framework is told apart from a project
// built on it. The walk to a first commit is checks/drill.mjs; the walk over an existing
// repository is checks/drill-adopt.mjs. Both import this, and `drill.mjs` loads the adoption walk
// only for `--adopt`, so a break in one walk cannot stop the other.

import { mkdtempSync, mkdirSync, rmSync, existsSync, realpathSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir, devNull } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

export const SOURCE = dirname(dirname(fileURLToPath(import.meta.url)));

// begin's exact first commit, subject and trailer, from .agents/skills/begin/SKILL.md. An
// existing project makes the same commit, with `git init` skipped.
export const FIRST_COMMIT = ['chore: initialize project on Groundwork',
  'Traces-to: explicit request: project initialization (begin)'];

// git in the copy runs with no global or system config: the drill must measure the shipped repo,
// not whatever templates, hooks or signing key the machine running it happens to carry. The null
// device reads as empty and refuses a write, so nothing a tool under test sets globally lands
// anywhere. Every inherited GIT_* variable goes too: git exports GIT_DIR and GIT_INDEX_FILE to
// its hooks, and a drill started from inside one would otherwise commit into that repository.
export function gitEnv() {
  const env = Object.fromEntries(Object.entries(process.env).filter(([k]) => !k.startsWith('GIT_')));
  return {
    ...env,
    GIT_CONFIG_GLOBAL: devNull,
    GIT_CONFIG_SYSTEM: devNull,
    GIT_AUTHOR_NAME: 'Groundwork drill', GIT_AUTHOR_EMAIL: 'drill@example.invalid',
    GIT_COMMITTER_NAME: 'Groundwork drill', GIT_COMMITTER_EMAIL: 'drill@example.invalid',
  };
}
export const git = (cwd, args) => spawnSync('git', args, { cwd, encoding: 'utf8', env: gitEnv() });
export const node = (cwd, args) => spawnSync(process.execPath, args, { cwd, encoding: 'utf8', env: gitEnv() });

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
  const fail = (message) => { rmSync(box, { recursive: true, force: true }); throw new Error(message); };
  const made = spawnSync('git', ['archive', '--format=tar', '-o', tarball, ref],
    { cwd: source, encoding: 'utf8', env: gitEnv() });
  if (made.status !== 0) fail(`git archive ${ref} failed: ${made.stderr || made.stdout}`);
  const untarred = spawnSync('tar', ['-xf', tarball, '-C', copy], { encoding: 'utf8' });
  if (untarred.status !== 0) fail(`tar failed: ${untarred.stderr}`);
  rmSync(tarball);
  return { box, copy };
}
