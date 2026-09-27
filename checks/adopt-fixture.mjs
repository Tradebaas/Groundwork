// Three small existing repositories, built fresh on every run, that look like what an adopter
// actually brings to Groundwork: a history, their own hooks, their own agent file, their own CI,
// one file far over the length cap, em dashes in the prose, gitignored build output, and a secret
// that was committed once and then removed. The adoption drill (checks/drill-adopt.mjs) walks
// Groundwork's brownfield route over each of them; checks/drill-adopt.test.mjs proves they are
// what this file says.
//
// Why built by code and not stored as trees: stored as files, the em dashes and the 600-line file
// would turn this repository's own prose and length gates red, and an exclusion that names
// checks/ is refused by config-invariants. The history has to be built at run time anyway, and
// building it here keeps every fixture reproducible from this one file.

import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, existsSync, statSync, realpathSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { gitEnv } from './drill.mjs';

// Assembled from parts so no key-shaped literal sits in tracked source for a scanner or for push
// protection to find. In a fixture's history it is a whole AWS access key id, as a scanner sees it.
export const PLANTED_SECRET = ['AKIA', 'Z3GR', 'OUND', 'W0RK', 'DR1L'].join('');

// The file the owner's own hook appends to inside .git, so proving it fired dirties no tree.
export const SENTINEL = 'owner-sentinel';
export const BIG_FILE_LINES = 600;
const DASH = '—';
const IGNORED = ['bin', 'obj', '.venv'];

const OWNER_HOOK = `#!/bin/sh
# The owner's own pre-commit hook. In the real repository it runs their linter; here it leaves a
# sentinel, so the drill can prove adoption kept it running.
echo pre-commit >> "$(git rev-parse --git-dir)/${SENTINEL}"
`;

const ciYml = (steps) => `name: ci
on: [push, pull_request]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
${steps.map((s) => `      - run: ${s}`).join('\n')}
`;

const readme = (name, what) => `# ${name}

${what} ${DASH} maintained by a small team since 2023.
Run the tests before you push ${DASH} CI runs them again anyway.
`;

const claudeMd = (tool) => `# Notes for Claude

- Run \`${tool}\` before proposing a commit.
- Keep changes small and explain them in the pull request.
`;

// Exactly BIG_FILE_LINES lines, plain code with no marker any gate reads besides its length.
function bigFile(open, row, close) {
  const body = [];
  for (let i = 1; body.length < BIG_FILE_LINES - open.length - close.length; i++) body.push(row(i));
  return [...open, ...body, ...close].join('\n') + '\n';
}

// Per fixture: where the owner's hook lives (null: .git/hooks, the way `pre-commit install`
// leaves it), the planted files, and the file over the length cap.
export const FIXTURES = {
  'ts-react': {
    hooksPath: '.husky',
    bigFile: 'src/legacy/Dashboard.tsx',
    secretFile: '.env',
    files: {
      'package.json': '{\n  "name": "ts-react-app",\n  "private": true,\n  "scripts": { "test": "vitest run" }\n}\n',
      'src/App.tsx': 'export function App() {\n  return <h1>Orders</h1>;\n}\n',
      'README.md': readme('ts-react-app', 'An order dashboard'),
      'CLAUDE.md': claudeMd('npm test'),
      '.github/workflows/ci.yml': ciYml(['npm ci', 'npm test']),
    },
    big: () => bigFile(['// Legacy dashboard, generated once and edited by hand since.'],
      (i) => `export const row${i} = (n: number): number => n + ${i};`, []),
  },
  dotnet: {
    hooksPath: '.githooks',
    bigFile: 'src/Legacy/ReportBuilder.cs',
    secretFile: 'src/appsettings.Development.json',
    files: {
      'src/App.csproj': '<Project Sdk="Microsoft.NET.Sdk">\n  <PropertyGroup><TargetFramework>net8.0</TargetFramework></PropertyGroup>\n</Project>\n',
      'src/Program.cs': 'System.Console.WriteLine("reports");\n',
      'README.md': readme('Reports', 'A reporting service'),
      'CLAUDE.md': claudeMd('dotnet test'),
      '.github/workflows/ci.yml': ciYml(['dotnet build', 'dotnet test']),
    },
    big: () => bigFile(['namespace Reports.Legacy;', 'public static class ReportBuilder', '{'],
      (i) => `    public static int Row${i}(int n) => n + ${i};`, ['}']),
  },
  python: {
    hooksPath: null,
    bigFile: 'app/legacy/report.py',
    secretFile: 'app/settings_local.py',
    files: {
      'pyproject.toml': '[project]\nname = "ledger"\nversion = "0.4.0"\n',
      'app/__init__.py': '',
      'README.md': readme('ledger', 'A small ledger API'),
      'CLAUDE.md': claudeMd('pytest'),
      '.github/workflows/ci.yml': ciYml(['pip install -e .', 'pytest']),
    },
    big: () => bigFile(['"""Legacy report module."""'], (i) => `ROW_${i} = ${i}`, []),
  },
};

// The baseline an honest adoption records for every fixture: the em dashes in README.md and the
// one file over the length cap, one entry per gate and path, and nothing else.
for (const spec of Object.values(FIXTURES)) {
  spec.baseline = [{ gate: 'prose-style', path: 'README.md' }, { gate: 'code-file-cap', path: spec.bigFile }];
}

const run = (repo, cmd, args) => spawnSync(cmd, args, { cwd: repo, encoding: 'utf8', env: gitEnv(repo) });
export const git = (repo, args) => run(repo, 'git', args);

function put(repo, path, content, mode) {
  mkdirSync(dirname(join(repo, path)), { recursive: true });
  writeFileSync(join(repo, path), content, mode ? { mode } : undefined);
}

function commit(repo, message) {
  const added = git(repo, ['add', '-A']);
  const made = git(repo, ['commit', '-q', '-m', message]);
  if (added.status !== 0 || made.status !== 0) {
    throw new Error(`fixture commit "${message}" failed: ${added.stderr}${made.stderr}`);
  }
}

// The owner's hook directory, resolved the way git resolves it.
export function hooksDir(repo) {
  const path = git(repo, ['config', '--get', 'core.hooksPath']).stdout.trim();
  return path ? join(repo, path) : join(repo, '.git', 'hooks');
}

// Builds one fixture under `parent` and returns the repository's path. The history is written
// before the owner's hook is wired, so the sentinel is absent until something commits after it.
export function buildFixture(name, parent = realpathSync(mkdtempSync(join(tmpdir(), 'groundwork-adopt-')))) {
  const spec = FIXTURES[name];
  if (!spec) throw new Error(`no fixture named "${name}"`);
  const repo = join(parent, name);
  mkdirSync(repo, { recursive: true });
  const init = git(repo, ['init', '-q', '-b', 'main']);
  if (init.status !== 0) throw new Error(`git init failed: ${init.stderr}`);

  for (const [path, content] of Object.entries(spec.files)) put(repo, path, content);
  put(repo, '.gitignore', `${IGNORED.map((d) => `${d}/`).join('\n')}\n`);
  if (spec.hooksPath) put(repo, `${spec.hooksPath}/pre-commit`, OWNER_HOOK, 0o755);
  commit(repo, 'Initial commit');
  put(repo, spec.secretFile, `AWS_ACCESS_KEY_ID=${PLANTED_SECRET}\n`);
  commit(repo, 'Add local settings');
  rmSync(join(repo, spec.secretFile));
  commit(repo, 'Remove local settings from the repo');
  put(repo, spec.bigFile, spec.big());
  commit(repo, 'Add the legacy report');

  if (spec.hooksPath) git(repo, ['config', 'core.hooksPath', spec.hooksPath]);
  else put(repo, '.git/hooks/pre-commit', OWNER_HOOK, 0o755);
  for (const dir of IGNORED) put(repo, `${dir}/build-output.txt`, 'generated\n');
  return repo;
}

// What is wrong with a fixture, as a list of sentences; empty means it is what this file claims.
// The drill runs this before walking, so a broken fixture is reported as a defect of the drill
// rather than as a step of the route that failed.
export function fixtureProblems(repo, name) {
  const spec = FIXTURES[name];
  const problems = [];
  const at = (path) => join(repo, path);
  const hook = join(hooksDir(repo), 'pre-commit');
  if (!existsSync(hook) || !(statSync(hook).mode & 0o111)) problems.push(`no executable owner pre-commit hook at ${hook}`);
  else if (!readFileSync(hook, 'utf8').includes(SENTINEL)) problems.push('the owner pre-commit hook leaves no sentinel');
  if (existsSync(at(`.git/${SENTINEL}`))) problems.push('the sentinel already exists, so it cannot prove a later commit ran the hook');
  for (const own of ['CLAUDE.md', '.github/workflows/ci.yml']) {
    if (!existsSync(at(own))) problems.push(`no ${own} of the owner's own`);
  }
  const big = existsSync(at(spec.bigFile)) ? readFileSync(at(spec.bigFile), 'utf8').split('\n').length - 1 : 0;
  if (big !== BIG_FILE_LINES) problems.push(`${spec.bigFile} has ${big} lines, not ${BIG_FILE_LINES} lines`);
  const dashed = existsSync(at('README.md')) ? readFileSync(at('README.md'), 'utf8').split('\n').filter((l) => l.includes(DASH)).length : 0;
  if (dashed !== 2) problems.push(`README.md has ${dashed} lines with an em dash, not 2`);
  for (const dir of IGNORED) {
    const ignored = git(repo, ['check-ignore', '-q', `${dir}/build-output.txt`]).status === 0;
    if (!existsSync(at(dir)) || !ignored) problems.push(`${dir}/ is not on disk and gitignored`);
  }
  const touched = git(repo, ['log', '--format=%H', '-G', PLANTED_SECRET, 'HEAD']).stdout.split('\n').filter(Boolean);
  if (touched.length < 2) problems.push('no secret that was committed and later removed in the history');
  if (git(repo, ['grep', '-q', PLANTED_SECRET, 'HEAD']).status === 0 || existsSync(at(spec.secretFile))) {
    problems.push('the secret is still in the current tree');
  }
  if (git(repo, ['status', '--porcelain']).stdout !== '') problems.push('the working tree is not clean');
  return problems;
}
