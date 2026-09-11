# Intent — AetherLink training site

Status: `ACTIVE — 2026-09-11`

## Outcome

A participant who opens any day deck can see, on one screen, what the concept is, what to do now, and whether the checkpoint was met. The facilitator can run a day from the same screen without scrolling, and the squad can tell from the footer where they are in the day.

## Success checks

- [x] Every slide fits a 1440×900 presenter screen without scrolling: cards or visual on the left, "Do this now" on the right.
- [x] Steps are checkable and remembered for the tab session; the checkpoint has a "Mark passed" state.
- [x] The footer shows the day as typed segments (practice, concept, review, recap, break, context); each segment jumps to its slide.
- [x] All slide text that participants see is English. Facilitator `notes` may stay Dutch.
- [ ] Every concept slide follows the cadence **definition → visual → how we use it** (see the concept register below).
- [x] `check_site_dom.cjs` (jsdom, 139 renders) and `check_routes.cjs` pass before every publish.

## Concept register

Each concept a squad meets needs three things: a definition slide, a diagram or image, and an explicit "how we use it" step that points at the exercise where it is applied. `OPEN` marks what is still missing.

| Concept | Definition slide | Visual | How we use it |
| --- | --- | --- | --- |
| intent.md | Day 1 · "What is intent.md?" | `robot.png` (mascot, not a diagram) — `OPEN`: replace with a what/why/boundaries diagram | Day 1 · Exercise 1 · capture intent |
| AI-native SDLC | Day 3 · "What is an AI-native SDLC?" | `ai-native-sdlc-loop.svg` | Day 3 · "Point at the loop. Place your ticket." → Exercise 3 · plan the slice |
| Agentic loop | Day 4/5 · "The agentic loop" | interactive widget `agentic-loop` | Day 4 · Individual · n8n ticket 101 |
| One contract, two platforms | Day 4/5 · Concept 2 | `OPEN` — no diagram; compare layout only | Day 4 · same-input comparison |
| MOB programming | Day 1/3 · "MOB programming, made concrete" | `OPEN` | Day 1 · every MOB exercise |
| Human gate | glossary + Day 4 · "Human gate · n8n baseline" | `OPEN` | every gate slide |
| Evidence rule | Day 3 · "Scenario and evidence rule" | `OPEN` | Day 3 · Exercise 4 · reconcile and test |

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
