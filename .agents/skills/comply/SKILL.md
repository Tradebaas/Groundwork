---
name: comply
description: Compliance review against Dutch and EU law: GDPR/AVG, EU AI Act, accessibility (EAA/WCAG), NIS2, CRA, licensing. Use at project start (begin flags it), before first delivery, when new personal-data or AI processing is added, and at the quarterly audit. Verifies current rules against authoritative sources, never from memory.
---

# comply: legal is a gate, not a vibe

`docs/compliance/COMPLIANCE.md` is the register: which regimes apply to *this* project, what
they require, status per obligation. This skill fills and re-verifies it.

## 1. Determine what applies (per project, honestly)

Walk the register's trigger table against BRIEF.md and the actual system: personal data?
(almost always yes: an email address is enough) → GDPR/AVG. AI features → AI Act, at minimum
Art 50 transparency. Consumer-facing digital service/e-commerce → European Accessibility Act.
Product with digital elements sold in the EU → CRA. Software placed on the EU market, which is
virtually every shipped product → Product Liability Directive. Essential/important sector or
supplier to one → NIS2. The client is a financial entity → DORA. Connected product, or a
cloud/SaaS service a customer can switch away from → Data Act. Every dependency → its
license.

## 2. Verify current state of the law

Regulations shift (every register row carries its own last-verified date; they age). For each
applicable regime, confirm today's status via authoritative sources (EUR-Lex, the Commission's
pages, the AP (autoriteitpersoonsgegevens.nl) for NL) and update the register's dates. Stamp
today in `Dates verified` on the rows you actually checked, and leave the other rows' stamps
alone: a partial pass that stamps the whole table turns a stale row into a fresh-looking one.
Never assert a deadline or obligation from model memory. Deadline horizon: when any register
date falls within the next 60 days, re-verify that regime now instead of waiting for the
quarterly audit - rules move fastest just before they bite.

## 3. Apply per obligation: build it in, don't bolt it on

- **GDPR/AVG**: lawful basis named per processing purpose; data minimization in the schema
  (collect nothing "for later"); records of processing (Art 30); DPIA if high-risk (Art 35);
  data-subject rights executable (export, delete: actually implemented, not promised); the
  retention periods recorded here honored to the end, the product's own retirement included
  (`maintain` owns that step);
  processor agreements for every third-party service touching personal data; EU data residency
  checked per service; breach path known (72h to the AP).
- **AI Act**: users told they're interacting with AI; AI-generated content marked
  machine-readably (Art 50, binding from 2026-08-02); high-risk uses (Annex III) identified
  early. Obligations land 2027-12-02, design for them now, not then. Art 4 AI literacy:
  `docs/compliance/AI-LITERACY.md` is the evidence note; keep its "Who is covered" line true
  for this team and re-check the note at the quarterly audit.
- **Accessibility**: EN 301 549 / WCAG 2.1 AA as the working floor (design-guard checks it per
  delivery; this skill checks the claim holds product-wide).
- **CRA**: secure-by-default posture; the vulnerability intake channel and the support period
  are published in the root `SECURITY.md` (ships as a working template; fill its marked TBD
  fields per product); actively exploited vulnerability → reporting duty via ENISA platform
  (from 2026-09-11).
- **PLD**: software is a product with no-fault liability; defectiveness includes cybersecurity
  vulnerabilities, and damage covers users' destroyed or corrupted data. The CRA posture above
  plus a proven restore path (`docs/operations/backup-restore.md`) are the working defense.
- **DORA**: the obligations arrive through the financial client's contract (Art 30: security
  measures, incident support, audit and access rights, exit strategy); check those clauses
  against what the product actually delivers and record any gap in the register.
- **Data Act**: a connected product is designed so its data reaches the user by default, not
  bolted on as an export later; a cloud/SaaS offering carries no switching barriers and an exit
  the customer can actually walk, contract terms and egress included.
- **Licensing**: every dependency's license compatible with the product's use and distribution;
  copyleft obligations honored; the register lists anything non-trivial.

## 4. Verdict and record

Register updated: per obligation `met / open / blocked / n/a` + evidence link. Open items
that block delivery are named as blockers in STATE.md. Delivery waits, that's the point.
Report: what applies, what's green, what blocks, the one next step. ⚓
