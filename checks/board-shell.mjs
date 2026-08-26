// The page shell every page this board serves is built in: the look, and the safe ways project
// text gets into it. The cards, the lanes, the sidebar, the lines under them, a file page and
// a notice all render through here, so the project has one design and one escaping rule rather
// than six of each.
// Split out of checks/board-document.mjs when the lanes arrived (E-01/F-04/S-03): a second page
// would otherwise have carried a second copy of the tokens and of the escaping, which is the
// drift this whole framework is against. Nothing here reads a file or touches the network.
//
// No script runs on any of these pages (the server's own Content-Security-Policy forbids it), so
// everything that folds folds with <details>, and its keyboard behaviour and focus ring come with
// the element instead of being rebuilt.

// The look, taken from the board the owner handed over as the reference (Duetti, commit 141c653)
// and from the three notes he parked with it: the dark theme stands as it is, the light theme is
// firmer than that reference's, and the type is tighter. Dark is charcoal with one peach accent.
// Light is this project's own: warm paper, near-black ink, a burnt amber that is the daylight
// sibling of the peach - measured, not guessed (see the story for the ratios).
const TOKENS = `:root{color-scheme:dark light;
  --bg:#2B2D33;--panel:#1F2126;--card:#34363D;--card2:#3C3E46;
  --line:rgba(255,255,255,.08);--code:rgba(255,255,255,.07);
  --ink:#F2EFE9;--ink2:#A7A9B0;--muted:#74777F;
  --accent:#F6C59B;--accent2:#E9B384;--onaccent:#23252A;--red:#E3867A;
  --tint:rgba(246,197,155,.10);--shadow:none;
  --rs:12px;--r:20px;--rl:28px;--side:264px}
@media(prefers-color-scheme:light){:root{
  --bg:#F7F5F2;--panel:#EFEBE5;--card:#FFFFFF;--card2:#F5F1EB;
  --line:rgba(28,26,24,.13);--code:rgba(28,26,24,.06);
  --ink:#1C1A18;--ink2:#4A4640;--muted:#6F6A62;
  --accent:#B4551F;--accent2:#8F4116;--onaccent:#FFFFFF;--red:#A82E22;
  --tint:rgba(180,85,31,.07);--shadow:0 8px 24px rgba(28,26,24,.07)}}`;

// The interface face stays the machine's own - system-ui resolves to San Francisco, Segoe UI or
// Roboto wherever the reader is - because the board's Content-Security-Policy allows no font to
// load, not even an embedded one. What the owner's "tighter" note asks for is therefore done with
// what a system face has: tight tracking, heavier headings, shorter line height.
const BASE = `*{box-sizing:border-box}
html{background:var(--bg)}
body{margin:0;background:var(--bg);color:var(--ink);
  font:15px/1.55 -apple-system,"SF Pro Text",system-ui,"Segoe UI",Roboto,sans-serif;
  -webkit-font-smoothing:antialiased}
h1,h2,h3,h4{margin:0;text-wrap:balance;letter-spacing:-.021em;font-weight:700}
p{margin:0 0 10px}
a{color:var(--accent);text-decoration:none}
a:hover{text-decoration:underline}
:focus-visible{outline:2px solid var(--accent);outline-offset:3px;border-radius:8px}
main:focus{outline:none}
main:focus-visible{outline-offset:-3px}
code{font:.88em ui-monospace,SFMono-Regular,Menlo,monospace;background:var(--code);
  padding:.1em .4em;border-radius:6px;color:var(--ink)}
pre{margin:0;padding:20px;background:var(--panel);border-radius:var(--r);overflow:auto;
  font:13px/1.6 ui-monospace,SFMono-Regular,Menlo,monospace;color:var(--ink2);
  white-space:pre-wrap;word-break:break-word}
ul{margin:0;padding-left:20px}
li{margin:0 0 5px;color:var(--ink2)}
.vh{position:absolute;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;
  clip-path:inset(50%);white-space:nowrap;border:0}
.skip{position:absolute;left:-9999px;top:0;z-index:9}
.skip:focus{left:10px;top:10px;background:var(--card);color:var(--ink);padding:10px 14px;
  border-radius:var(--rs)}

/* The shell: the sidebar down the left, the page beside it. The project's documents are reached
   through that sidebar, grouped on the four shelves, one page per document. On a phone the sidebar
   folds to a strip above. */
.shell{display:grid;grid-template-columns:var(--side) minmax(0,1fr);align-items:start}
.shell:not(:has(>.side)){grid-template-columns:minmax(0,1fr)}
.side{position:sticky;top:0;height:100vh;overflow:auto;padding:20px 12px;
  background:var(--panel);border-right:1px solid var(--line)}
/* The sidebar. Four destinations, then the subjects, one word per row. Every rule here answers
   a measured finding: the headings were rendering at 15px/400 uppercase because a font
   shorthand ending in the keyword inherit is invalid and was dropped whole, the muted tone here
   measures 3.60:1, and a row that only cleared 44px by wrapping was never really 44px. */
.mark{display:block;padding:6px 12px 14px;font-size:19px;font-weight:700;
  letter-spacing:-.026em;color:var(--ink)}
.mark:hover{text-decoration:none;color:var(--accent)}
.side ul{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:1px}
.side li{margin:0}
.plink{display:flex;align-items:center;gap:10px;min-height:36px;padding:7px 12px;
  border-radius:9px;font-size:13px;font-weight:500;color:var(--ink2);letter-spacing:-.004em}
.plink span{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.plink .ico{color:var(--muted)}
.plink:hover{background:var(--card2);color:var(--ink);text-decoration:none}
.plink:hover .ico{color:var(--ink2)}
/* The active row is a tint and an accent, not a filled block: on a page whose loudest object
   should be the work, the navigation says "here" without shouting it. */
.plink.on{background:var(--tint);color:var(--accent2);font-weight:600}
.plink.on .ico{color:var(--accent2)}
.plink.on:hover{background:var(--tint);color:var(--accent2);text-decoration:none}
.plink .n{margin-left:auto;font-weight:600;font-size:11px;color:var(--muted);
  font-variant-numeric:tabular-nums}
.dest{margin:0 0 6px}
.topic{margin-top:14px}
.topic>details{margin:0}
.topic summary{display:flex;align-items:center;gap:8px;min-height:34px;padding:7px 12px;
  border-radius:9px;cursor:pointer;list-style:none;color:var(--ink2)}
.topic summary::-webkit-details-marker{display:none}
.topic summary .ttl{flex:1;min-width:0;font-size:11.5px;font-weight:600;line-height:1.3;
  letter-spacing:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.topic summary:hover{background:var(--card2);color:var(--ink)}
.topic summary .ico{width:14px;height:14px;color:var(--muted);transition:transform .16s ease-out}
.topic details[open] summary .ico{transform:rotate(90deg)}
.topic ul{margin:1px 0 4px}
.topic .plink{padding-left:18px}
main{padding:34px 26px 72px;max-width:1680px;margin:0 auto}
h1{font-size:31px;line-height:1.14;margin:0 0 6px}
.sub{color:var(--ink2);margin:0 0 26px;font-size:14px;max-width:70ch}
.hint{color:var(--ink2);margin:8px 0 0;font-size:13px;max-width:66ch}
.empty{color:var(--ink2);font-size:13px;margin:12px 0 0}

/* A card is a panel: the two at the top of the board, a shelf, a document page. */
.card{background:var(--panel);border-radius:var(--rl);padding:24px 26px;margin:0 0 16px}
.card h2{font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);
  margin:0 0 14px;font-weight:600}
.lead{font-size:19px;line-height:1.4;margin:0;letter-spacing:-.012em}
h3{font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);
  margin:20px 0 8px;font-weight:600}
.src{margin:20px 0 0;padding-top:14px;border-top:1px solid var(--line);font-size:12px;
  color:var(--ink2)}
.note{border-left:2px solid var(--accent);background:var(--tint);padding:12px 16px;margin:16px 0 0;
  border-radius:0 var(--rs) var(--rs) 0;color:var(--ink2)}
.top{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin:0 0 20px}
.top .card{margin:0}
/* The frame holds still and the containers in it move: the page itself never scrolls, so the
   lanes stay where the reader put them. The sidebar scrolls in itself, the lane row sideways, each
   lane in itself, and every other page in its own column. Two pages are deliberately not frames.
   A file made with --page is one long document rather than a screen, and a frame narrow enough to
   have stacked its sidebar would put everything under that sidebar out of reach, so both keep the
   ordinary page scroll. Printing does too, on the same grounds. */
html:has(.frame),.frame{height:100%;overflow:hidden}
.frame .shell{height:100dvh;align-items:stretch}
.frame .side,.frame main{min-height:0}
.frame .side{position:static;height:100%}
.frame main{overflow:auto}
.frame main:has(>.lanes){display:flex;flex-direction:column;overflow:hidden;padding-bottom:26px}
.frame main:has(>.lanes)>h1,.frame main:has(>.lanes)>.sub{flex:none}
.frame main:has(>.lanes)>.lanes{flex:1 1 auto;min-height:0;margin-bottom:0}
.frame .lanes>.lane{display:flex;flex-direction:column;min-height:0}
.frame .lane>details[open]{display:flex;flex-direction:column;flex:1 1 auto;min-height:0}
/* An open <details> keeps its content in a box of its own, so the height has to be handed down
   through that box or the cards below it are laid out at their full length and clipped away. An
   engine without the pseudo-element skips this one rule and hands the height straight to .cards,
   which is the same result. */
.frame .lane>details[open]::details-content{display:flex;flex-direction:column;flex:1 1 auto;
  min-height:0}
.frame .lane summary{flex:none}
.frame .lane .cards{flex:1 1 auto;min-height:0;overflow:auto}
@media(max-width:900px){.top{grid-template-columns:1fr}}`;

// The lanes, in a row the way the owner settled them: Backlog, Refinement and Done start folded
// and a folded lane is a narrow upright strip, so To do, In progress and Review are what a reader
// lands on and all six still fit. The fold is a <details>, so the strip is CSS on its open state
// and no script decides what a reader can see.
const LANES = `.lanes{display:flex;gap:14px;align-items:stretch;overflow-x:auto;
  padding-bottom:10px;margin:0 0 22px}
.lane{flex:1 1 0;min-width:262px;background:var(--panel);border-radius:var(--rl);padding:20px}
.lane>details{margin:0}
.lane summary{display:flex;align-items:center;gap:10px;cursor:pointer;list-style:none}
.lane summary::-webkit-details-marker{display:none}
.lane summary .ttl{font-size:16px;font-weight:700;letter-spacing:-.018em;color:var(--ink);
  white-space:nowrap}
.lane summary .tail{margin-left:auto;display:flex;align-items:center;gap:7px}
.lane .count{font-size:13px;font-weight:600;line-height:1;color:var(--onaccent);background:var(--accent);
  border-radius:999px;padding:5px 9px;font-variant-numeric:tabular-nums}
.lane .wip{font-size:11px;font-weight:600;line-height:1;letter-spacing:.03em;color:var(--ink2);white-space:nowrap;
  border:1px solid var(--line);border-radius:999px;padding:4px 7px}
.lane.over .ttl,.lane.over .wip{color:var(--red)}
.lane.over .wip{border-color:var(--red)}
.lane.over .count{background:var(--red);color:#fff}
/* Folded: the whole lane becomes the strip, with its name set upright beside its count. */
.lane:has(>details:not([open])){flex:0 0 58px;min-width:0;padding:18px 0 16px;cursor:pointer}
.lane:has(>details:not([open])) summary{flex-direction:column;gap:12px}
.lane:has(>details:not([open])) summary .ttl{writing-mode:vertical-rl;transform:rotate(180deg)}
.lane:has(>details:not([open])) summary .tail{margin:0;flex-direction:column;gap:8px}
.lane:has(>details:not([open])) .wip{writing-mode:vertical-rl;transform:rotate(180deg)}
.cards{display:flex;flex-direction:column;gap:12px;margin:14px 0 0}
.wcard{background:var(--card);border-radius:var(--r);padding:17px 19px;box-shadow:var(--shadow)}
.wcard header{display:flex;flex-wrap:wrap;gap:6px;margin:0 0 9px}
.wcard h4{font-size:15px;line-height:1.32;margin:0 0 2px}
.wcard .feat{color:var(--muted);font-size:12px;margin:0 0 7px}
.wcard p{margin:0 0 8px;font-size:13.5px;color:var(--ink2)}
.wcard footer{margin:11px 0 0;font-size:12px;color:var(--ink2);word-break:break-word}
/* The two lanes work actually sits in carry a ring, so they read as the live ones. */
.lane-in-progress .wcard,.lane-review .wcard{box-shadow:inset 0 0 0 1.5px var(--accent)}
.chip{display:inline-flex;align-items:center;font:600 12px/1 ui-monospace,SFMono-Regular,Menlo,
  monospace;background:var(--card2);color:var(--ink);border-radius:999px;padding:5px 10px}
.chip.size{font-family:inherit;background:var(--code);color:var(--ink2)}
.bar{display:block;height:4px;border-radius:2px;background:var(--code);margin:2px 0 6px;
  overflow:hidden}
.bar i{display:block;height:100%;background:var(--accent)}
.marks{margin:9px 0 0;padding-left:17px}
.marks li{font-size:12.5px;margin:0 0 4px}
.marks.block li{color:var(--red)}
/* The two derived lines under the lanes keep folding, and a shelf a file page came back to says
   so by lighting its own border. */
.line{background:var(--panel);border-radius:var(--rl);padding:18px 22px;margin:0 0 12px}
.line>details{margin:0}
.line summary{cursor:pointer;font-size:14px;color:var(--ink2);line-height:1.5;list-style:none}
.line summary::-webkit-details-marker{display:none}
.line .count{color:var(--muted);font-size:13px}
@media(max-width:900px){
  .shell{grid-template-columns:minmax(0,1fr)}
  .side{position:static;height:auto;border-right:0;border-bottom:1px solid var(--line)}
  main{padding:24px 18px 56px}
  .lanes{display:block}
  .lane,.lane:has(>details:not([open])){flex:none;min-width:0;padding:18px 20px;margin:0 0 12px}
  .lane:has(>details:not([open])) summary{flex-direction:row}
  .lane:has(>details:not([open])) summary .ttl,
  .lane:has(>details:not([open])) .wip{writing-mode:horizontal-tb;transform:none}
  .lane:has(>details:not([open])) summary .tail{margin-left:auto;flex-direction:row}
}
@media(max-width:900px),print{
  html:has(.frame),.frame{height:auto;overflow:visible}
  .frame .shell{height:auto}
  .frame .side{height:auto}
  .frame main,.frame main:has(>.lanes){display:block;overflow:visible}
  .frame .lanes>.lane,.frame .lane>details[open],
  .frame .lane>details[open]::details-content{display:block;min-height:auto}
  .frame .lane .cards{overflow:visible}
}
@media(pointer:coarse){.plink{min-height:44px}}
@media(prefers-reduced-motion:reduce){*{transition:none!important;animation:none!important}}`;

import { ICON_STYLE } from './board-icons.mjs';


// The parts the pages beside the board bring with them: a section heading with its icon, the tile
// grid an index page is made of, and the steps on a story card.
const EXTRA = `.sech{display:flex;align-items:center;gap:9px;font-size:17px;margin:26px 0 12px;
  letter-spacing:-.018em}
.sech .ico{width:18px;height:18px;color:var(--accent)}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:14px}
.tile{display:block;background:var(--panel);border-radius:var(--rl);padding:20px 22px;
  color:var(--ink)}
.tile:hover{background:var(--card2);text-decoration:none}
.tile header{display:flex;flex-wrap:wrap;gap:6px;margin:0 0 10px}
.tile h4{font-size:16px;line-height:1.3;margin:0 0 6px}
.tile p{margin:0 0 10px;font-size:13.5px;color:var(--ink2)}
.tile .hint{margin:0}
.cards.wide{display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr))}
.crit{margin:0;padding-left:20px}
.crit li{font-size:13.5px;margin:0 0 7px;color:var(--ink2)}
.crit li.met{color:var(--muted)}
.crit li.met::marker{color:var(--accent)}
/* A folder's own page: one row per document, its heading first and its file name under it. */
.index{list-style:none;margin:0;padding:0;display:grid;
  grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:2px}
.index li{margin:0}
.index a,.index .dead{display:block;padding:13px 16px;border-radius:var(--rs)}
.index a:hover{background:var(--panel);text-decoration:none}
.index b{display:block;font-size:14px;font-weight:600;color:var(--ink);line-height:1.35}
.index span{display:block;margin-top:3px;font-size:12px;color:var(--ink2);
  font-family:ui-monospace,SFMono-Regular,Menlo,monospace}
.index .dead b{color:var(--ink2)}
.steps{list-style:none;margin:10px 0 0;padding:0;display:flex;flex-direction:column;gap:5px}
.steps li{display:grid;grid-template-columns:15px 1fr;gap:8px;align-items:start;font-size:12.5px;
  color:var(--ink2);line-height:1.45;margin:0}
.steps .ico{width:14px;height:14px;margin-top:1px;color:var(--muted)}
.steps .t-done{color:var(--muted)}
.steps .t-done .ico{color:var(--accent)}
.steps .t-done span{text-decoration:line-through;text-decoration-thickness:1px}
.steps .t-started .ico{color:var(--accent)}`;

export const STYLE = `${TOKENS}
${BASE}
${LANES}
${EXTRA}
${ICON_STYLE}`;

// ---------------------------------------------------------------- the shell's own words

// The sentences that belong to the shell rather than to any one card: what a page is read from,
// how it names the file a fact came from, and how a reader gets back. Every page says them the
// same way because there is one place they are written.
//
// Two of them come in pairs, because the same board is read in two places. Served, it is read the
// moment the page opens and every name it shows can be opened beside it. Printed as one file
// (E-01/F-04/S-05), it is the picture of the repository at the moment it was made (decision 0021):
// it states that moment, and it says that the names in it are names, because the reader of a file
// has neither the server nor the repository.
const SHELL = {
  en: {
    live: 'Read from the project files the moment you opened this page. Nothing here is stored.',
    made: (when) => `Made from the project files on ${when}. This is the picture at that moment, `
      + 'not the project as it is now.',
    names: "Every file name here is a file in the project's repository; this picture does not "
      + 'carry the files themselves.',
    source: 'From',
    back: 'Back to the board',
    skip: 'Skip the navigation',
    partFailed: (why) => `This part of the board could not be built: ${why}. The rest still holds.`,
  },
  nl: {
    live: 'Gelezen uit de projectbestanden op het moment dat je deze pagina opende. Er wordt hier niets bewaard.',
    made: (when) => `Gemaakt uit de projectbestanden op ${when}. Dit is het beeld van dat moment, `
      + 'niet het project zoals het nu is.',
    names: 'Elke bestandsnaam hier is een bestand in de repository van het project; dit beeld '
      + 'bevat die bestanden zelf niet.',
    source: 'Uit',
    back: 'Terug naar het bord',
    skip: 'Sla de navigatie over',
    partFailed: (why) => `Dit deel van het bord kon niet worden opgebouwd: ${why}. De rest klopt nog.`,
  },
};
export const shellWords = (lang) => SHELL[lang] || SHELL.en;

// The moment a printed board was made, in one spelling everywhere it is read. UTC, because the
// reader of the file is not on the machine that made it and a bare local time would be a riddle;
// to the minute, because the second a render finished says nothing a reader can use.
export const stamp = (date) => `${date.toISOString().slice(0, 16).replace('T', ' ')} UTC`;

// ---------------------------------------------------------------- text into markup

// Project text is never trusted to be markup. Everything a project wrote passes through here on
// its way to a page, so no document can put an element on it.
export const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (c) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[c]));

// Project sentences carry `backticked` skill names and paths. They are escaped like everything
// else, and then the backticks become the markup they always meant.
export const sentence = (text) => escapeHtml(text).replace(/`([^`]+)`/g, '<code>$1</code>');

export const fileHref = (relPath) => `/file?path=${encodeURIComponent(relPath)}`;

// A path is a name first, and a link only where the file route will actually serve that file, so
// no page hands a reader a door that does not open. Every card that names a file names it through
// here; the label may be shorter than the path (the file map writes its rows from inside docs/),
// and it is the path that decides and the label that shows.
export const pathName = (path, opens, label = path) => {
  const name = `<code>${escapeHtml(label)}</code>`;
  return opens(path) ? `<a href="${fileHref(path)}">${name}</a>` : name;
};

export const list = (titles) => `<ul>${titles.map((t) => `<li>${escapeHtml(t)}</li>`).join('')}</ul>`;

// A section opens with its answer in one sentence. Past about two lines in this column that stops
// being a headline and starts being a paragraph, and it is set as one: the project writes its own
// sentences, so a page has to survive a long one without shouting it.
const LEAD_MAX = 200;
export const lead = (text, markup = escapeHtml) => `<p${text.length > LEAD_MAX ? '' : ' class="lead"'}>${markup(text)}</p>`;

// A list stops being scannable long before it stops being true. The details element keeps every
// sentence intact, one click away, behind its own count.
export const folded = (head, count, body, open = false) => `<details${open ? ' open' : ''}>`
  + `<summary>${escapeHtml(head)} <span class="count">${count}</span></summary>\n${body}</details>`;

// A read that fails is carried to the part of the board that owns it, where a failure is named,
// instead of taking the page down on its way there. The other half of the same promise as card()
// below: nothing this page reads can cost a reader the rest of it.
export const attempt = (fn) => { try { return { value: fn() }; } catch (error) { return { error }; } };

// A card builds or it names its failure. One card that cannot be built never takes the board
// down with it, because a half-empty board still answers most of the question.
// owner: { lang, path, opens } - the file that owns this card's content, and the question of
// whether the file route will serve it. It is named either way, through the same pathName rule
// every other name on the board goes through.
export function card(title, owner, build) {
  const w = shellWords(owner?.lang);
  let body;
  try {
    body = build();
  } catch (e) {
    body = `<p class="note">${escapeHtml(w.partFailed(e.message))}</p>`;
  }
  const src = owner?.path
    ? `<p class="src">${escapeHtml(w.source)} ${pathName(owner.path, owner.opens || (() => false))}</p>`
    : '';
  return `<section class="card">\n<h2>${escapeHtml(title)}</h2>\n${body}\n${src}\n</section>`;
}

// ---------------------------------------------------------------- the page itself

export function page({ lang = 'en', title, body, nav = '', frame = false }) {
  return `<!doctype html>
<html lang="${escapeHtml(lang)}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(title)}</title>
<style>${STYLE}</style>
</head>
<body${frame ? ` class="frame"` : ``}>
${nav ? `<a class="skip" href="#main">${escapeHtml(shellWords(lang).skip)}</a>` : ``}
<div class="shell">
${nav}
<main id="main" tabindex="-1">
${body}
</main>
</div>
</body>
</html>
`;
}
