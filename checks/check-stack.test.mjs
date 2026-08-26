#!/usr/bin/env node
// Self-test for checks/check-stack.mjs: the gate that asks whether this project's own quality
// gates are armed. It must fire on the window it exists for (a stack chosen, the workflow's
// placeholder stage untouched) and stay quiet everywhere else, above all on a fresh copy that
// has not chosen a stack yet: an untested gate is false confidence (decision 0005).
// Run: node checks/check-stack.test.mjs

import { expectClean, expectFail, report } from './check-fixture.mjs';

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

report('stack-gate');
