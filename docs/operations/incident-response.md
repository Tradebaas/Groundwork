# Incident response runbook

<!-- Required by the `maintain` skill when something breaks for real users: this file is the
     order of work under pressure. Fill every placeholder before first delivery. The table is an
     operational mirror: whether a regime applies to this product, its effective dates and the
     legal detail are owned by docs/compliance/COMPLIANCE.md §1 - change the register first,
     update this table in the same commit. -->

## First hour

1. **Record awareness:** note the UTC time you became aware, in <incident log or tracker>.
   Every clock below counts from this moment, not from the fix.
2. **Stabilize:** rollback per `deploy.md` is a fine first fix. The order of work lives in the
   `maintain` skill.
3. **Check the table:** if a row triggers, notification runs in parallel with the fix, never
   after it. Decide in the first hour who sends what.

## Who notifies whom

| Trigger | Notify | Clock | Channel |
|---|---|---|---|
| Personal data breach (GDPR/AVG Art 33) | Autoriteit Persoonsgegevens | within 72h | Meldloket datalekken: datalekken.autoriteitpersoonsgegevens.nl |
| Same breach, high risk to the people affected (Art 34) | the people affected | without undue delay | <how this product reaches its users: email, in-app notice> |
| Actively exploited vulnerability or severe incident (CRA Art 14) | ENISA and the national CSIRT (for NL: NCSC) | 24h early warning, 72h notification; final report 14 days (vulnerability, once a fix exists) or 1 month (incident) | ENISA single reporting platform; when the duty starts is owned by the register's CRA row |
| In NIS2 / Cyberbeveiligingswet scope | NCSC-NL | 24h early warning, 72h notification; final report 1 month | mijn.ncsc.nl |
| Contractual (DORA client, SLA) | <contracted clients> | per contract | <where the incident contact list lives> |

- **Who owns the clock:** <name or role that decides and sends notifications during an incident>
- **Inbound:** vulnerability reports arrive via the channel in `SECURITY.md`; an actively
  exploited one starts the CRA row above.

## After stabilization

- Root cause, regression test, post-mortem: the `maintain` skill's incident section, using
  `post-mortem-TEMPLATE.md` in this folder.
- Final reports in the table have their own deadlines: put them in <calendar or tracker> on the
  day you send the first notification.
