#!/usr/bin/env node
// The design method: impeccable, installed per project and never vendored into this repo (spec 011).
// The payload is gitignored like a dependency, so this file is both the route that puts it there and
// the reader that says whether it is there.
// Run: node checks/design-method.mjs --install (--pinned prints the package version, for a workflow)
//
// Two version lines, measured 2026-09-07: the npm package is a launcher that downloads the skill
// payload from GitHub releases at install time, so pinning the package fixes the launcher and its
// engine binary but not the method content (4.0.3 and 4.0.4 both install content 4.2.2). What this
// file can honestly do is record the content version that was verified and report when the payload
// stops matching it. That is visibility, not prevention; preventing it would mean vendoring.
//
// The install lands in .claude/skills, which is a symlink into .agents/skills here (decision
// 0002), and upstream deliberately drops such a link so each harness gets its own build. So the
// route installs the Claude build, then puts the payload where our skills live and restores the
// link: the same files, reachable under both names, with the symlink gate still green.
//
// The edit hook comes with the payload, because that is the half that has to be there while the
// code is being written; it is wired per machine in the gitignored .claude/settings.local.json,
// and its command is guarded so a clone without the payload is a no-op rather than an error. The
// other half, the detector as a CI stage, is `stack`'s to wire beside the ecosystem's own gates,
// where `stack-gates` can see whether a workflow really runs it.

import {
  existsSync, readFileSync, renameSync, rmSync, symlinkSync, lstatSync, readdirSync, rmdirSync,
} from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Where the payload lives once installed. checks/config.json declares this same prefix as
// third-party, and a self-test asserts the two agree, so neither can move without the other.
export const PAYLOAD_PATH = '.agents/skills/impeccable';
const LANDING_PATH = '.claude/skills/impeccable';
const SKILLS_LINK = '.claude/skills';
const PACKAGE = 'impeccable';

// Both numbers live in tracked config, beside the declaration that the payload is third-party, and
// both move only through `maintain`. `version` is what the install fetches; `contentVersion` is the
// payload this project actually read and verified, which is the one a reader should compare against.
function thirdPartyEntry(root) {
  const cfg = JSON.parse(readFileSync(join(root, 'checks', 'config.json'), 'utf8'));
  return (cfg.thirdParty || []).find((e) => e && e.path === `${PAYLOAD_PATH}/`);
}

export function pinnedVersion(root) {
  const entry = thirdPartyEntry(root);
  const pin = entry && typeof entry.version === 'string' ? entry.version.trim() : '';
  if (!pin) {
    throw new Error(`checks/config.json declares no version for ${PAYLOAD_PATH}/: the design method installs at a fixed package version, so it has to exist before anything is fetched.`);
  }
  return pin;
}

// The content version is a record of what was verified. Absent is a legitimate state (nobody has
// verified a payload yet), so this reads null rather than refusing.
export function verifiedContent(root) {
  const entry = thirdPartyEntry(root);
  const v = entry && typeof entry.contentVersion === 'string' ? entry.contentVersion.trim() : '';
  return v || null;
}

// The installed version is the skill's own frontmatter, which is where impeccable states it too.
// Reading the payload rather than asking the network keeps this a zero-token, offline reader.
export function designMethod(root) {
  const skill = join(root, PAYLOAD_PATH, 'SKILL.md');
  if (!existsSync(skill)) return { installed: false, version: null };
  const m = readFileSync(skill, 'utf8').match(/^version:\s*(.+)$/m);
  return { installed: true, version: m ? m[1].trim().replace(/^["']|["']$/g, '') : null };
}

// The fourth enforcement signal, same shape as hooks, CI and adapter hooks: a fresh clone has no
// payload (it is gitignored), so the state is reported rather than assumed.
export function designMethodSignal(root) {
  const { installed, version } = designMethod(root);
  let want = null;
  try { want = verifiedContent(root); } catch { want = null; }
  if (installed) {
    // The payload can change under a project without anyone asking for it, because the install
    // downloads the current release. That cannot be prevented here, so it is made impossible to
    // miss: the line says which content was verified and which is actually on disk.
    const drift = want && version && version !== want
      ? `, but ${want} is the version this project verified: re-verify and move contentVersion through \`maintain\``
      : '';
    return {
      signal: 'design method',
      armed: true,
      detail: `impeccable ${version || 'installed'} at ${PAYLOAD_PATH}${drift}`,
      drifted: Boolean(drift),
    };
  }
  return {
    signal: 'design method',
    armed: false,
    detail: 'design method not installed: run node checks/design-method.mjs --install (a project with no user interface does not need it).',
  };
}

// The install prints its own progress straight to the terminal, so its stdout is inherited and
// there is nothing to read back; a reader like `npm view` gets a pipe. One helper, both shapes.
const run = (cmd, args, opts = {}) => (execFileSync(cmd, args, {
  encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], ...opts,
}) || '').trim();

const parts = (v) => String(v).replace(/^\D+/, '').split('.').map(Number);
const below = (have, want) => {
  const a = parts(have); const b = parts(want);
  for (let i = 0; i < 3; i++) {
    if ((a[i] || 0) !== (b[i] || 0)) return (a[i] || 0) < (b[i] || 0);
  }
  return false;
};

// The Node floor comes out of the package that sets it, never out of a number typed here: a
// version read from a note instead of from the source is exactly what `stack` forbids, and it
// would go stale the first time upstream raises it.
function requiredNode(want) {
  const range = run('npm', ['view', `${PACKAGE}@${want}`, 'engines.node']);
  const min = range.match(/\d+(\.\d+)*/);
  return { range, min: min ? min[0] : null };
}

// Put the payload where our skills live and restore the symlink. Nothing is deleted that this
// route did not just install: a .claude/skills holding anything else is reported, not cleared.
function adopt(root) {
  const link = join(root, SKILLS_LINK);
  if (lstatSync(link).isSymbolicLink()) return 'installed through the existing symlink';
  const landed = join(root, LANDING_PATH);
  if (!existsSync(landed)) {
    throw new Error(`the install left no payload at ${LANDING_PATH}: impeccable changed where it writes, so this route needs updating before it can claim success.`);
  }
  rmSync(join(root, PAYLOAD_PATH), { recursive: true, force: true });
  renameSync(landed, join(root, PAYLOAD_PATH));
  const left = readdirSync(link);
  if (left.length) {
    throw new Error(`${SKILLS_LINK}/ still holds ${left.join(', ')}, so the symlink cannot be restored: move those into .agents/skills/ and run ln -sfn ../.agents/skills ${SKILLS_LINK}.`);
  }
  rmdirSync(link);
  symlinkSync('../.agents/skills', link);
  return `payload moved to ${PAYLOAD_PATH}, ${SKILLS_LINK} symlink restored`;
}

// One line per outcome, and a refusal before anything is written: a half-install is worse than
// none, because the checks would then measure a payload nobody can run.
export function install(root) {
  const pin = pinnedVersion(root);
  let want;
  try {
    want = requiredNode(pin);
  } catch (e) {
    throw new Error(`cannot read what Node version ${PACKAGE}@${pin} needs (${e.message.split('\n')[0]}): the design method is unavailable until npm is reachable. The degraded route in the design skill says how to build without it.`);
  }
  if (want.min && below(process.versions.node, want.min)) {
    throw new Error(`Node ${process.versions.node} is below ${PACKAGE}'s requirement (${want.range}): upgrade Node first, nothing was written.`);
  }
  console.log(`Node ${process.versions.node} meets ${PACKAGE}@${pin} ${want.range || '(no stated range)'}. Installing...`);
  run('npx', ['-y', `${PACKAGE}@${pin}`, 'install', '--providers=claude', '--scope=project', '--yes'],
    { cwd: root, stdio: ['ignore', 'inherit', 'inherit'] });
  const what = adopt(root);
  const { version } = designMethod(root);
  const verified = verifiedContent(root);
  const note = verified && version && version !== verified
    ? ` WARNING: this project verified content ${verified} and the install brought ${version}. The package version does not control the content, so read what changed, re-verify, and move contentVersion in checks/config.json through \`maintain\` before relying on it.`
    : '';
  return `impeccable content ${version || '(version unstated)'} installed from ${PACKAGE}@${pin}: ${what}.${note}`;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  if (process.argv.includes('--pinned')) {
    console.log(pinnedVersion(root));
    process.exit(0);
  }
  if (!process.argv.includes('--install')) {
    const s = designMethodSignal(root);
    console.log(`design method: ${s.armed ? s.detail : `NOT armed. ${s.detail}`}`);
    process.exit(0);
  }
  try {
    console.log(install(root));
  } catch (e) {
    console.error(`design method NOT installed: ${e.message}`);
    process.exit(1);
  }
}
