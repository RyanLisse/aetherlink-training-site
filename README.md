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
| `dist/styles.css` | Mobile-first: section 1 tokens, section 6 the templates, section 12 the two breakpoints (760px, 1100px) |
| `dist/app.js` | Rendering, navigation, exercise timers, reveal controls, the facilitator-notes dialog (talk track + the checkable "Do this now" panel, progress kept in `sessionStorage` per slide) and the typed day-progress bar |
| `dist/templates.js` | The slide-body templates taken from the Day 2 deck (cover, columns, stack, chain, split, grid, gate, arc, pause, figure) plus the topic registry that maps exact card-title sets to comparison, layers and handoff |
| `dist/widgets.js` | Interactive agent loop and illustrative SDLC diagram |
| `dist/data.js` | Reusable presentation framework |
| `dist/days.js` | Squad 1 day decks (`window.DAYS`) |
| `dist/squad2.js` | Squad 2 day decks (`window.SQUAD2`) |
| `dist/assets/` | Images: concept diagrams, the AetherBOT poses (`bot-*.png`, `bot-builder.jpg`) and the standalone `ai-native-sdlc-line-and-loop.png` reference |
| `work/shoot.js` | Gate, also run by `.github/workflows/slide-check.yml`: renders every slide of every deck at 1440x900, 390x844 and 360x740 and fails on console errors, a missing template, a slide past the presenter fold, horizontal overflow on a phone or a tap target under 40px |

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

With the server running, `node work/shoot.js` renders all 229 slides of both squads at three
viewport sizes and writes screenshots to `work/shots/`. It needs Playwright on
`NODE_PATH`. See the Evidence section of `design.md` for what it fails on.

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
