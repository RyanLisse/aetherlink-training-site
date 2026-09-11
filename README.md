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
| `dist/styles.css` | AetherLink colours, typography and layout |
| `dist/app.js` | Rendering, navigation, exercise timers and reveal controls |
| `dist/widgets.js` | Interactive agent loop and illustrative SDLC diagram |
| `dist/data.js` | Reusable presentation framework |
| `dist/days.js` | Crew 1 day decks (`window.DAYS`) |
| `dist/crew2.js` | Crew 2 day decks (`window.CREW2`) |
| `dist/assets/` | Images |

The day registries are JavaScript assignments containing JSON data. Preserve the
assignment and edit the objects. Each deck has a `guideUrl` and `slides`; keep
slide fields such as `title`, `cards`, `prompt`, `steps`, `expected`, and `check`.
For curriculum changes, update the canonical JSON in the course repo first and
copy its data into the matching site registry. A later course sync replaces
that registry, so carry direct slide edits back to the canonical course JSON.

## Preview

From this repository root, run `python3 -m http.server 8080 --directory dist`,
then open `http://localhost:8080/?crew=1&day=3#1` or
`http://localhost:8080/?crew=2&day=2#1`. Stop the server with Ctrl-C afterward.
No build or package install is required.

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
