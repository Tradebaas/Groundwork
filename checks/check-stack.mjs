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

// A line that runs the design detector, as opposed to one that talks about it. Comments are
// excluded on purpose: a commented stage is the exact state this gate exists to catch, and it is
// how a workflow claims a check it never performs.
const runsDetector = (line) => !/^\s*#/.test(line) && /impeccable/i.test(line) && /\bdetect\b/.test(line);

export const stackChecks = ({ root, fail, lines }) => ({
  'stack-gates'() {
    // Another CI host is explicitly allowed (`stack` section 3: "or this host's equivalent"),
    // and whether CI exists at all is enforcement.mjs's report to make. One fact, one place.
    const wfDir = join(root, '.github', 'workflows');
    if (!existsSync(wfDir)) return;
    const workflows = readdirSync(wfDir).filter((n) => /\.ya?ml$/.test(n));

    const standards = join(root, 'docs', 'standards');
    const stacks = existsSync(standards) ? stackFiles(standards) : [];
    if (stacks.length) {
      for (const name of workflows) {
        lines(join(wfDir, name)).forEach((line, i) => {
          if (!/^\s*#\s*(-\s*name:|---\s*Stack gates)/.test(line)) return;
          fail(`.github/workflows/${name}:${i + 1} still carries a commented-out stack gate while docs/standards/ names a stack (${stacks.join(', ')}). Until that stage is filled in, CI proves Groundwork's own rules and nothing about this project's code. Replace the placeholders with this stack's real gates per the skill \`stack\` section 3, and delete the ones this stack has no equivalent for instead of leaving them commented.`);
        });
      }
    }

    // The design method's half of the same window. The detector is the first mechanical check
    // this framework has on what an interface renders (spec 011), and it is the one gate whose
    // payload is deliberately absent from a clone: it is gitignored like a dependency. So the
    // question "does this project have an interface it judges with the method" is answered by
    // the tracked artifact the method writes, never by looking for the payload on disk.
    if (!existsSync(join(root, '.impeccable', 'config.json'))) return;
    const wired = workflows.some((name) => lines(join(wfDir, name)).some(runsDetector));
    if (!wired) {
      fail(`.impeccable/config.json declares the design method for this project, but no workflow in .github/workflows/ runs its detector, so nothing mechanical looks at what this interface renders. Add the stage per the skill \`stack\` section 3 (\`npx -y impeccable@latest detect <the surfaces this project ships>\`), and leave it running rather than commented: a stage nobody runs proves nothing.`);
    }
  },
});

// What this gate deliberately does not do: name the tools it expects to find per ecosystem. A
// list of blessed commands per language is the kind of allowance list that rots, and it would
// turn every new language into a change here. So the stack half is "the placeholders were dealt
// with", and proving the wired gates actually bite stays where `stack` section 3 already puts
// it: introduce a violation, watch the gate fail, revert.
//
// The design half names one tool, because there is one: the project chose impeccable as its
// design method (decision 0020), the same way it chose a stack. What it still does not name is
// which surfaces to scan or which flags to pass, so a project can widen or narrow its own scan
// without touching this file.
