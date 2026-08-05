// What checks/config.json means, and the gate that keeps it honest. The config is the one file
// that can weaken every other gate, in the same commit as the violation it hides, so it gates
// itself here. This file also owns the declaration the rest of the checks read: which paths this
// project did not write. Composed into the registry by check.mjs, like the other gate families.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// Paths a project declares as somebody else's work: an installed methodology, a vendored SDK.
// One list, in the open, so the exemption is a declaration and never a silent skip. Matching is
// by prefix, which survives an upstream rename of anything inside the payload.
export function thirdPartyMatcher(cfg) {
  const prefixes = ((cfg && cfg.thirdParty) || [])
    .map((e) => (e && typeof e.path === 'string' ? e.path : ''))
    .filter(Boolean);
  return (r) => prefixes.some((p) => r === p.replace(/\/+$/, '') || r.startsWith(p));
}

// The same matcher for a reader that has the repo root rather than the parsed config (the
// document walk in links.mjs). A config that cannot be read declares nothing: the gates then
// measure everything, which is the safe direction to fail in.
export function thirdPartyForRoot(root) {
  try {
    return thirdPartyMatcher(JSON.parse(readFileSync(join(root, 'checks', 'config.json'), 'utf8')));
  } catch {
    return () => false;
  }
}

export const configChecks = ({ cfg, fail }) => ({
  'config-invariants'() {
    // Both invariants come from a rule written down elsewhere, never from taste.
    const cap = cfg.budgets?.agentFileHardCapLines;
    // 200 is not a preference: past it an agent rulebook stops being read in full, so a higher
    // cap does not buy a longer file, it buys a file that silently stops governing. The two
    // ways to break it read differently, so they are reported differently.
    if (cap !== undefined && !(Number.isInteger(cap) && cap > 0)) {
      fail(`checks/config.json budgets.agentFileHardCapLines is ${JSON.stringify(cap)}, which is not a positive whole number of lines: agent-file-cap would fall back to 200 and the value would govern nothing.`);
    } else if (cap !== undefined && cap > 200) {
      fail(`checks/config.json budgets.agentFileHardCapLines is ${cap}: the hard cap is 200 lines and may be lowered, never raised. A rulebook past 200 lines stops being loaded in full.`);
    }
    // A boolean that retires a whole check is the same weakening vector as an exclusion that
    // hides a path, and no reading of the config can tell the legitimate case (a checkout with
    // no symlink support) from a gate somebody found inconvenient. So the exemption states its
    // case in the same diff that takes it, the trade this repo already made for
    // "checks:allow-length: <reason>" and "checks:allow-style". skills-symlink still reads the
    // key as a plain flag: which value is honest is this gate's question, and one red is enough.
    const skip = cfg.skipSymlinkCheck;
    if (skip !== undefined && skip !== false && !(typeof skip === 'string' && skip.trim())) {
      fail(`checks/config.json skipSymlinkCheck is ${JSON.stringify(skip)}: retiring the skills-symlink check takes a reason in the same file, as a non-empty string (e.g. "Windows without Developer Mode"). Set false to keep the check on.`);
    }
    // A third-party declaration stops several gates from measuring a path, so it states its case
    // in the entry, like every other exemption here. The path itself is bounded below, by the
    // same protected prefixes: a payload declared over checks/ would retire the gates wholesale.
    ((cfg.thirdParty) || []).forEach((e, i) => {
      if (!(e && typeof e.why === 'string' && e.why.trim())) {
        fail(`checks/config.json thirdParty[${i}] has no "why": a path this project's gates stop measuring says in the same entry whose work it is and why it is not measured.`);
      }
    });
    // An exclusion that reaches these prefixes disarms the gates rather than tuning them:
    // checks/ is where the gates themselves live, docs/standards/ is where a stack's rules do.
    // secretScanExclude names checks/ by construction (the detector patterns are in check.mjs
    // and would match themselves), so it is the one list allowed to, and only for that prefix.
    const protectedPrefixes = ['checks/', 'docs/standards/'];
    // Each list is read back by its own matching rule, so the invariant has to test the rule
    // that will actually run, or it guarantees less than its message claims. An affix list
    // (code-file-cap, secrets, third-party) hides a path when either end of it matches; a
    // substring list (denylist) hides it when the value appears anywhere inside it. Testing only
    // the prefix would let "s/" and "heck" walk past a gate whose whole job is to stop that.
    const hides = (mode, v, p) => v === '' || v.startsWith(p)
      || (mode === 'affix' ? p.startsWith(v) || p.endsWith(v) : p.includes(v));
    const lists = [
      ['codeFileCapExclude', cfg.codeFileCapExclude || [], protectedPrefixes, 'affix'],
      ['secretScanExclude', cfg.secretScanExclude || [], ['docs/standards/'], 'affix'],
      ...(cfg.thirdParty || []).map((e, i) => [`thirdParty[${i}].path`, [e?.path], protectedPrefixes, 'affix']),
      ...(cfg.denylist || []).map((e, i) => [`denylist[${i}].exclude`, e.exclude || [], protectedPrefixes, 'substring']),
    ];
    for (const [where, values, guarded, mode] of lists) {
      for (const v of values) {
        if (typeof v !== 'string') {
          fail(`checks/config.json ${where} holds ${JSON.stringify(v)}: an exclusion is a path string, and a non-string silently excludes nothing.`);
          continue;
        }
        // Overlap in either direction is a hit: "docs/" swallows docs/standards/ from above,
        // "docs/standards/react.md" carves it out from within, "" swallows everything.
        const hit = guarded.find((p) => hides(mode, v, p));
        if (hit) {
          fail(`checks/config.json ${where} excludes "${v}", which hides ${hit}: that is where the gates (or a stack's standards) live, so excluding it disarms a check instead of tuning it. Narrow the exclusion.`);
        }
      }
    }
  },
});
