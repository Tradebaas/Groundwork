---
name: comply
description: Compliance review against Dutch and EU law — GDPR/AVG, EU AI Act, accessibility (EAA/WCAG), NIS2, CRA, licensing. Use at project start (begin flags it), before first delivery, when new personal-data or AI processing is added, and at the quarterly audit. Verifies current rules against authoritative sources, never from memory.
---

# comply — legal is a gate, not a vibe

`docs/compliance/COMPLIANCE.md` is the register: which regimes apply to *this* project, what
they require, status per obligation. This skill fills and re-verifies it.

## 1. Determine what applies (per project, honestly)

Walk the register's trigger table against BRIEF.md and the actual system: personal data?
(almost always yes — an email address is enough) → GDPR/AVG. AI features → AI Act, at minimum
Art 50 transparency. Consumer-facing digital service/e-commerce → European Accessibility Act.
Product with digital elements sold in the EU → CRA. Essential/important sector or supplier to
one → NIS2. Every dependency → its license.

## 2. Verify current state of the law

Regulations shift (the register's dates were verified 2026-07-06 and will age). For each
applicable regime, confirm today's status via authoritative sources — EUR-Lex, the Commission's
pages, the AP (autoriteitpersoonsgegevens.nl) for NL — and update the register's dates. Never
assert a deadline or obligation from model memory.

## 3. Apply per obligation — build it in, don't bolt it on

- **GDPR/AVG**: lawful basis named per processing purpose; data minimization in the schema
  (collect nothing "for later"); records of processing (Art 30); DPIA if high-risk (Art 35);
  data-subject rights executable (export, delete — actually implemented, not promised);
  processor agreements for every third-party service touching personal data; EU data residency
  checked per service; breach path known (72h to the AP).
- **AI Act**: users told they're interacting with AI; AI-generated content marked
  machine-readably (Art 50, binding since 2026-08-02); high-risk uses (Annex III) identified
  early — obligations land 2027-12-02, design for them now, not then.
- **Accessibility**: EN 301 549 / WCAG 2.1 AA as the working floor (design-guard checks it per
  delivery; this skill checks the claim holds product-wide).
- **CRA**: secure-by-default posture, vulnerability intake channel, update path; actively
  exploited vulnerability → reporting duty via ENISA platform (since 2026-09-11).
- **Licensing**: every dependency's license compatible with the product's use and distribution;
  copyleft obligations honored; the register lists anything non-trivial.

## 4. Verdict and record

Register updated: per obligation `met / open / blocked / n/a` + evidence link. Open items
that block delivery are named as blockers in STATE.md — delivery waits, that's the point.
Report: what applies, what's green, what blocks, the one next step. ⚓
