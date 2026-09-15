# Daily brief agent

A scheduled agent, built on the Claude Agent SDK, that reads the team's
GitLab, Jira, Confluence and Outlook calendar every morning and writes a
one-page brief in the style of Dia's "Tuesday Brief": one thing to push, a
few to-dos, what changed, your day, a painting on top.

```
cron / GitLab schedule
        │
        ▼
 src/main.ts ──► src/agent.ts ── query() ──► Claude
                     │                         │  reads through
                     │             src/sources.ts (in-process MCP tools)
                     │              gitlab_* · jira_* · confluence_* · outlook_*
                     │                         │
                     │◄── structured output: Brief JSON (src/brief.ts)
                     ▼
              src/render.ts ──► out/brief-YYYY-MM-DD.html  (+ latest.html, .json)
```

The model never touches the filesystem or a shell: `tools: []` disables the
built-ins, only the read-only source tools are allowed, and the output is
validated against a JSON schema before our own renderer turns it into HTML.
Everything the reader sees is HTML-escaped.

## Files

| File | Purpose |
| --- | --- |
| `src/brief.ts` | The `Brief` contract (zod) and its JSON schema for structured output |
| `src/sources.ts` | GitLab, Jira, Confluence and Microsoft Graph as `createSdkMcpServer` tools, enabled by env vars |
| `src/agent.ts` | The editorial system prompt and the single `query()` call |
| `src/render.ts` | Pure `Brief -> HTML`, English and Dutch, light and dark, print-ready |
| `src/artwork.ts` | Public-domain painting of the day (Art Institute of Chicago API), inlined as a data URI |
| `src/main.ts` | CLI: dates, config, output files |
| `sample/brief.sample.json` | A finished brief for dry runs and tests |
| `test/brief.test.ts` | Schema, renderer, source wiring and prompt tests (`node:test`) |
| `gitlab-ci.example.yml` | A scheduled GitLab pipeline that publishes the brief as a job artifact and to Pages |

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
| Footer | "Made for you by {brand} using your GitLab, Jira, Confluence and Outlook." and circled initials |

Set `BRIEF_LANGUAGE=nl` for a Dutch brief; the copy, the title ("De dinsdagbrief")
and the time format follow.
