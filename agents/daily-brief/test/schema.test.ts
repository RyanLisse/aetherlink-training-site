/** Step 2 — the contract. These tests exist before any renderer or agent code. */
import assert from "node:assert/strict";
import { test } from "node:test";
import { briefJsonSchema, parseBrief } from "../src/brief.js";
import { sample } from "./helpers.js";

test("sample brief matches the schema", async () => {
  const brief = await sample();
  assert.equal(brief.todos.length, 3);
  assert.equal(brief.day[0]?.start, "11:00");
});

test("schema rejects a brief without a push item", () => {
  assert.throws(() => parseBrief({ greeting: "hi", todos: [], updates: [], day: [] }), /pushForward/);
});

test("json schema is draft-7 with the five sections and the notes", () => {
  const props = briefJsonSchema.properties as Record<string, unknown>;
  assert.deepEqual(Object.keys(props).sort(), ["day", "greeting", "notes", "pushForward", "todos", "updates"]);
  assert.ok(String(briefJsonSchema.$schema).includes("draft-07"));
});
