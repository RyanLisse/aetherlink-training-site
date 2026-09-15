/**
 * Brief -> self-contained HTML.
 *
 * Reverse-engineered from the Dia "Tuesday Brief" / "Wednesday Brief" PDFs:
 *
 *   ┌───────────────────────────────────────────┐
 *   │   date rail │   painting + "The X Brief"  │ time rail
 *   │                caption (mono, right)      │
 *   │   greeting  (italic serif, two lines)     │
 *   │   Push your work forward     Let's do it →│
 *   │   Top to-dos      ○ title  [source]       │
 *   │   New updates     01 title  tag           │
 *   │   Your day        2:00p title  Prep me →  │
 *   │   Made for you by … using your …          │
 *   │   With love from Ⓐ Ⓑ                      │
 *   └───────────────────────────────────────────┘
 *
 * Pure function: no I/O, no dates computed here. Everything the page needs
 * arrives in `RenderInput`, so the same renderer serves the live agent, the
 * `--sample` dry run and the tests.
 */
import type { Brief, SourceName } from "./brief.js";

export type Artwork = {
  /** `data:image/jpeg;base64,…` (preferred, keeps the file portable) or an https URL. */
  src: string;
  /** e.g. "A Light on the Sea, Winslow Homer, 1897. oil on canvas" */
  caption: string;
};

export type Language = "en" | "nl";

export type RenderMeta = {
  /** "Tuesday" / "dinsdag" — already localised. */
  weekday: string;
  /** "01 SEP 2026" — already localised. */
  dateLabel: string;
  /** "10:55 AM" / "10:55" — already localised. */
  timeLabel: string;
  language: Language;
  /** Sources that were actually connected for this run; drives the footer line. */
  sources: readonly SourceName[];
  /** "Made for you by {brand}" */
  brand: string;
  /** "With love from {signoff}" */
  signoff: string;
  artwork?: Artwork;
};

export type RenderInput = { brief: Brief; meta: RenderMeta };

/* ---------- copy ---------- */

type Strings = {
  title: (weekday: string) => { lead: string; rest: string };
  push: string;
  cta: string;
  todos: string;
  updates: string;
  day: string;
  prep: string;
  madeBy: (brand: string, sources: string) => string;
  love: string;
  notes: string;
  sourceNames: Record<SourceName, string>;
  and: string;
  noArtwork: string;
};

const STRINGS: Record<Language, Strings> = {
  en: {
    title: (weekday) => ({ lead: "The", rest: `${weekday} Brief` }),
    push: "Push your work forward",
    cta: "Let's do it",
    todos: "Top to-dos",
    updates: "New updates",
    day: "Your day",
    prep: "Prep me",
    madeBy: (brand, sources) => `Made for you by <b>${brand}</b> using <i>your</i> ${sources}.`,
    love: "With love from",
    notes: "Notes",
    sourceNames: { gitlab: "GitLab", jira: "Jira", confluence: "Confluence", outlook: "Outlook" },
    and: "and",
    noArtwork: "No painting today.",
  },
  nl: {
    title: (weekday) => ({ lead: "De", rest: `${weekday}brief` }),
    push: "Zet je werk vooruit",
    cta: "Doen",
    todos: "Belangrijkste to-do's",
    updates: "Nieuwe updates",
    day: "Jouw dag",
    prep: "Bereid me voor",
    madeBy: (brand, sources) => `Voor jou gemaakt door <b>${brand}</b> met <i>je</i> ${sources}.`,
    love: "Met liefde van",
    notes: "Kanttekeningen",
    sourceNames: { gitlab: "GitLab", jira: "Jira", confluence: "Confluence", outlook: "Outlook" },
    and: "en",
    noArtwork: "Vandaag geen schilderij.",
  },
};

/* ---------- helpers ---------- */

export const esc = (s: string): string =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

const joinHuman = (parts: readonly string[], and: string): string =>
  parts.length <= 1 ? parts.join("") : `${parts.slice(0, -1).join(", ")} ${and} ${parts[parts.length - 1]}`;

const sourceChip = (source: SourceName | undefined, url: string | undefined, t: Strings): string => {
  if (!source) return "";
  const label = esc(t.sourceNames[source]);
  return url
    ? `<a class="chip chip-${source}" href="${esc(url)}" target="_blank" rel="noopener">${label}</a>`
    : `<span class="chip chip-${source}">${label}</span>`;
};

/** "Robert" -> "Ⓡ"-style circled initials, like the "B C N Y" sign-off in the source briefs. */
const circled = (signoff: string): string =>
  signoff
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => `<span class="ring">${esc(w[0]?.toUpperCase() ?? "")}</span>`)
    .join("");

const pad = (n: number): string => String(n).padStart(2, "0");

/** "Let's do it" -> "Let's<br>do it&nbsp;→": two hand-set lines, the arrow glued to the last word as in the source. */
const ctaLabel = (text: string): string => {
  const [first = "", ...rest] = text.split(" ").map(esc);
  return `${first}${rest.length ? `<br>${rest.join(" ")}` : ""}&nbsp;<span class="arrow">→</span>`;
};

const STARBURST = `<svg class="burst" viewBox="0 0 100 100" aria-hidden="true"><polygon fill="var(--paper)" stroke="var(--rule)" stroke-width="1.5" points="50,1 59,10 71,5 76,17 89,18 87,31 98,37 91,49 98,61 87,68 89,81 76,82 72,95 59,90 50,99 41,90 28,95 24,82 11,81 13,68 2,61 9,49 2,37 13,31 11,18 24,17 29,5 41,10"/></svg>`;

/** "14:00" -> "2:00p" for the compact gutter, mirroring the source layout. */
const compactTime = (hhmm: string, language: Language): string => {
  const m = /^(\d{1,2}):(\d{2})/.exec(hhmm);
  if (!m) return hhmm;
  const h = Number(m[1]);
  if (language === "nl") return `${pad(h)}:${m[2]}`;
  const suffix = h >= 12 ? "p" : "a";
  return `${h % 12 || 12}:${m[2]}${suffix}`;
};

const longTime = (start: string, end: string | undefined, language: Language): string => {
  const fmt = (hhmm: string): string => {
    const m = /^(\d{1,2}):(\d{2})/.exec(hhmm);
    if (!m) return hhmm;
    const h = Number(m[1]);
    if (language === "nl") return `${pad(h)}:${m[2]}`;
    return `${h % 12 || 12}:${m[2]} ${h >= 12 ? "PM" : "AM"}`;
  };
  return end ? `${fmt(start)} – ${fmt(end)}` : fmt(start);
};

/* ---------- sections ---------- */

const hero = (meta: RenderMeta, t: Strings): string => {
  const { lead, rest } = t.title(meta.weekday);
  const art = meta.artwork
    ? `<img class="painting" src="${esc(meta.artwork.src)}" alt="">`
    : `<div class="painting painting-empty" aria-hidden="true"></div>`;
  const caption = meta.artwork ? esc(meta.artwork.caption) : t.noArtwork;
  return `
<header class="hero">
  <span class="rail rail-date">${esc(meta.dateLabel)}</span>
  <span class="rail rail-time">${esc(meta.timeLabel)}</span>
  <div class="frame">
    ${art}
    <h1 class="masthead"><span class="lead">${esc(lead)}</span><span class="rest">${esc(rest)}</span></h1>
  </div>
  <p class="caption">${caption}</p>
  <p class="stamp"><span>${esc(meta.dateLabel)}</span><span>${esc(meta.timeLabel)}</span></p>
</header>`;
};

const pushForward = (brief: Brief, t: Strings): string => {
  const p = brief.pushForward;
  const body = p.offer ? `${p.body.trim()} ${p.offer.trim()}` : p.body;
  const label = ctaLabel(t.cta);
  const cta = p.link
    ? `<a class="cta" href="${esc(p.link.url)}" target="_blank" rel="noopener">${label}</a>`
    : `<span class="cta">${label}</span>`;
  return `
<section class="push">
  <div class="push-head">
    <h2>${esc(t.push)}</h2>
    ${cta}
  </div>
  <h3>${esc(p.title)}</h3>
  <p>${esc(body)}</p>
</section>`;
};

const todos = (brief: Brief, t: Strings): string =>
  brief.todos.length === 0
    ? ""
    : `
<section class="todos">
  <h2>${esc(t.todos)}</h2>
  <ul>
    ${brief.todos
      .map(
        (item) => `
    <li>
      <span class="circle" aria-hidden="true"></span>
      <div>
        <h3>${esc(item.title)} ${sourceChip(item.link?.source, item.link?.url, t)}</h3>
        <p>${esc(item.body)}</p>
      </div>
    </li>`,
      )
      .join("")}
  </ul>
</section>`;

const updates = (brief: Brief, t: Strings): string =>
  brief.updates.length === 0
    ? ""
    : `
<section class="updates">
  <h2>${esc(t.updates)}</h2>
  <ol>
    ${brief.updates
      .map(
        (u, i) => `
    <li>
      <span class="num">${pad(i + 1)}</span>
      <div>
        <h3>${esc(u.title)} <em class="tag">${esc(u.tag)}</em></h3>
        <p>${esc(u.body)} ${sourceChip(u.link?.source, u.link?.url, t)}</p>
      </div>
    </li>`,
      )
      .join("")}
  </ol>
</section>`;

const day = (brief: Brief, meta: RenderMeta, t: Strings): string => {
  if (brief.day.length === 0) return "";
  const lang = meta.language;
  const agenda = brief.day
    .map(
      (e) => `
    <li><span class="when">${esc(compactTime(e.start, lang))}</span><span class="what">${esc(e.title)}</span></li>`,
    )
    .join("");
  const details = brief.day
    .filter((e) => e.description || e.prep)
    .map(
      (e) => `
    <article class="event">
      <div>
        <h3>${esc(e.title)} — ${esc(longTime(e.start, e.end, lang))}</h3>
        ${e.description ? `<p>${esc(e.description)}</p>` : ""}
        ${e.prep ? `<p class="prep-note">${esc(e.prep)}</p>` : ""}
      </div>
      ${
        e.url
          ? `<a class="badge" href="${esc(e.url)}" target="_blank" rel="noopener">${STARBURST}<span>${ctaLabel(t.prep)}</span></a>`
          : ""
      }
    </article>`,
    )
    .join("");
  return `
<section class="day">
  <h2>${esc(t.day)}</h2>
  <ul class="agenda">${agenda}
  </ul>
  ${details}
</section>`;
};

const notes = (brief: Brief, t: Strings): string =>
  !brief.notes || brief.notes.length === 0
    ? ""
    : `
<section class="notes">
  <h2>${esc(t.notes)}</h2>
  <ul>${brief.notes.map((n) => `<li>${esc(n)}</li>`).join("")}</ul>
</section>`;

const footer = (meta: RenderMeta, t: Strings): string => {
  const names = meta.sources.map((s) => `<span class="src">${esc(t.sourceNames[s])}</span>`);
  return `
<footer>
  <p>${t.madeBy(esc(meta.brand), joinHuman(names, t.and))}</p>
  <p>${esc(t.love)} ${circled(meta.signoff)}</p>
</footer>`;
};

/* ---------- page ---------- */

const CSS = `
:root {
  --paper: #fdfcfa;
  --ink: #171614;
  --muted: #7d7873;
  --faint: #b9b3ab;
  --rule: #e8e4dd;
  --accent: #f2de1c;
  --accent-ink: #b39e00;
  --chip: #f1eee8;
  --serif: "Newsreader", "Iowan Old Style", "Times New Roman", Georgia, serif;
  --sans: "Instrument Sans", "Helvetica Neue", Arial, sans-serif;
  --mono: "IBM Plex Mono", "SFMono-Regular", Menlo, Consolas, monospace;
  color-scheme: light dark;
}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --paper: #151412; --ink: #f1ede6; --muted: #a29b92; --faint: #6b655e; --rule: #2b2824; --chip: #232019; --accent-ink: #e8d54a;
  }
}
:root[data-theme="dark"] {
  --paper: #151412; --ink: #f1ede6; --muted: #a29b92; --faint: #6b655e; --rule: #2b2824; --chip: #232019; --accent-ink: #e8d54a;
}
* { box-sizing: border-box; }
html, body { margin: 0; }
body {
  background: var(--paper);
  color: var(--ink);
  font-family: var(--sans);
  font-size: 17px;
  line-height: 1.6;
  padding-block: 40px 64px;
  padding-inline: 20px;
  -webkit-font-smoothing: antialiased;
}
a { color: inherit; text-decoration: none; }
a:hover, a:focus-visible { text-decoration: underline; text-underline-offset: 3px; }
a:focus-visible, .cta:focus-visible, .badge:focus-visible { outline: 2px solid var(--accent-ink); outline-offset: 3px; }
.brief { max-width: 660px; margin: 0 auto; }
.mark { display: block; width: 26px; height: 26px; margin: 0 auto 28px; color: var(--ink); }

/* hero */
.hero { position: relative; }
.frame { position: relative; aspect-ratio: 16 / 10; overflow: hidden; background: var(--chip); }
.painting { width: 100%; height: 100%; object-fit: cover; display: block; }
.painting-empty { background: linear-gradient(160deg, #cfd7d4 0%, #8fa3a0 55%, #3f5552 100%); }
.masthead {
  position: absolute; inset: 0; margin: 0;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  color: var(--accent); text-align: center; font-family: var(--serif); font-weight: 400;
  text-shadow: 0 1px 2px rgba(0,0,0,.35), 0 0 24px rgba(0,0,0,.25);
  text-wrap: balance;
}
.masthead .lead { font-style: italic; font-size: clamp(22px, 5vw, 36px); line-height: 1; margin-bottom: .1em; }
.masthead .rest { font-size: clamp(44px, 11vw, 82px); line-height: 1; letter-spacing: -0.01em; }
.caption { margin: 8px 0 0; text-align: right; font-family: var(--mono); font-size: 10.5px; letter-spacing: .06em; color: var(--faint); }
.rail {
  position: absolute; top: 50%; font-family: var(--serif); font-style: italic; font-size: 24px; letter-spacing: .02em;
  color: var(--ink); white-space: nowrap; writing-mode: vertical-rl;
}
.rail-date { left: -84px; transform: translateY(-50%) rotate(180deg); }
.rail-time { right: -84px; transform: translateY(-50%); }
.stamp { display: none; justify-content: space-between; margin: 10px 0 0; font-family: var(--serif); font-style: italic; font-size: 18px; }
@media (max-width: 880px) { .rail { display: none; } .stamp { display: flex; } }

/* greeting */
.greeting {
  font-family: var(--serif); font-style: italic; font-size: clamp(22px, 4vw, 28px); line-height: 1.35;
  color: var(--muted); margin: 40px 0 56px; text-wrap: balance;
}

/* sections */
section { margin: 0 0 56px; }
h2 { font-family: var(--serif); font-style: italic; font-weight: 400; font-size: 27px; margin: 0 0 22px; letter-spacing: -0.01em; }
h3 { font-size: 17.5px; font-weight: 600; margin: 0 0 6px; line-height: 1.35; letter-spacing: -0.005em; text-wrap: balance; }
section p { margin: 0; color: var(--muted); max-width: 62ch; }

.push { padding-inline: 24px; }
.push-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
.cta {
  flex: none; font-family: var(--serif); font-style: italic; font-size: 21px; line-height: 1.05;
  transform: rotate(-7deg); transform-origin: right center; margin-top: -6px; text-align: right; white-space: nowrap;
}
.arrow { font-family: var(--sans); font-style: normal; font-size: .8em; }

.todos ul, .updates ol, .agenda { list-style: none; margin: 0; padding: 0; }
.todos li, .updates li { display: grid; grid-template-columns: 56px 1fr; gap: 0; margin-bottom: 26px; }
.circle { width: 22px; height: 22px; border-radius: 50%; border: 1.5px solid var(--rule); margin-top: 3px; }
.num { font-family: var(--mono); font-size: 12px; color: var(--faint); margin-top: 7px; letter-spacing: .04em; }
.tag { font-family: var(--serif); font-style: italic; font-weight: 400; color: var(--muted); font-size: 16px; margin-left: 4px; }

.chip {
  display: inline-block; vertical-align: 2px; margin-left: 4px; padding: 2px 7px 1px; border-radius: 999px;
  background: var(--chip); color: var(--muted); font-family: var(--mono); font-size: 10px; letter-spacing: .08em; text-transform: uppercase;
}
a.chip:hover { text-decoration: none; color: var(--ink); }

.agenda { margin-bottom: 30px; }
.agenda li { display: grid; grid-template-columns: 76px 1fr; align-items: baseline; margin-bottom: 10px; }
.when { font-family: var(--mono); font-size: 13px; color: var(--faint); letter-spacing: .04em; }
.what { font-weight: 600; }
.event { display: flex; gap: 20px; align-items: center; justify-content: space-between; margin-bottom: 26px; }
.prep-note { margin-top: 6px !important; font-style: italic; }
.badge {
  position: relative; flex: none; width: 104px; height: 104px; display: grid; place-items: center; text-align: center;
  font-family: var(--serif); font-style: italic; font-size: 16px; line-height: 1.1; color: var(--ink);
  transform: rotate(-8deg); white-space: nowrap;
}
.badge .burst { position: absolute; inset: 0; width: 100%; height: 100%; }
.badge span { position: relative; }

.notes ul { margin: 0; padding-left: 18px; color: var(--muted); font-size: 15px; }
.notes li { margin-bottom: 6px; }

footer { margin-top: 88px; text-align: center; font-family: var(--serif); font-size: 19px; color: var(--muted); }
footer p { margin: 0 0 12px; }
footer b { font-weight: 500; color: var(--ink); }
footer .src { color: var(--ink); }
.ring {
  display: inline-grid; place-items: center; width: 22px; height: 22px; margin-left: 4px; border-radius: 50%;
  border: 1px solid var(--muted); font-family: var(--sans); font-size: 11px; color: var(--ink); vertical-align: 2px;
}

@media (max-width: 560px) {
  .push { padding-inline: 0; }
  .todos li, .updates li { grid-template-columns: 36px 1fr; }
  .event { flex-direction: column; align-items: flex-start; }
}
@media (prefers-reduced-motion: no-preference) {
  .cta, .badge { transition: transform .2s ease; }
  .cta:hover, .badge:hover { transform: rotate(-7deg) scale(1.04); }
}
@media print {
  @page { margin: 14mm; }
  body { padding: 0; font-size: 13px; }
  .brief { max-width: none; }
  .rail { display: none; } .stamp { display: flex; }
  section, .todos li, .updates li, .event { break-inside: avoid; }
  a { text-decoration: none; }
}
`;

const MARK = `<svg class="mark" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 3c4.4 0 8 3.4 8 7.6 0 2.1-.9 4-2.4 5.4L20 21h-4.7l-1.1-2.2a8.6 8.6 0 0 1-4.4 0L8.7 21H4l2.4-5C4.9 14.6 4 12.7 4 10.6 4 6.4 7.6 3 12 3z"/></svg>`;

/** Render a finished brief. Output is a complete document body (no <html>/<head> wrapper needed). */
export const renderBrief = ({ brief, meta }: RenderInput): string => {
  const t = STRINGS[meta.language];
  const { lead, rest } = t.title(meta.weekday);
  return `<!doctype html>
<html lang="${meta.language}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(`${lead} ${rest}`)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;1,6..72,400&family=Instrument+Sans:wght@400;600&family=IBM+Plex+Mono&display=swap">
<style>${CSS}</style>
</head>
<body>
<main class="brief">
${MARK}
${hero(meta, t)}
<p class="greeting">${esc(brief.greeting)}</p>
${pushForward(brief, t)}
${todos(brief, t)}
${updates(brief, t)}
${day(brief, meta, t)}
${notes(brief, t)}
${footer(meta, t)}
</main>
</body>
</html>
`;
};
