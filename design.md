# Design — AetherLink training site

Source of truth for how a slide looks and behaves. `intent.md` says what the deck must achieve; this file says how the UI delivers it. Change this file first, then `dist/styles.css`, `dist/figures.js` and `dist/app.js`.

The reference is the Canva deck **AetherMind · Worldline · Day 2 · From Model to Digital Colleague v2.0** and the **AetherMind Canva Style** sheet. The site reproduces that slide template in HTML; it does not invent a second visual language.

## Principles

1. **Every slide is a picture plus a claim.** Left: the content (cards, compare, steps). Right: one figure — a published diagram, an interactive widget, or a figure generated from the slide's own cards. No slide is text only.
2. **The room sees the concept; the facilitator holds the instructions.** Since 2026-09-14 the "Do this now" checklist, expected result and checkpoint live in the **Facilitator notes** dialog, not on the slide. The footer button carries the progress badge (`2/4`, `✓`) so the facilitator sees the state without opening it.
3. **The type is visible before the text.** Six types, shown as a chip in the eyebrow, as the accent colour of the whole slide (`--type`) and as a coloured segment in the footer.
4. **AetherBOT works, he does not decorate.** He points at a concept, stops the room at a gate, thinks on a recap, waits during a break. He always sits in his own grid column inside the figure card, so he can never cover a label.
5. **State belongs to the room, not the server.** Checklist and checkpoint state live in `sessionStorage`, keyed by squad, day and slide title. Closing the tab resets the room. Nothing is sent anywhere.
6. **English on the slide, Dutch in the notes.** All participant-visible text is English. Only the facilitator `notes` field may be Dutch.
7. **Concept cadence.** A concept is introduced as three slides: definition (`CONCEPT DEFINITION · NAME`), visual (`VISUAL · NAME`, `image` layout) and how we use it (`HOW WE USE IT · NAME`). Each slide gets its own figure kind, so the triplet reads as three different pictures.
8. **Nothing a participant needs sits below the fold at 1440×900.**

## The Day 2 slide template

The Canva master, top to bottom, and the element that carries it here:

| Day 2 deck | Site |
| --- | --- |
| Purple eyebrow `DAY 2 · B8 · DIGITAL COLLEAGUE`, top left | `.eyebrow` — type chip + kicker |
| Grey `8 / 41` counter, top right | `.slide-count` |
| Orange kicker line (`YOUR TURN · 12 MINUTES`) | absorbed into the type chip, which takes the kicker's head word |
| Big ink title, 34–37 pt | `h1` |
| Grey one-line subtitle | `p.subtitle` |
| Centre: one diagram built from cards, circles, rails and pills | `.slide-figure` (published SVG/PNG, widget, or generated figure) |
| Left/right supporting cards | `.cards` in `.slide-main` |
| Orange all-caps takeaway band at the foot | `.tagline` — a full-width pill under the slide body |
| AetherBOT in a corner, never over text | `.bot` in its own column of `.slide-figure` |

## Slide anatomy

```
#stage
  section.heading            eyebrow (type chip + kicker) · counter · h1 · subtitle
  div.slide-body[.with-figure][.figure-right][.figure-only]
    figure.slide-figure      published image | generated SVG | hero illustration
      div.figure-canvas      the drawing
      img.bot                AetherBOT, own grid column (hub/flow/cycle → left, others → right)
    div.slide-main           cards | pillars | steps | compare | recap | widget (+ timer)
  p.tagline                  orange takeaway band (day decks only)
```

`figure-right` puts the figure after the content for hub, close and hero figures, so consecutive slides alternate and the deck does not feel like one repeated layout. Below 1100 px the grid collapses to one column, figure first.

## Figures (`dist/figures.js`)

`FIGURES.forSlide(slide, ctx)` first checks a small declarative topic registry, then falls back to the slide type and kicker. Generated SVGs use the slide's **own card titles and one short fact per card** — the canonical JSON never changes for looks, and unordered cards are not presented as a sequence. Colours come from `.fig-*` classes in the stylesheet, so every figure works on the light and dark themes.

| Kind | Used for | Drawing | Bot |
| --- | --- | --- | --- |
| `hub` | `CONCEPT DEFINITION`, `REFERENCE`, `What is …` | concept in an orange-ringed navy circle, one card per node | pointing |
| `rows` | `HOW WE USE IT` | one full-width row per card with a coloured rail (Day 2 memory slide) | — |
| `comparison` | intent facets (`WHAT`, `WHY`, `BOUNDARIES`), positive/negative tests | parallel source-card panels; tests add a visible VS marker | pointing |
| `layers` | AI-native SDLC, agent system parts | stacked source-card layers with topic-specific relationship caption | pointing |
| `handoff` | Proof/GitLab handoff, named roles | document panels connected only where the source names stages | pointing |
| `flow` | explicitly ordered demo or transfer | numbered circles on a purple rail, ending at an orange "You decide" | pointing |
| `cycle` | practice, individual, MOB | do → evidence → check around the block timer in minutes | pointing |
| `gate` | review, human gate | three inputs meet the gate; exits accept / park / redirect | stop |
| `arc` | welcome, schedule, route | the whole day as typed segments with "You are here" and a legend | neutral |
| `close` | recap, close, reflection | made / learned / can do as three overlapping circles | thinking |
| `pause` | break, lunch | a clock with the break wedge and the return time | neutral |
| `hero` | slide 1 of a day deck | the AetherBOT block-stacking illustration | — |

A slide that carries its own `image`, a `widget`, or a wide layout (`steps`, `pillars`, `compare`, `recap`) keeps that and gets no generated figure.

Canvas sizes are 640×400 (`flow`, `handoff`, `rows`) and 640×440 (the rest), close to the card's aspect so the drawing fills it instead of floating in whitespace.

The topic registry covers exact card-title sets for intent, Proof/GitLab handoff, agent tools and instructions, SDLC stages, positive/negative tests, and named roles. Its captions describe only relationships stated by those cards. A generic demo or example receives `flow` only when the cards contain a recognised ordered set such as install → invoke → verify.

## AetherBOT

Five approved poses live in `dist/assets/`, keyed from the Canva illustration sheet: `bot-neutral.png`, `bot-pointing.png`, `bot-thinking.png`, `bot-stop.png` (backgrounds keyed to transparent) and the `bot-builder.jpg` hero. Keep the same face, proportions and colours; add a pose only by adding a file, never by recolouring one.

Motion: a 0.8 s entrance, then a slow idle loop per pose (`bot-point`, `bot-alert`, `bot-think`, `bot-bob`). All of it is off under `prefers-reduced-motion`. He is `aria-hidden`; he never carries information the text does not.

## Facilitator notes dialog

Opened from the footer button or the `N` key. Two columns on a wide screen:

- **Left** — `NOTES` heading, the Dutch talk track, and an `Example prompt ↗` button.
- **Right** — the `DO THIS NOW` panel: counter `n / total`, numbered checkboxes (struck through when done), `EXPECTED RESULT`, and the orange `CHECKPOINT` box with a `Mark passed` toggle that turns green.

The footer button shows `Facilitator notes · 0/4` and a green `✓` once the checkpoint passes. When all steps are checked the panel border turns green and a toast says `All steps done · check the checkpoint`.

## Keyboard

`←` `→` `PageUp` `PageDown` `Space` navigate · `Home` `End` jump · `N` notes · `P` prompt · `G` glossary · `C` chapters · `F` fullscreen · `?` shows the list as a toast. Keys are ignored while a dialog is open or a text field has focus.

## Tokens (`dist/styles.css`)

| Token | Value | Use |
| --- | --- | --- |
| `--purple` / `--concept` | `#5b3fff` | brand, concept type, primary buttons, figure rails |
| `--purple-soft` / `--purple-line` | `#eeeafe` / `#c9c0f7` | figure node fills and borders, chips |
| `--orange` / `--practice` | `#ff7a1a` | practice type, decisions and warnings, takeaway band, gate exits |
| `--accent-text` | `#aa4300` (dark `#ff9b53`) | orange text that must stay legible |
| `--review` | `#0f8a7a` | review and gate slides |
| `--recap` | `#2b2a3d` (dark `#c5c1d5`) | recap and close |
| `--pause` | `#8a8599` | break and lunch |
| `--context` | `#766a9d` | welcome, schedule, reference |
| `--ok` | `#1f9d55` | checked step, passed checkpoint |
| `--ink` / `--navy` / `--page` / `--surface` | `#1f1e2e` / `#232338` / `#fbfafc` / `#fff` | text, hub circles, page, cards |
| `--type` | the current slide type | chip, figure top border, page glow |
| Font | Arial, Helvetica | AetherLink house style; no web fonts |

`body.dark` swaps page, ink, surface and the soft/line pairs; every `.fig-*` class is defined in terms of tokens, so no figure needs a dark-mode variant of its own.

## Cards are visual by default

`renderCard()` decorates every card without per-slide artwork:

- **Icon** per card title, chosen by keyword (`ICON_RULES`). Odd cards purple, even cards orange, matching the card's left rail. Unknown titles get a dot; add a rule rather than a one-off icon.
- **Pill chain** when a card body contains at least two arrows (`Theory → demo → review`).
- **Timeline** when a card body is a `·`-separated list of `HH:MM label` items. Seven items or more break into two columns so a route slide still fits the fold.
- Everything else stays a paragraph. The transforms are pure functions of the card text.

## Motion and accessibility

- Entrance animations are short (`enter`, `pop`, `bot-in`); idle loops are slow. Everything stops under `prefers-reduced-motion`.
- Focus rings are 3 px `#a895ff`; footer segments use a 2 px ring.
- Figures are `role="img"` with a generated `aria-label` describing the drawing; the bot is `aria-hidden`.
- Dialogs are native `<dialog>` with focus return to the opener.

## Diagram primitives (`dist/assets/*.svg`)

Hand-drawn concept diagrams use the same primitives as the generated figures, so a diagram never looks like it came from another tool: card (white, coloured rail, small uppercase heading), step (64 px circle on the purple chain), pill (full-radius tab), tint box (purple 12 % for system nodes, orange for the human node), callout (ink pill with an orange border and a `▼`), loop (navy nodes, orange core, dashed orange ring). Background plain white, Arial only. `robot.png`, `bot-*.png` and `adoption.png` are third-party or licensed rasters and stay as they are.

## Evidence

Every UI change ships with `node work/shoot.js`: it renders all 190 slides of all eleven decks, fails on any console error, on any "Do this now" left on a slide, and on any slide taller than 900 px at 1440×900, then writes screenshots at 1440×900 and 390×844.
