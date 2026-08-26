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
//
// It used to close it by looking for the commented-out placeholder stages and failing while any
// remained. That was satisfiable by deleting them, which is one of the two fixes its own message
// proposed, so a project could reach green with a stack declared and nothing wired at all -
// measured on a fresh copy, 2026-08-25. Since E-02/F-01/S-02 it reads the floor table in the
// stack file instead: six classes of risk, each answered with a command, a reasoned
// `not applicable`, or a named `manual` check with a defer: marker. Absence of a comment proved
// nothing; presence of a running stage proves something. docs/standards/TEMPLATE-STACK.md owns
// what the six classes are and what each one covers.
//
// What it still refuses to do is judge the answer. It never looks at which tool a command runs,
// what that tool asserts, or whether a threshold is sane. A gate that pretended to would be the
// false confidence this whole epic exists to remove, and the honest limit is written into the
// epic rather than discovered later.

import { existsSync, readdirSync, readFileSync } from 'node:fs';
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

// The six classes of risk every product carries, in the order the floor table lists them.
// docs/standards/TEMPLATE-STACK.md owns what each one covers; this file only checks it is
// answered. Adding a class here without adding it there would fail every project at once.
const CLASSES = ['builds', 'behaves', 'analyzed', 'dependencies', 'secrets', 'renders'];
const FORMS = ['command', 'not applicable', 'manual'];
const FORMS_SAID = 'a command, `not applicable` with a reason, or `manual` with a named check and a defer: marker';

// The floor table, and only that table. A stack file may carry a second one (the worked answers
// the template ships with, or the project's own), so the section heading is the anchor: what is
// read is what stands under "## The floor" up to the next heading of that level.
function floorRows(text) {
  const lines = text.split('\n');
  const start = lines.findIndex((l) => /^##\s+the floor\s*$/i.test(l));
  if (start < 0) return null;
  const rest = lines.slice(start + 1);
  const end = rest.findIndex((l) => /^##\s/.test(l));
  const body = (end < 0 ? rest : rest.slice(0, end));
  const rows = new Map();
  for (const line of body) {
    const cells = line.split('|').map((c) => c.trim());
    if (cells.length < 5) continue;
    const key = (cells[1] || '').replace(/`/g, '').toLowerCase();
    if (!CLASSES.includes(key)) continue;
    rows.set(key, { form: (cells[3] || '').replace(/[*`]/g, '').trim().toLowerCase(), answer: cells[4] || '' });
  }
  return rows;
}

// Every backticked span in an answer is a thing that has to run. One cell may hold more than one:
// an audit and an SBOM are two commands answering one class, and both have to be live or the
// class is half answered.
const commandsIn = (answer) => [...answer.matchAll(/`([^`]+)`/g)].map((m) => m[1].trim()).filter(Boolean);

// A workflow line that runs something, as opposed to one that talks about running it. The same
// rule the design half has always held: a commented stage is how a workflow claims a check it
// never performs.
const liveLines = (lines) => lines.filter((l) => !/^\s*#/.test(l));

// One definition of "this command actually runs", so the gate that refuses a dead command and
// the report that counts a proven class can never drift apart on what proven means.
const isLive = (cmd, live) => live.some((l) => l.includes(cmd));
const runsAll = (answer, live) => {
  const wanted = commandsIn(answer);
  return wanted.length > 0 && wanted.every((cmd) => isLive(cmd, live));
};

// The one read of the contract: which stack files this project declares, what each one's floor
// table says, and which workflow lines are live to answer it. The gate below and floorReport()
// both take their facts from here, which is what keeps the refusal and the count in step.
// The two halves stay separate on purpose: a project with no stack file still has live workflow
// lines, and the design detector's half of the gate is entitled to them.
export function readFloors(root, lines) {
  const standards = join(root, 'docs', 'standards');
  const stacks = existsSync(standards) ? stackFiles(standards) : [];
  const wfDir = join(root, '.github', 'workflows');
  const live = existsSync(wfDir)
    ? readdirSync(wfDir).filter((n) => /\.ya?ml$/.test(n))
      .flatMap((name) => liveLines(lines(join(wfDir, name))))
    : [];
  const files = stacks.map((name) => {
    const text = lines(join(standards, name)).join('\n');
    return { rel: `docs/standards/${name}`, text, rows: floorRows(text) };
  });
  return { live, files };
}

// The shape of the floor, counted once for everyone who reports it: how many classes are proven
// by a command that runs, which ones are waived and why, and which are neither. E-02/F-01/S-03.
// It counts and never judges, exactly like the gate: whether the command that runs is any good
// is a question no file in checks/ is entitled to answer.
export function floorReport(root) {
  const read = (p) => readFileSync(p, 'utf8').replace(/\r\n/g, '\n').split('\n');
  const floors = readFloors(root, read);
  // No stack declared is not started, not a floor of zero: this project has not been asked the
  // six questions yet, so it has nothing to answer for.
  if (!floors.files.length) return null;
  const waived = [];
  const open = [];
  let proven = 0;
  let total = 0;
  for (const file of floors.files) {
    for (const cls of CLASSES) {
      total += 1;
      const row = file.rows?.get(cls);
      // An unanswered class, or one answered in a form the contract does not have, is open: the
      // gate is already refusing it, and counting it as waived would launder a hole into a choice.
      if (!row || !row.form || !row.answer || !FORMS.includes(row.form)) { open.push(cls); continue; }
      if (row.form === 'command') {
        if (runsAll(row.answer, floors.live)) proven += 1;
        else open.push(cls);
        continue;
      }
      waived.push({ cls, form: row.form, reason: row.answer.trim(), path: file.rel });
    }
  }
  return { total, proven, waived, open, files: floors.files.map((f) => f.rel) };
}

export const stackChecks = ({ root, fail, lines }) => ({
  'stack-gates'() {
    // Another CI host is explicitly allowed (`stack` section 3: "or this host's equivalent"),
    // and whether CI exists at all is enforcement.mjs's report to make. One fact, one place.
    const wfDir = join(root, '.github', 'workflows');
    if (!existsSync(wfDir)) return;
    const { live, files } = readFloors(root, lines);
    for (const { rel, text, rows } of files) {
      if (!rows) {
        fail(`${rel} declares a stack and carries no floor table, so nothing says how this project's own code is checked. Copy the table from docs/standards/TEMPLATE-STACK.md and answer all six classes: ${CLASSES.join(', ')}.`);
        continue;
      }
      for (const cls of CLASSES) {
        const row = rows.get(cls);
        if (!row || !row.form || !row.answer) {
          fail(`${rel} leaves the \`${cls}\` class unanswered. Every class is answered one of three ways: ${FORMS_SAID}. An unanswered class is not a floor with a hole in it, it is a hole nobody decided about.`);
          continue;
        }
        if (!FORMS.includes(row.form)) {
          fail(`${rel} answers \`${cls}\` with "${row.form}", which is not one of the three forms: ${FORMS_SAID}.`);
          continue;
        }
        if (row.form === 'command') {
          const wanted = commandsIn(row.answer);
          if (!wanted.length) {
            fail(`${rel} answers \`${cls}\` with a command and names none. Put the command in backticks, exactly as a workflow runs it.`);
            continue;
          }
          for (const cmd of wanted) {
            if (!isLive(cmd, live)) {
              fail(`${rel} answers \`${cls}\` with \`${cmd}\`, and no workflow under .github/workflows/ runs it. A command nobody runs proves nothing: wire the stage, or change the answer to the form that is true.`);
            }
          }
        }
        if (row.form === 'manual') {
          const marked = /defer:/i.test(text) && /upgrade-when:/i.test(text)
            && new RegExp(`defer:[^]{0,400}?\\b${cls}\\b`, 'i').test(text);
          if (!marked) {
            fail(`${rel} answers \`${cls}\` with \`manual\` and carries no defer: marker naming it. A named manual check is allowed; an unmarked one is the silent drop the \`stack\` skill's platform route already refuses. Add a marker naming \`${cls}\`, with its ceiling and its upgrade-when.`);
          }
        }
      }
    }

    // The design method's half of the same question. The detector is the first mechanical check
    // this framework has on what an interface renders (spec 011), and it is the one gate whose
    // payload is deliberately absent from a clone: it is gitignored like a dependency. So the
    // question "does this project have an interface it judges with the method" is answered by
    // the tracked artifact the method writes, never by looking for the payload on disk.
    if (!existsSync(join(root, '.impeccable', 'config.json'))) return;
    if (!live.some(runsDetector)) {
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
