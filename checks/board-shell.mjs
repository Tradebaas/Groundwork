// The page shell every page this board serves is built in: the look, and the safe ways project
// text gets into it. The cards, the lanes, the shelves, the two lines under them, a file page and
// a notice all render through here, so the project has one design and one escaping rule rather
// than six of each.
// Split out of checks/cockpit-page.mjs when the lanes arrived (E-01/F-04/S-03): a second page
// would otherwise have carried a second copy of the tokens and of the escaping, which is the
// drift this whole framework is against. Nothing here reads a file or touches the network.
//
// No script runs on any of these pages (the server's own Content-Security-Policy forbids it), so
// everything that folds folds with <details>, and its keyboard behaviour and focus ring come with
// the element instead of being rebuilt.

// defer: the token values below are copied from the explainer (index.html) instead of read from
// a token file. ceiling: a third surface, or the owner moving the accent, makes the copies drift.
// upgrade-when: this project's own token section in docs/DESIGN.md is filled. Ledger: DEBT-001.
const TOKENS = `:root{color-scheme:dark light;
  --bg:#0a0b0b;--surface:rgba(255,255,255,.025);--line:rgba(255,255,255,.08);
  --ink:#f2f3f1;--ink2:#c3c6c0;--muted:#8f938a;--accent:#3fae9f;--tint:#3fae9f17;
  --r:14px;--rs:8px;--maxw:900px}
@media(prefers-color-scheme:light){:root{
  --bg:#f6f7f6;--surface:#fdfdfc;--line:rgba(0,0,0,.10);
  --ink:#15181a;--ink2:#454b47;--muted:#5d625c;--accent:#2f6664;--tint:#2f66640f}}`;

const BASE = `*{box-sizing:border-box}
/* The machine's own interface face, named as what it is rather than as a list of the vendors it
   could be. system-ui resolves to San Francisco, Segoe UI or Roboto wherever the reader is, so
   the page picks no typeface at all - which is the honest state until the owner picks one. */
body{margin:0;padding:48px 20px 80px;background:var(--bg);color:var(--ink);
  font:16px/1.65 system-ui,sans-serif;-webkit-font-smoothing:antialiased}
main{max-width:var(--maxw);margin:0 auto}
h1{font-size:27px;line-height:1.2;letter-spacing:-.02em;margin:0 0 8px;font-weight:700}
.sub{color:var(--muted);margin:0 0 36px;font-size:14px;max-width:62ch}
.hint{color:var(--muted);margin:8px 0 0;font-size:14px;max-width:62ch}
.card{border:1px solid var(--line);border-radius:var(--r);background:var(--surface);
  padding:26px 28px;margin:0 0 20px}
.card h2{font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);
  margin:0 0 16px;font-weight:600}
.lead{font-size:20px;line-height:1.35;margin:0}
h3{font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);
  margin:24px 0 8px;font-weight:600}
details{margin:24px 0 0}
summary{font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);
  font-weight:600;cursor:pointer}
summary:focus-visible{outline:2px solid var(--accent);outline-offset:3px;border-radius:2px}
details[open] summary{margin-bottom:12px}
.count{color:var(--ink2);font-weight:400;letter-spacing:0}
ul{margin:0;padding-left:22px}
li{margin:0 0 6px;color:var(--ink2)}
p{margin:0 0 12px}
.src{margin:22px 0 0;padding-top:16px;border-top:1px solid var(--line);font-size:13px;color:var(--muted)}
.note{border-left:2px solid var(--accent);background:var(--tint);padding:12px 16px;
  margin:20px 0 0;border-radius:0 var(--rs) var(--rs) 0;color:var(--ink2)}
/* A label a screen reader hears and the page does not show, for a value whose meaning is in its
   position rather than in its characters. */
.vh{position:absolute;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;
  clip-path:inset(50%);white-space:nowrap;border:0}
a{color:var(--accent)}
a:focus-visible{outline:2px solid var(--accent);outline-offset:3px;border-radius:2px}
code{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:.9em}
pre{margin:0;padding:22px;background:var(--surface);border:1px solid var(--line);
  border-radius:var(--r);overflow:auto;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;
  font-size:13px;line-height:1.6;color:var(--ink2);white-space:pre-wrap;word-break:break-word}`;

// The three things on this board that fold: a lane, a shelf, and one of the two lines under the
// shelves. One box, one summary, one disclosure triangle, so the page reads as a single column of
// things that open rather than as three inventions. The cards inside a lane sit on a grid that
// gives way to one column on a phone.
const LANES = `.lane,.shelf,.line{border:1px solid var(--line);border-radius:var(--r);
  background:var(--surface);padding:18px 20px;margin:0 0 12px}
.lane>details,.shelf>details,.line>details{margin:0}
.lane summary,.shelf summary,.line summary{display:flex;align-items:center;gap:10px;font-size:13px;
  letter-spacing:.08em;list-style:none}
.lane summary::-webkit-details-marker,.shelf summary::-webkit-details-marker,
.line summary::-webkit-details-marker{display:none}
/* Laying the summary out as a row takes the browser's own disclosure triangle away, and a row
   that folds has to look like one. This draws it back, pointing at what opening it will do. */
.lane summary::before,.shelf summary::before,.line summary::before{content:"";width:7px;height:7px;
  flex:none;margin:0 2px 2px 0;border-right:1.5px solid var(--muted);
  border-bottom:1.5px solid var(--muted);transform:rotate(-45deg)}
.lane details[open] summary::before,.shelf details[open] summary::before,
.line details[open] summary::before{transform:rotate(45deg);margin:0 2px 4px 0}
.lane summary .ttl,.shelf summary .ttl{color:var(--ink);text-transform:none;letter-spacing:-.01em;
  font-size:16px;font-weight:600}
.lane summary .tail,.shelf summary .tail{margin-left:auto;display:flex;align-items:center;gap:10px;
  letter-spacing:0;text-transform:none;font-weight:400}
/* The two lines lead with a whole sentence rather than a title, so they are set as one. */
.line summary .ttl{color:var(--ink2);text-transform:none;letter-spacing:0;font-size:15px;
  font-weight:400;line-height:1.5}
.shelves,.strip{margin:28px 0 0}
/* A shelf a file page sent the reader back to says so, so arriving lands on something visible. */
.shelf:target{border-color:var(--accent);background:var(--tint)}
.docs{margin:14px 0 0}
.docs li{font-size:14px;margin:0 0 8px}
.wip{color:var(--muted);font-size:13px}
.wip.over{color:var(--ink2);border-bottom:1px dashed var(--accent)}
/* Cards keep a card's width and wrap onto a second column where there is room, so a lane holding
   one story does not stretch it across the page and a lane holding ten stays scannable. */
.cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:12px;
  margin:14px 0 0}
.wcard{border:1px solid var(--line);border-radius:var(--rs);padding:14px 16px;
  background:var(--bg)}
.wcard h4{margin:8px 0 2px;font-size:15px;line-height:1.3;letter-spacing:-.01em;font-weight:600}
.wcard p{margin:0 0 8px;font-size:14px;color:var(--ink2)}
.wcard .feat{color:var(--muted);font-size:12px;margin:0 0 6px}
.wcard footer{margin:10px 0 0;font-size:12px;color:var(--muted);word-break:break-word}
.chip{display:inline-block;border:1px solid var(--line);border-radius:999px;padding:1px 9px;
  font-size:12px;color:var(--muted);font-family:ui-monospace,SFMono-Regular,Menlo,monospace}
.chip.size{font-family:inherit}
.bar{display:block;height:3px;border-radius:2px;background:var(--line);margin:0 0 6px;
  overflow:hidden}
.bar i{display:block;height:100%;background:var(--accent)}
.marks{margin:8px 0 0;padding-left:18px}
.marks li{font-size:13px;margin:0 0 4px}
.marks.block li{color:var(--ink)}
.empty{color:var(--muted);font-size:14px;margin:14px 0 0}`;

export const STYLE = `${TOKENS}
${BASE}
${LANES}`;

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

export function page({ lang = 'en', title, body }) {
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
