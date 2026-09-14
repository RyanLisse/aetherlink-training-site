# Design — AetherLink training site

Source of truth for how a slide looks and behaves. `intent.md` says what the deck must achieve; this file says how the UI delivers it. Change this file first, then `dist/templates.js`, `dist/styles.css` and `dist/app.js`.

The reference is the Canva deck **AetherMind · Worldline · Day 2 · From Model to Digital Colleague v2.0** and the **AetherMind Canva Style** sheet. The site reproduces that deck's template system in HTML; it does not invent a second visual language.

## Principles

1. **Mobile first.** The stylesheet is written for a phone. Two media queries widen it: `>=760px` (tablet) and `>=1100px` (presenter screen). A template never has its own mobile code — every arrangement is a column of blocks on a phone and spreads sideways when there is room.
2. **One skeleton, ten bodies.** Every slide is eyebrow · counter · title · subtitle · **one body template** · orange takeaway band. That is the Day 2 master. Nothing else is invented per slide.
3. **HTML, not SVG.** A diagram with a fixed `viewBox` shrinks on a phone until its labels are unreadable. Every Day 2 arrangement is blocks in a row, a column or a grid, so HTML reflows them for free.
4. **The room sees the concept; the facilitator holds the instructions.** The "Do this now" checklist, expected result and checkpoint live in the **Facilitator notes** dialog. The footer button carries the progress badge (`2/4`, `✓`).
5. **The type is visible before the text.** Six types, shown as a chip in the eyebrow, as the slide's accent colour (`--type`) and as a coloured segment in the footer.
6. **AetherBOT works, he does not decorate.** He points, stops, thinks or waits, always inside the template's own right-hand gutter, and only from 1100px up. He can never cover a label because he is never an overlay.
7. **State belongs to the room.** Checklist and checkpoint state live in `sessionStorage`, keyed by squad, day and slide title. Nothing is sent anywhere.
8. **English on the slide, Dutch in the notes.** Only the facilitator `notes` field may be Dutch.
9. **Nothing below the fold at 1440×900**, and nothing sideways at 360px.

## The Day 2 master

| Day 2 deck | Site |
| --- | --- |
| Purple eyebrow `DAY 2 · B8 · DIGITAL COLLEAGUE`, top left | `.eyebrow` — type chip + kicker |
| Grey `8 / 41` counter, top right | `.slide-count` |
| Orange kicker (`YOUR TURN · 12 MINUTES`) | absorbed into the type chip, which takes the kicker's head word |
| Ink title, 34–37 pt | `h1` |
| Grey one-line subtitle | `p.subtitle` |
| One body block | `.tpl` — the template |
| Orange all-caps band at the foot | `.tagline` |
| AetherBOT in a corner | `.tpl-bot` in the template's gutter |

## Templates (`dist/templates.js`)

`TEMPLATES.pick(slide, type)` names the template, `TEMPLATES.render(slide, ctx)` builds it. Both read only the slide's own fields, so the canonical course JSON never changes for looks.

| Template | Day 2 origin | Chosen for | Phone | Desktop | Bot |
| --- | --- | --- | --- | --- | --- |
| `cover` | slide 1 | first slide of a day deck | art, then cards | art beside cards | — |
| `columns` | 3, 25, 26 | concept definitions, `pillars` layout | one card per row | 2–4 equal cards | — |
| `stack` | 8, 9, 10 | "how we use it", practice and individual blocks | title above body | title column beside body | — |
| `chain` | 6, 7, 34 | only a slide that declares a sequence (an arrow in its subtitle or tagline) | vertical rail | numbers on a horizontal rail | — |
| `split` | 17, 27 | the deck's `compare` layout | stacked panels | two panels, the second dark | — |
| `grid` | 35, 36 | recap and close | one tile per row | auto-fit tiles | thinking |

Day 2's numbered panel (slides 12, 14, 22) has no on-slide equivalent here on purpose: our practice cards are *problem, outcome, open*, which is not a sequence, and the one genuinely ordered list — "Do this now" — is numbered inside the facilitator notes. **A template never numbers what the source did not order.** A chain is drawn only when the author declares the order with arrows; three unordered cards stay a stack. (Carried over from PR #4, which made the same point about generated figures.)
| `gate` | 34 | review and human gate | inputs, bar, exits top to bottom | inputs → gate → exits left to right | stop |
| `arc` | route slides | schedule and route | typed bar + legend | the same, taller | neutral |
| `pause` | break slides | break and lunch | clock + return time | the same, larger | neutral |
| `figure` | image slides | a slide with `image` | full-width image + caption | the same, capped at 50vh | — |

Two deck layouts keep their own interactive renderers in `app.js` because the interaction is the point: `steps` (reveal next / show all) and `recap` (reveal one by one). They still sit in a `.tpl` box so they inherit the same frame.

Adding a template: add the builder to `BUILD`, a rule to `pick()`, one block of CSS in section 6, and a row to this table.

## Slide anatomy

```
#stage
  section.heading      eyebrow (type chip + kicker) · counter · h1 · subtitle
  div.slide-body
    section.tpl[data-template]   the arrangement, plus img.tpl-bot in its gutter
    div.timer                     (day decks with a timed block)
  p.tagline            orange takeaway band (day decks)
```

## Shared blocks

Templates arrange these; they never restyle them.

- `.tag` — the small uppercase label on a card.
- `.tl` — a time list, built when a card body is a `·`-separated list of `HH:MM label` items.
- `.pills` — a pill chain, built when a card body contains at least two arrows (`Theory → demo → review`).
- Plain paragraph otherwise. All three are pure functions of the card text.

## Mobile rules

- Side gutter is `--gutter` (5vw on a phone, 4vw from 760px, 3.5vw from 1100px) — one value, set once on the toolbar, stage and footer.
- Every control is at least 40px tall. The day bar in the footer stays a thin 7px line but each segment carries a 41px hit area through a `::before` overlay.
- The toolbar and the footer action row scroll sideways and are masked at the right edge, so a cut-off item reads as scrollable rather than broken.
- The page must never scroll horizontally. `overflow-x: hidden` is deliberately **not** used — it would hide exactly the bug the gate is looking for.
- AetherBOT and the keyboard hint are hidden below 1100px and 760px respectively.

## Facilitator notes dialog

Opened from the footer button or `N`. Left: `NOTES` heading, the Dutch talk track, an `Example prompt ↗` button. Right (from 760px; below it, underneath): `DO THIS NOW` with the counter, numbered checkboxes, `EXPECTED RESULT` and the orange `CHECKPOINT` box with a `Mark passed` toggle that turns green.

## Keyboard

`←` `→` `PageUp` `PageDown` `Space` navigate · `Home` `End` jump · `N` notes · `P` prompt · `G` glossary · `C` chapters · `F` fullscreen · `?` lists them. Ignored while a dialog is open or a text field has focus.

## Tokens (`dist/styles.css` section 1)

| Token | Value | Use |
| --- | --- | --- |
| `--purple` / `--concept` | `#5b3fff` | brand, concept type, primary buttons, rails |
| `--purple-soft` / `--purple-line` | `#eeeafe` / `#c9c0f7` | tinted blocks and borders |
| `--orange` / `--practice` | `#ff7a1a` | practice type, decisions and warnings, takeaway band |
| `--accent-text` | `#aa4300` (dark `#ff9b53`) | orange text that must stay legible |
| `--review` `--recap` `--pause` `--context` | `#0f8a7a` `#2b2a3d` `#8a8599` `#766a9d` | the other four slide types |
| `--ok` | `#1f9d55` | checked step, passed checkpoint |
| `--ink` / `--navy` / `--page` / `--surface` | `#1f1e2e` / `#232338` / `#fbfafc` / `#fff` | text, dark blocks, page, cards |
| `--type` | the current slide's type colour | chip, accents |
| `--gutter` | 5vw / 4vw / 3.5vw | the one side gutter |
| Font | Arial, Helvetica | AetherLink house style; no web fonts |

`body.dark` swaps page, ink, surface and the soft/line pairs. No template defines a colour of its own, so none needs a dark-mode variant.

## AetherBOT

Poses in `dist/assets/`, from the Canva illustration sheet: `bot-neutral.png`, `bot-pointing.png`, `bot-thinking.png`, `bot-stop.png` (keyed to transparent) and the `bot-builder.jpg` cover illustration. Keep the same face, proportions and colours; add a pose by adding a file, never by recolouring one. Motion is a 0.8s entrance and a slow bob, off under `prefers-reduced-motion`. He is `aria-hidden`.

## Motion and accessibility

- Entrance animations are short and staggered by `--i`; everything stops under `prefers-reduced-motion`.
- Focus rings are 3px `#a895ff`.
- The `figure` template's image carries the slide's `imageAlt`; decorative art is `aria-hidden`.
- Dialogs are native `<dialog>` with focus return to the opener.

## Evidence

`node work/shoot.js` runs against the local server and also runs in CI on every push and pull request (`.github/workflows/slide-check.yml`, Playwright pinned in `package.json`). It renders all 190 slides of all eleven decks at three sizes — 1440×900 presenter, 390×844 phone, 360×740 small phone, 570 renders in total — and fails on:

- a page error, a console error or a failed request or image;
- a slide that resolves to no template;
- a "Do this now" still rendered on a slide;
- a slide taller than 900px on the presenter screen;
- any horizontal overflow on a phone;
- a control under 40px tall on a phone (the day bar excepted — it carries its own 41px hit area);
- unreduced motion, or AetherBOT touching any text;
- a notes or prompt dialog that opens empty, checked on every desktop slide.

Measurement runs with reduced motion on, because the entrance animation starts each block 10px low and would read as 6px of page overflow. One screenshot per template per size, a set of named desktop screenshots and `report.json` land in `work/shots/`.
