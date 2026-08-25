// The icon set: Lucide's own geometry (lucide-static 1.34.0, ISC), inlined here and animated in
// CSS. The animated Lucide library the owner pointed at is React plus Motion, so its motion needs
// JavaScript at runtime, and this board serves default-src 'none' on purpose: no script runs on
// any page it makes. The motion is therefore rebuilt as keyframes in the one inline stylesheet -
// the same icons, the same hover behaviour, nothing to execute. Every shape carries
// pathLength="1", so one draw keyframe fits an icon of any size.
//
// Attribution: Lucide (lucide.dev), ISC License, Copyright (c) Lucide Icons and Contributors.

const BODY = {
  'house': `<path pathLength="1" d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8" /><path pathLength="1" d="M3 10a2 2 0 0 1 .709-1.528l7-6a2 2 0 0 1 2.582 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />`,
  'columns-3': `<rect pathLength="1" width="18" height="18" x="3" y="3" rx="2" /><path pathLength="1" d="M9 3v18" /><path pathLength="1" d="M15 3v18" />`,
  'target': `<circle pathLength="1" cx="12" cy="12" r="10" /><circle pathLength="1" cx="12" cy="12" r="6" /><circle pathLength="1" cx="12" cy="12" r="2" />`,
  'layers': `<path pathLength="1" d="M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83z" /><path pathLength="1" d="M2 12a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 12" /><path pathLength="1" d="M2 17a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 17" />`,
  'file-text': `<path pathLength="1" d="M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z" /><path pathLength="1" d="M14 2v5a1 1 0 0 0 1 1h5" /><path pathLength="1" d="M10 9H8" /><path pathLength="1" d="M16 13H8" /><path pathLength="1" d="M16 17H8" />`,
  'eye': `<path pathLength="1" d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" /><circle pathLength="1" cx="12" cy="12" r="3" />`,
  'crosshair': `<circle pathLength="1" cx="12" cy="12" r="10" /><line pathLength="1" x1="22" x2="18" y1="12" y2="12" /><line pathLength="1" x1="6" x2="2" y1="12" y2="12" /><line pathLength="1" x1="12" x2="12" y1="6" y2="2" /><line pathLength="1" x1="12" x2="12" y1="22" y2="18" />`,
  'book-a': `<path pathLength="1" d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H19a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H6.5a1 1 0 0 1 0-5H20" /><path pathLength="1" d="m8 13 4-7 4 7" /><path pathLength="1" d="M9.1 11h5.7" />`,
  'network': `<rect pathLength="1" x="16" y="16" width="6" height="6" rx="1" /><rect pathLength="1" x="2" y="16" width="6" height="6" rx="1" /><rect pathLength="1" x="9" y="2" width="6" height="6" rx="1" /><path pathLength="1" d="M5 16v-3a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v3" /><path pathLength="1" d="M12 12V8" />`,
  'palette': `<path pathLength="1" d="M12 22a1 1 0 0 1 0-20 10 9 0 0 1 10 9 5 5 0 0 1-5 5h-2.25a1.75 1.75 0 0 0-1.4 2.8l.3.4a1.75 1.75 0 0 1-1.4 2.8z" /><circle pathLength="1" cx="13.5" cy="6.5" r=".5" fill="currentColor" /><circle pathLength="1" cx="17.5" cy="10.5" r=".5" fill="currentColor" /><circle pathLength="1" cx="6.5" cy="12.5" r=".5" fill="currentColor" /><circle pathLength="1" cx="8.5" cy="7.5" r=".5" fill="currentColor" />`,
  'scale': `<path pathLength="1" d="M12 3v18" /><path pathLength="1" d="m19 8 3 8a5 5 0 0 1-6 0zV7" /><path pathLength="1" d="M3 7h1a17 17 0 0 0 8-2 17 17 0 0 0 8 2h1" /><path pathLength="1" d="m5 8 3 8a5 5 0 0 1-6 0zV7" /><path pathLength="1" d="M7 21h10" />`,
  'inbox': `<polyline pathLength="1" points="22 12 16 12 14 15 10 15 8 12 2 12" /><path pathLength="1" d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />`,
  'triangle-alert': `<path pathLength="1" d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" /><path pathLength="1" d="M12 9v4" /><path pathLength="1" d="M12 17h.01" />`,
  'history': `<path pathLength="1" d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path pathLength="1" d="M3 3v5h5" /><path pathLength="1" d="M12 7v5l4 2" />`,
  'archive': `<rect pathLength="1" width="20" height="5" x="2" y="3" rx="1" /><path pathLength="1" d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8" /><path pathLength="1" d="M10 12h4" />`,
  'compass': `<circle pathLength="1" cx="12" cy="12" r="10" /><path pathLength="1" d="m16.24 7.76-1.804 5.411a2 2 0 0 1-1.265 1.265L7.76 16.24l1.804-5.411a2 2 0 0 1 1.265-1.265z" />`,
  'shield-check': `<path pathLength="1" d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" /><path pathLength="1" d="m9 12 2 2 4-4" />`,
  'book-open': `<path pathLength="1" d="M12 5v16" /><path pathLength="1" d="M20.001 19A2 2 0 0022 17V5a2 2 0 00-1.999-2L16 3.002A5 5 0 0012 5a5 5 0 00-4-2H4a2 2 0 00-2 2v12a2 2 0 001.999 2H8a5 5 0 014 2 5 5 0 014-2z" />`,
  'chevron-right': `<path pathLength="1" d="m9 18 6-6-6-6" />`,
  'circle-check': `<circle pathLength="1" cx="12" cy="12" r="10" /><path pathLength="1" d="m9 12 2 2 4-4" />`,
  'loader-circle': `<path pathLength="1" d="M21 12a9 9 0 1 1-6.219-8.56" />`,
  'list-checks': `<path pathLength="1" d="M13 5h8" /><path pathLength="1" d="M13 12h8" /><path pathLength="1" d="M13 19h8" /><path pathLength="1" d="m3 17 2 2 4-4" /><path pathLength="1" d="m3 7 2 2 4-4" />`,
  'folder-tree': `<path pathLength="1" d="M20 10a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1h-2.5a1 1 0 0 1-.8-.4l-.9-1.2A1 1 0 0 0 15 3h-2a1 1 0 0 0-1 1v5a1 1 0 0 0 1 1Z" /><path pathLength="1" d="M20 21a1 1 0 0 0 1-1v-3a1 1 0 0 0-1-1h-2.9a1 1 0 0 1-.88-.55l-.42-.85a1 1 0 0 0-.92-.6H13a1 1 0 0 0-1 1v5a1 1 0 0 0 1 1Z" /><path pathLength="1" d="M3 5a2 2 0 0 0 2 2h3" /><path pathLength="1" d="M3 3v13a2 2 0 0 0 2 2h3" />`,
  'square-pen': `<path pathLength="1" d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path pathLength="1" d="M18.375 2.625a1 1 0 0 1 3 3l-9.013 9.014a2 2 0 0 1-.853.505l-2.873.84a.5.5 0 0 1-.62-.62l.84-2.873a2 2 0 0 1 .506-.852z" />`,
};

// Which motion an icon uses when a reader points at the row it sits in.
const MOTION = {
  'house': 'draw',
  'columns-3': 'lift',
  'target': 'pulse',
  'layers': 'lift',
  'file-text': 'draw',
  'eye': 'blink',
  'crosshair': 'pulse',
  'book-a': 'draw',
  'network': 'draw',
  'palette': 'tilt',
  'scale': 'tilt',
  'inbox': 'lift',
  'triangle-alert': 'pulse',
  'history': 'tilt',
  'archive': 'lift',
  'compass': 'tilt',
  'shield-check': 'draw',
  'book-open': 'draw',
  'chevron-right': 'nudge',
  'circle-check': 'pulse',
  'loader-circle': 'spin',
  'list-checks': 'draw',
  'folder-tree': 'draw',
  'square-pen': 'draw',
};

// One icon, as inline SVG. An unknown name renders nothing rather than a broken box: an icon is
// decoration here, and the label beside it is what carries the meaning. aria-hidden for the same
// reason - a screen reader that read both would hear the row twice.
export function icon(name) {
  const body = BODY[name];
  if (!body) return '';
  return `<svg class="ico m-${MOTION[name] || 'draw'}" viewBox="0 0 24 24" fill="none"`
    + ' stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"'
    + ` aria-hidden="true" focusable="false">${body}</svg>`;
}

export const ICON_STYLE = `.ico{width:16px;height:16px;flex:none;overflow:visible}
.ico>*{transform-box:view-box;transform-origin:12px 12px}
@keyframes ico-draw{from{stroke-dasharray:1;stroke-dashoffset:1}to{stroke-dasharray:1;stroke-dashoffset:0}}
@keyframes ico-pulse{0%{transform:scale(1)}45%{transform:scale(.7)}100%{transform:scale(1)}}
@keyframes ico-lift{0%{transform:translateY(0)}40%{transform:translateY(-2.5px)}100%{transform:translateY(0)}}
@keyframes ico-tilt{0%{transform:rotate(0)}40%{transform:rotate(-9deg)}100%{transform:rotate(0)}}
@keyframes ico-blink{0%,100%{transform:scaleY(1)}50%{transform:scaleY(.08)}}
@keyframes ico-nudge{0%,100%{transform:translateX(0)}50%{transform:translateX(2.5px)}}
@keyframes ico-spin{to{transform:rotate(360deg)}}
@media(prefers-reduced-motion:no-preference){
  /* The motion belongs to the row, not to the icon: pointing at a link is what plays it. */
  a:hover .m-draw>*,summary:hover .m-draw>*{animation:ico-draw .5s ease-out both}
  a:hover .m-draw>*:nth-child(2),summary:hover .m-draw>*:nth-child(2){animation-delay:.07s}
  a:hover .m-draw>*:nth-child(3),summary:hover .m-draw>*:nth-child(3){animation-delay:.14s}
  a:hover .m-draw>*:nth-child(4),summary:hover .m-draw>*:nth-child(4){animation-delay:.21s}
  a:hover .m-pulse>*,summary:hover .m-pulse>*{animation:ico-pulse .5s ease-out both}
  a:hover .m-pulse>*:nth-child(2),summary:hover .m-pulse>*:nth-child(2){animation-delay:.06s}
  a:hover .m-pulse>*:nth-child(3),summary:hover .m-pulse>*:nth-child(3){animation-delay:.12s}
  a:hover .m-lift>*:first-child,summary:hover .m-lift>*:first-child{animation:ico-lift .45s ease-out both}
  a:hover .m-tilt,summary:hover .m-tilt{animation:ico-tilt .45s ease-out both}
  a:hover .m-blink>*:nth-child(2),summary:hover .m-blink>*:nth-child(2){animation:ico-blink .4s ease-in-out both}
  a:hover .m-nudge,summary:hover .m-nudge{animation:ico-nudge .4s ease-out both}
  .m-spin{animation:ico-spin 1.6s linear infinite}
}`;
