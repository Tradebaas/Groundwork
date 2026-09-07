#!/usr/bin/env node
// Self-test for checks/check-stack.mjs: the gate that asks whether this project's own quality
// gates are armed. It must fire on the window it exists for (a stack chosen, the workflow's
// placeholder stage untouched) and stay quiet everywhere else, above all on a fresh copy that
// has not chosen a stack yet: an untested gate is false confidence (decision 0005).
// Run: node checks/check-stack.test.mjs

import assert from 'node:assert/strict';
import { expectClean, expectFail, floorCase, report } from './check-fixture.mjs';

// The manifest row keeps docs-manifest quiet, so only the gate under test speaks.
const manifest = '# manifest\n\n| `state/STATE.md` | LIVE | state |\n| `standards/**` | LIVE | standards |\n';
// A filled floor table, shaped the way docs/standards/TEMPLATE-STACK.md shapes it. The argument
// overrides one or more classes, so a test can say exactly which shape it is about.
const floor = (rows = {}) => {
  const base = {
    builds: ['command', '`npm run build`'],
    behaves: ['command', '`npm test`'],
    analyzed: ['command', '`npm run lint`'],
    dependencies: ['command', '`npm audit`'],
    secrets: ['not applicable', 'no product code here yet'],
    renders: ['not applicable', 'this project ships no interface'],
    ...rows,
  };
  const body = Object.entries(base)
    .map(([cls, [form, answer]]) => `| \`${cls}\` | the risk | ${form} | ${answer} |`).join('\n');
  return ['# TypeScript', '', '- Platform: no', '', '## The floor', '',
    '| Class | The risk it covers | Form | Answer |', '|---|---|---|---|', body, '', '## Notes', ''].join('\n');
};

// A stack is chosen, and its floor is answered in a way ARMED_CI below satisfies: one live
// command, the rest waived with a reason. Before S-02 this fixture carried no floor table at all,
// which the gate now reads as a contract that is absent rather than merely unfilled.
const stack = ({ put }) => {
  put('docs/README.md', manifest);
  put('docs/standards/typescript.md', floor({
    builds: ['not applicable', 'nothing to assemble in this fixture'],
    behaves: ['not applicable', 'no product code in this fixture'],
    analyzed: ['command', '`npm run typecheck`'],
    dependencies: ['not applicable', 'no dependencies in this fixture'],
  }));
};

const PLACEHOLDER_CI = `name: ci
jobs:
  gate:
    steps:
      - name: Groundwork checks
        run: node checks/check.mjs

      # --- Stack gates (added by the \`stack\` skill) ---
      # - name: Typecheck
      # - name: Tests
`;

const ARMED_CI = `name: ci
jobs:
  gate:
    steps:
      - name: Groundwork checks
        run: node checks/check.mjs
      - name: Typecheck
        run: npm run typecheck
`;

// The window this gate exists for: a stack is chosen and CI still checks nothing of its code.
expectFail('stack-gates', (fx) => {
  stack(fx);
  fx.put('.github/workflows/ci.yml', PLACEHOLDER_CI);
});

// A fresh copy ships those same placeholders and must still pass. If this one ever goes red,
// every new project starts on a red gate for a stack it has not picked yet.
expectClean('stack-gates-quiet-before-a-stack', ({ put }) =>
  put('.github/workflows/ci.yml', PLACEHOLDER_CI));

// GLOBAL.md is the cross-stack floor, which every copy carries from the start. It is not a
// stack, so its presence alone must not arm this gate.
expectClean('stack-gates-floor-is-not-a-stack', ({ put }) => {
  put('docs/README.md', manifest);
  put('docs/standards/GLOBAL.md', '# the cross-stack floor\n');
  put('.github/workflows/ci.yml', PLACEHOLDER_CI);
});

expectClean('stack-gates-armed', (fx) => {
  stack(fx);
  fx.put('.github/workflows/ci.yml', ARMED_CI);
});

// `stack` section 3 allows another CI host, and a project on GitLab must not be failed here for
// not being on GitHub. Until S-04 that was proven by the gate saying nothing at all, which also
// let a project claim a command no host ran; now it is proven by the gate reading GitLab's file.
expectClean('stack-gates-another-ci-host', (fx) => {
  stack(fx);
  fx.put('.gitlab-ci.yml', 'stages:\n  - test\ntypecheck:\n  script: npm run typecheck\n');
});

// The same project with no pipeline on any host: the command it claims is proven by nothing, and
// saying so is what stops the gate and the floor line disagreeing about it.
expectFail('stack-gates', stack);

// --- The design half: the detector counts as wired only when a workflow runs it -------------

const DESIGN_CONFIG = JSON.stringify({ detector: { ignoreRules: [], ignoreFiles: [], ignoreValues: [] } });
const design = ({ put }) => put('.impeccable/config.json', DESIGN_CONFIG);

const detectStep = '      - name: Design detector\n        run: npx -y impeccable@latest detect index.html\n';

// A project that judges its interface with the design method, and a CI run that never looks at
// what that interface renders. This is the window the design half exists for.
expectFail('stack-gates', (fx) => {
  design(fx);
  fx.put('.github/workflows/ci.yml', ARMED_CI);
});

// The evidence rule, stated as a test: a stage that is only talked about is not a stage. Without
// this one the gate would accept the placeholder it was written to refuse.
expectFail('stack-gates', (fx) => {
  design(fx);
  fx.put('.github/workflows/ci.yml', `${ARMED_CI}      # - name: Design detector\n      #   run: npx impeccable detect index.html\n`);
});

// Wired for real, and the gate goes quiet.
expectClean('stack-gates-detector-wired', (fx) => {
  design(fx);
  fx.put('.github/workflows/ci.yml', ARMED_CI + detectStep);
});

// A copy that has not stood up the design method has no config to declare one, and must not be
// failed for missing a scan of an interface it does not have.
expectClean('stack-gates-quiet-without-the-design-method', ({ put }) =>
  put('.github/workflows/ci.yml', ARMED_CI));

// The two halves are independent: a stack file is not what arms the design half, and a wired
// detector does not excuse a workflow whose stack gates are still commented out.
expectClean('stack-gates-detector-alone-needs-no-stack-file', (fx) => {
  design(fx);
  fx.put('.github/workflows/ci.yml', PLACEHOLDER_CI + detectStep);
});

// --- The floor contract: six classes answered, and every command actually running ------------

const FLOOR_CI = `name: ci
jobs:
  gate:
    steps:
      - name: Groundwork checks
        run: node checks/check.mjs
      - name: Build
        run: npm run build
      - name: Tests
        run: npm test
      - name: Lint
        run: npm run lint
      - name: Audit
        run: npm audit
`;

const BARE_CI = `name: ci
jobs:
  gate:
    steps:
      - name: Groundwork checks
        run: node checks/check.mjs
`;

const withFloor = (contract, ci = FLOOR_CI) => ({ put }) => {
  put('docs/README.md', manifest);
  put('docs/standards/typescript.md', contract);
  put('.github/workflows/ci.yml', ci);
};

// THE HOLE THIS STORY EXISTS FOR. Deleting the commented placeholders was one of the two fixes the
// old gate's own message proposed, and it satisfied that gate while wiring nothing. Here the stack
// declares four commands and the workflow runs none of them.
expectFail('stack-gates', withFloor(floor(), BARE_CI));

// A class left blank is a class nobody decided about, which is the silence the contract refuses.
expectFail('stack-gates', withFloor(floor({ behaves: ['', ''] })));

// A declared stack with no floor table at all: the contract is absent, not merely unfilled.
expectFail('stack-gates', withFloor('# TypeScript\n\n- Platform: no\n'));

// A command that exists only as a comment is a stage nobody runs. Same rule the design half
// already holds: a stage that is talked about is not a stage.
expectFail('stack-gates', withFloor(floor(),
  `${BARE_CI}      # - name: Build\n      #   run: npm run build\n      - name: Tests\n        run: npm test\n`
  + '      - name: Lint\n        run: npm run lint\n      - name: Audit\n        run: npm audit\n'));

// `manual` is an allowed answer and a tracked one: without a defer: marker naming the class it is
// the silent drop the platform route already refuses.
expectFail('stack-gates', withFloor(floor({ behaves: ['manual', 'a scripted regression pass before release'] })));

// The three forms, all used honestly, and the gate goes quiet. The manual class carries its
// marker; the waived ones carry their reason.
expectClean('stack-gates-floor-answered', withFloor(
  floor({ behaves: ['manual', 'a scripted regression pass before release'] })
  + '\n<!-- defer: behaves is proven by hand until a runner exists for this platform.\n'
  + '     ceiling: the first release nobody had time to walk through.\n'
  + '     upgrade-when: the vendor ships a supported test runner. -->\n'));

// --- S-04: a stage counts wherever it actually runs, not only on one host ---------------------

// The worked platform column of docs/standards/TEMPLATE-STACK.md, written out as a project's own
// floor: what a builder gets when they copy it. Walked end to end here, which is what keeps that
// column gate-satisfiable rather than merely readable.
const PLATFORM_FLOOR = [
  '# Microsoft Power Platform standards',
  '',
  '- **Stack:** Power Platform · **Platform:** yes · **Verified:** 2026-08-26',
  '',
  '## The floor',
  '',
  '| Class | The risk it covers | Form | Answer |',
  '|---|---|---|---|',
  '| `builds` | it does not assemble or deploy | command | the `PowerPlatformPackSolution@2` task |',
  '| `behaves` | it does not do what it claims | manual | the named regression script, run before release |',
  '| `analyzed` | a machine could have seen it | command | the `PowerPlatformChecker@2` task |',
  '| `dependencies` | third-party code arrives with holes | not applicable | a solution declares dependencies on other solutions and connectors, and no vulnerability feed exists for those |',
  '| `secrets` | keys ship inside the product | command | `node checks/check.mjs` |',
  '| `renders` | what a person sees is broken | manual | the accessibility checker in the studio, per app before release |',
  '',
  '<!-- defer: behaves is proven by a scripted regression pass, by hand.',
  '     ceiling: the first release nobody had time to walk through.',
  '     upgrade-when: the vendor ships a supported test runner. -->',
  '<!-- defer: renders is proven by the studio accessibility checker, by hand, per app.',
  '     ceiling: a surface nobody opened before release.',
  '     upgrade-when: a headless checker exists for this platform. -->',
  '',
].join('\n');

// The same floor, run by the host that column is written for. Nothing here is a GitHub workflow.
const AZURE_PIPELINE = `trigger:
  - main
steps:
  - script: node checks/check.mjs
    displayName: Groundwork checks
  - task: PowerPlatformPackSolution@2
  - task: PowerPlatformChecker@2
`;

const platform = (extra = () => {}) => (fx) => {
  fx.put('docs/README.md', manifest);
  fx.put('docs/standards/power-platform.md', PLATFORM_FLOOR);
  fx.put('azure-pipelines.yml', AZURE_PIPELINE);
  extra(fx);
};

// THE FIRST HALF OF THE MEASUREMENT (2026-08-26, be283ca): with no `.github/workflows/` at all the
// gate used to return before reading anything, so it said nothing while the count read 0 of 6 with
// three classes open. The refusal and the count disagreeing about one project is the thing S-03's
// single derivation exists to stop, so the count is what this asserts.
floorCase('floor-reads-a-pipeline-that-is-not-github', platform(), (out) => {
  assert.equal(out.proven, 3, 'three live Azure stages prove three classes');
  assert.deepEqual(out.open, [], 'nothing is open: every class is a live command or a waiver');
  assert.equal(out.waived.length, 3, 'the two manual classes and the not-applicable one are waived');
});

// And the gate agrees with it, on the same project.
expectClean('stack-gates-another-host-runs-the-stages', platform());

// THE SECOND HALF: one unrelated GitHub workflow, and the gate used to refuse classes by name that
// are already running as Azure stages. A docs job says nothing about this project's floor.
expectClean('stack-gates-an-unrelated-github-workflow-proves-nothing-either-way', platform(({ put }) =>
  put('.github/workflows/docs.yml', 'name: docs\njobs:\n  pages:\n    steps:\n      - run: echo publish\n')));

// A host nobody here has met is reachable, and there is one place to say so: the stack file header.
const JENKINS_FLOOR = PLATFORM_FLOOR.replace('**Verified:** 2026-08-26',
  '**Verified:** 2026-08-26 · **Pipeline:** `ci/Jenkinsfile`');

expectClean('stack-gates-a-declared-pipeline-the-gate-does-not-know', (fx) => {
  fx.put('docs/README.md', manifest);
  fx.put('docs/standards/power-platform.md', JENKINS_FLOOR);
  fx.put('ci/Jenkinsfile', 'pipeline {\n  stages {\n    sh "node checks/check.mjs"\n'
    + '    sh "PowerPlatformPackSolution@2"\n    sh "PowerPlatformChecker@2"\n  }\n}\n');
});

// The declared path is project text, and it is held to the project: a path that climbs out of the
// tree names no pipeline, so the classes it claimed stay open rather than being proven by whatever
// lies outside.
expectFail('stack-gates', (fx) => {
  fx.put('docs/README.md', manifest);
  fx.put('docs/standards/power-platform.md', PLATFORM_FLOOR.replace('**Verified:** 2026-08-26',
    '**Verified:** 2026-08-26 · **Pipeline:** `../elsewhere/ci.yml`'));
});

// A declared path with nothing at it is the builder's own typo, not a host this gate has not met,
// and it is named as such rather than sending them to declare what they already declared.
expectFail('stack-gates', (fx) => {
  fx.put('docs/README.md', manifest);
  fx.put('docs/standards/power-platform.md', PLATFORM_FLOOR.replace('**Verified:** 2026-08-26',
    '**Verified:** 2026-08-26 · **Pipeline:** `ci/Jenkinsfile`'));
});

// Silence is not one of the outcomes: a declared stack, a command answer, and no pipeline anywhere
// the gate knows to look is a hole the builder is told about.
expectFail('stack-gates', (fx) => {
  fx.put('docs/README.md', manifest);
  fx.put('docs/standards/power-platform.md', PLATFORM_FLOOR);
});

// The message says where it looked and how to name a pipeline the gate does not know, because a
// refusal a builder cannot act on is the same as silence.
floorCase('floor-with-no-pipeline-anywhere', ({ put }) => {
  put('docs/README.md', manifest);
  put('docs/standards/power-platform.md', PLATFORM_FLOOR);
}, (out) => {
  assert.equal(out.proven, 0, 'no pipeline anywhere proves no command');
  assert.deepEqual(out.open.sort(), ['analyzed', 'builds', 'secrets'], 'the three command classes are open');
});

// A floor answered without a single command needs no pipeline at all, and must not be failed for
// not having one. Not started stays not started, one rung further down: a copy with no stack file
// is covered by stack-gates-quiet-before-a-stack above.
expectClean('stack-gates-a-floor-of-waivers-needs-no-pipeline', ({ put }) => {
  put('docs/README.md', manifest);
  put('docs/standards/typescript.md', floor({
    builds: ['not applicable', 'nothing is assembled'],
    behaves: ['not applicable', 'no product code yet'],
    analyzed: ['not applicable', 'no product code yet'],
    dependencies: ['not applicable', 'no dependencies yet'],
    secrets: ['not applicable', 'no product code yet'],
    renders: ['not applicable', 'this project ships no interface'],
  }));
});

// The design half rides on the same derivation: the detector counts wherever it runs, and its
// absence is refused wherever the project's pipeline lives.
expectClean('stack-gates-detector-wired-on-another-host', (fx) => {
  design(fx);
  fx.put('azure-pipelines.yml', `${AZURE_PIPELINE}  - script: npx -y impeccable@4.0.4 detect index.html\n`);
});

expectFail('stack-gates', (fx) => {
  design(fx);
  fx.put('azure-pipelines.yml', AZURE_PIPELINE);
});

report('stack-gate');
