// A throwaway project on disk, and the scaffolding every test of the board shares: the file
// bodies a work tree is made of, the reader's view of a rendered page, and the two helpers that
// speak to a running server. It lives here so the four test files beside it
// (checks/board.test.mjs, checks/board-strip.test.mjs, checks/board-server.test.mjs and
// checks/board-path.test.mjs) build the same kind of project and assert on it the same way,
// and none of them has to import another's tests to get one.

import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { request as httpRequest } from 'node:http';
import assert from 'node:assert/strict';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';

export function fixture(files = {}) {
  const root = mkdtempSync(join(tmpdir(), 'groundwork-board-'));
  const put = (p, body) => {
    mkdirSync(dirname(join(root, p)), { recursive: true });
    writeFileSync(join(root, p), body);
  };
  for (const [p, body] of Object.entries(files)) put(p, body);
  return { root, put, clean: () => rmSync(root, { recursive: true, force: true }) };
}

// ---------------------------------------------------------------- what a project is made of

export const BRIEF = '# BRIEF\n\n## Product\n\n- **Name:** Kassaboek\n';

export const EPIC = (title) => `# EPIC: ${title}

- **Status:** open

## The goal

${title} in one round.

## What finished means

1. It runs where people can use it.
`;

export const FEATURE = (title) => `# F: ${title}

- **Status:** refinement · **Size:** M

- **What you can do after it.** ${title}, working.
- **What that is worth.** Time back.

## Acceptance for the feature as a whole

1. It works.
`;

// One story file, written the way the reader's parse contract says one is written. Everything a
// test wants to vary is a field, so a test says what it is about and nothing else.
export const STORY = (id, title, over = {}) => {
  const o = {
    status: 'to do', size: 'M', value: 'Worth doing, in one sentence.', depends: 'none',
    signOff: '2026-08-24', tasks: ['- [x] one', '- [ ] two'], review: ['pending', 'pending', 'pending'],
    ...over,
  };
  return `# ${id}: ${title}

- **Feature:** F-01 · **Status:** ${o.status} · **Size:** ${o.size}
- **Depends on:** ${o.depends} · **Owner sign-off:** ${o.signOff}

## Value

${o.value}

## Acceptance

1. It does the thing.

## Tasks

${o.tasks.join('\n')}

## Review

- Technical: ${o.review[0]}
- Functional: ${o.review[1]}
- Architecture: ${o.review[2]}
`;
};

// A project whose whole work tree is one epic with one feature: stories in, board out.
export function project(stories, extra = {}) {
  const files = { 'docs/product/BRIEF.md': BRIEF, ...extra };
  files['docs/work/E-01-shop/epic.md'] = EPIC('A shop that sells');
  files['docs/work/E-01-shop/F-01-till/feature.md'] = FEATURE('The till');
  for (const [name, body] of Object.entries(stories)) {
    files[`docs/work/E-01-shop/F-01-till/${name}.md`] = body;
  }
  return fixture(files);
}

// ---------------------------------------------------------------- reading a rendered page

// What a reader actually sees, with the markup and the style sheet taken away.
export const visible = (html) => html.replace(/<style[\s\S]*?<\/style>/, '')
  .replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

// A story card's own id chip. The label a screen reader hears sits inside it, so the id is what
// follows that label, and nothing else on a page has that shape - a blocker sentence naming the
// same story is prose, not a chip.
export const idChip = (id) => new RegExp(`</span>${id}</span>`);

// The page cut into one lane or one shelf, so a test can ask what stands in one of them without
// matching across the whole page. Each keeps its own markup: the fold state is part of what is
// asserted.
export function laneOf(html, name) {
  const found = html.split(/<section class="lane[^"]*">/).slice(1)
    .find((s) => s.includes(`<span class="ttl">${name}</span>`));
  assert.ok(found, `no lane called ${name} on the page`);
  return found.split('</section>')[0];
}

// The sidebar cut into one chapter. Since S-07 a shelf is a chapter of the navigation rather
// than a section of the board, so this is where a test asks what stands on one. The chapter is
// found by the name a reader sees, because that name is the whole of what identifies it.
export function chapterOf(html, name) {
  const found = html.split('<div class="topic">').slice(1)
    .find((s) => s.includes(`<span class="ttl">${name}</span>`));
  assert.ok(found, `no chapter called ${name} in the sidebar`);
  return found.split('</details>')[0];
}

// How many chapters the sidebar holds. An empty copy has none, and a docs/ folder that could not
// be read has none either - and those two must not be told apart by counting alone.
export const chapterCount = (html) => html.split('<div class="topic">').length - 1;

// ---------------------------------------------------------------- talking to a served page

export function get(port, path, { host, method = 'GET' } = {}) {
  return new Promise((ok, bad) => {
    const req = httpRequest({
      host: '127.0.0.1', port, path, method, headers: { Host: host || `127.0.0.1:${port}` },
    }, (res) => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', (c) => { body += c; });
      res.on('end', () => ok({ status: res.statusCode, headers: res.headers, body }));
    });
    req.on('error', bad);
    req.end();
  });
}

export const listen = (server) => new Promise((ok) => {
  server.listen(0, '127.0.0.1', () => ok(server.address().port));
});
