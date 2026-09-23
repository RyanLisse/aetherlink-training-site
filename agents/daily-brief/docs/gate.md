# Gate — Daily brief agent

Pull request: [RyanLisse/aetherlink-training-site#7](https://github.com/RyanLisse/aetherlink-training-site/pull/7), branch `claude/wonderful-franklin-lyfgwn`

Read against: `intent.md` at revision `7c32538`

## What the automated checks observed

| Check | Observed | Is it an approval? |
| --- | --- | --- |
| `visual-check` (GitHub Actions, `work/shoot.js`) | Rendered every slide of every deck at three viewport sizes and looked for console errors, missing templates, overflow and small tap targets. It does not run the agent's tests. | No |
| CodeRabbit | Posted that draft pull requests are not reviewed automatically. It read nothing. | No |
| Local, before the push | `npm run typecheck` exit 0, `npm test` 8 of 8, `npm run brief:sample` exit 0 (see `docs/evidence.md`) | No: the author ran them; nobody reran them yet |

## What the human read

- Success check proven by this diff: `npm run brief:sample renders a brief with the five sections … from sample data, without any credential` and `npm test proves the contract` and `The agent has no shell and no file access: tools: [], only mcp__<source>__* tools, permissionMode: "dontAsk"` — the first three boxes in `intent.md`.
- Boundary touched by this diff: `NONE` — no token, no write scope, no delivery step; the painting comes from public-domain collections and is inlined.
- Line from the diff that decided it: `tools: [],` in `src/agent.ts`, and `assert.ok(!html.includes("<script>alert"), "raw script must never reach the page");` in `test/render.test.ts`.

## Decision

`OPEN` — the diff proves the three sample-data checks and touches no boundary, but the two live checks in `intent.md` (`a live run against one real source`, `five mornings in a row on a schedule`) have not run, and no second engineer has reread the three commands. The gate owner named in `intent.md` decides PASS after one live run with a read-only token; until then this is an honest OPEN, not a FAIL.

## Handoff

- Receiver: the gate owner from `intent.md` (a second engineer)
- Start from: branch `claude/wonderful-franklin-lyfgwn`, revision `7c32538`, `cd agents/daily-brief && npm ci`
- Run: `npm run typecheck && npm test && npm run brief:sample -- --no-artwork`
- Compare: three exit codes of 0 and `# pass 8`; `out/latest.html` opens next to the Tuesday PDF with the same section order. Known limitation: the painting needs outbound network or `BRIEF_ARTWORK_FILE`.
- Open work: first live run on one source with a `read_api` token — owner Ryan — due before the schedule is enabled — stop if the token offered has write scope.

Do not treat this record, an agent claim or historical output as fresh evidence.
