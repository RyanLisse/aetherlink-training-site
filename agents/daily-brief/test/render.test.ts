/** Step 4 — the renderer. Pure function, so every case is a string check. */
import assert from "node:assert/strict";
import { test } from "node:test";
import { renderBrief, type RenderMeta } from "../src/render.js";
import { sample } from "./helpers.js";

const meta: RenderMeta = {
  weekday: "Tuesday",
  dateLabel: "15 SEP 2026",
  timeLabel: "07:30 AM",
  language: "en",
  sources: ["gitlab", "jira", "confluence", "outlook"],
  brand: "AetherLink",
  signoff: "Aether Link",
};

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
  assert.ok(html.includes('<span class="src">GitLab</span>.'));
});
