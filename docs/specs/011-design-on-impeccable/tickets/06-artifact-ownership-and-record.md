# 06: one fact, one file, and the choice on the record

- **Blocked by:** 02-begin-and-design-route-into-impeccable.md, 03-retire-taste.md,
  04-design-guard-keeps-what-is-not-covered.md, 05-detector-becomes-a-gate.md

- **Status:** done
- **Traces to:** BRIEF SC-8

**What to build:** The two documents impeccable expects fit into Groundwork's own map without
saying anything twice, the design method stays current after the first day, and the whole choice is
readable a year from now by someone who was not here.

**Acceptance:**

- [x] PRODUCT.md holds only what BRIEF.md does not own (platform, stack, brand commitments,
      evidence on hand, accessibility needs) and points at BRIEF.md for scope, users and purpose.
      No fact appears in both, proven by reading the two files against each other.
- [x] The design context lives where impeccable finds it without configuration, and the location is
      named in the AGENTS.md map so nobody has to search for it.
- [x] DESIGN.md section 3 is written from the built world after the finish review, and sections 1
      and 2 keep their role as input. The template says so in the file itself.
- [x] `maintain`'s dependency round refreshes impeccable, so the current release stays current.
- [x] A decision record carries the choice: why an external methodology beat another in-house
      skill, what it supersedes, where each retired rule went, what it costs, and where that cost
      is paid on the tier ladder of decision 0015.
- [x] `docs/README.md`, the AGENTS.md map and any doc the change made stale are reconciled, and
      retired wording is in the denylist.
- [x] `node checks/check.mjs`, `node checks/progress.mjs`, the links gate, the cockpit and the four
      self-test suites are green, and `node checks/progress.mjs --links` reports no path pointing at
      nothing.

**What it took, and what the reconciliation found:**

- **The design system moved up one directory, because the method reads `docs/` and nothing else
  here.** Its context loader searches the project root, `.agents/context/` and `docs/`, in that
  order, with no configuration and no way to point it elsewhere that is not configuration. From
  inside `docs/design/`, where it used to sit, it resolved nothing: `designPath: null` on a repo
  that has a filled design system, which would have made every design session open by calling our own
  document a documentation gap. `docs/DESIGN.md` and `docs/PRODUCT.md` now both resolve, with
  `platform: web`, measured with the loader itself rather than argued from the source.
- **`docs/design/` keeps VOICE.md and the reference material.** The method does not read either,
  so neither moved. The AGENTS.md map names the pair in one row, the manifest carries both files,
  and the retired path is in the denylist so it cannot come back by hand.
- **The move added no dead path.** The links gate's list of paths that point at nothing is
  identical before and after, 71 entries either way, all of them pre-existing prose or files that
  do not exist yet. The one mention left in the archived baseline spec stays as it was written:
  that is what the project called the file at the time, and the gate exempts archives for exactly
  that reason.
- **The product record is pointers where the brief already owns the fact.** Stack, users and
  purpose are one line each pointing at `docs/product/BRIEF.md`. What it holds itself is what the
  brief never carried: the platform, the three surfaces this project actually renders, the brand
  commitments (the two faces, the icon set, the text wordmark), the evidence on hand, and the
  absences that must not be fabricated. Read against the brief line by line, and two sentences
  that had drifted into restating it (the publishing channel, the zero-dependency constraint) were
  cut back to the interface fact underneath them.
- **A fresh copy gets the design system and no product record.** `begin` deletes Groundwork's own,
  the method's init writes that project's in the same place from what `begin` already captured, and
  `docs/DESIGN.md` sections 1 and 2 ship as they always did.
- **The refresh was run, not assumed.** `node checks/design-method.mjs --install` on an up-to-date
  install reports the version and changes nothing, which is what makes it safe to put in
  `maintain`'s dependency round beside the manifest updates.
- **The decision record now carries the bill.** Decision 0020 gained the option that was actually
  underneath the choice (writing a deeper in-house method, rejected because the missing halves were
  an owner-facing decision round and a mechanical detector, which is a product), a tier table
  against decision 0015, and where the two documents live. Measured over the whole spec, the most
  expensive tier shrank: AGENTS.md went from 126 lines to 125.

**Gates on this head:** `checks/check.mjs` green with the enforcement line reporting four signals, 187
gate self-tests across five suites (70 runner and document, 35 code, 24 config, 48 trace, 10
stack), progress 25, links 19, cockpit 21, cockpit-path 11, drill 11.
