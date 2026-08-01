# Compliance register: this project

<!-- TEMPLATE: the blank register, and the file `begin` copies over Groundwork's own
     (`cp docs/compliance/TEMPLATE-REGISTER.md docs/compliance/REGISTER.md`) so a new project
     does not inherit the framework's compliance answers.
     `COMPLIANCE.md` next to it says which regimes exist and when they bite; this file says which
     of them reach this project and where each obligation is actually answered. `begin` fills the
     three bullets below from the interview, `comply` fills the tables and re-verifies them
     before every delivery. An open `blocked` row stops a release: `deliver` reads this file
     before it ships. Evidence is a place someone can open, never a promise. -->

- **Personal data processed:** <what, from whom, and where it lands. "None" needs the same proof
  as a yes.>
- **AI features:** <any model call, classification or generation in the product, or "none">
- **Applicable regimes:** <the rows from `COMPLIANCE.md` that reach this project, with the date
  the answer was checked. Name the ones that do not, with the reason, in the table below.>

<!-- One row per obligation that applies, plus a row for each regime ruled out and why.
     Status: met / open / blocked / n/a. Give an n/a row the trigger that would arm it. -->

| # | Regime | Obligation | Status | Evidence / where implemented |
|---|---|---|---|---|
| C-1 | <regime> | <what it requires of this project> | open | <the file, screen or setting where it is answered> |

**Processing record (Art 30)** <!-- one row per purpose; required as soon as any personal data
is processed, and the retention column is what `maintain` executes at end of life -->

| Purpose | Data | Lawful basis | Retention | Processor(s) | EU residency |
|---|---|---|---|---|---|
| <why the data is processed> | <the fields> | <Art 6 basis, named> | <how long, then what> | <who else touches it> | <yes, or the transfer basis> |

**AI literacy (Art 4): who is covered here** <!-- the roles and people operating AI tooling on
this project; the measures themselves live in `AI-LITERACY.md`, and an AI feature in the product
belongs in the "AI features" bullet above -->

- <who operates AI agents on this project, and the date this was last reviewed>
