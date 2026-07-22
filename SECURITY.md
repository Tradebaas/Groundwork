# Security policy

<!-- TEMPLATE: ships working for a GitHub-hosted repo and doubles as Groundwork's own policy.
     The reporting channel is real only when private vulnerability reporting is enabled in the
     repo settings (Settings -> Advanced Security): do that on day one. Per-product fields sit
     in HTML comments below, marked TBD: the contact route (when the repo is not on GitHub)
     and the support-period line (when the product is placed on the market). `comply` fills
     them; `deliver` checks at first release that the channel works. Regime dates live in
     docs/compliance/COMPLIANCE.md and are re-verified there, never here. -->

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

<!-- CRA (EU 2024/2847) Art 13(8): a product with digital elements placed on the EU market
     publishes a support period of at least five years; shorter only if the expected use time
     is shorter. When the product ships, surface and fill this line:
     - **This product:** TBD (e.g. "placed on the market 2027-01-15; security updates until
       at least 2032-01-15") -->

- **Groundwork itself** (the framework this repo started from) is free software distributed
  as a copy-once template, not a product placed on the market. Security fixes land on `main`
  of [Tradebaas/Groundwork](https://github.com/Tradebaas/Groundwork); a copied project starts
  from the state at copy time and receives nothing automatically, so track upstream yourself.

Security fixes ship through the normal delivery pipeline and are named in the changelog.
Supported versions: the latest release, unless the line above says otherwise.

## Our own reporting duties

An actively exploited vulnerability or a severe incident in a shipped product triggers the
CRA Art 14 duty: early warning within 24h, notification within 72h, then a final report on
the regime's own deadline, via the ENISA single reporting platform and the national CSIRT
(for NL: NCSC). Current dates and status per regime:
[the compliance register](docs/compliance/COMPLIANCE.md).
