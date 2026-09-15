# Plan — Daily brief agent

Status: `ACCEPTED — 2026-09-15`

Smallest complete slice: the sample brief rendered to `out/latest.html` from `sample/brief.sample.json`, with no credential and no model call. Everything after that adds a source of truth behind the same page.

## Ordered steps

| # | Step | Files | Proof command | Expected | Risk |
| --- | --- | --- | --- | --- | --- |
| 1 | Write the intent | `intent.md` | a facilitator reads it | boundary accepted; unknowns as OPEN | scope creep into "send it to Teams" |
| 2 | Turn the reference into a spec and a contract | `docs/spec.md`, `src/brief.ts`, `sample/brief.sample.json`, `test/schema.test.ts` | `npm test` | 3 passing schema tests | a field the reference does not justify |
| 3 | Decide the shape and write this plan | `docs/design.md`, `docs/decisions/ADR-001-in-process-tools.md`, `docs/plan.md` | a stranger reads the plan | they can name what proves completion | designing for a live source before the slice renders |
| 4 | Render the sample | `src/render.ts`, `src/artwork.ts`, `src/main.ts` (sample-only), `test/render.test.ts` | `npm run brief:sample` and `npm test` | `out/latest.html` exists; 6 passing tests | model text reaching the page unescaped |
| 5 | Add the sources and the loop | `src/sources.ts`, `src/agent.ts`, `src/main.ts`, `test/agent.test.ts` | `npm test` and `npm run typecheck` | 8 passing tests, exit 0 | a tool with more access than its question |
| 6 | Record the evidence | `docs/evidence.md`, `docs/evidence/*.png` | the three commands, rerun by a reviewer | every row has an exit code and a name | a row nobody ran |
| 7 | Gate and schedule | `docs/gate.md`, `gitlab-ci.example.yml` | the pull request read against `intent.md` | PASS / FAIL / OPEN with a quoted line | a PASS on a green check nobody read |

## Rollback

Each step is one commit on its own. Reverting step N leaves steps below it working: the renderer does not need the agent, the contract does not need the renderer, the intent needs nothing. A live-source problem in step 5 is rolled back by unsetting that source's environment variables; the brief then names the source in `notes`.

## Human gate

- Before step 2: the facilitator accepts `intent.md` or marks it `needs revision`. No spec work before that.
- Before step 4: the facilitator accepts this plan. No build before that.
- Before step 7's schedule: the gate owner reads the pull request against `intent.md` and decides PASS / FAIL / OPEN with one quoted line. The schedule starts only after a PASS.

## Evidence log outline

| Claim | Command | Exit code | Reviewer | Status |
| --- | --- | --- | --- | --- |
| The types hold | `npm run typecheck` | OPEN | | OPEN |
| The contract and the wiring hold | `npm test` | OPEN | | OPEN |
| The page renders from the sample | `npm run brief:sample` | OPEN | | OPEN |
| The page matches the reference at 1440×900 | screenshot | OPEN | | OPEN |
| A live source produces traceable sentences | `npm run brief` with one token | OPEN | | OPEN |
