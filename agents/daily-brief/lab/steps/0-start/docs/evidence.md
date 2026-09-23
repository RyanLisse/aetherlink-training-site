# Evidence — Daily brief agent

Cutoff: `TEMPLATE — YYYY-MM-DD HH:MM TZ, revision`

Every row is a claim with the command that proves it, the exit code you saw and
the person who reran it. A row without a reviewer is a hypothesis. A command
nobody ran is `OPEN`, never a failure and never a pass.

| Claim | Command | Exit code | Output line quoted | Reviewer | Status |
| --- | --- | --- | --- | --- | --- |
| `TEMPLATE — the types hold` | `npm run typecheck` | `OPEN` | `OPEN` | `TEMPLATE` | `OPEN` |
| `TEMPLATE — the contract holds` | `npm test` | `OPEN` | `OPEN` | `TEMPLATE` | `OPEN` |
| `TEMPLATE — the page renders` | `npm run brief:sample` | `OPEN` | `OPEN` | `TEMPLATE` | `OPEN` |

## Screenshot

`TEMPLATE — path under docs/evidence/, viewport size, what it shows and what differs from the reference PDFs.`

## Differences from the reference

- `OPEN — one difference per line; a difference is an observation, not a failure.`
