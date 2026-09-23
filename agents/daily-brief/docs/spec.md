# Spec — Daily brief

Status: `ACCEPTED — 2026-09-15`

Source: the two reference briefs in `reference/`, *The Tuesday Brief — September 1* and *The Wednesday Brief — August 26* (Dia). Every rule below quotes one of them.

## The artifact

One page, read top to bottom, in this order and no other:

1. **Masthead.** A public-domain painting with its caption in small monospace ("A Light on the Sea, Winslow Homer, 1897. oil on canvas"). Over the painting, in yellow serif: an italic "The" and the title "Tuesday Brief". A date rail on the left ("01 SEP 2026"), a time rail on the right ("10:55 AM").
2. **Greeting.** One or two italic sentences about the shape of the day, written from the calendar. Tuesday: "Your calendar is a blank canvas today. Just you, the agents, and a wide-open runway." Wednesday: "Wednesday, and it's just you and a wide-open morning until one call rolls in this afternoon. The good kind of quiet."
3. **Push your work forward.** Exactly one item: a bold imperative title ("Turn the Hetzner deploy runbook into a go/no-go call"), a grey body of two to four sentences that ends with an offer ("I can pull all of it into one prioritized readiness brief."), and a hand-set "Let's do it →" at the right.
4. **Top to-dos.** Two to four items with an empty circle, a bold title naming the artifact ("Finish and merge PR #51, the verify-skill sync"), the source's icon, and a body that says why now ("Your only open PR, ready for review since Aug 31. Codex left two P1s and a P2 unaddressed").
5. **New updates.** Numbered 01, 02: a bold past-tense title with the outcome ("Postgres test-isolation fix merged, with loose ends"), an italic area tag ("Catapulze", "CI/CD"), a body naming who did what and which loose ends remain.
6. **Your day.** Only when the calendar has events: a compact agenda ("2:00p  Ryan / Robbie (Catapulze)"), then one detail block per meeting ("Ryan / Robbie (Catapulze) — 2:00 PM – 3:00 PM. External call over Microsoft Teams with Robbie from Catapulze.") with a "Prep me →" starburst.
7. **Footer.** "Made for you by Dia using your GitHub." or "… using your Linear and Google Calendar." and "With love from Ⓑ Ⓒ Ⓝ Ⓨ". Ours: the brand and the sources that were actually connected, and the sign-off's initials.

## The contract

The contract is `src/brief.ts`; this table is its reading guide. A field not in the table does not exist.

| Field | Type | Rule | Example from the reference |
| --- | --- | --- | --- |
| `greeting` | string | One or two sentences, second person, from the calendar, never a to-do list | "Your calendar is a blank canvas today." |
| `pushForward.title` | string | Imperative, at most nine words, names the artifact | "Close out the admin-image CI fix with Robert" |
| `pushForward.body` | string | Two to four sentences of evidence: who, since when, who waits, why today | "Robert did steps 1 and 2 (the GHCR package access) and asked how to verify it works." |
| `pushForward.offer` | string, optional | One sentence starting "I can …" naming the concrete thing to prepare next | "I can draft the exact verification steps and a reply back to him" |
| `pushForward.link` | `{source, url}`, optional | The artifact's own URL; `source` is one of gitlab, jira, confluence, outlook, github, linear, notion | the PR, the runbook page |
| `todos[]` | 2–4 items, same shape as the push item | Most leverage first, never repeats the push item | "Sandbox-verify the Mollie payment adapter" |
| `updates[]` | 0–6 items, item shape plus `tag` | Past tense, outcome in the title, loose ends in the body; `tag` is the project or area, two words max | "Migration-rollback CI breakage fixed for good" · tag "CI/CD" |
| `day[]` | events: `start` HH:MM, `end` HH:MM optional, `title`, `description` optional, `url` optional, `prep` optional | Every event today, in order; description names the medium and the people in one sentence; `prep` only when the sources reveal something worth reading first | "External call over Microsoft Teams with Robbie from Catapulze." |
| `notes[]` | strings, optional | Honest footnotes only: a source that failed, an empty window, an assumption. Empty when everything worked | (ours; the reference has none) |

Everything the page needs but the model must not decide, the code supplies: the date and time rails, the weekday in the title, the painting and its caption, the footer's source list, the language.

## House style

- Second person, warm and dry. Plain words. No hype, no exclamation marks, no emoji, no bullet lists inside bodies.
- First names for people ("Robert", "Robbie"). Numbers, keys and times as they appear in the sources ("2,602 stale checkpoint rows", "RJC-373", "10:13 this morning").
- The offer is always "I can …", never "you should".
- Titles are imperative; update titles are past tense; the greeting is neither.
- English by default; Dutch when `BRIEF_LANGUAGE=nl`, including the title ("De dinsdagbrief") and the section names.

## What the agent may never do

- Invent a fact. Every sentence traces back to a tool result. A silent source becomes a `notes` line, never a filled gap.
- Write to any system, send the brief anywhere by itself, or hold a token with write scope.
- Decide instead of describe: the brief ranks and explains; the person pushes, merges, answers.
- Put model text on the page unescaped.

## Acceptance examples

| Given | When | Then | Proof |
| --- | --- | --- | --- |
| `sample/brief.sample.json` | parsed with `parseBrief()` | it passes, with three to-dos and a day that starts at 11:00 | `npm test` → *sample brief matches the schema* |
| a brief without `pushForward` | parsed | it is rejected with a message naming `pushForward` | `npm test` → *schema rejects a brief without a push item* |
| the zod schema | turned into JSON schema | draft-07, with exactly greeting, pushForward, todos, updates, day, notes at the top | `npm test` → *json schema is draft-7 …* |
| a greeting containing `<script>` | rendered | the page shows `&lt;script&gt;` and never executes it | `npm test` → *render produces the Dia sections and escapes model text* (step 4) |
| a brief with no events | rendered | the "Your day" section is absent | `npm test` → *render survives an empty day* (step 4) |

## OPEN

- Whether the "Let's do it →" link should open the artifact (current) or hand the offer to Claude Code as a prompt.
- Whether Dutch briefs keep the 12-hour agenda gutter ("2:00p") or switch to 24-hour (current: 24-hour).
- The maximum body length the reader tolerates on a phone; the reference PDFs are desktop prints.
