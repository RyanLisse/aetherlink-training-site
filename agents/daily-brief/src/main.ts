/**
 * CLI entry point.
 *
 *   npm run brief                 # live: survey the sources, write out/brief-YYYY-MM-DD.html
 *   npm run brief -- --sample     # dry run: render sample/brief.sample.json, no API calls
 *   npm run brief -- --date 2026-09-15 --no-artwork --out /srv/briefs
 *
 * Exit code 0 with the HTML path on stdout; non-zero with the reason on stderr.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { generateBrief, type AgentConfig } from "./agent.js";
import { pickArtwork } from "./artwork.js";
import { parseBrief, SOURCES, type Brief, type SourceName } from "./brief.js";
import { renderBrief, type Language, type RenderMeta } from "./render.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const log = (line: string): void => void process.stderr.write(`${line}\n`);

/* ---------- arguments & configuration ---------- */

type Args = { sample: boolean; artwork: boolean; date?: string; out?: string };

const parseArgs = (argv: readonly string[]): Args =>
  argv.reduce<Args>(
    (acc, arg, i) => {
      const next = argv[i + 1];
      if (arg === "--sample") return { ...acc, sample: true };
      if (arg === "--no-artwork") return { ...acc, artwork: false };
      if (arg === "--date" && next !== undefined) return { ...acc, date: next };
      if (arg === "--out" && next !== undefined) return { ...acc, out: next };
      return acc;
    },
    { sample: false, artwork: true },
  );

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
  const weekdayIndex = new Date(`${ymd}T12:00:00Z`).getUTCDay();
  return { ymd, weekday, dateLabel, timeLabel, isMonday: weekdayIndex === 1 };
};

/* ---------- run ---------- */

const main = async (): Promise<void> => {
  const args = parseArgs(process.argv.slice(2));
  const env = process.env;
  const timeZone = env.BRIEF_TIMEZONE ?? "Europe/Amsterdam";
  const language = asLanguage(env.BRIEF_LANGUAGE);
  const now = args.date ? new Date(`${args.date}T08:00:00`) : new Date();
  const cal = calendar(now, timeZone, language);
  const outDir = path.resolve(args.out ?? env.BRIEF_OUT_DIR ?? path.join(here, "..", "out"));

  const cfg: AgentConfig = {
    env,
    model: env.BRIEF_MODEL ?? "claude-opus-5",
    timeZone,
    language,
    recipient: env.BRIEF_RECIPIENT ?? "you",
    date: cal.ymd,
    weekday: cal.weekday,
    lookbackHours: Number(env.BRIEF_LOOKBACK_HOURS ?? (cal.isMonday ? 72 : 24)),
    maxTurns: Number(env.BRIEF_MAX_TURNS ?? 40),
    log,
  };

  const run = args.sample
    ? { brief: await readSample(), sources: [...SOURCES] as SourceName[], costUsd: 0, turns: 0, durationMs: 0 }
    : await generateBrief(cfg);

  const artwork = args.artwork && env.BRIEF_ARTWORK !== "off" ? await pickArtwork(cal.ymd, log) : undefined;

  const meta: RenderMeta = {
    weekday: cal.weekday,
    dateLabel: cal.dateLabel,
    timeLabel: cal.timeLabel,
    language,
    sources: run.sources,
    brand: env.BRIEF_BRAND ?? "AetherLink",
    signoff: env.BRIEF_SIGNOFF ?? "Aether Link",
    ...(artwork ? { artwork } : {}),
  };

  const html = renderBrief({ brief: run.brief, meta });
  await mkdir(outDir, { recursive: true });
  const htmlPath = path.join(outDir, `brief-${cal.ymd}.html`);
  await Promise.all([
    writeFile(htmlPath, html, "utf8"),
    writeFile(path.join(outDir, "latest.html"), html, "utf8"),
    writeFile(path.join(outDir, `brief-${cal.ymd}.json`), JSON.stringify(run.brief, null, 2), "utf8"),
  ]);

  log(args.sample ? "rendered sample brief" : `agent done: ${run.turns} turns, ${(run.durationMs / 1000).toFixed(0)}s, $${run.costUsd.toFixed(2)}`);
  process.stdout.write(`${htmlPath}\n`);
};

const readSample = async (): Promise<Brief> =>
  parseBrief(JSON.parse(await readFile(path.join(here, "..", "sample", "brief.sample.json"), "utf8")));

main().catch((e: unknown) => {
  log(`daily-brief failed: ${e instanceof Error ? e.stack ?? e.message : String(e)}`);
  process.exit(1);
});
