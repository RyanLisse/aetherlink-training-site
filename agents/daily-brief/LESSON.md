# Guided lesson — the daily brief agent, seven steps around the AI-native SDLC

One day, 10:00–16:00, lunch 12:00–13:00, breaks 11:20 and 14:15. One working
agent is built step by step in a lab repository that starts empty: intent,
spec and contract, design and plan, render, the loop, evidence, gate. Every
step leaves a document or a file a participant can point at, and the reference
solution for every step is one `git diff` away. The deck is the site's
`?lesson=daily-brief` presentation; this file is the facilitator guide behind
the "Day guide" button.

## Outcome

Everyone has written an accepted `intent.md`, turned two reference PDFs into a
spec and a zod contract test-first, planned in read-only mode, rendered the
sample, taken the agent's loop and tools from the reference, added one
read-only tool, recorded evidence with a reviewer, and decided a pull request
against `intent.md`.

## The lab repository

Build it once from this folder and push it to a repository participants can
clone ("Use this template" on GitHub, or a plain GitLab project):

```bash
agents/daily-brief/lab/build-lab.sh /tmp/aetherlink-daily-brief-lab
cd /tmp/aetherlink-daily-brief-lab
git remote add origin <your lab remote>
git push -u origin --all --tags
```

What that produces:

| Ref | Holds |
| --- | --- |
| `main` | Step 0: `README.md`, `CLAUDE.md`, `AGENTS.md`, template `intent.md`, `progress.md`, empty templates in `docs/`, the package skeleton. Participants branch from here. |
| `solution` | One linear history on top of `main`, one commit per step. |
| `step-1-intent` … `step-7-gate-deploy` | A tag per step commit. `steps/1-intent` … `steps/7-gate-deploy` are the same commits as branches, for browsing. |

The agent in `agents/daily-brief` is the single source of truth; the script
copies code, tests, sample and the filled documents from there. Re-run it after
any change and push with `--force-with-lease --all --tags`.

Participants use three commands all day:

```bash
git diff main step-2-spec --stat            # what a step adds
git diff step-2-spec -- docs/spec.md         # my file against the reference
git checkout step-5-build-agent -- src/sources.ts   # take one reference file (the deliberate catch-up in step 5)
```

Why one linear history with tags instead of a branch per step: a fix in step 2
lands once and every later tag inherits it on the next rebuild; a branch per
step would need the same fix replayed six times. The branches `steps/N-…` exist
only as pointers for people who browse on the web.

## Before the session

| Check | Command | Expected |
| --- | --- | --- |
| Node 20 or newer | `node --version` | `v20` or higher |
| The lab builds | `agents/daily-brief/lab/build-lab.sh /tmp/lab-check` | the decorated log with eight commits |
| Every step is green | see "Verifying the lab" below | typecheck and tests pass at steps 2, 4, 5 and 7 |
| The sample renders | `npm run brief:sample` in the agent folder | prints the path of `out/brief-YYYY-MM-DD.html` |
| The two PDFs | `reference/` in each participant's clone | *The Tuesday Brief — September 1*, *The Wednesday Brief — August 26* |

No participant needs a credential. The trainer demo at 14:30 needs either a
sandbox token for one source or a saved stderr log of an earlier live run. To
save one: `npm run brief 2> demo.log`. To replay it slowly:
`while read -r l; do echo "$l"; sleep 1; done < demo.log`.

### Verifying the lab

```bash
cd /tmp/aetherlink-daily-brief-lab
for tag in step-2-spec step-4-build-render step-5-build-agent step-7-gate-deploy; do
  git checkout -q "$tag" && npm ci --silent && npm run typecheck && npm test
done
git checkout -q main
```

## Route

| Time | Block | Step | Artifact | Human check |
| --- | --- | --- | --- | --- |
| 10:00 | Welcome | — | The finished brief, then the empty lab | Everyone can say what the agent produces and what it may never touch |
| 10:15 | Concept: AI-native SDLC (definition, visual, how we use it) | all | Quality, security, traceability placed on a file each | No step without a human decision |
| 10:35 | Demo: read `intent.md` | 1 | Template and filled intent side by side | Nobody treats OPEN as decided |
| 10:45 | Individual: write the intent | 1 | `intent.md` on `my/<name>` | Three checks a fresh reader can verify |
| 11:00 | Gate: accept the boundary | 1 | ACCEPTED / NEEDS REVISION with a quoted line | No step 2 on a NEEDS REVISION intent |
| 11:10 | Concept: the spec quotes the reference, the contract is code | 2 | Three `describe()` lines matched to spec rows | Schema, not prompt, is the contract |
| 11:20 | Break | | | |
| 11:35 | Individual: spec and contract, test first | 2 | `docs/spec.md`, `src/brief.ts`, sample, schema tests | The commit shows the test before `brief.ts` |
| 12:00 | Lunch | | | |
| 13:00 | Concept: design, one decision, a plan with proof | 3 | Parts table, ADR options, proof command for step 4 | Everyone can name the gate before the build |
| 13:10 | Individual: plan before acting | 3 | `docs/plan.md`, one ADR, accepted by the facilitator | A stranger can name what proves each step |
| 13:25 | Demo: render the sample | 4 | `out/latest.html` next to the PDF | Why the renderer needs no API key |
| 13:35 | Individual: run it, change one rule, prove it | 4 | `render.ts`, sample-only `main.ts`, one rule changed test-first, a screenshot | The commit shows the test before the renderer |
| 14:00 | Concept: the loop inside `query()` | 5 | `agent.ts` options classified as bound, watch, interrupt | No approval prompt inside the scheduled run |
| 14:15 | Break | | | |
| 14:30 | Trainer demo: one run, read the transcript | 5 | Tool calls named gather, act, verify | What happens on a schema miss |
| 14:40 | Individual: add one read-only tool | 5 | Reference files taken from the tag, plus one tool with a wiring test | No more access than the question needs |
| 15:00 | Concept: hooks | — | `tools: []`, `guarded()`, `esc()` on the board | The prompt is not what prevents a write |
| 15:05 | Individual: record the evidence | 6 | `docs/evidence.md`, the screenshot, a reviewer | No row claims an unrun command |
| 15:20 | Gate: the pull request | 7 | `docs/gate.md`: PASS / FAIL / OPEN, quoted line, handoff | No PASS rests on an unread check |
| 15:35 | Concept: deploy and maintain | — | The schedule and one footnote | Deploy is a schedule and a file |
| 15:40 | MOB transfer | next 1 | Intent, source, scope, owner, human decision | No access promised that nobody can grant |
| 15:50 | Recap and close | — | Seven sentences, each with a file; `progress.md` updated | Every uncertainty sourced or OPEN |

## The four concepts, mapped onto this agent

| Concept | Where it lives |
| --- | --- |
| AI-native SDLC (the loop) | `intent.md` → `docs/spec.md` + `brief.ts` → `docs/design.md` + ADR + `docs/plan.md` → `render.ts` → `sources.ts` + `agent.ts` → `docs/evidence.md` → `docs/gate.md` + schedule → `notes` footnote → tomorrow's run |
| Agentic loop (gather, act, verify) | One `query()` in `agent.ts`: parallel survey calls, drill-in on at most four items, schema validation by the SDK and `parseBrief()` |
| Hooks (deterministic layer) | `tools: []` and read-only scopes, `guarded()` around every tool, `esc()` on every model string; the table in `docs/design.md` |
| Human gate | Three today: the accepted intent (11:00), the accepted plan (13:25), the pull request read against `intent.md` (15:20). `permissionMode: "dontAsk"` keeps the human out of the cron job on purpose |

## Exercises

Every exercise is individual, timed, and ends with a commit on `my/<name>`.
Unrun checks are OPEN, never failures. Credentials are never typed into a
prompt. Claude Code drafts; the participant cuts and decides.

**10:45 Step 1, write the intent (15 min).** The interview prompt on the slide
asks one question at a time and fills `intent.md` in place. Cut it to one
outcome and three verifiable checks; every unknown is an OPEN line.

**11:35 Step 2, spec and contract, test first (25 min).** `docs/spec.md` with a
quoted PDF example per field, then `test/schema.test.ts` red, then `brief.ts`
and the sample green. No renderer, no tools. Compare with
`git diff step-2-spec --stat` and name one difference.

**13:10 Step 3, plan before acting (15 min).** Read-only plan mode. `docs/plan.md`
with paths, a proof command per step, rollback and the gate before the build;
one ADR for one real decision. The facilitator accepts the plan before 13:25.

**13:35 Step 4, run it, change one rule, prove it (25 min).** Render test red,
`render.ts` and a sample-only `main.ts`, `npm run brief:sample`, the page next
to the PDF, one house-style rule changed test-first, a 1440×900 screenshot
kept for step 6. Stuck: `git checkout step-4-build-render -- src/render.ts`
and read the diff.

**14:40 Step 5, add one read-only tool (20 min).** First take the four reference
files from `step-5-build-agent`; that is the deliberate catch-up moment. Then
one tool in `sources.ts` following `tool()` + `guarded()`, a wiring test, no
write access, allow-list unchanged.

**15:05 Step 6, record the evidence (15 min).** Three commands with exit codes
and a quoted output line, the screenshot under `docs/evidence/`, a neighbour
reruns one command and signs. Differences from the PDFs are OPEN.

## The gates

- **11:00, the boundary.** Pairs swap intents, quote one safe line and one
  guess; the facilitator accepts or marks needs revision. No spec before that.
- **13:25, the plan.** The facilitator accepts each plan before the build.
- **15:20, the pull request.** Read the checks first and say what each one
  observed; none is an approval. Read the diff against `intent.md`; decide
  PASS / FAIL / OPEN with one quoted line in `docs/gate.md`, and fill the
  handoff block. "Not run against a real source" is an honest OPEN.

## Materials

- `agents/daily-brief/` — the agent, its sample, its tests, its documents under `docs/`
- `agents/daily-brief/lab/` — the empty templates and the lab builder
- `dist/assets/daily-brief-on-the-loop.svg` — the visual at 10:25
- The two source PDFs — the style the renderer reproduces and the source every spec line quotes
- The pull request that added the agent to the site — a worked gate for 15:20
