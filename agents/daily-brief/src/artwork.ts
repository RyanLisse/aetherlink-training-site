/**
 * A public-domain painting for the masthead, like the Homer and Renoir in the
 * source briefs. Uses the Art Institute of Chicago's open API (CC0 metadata,
 * public-domain images served over IIIF). Deterministic per day, so a re-run
 * of the same brief shows the same picture. Best effort: any failure returns
 * `undefined` and the renderer falls back to a quiet gradient.
 */
import type { Artwork } from "./render.js";

const THEMES = ["sea", "harbor", "garden", "still life", "window", "morning", "river", "snow", "reading", "bridge", "orchard", "clouds"] as const;

type AicArtwork = {
  id: number;
  title?: string;
  artist_title?: string | null;
  date_display?: string | null;
  medium_display?: string | null;
  image_id?: string | null;
};

const hash = (s: string): number => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);

const caption = (a: AicArtwork): string => {
  const parts = [a.title, a.artist_title, a.date_display].filter((p): p is string => Boolean(p));
  const medium = a.medium_display ? ` ${a.medium_display.toLowerCase()}` : "";
  return `${parts.join(", ")}.${medium}`;
};

const fetchJson = async <T>(url: string, timeoutMs = 8_000): Promise<T> => {
  const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs), headers: { "AIC-User-Agent": "aetherlink-daily-brief (agent)" } });
  if (!res.ok) throw new Error(`${res.status} from ${url}`);
  return (await res.json()) as T;
};

/**
 * Pick the day's painting and inline it as a data URI, so the brief is one
 * portable file that can be mailed, printed or published as an artifact.
 */
export const pickArtwork = async (date: string, log: (line: string) => void = () => {}): Promise<Artwork | undefined> => {
  try {
    const seed = hash(date);
    const theme = THEMES[seed % THEMES.length] ?? "sea";
    const search = new URLSearchParams({
      q: theme,
      "query[term][is_public_domain]": "true",
      fields: "id,title,artist_title,date_display,medium_display,image_id",
      limit: "40",
    });
    const { data } = await fetchJson<{ data?: AicArtwork[] }>(`https://api.artic.edu/api/v1/artworks/search?${search}`);
    const candidates = (data ?? []).filter((a) => a.image_id && /oil|canvas|watercolor|pastel|tempera/i.test(a.medium_display ?? ""));
    const pick = candidates[seed % Math.max(candidates.length, 1)];
    if (!pick?.image_id) return undefined;

    const imageUrl = `https://www.artic.edu/iiif/2/${pick.image_id}/full/1200,/0/default.jpg`;
    const res = await fetch(imageUrl, { signal: AbortSignal.timeout(15_000) });
    if (!res.ok) throw new Error(`${res.status} from ${imageUrl}`);
    const bytes = Buffer.from(await res.arrayBuffer());
    log(`artwork: ${caption(pick)} (${Math.round(bytes.byteLength / 1024)} KB)`);
    return { src: `data:image/jpeg;base64,${bytes.toString("base64")}`, caption: caption(pick) };
  } catch (e) {
    log(`artwork: skipped (${e instanceof Error ? e.message : String(e)})`);
    return undefined;
  }
};
