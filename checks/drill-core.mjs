// What the two evidence drills share: where the framework is, how git runs inside a throwaway
// directory, how a fresh copy is unpacked, and how the framework is told apart from a project
// built on it. The walk to a first commit is checks/drill.mjs; the walk over an existing
// repository is checks/drill-adopt.mjs. Both import this, and neither imports the other's walk,
// so `drill.mjs --adopt` can call the adoption walk directly.

import { mkdtempSync, mkdirSync, rmSync, existsSync, realpathSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

export const SOURCE = dirname(dirname(fileURLToPath(import.meta.url)));

// begin's exact first commit, subject and trailer, from .agents/skills/begin/SKILL.md. An
// existing project makes the same commit, with `git init` skipped.
export const FIRST_COMMIT = ['chore: initialize project on Groundwork',
  'Traces-to: explicit request: project initialization (begin)'];

// git in the copy runs with no global or system config: the drill must measure the shipped repo,
// not whatever templates, hooks or signing key the machine running it happens to carry.
export function gitEnv(copy) {
  return {
    ...process.env,
    GIT_CONFIG_GLOBAL: join(copy, 'no-global-gitconfig'),
    GIT_CONFIG_SYSTEM: join(copy, 'no-system-gitconfig'),
    GIT_AUTHOR_NAME: 'Groundwork drill', GIT_AUTHOR_EMAIL: 'drill@example.invalid',
    GIT_COMMITTER_NAME: 'Groundwork drill', GIT_COMMITTER_EMAIL: 'drill@example.invalid',
  };
}
export const git = (copy, args) => spawnSync('git', args, { cwd: copy, encoding: 'utf8', env: gitEnv(copy) });
export const node = (copy, args) => spawnSync(process.execPath, args, { cwd: copy, encoding: 'utf8', env: gitEnv(copy) });

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
  if (made.status !== 0) throw new Error(`git archive ${ref} failed: ${made.stderr || made.stdout}`);
  const untarred = spawnSync('tar', ['-xf', tarball, '-C', copy], { encoding: 'utf8' });
  if (untarred.status !== 0) throw new Error(`tar failed: ${untarred.stderr}`);
  rmSync(tarball);
  return { box, copy };
}
