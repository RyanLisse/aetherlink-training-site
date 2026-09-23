# Evidence — Daily brief agent

Cutoff: `2026-09-15 08:43 UTC`, revision `7c32538` on branch `claude/wonderful-franklin-lyfgwn`, Node `v22.22.2`

Every row is a claim with the command that proves it, the exit code seen and
the person who reran it. A row without a reviewer is a hypothesis. A command
nobody ran is `OPEN`, never a failure and never a pass.

| Claim | Command | Exit code | Output line quoted | Reviewer | Status |
| --- | --- | --- | --- | --- | --- |
| The types hold under strict TypeScript | `npm run typecheck` | 0 | (no output; `tsc --noEmit` is silent on success) | `OPEN — rerun by a participant at 15:05` | run once, not yet reviewed |
| The contract, the renderer and the wiring hold | `npm test` | 0 | `# tests 8` / `# pass 8` / `# fail 0` | `OPEN — rerun by a participant at 15:05` | run once, not yet reviewed |
| The page renders from the sample without a credential | `npm run brief:sample -- --no-artwork` | 0 | `rendered sample brief` and the path `out/brief-2026-09-15.html` | `OPEN — rerun by a participant at 15:05` | run once, not yet reviewed |
| A live source produces sentences that trace back to tool results | `npm run brief` with one real token | `OPEN` | `OPEN` | `OPEN` | not run: no token in this environment |

## Screenshot

`docs/evidence/latest-1440x900.png` — `out/latest.html` at 1440×900, the presenter size the site's gate uses. It shows the masthead with the gradient fallback (the museum APIs were blocked by the sandbox's outbound policy, logged as `artwork: skipped`), the date and time rails, the italic greeting, "Push your work forward" with the hand-set "Let's do it →", the first to-dos with source chips.

## Differences from the reference

- `OPEN` — the reference masthead is a painting; this run shows the gradient fallback because the network policy blocked the museum APIs. With network, or `BRIEF_ARTWORK_FILE`, the painting is inlined.
- `OPEN` — the reference uses the sources' logos next to titles; ours uses text chips (`GITLAB`, `JIRA`) so no brand asset is redistributed.
- `OPEN` — the reference prints "Made for you by Dia"; ours prints the brand from `BRIEF_BRAND` and lists only the sources that were actually connected.
- `OPEN` — body length on a phone was not compared; the reference PDFs are desktop prints.
