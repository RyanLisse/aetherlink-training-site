# Design — Daily brief agent

Status: `ACCEPTED — 2026-09-15`

## Shape

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

The model sees tools and a schema. It never sees the filesystem, the shell or the page. Everything that reaches the reader passes through `render.ts`, which escapes it.

## Parts

| Part | File | Owns | Never does |
| --- | --- | --- | --- |
| The contract | `src/brief.ts` | The `Brief` shape, its JSON schema, `parseBrief()` | Rendering, fetching, prompting |
| The adapters | `src/sources.ts` | One in-process MCP server per source, each tool a bounded read-only GET wrapped in `guarded()` | Writing to a source, holding a credential outside `process.env`, unbounded output |
| The loop | `src/agent.ts` | The house-style system prompt and the single `query()` call | Touching files, deciding layout, retrying outside the SDK |
| The checker | `src/render.ts`, `test/` | `Brief → HTML`, escaping, both languages, both themes, print; the tests that prove the contract and the wiring | Fetching anything; deciding content |
| The picture | `src/artwork.ts` | A keyless public-domain painting, inlined as a data URI; a gradient when none | Failing the run |
| The entry | `src/main.ts` | Dates in the reader's zone, configuration from the environment, the three output files | Business rules |

## Boundaries in code

- **Bound the task.** `tools: []` removes every built-in tool. `allowedTools: ["mcp__gitlab__*", …]` lists only the connected sources. `settingSources: []` keeps project settings and CLAUDE.md out of a scheduled run. The system prompt says what a brief is and forbids invented facts.
- **Watch the loop.** `maxTurns` caps the run. Every tool call is logged to stderr with its input. `outputFormat` makes the SDK validate the final answer against `brief.ts` and retry on its own; `parseBrief()` validates it again in our code before anything is written.
- **Interrupt on purpose.** `permissionMode: "dontAsk"`: nothing inside the run waits for a person, because a cron job that asks stalls forever. The human interrupt sits after the run: the pull request that reviews what the agent built, and the reader who decides what to push.

## Hooks (deterministic, hold without asking)

| Rule in the prompt | Code that holds it even if the prompt is ignored |
| --- | --- |
| "You never invent facts" | Only read-only tools exist; a silent source returns a tool error, which the model can only report |
| "Return the brief as structured output. Nothing else." | `outputFormat` + `parseBrief()`; a non-conforming answer never reaches `render.ts` |
| (unstated) never write | `tools: []`, read-only token scopes, no `Write`/`Bash` in `allowedTools` |
| (unstated) never inject markup | `esc()` on every model string in `render.ts`, proven by the escaping test |
| (unstated) never crash on a dead API | `guarded()` turns a thrown error into `{ isError: true }` |

Outside the run, on purpose: the full test suite (at the pull request), the visual check (CI), the human approval (the merge).

## Decisions

- [ADR-001 — In-process read-only tools instead of community MCP servers](decisions/ADR-001-in-process-tools.md)

## Risks

| Risk | Signal | Response |
| --- | --- | --- |
| A source API changes shape | `guarded()` error in the stderr log; the brief's `notes` names the source | Fix the typed view in `sources.ts`; the contract does not move |
| The model pads with plausible text when a window is empty | A brief with confident sentences and no links | Tighten the "never invent" rule; add a test on the sample that every item with a claim carries a link |
| Cost creeps up on busy days | `total_cost_usd` in the result line | Lower `maxTurns`, narrow `GITLAB_PROJECTS` / `JIRA_PROJECTS`, drop the drill-in |
| Painting API blocked in the customer network | "artwork: skipped" in the log, gradient on the page | `BRIEF_ARTWORK_FILE` with a local public-domain image |
| A token with write scope is pasted in | Nothing in code can detect scope | Intent boundary: stop and escalate; use `read_api` / `Calendars.Read` only |

## OPEN

- Whether a second, cheaper model should do the survey turns and the main model only the writing.
- Whether the brief should be posted to Teams or Confluence by a separate, human-triggered step.
