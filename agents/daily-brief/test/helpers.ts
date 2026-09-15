/** Shared test helper: the sample brief, parsed through the contract. */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseBrief } from "../src/brief.js";

const here = path.dirname(fileURLToPath(import.meta.url));
export const sample = async () => parseBrief(JSON.parse(await readFile(path.join(here, "..", "sample", "brief.sample.json"), "utf8")));
