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

report('stack-gate');
