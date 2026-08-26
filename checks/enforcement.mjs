// Groundwork enforcement self-report: which enforcement tier does this environment run at?
// A fresh copy silently loses four machine-local layers: git hooks (core.hooksPath is set per
// clone), CI (a workflow only runs when a GitHub remote exists to push to), the Claude adapter's
// suggest-hooks (.claude/settings.json), and the design method, whose payload is installed per
// project and gitignored like a dependency. Without this report, a hookless clone with no remote
// runs with zero hard gates and no warning (GAP C-2, INTAKE 2026-07-22).
// Report, never block: a weak environment is information, not a violation. The exit code
// belongs to the checks alone; checks/check.mjs prints this on every direct run and skips it
// under CI, where the runner's own clone (no hooksPath, ephemeral remote) would misread as
// degradation.

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { join } from 'node:path';
// Whether the design method is installed, and at which version, is read where its install route
// lives, so the report and the installer can never disagree about where the payload sits.
import { designMethodSignal } from './design-method.mjs';
// The floor's shape is derived where the gate already parses the contract, so the line below and
// the board's own line are two renderings of one count rather than two readings of one table.
import { floorReport } from './check-stack.mjs';

// stderr is swallowed: "not a repo" or "key unset" are expected degraded states, not errors.
const git = (root, args) => execSync(`git ${args}`, {
  cwd: root, stdio: ['ignore', 'pipe', 'ignore'], encoding: 'utf8',
}).trim();

// The four signals, each { signal, armed, detail }. Never throws, whatever the directory
// looks like: a missing piece is a degraded signal, not a crash.
export function enforcementReport(root) {
  const signals = [];
  const hasGit = existsSync(join(root, '.git'));

  // 1. Git hooks. core.hooksPath is machine-local, so every fresh clone starts unarmed.
  let hooksPath = null;
  if (hasGit) {
    try { hooksPath = git(root, 'config core.hooksPath'); } catch { hooksPath = null; }
  }
  if (!hasGit) {
    signals.push({ signal: 'hooks', armed: false, detail: 'no git repository, so no commit gates at all: run git init, then node checks/check.mjs --install-hooks.' });
  } else if (hooksPath === 'checks/hooks') {
    signals.push({ signal: 'hooks', armed: true, detail: 'core.hooksPath -> checks/hooks' });
  } else {
    signals.push({ signal: 'hooks', armed: false, detail: 'git hooks not armed on this clone: run node checks/check.mjs --install-hooks (needed after every fresh clone).' });
  }

  // 2. CI. The workflow file alone does nothing; it runs only where a GitHub remote exists.
  let workflows = [];
  try {
    workflows = readdirSync(join(root, '.github', 'workflows')).filter((f) => /\.ya?ml$/.test(f));
  } catch { workflows = []; }
  let remotes = '';
  if (hasGit) {
    try { remotes = git(root, 'remote -v'); } catch { remotes = ''; }
  }
  if (!workflows.length) {
    signals.push({ signal: 'CI', armed: false, detail: 'no workflow under .github/workflows/: the unbypassable gate is missing. Restore ci.yml from the Groundwork template.' });
  } else if (!/github\.com/.test(remotes)) {
    signals.push({ signal: 'CI', armed: false, detail: 'CI workflow present but no GitHub remote: it never runs. Push the repo to GitHub to arm the unbypassable gate.' });
  } else {
    signals.push({ signal: 'CI', armed: true, detail: 'workflow + GitHub remote' });
  }

  // 3. Adapter suggest-hooks. The Stop hooks (progress line, handoff nudge) live in
  //    .claude/settings.json; without them the suggest layer is silent. The rulebook bridges
  //    (CLAUDE.md, .gemini) are blocking gates in check.mjs already and need no report here.
  let adapterHooks = false;
  try {
    const settings = JSON.parse(readFileSync(join(root, '.claude', 'settings.json'), 'utf8'));
    adapterHooks = Object.keys(settings.hooks || {}).length > 0;
  } catch { adapterHooks = false; }
  if (adapterHooks) {
    signals.push({ signal: 'adapter hooks', armed: true, detail: '.claude/settings.json wires the Stop hooks' });
  } else {
    signals.push({ signal: 'adapter hooks', armed: false, detail: 'Claude adapter hooks not wired (.claude/settings.json): the progress line and handoff nudge never fire.' });
  }

  // 4. The design method. Its payload is installed per project and gitignored, so a clone starts
  //    without it and nothing in the repo can tell from the files alone that it should be there.
  signals.push(designMethodSignal(root));

  return signals;
}

// One summary line naming the tier, then one fix line per degraded signal.
export function formatReport(signals) {
  const lines = [`enforcement: ${signals.map((s) => `${s.signal} ${s.armed ? 'armed' : 'NOT armed'}`).join(', ')}.`];
  for (const s of signals) {
    if (!s.armed) lines.push(`  - ${s.detail}`);
  }
  return lines;
}

// ---------------------------------------------------------------- the floor beside the signals

// The four signals above are armed or not. The floor is a different kind of fact: how much of
// this project's own code any gate actually looks at, which the four signals cannot tell you.
// A waived class passes the gate on purpose (a stated, reasoned choice beats a project lying in
// the table), so the only thing standing between a waiver and the cheap default is that it is
// visible here every time the owner runs the checks. E-02/F-01/S-03.
//
// The wording carries its own limit. "Proven" here means one thing: a workflow runs the command
// the stack file names. Nothing in this framework has looked at what that command asserts, and a
// line that let a builder believe otherwise would be the false confidence this epic exists to
// remove.
export function formatFloor(floor) {
  // No stack file is not a floor of zero. A project that has not chosen a stack has nothing to
  // report here, which is the rule the empty copy follows everywhere else.
  if (!floor) return [];
  const { proven, total, waived, open, files } = floor;
  const where = files.join(', ');
  const counted = `${proven} of the ${total} risk classes`;
  const holes = [
    waived.length ? `waives ${waived.length}` : '',
    open.length ? `leaves ${open.length} unanswered or unwired` : '',
  ].filter(Boolean).join(' and ');
  const lines = [`floor: ${where} proves ${counted} with a command CI runs`
    + `${holes ? `, and ${holes}` : ''}. `
    + 'Proven means the command runs, not that what it runs is any good.'];
  for (const w of waived) {
    lines.push(`  - ${w.cls} waived as ${w.form}: ${w.reason}`);
  }
  for (const cls of open) {
    lines.push(`  - ${cls} is answered by nothing that runs: answer it with a live command, `
      + 'or waive it in the form that is true.');
  }
  return lines;
}

// The floor for this root, or nothing when no stack is declared. One call for the CLI, so a
// caller cannot report the floor without the derivation that owns it.
export const floorFor = (root) => formatFloor(floorReport(root));
