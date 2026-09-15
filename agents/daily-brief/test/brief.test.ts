import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { systemPrompt, userPrompt } from "../src/agent.js";
import { briefJsonSchema, parseBrief } from "../src/brief.js";
import { renderBrief, type RenderMeta } from "../src/render.js";
import { buildSources } from "../src/sources.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const sample = async () => parseBrief(JSON.parse(await readFile(path.join(here, "..", "sample", "brief.sample.json"), "utf8")));

const meta: RenderMeta = {
  weekday: "Tuesday",
  dateLabel: "15 SEP 2026",
  timeLabel: "07:30 AM",
  language: "en",
  sources: ["gitlab", "jira", "confluence", "outlook"],
  brand: "AetherLink",
  signoff: "the platform team",
};

test("sample brief matches the schema", async () => {
  const brief = await sample();
  assert.equal(brief.todos.length, 3);
  assert.equal(brief.day[0]?.start, "11:00");
});

test("schema rejects a brief without a push item", () => {
  assert.throws(() => parseBrief({ greeting: "hi", todos: [], updates: [], day: [] }), /pushForward/);
});

test("json schema is draft-7 with the five sections", () => {
  const props = briefJsonSchema.properties as Record<string, unknown>;
  assert.deepEqual(Object.keys(props).sort(), ["day", "greeting", "notes", "pushForward", "todos", "updates"]);
  assert.ok(String(briefJsonSchema.$schema).includes("draft-07"));
});

test("render produces the Dia sections and escapes model text", async () => {
  const brief = await sample();
  const html = renderBrief({ brief: { ...brief, greeting: "<script>alert(1)</script> quiet day" }, meta });
  for (const needle of ["<title>The Tuesday Brief</title>", "Push your work forward", "Top to-dos", "New updates", "Your day", "Let&#39;s<br>do it&nbsp;", "Prep<br>me&nbsp;", "15 SEP 2026", "using <i>your</i>"]) {
    assert.ok(html.includes(needle), `missing ${needle}`);
  }
  assert.ok(html.includes("&lt;script&gt;"), "model text must be escaped");
  assert.ok(!html.includes("<script>alert"), "raw script must never reach the page");
  assert.ok(html.includes("2:00p"), "agenda gutter uses compact 12h time in English");
  assert.ok(html.includes("2:00 PM – 3:00 PM"));
});

test("render speaks Dutch when asked", async () => {
  const html = renderBrief({ brief: await sample(), meta: { ...meta, language: "nl", weekday: "dinsdag", timeLabel: "07:30" } });
  assert.ok(html.includes("<title>De dinsdagbrief</title>"));
  assert.ok(html.includes("Zet je werk vooruit"));
  assert.ok(html.includes("14:00 – 15:00"));
});

test("render survives an empty day and no artwork", async () => {
  const brief = await sample();
  const html = renderBrief({ brief: { ...brief, day: [], updates: [] }, meta: { ...meta, sources: ["gitlab"] } });
  assert.ok(!html.includes("Your day"));
  assert.ok(!html.includes("New updates"));
  assert.ok(html.includes("painting-empty"));
  assert.ok(html.includes("<span class=\"src\">GitLab</span>."));
});

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
