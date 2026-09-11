# Design — AetherLink training site

Source of truth for how a slide looks and behaves. `intent.md` says what the deck must achieve; this file says how the UI delivers it. Change this file first, then `dist/styles.css` and `dist/app.js`.

## Principles

1. **Learn left, do right.** A slide is two columns on a presenter screen: the concept (cards, visual, widget) on the left, the "Do this now" panel on the right. Nothing a participant needs may sit below the fold at 1440×900.
2. **The type is visible before the text.** Every slide carries one of six types, shown as a chip in the eyebrow and as a coloured segment in the footer. Participants should know "practice or concept?" before they read the title.
3. **State belongs to the room, not the server.** Checklist and checkpoint state live in `sessionStorage`, keyed by squad, day and slide title. Closing the tab resets the room. Nothing is sent anywhere.
4. **English on the slide, Dutch in the notes.** All participant-visible text is English. Only the facilitator `notes` field may be Dutch.
5. **Concept cadence.** A concept is introduced as definition → visual → how we use it. The definition is a three-card slide, the visual is an `image` layout with a caption, and "how we use it" is the first exercise step that applies it.

## Tokens (`dist/styles.css`)

| Token | Value | Use |
| --- | --- | --- |
| `--purple` / `--concept` | `#5b3fff` | brand, concept chip and segment, primary buttons |
| `--orange` / `--practice` | `#ff7a1a` | practice chip and segment, exercise panel border, timer late state |
| `--review` | `#0f8a7a` | review and gate slides |
| `--recap` | `#2b2a3d` (dark: `#c5c1d5`) | recap and close slides |
| `--pause` | `#8a8599` | break and lunch |
| `--context` | `#766a9d` | welcome, schedule, reference |
| `--ok` | `#1f9d55` | checked step, passed checkpoint, all-done panel border |
| `--ink` / `--page` / `--surface` | `#1f1e2e` / `#fbfafc` / `#fff` | text, page, cards; `body.dark` swaps them |
| Font | Arial, Helvetica | AetherLink house style; no web fonts |

Chip text is white except on practice, recap-on-dark and pause, where it is `--ink` for contrast.

## Slide anatomy

```
#stage
  section.heading        eyebrow (type chip + kicker) · slide count · h1 · subtitle
  div.slide-body[.with-side]
    div.slide-main       cards | pillars | steps | compare | recap | image | widget (+ timer, tagline)
    aside.exercise-instructions   (only when .with-side)
  section.exercise-instructions   (when the layout is too wide for a side panel)
```

`with-side` is on for every day-deck slide except `widget`, `steps` and `compare` layouts, which need the full width. Below 1100px the grid collapses to one column and the panel follows the content.

## "Do this now" panel

- Heading row: `DO THIS NOW` + counter `n / total`.
- Steps: custom checkboxes, numbered by CSS counter, struck through when done.
- Expected result: small caps label + sentence.
- Checkpoint: orange box with a `Mark passed` toggle; turns green when passed.
- When all steps are checked the panel border turns green and a toast says `All steps done · check the checkpoint`.

## Footer

- Left: `nn / total`, then the day bar: one `button.seg` per slide, coloured by type, current one raised with `aria-current="step"`. Roving tabindex: only the current segment is in the tab order; arrow keys change slide and focus follows.
- Below the bar: `← → navigate` keyboard hint (hidden on mobile).
- Right: Participant lab, Workbook, Example prompts, Facilitator notes, prev/next.

## Slide types (`slideType()` in `dist/app.js`)

Order of precedence: `layout: exercise` → practice; `layout: recap` → recap; kicker head word (`PRACTICE`, `CONCEPT`, `REVIEW`, `GATE`, `RECAP`, `CLOSE`, `BREAK`, `LUNCH`); `widget` or `image` layout → concept; title words; a timer or `MIN` in the kicker → practice; otherwise context. When adding slides, start the kicker with the type word and the chip absorbs it (`CONCEPT 1 · 10:15` renders as chip `CONCEPT 1`, kicker `10:15`).

## Motion and accessibility

- Entrance animations are short (`enter`, `pop`) and disabled under `prefers-reduced-motion`.
- Focus rings are 3px `#a895ff`; segments use a 2px ring.
- The mascot is decorative (`aria-hidden`), docked in the header, hidden below 1100px, and never overlaps content.
- Dialogs are native `<dialog>` with focus return to the opener.

## Evidence

Every UI change ships with screenshots at 1440×900 and 390×844 from the local server, plus `node work/bundle-update/check_site_dom.cjs` and `node work/feedback-followup/check_routes.cjs` output.

## Diagrams (`dist/assets/*.svg`)

Concept diagrams are built from the same primitives as the slides, so a diagram never looks like it came from another tool:

- **Card**: white, 3px top border in `--purple` or `--orange`, rounded bottom corners, small uppercase heading (13px, letter-spacing 1) and 17px body. Same as `.card`.
- **Step**: 64px circle, 3px `--purple` border with a purple number; the active step uses `--orange` with the `#aa4300` accent text. Steps sit on the 10px purple-tinted chain bar. Same as `.step-circle` and `.steps-chain`.
- **Pill**: full-radius tab with the light purple border `#c9c0f7`; the selected pill is solid `--purple` with white text. Same as `.phase-tab`.
- **Tint box**: purple 12% tint with `--line` border for agent/system nodes; orange tint with `--orange` border for the human node. Same as the agentic-loop widget.
- **Callout**: ink pill with a 2px orange border, white uppercase text and a `▼`. Same as `.step-callout`.
- **Eyebrow and tagline**: purple uppercase letter-spaced title at the top; `#aa4300` uppercase tagline at the bottom.
- **Loop**: ink nodes, orange core with ink text, orange dashed ring. Same as the SDLC widget.
- Background is plain white so the SVG sits inside `.concept-figure` without a second frame. Arial only, no shadows heavier than the card shadow. `robot.png` (mascot) and `adoption.png` (Anthropic source image) are third-party rasters and stay as they are.
