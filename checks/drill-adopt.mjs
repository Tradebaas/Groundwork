// The adoption drill: Groundwork's brownfield route, walked over three existing repositories on
// every push. Decision 0018 names the entry to that route, `init --adopt` plus `begin`, and says
// the brownfield path is the one this repo cannot dogfood; this walk is how it gets dogfooded.
// The fixtures are built by checks/drill-adopt-fixture.mjs; what both drills share is in
// checks/drill-core.mjs.
// Run: node checks/drill.mjs --adopt   (--ref <sha>, --keep, --require-walk as for the drill)
// Self-test: node checks/drill-adopt.test.mjs
//
// Red by design until the route is built (E-03/F-02/S-01). Each step names the package that builds
// it, so today's report reads as the work still to do, and the exit code keeps four answers apart:
// 0 the route is green, 3 only steps not built yet stand between it and green, 1 something that
// is built fails, 2 the drill itself is broken (a fixture that did not build, a crash).
// Runbook: docs/operations/evidence-drill.md.

import { readFileSync, writeFileSync, existsSync, rmSync, mkdtempSync, realpathSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { FIRST_COMMIT, freshCopy, isFramework, git, node } from './drill-core.mjs';
import { FIXTURES, PLANTED_SECRET, SENTINEL, buildFixture, fixtureProblems, hooksDir } from './drill-adopt-fixture.mjs';

export const MAX_OWNER_ACTIONS = 3;
export const MAX_MS = 60_000;
export const EXIT = { green: 0, red: 1, defect: 2, notBuilt: 3 };

// A step or check that ran and found the route wanting. Anything else thrown is a defect.
export class StepFailure extends Error {}
const must = (ok, message) => { if (!ok) throw new StepFailure(message); };
const sha = (path) => createHash('sha256').update(readFileSync(path)).digest('hex');
const CI = '.github/workflows/ci.yml';
const PROBE = 'drill-probe.md';
const count = (repo) => Number(git(repo, ['rev-list', '--count', 'HEAD']).stdout);
const head = (repo) => git(repo, ['rev-parse', 'HEAD']).stdout.trim();
const sentinelLines = (repo) => {
  const path = join(repo, '.git', SENTINEL);
  return existsSync(path) ? readFileSync(path, 'utf8').split('\n').filter(Boolean).length : 0;
};

// What the route produces is read the way a step reads it, so a missing or broken file is the
// route's red and never the drill's crash.
function readFrom(path, what) {
  must(existsSync(path), `${what} is missing`);
  return readFileSync(path, 'utf8');
}

// What counts as an inline suppression: the comment ban in the framework's own checks/config.json,
// the one list the gates enforce, plus what that ban does not list: forms that are not comments
// (a pragma, an attribute), Groundwork's own escape markers, which the gates allow and adoption must
// not add, and two comment forms the ban lacks today.
const EXTRA_SUPPRESSIONS = ['checks:allow-', '#pragma warning disable', 'SuppressMessage', '@ts-expect-error', 'NOSONAR'];
export function suppressionPattern(framework) {
  const config = JSON.parse(readFileSync(join(framework, 'checks', 'config.json'), 'utf8'));
  const bans = (config.commentBans || []).filter((b) => new RegExp(b.pattern, 'i').test('eslint-disable'));
  if (!bans.length) throw new Error('checks/config.json carries no suppression ban for this drill to read');
  const extra = EXTRA_SUPPRESSIONS.map((s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  return new RegExp([...bans.map((b) => b.pattern), ...extra].join('|'), 'i');
}

// The route, in the plan's order. Each step names the package that builds it (`pkg`), whether that
// package has landed (`built`, which that package flips in the change that builds it), the file
// that exists once it has (`entry`, in the framework copy, the product or the repository), the
// steps it needs, and whether it costs the owner an action. A step not built is reported and never
// run. Its entry existing while it is still marked not built, or missing while it is marked built,
// is red, so the flag and the tree cannot drift apart unnoticed.
// defer: the command shapes of steps not built yet are this drill's reading of the plan. ceiling: a
// package whose real interface differs sees its step red for the drill's guess, not for its own
// work. upgrade-when: the package that builds a step replaces the guess and flips `built` in the
// same change; REL-1 moves the product build into the helper both drills share.
export const ROUTE = [
  {
    id: 'assess', pkg: 'ADP-2', built: false, owner: false, needs: [], entry: ['framework', 'checks/assess.mjs'],
    run(ctx) {
      const r = node(ctx.repo, [join(ctx.framework, 'checks', 'assess.mjs'), ctx.repo]);
      must(r.status === 0, `assess exited ${r.status}: ${r.stderr || r.stdout}`);
      must(head(ctx.repo) === ctx.before.head
        && git(ctx.repo, ['status', '--porcelain', '--untracked-files=no']).stdout === '',
      'assess changed a tracked file of the repository it was only asked to measure');
    },
  },
  {
    id: 'overlay', pkg: 'REL-1, REL-4', built: false, owner: false, needs: [], entry: ['framework', 'scripts/build-product.mjs'],
    // Until a product is built from a manifest, an adopter copies the framework's tracked snapshot
    // over their repository (README), and the walk goes on with that same copy.
    fallback(ctx) {
      ctx.product = ctx.framework;
      return 'walking on with the tracked snapshot, the copy adopters take today';
    },
    run(ctx) {
      ctx.product = join(ctx.box, `${ctx.name}-product`);
      const r = node(ctx.framework, ['scripts/build-product.mjs', '--dev', '--out', ctx.product]);
      must(r.status === 0, `build-product exited ${r.status}: ${r.stderr || r.stdout}`);
      must(existsSync(join(ctx.product, 'AGENTS.md')), 'the product has no AGENTS.md');
    },
  },
  {
    id: 'init', pkg: 'AX-4a', built: false, owner: true, needs: ['overlay'], entry: ['product', 'checks/init.mjs'],
    run(ctx) {
      const r = node(ctx.repo, [join(ctx.product, 'checks', 'init.mjs'), '--adopt', '--apply', ctx.repo]);
      must(r.status === 0, `init --adopt exited ${r.status}: ${r.stderr || r.stdout}`);
      must(existsSync(join(ctx.repo, 'AGENTS.md')), 'init --adopt left no AGENTS.md in the repository');
    },
  },
  {
    id: 'baseline', pkg: 'ADP-3, AX-4b', built: false, owner: false, needs: ['init'],
    run(ctx) {
      must(existsSync(join(ctx.repo, 'checks', 'baseline.json')), 'no checks/baseline.json after init --adopt');
    },
  },
  {
    // The chain is proven by what it does: a staged file that breaks a gate is refused, and the
    // refusal names that file, so a refusal for any other reason does not count.
    id: 'hooks', pkg: 'ADP-4, AX-4b', built: false, owner: false, needs: ['init'],
    run(ctx) {
      writeFileSync(join(ctx.repo, PROBE), 'A probe — the prose gate refuses this line.\n');
      git(ctx.repo, ['add', PROBE]);
      const r = git(ctx.repo, ['commit', '-q', '-m', FIRST_COMMIT[0], '-m', FIRST_COMMIT[1]]);
      if (r.status === 0) git(ctx.repo, ['reset', '-q', '--soft', 'HEAD~1']);
      git(ctx.repo, ['rm', '-q', '--cached', PROBE]);
      rmSync(join(ctx.repo, PROBE));
      must(r.status !== 0, `a staged ${PROBE} that breaks the prose gate was committed: Groundwork's pre-commit gate is not in the chain`);
      must(`${r.stdout}${r.stderr}`.includes(PROBE), `the probe commit was refused for another reason:\n${r.stdout}${r.stderr}`);
    },
  },
  {
    id: 'commit', pkg: 'AX-4b', built: true, owner: true, needs: ['init', 'baseline', 'hooks'],
    run(ctx) {
      ctx.sentinelBefore = sentinelLines(ctx.repo);
      must(git(ctx.repo, ['add', '-A']).status === 0, 'git add failed');
      const r = git(ctx.repo, ['commit', '-q', '-m', FIRST_COMMIT[0], '-m', FIRST_COMMIT[1]]);
      must(r.status === 0, `the adoption commit was rejected:\n${r.stdout}${r.stderr}`);
    },
  },
];

// What an adopted repository must show, per fixture: the plan's seven, plus the assessment report
// and the DEBT rows its criterion B1 names. `needs` is the step that has to have passed first;
// until then a check is "not reached", never a vacuous ok. `pkg` is who turns it green.
export const CHECKS = [
  {
    id: 'governed', title: "a governed commit on the owner's history", pkg: 'AX-4b', needs: 'commit',
    run(ctx) {
      must(count(ctx.repo) === ctx.before.count + 1, 'adoption did not add exactly one commit');
      must(git(ctx.repo, ['rev-parse', 'HEAD^']).stdout.trim() === ctx.before.head,
        "the adoption commit does not sit on the owner's history");
      const wip = git(ctx.repo, ['commit', '-q', '--allow-empty', '-m', 'wip']);
      must(wip.status !== 0 && count(ctx.repo) === ctx.before.count + 1,
        'an ungoverned commit (no type, no trace) was accepted: the message gate is not armed');
      const checks = node(ctx.repo, ['checks/check.mjs']);
      must(checks.status === 0, `check.mjs is red on the adopted repository:\n${checks.stdout}${checks.stderr}`);
    },
  },
  {
    id: 'assessment', title: 'an assessment report that names the removed secret', pkg: 'ADP-2', needs: 'commit',
    run(ctx) {
      const reports = git(ctx.repo, ['ls-files', 'docs/state/log']).stdout.split('\n').filter((f) => f.endsWith('-assessment.md'));
      must(reports.length === 1, `expected one committed assessment report in docs/state/log/, found ${reports.length}`);
      const text = readFrom(join(ctx.repo, reports[0]), reports[0]);
      const { secretFile } = FIXTURES[ctx.name];
      must(text.includes(secretFile), `the report does not name ${secretFile}, where a secret sat in the history`);
      must(!text.includes(PLANTED_SECRET), 'the report repeats the secret itself');
    },
  },
  {
    id: 'suppressions', title: "no inline suppression added to the owner's files", pkg: 'ADP-3', needs: 'commit',
    run(ctx) {
      const pattern = suppressionPattern(ctx.framework);
      const diff = git(ctx.repo, ['diff', '--unified=0', ctx.before.head, 'HEAD', '--', ...ctx.before.files]).stdout;
      const added = diff.split('\n').filter((l) => l.startsWith('+') && !l.startsWith('+++') && pattern.test(l));
      must(added.length === 0, `adoption added ${added.length} inline suppression(s) to the owner's files: ${added.join(' | ')}`);
    },
  },
  {
    id: 'baseline', title: 'a baseline with exactly the planted entries', pkg: 'ADP-3', needs: 'baseline',
    run(ctx) {
      const text = readFrom(join(ctx.repo, 'checks', 'baseline.json'), 'checks/baseline.json');
      let raw;
      try { raw = JSON.parse(text); } catch (error) { throw new StepFailure(`checks/baseline.json is not JSON: ${error.message}`); }
      const list = Array.isArray(raw) ? raw : raw?.entries;
      must(Array.isArray(list), 'checks/baseline.json holds no list of entries');
      const entries = list.map((e) => `${e?.gate} ${e?.path}`).sort();
      const want = FIXTURES[ctx.name].baseline.map((e) => `${e.gate} ${e.path}`).sort();
      must(JSON.stringify(entries) === JSON.stringify(want),
        `baseline holds ${entries.length} entries [${entries.join(', ')}], expected ${want.length} [${want.join(', ')}]`);
    },
  },
  {
    id: 'debt', title: 'a DEBT row for each baselined gate', pkg: 'ADP-3', needs: 'commit',
    run(ctx) {
      const debt = readFrom(join(ctx.repo, 'docs', 'state', 'DEBT.md'), 'docs/state/DEBT.md');
      const missing = [...new Set(FIXTURES[ctx.name].baseline.map((e) => e.gate))].filter((g) => !debt.includes(g));
      must(missing.length === 0, `docs/state/DEBT.md has no row for ${missing.join(', ')}`);
    },
  },
  {
    id: 'sentinel', title: "the owner's own hook ran on the adoption commit", pkg: 'ADP-4', needs: 'commit',
    run(ctx) {
      must(sentinelLines(ctx.repo) > (ctx.sentinelBefore ?? 0), "the owner's pre-commit hook did not run on the adoption commit");
    },
  },
  {
    id: 'owner-ci', title: "the owner's ci.yml byte-identical", pkg: 'ADP-4', needs: 'commit',
    run(ctx) {
      must(existsSync(join(ctx.repo, CI)) && sha(join(ctx.repo, CI)) === ctx.before.ci, `adoption changed or removed ${CI}`);
    },
  },
  {
    id: 'owner-actions', title: `at most ${MAX_OWNER_ACTIONS} owner actions`, pkg: 'AX-4a, AX-4b', needs: 'commit',
    // defer: counted from this route's own flags. ceiling: a real init that asks the owner more
    // often than its step's flag says still passes. upgrade-when: init --adopt prints its plan
    // (AX-4a); count the owner's prompts from that instead.
    run(ctx) {
      const asked = (ctx.route || ROUTE).filter((s) => s.owner).length;
      must(asked <= MAX_OWNER_ACTIONS, `the route asks the owner ${asked} times`);
      return `${asked} of ${MAX_OWNER_ACTIONS}`;
    },
  },
  {
    id: 'time', title: `under ${MAX_MS / 1000} seconds`, pkg: 'AX-4b', needs: 'commit',
    run(ctx) {
      must(ctx.ms < MAX_MS, `the route took ${(ctx.ms / 1000).toFixed(1)}s`);
      return `${(ctx.ms / 1000).toFixed(1)}s`;
    },
  },
];

// The state the checks compare against, taken before any step touches the repository.
export function recordBefore(repo) {
  return {
    head: head(repo),
    count: count(repo),
    files: git(repo, ['ls-files']).stdout.split('\n').filter(Boolean),
    hooks: hooksDir(repo),
    ci: sha(join(repo, CI)),
  };
}

const PLACES = { framework: 'framework copy', product: 'product', repo: 'repository' };
function entryOf(step, ctx) {
  if (!step.entry) return null;
  const [place, path] = step.entry;
  const base = { framework: ctx.framework, product: ctx.product, repo: ctx.repo }[place];
  return { path, where: PLACES[place], present: Boolean(base) && existsSync(join(base, path)) };
}

// One fixture: build it, walk every step it can, then run every check it reached. Returns
// { name, defect, steps, checks }, where `defect` is a sentence when the drill itself is at fault.
export async function walkFixture(name, { framework, box, route = ROUTE, checks = CHECKS }) {
  const result = { name, defect: null, steps: [], checks: [] };
  let ctx;
  try {
    const repo = buildFixture(name, box);
    const problems = fixtureProblems(repo, name);
    if (problems.length) throw new Error(`the fixture is not what it claims: ${problems.join('; ')}`);
    ctx = { name, repo, box, framework, route, product: null, before: recordBefore(repo) };
  } catch (error) {
    result.defect = `fixture ${name} did not build: ${error.message}`;
    return result;
  }
  const started = process.hrtime.bigint();
  const passed = new Set();
  const report = (step, state, note) => result.steps.push({ id: step.id, pkg: step.pkg, state, note });
  for (const step of route) {
    const entry = entryOf(step, ctx);
    if (!step.built) {
      if (entry?.present) {
        report(step, 'red', `: ${entry.path} is in the ${entry.where}, but the step is still marked not built: flip it in the change that built it`);
        continue;
      }
      const where = entry ? `: ${entry.path} is not in the ${entry.where}` : '';
      const fallback = step.fallback ? `; ${step.fallback(ctx)}` : '';
      if (step.fallback) passed.add(step.id);
      report(step, 'not built', `${where}${fallback}`);
      continue;
    }
    const waits = (step.needs || []).filter((id) => !passed.has(id));
    if (waits.length) { report(step, 'not reached', `: waits for ${waits.join(', ')}`); continue; }
    if (entry && !entry.present) { report(step, 'red', `: ${entry.path} is gone from the ${entry.where}, though the step is marked built`); continue; }
    try {
      await step.run(ctx);
      passed.add(step.id);
      report(step, 'ok', '');
    } catch (error) {
      if (!(error instanceof StepFailure)) {
        result.defect = `step ${step.id} crashed: ${error.stack || error}`;
        return result;
      }
      report(step, 'red', `: ${error.message}`);
    }
  }
  ctx.ms = Number(process.hrtime.bigint() - started) / 1e6;
  for (const check of checks) {
    const entry = { id: check.id, title: check.title, pkg: check.pkg };
    if (check.needs && !passed.has(check.needs)) { result.checks.push({ ...entry, state: 'not reached' }); continue; }
    try {
      const note = await check.run(ctx);
      result.checks.push({ ...entry, state: 'ok', note });
    } catch (error) {
      if (!(error instanceof StepFailure)) {
        result.defect = `check ${check.id} crashed: ${error.stack || error}`;
        return result;
      }
      result.checks.push({ ...entry, state: 'FAIL', note: error.message });
    }
  }
  return result;
}

// The exit code for a set of fixture results; see the header for what each one means.
export function verdict(results) {
  if (results.some((r) => r.defect)) return EXIT.defect;
  const all = results.flatMap((r) => [...r.steps, ...r.checks]);
  if (all.some((x) => x.state === 'red' || x.state === 'FAIL')) return EXIT.red;
  return all.every((x) => x.state === 'ok') ? EXIT.green : EXIT.notBuilt;
}

export async function runAdoptDrill({
  ref = 'HEAD', keep = false, requireWalk = false, source, names = Object.keys(FIXTURES), route, checks,
} = {}) {
  const out = console.log;
  out(`Groundwork adoption drill, ref ${ref}: red by design until the adoption route is built`);
  out('');
  let frameworkBox, framework;
  try {
    ({ box: frameworkBox, copy: framework } = freshCopy(ref, source));
  } catch (error) {
    out(`DEFECT: no framework copy to walk from: ${error.message}`);
    return { code: EXIT.defect, skipped: false, results: [] };
  }
  if (!isFramework(framework)) {
    out('This repository is a project built on Groundwork, not the framework itself; nothing to walk.');
    if (requireWalk) out('Asked to walk it anyway (--require-walk), so this counts as a failure.');
    rmSync(frameworkBox, { recursive: true, force: true });
    return { code: requireWalk ? EXIT.defect : EXIT.green, skipped: true, results: [] };
  }
  const box = realpathSync(mkdtempSync(join(tmpdir(), 'groundwork-adopt-')));
  const results = [];
  for (const name of names) {
    const r = await walkFixture(name, { framework, box, route, checks });
    results.push(r);
    out(name);
    for (const s of r.steps) out(`  ${s.state.padEnd(11)}  ${s.id.padEnd(8)}  (${s.pkg})${s.note}`);
    for (const c of r.checks) out(`  ${c.state.padEnd(11)}  ${c.title}  (${c.pkg})${c.note ? `: ${c.note}` : ''}`);
    if (r.defect) out(`  DEFECT       ${r.defect}`);
  }
  out('');
  const code = verdict(results);
  const named = (state) => [...new Set(results.flatMap((r) => [...r.steps, ...r.checks])
    .filter((x) => x.state === state).map((x) => `${x.id} (${x.pkg})`))].join(', ');
  if (code === EXIT.defect) {
    out(`DEFECT in the drill itself on ${results.filter((r) => r.defect).map((r) => r.name).join(', ')}: fix the drill, not the route.`);
  } else if (code === EXIT.red) {
    out(`RED, something built fails: ${[named('red'), named('FAIL')].filter(Boolean).join(', ')}.`);
  } else if (code === EXIT.notBuilt) {
    out(`EXPECTED RED, and nothing built fails. Not built yet: ${named('not built')}.`);
  } else {
    out(`PASSED: ${results.length} existing repositories adopted Groundwork through the route.`);
  }
  if (keep || code === EXIT.defect) out(`The fixtures are kept at ${box}`);
  else rmSync(box, { recursive: true, force: true });
  rmSync(frameworkBox, { recursive: true, force: true });
  return { code, skipped: false, results, box };
}
