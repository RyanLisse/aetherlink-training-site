# Daily brief agent — lab

You are going to build one agent around the whole AI-native SDLC: an agent
that reads GitLab, Jira, Confluence and the Outlook calendar every morning and
writes a one-page brief. `main` is empty on purpose: templates, a package
skeleton and nothing else. Every step of the lesson leaves one artifact here.

## The steps

| Step | Phase | You write | Proof |
| --- | --- | --- | --- |
| 1 | Plan | `intent.md` | A facilitator accepts the boundary |
| 2 | Plan | `docs/spec.md`, `src/brief.ts`, `sample/brief.sample.json`, `test/schema.test.ts` | `npm test` green on the schema tests |
| 3 | Design | `docs/design.md`, one ADR, `docs/plan.md` | A stranger can follow the plan and name what proves completion |
| 4 | Build | `src/render.ts`, `src/main.ts` | `npm run brief:sample` writes `out/latest.html` |
| 5 | Build | `src/sources.ts`, `src/agent.ts` | `npm test` and `npm run typecheck` green; wiring proven without a network |
| 6 | Test | `docs/evidence.md` and one screenshot | Three commands with exit codes and a reviewer |
| 7 | Deploy | `docs/gate.md`, `gitlab-ci.example.yml` | PASS / FAIL / OPEN with a quoted line |

## How to work

```bash
npm install                 # once, at the start
git switch -c my/<name>     # your own branch from main
```

Work in your branch. When you want to compare your step with the reference, or
catch up, the reference solution is one linear history with a tag per step:

```bash
git diff main step-2-spec --stat          # what step 2 adds
git diff step-2-spec -- docs/spec.md       # your spec against the reference
git checkout step-3-design -- docs/plan.md # copy one reference file into your branch
git log --oneline main..step-7-gate-deploy # the whole route
```

Tags: `step-1-intent`, `step-2-spec`, `step-3-design`, `step-4-build-render`,
`step-5-build-agent`, `step-6-evidence`, `step-7-gate-deploy`. The same commits
are reachable as branches `steps/1-intent` … `steps/7-gate-deploy` for browsing
on GitLab or GitHub.

## Rules

- Sample data only. No credential is typed into a prompt or committed. A blocked
  credential is an access result and goes down as `OPEN`, not as a failure.
- Every claim needs a source, a reproduced check and a reviewer. Anything less is
  a hypothesis and is written as `OPEN`.
- Read `intent.md` and `progress.md` before you change anything; `CLAUDE.md`
  loads them for the agent too.

Put the two source PDFs (the Dia "Tuesday Brief" and "Wednesday Brief") in
`reference/` so step 2 can quote them. They are not part of this repository.
