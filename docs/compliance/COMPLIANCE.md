# COMPLIANCE: EU/NL register

<!-- TEMPLATE: §1 facts ship with Groundwork (legal status verified 2026-07-06 against EUR-Lex,
     Commission and Council sources; the `comply` skill re-verifies dates before relying on
     them). §2 is this project's register, filled by `begin`/`comply`. -->

## 1. The regimes and when they bite (verified 2026-07-06)

| Regime | Applies when | Key obligations & dates |
|---|---|---|
| **GDPR / AVG** (2016/679) | Any personal data: an email address is enough | In force since 2018. Lawful basis per purpose; privacy by design (Art 25); processing records (Art 30); DPIA when high-risk (Art 35); breach → AP within 72h (Art 33); data-subject rights implemented, not promised. Reform proposals pending mid-2026. Encode current text. |
| **EU AI Act** (2024/1689, amended by Omnibus June 2026) | Any AI feature; Art 4 also when the team merely works with AI tools | Art 50 transparency **binding 2026-08-02**: disclose chatbots, machine-readably mark AI-generated content (pre-existing systems: grace to 2026-12-02). High-risk Annex III obligations **delayed to 2027-12-02** (Annex I embedded: 2028-08-02). Identify high-risk use early, design for it now. Art 4 AI literacy applies since 2025-02-02, nationally enforced from **2026-08-02** (verified 2026-07-22; evidence note: `AI-LITERACY.md`). Fines to €15M/3%. |
| **European Accessibility Act** (2019/882) | Consumer-facing digital services, e-commerce, banking, e-books, ... | **In force since 2025-06-28.** Conformity via EN 301 549 → WCAG 2.1 AA. Pre-existing service contracts: comply by 2027-06-28. Microenterprise service providers exempt. |
| **Cyber Resilience Act** (2024/2847) | Products with digital elements sold in the EU (incl. standalone software) | Reporting duty **since 2026-09-11**: actively exploited vulnerability/severe incident → ENISA platform (24h early warning, 72h notification). Full requirements (secure-by-default, SBOM, ≥5y updates, CE) **2027-12-11**. |
| **NIS2** (2022/2555) | Essential/important sectors, or supplier to one | Transposition incomplete mid-2026 (**NL still pending**, check status per project). Risk management, 24h/72h incident reporting, management accountability, supply-chain security. |
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

Open `blocked` rows block delivery (`deliver` checks this register). Dates in §1 age. The
`comply` skill re-verifies them against authoritative sources before every first delivery and
quarterly audit.
