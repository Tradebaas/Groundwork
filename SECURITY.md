# Security policy

<!-- TEMPLATE: ships working for a GitHub-hosted repo and doubles as Groundwork's own policy.
     The reporting channel is real only when private vulnerability reporting is enabled in the
     repo settings (Settings -> Advanced Security): do that on day one. Per-product fields sit
     in HTML comments below, marked TBD: the contact route (when the repo is not on GitHub)
     and the support-period line (when the product is placed on the market). `comply` fills
     them; `deliver` checks at first release that the channel works. Regime dates live in
     docs/compliance/COMPLIANCE.md and are re-verified there, never here; whether a regime
     reaches this project is docs/compliance/REGISTER.md's answer. -->

## Report a vulnerability

Report security issues privately via this repository's **Security tab, "Report a
vulnerability"** (GitHub private vulnerability reporting). Never use a public issue or pull
request for a security problem.

<!-- Not hosted on GitHub? Surface a monitored contact here and remove this comment:
     - **Security contact:** TBD (e.g. security@<domain>); a product with a public website
       also mirrors it in /.well-known/security.txt (RFC 9116). -->

Include what you can: affected version or commit, steps to reproduce, impact as you see it.
A partial report is welcome; send what you have.

## What happens next (coordinated disclosure)

- **Acknowledgement** within 3 working days.
- **Assessment** within 14 days: severity, affected versions, fix plan. After that you get a
  status update at least every 14 days.
- **Coordinated disclosure:** an advisory is published when a fix is available, or 90 days
  after the report, whichever comes first. If more time is needed, we say so and agree a new
  date with you.
- **Credit** in the advisory, if you want it.

Good-faith research is safe here: stay at proof-of-concept depth (no data exfiltration, no
service disruption, no social engineering), leave user data alone, and give us the window
above. Under those rules we will not pursue legal action.

## Support period and security updates

<!-- CRA (EU 2024/2847): a product with digital elements placed on the EU market carries a
     support period of at least five years, or the expected use time when that is shorter
     (Art 13(8)), and states its end date to the buyer (Art 13(19)). This binds a product
     supplied in the course of a commercial activity; free and open-source software its
     manufacturer does not monetise is outside that test, so the line below is filled when the
     product is monetised, not merely when it ships. `comply` decides which case this is and
     records it in the register. When it applies, surface and fill this line:
     - **This product:** TBD (e.g. "placed on the market 2027-01-15; security updates until
       at least 2032-01-15") -->

- **Groundwork itself** (the framework this repo started from) is free and open-source software
  that its maintainer does not monetise, so it is not made available on the market within the
  meaning of the CRA and carries no published support period. The scope test behind that, and
  what would flip it, stand in the CRA row of
  [the regimes table](docs/compliance/COMPLIANCE.md). Security fixes land on `main` of
  [Tradebaas/Groundwork](https://github.com/Tradebaas/Groundwork) and are named in the
  changelog of the release that carries them; a copied project starts from the state at copy
  time and receives nothing automatically, so track upstream yourself.

Security fixes ship through the normal delivery pipeline and are named in the changelog.
Supported versions: the latest release, unless the line above says otherwise.

## Our own reporting duties

An actively exploited vulnerability or a severe incident in a shipped product triggers the
CRA Art 14 duty: early warning within 24h, notification within 72h, then a final report on
the regime's own deadline, via the ENISA single reporting platform and the national CSIRT
(for NL: NCSC). Current dates per regime: [the regimes table](docs/compliance/COMPLIANCE.md).
Which of them reach this project, and the status per obligation:
[its register](docs/compliance/REGISTER.md).
