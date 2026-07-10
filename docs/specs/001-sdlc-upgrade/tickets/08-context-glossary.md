# 08: CONTEXT.md domain glossary

- **Blocked by:** 04-spec-interview
- **Status:** ready

**What to build:** Every project gets a shared vocabulary that compresses tokens session after
session: a `docs/product/CONTEXT.md` glossary (term in bold, one-to-two-line definition, an
Avoid list of banned synonyms; project-specific terms only, no general programming concepts).
`begin` seeds it during the intake interview, `scope` and `spec` add terms the moment a fuzzy
word surfaces ("you said account: the Customer or the User?"), and updates happen inline, not
batched. The glossary stays free of implementation detail; it defines language, nothing else.

**Acceptance:**

- [ ] `docs/product/CONTEXT.md` template exists, with a manifest row in `docs/README.md`
- [ ] `begin`, `scope`, and `spec` skills each carry their glossary duty in one or two lines
- [ ] The template shows one worked example term with an Avoid list
- [ ] `node checks/check.mjs` green
