# Intent — AetherLink training site

Status: `ACTIVE — 2026-09-11`

## Outcome

A participant who opens any day deck can see, on one screen, what the concept is, what to do now, and whether the checkpoint was met. The facilitator can run a day from the same screen without scrolling, and the squad can tell from the footer where they are in the day.

## Success checks

- [x] Every slide fits a 1440×900 presenter screen without scrolling: cards or visual on the left, "Do this now" on the right.
- [x] Steps are checkable and remembered for the tab session; the checkpoint has a "Mark passed" state.
- [x] The footer shows the day as typed segments (practice, concept, review, recap, break, context); each segment jumps to its slide.
- [x] All slide text that participants see is English. Facilitator `notes` may stay Dutch.
- [x] Every concept ships as definition → visual → how we use it in both squads, generated from `concepts.json` (see the concept register below).
- [x] `check_site_dom.cjs` (jsdom, 185 renders) and `check_routes.cjs` pass before every publish.

## Concept register

Every concept ships as three slides, in this order: **definition** (what it is, three cards), **visual** (one diagram with a caption), **how we use it** (where it shows up today and the rule that applies). The register lives in the course repo at `presentations/concepts.json`; `presentations/apply_concepts.py` places the triplets in both squads' decks and regenerates `days.js` and `squad2.js`. Edit the register, never the generated slides.

| Concept | Visual | Squad 1 | Squad 2 |
| --- | --- | --- | --- |
| The bottleneck moved | `bottleneck-bars.svg` | Day 3 | Day 1 |
| intent.md | `intent-md.svg` | Day 1 | Day 1 |
| Evidence rule | `evidence-rule.svg` | Day 1, 2 | Day 2 |
| MOB programming | `mob-programming.svg` | Day 1 | Day 5 |
| AI-native SDLC | `ai-native-sdlc-line-and-loop.png` | Day 3 | Day 1 |
| Agentic loop | `agentic-loop.svg` (+ interactive widget) | Day 4 | Day 3 |
| One contract, two platforms | `one-contract-two-platforms.svg` | Day 4, 5 | Day 4 |
| Human gate | `human-gate.svg` | Day 4 | Day 5 |
| Hooks | `hooks-guardrails.svg` | Day 5 | Day 4 |
| Subagents | `parallel-sessions-subagents.svg` | Day 5 | Day 4 |

The word "harness" is deliberately absent from participant material: the decks say "platform" (n8n, Claude Code). Keep it that way.

## Boundary

- In scope: `dist/` of this repository; canonical slide text lives in the course repo (`presentations/day-decks.json`) and is copied here.
- Out of scope: the participant lab, workbook content, Notion planning pages (updated separately), publishing to Sites (a separate Codex step).
- Stop or escalate when: a gate goes red, slide data must change shape, or a change needs the canonical JSON and the site to diverge.

## Owners

| Role | Name | Responsibility |
| --- | --- | --- |
| Facilitator | Ryan | Runs the decks, owns the concept register |
| Site maintainer | Ryan | Edits `dist/`, keeps gates green, requests publish |
| Reviewer | independent lane | Reads the diff against this file before publish |

## Evidence contract

A UI claim needs a screenshot from the running site (`python3 -m http.server 8080 --directory dist`) at 1440×900 and 390×844, plus the two gate commands with exit codes. A content claim needs the canonical JSON and `days.js` to be byte-equivalent (`JSON.stringify` equality) before the site is published.
