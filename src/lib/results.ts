// Build-only: the results list on the Sonuçlar page (RESULTS-01). Data Store writes the "All Internships" report
// (every student's internships) to public/internships/All_Internships.pdf (npm run results:publish); the page shows
// it with its last update: the git commit time of the file, or the file's mtime without git history.
import { execFileSync } from "node:child_process";
import { existsSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { sizeLabel } from "./belgeler";
import { longDateTime, type Lang } from "./dates";
import { BASE } from "./paths";

/** STAJ_RESULTS_DIR: test builds only (fixture folders); deploys read public/internships. */
export const RESULTS_DIR = resolve(process.cwd(), process.env.STAJ_RESULTS_DIR || "public/internships");
export const RESULTS_NAME = "All_Internships.pdf";

export interface ResultsFile { file: string; bytes: number; updatedMs: number }

/** `?v=` changes with every new version, so browsers and the Pages CDN fetch it at once. */
export const resultsHref = (f: ResultsFile) => `${BASE}internships/${f.file}?v=${Math.floor(f.updatedMs / 1000)}`;
export const updatedText = (f: ResultsFile, lang: Lang) => longDateTime(lang, f.updatedMs);
export const resultsSize = (f: ResultsFile, lang: Lang) => sizeLabel(f.bytes, lang);

const git = (dir: string, args: string[]) => execFileSync("git", ["-C", dir, ...args], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();

/** Commit time of the file. A shallow clone would answer with HEAD's time, so it is treated like missing history. */
export function commitTimeMs(dir: string, file: string): number | null {
  try {
    if (git(dir, ["rev-parse", "--is-shallow-repository"]) === "true") return null;
    const iso = git(dir, ["log", "-1", "--format=%cI", "--", file]);
    return iso ? Date.parse(iso) : null;
  } catch { return null; }
}

export function readResults(dir = RESULTS_DIR): ResultsFile | null {
  const path = join(dir, RESULTS_NAME);
  if (!existsSync(path)) return null;
  const st = statSync(path);
  let updatedMs = commitTimeMs(dir, RESULTS_NAME);
  if (updatedMs === null) {
    updatedMs = st.mtimeMs;
    console.warn(`[results] ${RESULTS_NAME}: no git history (shallow or uncommitted); "last updated" uses the file time`);
  }
  return { file: RESULTS_NAME, bytes: st.size, updatedMs };
}
