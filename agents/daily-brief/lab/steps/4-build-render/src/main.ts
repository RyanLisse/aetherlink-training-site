/**
 * Step 4 — the first end-to-end slice: sample JSON -> HTML, no agent yet.
 *
 *   npm run brief:sample          # renders sample/brief.sample.json to out/latest.html
 *
 * Step 5 replaces this file with the full CLI that also runs the agent.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { pickArtwork } from "./artwork.js";
import { parseBrief, SOURCES, type SourceName } from "./brief.js";
import { renderBrief, type Language, type RenderMeta } from "./render.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const log = (line: string): void => void process.stderr.write(`${line}\n`);

const asLanguage = (v: string | undefined): Language => (v === "nl" ? "nl" : "en");

/** Calendar parts of `now` in a zone: YYYY-MM-DD, localised weekday, date rail and time rail. */
const calendar = (now: Date, timeZone: string, language: Language) => {
  const locale = language === "nl" ? "nl-NL" : "en-US";
  const ymd = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
  const weekdayRaw = new Intl.DateTimeFormat(locale, { timeZone, weekday: "long" }).format(now);
  const weekday = language === "nl" ? weekdayRaw : weekdayRaw.charAt(0).toUpperCase() + weekdayRaw.slice(1);
  const parts = new Intl.DateTimeFormat("en-US", { timeZone, day: "2-digit", month: "short", year: "numeric" }).formatToParts(now);
  const p = (t: string): string => parts.find((x) => x.type === t)?.value ?? "";
  const dateLabel = `${p("day")} ${p("month").toUpperCase().replace(".", "")} ${p("year")}`;
  const timeLabel = new Intl.DateTimeFormat(locale, { timeZone, hour: "2-digit", minute: "2-digit", hour12: language === "en" }).format(now);
  return { ymd, weekday, dateLabel, timeLabel };
};

const main = async (): Promise<void> => {
  const env = process.env;
  const timeZone = env.BRIEF_TIMEZONE ?? "Europe/Amsterdam";
  const language = asLanguage(env.BRIEF_LANGUAGE);
  const cal = calendar(new Date(), timeZone, language);
  const outDir = path.resolve(env.BRIEF_OUT_DIR ?? path.join(here, "..", "out"));

  const brief = parseBrief(JSON.parse(await readFile(path.join(here, "..", "sample", "brief.sample.json"), "utf8")));
  const artwork = env.BRIEF_ARTWORK === "off" || process.argv.includes("--no-artwork") ? undefined : await pickArtwork(cal.ymd, log);

  const meta: RenderMeta = {
    weekday: cal.weekday,
    dateLabel: cal.dateLabel,
    timeLabel: cal.timeLabel,
    language,
    sources: [...SOURCES] as SourceName[],
    brand: env.BRIEF_BRAND ?? "AetherLink",
    signoff: env.BRIEF_SIGNOFF ?? "Aether Link",
    ...(artwork ? { artwork } : {}),
  };

  const html = renderBrief({ brief, meta });
  await mkdir(outDir, { recursive: true });
  const htmlPath = path.join(outDir, `brief-${cal.ymd}.html`);
  await Promise.all([writeFile(htmlPath, html, "utf8"), writeFile(path.join(outDir, "latest.html"), html, "utf8")]);
  log("rendered sample brief");
  process.stdout.write(`${htmlPath}\n`);
};

main().catch((e: unknown) => {
  log(`daily-brief failed: ${e instanceof Error ? e.stack ?? e.message : String(e)}`);
  process.exit(1);
});
