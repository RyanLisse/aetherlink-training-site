# Intent — Daily brief agent

Status: `ACTIVE — 2026-09-15`

## Outcome

Every weekday morning the person opens one page and knows what to push, what is waiting on them, what changed overnight and what the day looks like, without opening GitLab, Jira, Confluence and Outlook first. The page reads like the Dia "Tuesday Brief": warm, specific, one screen, a painting on top. The reading moves to an agent; the judging stays with the person.

## Success checks

- [x] `npm run brief:sample` renders a brief with the five sections (greeting, push, to-dos, updates, day) and the sign-off footer, from sample data, without any credential.
- [x] `npm test` proves the contract: a brief without a push item is rejected, model text is HTML-escaped, the Dutch copy renders, empty sections disappear, sources switch on by environment only.
- [x] The agent has no shell and no file access: `tools: []`, only `mcp__<source>__*` tools, `permissionMode: "dontAsk"`.
- [ ] A live run against one real source produces a brief whose every sentence traces back to a tool result, and whose `notes` name every source that was silent. OPEN until the first run with a real token.
- [ ] The scheduled run (cron or GitLab schedule) writes `out/latest.html` five mornings in a row without a human touching it. OPEN until scheduled.

## Boundary

- In scope: `agents/daily-brief/`; read-only tokens; one HTML file and one JSON file per day.
- Out of scope: writing to any source system, sending the brief anywhere by itself, storing credentials in the repository, any painting that is not public domain.
- The model never invents a fact. When a tool errors or a window is empty, the brief says so in `notes` instead of filling the gap.
- Stop or escalate when: a token with write scope is offered, a source returns personal data the brief does not need, or the brief starts making decisions instead of describing them.

## Owners

| Role | Name | Responsibility |
| --- | --- | --- |
| Reader | the person named in `BRIEF_RECIPIENT` | Reads the brief, decides what to push, files the footnote that repeats |
| Maintainer | Ryan | Owns the contract in `brief.ts`, the prompt in `agent.ts`, the schedule |
| Gate | a second engineer | Reads every pull request against this file before merge |

## Evidence contract

A change to this agent needs: `npm run typecheck` and `npm test` with exit codes, `npm run brief:sample` with a screenshot of `out/latest.html` at 1440×900, and a reviewer who reran one of the three. A claim about a live source needs the stderr log of the run (tool calls, turns, cost) at the cutoff. Anything less is a hypothesis and is written as OPEN.

## OPEN

- Which mailbox and which GitLab projects the first live run reads.
- Whether Jira and Confluence are Cloud or Data Center at the customer (`ATLASSIAN_KIND`).
- Whether the brief is English or Dutch for this team (`BRIEF_LANGUAGE`).
- Who reads the `notes` footnotes in the first week and turns the repeating one into a ticket.
