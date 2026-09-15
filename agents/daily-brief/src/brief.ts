/**
 * The brief contract.
 *
 * This is the single shape that flows through the whole agent:
 *   sources (tools) -> Claude -> `Brief` JSON -> `renderBrief()` -> HTML artifact.
 *
 * The zod schema doubles as the structured-output JSON schema handed to the
 * Agent SDK, so the model can only ever return something we know how to render.
 * Keep it free of length constraints: those live in the prompt (softer, and the
 * structured-output validator does not need them).
 */
import { z } from "zod";

export const SOURCES = ["gitlab", "jira", "confluence", "outlook"] as const;
export type SourceName = (typeof SOURCES)[number];
export const SourceSchema = z.enum(SOURCES);

const LinkSchema = z.object({
  source: SourceSchema.describe("Which system the link points into."),
  url: z.string().describe("Absolute URL of the merge request, issue, page or event."),
});

const ItemSchema = z.object({
  title: z
    .string()
    .describe("Imperative headline, max ~9 words, naming the concrete artifact (MR !142, AL-231, the page title)."),
  body: z
    .string()
    .describe("Two to four plain sentences: what is true right now, who is waiting, why today. No bullet points."),
  link: LinkSchema.optional(),
});

export const BriefSchema = z.object({
  greeting: z
    .string()
    .describe("One or two sentences about the shape of the day, written from the calendar. Warm, dry, specific."),
  pushForward: ItemSchema.extend({
    offer: z
      .string()
      .optional()
      .describe("One sentence starting with 'I can …' naming the concrete thing the agent can prepare next."),
  }).describe("The single highest-leverage thing to do today."),
  todos: z.array(ItemSchema).describe("Two to four open items, most leverage first. Never repeats pushForward."),
  updates: z
    .array(
      ItemSchema.extend({
        tag: z.string().describe("Short area label: the project, team or component. Two words max."),
      }),
    )
    .describe("What changed since the last brief: merged, landed, failed, decided, commented. Past tense titles."),
  day: z
    .array(
      z.object({
        start: z.string().describe("Local start time as HH:MM (24h)."),
        end: z.string().optional().describe("Local end time as HH:MM (24h)."),
        title: z.string().describe("Event title as it appears in the calendar."),
        description: z
          .string()
          .optional()
          .describe("One sentence in plain words: the medium (Teams, room), the people, the purpose."),
        url: z.string().optional().describe("Outlook web link of the event."),
        prep: z
          .string()
          .optional()
          .describe("What to read or decide before this meeting, if the sources reveal something relevant."),
      }),
    )
    .describe("Today's calendar in order. Empty when the calendar is empty or not connected."),
  notes: z
    .array(z.string())
    .optional()
    .describe("Honest footnotes: a source that failed, a window that was empty, an assumption made."),
});

export type Brief = z.infer<typeof BriefSchema>;
export type BriefItem = z.infer<typeof ItemSchema>;

/** JSON schema handed to the SDK's `outputFormat` option. */
export const briefJsonSchema = z.toJSONSchema(BriefSchema, { target: "draft-7" }) as Record<string, unknown>;

/** Parse untrusted model output into a `Brief`, or throw a readable error. */
export const parseBrief = (value: unknown): Brief => {
  const result = BriefSchema.safeParse(value);
  if (result.success) return result.data;
  const issues = result.error.issues.map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`).join("; ");
  throw new Error(`Brief did not match the schema: ${issues}`);
};
