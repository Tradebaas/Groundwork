# 0021: Agile-first, with one vocabulary and the folder tree as the work hierarchy

- **Date:** 2026-08-24 · **Status:** accepted · **Decider:** owner (requests of 2026-08-24), worked out by the agent
- **Amended 2026-08-24** by the owner: a project runs several epics, one after the other (a Power BI
  project starts at phase 0 and moves on to phase 1), and a feature hangs on exactly one of them.
  So the epic became a folder like the feature already was, and the levels below it are read
  through it. The rest of this record stands as written.
- **Amended again 2026-08-24** by the owner, on what happens when a story is finished: the review
  lane is where the relevant roles look at the finished work **and everything it touched**, and two
  human approvals sit beside the agent lenses. The owner can open every change in text and code, or
  click approved without doing so; the customer, the person the product is for, can be asked to
  judge functionally whether it does what it should. Both are **optional per story**, because a
  story that touches nothing the customer can see does not need their eyes. When a human is needed,
  they receive a link to the project's own artifact rather than a request to open a repository. And
  an epic is not finished when its stories are merged: it is finished when it runs in production
  and can keep running. The lane is therefore called **review**, the word rule 6 and the story
  file's own section already use.

## Context

The owner wants Groundwork rebuilt so an Agile way of working is the method itself, not a layer on
top of it: a project starts by making its purpose explicit, that purpose is cut into work that
delivers value on its own, and the owner can follow and steer every step from one picture instead
of from a chat log. Duetti, a Groundwork copy, has worked that way since 2026-08-20 and is the
evidence that it fits: it added the work hierarchy, lanes, roles, a readiness rule and a published
board, and `checks/check.mjs` did not change by a single line to carry it.

Three things had to be settled against the sources before any of it could be adopted.

- **The four levels are not Scrum.** The Scrum Guide 2020 defines three accountabilities, five
  events and three artifacts, and defines none of epic, feature, story, task, definition of ready
  or story points. Epic, capability, feature and story come from SAFe; task is a Jira level. So
  this project writes its own definitions with the sources named, and claims neither Scrum nor
  SAFe conformance. SAFe content is copyright-protected and its name is a registered trademark, so
  nothing is copied from it.
- **A definition of ready is contested exactly where we use it.** Cohn's warning is that a
  readiness rule which blocks work until something is finished turns a team into a stage gate.
  We accept the rule anyway, for a reason he was not writing about: a human who picks up a vague
  story slows down and asks, while an agent builds the wrong thing at full speed. The rule is
  therefore kept narrow, and it gates the lane, never the thinking.
- **The field is moving this way.** SAFe released AI-Native SAFe on 2026-06-16, stating that the
  bottleneck has moved from whether you can build something to whether you can keep up with
  validating that what you build is safe and valuable. Gartner's guidance for agentic work in the
  SDLC is a verification-first delegation framework, so agents can be given work without building
  up governance debt. Both describe what this record wires in.

On top of that the owner set one constraint that decides most of the design: one source of truth
for every fact, everywhere. No two administrations, no process or goal or explanation written in
two places, one word per thing across skills, documents, code and the published board, and no rule,
role or ritual that does not pay for itself.

## Options considered

1. **The folder tree is the hierarchy, and the story file is the whole card (chosen).** A story
   sits in exactly one feature folder, so the rule "a story belongs to one feature" is not a rule
   at all: a file lives in one directory and cannot live in two. Nothing carries a parent field, no
   trace list has to be maintained, and a cycle in the hierarchy cannot be expressed. The story file
   is at once the card, the requirements, the task list and the place the review verdicts land, so
   there is nowhere for a second administration to grow.
2. **Port Duetti as it stands, where the card is the feature and the brief's scope items are what it
   traces to.** Rejected by the owner: he wants the feature to be the described larger piece of work
   with a page of its own, and the story to be the card that moves across the board. It also keeps
   two lists, scope items and cards, with a trace between them that has to be kept true by hand.
3. **Keep `docs/specs/` and add a hierarchy layer that points into it.** Rejected: a pointer layer
   is a second administration by definition, and its pointers rot at exactly the moment work moves.

## Decision

### One vocabulary, used everywhere

| Level | What it is | Where it lives |
|---|---|---|
| Epic | The goal of one round, and what "finished" means for it. A project runs several, one after the other, and only one is in flight | `docs/work/E-nn-<slug>/epic.md` |
| Feature | A larger piece of work that delivers value on its own and can run live on its own. Carries its value, its purpose, which choice in the vision it serves, and its acceptance | `docs/work/E-nn-<slug>/F-nn-<slug>/feature.md` |
| Story | The card that moves across the board: one buildable slice of its feature, with criteria, size, dependencies, status and the review verdicts | `.../F-nn-<slug>/S-nn-<slug>.md` |
| Task | One step an agent carries out to finish its story, as a checklist ticked while the work happens | a section inside the story file |

Retired wording, which goes on the denylist in `checks/config.json` so it cannot silently return:
spec becomes story, ticket becomes task, spec folder becomes story file, success criterion (SC-n)
becomes feature, cockpit becomes board.

### One source of truth, by construction rather than by discipline

- **Containment is physical.** A story is in one feature folder, a feature is in one epic folder,
  an epic is in one project. Nothing carries a parent field, and an id is the path through that
  tree (`E-01/F-04/S-01`), so numbering restarts inside each parent and no id is ambiguous.
- **A status lives on one line, in the story that owns it.** Every lane, count, blocker and
  progress number is derived from those lines. No status is written down twice, so no precedence
  rule is needed to say which copy wins.
- **The feature page is the functional documentation.** Once its stories are done, that page
  describes what the product does for a user, and it is current because it is the thing that was
  built. No separate functional specification is written.
- **Lessons learned get no file of their own.** A lesson becomes a rule in the rulebook or a skill,
  a decision record, or a row in the debt ledger. A lessons file would be a second home for facts
  that already have one.
- **The board renders, it never stores.** The repository stays the source; the published board is
  the picture of it at the moment it was made.

### The document map

Two documents are added, and no others: `docs/product/VISION.md` (mission, vision, strategy, and
the choice set every feature has to serve) and the epic page at `docs/work/E-nn-<slug>/epic.md`. Everything the owner asked to
be able to see already has an owning file: choices in `docs/decisions/`, the tech stack in
`docs/standards/` plus its decision record, technical documentation in `docs/product/ARCHITECTURE.md`,
the design system in `docs/DESIGN.md`, the voice in `docs/design/VOICE.md`, runbooks in
`docs/operations/`, debt in `docs/state/DEBT.md`, live state in `docs/state/STATE.md`.

Readers do not all want the same thing, which is the lesson of Diátaxis: documentation is organised
by what the reader needs, not by topic. Here the readers are the agent, the owner and whoever comes
after. So the board groups the same files onto four shelves - why we build it, what we are building
now, how it is built, what we decided and learned - while the files themselves stay where they are
and `docs/README.md` stays the one map. A shelf is a view, never a second place. Where
`ARCHITECTURE.md` needs more structure, it takes its section names from arc42 rather than inventing
its own.

### Seven rules, and no more

1. One epic in flight at a time. A project may hold several; they run one after the other.
2. A feature delivers value on its own and names in one line which choice in the vision it serves.
3. A story lives in exactly one feature folder.
4. Ready: a value sentence, testable criteria, its tasks, a size, its dependencies, and the owner's
   sign-off.
5. Done: criteria demonstrated, `verify` green, the review verdicts approved, and the human
   approvals that this story needs given, merged. Which human approvals a story needs is decided
   when it is refined, and "none" is a legitimate answer for work nobody outside the build can see.
6. Work in progress: one story being built, two in review.
7. Everything else goes to the inbox and is not built.

### Four agent roles and two human ones

A role earns its place only by being a different viewpoint, because one agent reviewing its own
work is blind. That gives a refiner, a builder, and three review lenses (technical, functional,
architectural), all played by the agent through the skills that already exist. The owner orders the
work, signs off readiness, and looks at the result himself after the lenses have passed - reading
every change, or approving without reading, as he chooses. The customer is the second human role
and the only one who can answer whether the thing does what it was wanted for; they are asked when
the story has something they can judge, and never as ceremony. There is no scrum master, because the work that accountability exists for -
making impediments visible - is derived on the board from the files. There are no sprints, because
the cadence here is the session and the feature, not a time box borrowed from a team of nine.

## Consequences

- `docs/specs/` stops existing as a concept. The spec becomes the story, the ticket becomes the
  task, and decisions 0004 and 0011 are superseded on those two points by this record.
- `checks/progress.mjs` counts stories and features instead of scope items, and the local cockpit
  and the published board become one derivation with two outputs.
- The `spec` skill becomes the refiner, `verify`, `code-review` and `design-guard` become the three
  lenses, `begin` gains the vision interview, and one skill is added that owns moving a card.
- What becomes harder: a story that turns out to belong under a different feature has to be moved
  as a file, not re-pointed. That is the price of making the containment physical, and it is paid
  once per mistake instead of being carried as a trace forever.
- Watch for: the readiness rule turning into ceremony. If a story ever waits on paperwork rather
  than on a real gap, the rule is too wide and this record is the place that says so.

Sources: Scrum Guide 2020 (scrumguides.org); the Scrum Guide Expansion Pack (scrumexpansion.org);
SAFe on features and capabilities, and the AI-Native SAFe announcement of 2026-06-16
(framework.scaledagile.com); SAFe usage and permissions; Gartner, "Delegation Framework for Agentic
AI in the SDLC" and "Don't Limit AI in Software Engineering to Coding"; Cohn, "The Dangers of a
Definition of Ready" (mountaingoatsoftware.com); Wake's INVEST (xp123.com, agilealliance.org);
Diátaxis (diataxis.fr); arc42 (arc42.org).
