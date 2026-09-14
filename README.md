# AetherLink training site

Editable source for the public [AetherLink training site](https://aetherlink-training.ryanlisse.chatgpt.site).

## Repositories

- **This repo:** presentation website, navigation, styling, and published slide content.
- **[Participant lab](https://github.com/RyanLisse/aetherlink-agent-lab):** clone once for templates, synthetic data, n8n and Claude Code demos. No full curriculum.
- **[Course source](https://github.com/RyanLisse/aetherlink-training-template):** trainer workbooks and canonical day decks.

## Edit the site

Clone this repository and edit the files directly, or use GitHub's file editor.

| File | Purpose |
| --- | --- |
| `dist/index.html` | Page shell and asset references |
| `dist/styles.css` | AetherLink colours, typography and layout; the "Learning-experience layer" block at the end owns the Learn/Do grid, slide-type chips and progress segments |
| `dist/app.js` | Rendering, navigation, exercise timers, reveal controls, the facilitator-notes dialog (talk track + the checkable "Do this now" panel, progress kept in `sessionStorage` per slide) and the typed day-progress bar |
| `dist/figures.js` | Generated slide diagrams: semantic topic registry plus one figure per slide, drawn from the slide's own card titles and short facts |
| `dist/widgets.js` | Interactive agent loop and illustrative SDLC diagram |
| `dist/data.js` | Reusable presentation framework |
| `dist/days.js` | Squad 1 day decks (`window.DAYS`) |
| `dist/squad2.js` | Squad 2 day decks (`window.SQUAD2`) |
| `dist/assets/` | Images: concept diagrams, the AetherBOT poses (`bot-*.png`, `bot-builder.jpg`) and the standalone `ai-native-sdlc-line-and-loop.png` reference |
| `work/shoot.js` | Gate: renders every slide of every deck, fails on console errors or a slide taller than 900px, and writes screenshots |

The day registries are JavaScript assignments containing JSON data. Preserve the
assignment and edit the objects. Each deck has a `guideUrl` and `slides`; keep
slide fields such as `title`, `cards`, `prompt`, `steps`, `expected`, and `check`.
Slides carry no type field: `slideType()` in `app.js` derives Practice, Concept,
Review, Recap, Break or Context from the kicker, title, layout and timer, so
keep kickers starting with a recognisable word (`PRACTICE`, `CONCEPT`, `REVIEW`,
`RECAP`, `BREAK`) when you add slides.
For curriculum changes, update the canonical JSON in the course repo first and
copy its data into the matching site registry. A later course sync replaces
that registry, so carry direct slide edits back to the canonical course JSON.

## Preview

From this repository root, run `python3 -m http.server 8080 --directory dist`,
then open `http://localhost:8080/?squad=1&day=3#1` or
`http://localhost:8080/?squad=2&day=2#1`. Stop the server with Ctrl-C afterward.
No build or package install is required.

With the server running, `node work/shoot.js` renders all 190 slides, fails on any
console error or slide that does not fit 1440x900, and writes screenshots to
`work/shots/`. It needs Playwright on `NODE_PATH`.

## Publish

GitHub stores the editable source. **Pushing here does not automatically update
the live Site.** Ask Codex to publish this checkout through Sites. The publisher
must push the validated commit to the existing Sites source repository, package
`dist/` with `.openai/hosting.json`, save that exact version and deploy it.
Preserve the registered project ID and public audience. Never put credentials
in this repository. GitHub and Sites must contain the same commit when published.

## Participant entry

The participant lab starts with the same ticket agent in n8n, then rebuilds it
in Claude Code. Workflows require participant-provided credentials. Synthetic
examples and static checks do not prove a live model run succeeded.
