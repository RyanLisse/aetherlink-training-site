/** Step 5 — the agent. Wiring and prompts are proven without a network or an API key. */
import assert from "node:assert/strict";
import { test } from "node:test";
import { systemPrompt, userPrompt } from "../src/agent.js";
import { buildSources } from "../src/sources.js";

test("sources are enabled purely by environment", () => {
  const none = buildSources({}, "Europe/Amsterdam");
  assert.deepEqual(none.enabled, []);
  const some = buildSources(
    { GITLAB_URL: "https://gitlab.example.com", GITLAB_TOKEN: "x", JIRA_URL: "https://jira.example.com", JIRA_TOKEN: "y", MS_USER: "a@b.c", MS_ACCESS_TOKEN: "t" },
    "Europe/Amsterdam",
  );
  assert.deepEqual(some.enabled, ["gitlab", "jira", "outlook"]);
  assert.deepEqual(some.allowedTools, ["mcp__gitlab__*", "mcp__jira__*", "mcp__outlook__*"]);
  assert.deepEqual(Object.keys(some.servers), ["gitlab", "jira", "outlook"]);
  const personal = buildSources({ GITHUB_TOKEN: "g", LINEAR_API_KEY: "l", NOTION_TOKEN: "n" }, "Europe/Amsterdam");
  assert.deepEqual(personal.enabled, ["github", "linear", "notion"]);
  assert.deepEqual(personal.allowedTools, ["mcp__github__*", "mcp__linear__*", "mcp__notion__*"]);
});

test("prompts carry the day, the language and the connected sources", () => {
  const cfg = { env: {}, model: "m", timeZone: "Europe/Amsterdam", language: "nl" as const, recipient: "Ryan", date: "2026-09-15", weekday: "dinsdag", lookbackHours: 24, maxTurns: 10 };
  const sys = systemPrompt(cfg);
  assert.ok(sys.includes("Ryan's daily brief"));
  assert.ok(sys.includes("write in Dutch"));
  assert.ok(sys.includes("dinsdag 2026-09-15"));
  assert.ok(userPrompt(cfg, ["gitlab"]).includes("gitlab"));
  assert.ok(userPrompt(cfg, []).includes("No sources"));
});
