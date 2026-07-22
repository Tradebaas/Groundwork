# COMPLIANCE: EU/NL register

<!-- TEMPLATE: §1 facts ship with Groundwork (legal status verified 2026-07-22 against EUR-Lex,
     Commission, EDPB, W3C/ETSI and NL government sources; the `comply` skill re-verifies dates
     before relying on them). §2 is this project's register, filled by `begin`/`comply`. -->

## 1. The regimes and when they bite (verified 2026-07-22)

| Regime | Applies when | Key obligations & dates |
|---|---|---|
| **GDPR / AVG** (2016/679) | Any personal data: an email address is enough | In force since 2018. Lawful basis per purpose; privacy by design (Art 25); processing records (Art 30); DPIA when high-risk (Art 35); breach → AP within 72h (Art 33); data-subject rights implemented, not promised. Reform proposals pending mid-2026. Encode current text. |
| **EU AI Act** (2024/1689; omnibus amendment signed 2026-07-08, OJ publication pending) | Any AI feature; Art 4 also when the team merely works with AI tools | Art 50 transparency **from 2026-08-02**: disclose chatbots, machine-readably mark AI-generated content (systems from before that date: marking duty grace to 2026-12-02). High-risk Annex III obligations **delayed to 2027-12-02** (Annex I embedded: 2028-08-02). Identify high-risk use early, design for it now. GPAI providers: obligations since 2025-08-02, Commission enforcement from **2026-08-02**. Art 4 AI literacy applies since 2025-02-02, nationally enforced from **2026-08-02** (evidence note: `AI-LITERACY.md`). AI feature touching personal data → EDPB Opinion 28/2024 anchors it (model anonymity, legitimate interest, unlawfully trained models). Fines to €35M/7% (prohibited practices; most violations €15M/3%). |
| **European Accessibility Act** (2019/882) | Consumer-facing digital services, e-commerce, banking, e-books, ... | **In force since 2025-06-28.** Working standard EN 301 549 v3.2.1 → WCAG 2.1 AA; the WCAG 2.2-aligned v4 is in approval, expected 2026 - build new UI to WCAG 2.2 AA now. Service contracts from before 2025-06-28 may run unchanged until **2030-06-28** at the latest. Microenterprise service providers exempt. NL enforcement for e-commerce/digital services: ACM, fines to €900k or 1% of turnover. |
| **Cyber Resilience Act** (2024/2847) | Products with digital elements sold in the EU (incl. standalone software) | Reporting duty **from 2026-09-11**: actively exploited vulnerability/severe incident → ENISA platform (24h early warning, 72h notification; final report 14 days after a fix is available for vulnerabilities, 1 month for incidents). Full requirements (secure-by-default, SBOM, ≥5y updates, CE) **2027-12-11**. |
| **Product Liability Directive** (2024/2853) | Software placed on the EU market, standalone included | Software is a product: no-fault liability for defects, defectiveness includes cybersecurity vulnerabilities, damage covers destroyed or corrupted data not used for professional purposes. Applies to products placed on the market **from 2026-12-09** (national transposition due the same date). |
| **NIS2** (2022/2555) | Essential/important sectors, or supplier to one | NL transposition (Cyberbeveiligingswet) **in force 2026-08-15**, no transition period; registration via mijn.ncsc.nl. Risk management (zorgplicht), incident reporting 24h/72h with final report in 1 month, management accountability, supply-chain security. |
| **DORA** (2022/2554) | The client is a financial entity (bank, insurer, investment firm, ...) | Applies since 2025-01-17. Financial clients must impose ICT-risk clauses on their software suppliers (Art 30: security measures, incident support, audit and access rights, exit strategy) - expect them in the contract. Critical ICT third-party providers fall under EU oversight. |
| **Data Act** (2023/2854) | Connected products; cloud/SaaS switching | Applies since 2025-09-12. Switching barriers banned; max 2-month notice; switching fees gone by 2027-01-12; access-by-design for products from 2026-09-12. |
| **Licensing** | Every dependency, font, asset, service | License compatible with use and distribution; copyleft honored; entitlements (fonts, icons, APIs) actually held. |

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
