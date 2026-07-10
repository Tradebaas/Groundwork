# 05: Code-file line cap check

- **Blocked by:** none
- **Status:** done

**What to build:** A source file that grows past its budget turns the gate red before it turns
the codebase unreadable. A new `code-file-cap` check in `checks/check.mjs` walks CODE_EXT
files (plus `extraCodeExtensions`), fails any file over `budgets.codeFileMaxLines` (default
500), and honors an escape marker (`checks:allow-length` with a reason) for the rare
legitimate case (generated files, vendored code), mirroring the secrets-check exclude
discipline.

**Acceptance:**

- [x] A 501-line code file fails; the failure names the file, count, and budget
- [x] The escape marker and configured excludes suppress the failure
- [x] `checks/check.test.mjs` proves failure, escape, and passing cases
- [x] `checks/config.json` gains `codeFileMaxLines`; existing budgets unchanged
