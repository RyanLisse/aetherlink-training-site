# ADR-001 — In-process read-only tools instead of community MCP servers

Status: `ACCEPTED`

Date: `2026-09-15`

Decision owner: Ryan

## Context

The agent must run headless every morning against GitLab, Jira, Confluence and Microsoft Graph, and, for a person walking the lesson alone, against their own GitHub, Linear and Notion. Community MCP servers exist for all four, but the ones for Atlassian and Microsoft 365 assume a browser OAuth flow on first start, their environment variables differ per package and version, and each adds a process and a dependency tree the team does not own. The Claude Agent SDK can host tools in-process with `createSdkMcpServer` + `tool`, and every read the brief needs is a plain token-authenticated GET.

## Decision

Implement the four sources as in-process SDK tools in one file, `src/sources.ts`, each tool a small REST call with a typed view, clipped strings and bounded lists, wrapped in `guarded()`. A source is enabled purely by the presence of its environment variables. External MCP servers remain a drop-in: the `mcp__<source>__*` allow-list does not change.

## Options considered

| Option | Evidence or trade-off | Outcome |
| --- | --- | --- |
| Community MCP servers via `npx` per source | Fastest to try; Atlassian and Microsoft need an interactive OAuth flow; env var names verified only by recall; four extra processes | Rejected for the scheduled run; documented as a swap-in |
| Atlassian's official remote MCP (`mcp.atlassian.com`) | OAuth 2.1 with a browser; no headless path without extra tooling | Rejected for now; revisit when a service-account flow exists |
| In-process SDK tools over REST | Token auth only; one dependency (the SDK); output bounded by our code; testable without a network | Accepted |

## Consequences and rollback

- Positive: headless by construction, read-only by construction, one file to read in the lesson, wiring provable in a unit test.
- Cost or risk: we own four small REST adapters; a vendor API change is our change to make (the risk table in `design.md`).
- Rollback or revisit trigger: a customer already runs an approved MCP gateway for these systems; then replace the matching entry in `buildSources()` with a `{ type: "http", url, headers }` config.

## Evidence and follow-up

- Evidence links: `test/agent.test.ts` → *sources are enabled purely by environment*; `docs/evidence.md`.
- Follow-up owner and due date: Ryan, after the first live run: confirm the Jira Cloud `search/jql` endpoint and the Graph `calendarView` window against a real tenant, or mark `OPEN`.

## Addendum · the personal stack (2026-09-15)

GitHub, Linear and Notion follow the same decision: one in-process server each,
token in an environment variable, every tool read-only and wrapped in
`guarded()`. Two of them cannot be plain GETs by protocol — Linear is GraphQL
and Notion's search is a POST — so "read-only" is held by the query text and
the token scope (Linear personal keys read by default; a Notion internal
integration only sees pages shared with it), not by the HTTP verb. The
allow-list `mcp__<source>__*` and `tools: []` are unchanged.
