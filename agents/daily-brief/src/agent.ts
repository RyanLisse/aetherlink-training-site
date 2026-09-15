/**
 * The agent: one `query()` call with the Claude Agent SDK.
 *
 * - No built-in tools (`tools: []`): the model can only read through the
 *   source MCP servers, so a scheduled run can never touch the filesystem or
 *   shell. Rendering happens in our code, after the model is done.
 * - Structured output: the model must return a `Brief` (see brief.ts); the SDK
 *   validates against the JSON schema and retries on its own.
 * - The editorial rules below are the reverse-engineered house style of the
 *   Dia briefs: one push, a few to-dos, updates in past tense, the day, an
 *   honest footnote when a source is silent.
 */
import { query, type Options, type SDKMessage } from "@anthropic-ai/claude-agent-sdk";
import { briefJsonSchema, parseBrief, type Brief, type SourceName } from "./brief.js";
import type { Language } from "./render.js";
import { buildSources, type Env } from "./sources.js";

export type AgentConfig = {
  env: Env;
  model: string;
  timeZone: string;
  language: Language;
  /** First name of the person the brief is for. */
  recipient: string;
  /** Calendar day the brief is about, YYYY-MM-DD in `timeZone`. */
  date: string;
  /** Long weekday name, already localised ("Tuesday"). */
  weekday: string;
  /** Hours of history to survey. 24 on most days, 72 after a weekend. */
  lookbackHours: number;
  maxTurns: number;
  /** Optional progress sink (stderr by default). */
  log?: (line: string) => void;
};

export type AgentResult = {
  brief: Brief;
  sources: SourceName[];
  costUsd: number;
  turns: number;
  durationMs: number;
};

const LANGUAGE_NAME: Record<Language, string> = { en: "English", nl: "Dutch" };

export const systemPrompt = (cfg: AgentConfig): string => `You write ${cfg.recipient}'s daily brief: a calm, one-page morning read that tells them what to push, what is waiting, what changed, and what the day looks like.

You have read-only tools into their work systems. You never invent facts: every sentence must trace back to something a tool returned (a merge request, an issue, a page, a calendar event). If a tool errors or a window is empty, say so in \`notes\` instead of filling the gap.

## Method
1. Survey first, in parallel: to-dos, open merge requests, open issues, recent activity, recent pages, and today's calendar. Use a look-back of ${cfg.lookbackHours} hours.
2. Drill into at most four items whose state decides the ranking (an MR with unresolved threads, an issue with a fresh comment, a page that changed a decision).
3. Rank by leverage: what unblocks other people, what is close to done, what is failing right now, what has a deadline.
4. Return the brief as structured output. Nothing else.

## House style (write in ${LANGUAGE_NAME[cfg.language]})
- Second person, warm and dry. Plain words, no hype, no exclamation marks, no emoji, no bullet lists inside bodies.
- Name the artifact in the title: "Finish and merge MR !142, the verify-skill sync", "Sandbox-verify the Mollie payment adapter", "Fix the failing verification pipeline". Titles are imperative, at most nine words.
- Bodies are two to four sentences of evidence: who did what, since when, who is waiting, why today. Quote numbers, keys, names and times as they appear in the sources. First names for people.
- \`greeting\`: one or two sentences about the shape of the day, written from the calendar ("Your calendar is a blank canvas today. Just you, the agents, and a wide-open runway." / "Wednesday, and it's just you and a wide-open morning until one call rolls in this afternoon. The good kind of quiet."). Never a to-do list.
- \`pushForward\`: the single highest-leverage item. End with \`offer\`: one sentence starting with "I can …" naming the concrete thing you could prepare next (a readiness brief, verification steps and a reply, a decision memo).
- \`todos\`: two to four items, most leverage first, never the push item. Each has a link when the source has one.
- \`updates\`: what changed since the last brief, past tense, outcome in the title ("Migration-rollback CI breakage fixed for good", "Postgres test-isolation fix merged, with loose ends"), \`tag\` is the project or area. Mention loose ends the change left behind. Zero to six items.
- \`day\`: every calendar event today with HH:MM local times (${cfg.timeZone}); \`description\` names the medium and the people in one sentence; add \`prep\` only when the sources reveal something worth reading before it. Empty if the calendar is empty or not connected.
- \`notes\`: honest footnotes only. Empty when everything worked.

Today is ${cfg.weekday} ${cfg.date} (${cfg.timeZone}).`;

export const userPrompt = (cfg: AgentConfig, enabled: readonly SourceName[]): string =>
  enabled.length === 0
    ? "No sources are connected. Return a brief whose greeting says so plainly, with an empty day and a single note explaining which environment variables are missing."
    : `Connected sources: ${enabled.join(", ")}. Survey them, drill in where the ranking depends on it, and return today's brief.`;

const describeTurn = (m: SDKMessage): string | undefined => {
  if (m.type === "system" && m.subtype === "init") {
    const servers = m.mcp_servers.map((s) => `${s.name}:${s.status}`).join(" ");
    return `session ${m.session_id} model=${m.model} mcp=[${servers}]`;
  }
  if (m.type === "assistant") {
    const content = (m.message as { content?: Array<{ type: string; name?: string; input?: unknown }> }).content ?? [];
    const calls = content.filter((c) => c.type === "tool_use").map((c) => `${c.name}(${JSON.stringify(c.input ?? {})})`);
    return calls.length ? `→ ${calls.join(", ")}` : undefined;
  }
  return undefined;
};

/** Run the agent once and return a validated brief. Throws on any non-success result. */
export const generateBrief = async (cfg: AgentConfig): Promise<AgentResult> => {
  const log = cfg.log ?? ((line: string) => process.stderr.write(`${line}\n`));
  const sources = buildSources(cfg.env, cfg.timeZone);
  log(`sources: ${sources.enabled.join(", ") || "none"}`);

  const options: Options = {
    model: cfg.model,
    systemPrompt: { type: "custom", prompt: systemPrompt(cfg) },
    tools: [],
    mcpServers: sources.servers,
    allowedTools: sources.allowedTools,
    permissionMode: "dontAsk",
    settingSources: [],
    maxTurns: cfg.maxTurns,
    effort: "high",
    outputFormat: { type: "json_schema", schema: briefJsonSchema },
  };

  const started = Date.now();
  for await (const message of query({ prompt: userPrompt(cfg, sources.enabled), options })) {
    const line = describeTurn(message);
    if (line) log(line);
    if (message.type !== "result") continue;
    if (message.subtype !== "success") {
      throw new Error(`Agent stopped with ${message.subtype} after ${message.num_turns} turns ($${message.total_cost_usd.toFixed(2)})`);
    }
    return {
      brief: parseBrief(message.structured_output),
      sources: sources.enabled,
      costUsd: message.total_cost_usd,
      turns: message.num_turns,
      durationMs: Date.now() - started,
    };
  }
  throw new Error("Agent ended without a result message");
};
