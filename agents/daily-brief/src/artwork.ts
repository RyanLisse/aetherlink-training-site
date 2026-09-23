/**
 * A public-domain painting for the masthead, like the Homer and Renoir in the
 * source briefs. No API key anywhere:
 *
 *   1. BRIEF_ARTWORK_FILE  - a local image, for a demo room without Wi-Fi
 *   2. Art Institute of Chicago open API (CC0 metadata, IIIF images)
 *   3. The Met Collection API (public-domain objects with a primary image)
 *   4. nothing: the renderer falls back to a quiet gradient
 *
 * Deterministic per day, so a re-run of the same brief shows the same picture.
 * Every failure is logged and swallowed; a missing painting never fails a run.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import type { Artwork } from "./render.js";

const THEMES = ["sea", "harbor", "garden", "still life", "window", "morning", "river", "snow", "reading", "bridge", "orchard", "clouds"] as const;

type Candidate = { imageUrl: string; caption: string };
type Provider = (theme: string, seed: number) => Promise<Candidate | undefined>;

const hash = (s: string): number => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
const pickOne = <T>(items: readonly T[], seed: number): T | undefined => items[seed % Math.max(items.length, 1)];
const PAINT = /oil|canvas|watercolor|watercolour|pastel|tempera|gouache/i;

const fetchJson = async <T>(url: string, timeoutMs = 8_000): Promise<T> => {
  const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs), headers: { "User-Agent": "aetherlink-daily-brief (training demo)" } });
  if (!res.ok) throw new Error(`${res.status} from ${url}`);
  return (await res.json()) as T;
};

/* ---------- providers ---------- */

type AicArtwork = { title?: string; artist_title?: string | null; date_display?: string | null; medium_display?: string | null; image_id?: string | null };

const artInstituteOfChicago: Provider = async (theme, seed) => {
  const search = new URLSearchParams({
    q: theme,
    "query[term][is_public_domain]": "true",
    fields: "title,artist_title,date_display,medium_display,image_id",
    limit: "40",
  });
  const { data } = await fetchJson<{ data?: AicArtwork[] }>(`https://api.artic.edu/api/v1/artworks/search?${search}`);
  const pick = pickOne((data ?? []).filter((a) => a.image_id && PAINT.test(a.medium_display ?? "")), seed);
  if (!pick?.image_id) return undefined;
  const parts = [pick.title, pick.artist_title, pick.date_display].filter((p): p is string => Boolean(p));
  return {
    imageUrl: `https://www.artic.edu/iiif/2/${pick.image_id}/full/1200,/0/default.jpg`,
    caption: `${parts.join(", ")}.${pick.medium_display ? ` ${pick.medium_display.toLowerCase()}` : ""}`,
  };
};

type MetObject = { title?: string; artistDisplayName?: string; objectDate?: string; medium?: string; primaryImage?: string; isPublicDomain?: boolean };

const metMuseum: Provider = async (theme, seed) => {
  const search = new URLSearchParams({ q: theme, hasImages: "true", isPublicDomain: "true", medium: "Paintings" });
  const { objectIDs } = await fetchJson<{ objectIDs?: number[] | null }>(`https://collectionapi.metmuseum.org/public/collection/v1/search?${search}`);
  const ids = (objectIDs ?? []).slice(0, 60);
  if (ids.length === 0) return undefined;
  // One object lookup per attempt; try three seeds so a missing image does not end the day without a painting.
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const id = pickOne(ids, seed + attempt * 7919);
    if (id === undefined) break;
    const o = await fetchJson<MetObject>(`https://collectionapi.metmuseum.org/public/collection/v1/objects/${id}`);
    if (!o.isPublicDomain || !o.primaryImage) continue;
    const parts = [o.title, o.artistDisplayName, o.objectDate].filter((p): p is string => Boolean(p));
    return { imageUrl: o.primaryImage, caption: `${parts.join(", ")}.${o.medium ? ` ${o.medium.toLowerCase()}` : ""}` };
  }
  return undefined;
};

const PROVIDERS: ReadonlyArray<readonly [string, Provider]> = [
  ["Art Institute of Chicago", artInstituteOfChicago],
  ["The Met", metMuseum],
];

/* ---------- assembly ---------- */

const MIME: Record<string, string> = { ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp" };

const fromFile = async (file: string): Promise<Artwork> => {
  const bytes = await readFile(file);
  const mime = MIME[path.extname(file).toLowerCase()] ?? "image/jpeg";
  const caption = process.env.BRIEF_ARTWORK_CAPTION ?? path.basename(file, path.extname(file)).replace(/[-_]+/g, " ");
  return { src: `data:${mime};base64,${bytes.toString("base64")}`, caption };
};

const embed = async (candidate: Candidate): Promise<Artwork> => {
  const res = await fetch(candidate.imageUrl, { signal: AbortSignal.timeout(15_000) });
  if (!res.ok) throw new Error(`${res.status} from ${candidate.imageUrl}`);
  const bytes = Buffer.from(await res.arrayBuffer());
  const mime = res.headers.get("content-type")?.split(";")[0] ?? "image/jpeg";
  return { src: `data:${mime};base64,${bytes.toString("base64")}`, caption: candidate.caption };
};

/**
 * Pick the day's painting and inline it as a data URI, so the brief is one
 * portable file that can be mailed, printed or published as an artifact.
 */
export const pickArtwork = async (date: string, log: (line: string) => void = () => {}, env: NodeJS.ProcessEnv = process.env): Promise<Artwork | undefined> => {
  if (env.BRIEF_ARTWORK_FILE) {
    try {
      const art = await fromFile(env.BRIEF_ARTWORK_FILE);
      log(`artwork: local file ${env.BRIEF_ARTWORK_FILE}`);
      return art;
    } catch (e) {
      log(`artwork: local file skipped (${e instanceof Error ? e.message : String(e)})`);
    }
  }
  const seed = hash(date);
  const theme = pickOne(THEMES, seed) ?? "sea";
  for (const [name, provider] of PROVIDERS) {
    try {
      const candidate = await provider(theme, seed);
      if (!candidate) {
        log(`artwork: ${name} had nothing for "${theme}"`);
        continue;
      }
      const art = await embed(candidate);
      log(`artwork: ${name} · ${candidate.caption} (${Math.round(art.src.length / 1370)} KB)`);
      return art;
    } catch (e) {
      log(`artwork: ${name} skipped (${e instanceof Error ? e.message : String(e)})`);
    }
  }
  return undefined;
};
