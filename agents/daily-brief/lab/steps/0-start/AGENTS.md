# Contribution instructions

1. Read [intent.md](intent.md) and [progress.md](progress.md) before changing anything. Follow the step order in the README; do not skip to the code before the document of that step exists.
2. Verify the current state with the relevant command. Do not invent evidence, exit codes, screenshots or run results. Quote actual output; mark unrun checks `OPEN`.
3. The agent you build is read-only by construction: no built-in tools, only the source tools you define, no write scope on any token. Never widen that.
4. Never put a credential, a token or private company data in this repository, a prompt or a document. Sample data lives in `sample/`.
5. Work test-first inside a step: the assertion exists and fails before the code that satisfies it.
6. Treat the phases as a loop: when evidence changes the intent, the spec or the plan, go back and change that document before continuing.
7. Before reporting a step complete, update `progress.md` with what was verified, what is `OPEN`, and who reran the check.
