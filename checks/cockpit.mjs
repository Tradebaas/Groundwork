// Groundwork cockpit: one page that shows where the project stands, served on this machine only.
// Started from the progress command: node checks/progress.mjs --serve [--port <n>]
//
// This file is the HTTP layer and nothing else: which requests are answered at all, which route
// they reach, and what headers every answer carries. What may be opened is decided in
// checks/cockpit-path.mjs; the lanes are built in checks/board-page.mjs, the six cards beside
// them in checks/cockpit-page.mjs, and the shell both render in is checks/board-shell.mjs.
// Spec: docs/specs/010-cockpit (maintainer-local); the lanes: E-01/F-04/S-03.

import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { decidePath, hostAllowed } from './cockpit-path.mjs';
import { page, escapeHtml } from './board-shell.mjs';
import { words, formatSize, overviewPage, renderFile, renderNotice, BOARD } from './cockpit-page.mjs';
import { boardPage } from './board-page.mjs';
import { readProject } from './progress.mjs';

const DEFAULT_PORT = 8321;
// Past this, a file stops being something to read on a page and starts being a download.
const FILE_MAX_BYTES = 512 * 1024;

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
      // The board is the front door. The six cards that used to stand here keep every answer they
      // gave, one route along, until S-04 regroups them onto the four shelves and S-06 retires the
      // old name; each page links to the other, so neither is a dead end.
      if (url.pathname === '/') return send(res, 200, boardPage(root, deps));
      if (url.pathname === '/overview') return send(res, 200, overviewPage(root, deps));
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
