#!/usr/bin/env node
// Self-test for checks/check-stack.mjs: the gate that asks whether this project's own quality
// gates are armed. It must fire on the window it exists for (a stack chosen, the workflow's
// placeholder stage untouched) and stay quiet everywhere else, above all on a fresh copy that
// has not chosen a stack yet: an untested gate is false confidence (decision 0005).
// Run: node checks/check-stack.test.mjs

import { expectClean, expectFail, report } from './check-fixture.mjs';

// The manifest row keeps docs-manifest quiet, so only the gate under test speaks.
const manifest = '# manifest\n\n| `state/STATE.md` | LIVE | state |\n| `standards/**` | LIVE | standards |\n';
const stack = ({ put }) => {
  put('docs/README.md', manifest);
  put('docs/standards/typescript.md', '# TypeScript\n\n- Platform: no\n');
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

// `stack` section 3 allows another CI host, and whether CI exists at all is enforcement.mjs's
// report to make. A project on GitLab must not be failed here for not being on GitHub.
expectClean('stack-gates-another-ci-host', stack);

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

report('stack-gate');
