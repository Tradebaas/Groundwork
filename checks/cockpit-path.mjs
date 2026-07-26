// The cockpit path decision: what the board may open, and who may ask.
// Two answers, both pure, both testable without a server, and both the only thing standing
// between a loopback page and the rest of the disk. They live in their own file because the
// file route is the one real attack surface this repository has (spec 010, criteria 14 to 17),
// and a security seam is easier to keep honest when nothing else shares the page it is on.
// Tested directly in checks/cockpit.test.mjs, never through the server.

import { realpathSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve, relative, sep, isAbsolute } from 'node:path';

// The security seam. Project root and a requested path in, permitted or refused out: no HTTP,
// no rendering, nothing that needs a server to test. Every refusal returns the same bare
// answer, so a caller can never learn from it whether a file exists.
const REFUSED = Object.freeze({ ok: false });
const DENIED_SEGMENT = /^(\.git|\.env(\..+)?|node_modules)$/i;
const DENIED_SUFFIX = /\.(pem|key|p12|pfx)$/i;

function gitIgnored(root, relPath) {
  try {
    // Exit 0 means the project ignores this path. Any other outcome (not ignored, not a
    // repository, no git at all) throws, and the explicit denials above still stand.
    execFileSync('git', ['check-ignore', '--quiet', '--', relPath], { cwd: root, stdio: 'ignore' });
    return true;
  } catch { return false; }
}

// Five questions, each of which refuses on its own; none of them repeats another, so no line
// here can rot behind a line above it.
export function decidePath(root, requested, { isIgnored = gitIgnored } = {}) {
  // 1. Is this a path at all? A route with no path parameter hands over null.
  if (typeof requested !== 'string' || !requested) return REFUSED;

  // 2. Is it relative? Every path the board hands out is, so an absolute one is somebody
  //    else's idea. It is refused as a spelling, including the case that would land inside the
  //    project anyway, which containment alone waves through whenever the root's own path is
  //    written out in full.
  if (isAbsolute(requested) || /^[a-z]:[\\/]/i.test(requested)) return REFUSED;
  let realRoot;
  try { realRoot = realpathSync(root); } catch { return REFUSED; }

  // 3. Is it spelled from inside the project? resolve() folds every traversal spelling into one
  //    comparison: relative, encoded (the query is decoded before it gets here), and any mix of
  //    them. A path that resolves anywhere but under the root is refused.
  const full = resolve(realRoot, requested);
  if (!full.startsWith(realRoot + sep)) return REFUSED;

  // 4. Does it land inside the project? Resolved through every symlink, so a link whose target
  //    sits outside is outside, whatever its name says. A missing file, a directory and an
  //    unreadable path all leave here with the same answer as a forbidden one.
  let real;
  let stat;
  try {
    real = realpathSync(full);
    stat = statSync(real);
  } catch { return REFUSED; }
  if (!real.startsWith(realRoot + sep) || !stat.isFile()) return REFUSED;

  // 5. Is it the owner's to read on a page? Judged on where the path landed, never on how it
  //    was spelled, so a link cannot smuggle a name past this.
  const relPath = relative(realRoot, real).split(sep).join('/');
  if (relPath.split('/').some((s) => DENIED_SEGMENT.test(s)) || DENIED_SUFFIX.test(relPath)) return REFUSED;
  if (isIgnored(realRoot, relPath)) return REFUSED;
  return { ok: true, path: real, rel: relPath, size: stat.size };
}

// A request that reached the loopback socket can still come from a page that rebound a name to
// 127.0.0.1 in the same browser. The Host header is what that attack cannot fake.
export function hostAllowed(header) {
  if (typeof header !== 'string' || !header.trim()) return false;
  let host = header.trim().toLowerCase();
  if (host.startsWith('[')) {
    const end = host.indexOf(']');
    if (end === -1) return false;
    host = host.slice(1, end);
  } else {
    host = host.split(':')[0];
  }
  return host === 'localhost' || host === '::1' || /^127\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(host);
}
