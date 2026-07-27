# COMPLIANCE: EU/NL register

<!-- TEMPLATE: §1 facts ship with Groundwork (legal status first verified 2026-07-22 against
     EUR-Lex, Commission, EDPB, W3C/ETSI and NL government sources; the `Dates verified` column
     carries each row's own last check, and the `comply` skill re-verifies a row before relying
     on it). §2 is this project's register, filled by `begin`/`comply`. -->

## 1. The regimes and when they bite

| Regime | Dates verified | Applies when | Key obligations & dates |
|---|---|---|---|
| **GDPR / AVG** (2016/679) | 2026-07-22 | Any personal data: an email address is enough | In force since 2018. Lawful basis per purpose; privacy by design (Art 25); processing records (Art 30); DPIA when high-risk (Art 35); breach → AP within 72h (Art 33), high risk → inform the people affected without undue delay (Art 34); data-subject rights implemented, not promised. Reform proposals pending mid-2026. Encode current text. |
| **EU AI Act** (2024/1689, as amended by the Digital Omnibus on AI (EU) 2026/1744, in the OJ 2026-07-24 and in force 2026-07-27) | 2026-07-27 | Any AI feature; Art 4 also when the team merely works with AI tools | Art 50 transparency **from 2026-08-02**, untouched by the omnibus: disclose chatbots, machine-readably mark AI-generated content (systems already on the market before that date: marking grace to 2026-12-02). New prohibited practice **from 2026-12-02**: AI systems that generate child sexual abuse material or non-consensual intimate imagery. High-risk obligations now enacted rather than proposed: Annex III **2027-12-02**, Annex I embedded **2028-08-02**. Identify high-risk use early, design for it now. GPAI providers: obligations since 2025-08-02, Commission enforcement from **2026-08-02**. Art 4 AI literacy applies since 2025-02-02 and is nationally enforced from **2026-08-02**; the omnibus softened what it asks, and `AI-LITERACY.md` states the current obligation and is the evidence note. AI feature touching personal data → EDPB Opinion 28/2024 anchors it (model anonymity, legitimate interest, unlawfully trained models). Fines to €35M/7% (prohibited practices; most violations €15M/3%). |
| **European Accessibility Act** (2019/882) | 2026-07-22 | Consumer-facing digital services, e-commerce, banking, e-books, ... | **In force since 2025-06-28.** Working standard EN 301 549 v3.2.1 → WCAG 2.1 AA; the WCAG 2.2-aligned v4 is in approval, expected 2026 - build new UI to WCAG 2.2 AA now. Service contracts from before 2025-06-28 may run unchanged until **2030-06-28** at the latest. Microenterprise service providers exempt. NL enforcement for e-commerce/digital services: ACM, fines to €900k or 1% of turnover. |
| **Cyber Resilience Act** (2024/2847) | 2026-07-27 | Products with digital elements sold in the EU (incl. standalone software) | In force since 2024-12-10. Reporting duty **from 2026-09-11**: actively exploited vulnerability/severe incident goes once into the CRA Single Reporting Platform, addressed to the CSIRT of your main establishment and made available to ENISA at the same time (24h early warning, 72h notification; final report 14 days after a corrective measure is available for vulnerabilities, 1 month for incidents). Full requirements (secure-by-default, SBOM, ≥5y updates, CE) **2027-12-11**. |
| **Product Liability Directive** (2024/2853) | 2026-07-22 | Software placed on the EU market, standalone included | Software is a product: no-fault liability for defects, defectiveness includes cybersecurity vulnerabilities, damage covers destroyed or corrupted data not used for professional purposes. Applies to products placed on the market **from 2026-12-09** (national transposition due the same date). |
| **NIS2** (2022/2555) | 2026-07-27 | Essential/important sectors, or supplier to one | NL transposition (Cyberbeveiligingswet) **in force 2026-08-15**, no transition period; registration via mijn.ncsc.nl, which files to the sectoral CSIRT and the supervisor in one go. Risk management (zorgplicht), incident reporting 24h early warning and 72h follow-up with the final report 1 month after the first one, management accountability, supply-chain security. |
| **DORA** (2022/2554) | 2026-07-22 | The client is a financial entity (bank, insurer, investment firm, ...) | Applies since 2025-01-17. Financial clients must impose ICT-risk clauses on their software suppliers (Art 30: security measures, incident support, audit and access rights, exit strategy) - expect them in the contract. Critical ICT third-party providers fall under EU oversight. |
| **Data Act** (2023/2854) | 2026-07-27 | Connected products; cloud/SaaS switching | Applies since 2025-09-12. Switching barriers banned; max 2-month notice; switching charges including data egress entirely gone **from 2027-01-12**. Access-by-design (Art 3(1)) binds connected products and their related services **placed on the market after 2026-09-12**: relevant data reachable by the user by default, easily, securely and free of charge where technically feasible. Digital Omnibus amendments to this regulation are proposed, not adopted. |
| **Licensing** | n/a | Every dependency, font, asset, service | License compatible with use and distribution; copyleft honored; entitlements (fonts, icons, APIs) actually held. |

## 2. THIS PROJECT: register <!-- filled by `begin` / `comply`; re-verified per delivery -->

- **Personal data processed:** TBD <!-- yes/no + what and why; if yes, GDPR rows below -->
- **AI features:** TBD <!-- yes/no + which; if yes, AI Act rows below -->
- **Applicable regimes:** TBD

| # | Regime | Obligation | Status | Evidence / where implemented |
|---|---|---|---|---|
| C-1 | TBD | TBD | open / met / blocked / n/a | TBD |

**Processing record (Art 30)** <!-- per purpose: data, basis, retention, processors, residency -->

| Purpose | Data | Lawful basis | Retention | Processor(s) | EU residency |
|---|---|---|---|---|---|
| TBD | TBD | TBD | TBD | TBD | TBD |

Open `blocked` rows block delivery (`deliver` checks this register). Dates in §1 age: the
`comply` skill re-verifies them against authoritative sources before every first delivery, at
the quarterly audit, and sooner when a date here is about to land (its deadline-horizon rule).
A pass usually covers some rows and not others, so it stamps only the rows it actually checked
in `Dates verified`. That column is the honest answer to "how current is this?", per row.
