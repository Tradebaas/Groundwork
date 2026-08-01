// The gate that asks whether this project's OWN quality gates are armed, as opposed to
// Groundwork's. Part of checks/check.mjs, which composes it into its registry and owns the run.
//
// Nothing else in checks/ knows anything about a product's code: the gates next door prove
// documents, budgets, traces and secrets, and they would all stay green on a repo whose
// TypeScript does not compile. The tools that do know are the ecosystem's own, and `stack`
// section 3 wires them into CI at the moment the stack is chosen. Until that happens the
// workflow ships a commented placeholder stage, and enforcement.mjs reports CI as armed the
// moment any workflow file exists. So between choosing a stack and wiring its gates there is a
// window where every signal reads green and not one line of the project's code is checked.
// This gate closes that window.

import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

// A stack file is any standards document that is not the cross-stack floor and not a template:
// `stack` section 2 writes exactly one, named for the stack (docs/standards/<stack>.md).
const stackFiles = (standards) => readdirSync(standards, { withFileTypes: true })
  .filter((e) => e.isFile() && e.name.endsWith('.md')
    && e.name !== 'GLOBAL.md' && !e.name.startsWith('TEMPLATE-'))
  .map((e) => e.name);

export const stackChecks = ({ root, fail, lines }) => ({
  'stack-gates'() {
    const standards = join(root, 'docs', 'standards');
    if (!existsSync(standards)) return;
    const stacks = stackFiles(standards);
    if (!stacks.length) return;

    // Another CI host is explicitly allowed (`stack` section 3: "or this host's equivalent"),
    // and whether CI exists at all is enforcement.mjs's report to make. One fact, one place.
    const wfDir = join(root, '.github', 'workflows');
    if (!existsSync(wfDir)) return;

    for (const name of readdirSync(wfDir).filter((n) => /\.ya?ml$/.test(n))) {
      lines(join(wfDir, name)).forEach((line, i) => {
        if (!/^\s*#\s*(-\s*name:|---\s*Stack gates)/.test(line)) return;
        fail(`.github/workflows/${name}:${i + 1} still carries a commented-out stack gate while docs/standards/ names a stack (${stacks.join(', ')}). Until that stage is filled in, CI proves Groundwork's own rules and nothing about this project's code. Replace the placeholders with this stack's real gates per the skill \`stack\` section 3, and delete the ones this stack has no equivalent for instead of leaving them commented.`);
      });
    }
  },
});

// What this gate deliberately does not do: name the tools it expects to find. A list of blessed
// commands per ecosystem is the kind of allowance list that rots, and it would turn every new
// language into a change here. So the mechanical half is "the placeholders were dealt with",
// and proving the wired gates actually bite stays where `stack` section 3 already puts it:
// introduce a violation, watch the gate fail, revert.
