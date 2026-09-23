# Daily brief agent

A scheduled agent, built on the Claude Agent SDK, that reads the team's
GitLab, Jira, Confluence and Outlook calendar — or your own GitHub, Linear and
Notion — every morning and writes a one-page brief in the style of Dia's
"Tuesday Brief": one thing to push, a few to-dos, what changed, your day, a
painting on top.

```
cron / GitLab schedule
        │
        ▼
 src/main.ts ──► src/agent.ts ── query() ──► Claude
                     │                         │  reads through
                     │             src/sources.ts (in-process MCP tools)
                     │              gitlab_* · jira_* · confluence_* · outlook_*
                     │              github_* · linear_* · notion_*
                     │                         │
                     │◄── structured output: Brief JSON (src/brief.ts)
                     ▼
              src/render.ts ──► out/brief-YYYY-MM-DD.html  (+ latest.html, .json)
```

The model never touches the filesystem or a shell: `tools: []` disables the
built-ins, only the read-only source tools are allowed, and the output is
validated against a JSON schema before our own renderer turns it into HTML.
Everything the reader sees is HTML-escaped.

## Documents and the lesson

The agent is also the worked example of the site's guided lesson
(`?lesson=daily-brief`, facilitator guide in `LESSON.md`). Its documents follow
the course's document chain and live next to the code:

| Document | Phase | What it holds |
| --- | --- | --- |
| `intent.md` | Plan | Outcome, success checks, boundary, owners, evidence contract, OPEN |
| `docs/spec.md` | Plan | The brief's anatomy with one quoted example per field from the two reference PDFs, house style, acceptance examples |
| `docs/design.md` | Design | The parts, the three boundaries in code (bound, watch, interrupt), the hooks table, risks |
| `docs/decisions/ADR-001-in-process-tools.md` | Design | Why in-process read-only tools instead of community MCP servers |
| `docs/plan.md` | Design | Seven ordered steps with a proof command each, rollback, the human gates |
| `docs/evidence.md` | Test | The three commands with exit codes, the screenshot, the reviewer |
| `docs/gate.md` | Deploy | The pull request read against `intent.md`: PASS / FAIL / OPEN and the handoff |

`lab/build-lab.sh <dir>` builds the participant lab repository from this
folder: `main` holds only the empty templates in `lab/steps/0-start`, and a
`solution` branch carries one commit per step, tagged `step-1-intent` …
`step-7-gate-deploy`. See `LESSON.md`.

## Files

| File | Purpose |
| --- | --- |
| `src/brief.ts` | The `Brief` contract (zod) and its JSON schema for structured output |
| `src/sources.ts` | GitLab, Jira, Confluence, Microsoft Graph, GitHub, Linear and Notion as `createSdkMcpServer` tools, enabled by env vars |
| `src/agent.ts` | The editorial system prompt and the single `query()` call |
| `src/render.ts` | Pure `Brief -> HTML`, English and Dutch, light and dark, print-ready |
| `src/artwork.ts` | Public-domain painting of the day, no API key: a local file (`BRIEF_ARTWORK_FILE`), else the Art Institute of Chicago API, else The Met, inlined as a data URI |
| `src/main.ts` | CLI: dates, config, output files |
| `sample/brief.sample.json` | A finished brief for dry runs and tests |
| `test/schema.test.ts`, `test/render.test.ts`, `test/agent.test.ts` | Contract, renderer, and wiring/prompt tests (`node:test`), one file per lesson step |
| `gitlab-ci.example.yml` | A scheduled GitLab pipeline that publishes the brief as a job artifact and to Pages |
| `github-actions.example.yml` | The same schedule on GitHub Actions, with the tokens as repository secrets |
| `SOLO.md` | The seven steps for one person with their own GitHub, Linear and Notion |

## Run it

```bash
cd agents/daily-brief
npm install
cp .env.example .env          # fill in what you have; unset sources are skipped
npm run brief:sample          # renders the sample, no API calls, opens in any browser
set -a && . ./.env && set +a
npm run brief                 # live run: prints the path of today's brief
```

Checks: `npm run typecheck` and `npm test`.

Flags: `--date 2026-09-15` (brief for another day), `--no-artwork`, `--out DIR`.

## Sources and credentials

| Source | Variables | Token type |
| --- | --- | --- |
| GitLab | `GITLAB_URL`, `GITLAB_TOKEN`, optional `GITLAB_PROJECTS` | Personal access token with `read_api` |
| GitHub | `GITHUB_TOKEN`, optional `GITHUB_REPOS`, `GITHUB_API_URL` | Fine-grained token, read-only: Contents, Issues, Pull requests, Metadata, Notifications |
| Linear | `LINEAR_API_KEY`, optional `LINEAR_TEAMS` | Personal API key (Settings → API); GraphQL, queries only |
| Notion | `NOTION_TOKEN`, optional `NOTION_VERSION` | Internal integration token; share the pages it may read with the integration |
| Jira | `JIRA_URL`, `JIRA_TOKEN`, `ATLASSIAN_KIND=cloud\|server`, cloud also `JIRA_EMAIL` | Cloud API token or Data Center personal access token |
| Confluence | `CONFLUENCE_URL` (falls back to the Jira token and email), optional `CONFLUENCE_SPACES` | Same as Jira |
| Outlook | `MS_TENANT_ID`, `MS_CLIENT_ID`, `MS_CLIENT_SECRET`, `MS_USER` | Entra app registration with application permission `Calendars.Read` (`Mail.Read` if `OUTLOOK_INCLUDE_MAIL=true`), admin-consented |

Every tool is a plain token-authenticated GET, so the agent runs headless
without an OAuth browser flow. If you already operate an MCP server for one of
these systems, replace the matching entry in `buildSources()` with a
`{ command, args, env }` or `{ type: "http", url, headers }` config; the
`mcp__<source>__*` allow-list stays the same.

## Schedule it

**cron on a server**

```
30 6 * * 1-5  cd /srv/daily-brief && set -a && . ./.env && set +a && npm run brief >> brief.log 2>&1
```

**GitLab scheduled pipeline** — copy `gitlab-ci.example.yml` into the
repository's `.gitlab-ci.yml`, add the variables from `.env.example` as masked
CI/CD variables, and create a schedule (CI/CD → Schedules) for 06:30 on
weekdays. The job stores `out/` as an artifact and the optional `pages` job
publishes `latest.html`.

## Delivering the brief

`out/latest.html` is one self-contained file (fonts from Google Fonts, painting
inlined), so it can be attached to a mail, published to Pages, printed to PDF
from the browser (the print stylesheet keeps the layout), or published as an
artifact. `out/brief-YYYY-MM-DD.json` is the structured brief for anything
downstream, such as a Teams message or a Confluence page.

## The house style, reverse-engineered

| Section | Rule |
| --- | --- |
| Masthead | Painting, "The {Weekday} Brief" in yellow serif, date rail left, time rail right, caption in mono |
| Greeting | One or two italic sentences about the shape of the day, written from the calendar |
| Push your work forward | The single highest-leverage item, with an "I can …" offer and a "Let's do it →" link |
| Top to-dos | Two to four imperative titles naming the artifact (MR !142, AL-231), evidence in the body, source chip |
| New updates | Numbered, past tense, outcome in the title, an italic area tag, loose ends named |
| Your day | Compact agenda, then a detail per meeting with a "Prep me →" starburst |
| Footer | "Made for you by {brand} using your GitLab, Jira, Confluence and Outlook." (or GitHub, Linear and Notion — whichever is connected) and circled initials |

Set `BRIEF_LANGUAGE=nl` for a Dutch brief; the copy, the title ("De dinsdagbrief")
and the time format follow.
