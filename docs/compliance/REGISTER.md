# Compliance register: this project

<!-- Which of the regimes in `COMPLIANCE.md` apply here, and where each obligation is answered.
     `begin` fills the three header bullets from the interview, `comply` fills the rest and
     re-verifies it per delivery. This file holds Groundwork's OWN answers, not a blank
     skeleton: the framework is dogfooded on itself, and a register nobody filled proves nothing
     (decision 0016 made the same call for the brief). A project starting from a copy gets the
     blank instead, because `begin` copies `TEMPLATE-REGISTER.md` over this file. -->

- **Personal data processed:** Not by the framework: the checks run offline on plain Node, with
  no accounts, no services and no systems of record (`docs/product/BRIEF.md`, Systems &
  integrations). The repository around it does carry personal data, because public version
  control does: contributor names and email addresses in commit metadata, and GitHub handles on
  issues and pull requests. That is one processing purpose, recorded below.
- **AI features:** None. Groundwork instructs AI agents; it contains, calls and ships no AI
  system of its own, so no AI Act provider or deployer duty attaches to the product. Article 4
  AI literacy applies to the people who operate agents on this repo: `AI-LITERACY.md`.
- **Applicable regimes:** GDPR (repository metadata only), AI Act Art 4 (as an operator of AI
  tools, not as a provider), licensing. Out of scope with a reason per row below: CRA, PLD, EAA,
  NIS2, DORA, Data Act. Verified 2026-07-31 against the sources in `COMPLIANCE.md`.

| # | Regime | Obligation | Status | Evidence / where implemented |
|---|---|---|---|---|
| C-1 | CRA | Manufacturer duties for a product with digital elements placed on the EU market | n/a while unmonetised | Groundwork is MIT-licensed free and open-source software that its maintainer does not monetise: no price, no paid or donor-only edition, no updates behind a payment, no service monetised through it, no personal data required for use. Under Art 2(1) with recital 18 and guidance C(2026) 5252 §3 (example 18: a freely downloadable tool, optional paid help alongside it) that is not making available on the market, so no manufacturer duty arises. Verified 2026-07-31. **Trigger:** any monetisation flips this row, and the constraint that holds it is in `docs/product/BRIEF.md`. |
| C-2 | CRA Art 24 | Open-source software steward: cybersecurity policy, cooperation with market surveillance, reporting | n/a | A steward is a **legal** person (Art 3(14)). Groundwork is published by a natural person, and guidance C(2026) 5252 §3.2.1 para 53 is explicit that for a natural person the freely provided version sits outside the CRA altogether. **Trigger:** the project moving under a company or foundation while copies are used commercially. That would arm this row even though C-1 stayed n/a. |
| C-3 | CRA Art 14 | Report actively exploited vulnerabilities and severe incidents, from 2026-09-11 | n/a, route published anyway | Follows C-1 and C-2: the duty binds manufacturers and stewards. `SECURITY.md` publishes the intake channel and the coordinated-disclosure route regardless, and Art 15 voluntary reporting stays open to us. |
| C-4 | PLD | No-fault liability for a defective product, from 2026-12-09 | n/a | Art 2(2) excludes free and open-source software supplied outside a commercial activity, which is the same test as C-1 and the same answer. Recital 13 points the same way for what this repo ships, since it keeps information outside the notion of a product and names the mere source code of software. Verified 2026-07-31. |
| C-5 | GDPR | Lawful basis, minimisation and data-subject rights for contributor metadata | met | Only what version control needs, recorded below. The framework itself collects nothing from the people who use it: the checks make no network calls, and the published explainer has no analytics, no cookies and no third-party request in any state (`index.html`, verified 2026-08-01: both webfonts are self-hosted, and since the four Google-hosted alternates were dropped the customizer offers only those two plus stacks the browser resolves on its own, so opening it fetches nothing). The one thing it stores on the visitor's device is their own theme, accent and font choice in `localStorage` under `gw-*` keys, which is storage the visitor asked for and so needs no consent under Art 11.7a Telecommunicatiewet. What remains is GitHub's own server log as the host, which the processing record names. |
| C-6 | AI Act Art 4 | AI literacy measures for the people operating AI here | met | `docs/compliance/AI-LITERACY.md`, with the current obligation and its dates in the AI Act row of `COMPLIANCE.md`. Who is covered here: the literacy line below. |
| C-7 | EAA | Accessibility of consumer-facing digital services | n/a as a duty, held as a floor | A free developer framework is not one of the Annex I services, and a solo maintainer is a microenterprise, exempt under Art 4(5) either way. The published explainer is held to WCAG 2.1 AA by `design-guard` regardless, because the standard is worth holding without a regulator. |
| C-8 | NIS2, DORA, Data Act | Sector duty of care and reporting; ICT contract clauses; connected-product and switching rules | n/a | No service is operated for third parties and no entity sits in an Annex I or II sector, so the Cyberbeveiligingswet does not reach this project; no financial-entity client exists to impose DORA Art 30 clauses; nothing here is a connected product or a cloud offering a customer could be locked into. **Trigger:** the first hosted service or paid engagement. |
| C-9 | Licensing | Every dependency, font and asset covered, notices shipped with what is redistributed | met, two gaps closed on 2026-07-31 | The framework is MIT (`LICENSE`) with zero runtime dependencies and no package manifest at the root: the checks run on plain Node. What this repo redistributes is the explainer's assets, and both notices were missing. The bundled Inter and Josefin Sans subsets are under the SIL Open Font License 1.1, which requires the notice to travel with the files: `fonts/OFL.txt` now does that. The inlined icons are Lucide, which is ISC and descends from Feather (MIT), not MIT as the source comment said; `index.html` now names both. The customizer no longer offers a font this repo does not hold: the four Google-hosted alternates were dropped on 2026-08-01 for system stacks, so `fonts/OFL.txt` covers every family the page can apply. |

**Processing record (Art 30)** <!-- per purpose: data, basis, retention, processors, residency -->

| Purpose | Data | Lawful basis | Retention | Processor(s) | EU residency |
|---|---|---|---|---|---|
| Version control and attribution of contributions in a public repository | Commit author name and email address, GitHub handle, the text people write in issues and pull requests | Legitimate interest, Art 6(1)(f): provenance and attribution are what a version-controlled project is for, and a contributor supplies the data by committing | For the life of the repository. Git history is append-only, so erasure or rectification means rewriting history or removing the repository, and both are done on request | GitHub, Inc. (Microsoft) hosts the repository, its Pages site and its Actions runs, and logs visitor IP addresses when the explainer is served | No: United States, under the EU-US Data Privacy Framework. The Commission's adequacy decision stands and the General Court upheld it on 2025-09-03; the appeal (C-703/25 P) is pending at the Court of Justice. Checked 2026-07-31 |

**AI literacy (Art 4): who is covered here** <!-- `AI-LITERACY.md` holds the measures -->

- One maintainer, who is both owner and only regular operator of the agents. Outside
  contributions arrive as pull requests and are covered by the same measures, because the
  rulebook and the gates apply to the change, not to who wrote it. Reviewed 2026-07-31.
