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

import { existsSync, readdirSync, readFileSync, realpathSync, statSync } from 'node:fs';
import { join, sep } from 'node:path';

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

// Where a pipeline lives on the hosts this framework has actually met: its own (GitHub Actions),
// the one the template's worked platform column is written for (Azure Pipelines), and the one the
// gate's own tests have named since S-02 (GitLab CI). Deliberately not a survey of the CI market,
// because the declared path below is what makes the length of this list stop mattering.
const KNOWN_PIPELINES = ['.github/workflows', '.gitlab-ci.yml', 'azure-pipelines.yml', 'azure-pipelines.yaml'];

// The one stated place a project names a host nobody here has met: a bold field on a metadata
// line of the stack file, with the path in backticks. Both halves of that shape are load-bearing.
// The line has to start as a field rather than a sentence, and the path has to be backticked, so
// that prose naming the field - which the template and the `stack` skill both carry, and which a
// builder keeps when filling the file in - reads as the instruction it is and not as a path.
const PIPELINE_FIELD = /^[-*]?\s*(?=\*\*)[^\n]*?\*\*Pipeline:\*\*\s*`([^`\n]+)`/m;
const declaredPipeline = (text) => (text.match(PIPELINE_FIELD) || [])[1] || null;

// A path resolved inside the project, or nothing. It resolves before it trusts, because a textual
// guard is not containment: `..` spelled with a backslash is not a `..` to a slash split, and a
// symlink walks out of the tree whatever the string looked like. Comparing real path against real
// path is what holds, and the project's own root is resolved too (on macOS the temporary
// directory a test runs in sits behind /var -> /private/var, so an unresolved root never matches).
function insideProject(home, rel) {
  try {
    const abs = realpathSync(join(home, rel));
    return abs === home || abs.startsWith(home + sep) ? abs : null;
  } catch { return null; }
}

// A pipeline location is a file or a directory of them, named the same way, so one resolver reads
// either. Only a plain file counts: a device file passes "not a directory" and then blocks the
// gate forever on the read. Anything unreadable resolves to nothing, and the gate below then says
// the class is unproven and where it looked, which is the honest answer to a path it cannot open.
function pipelineFilesAt(home, rel) {
  const abs = insideProject(home, rel);
  if (!abs) return [];
  try {
    const st = statSync(abs);
    if (st.isFile()) return [rel];
    if (!st.isDirectory()) return [];
    return readdirSync(abs).filter((n) => /\.ya?ml$/.test(n)).sort()
      .filter((n) => {
        const entry = insideProject(home, `${rel}/${n}`);
        return entry !== null && statSync(entry).isFile();
      })
      .map((n) => `${rel}/${n}`);
  } catch { return []; }
}

// One derivation of where this project's pipeline lives, for the refusal and the count alike.
// Entitlement used to be decided a second time, by a `.github/workflows/` check that returned
// early: that is the escape hatch that let the refusal and the count disagree about one project.
// It reports what it could not read as well as what it found, because a refusal a builder cannot
// act on is the same as silence.
function pipelinePaths(root, stacks) {
  const looked = KNOWN_PIPELINES;
  let home;
  try { home = realpathSync(root); } catch { return { looked, unusable: [], files: [] }; }
  // A stack file is not a pipeline. A project naming its own contract as the thing that proves it
  // would have every command proven by the very table that claims them, which is self-proof in one
  // line of project text. What this gate still cannot judge is whether a real pipeline file tells
  // the truth; that limit is the module header's, and it is unchanged.
  const contracts = new Set(stacks.map((f) => f.rel));
  const declared = [...new Set(stacks.map((f) => declaredPipeline(f.text)).filter(Boolean))];
  const resolved = new Map(declared.map((rel) => [rel, contracts.has(rel) ? [] : pipelineFilesAt(home, rel)]));
  const files = [...new Set([
    ...looked.flatMap((rel) => pipelineFilesAt(home, rel)),
    ...declared.flatMap((rel) => resolved.get(rel)),
  ])];
  return { looked, unusable: declared.filter((rel) => !resolved.get(rel).length), files };
}

// Where this gate looked, said once for both halves of the refusal below. A declared path that
// gave nothing is named on its own: that is the builder's own path, not a host nobody taught this
// gate, and sending them to declare what they already declared is the same as silence.
const whereItLooked = (p) => [
  p.files.length
    ? `read: ${p.files.join(', ')}`
    : `this project has no pipeline anywhere this gate knows to look (${p.looked.join(', ')})`,
  p.unusable.length
    ? `the stack file declares \`**Pipeline:** ${p.unusable.join('`, `')}\` and there is nothing `
      + 'this gate can read there'
    : '',
].filter(Boolean).join('; ');

const WIRE_IT = 'Wire the stage, or name your pipeline in the stack file header as `**Pipeline:**` '
  + 'with the path in backticks, or change the answer to the form that is true.';

// The one read of the contract: which stack files this project declares, what each one's floor
// table says, where this project's pipeline lives, and which of its lines are live to answer the
// floor. The gate below and floorReport() both take their facts from here, which is what keeps the
// refusal and the count in step. The two halves stay separate on purpose: a project with no stack
// file still has live pipeline lines, and the design detector's half of the gate is entitled to
// them. The stack files are read first because one of them may be where the pipeline is declared.
export function readFloors(root, lines) {
  const standards = join(root, 'docs', 'standards');
  const stacks = existsSync(standards) ? stackFiles(standards) : [];
  const files = stacks.map((name) => {
    const text = lines(join(standards, name)).join('\n');
    return { rel: `docs/standards/${name}`, text, rows: floorRows(text) };
  });
  const pipelines = pipelinePaths(root, files);
  const live = pipelines.files.flatMap((rel) => liveLines(lines(join(root, rel))));
  return { live, files, pipelines };
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
    // Entitlement is decided here and nowhere else: a project owes this gate an answer the moment
    // it declares a stack, whatever host runs its pipeline. Whether CI exists at all stays
    // enforcement.mjs's report to make. One fact, one place.
    const { live, files, pipelines } = readFloors(root, lines);
    const looked = whereItLooked(pipelines);
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
            if (isLive(cmd, live)) continue;
            fail(`${rel} answers \`${cls}\` with \`${cmd}\`, and nothing runs it (${looked}). A command nobody runs proves nothing. ${WIRE_IT}`);
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
      fail(`.impeccable/config.json declares the design method for this project, and nothing runs its detector (${looked}), so nothing mechanical looks at what this interface renders. Add the stage per the skill \`stack\` section 3 (\`npx -y "impeccable@$(node checks/design-method.mjs --pinned)" detect <the surfaces this project ships>\`), and leave it running rather than commented: a stage nobody runs proves nothing. ${WIRE_IT}`);
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
