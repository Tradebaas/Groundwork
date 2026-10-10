# Axis C reference: the seven breaks

Drawn from the OWASP Top 10 classes plus GDPR/AVG data minimization (grounds: NIST SSDF PW.7, ISO/IEC 27001:2022 A.8.28).

1. Missing authorization: an action or query that confirms the caller is logged in but not that
   this caller may touch this specific record.
2. Unsanitized sink: external input reaching a query, shell command, path, template, or redirect
   without being parameterized, encoded, or allow-listed for that sink.
3. Fail-open check: an auth or validation branch whose failure path falls through to allow
   instead of deny, the floor's "fail closed" read backwards.
4. Sensitive data leaking sideways: a secret, token, or PII field flowing into a log, a URL, an
   error message, or a client response that should not carry it.
5. Weak or hand-rolled crypto: a home-grown cipher or token scheme, a predictable random source
   for a security value, an unsalted or fast password hash, a secret compared non-constant-time.
6. Trusting the client's file: an upload accepted on its client-supplied name or type, written to
   an executable or web-served path, or stored with no size or type bound.
7. Collecting more than needed: new personal data gathered or kept past the stated purpose
   (GDPR/AVG data minimization).
