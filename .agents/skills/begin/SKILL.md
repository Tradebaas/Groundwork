---
name: begin
description: Start a project on Groundwork. Use when docs/state/STATE.md says NOT STARTED, when the user says "begin", "start", "nieuw project", or asks how to get going in an empty copy - also when they lay Groundwork over a project that already exists (adopt, retrofit, brownfield), and when they open with an existing PRD, project description, or idea text: that material is this skill's input. Interviews the owner (or extracts the answers from their material and their code), fills the templates, sets up git and hooks, and proposes the first real step.
---

# begin: from fresh copy to working project

Run this once. When it's done, STATE.md carries real state and this skill never triggers again.

**Which of the two entrances is this?** Read it off the tree before doing anything, and say which
one you read: a **fresh copy** holds nothing but Groundwork, while an **existing project** has its
own `.git` history, source files, and a README that is not this one. Both take the route below;
the existing project keeps everything it already has, and the steps say where the two differ.
One skill, two doors: decision 0018 records why.

## 1. Clean the copy

Do this housekeeping silently: it is plumbing, not progress. Report on it only if something
went wrong or needs the owner's action; a list of deleted template files is noise to them.

- If a `MASTER_PROMPT.md` or `MASTER_PROMPT.local.md` exists at the root: it is Groundwork's own
  origin brief, not part of any project. Delete it. (Fresh copies no longer carry it: it is
  gitignored at source. This clears it from older copies made while it was still tracked.)
- `CHANGELOG.md` at the root is Groundwork's release history, not this project's. Note which
  version this copy came from (its newest entry) in STATE.md at step 4, then empty the file down to
  its heading so this project's first release writes into it.
- Delete any non-archived spec folder: `docs/specs/[0-9]*` directories are in-flight Groundwork
  maintainer work, never the new owner's. Keep the worked example in
  `docs/specs/archive/007-pickup-slots/` and the `TEMPLATE*.md` files.
- `docs/product/BRIEF.md` and `docs/specs/archive/000-baseline/` hold Groundwork's own scope and
  the record of what the framework itself had already shipped. Counted against this project they
  would report someone else's work as done here. Put the blank brief back
  (`cp docs/product/TEMPLATE-BRIEF.md docs/product/BRIEF.md`) and delete the baseline folder.
- `docs/operations/deploy.md` holds Groundwork's own release route, which would read as this
  project's if it stayed. Put the blank runbook back
  (`cp docs/operations/TEMPLATE-DEPLOY.md docs/operations/deploy.md`). `deliver` fills it at first
  delivery.
- `docs/state/DEBT.md` carries Groundwork's own debt rows, which `maintain` would harvest and
  report as this project's. Put the blank ledger back
  (`cp docs/state/TEMPLATE-DEBT.md docs/state/DEBT.md`). The first accepted `defer:` marker fills
  it; on the existing-project door below, the check total lands here as the starting position.
- `docs/compliance/REGISTER.md` holds Groundwork's own compliance answers, which would read as
  this project's if they stayed. Put the blank register back
  (`cp docs/compliance/TEMPLATE-REGISTER.md docs/compliance/REGISTER.md`). Step 4 fills its
  header from the interview; `comply` fills the rest before first delivery. The two files beside
  it, `docs/compliance/COMPLIANCE.md` and `docs/compliance/AI-LITERACY.md`, are shared knowledge
  and stay as they are.
- Reset `"denylist"` in `checks/config.json` to `[]`: its entries guard the origin repo's
  retired wording, never this project's. Keep `styleBans` intact (those are generic).
- Keep the numbered records in `docs/decisions/`: they document the system this project just
  inherited (why the rulebook, skills and checks work the way they do). This project's own
  decisions continue from the next free number. Naming a range here would go stale the next time
  the framework records one.
- Strip the `data-derive` attributes from the stat strip in `index.html` (leave the numbers and
  the page alone). They tie those numbers to a gate that counts this repo, and in a copy the
  numbers describe the framework, not the project: the first decision this project records would
  otherwise turn the gate red.
- Verify prerequisites: `git --version` and `node --version` (Node ≥ 20). Missing → tell the
  owner exactly what to install, then stop.

## 2. Interview the owner

**Existing project: the code answers first.** Its README, manifests, directory layout and recent
commits already hold what the product is, who runs it and what it is built on. Read them, play the
answers back for a one-line confirmation each, and spend the interview on what only the owner
knows: why it exists, who it is for, what is deliberately out, and what "done" means from here.
Asking an owner to describe software they have been running is the fastest way to lose their trust.

**Material first.** Ask whether the owner already has anything written: a PRD, project
description, pitch, notes, or a rough idea dump. Take it now (pasted text or a file; convert
non-Markdown files with the `ingest` skill) and treat it as the primary source: extract answers
to the questions below from it, play each extracted answer back for a one-line confirmation,
and interview only for the gaps. A vague idea is a valid starting point: capture what the owner
does know, record the rest in BRIEF.md as explicitly open, and let `scope` sharpen it (step 6
routes there).

For whatever the material leaves open, interview **one question per message**, never a batch:
announce upfront how many questions are coming ("question 1 of 5"), keep that counter on every
question, and go as deep per topic as it takes to make the answer concrete before moving on.
Capture answers verbatim where wording matters. Only what is genuinely theirs to decide.
Everything else you decide later, and say so.

1. **Product**: name; one sentence: what it does, for whom, why now.
2. **Users**: who, in what situation, on which devices.
3. **Scope**: the 3-7 capabilities version one must have. Then explicitly: what is *not* in it.
4. **Constraints**: deadline, budget sensitivity, integrations, data residency, personal data
   (yes/no: feeds the compliance register), any AI features (EU AI Act relevance).
5. **Success**: how the owner will know it worked.
6. **Ownership**: who signs off on scope changes (default: the owner you're talking to).

**Discovery, proportional to project class.** The answers above size the project: *personal*
(the owner is the user), *team* (others inside one organization depend on it), or
*organization* (a client, systems of record, a compliance regime, or real money involved).
The class usually becomes clear at questions 2 and 4; extend the announced counter when it
does. Class names which of BRIEF's discovery rows to ask about - the row comments there
carry what each row holds, and every row the class does not ask gets `n/a (<class>)` per
BRIEF's own header rule. Never interrogate a hobby project:

- **Personal**: ask nothing extra.
- **Team**: ask the current situation and cost of doing nothing, systems & integrations,
  and rollout & adoption.
- **Organization**: ask every discovery row, concretely, one topic at a time.

Do **not** ask about stack (that's the `stack` skill, argued on merit) or design details (the
`design` skill asks those when the time comes).

## 3. Challenge the idea

The interview captured the idea; this step tests it, before any template absorbs it. Load the
`critical-thinking` skill and run its moves on the product idea itself - whether this is the
right product to build is the highest-leverage decision of the whole lifecycle, and it gets
pushback before it gets paperwork. The moves that always bite here: the named alternative
(which for a whole product includes buying or configuring something that exists, and doing
nothing), the load-bearing assumption, and the falsification question. The skill owns the
method and the disagree-and-commit rule; this step fixes only the moment it runs.

Record the outcome in one or two lines: idea confirmed → a dated note in BRIEF.md's Product
section; idea changed, or the owner overruled a real concern → a decision record in
`docs/decisions/`.

## 4. Write it down

- Fill `docs/product/BRIEF.md`: numbered SC-items, explicit out-of-scope, constraints, and
  the discovery rows at the interviewed depth. Write each SC-item in the owner's own words,
  as something they would recognize without translation: the progress overview quotes these
  lines back to them (`node checks/progress.mjs`).
- Existing project: write one baseline record in `docs/specs/archive/000-baseline/spec.md`, from
  `docs/specs/TEMPLATE.md`, stating what already shipped before the brief existed and which
  SC-items it covers. Without it the overview quotes a running product back to its owner as
  nothing done, and the alternative is inventing retroactive specs nobody wrote. Everything from
  here forward gets a real spec at the size `spec` picks.
- Seed the glossary `docs/product/CONTEXT.md` with the domain terms the interview surfaced;
  the file's template comment defines the entry format.
- Fill the handoff block in `docs/state/STATE.md`: status active, phase `prepare`, Now ▶ next step,
  and the Groundwork version this copy started from (step 1). Without that line nothing can say
  which framework this project holds, which is what makes a later improvement findable.
- Fill the header of `docs/compliance/REGISTER.md`: set "Personal data processed", "AI features"
  and "Applicable regimes", dated. Either first field a yes → `comply` runs before first
  delivery.
- Rewrite `README.md` for *this product*: the top half (what, for whom, how to run once it
  exists) replaces Groundwork's pitch, and "Start a project" goes with it (that section is
  copy-the-template onboarding, done by now). Keep "How it works", "Requirements", "What lives
  where" and "Handing over" intact for successors; the License section is the owner's call
  (`comply` sets it). Existing project: its README already belongs to the product, so leave the
  top half alone and add "What lives where" and "Handing over" to it instead.

## 5. Set up the machinery

First, if a `.git/` directory exists the copy still carries Groundwork's commit history (it was
cloned, not made with "Use this template", `degit`, or a ZIP). The project must start from its own
root, so remove it: `rm -rf .git`. In an existing project that `.git` is the owner's own history:
keep it, skip `git init` below, and run the rest on the branch they are on.

If `.claude/skills` is not a symlink to `../.agents/skills` (degit and some ZIP tools break it),
restore it: `ln -sfn ../.agents/skills .claude/skills`. On Windows without symlink support: set
`"skipSymlinkCheck": "<why>"` in `checks/config.json`, the reason as the value, and point the tool
at `.agents/skills/` directly.

```bash
git init -b main
node checks/check.mjs --install-hooks   # wires core.hooksPath → checks/hooks (versioned)
node checks/check.mjs                   # must be green before the first commit
node checks/progress.mjs --register     # adds this project to the owner's cross-project overview
git add -A && git commit -m "chore: initialize project on Groundwork" \
  -m "Traces-to: explicit request: project initialization (begin)"
```

Existing project: run `node checks/check.mjs` **before** installing the hooks, and read its output
as a measurement rather than a verdict. Real code turns it red on contact (length caps, typography
in text the project already had), and adoption cannot mean cleaning a whole codebase before any
work is possible. Take it in this order: fix what is unsafe to leave, secrets in tracked files
first; give every file the project already had in `docs/` its row in `docs/README.md`, which is a
real fix and takes a minute; mark the rest at the site with the escape the check already offers and
a reason (`checks:allow-length: <reason>` opening a comment, `checks:allow-style`), never by adding paths to an
exclusion list in `checks/config.json`; and log the total in `docs/state/DEBT.md`. Then
install the hooks and commit, with `git init` skipped. Report the numbers to the owner: what it
flagged, what you fixed, what is now marked. If that count is large, it is the finding worth
discussing before anything else gets built.

**The design method, when this product has an interface.** Groundwork does not make interfaces
itself: making one runs on impeccable, installed per project, and `design` carries the Groundwork
side of it. Whether this product has an interface is already visible in the interview (question 2
named the devices, question 3 the capabilities): play that read back as one yes/no question. It is
asked here and nowhere else.

- **Yes** → `node checks/design-method.mjs --install`. Report the single line it prints, installed
  version included, so the owner knows which release this project holds. The payload is gitignored
  like a dependency, so it does not enter the commit above; the enforcement line at the top of
  `node checks/check.mjs` is what says it is there.
- **No** → skip it, and record in STATE.md that this product has no interface and therefore no
  design method. A later screen starts by installing it.

The install refuses **before writing anything** when it cannot finish: no npm, no network, or a
Node below the floor impeccable itself states. Report its line as it comes, name in one line what
is unavailable until it installs (design work would otherwise run on model defaults), put that in
STATE.md under "Blocked on:", and carry on. Setup does not fail on it, and nothing else in this
step depends on it.

If the owner has a remote (GitHub gets CI from `.github/workflows/ci.yml`; another host needs
its equivalent: port it before first delivery), wire it and push. If not, note in STATE.md
that CI is a `deliver` precondition still to be wired. On GitHub, also enable private
vulnerability reporting on day one, so `SECURITY.md`'s reporting channel exists before anyone
reads the policy: `gh api --method PUT 'repos/{owner}/{repo}/private-vulnerability-reporting'`
(not on GitHub or no `gh` → skip; `deliver`'s first-release check covers it).

## 6. Hand off

Update STATE.md, then propose exactly one next step, normally:
- Scope needs sharpening → `scope`
- Scope is solid → `stack`, then `architect`, then `design`.

Report: what you recorded, what you decided yourself, and that single next step. ⚓
