// The adoption drill: Groundwork's brownfield route, walked over three existing repositories on
// every push. Decision 0018 names the route and says it is the one path this repo cannot dogfood;
// this walk is how it gets dogfooded. The fixtures are built by checks/adopt-fixture.mjs.
// Run: node checks/drill.mjs --adopt   (--ref <sha>, --keep, --require-walk as for the drill;
//                                      node checks/drill-adopt.mjs takes the same flags)
// Self-test: node checks/drill-adopt.test.mjs
//
// Red on purpose until phase 5 of the recovery plan (E-03/F-02/S-01). The route's steps are built
// by later packages, and each step names the one that builds it, so today's red reads as a list of
// work still to do. What must never be red is the drill itself: a fixture that does not build or a
// step that crashes is reported as a defect, with its own exit code, so "not built yet" and
// "broken" are never the same answer. Runbook: docs/operations/evidence-drill.md.

import { readFileSync, existsSync, rmSync, mkdtempSync, realpathSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { freshCopy, isFramework } from './drill.mjs';
import { FIXTURES, SENTINEL, buildFixture, fixtureProblems, git, hooksDir } from './adopt-fixture.mjs';

export const MAX_OWNER_ACTIONS = 3;
export const MAX_MS = 60_000;

// A step or check that ran and found the route wanting. Anything else thrown is a defect.
export class StepFailure extends Error {}
const must = (ok, message) => { if (!ok) throw new StepFailure(message); };
const node = (cwd, args) => spawnSync(process.execPath, args, { cwd, encoding: 'utf8' });
const sha = (path) => createHash('sha256').update(readFileSync(path)).digest('hex');
const CI = '.github/workflows/ci.yml';

// The route in the plan's order. `entry` is the file that exists once the step's package is
// built, looked up in the framework copy or in the adopted repository; while it is missing the
// step is "not built", never red. `owner` marks a step that costs the owner an action.
// The command shapes of steps not built yet are this drill's best reading of the plan; the
// package that builds a step settles its shape here in the same change.
export const ROUTE = [
  {
    id: 'assess', pkg: 'ADP-2', owner: false, entry: ['framework', 'checks/assess.mjs'],
    run(ctx) {
      const r = node(ctx.repo, [join(ctx.framework, 'checks', 'assess.mjs'), ctx.repo]);
      must(r.status === 0, `assess exited ${r.status}: ${r.stderr || r.stdout}`);
      must(git(ctx.repo, ['status', '--porcelain']).stdout === ctx.before.status,
        'assess changed the repository it was only asked to measure');
    },
  },
  {
    id: 'overlay', pkg: 'REL-1', owner: false, entry: ['framework', 'scripts/build-product.mjs'],
    run(ctx) {
      ctx.product = join(ctx.box, 'product');
      const r = node(ctx.framework, ['scripts/build-product.mjs', '--out', ctx.product]);
      must(r.status === 0, `build-product exited ${r.status}: ${r.stderr || r.stdout}`);
      must(existsSync(join(ctx.product, 'AGENTS.md')), 'the product template has no AGENTS.md');
    },
  },
  {
    id: 'init', pkg: 'AX-4a', owner: true, entry: ['product', 'checks/init.mjs'],
    run(ctx) {
      const r = node(ctx.repo, [join(ctx.product, 'checks', 'init.mjs'), '--adopt', '--apply', ctx.repo]);
      must(r.status === 0, `init --adopt exited ${r.status}: ${r.stderr || r.stdout}`);
      must(existsSync(join(ctx.repo, 'AGENTS.md')), 'init --adopt left no AGENTS.md in the repository');
    },
  },
  {
    id: 'baseline', pkg: 'ADP-3', owner: false,
    run(ctx) {
      must(existsSync(join(ctx.repo, 'checks', 'baseline.json')), 'no checks/baseline.json after init --adopt');
    },
  },
  {
    id: 'hooks', pkg: 'ADP-4', owner: false,
    run(ctx) {
      must(hooksDir(ctx.repo) === ctx.before.hooks, "the owner's hook directory was moved");
      const hook = join(ctx.before.hooks, 'pre-commit');
      must(readFileSync(hook, 'utf8').includes(SENTINEL), "the owner's own pre-commit hook is gone");
      must(readFileSync(hook, 'utf8').includes('checks/check.mjs'), "Groundwork's gate is not chained into the owner's hook");
    },
  },
  {
    id: 'commit', pkg: 'AX-4b', owner: true,
    run(ctx) {
      must(git(ctx.repo, ['add', '-A']).status === 0, 'git add failed');
      const r = git(ctx.repo, ['commit', '-q', '-m', 'chore: adopt Groundwork',
        '-m', 'Traces-to: explicit request: adoption (begin)']);
      must(r.status === 0, `the adoption commit was rejected:\n${r.stdout}${r.stderr}`);
    },
  },
];

// What an adopted repository must show, per fixture. `needs` is the route step that has to have
// passed before the check means anything; until then it is "not reached", never a vacuous ok.
const SUPPRESSION = /checks:allow-|eslint-disable|@ts-ignore|@ts-expect-error|#\s*noqa|type:\s*ignore|#pragma warning disable|SuppressMessage|nolint|NOSONAR/;
export const CHECKS = [
  {
    id: 'governed', title: 'a governed commit, history intact', needs: 'commit',
    run(ctx) {
      must(Number(git(ctx.repo, ['rev-list', '--count', 'HEAD']).stdout) === ctx.before.count + 1,
        'adoption did not add exactly one commit');
      must(git(ctx.repo, ['rev-parse', 'HEAD^']).stdout.trim() === ctx.before.head,
        "the adoption commit does not sit on the owner's history");
      const checks = node(ctx.repo, ['checks/check.mjs']);
      must(checks.status === 0, `check.mjs is red on the adopted repository:\n${checks.stdout}`);
    },
  },
  {
    id: 'suppressions', title: '0 inline suppressions added', needs: 'commit',
    run(ctx) {
      const diff = git(ctx.repo, ['diff', '--unified=0', ctx.before.head, 'HEAD', '--', ...ctx.before.files]).stdout;
      const added = diff.split('\n').filter((l) => l.startsWith('+') && !l.startsWith('+++') && SUPPRESSION.test(l));
      must(added.length === 0, `adoption added ${added.length} inline suppression(s) to the owner's files: ${added.join(' | ')}`);
    },
  },
  {
    id: 'baseline', title: 'a baseline with exactly the planted entries', needs: 'baseline',
    run(ctx) {
      const raw = JSON.parse(readFileSync(join(ctx.repo, 'checks', 'baseline.json'), 'utf8'));
      const entries = (Array.isArray(raw) ? raw : raw.entries || []).map((e) => `${e.gate} ${e.path}`).sort();
      const want = FIXTURES[ctx.name].baseline.map((e) => `${e.gate} ${e.path}`).sort();
      must(JSON.stringify(entries) === JSON.stringify(want),
        `baseline holds ${entries.length} entries [${entries.join(', ')}], expected ${want.length} [${want.join(', ')}]`);
    },
  },
  {
    id: 'sentinel', title: "the owner's own hook fired", needs: 'commit',
    run(ctx) {
      must(existsSync(join(ctx.repo, '.git', SENTINEL)), "the owner's pre-commit hook did not run on the adoption commit");
    },
  },
  {
    id: 'owner-ci', title: "the owner's ci.yml byte-identical", needs: 'commit',
    run(ctx) {
      must(existsSync(join(ctx.repo, CI)) && sha(join(ctx.repo, CI)) === ctx.before.ci, `adoption changed or removed ${CI}`);
    },
  },
  {
    id: 'owner-actions', title: `at most ${MAX_OWNER_ACTIONS} owner actions`, needs: null,
    run() {
      const count = ROUTE.filter((s) => s.owner).length;
      must(count <= MAX_OWNER_ACTIONS, `the route asks the owner ${count} times`);
      return `${count} of ${MAX_OWNER_ACTIONS}`;
    },
  },
  {
    id: 'time', title: `under ${MAX_MS / 1000} seconds`, needs: 'commit',
    run(ctx) {
      must(ctx.ms < MAX_MS, `the route took ${(ctx.ms / 1000).toFixed(1)}s`);
      return `${(ctx.ms / 1000).toFixed(1)}s`;
    },
  },
];

// The state the checks compare against, taken before any step touches the repository.
export function recordBefore(repo) {
  return {
    head: git(repo, ['rev-parse', 'HEAD']).stdout.trim(),
    count: Number(git(repo, ['rev-list', '--count', 'HEAD']).stdout),
    files: git(repo, ['ls-files']).stdout.split('\n').filter(Boolean),
    status: git(repo, ['status', '--porcelain']).stdout,
    hooks: hooksDir(repo),
    ci: sha(join(repo, CI)),
  };
}

function entryMissing(step, ctx) {
  if (!step.entry) return null;
  const [where, path] = step.entry;
  const base = { framework: ctx.framework, product: ctx.product, repo: ctx.repo }[where];
  return base && existsSync(join(base, path)) ? null : `${path} is not in the ${where}`;
}

// One fixture: build it, walk the route until a step stops, then run every check it reached.
// Returns { name, stop, defect, steps, checks }: `stop` is the step that ended the walk, `defect`
// a sentence when the drill itself is at fault.
export async function walkFixture(name, { framework, box, route = ROUTE, checks = CHECKS }) {
  const result = { name, stop: null, defect: null, steps: [], checks: [] };
  let ctx;
  try {
    const repo = buildFixture(name, box);
    const problems = fixtureProblems(repo, name);
    if (problems.length) throw new Error(`the fixture is not what it claims: ${problems.join('; ')}`);
    ctx = { name, repo, box, framework, product: null, before: recordBefore(repo) };
  } catch (error) {
    result.defect = `fixture ${name} did not build: ${error.message}`;
    return result;
  }
  const started = process.hrtime.bigint();
  const passed = new Set();
  for (const step of route) {
    const missing = entryMissing(step, ctx);
    if (missing) {
      result.steps.push({ id: step.id, state: 'not built', note: `not built (${step.pkg}): ${missing}` });
      result.stop = step.id;
      break;
    }
    try {
      await step.run(ctx);
      passed.add(step.id);
      result.steps.push({ id: step.id, state: 'ok' });
    } catch (error) {
      if (!(error instanceof StepFailure)) {
        result.defect = `step ${step.id} crashed: ${error.stack || error}`;
        return result;
      }
      result.steps.push({ id: step.id, state: 'red', note: `red (${step.pkg}): ${error.message}` });
      result.stop = step.id;
      break;
    }
  }
  ctx.ms = Number(process.hrtime.bigint() - started) / 1e6;
  for (const check of checks) {
    if (check.needs && !passed.has(check.needs)) {
      result.checks.push({ id: check.id, title: check.title, state: 'not reached' });
      continue;
    }
    try {
      const note = await check.run(ctx);
      result.checks.push({ id: check.id, title: check.title, state: 'ok', note });
    } catch (error) {
      if (!(error instanceof StepFailure)) {
        result.defect = `check ${check.id} crashed: ${error.stack || error}`;
        return result;
      }
      result.checks.push({ id: check.id, title: check.title, state: 'FAIL', note: error.message });
    }
  }
  return result;
}

// Exit codes: 0 the route is green on every fixture, 1 red where a package is still to build or
// failed its own step, 2 a defect of the drill itself.
export async function runAdoptDrill({
  ref = 'HEAD', keep = false, requireWalk = false, source, names = Object.keys(FIXTURES), route, checks,
} = {}) {
  const out = console.log;
  const { box: frameworkBox, copy: framework } = freshCopy(ref, source);
  out(`Groundwork adoption drill, ref ${ref}: red by design until the route is built (phase 5)`);
  out('');
  if (!isFramework(framework)) {
    out('This repository is a project built on Groundwork, not the framework itself; nothing to walk.');
    if (requireWalk) out('Asked to walk it anyway (--require-walk), so this counts as a failure.');
    rmSync(frameworkBox, { recursive: true, force: true });
    return { code: requireWalk ? 2 : 0, skipped: true, results: [] };
  }
  const box = realpathSync(mkdtempSync(join(tmpdir(), 'groundwork-adopt-')));
  const results = [];
  for (const name of names) {
    const r = await walkFixture(name, { framework, box, route, checks });
    results.push(r);
    out(name);
    for (const s of r.steps) out(`  ${s.state === 'ok' ? 'ok  ' : 'STOP'}  ${s.id}${s.note ? `  ${s.note}` : ''}`);
    for (const c of r.checks) out(`  ${c.state.padEnd(11)}  ${c.title}${c.note ? `  (${c.note})` : ''}`);
    if (r.defect) out(`  DEFECT  ${r.defect}`);
  }
  out('');
  const defects = results.filter((r) => r.defect);
  const red = results.filter((r) => r.stop || r.checks.some((c) => c.state !== 'ok'));
  let code = 0;
  if (defects.length) {
    code = 2;
    out(`DEFECT in the drill itself on ${defects.map((r) => r.name).join(', ')}: fix the drill, not the route.`);
  } else if (red.length) {
    code = 1;
    const stops = [...new Set(results.map((r) => r.steps.at(-1)?.note).filter(Boolean))];
    out(`RED, as expected until phase 5: ${stops.join('; ')}`);
  } else {
    out(`PASSED: ${results.length} existing repositories adopted Groundwork through the route.`);
  }
  if (keep || defects.length) out(`The fixtures are kept at ${box}`);
  else rmSync(box, { recursive: true, force: true });
  rmSync(frameworkBox, { recursive: true, force: true });
  return { code, skipped: false, results };
}

if (process.argv[1] && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))) {
  const args = process.argv.slice(2);
  const refAt = args.indexOf('--ref');
  const { code } = await runAdoptDrill({
    ref: refAt === -1 ? 'HEAD' : args[refAt + 1],
    keep: args.includes('--keep'),
    requireWalk: args.includes('--require-walk'),
  });
  process.exit(code);
}
