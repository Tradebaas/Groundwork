// Groundwork cockpit: one page that shows where the project stands.
// Started from the progress command: node checks/progress.mjs --serve [--port <n>]
//
// The design law: every card renders from the file that owns the fact, at the moment of
// viewing. Nothing is copied into a view, nothing is stored, nothing is generated ahead of
// time. A board that keeps its own copy of the numbers becomes a second claim on the truth and
// rots, which is why the progress overview derives instead of storing, and why this renders on
// the server instead of shipping data to a browser application.
// The one real attack surface is the file route; its decision is decidePath() below, tested
// directly in checks/cockpit.test.mjs rather than through the server.
// Spec: docs/specs/010-cockpit (maintainer-local).

import { createServer } from 'node:http';
import { readFileSync, realpathSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve, relative, sep } from 'node:path';
import { readProject, derive, WORDS, warningText, BRIEF_PATH } from './progress.mjs';

const DEFAULT_PORT = 8321;
// Past this, a file stops being something to read on a page and starts being a download.
const FILE_MAX_BYTES = 512 * 1024;

// The board's own framing words. Everything with content in it comes from the project's
// documents through progress.mjs, so only these connectors live here.
const BOARD = {
  en: {
    stand: 'Where the project stands',
    live: 'Read from the project files the moment you opened this page. Nothing here is stored.',
    progress: 'Progress',
    source: 'From',
    cardFailed: (why) => `This card could not be built: ${why}. The other cards still hold.`,
    broke: 'The board could not be built. The reason is printed where you started it.',
    back: 'Back to the board',
    readOnly: 'This file as it is on disk right now, read-only.',
    refused: 'Not available.',
    notShown: (name, size) => `${name} is ${size} and is not shown here. Open it on disk.`,
    binary: (name, size) => `${name} is not text (${size}) and is not shown here.`,
  },
  nl: {
    stand: 'Waar het project staat',
    live: 'Gelezen uit de projectbestanden op het moment dat je deze pagina opende. Er wordt hier niets bewaard.',
    progress: 'Voortgang',
    source: 'Uit',
    cardFailed: (why) => `Deze kaart kon niet worden opgebouwd: ${why}. De andere kaarten kloppen nog.`,
    broke: 'Het overzicht kon niet worden opgebouwd. De reden staat waar je het gestart hebt.',
    back: 'Terug naar het overzicht',
    readOnly: 'Dit bestand zoals het nu op schijf staat, alleen-lezen.',
    refused: 'Niet beschikbaar.',
    notShown: (name, size) => `${name} is ${size} en wordt hier niet getoond. Open het op schijf.`,
    binary: (name, size) => `${name} is geen tekst (${size}) en wordt hier niet getoond.`,
  },
};

const words = (lang) => BOARD[lang] || BOARD.en;

// ---------------------------------------------------------------- the path decision

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

// Four questions, each of which refuses on its own; none of them repeats another, so no line
// here can rot behind a line above it.
export function decidePath(root, requested, { isIgnored = gitIgnored } = {}) {
  // 1. Is this a path at all? A route with no path parameter hands over null.
  if (typeof requested !== 'string' || !requested) return REFUSED;
  let realRoot;
  try { realRoot = realpathSync(root); } catch { return REFUSED; }

  // 2. Is it spelled from inside the project? resolve() folds every traversal spelling into one
  //    comparison: relative, absolute, encoded (the query is decoded before it gets here), and
  //    any mix of them. A path that resolves anywhere but under the root is refused.
  const full = resolve(realRoot, requested);
  if (!full.startsWith(realRoot + sep)) return REFUSED;

  // 3. Does it land inside the project? Resolved through every symlink, so a link whose target
  //    sits outside is outside, whatever its name says. A missing file, a directory and an
  //    unreadable path all leave here with the same answer as a forbidden one.
  let real;
  let stat;
  try {
    real = realpathSync(full);
    stat = statSync(real);
  } catch { return REFUSED; }
  if (!real.startsWith(realRoot + sep) || !stat.isFile()) return REFUSED;

  // 4. Is it the owner's to read on a page? Judged on where the path landed, never on how it
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

// ---------------------------------------------------------------- rendering

export const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (c) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[c]));

// The report's sentences carry `backticked` skill names. They are escaped like everything else,
// then the backticks become the markup they always meant.
const sentence = (text) => escapeHtml(text).replace(/`([^`]+)`/g, '<code>$1</code>');

const fileHref = (relPath) => `/file?path=${encodeURIComponent(relPath)}`;

export function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} bytes`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// defer: the few token values below are copied from the explainer (index.html) instead of read
// from a token file. ceiling: a third surface, or the owner moving the accent, makes the copies
// drift. upgrade-when: this project's own token section in docs/design/DESIGN.md is filled.
const STYLE = `:root{color-scheme:dark light;
  --bg:#0a0b0b;--surface:rgba(255,255,255,.025);--line:rgba(255,255,255,.08);
  --ink:#f2f3f1;--ink2:#c3c6c0;--muted:#8f938a;--accent:#3fae9f;--tint:#3fae9f17;
  --r:14px;--rs:8px;--maxw:900px}
@media(prefers-color-scheme:light){:root{
  --bg:#f6f7f6;--surface:#fdfdfc;--line:rgba(0,0,0,.10);
  --ink:#15181a;--ink2:#454b47;--muted:#5d625c;--accent:#2f6664;--tint:#2f66640f}}
*{box-sizing:border-box}
body{margin:0;padding:48px 20px 80px;background:var(--bg);color:var(--ink);
  font:16px/1.65 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;
  -webkit-font-smoothing:antialiased}
main{max-width:var(--maxw);margin:0 auto}
h1{font-size:27px;line-height:1.2;letter-spacing:-.02em;margin:0 0 8px;font-weight:700}
.sub{color:var(--muted);margin:0 0 36px;font-size:14px;max-width:62ch}
.card{border:1px solid var(--line);border-radius:var(--r);background:var(--surface);
  padding:26px 28px;margin:0 0 20px}
.card h2{font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);
  margin:0 0 16px;font-weight:600}
.lead{font-size:20px;line-height:1.35;margin:0}
h3{font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:var(--accent);
  margin:24px 0 8px;font-weight:600}
ul{margin:0;padding-left:22px}
li{margin:0 0 6px;color:var(--ink2)}
p{margin:0 0 12px}
.src{margin:22px 0 0;padding-top:16px;border-top:1px solid var(--line);font-size:13px;color:var(--muted)}
.note{border-left:2px solid var(--accent);background:var(--tint);padding:12px 16px;
  margin:20px 0 0;border-radius:0 var(--rs) var(--rs) 0;color:var(--ink2)}
a{color:var(--accent)}
a:focus-visible{outline:2px solid var(--accent);outline-offset:3px;border-radius:2px}
code{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:.9em}
pre{margin:0;padding:22px;background:var(--surface);border:1px solid var(--line);
  border-radius:var(--r);overflow:auto;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;
  font-size:13px;line-height:1.6;color:var(--ink2);white-space:pre-wrap;word-break:break-word}`;

function page({ lang = 'en', title, body }) {
  return `<!doctype html>
<html lang="${escapeHtml(lang)}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(title)}</title>
<style>${STYLE}</style>
</head>
<body>
<main>
${body}
</main>
</body>
</html>
`;
}

// A card builds or it names its failure. One card that cannot be built never takes the board
// down with it, because a half-empty board still answers most of the question.
// owner: { lang, path, openable } - the file that owns this card's content. It is named either
// way; it is a link only when the file route will actually serve it.
export function card(title, owner, build) {
  const w = words(owner?.lang);
  let body;
  try {
    body = build();
  } catch (e) {
    body = `<p class="note">${escapeHtml(w.cardFailed(e.message))}</p>`;
  }
  const path = owner?.path;
  let src = '';
  if (path) {
    const named = owner.openable === false
      ? escapeHtml(path)
      : `<a href="${fileHref(path)}">${escapeHtml(path)}</a>`;
    src = `<p class="src">${escapeHtml(w.source)} ${named}</p>`;
  }
  return `<section class="card">\n<h2>${escapeHtml(title)}</h2>\n${body}\n${src}\n</section>`;
}

// The progress card, straight off the existing derivation: the same states, the same counting
// rules, the same heads-up facts the text report produces. No second judgment lives here.
export function progressCard(project, progress) {
  const w = WORDS[project.lang] || WORDS.en;
  if (!progress.defined) return `<p class="lead">${sentence(w.noScope)}</p>`;
  const out = [`<p class="lead">${escapeHtml(`${w.doneOfTotal(progress.done, progress.total)}.`)}</p>`];
  const group = (head, state) => {
    const list = progress.items.filter((i) => i.state === state);
    if (!list.length) return;
    out.push(`<h3>${escapeHtml(head)}</h3>`);
    out.push(`<ul>${list.map((i) => `<li>${escapeHtml(i.title)}</li>`).join('')}</ul>`);
  };
  group(w.headDone, 'done');
  group(w.headDoing, 'doing');
  group(w.headTodo, 'todo');
  for (const warn of progress.warnings) {
    out.push(`<p class="note">${escapeHtml(w.heads)}: ${sentence(warningText(w, warn))}</p>`);
  }
  return out.join('\n');
}

export function renderBoard(project, cards) {
  const w = words(project.lang);
  return page({
    lang: project.lang,
    title: `${project.name}: ${w.stand.toLowerCase()}`,
    body: [
      `<h1>${escapeHtml(project.name)}</h1>`,
      `<p class="sub">${escapeHtml(w.stand)}. ${escapeHtml(w.live)}</p>`,
      ...cards,
    ].join('\n'),
  });
}

function renderFile(project, relPath, text) {
  const w = words(project.lang);
  return page({
    lang: project.lang,
    title: relPath,
    body: [
      `<h1>${escapeHtml(relPath)}</h1>`,
      `<p class="sub">${escapeHtml(w.readOnly)} <a href="/">${escapeHtml(w.back)}</a></p>`,
      `<pre>${escapeHtml(text)}</pre>`,
    ].join('\n'),
  });
}

function renderNotice(project, notice) {
  const w = words(project.lang);
  return page({
    lang: project.lang,
    title: notice,
    body: [
      `<h1>${escapeHtml(notice)}</h1>`,
      `<p class="sub"><a href="/">${escapeHtml(w.back)}</a></p>`,
    ].join('\n'),
  });
}

// ---------------------------------------------------------------- the board, from a project

export function boardPage(root, deps = {}) {
  const project = readProject(root);
  const progress = derive(project);
  const brief = { lang: project.lang, path: BRIEF_PATH, openable: decidePath(root, BRIEF_PATH, deps).ok };
  const w = words(project.lang);
  return renderBoard(project, [
    card(w.progress, brief, () => progressCard(project, progress)),
  ]);
}

function filePage(root, requested, deps = {}) {
  const project = readProject(root);
  const w = words(project.lang);
  const decision = decidePath(root, requested, deps);
  if (!decision.ok) return { status: 404, html: renderNotice(project, w.refused) };
  const size = formatSize(decision.size);
  if (decision.size > FILE_MAX_BYTES) {
    return { status: 200, html: renderNotice(project, w.notShown(decision.rel, size)) };
  }
  const buffer = readFileSync(decision.path);
  if (buffer.includes(0)) {
    return { status: 200, html: renderNotice(project, w.binary(decision.rel, size)) };
  }
  return { status: 200, html: renderFile(project, decision.rel, buffer.toString('utf8')) };
}

// ---------------------------------------------------------------- serving

function send(res, status, html) {
  res.writeHead(status, {
    'content-type': 'text/html; charset=utf-8',
    // A stale page must never present itself as the live stand.
    'cache-control': 'no-store, max-age=0',
    // No script anywhere on this board, and the browser enforces it rather than trusting us.
    'content-security-policy': "default-src 'none'; style-src 'unsafe-inline'; form-action 'none'; base-uri 'none'",
    'x-content-type-options': 'nosniff',
    'referrer-policy': 'no-referrer',
  });
  res.end(html);
}

// A refusal is a security event, so it is said out loud where the owner started the server.
// What was asked for is never echoed: it is untrusted input, and a terminal is a sink too.
const denied = (what) => console.error(`cockpit: refused ${what}`);

export function createBoardServer(root, deps = {}) {
  return createServer((req, res) => {
    try {
      // Nothing about the project is read, let alone rendered, for a request this server does
      // not trust: an untrusted Host gets bytes that say nothing at all.
      if (!hostAllowed(req.headers.host)) {
        denied('a request whose Host header is not loopback');
        return send(res, 403, 'Not available.\n');
      }
      // Reading is the only thing this server does. Anything that could ask it to write is
      // refused before a path is even parsed.
      if (req.method !== 'GET') return send(res, 405, 'Not available.\n');
      const url = new URL(req.url, 'http://127.0.0.1');
      if (url.pathname === '/') return send(res, 200, boardPage(root, deps));
      if (url.pathname === '/file') {
        const { status, html } = filePage(root, url.searchParams.get('path'), deps);
        if (status === 404) denied('a file request outside what the board may show');
        return send(res, status, html);
      }
      const project = readProject(root);
      return send(res, 404, renderNotice(project, words(project.lang).refused));
    } catch (e) {
      // A board that cannot render is a failure to report, never a silent blank page. The
      // reason goes to the terminal the owner is already looking at; the page stays free of
      // internals, which is the floor for every error a reader can see. In English, because
      // the project's own language is read from a file this very failure may be about.
      console.error(`cockpit: ${e.stack || e.message}`);
      return send(res, 500, page({ title: BOARD.en.broke, body: `<h1>${escapeHtml(BOARD.en.broke)}</h1>` }));
    }
  });
}

export function serve(root, { port = DEFAULT_PORT } = {}) {
  const server = createBoardServer(root);
  server.on('error', (e) => {
    const why = e.code === 'EADDRINUSE' ? `port ${port} is already in use`
      : e.code === 'EACCES' ? `port ${port} may not be opened by this user`
        : `the server could not start (${e.message})`;
    console.error(`cockpit: ${why}. Pass another with: node checks/progress.mjs --serve --port <number>`);
    server.close();
    process.exitCode = 1;
  });
  server.listen(port, '127.0.0.1', () => {
    console.log(`Cockpit: http://127.0.0.1:${port} - stop with ctrl-c`);
  });
  return server;
}
