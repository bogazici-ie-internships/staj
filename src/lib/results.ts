// Build-only: the results PDFs on the Sonuçlar page (RESULTS-01). Data Store writes
// public/internships/New_Internships_<campaign>.pdf (npm run results:publish -- <campaign>); the page shows the
// file of settings.yml › donem.campaign_id (or the newest one) and lists the others as earlier terms.
// "Last updated" is the git commit time of the file; without git history it falls back to the file's mtime.
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { sizeLabel } from "./belgeler";
import { longDateTime, type Lang } from "./dates";
import { BASE } from "./paths";

/** STAJ_RESULTS_DIR: test builds only (fixture folders); deploys read public/internships. */
export const RESULTS_DIR = resolve(process.cwd(), process.env.STAJ_RESULTS_DIR || "public/internships");
export const RESULTS_FILE = /^New_Internships_(\d{4}-(?:spring|summer|fall))\.pdf$/;

const TERMS = { spring: { tr: "Bahar", en: "Spring", n: 1 }, summer: { tr: "Yaz", en: "Summer", n: 2 }, fall: { tr: "Güz", en: "Fall", n: 3 } } as const;
type Term = keyof typeof TERMS;

export function parseCampaign(id: string): { year: number; term: Term } | null {
  const m = /^(\d{4})-(spring|summer|fall)$/.exec(id);
  return m ? { year: Number(m[1]), term: m[2] as Term } : null;
}
/** Chronological order within the calendar year: spring, summer, fall. */
export const campaignOrder = (id: string) => { const c = parseCampaign(id); return c ? c.year * 10 + TERMS[c.term].n : -1; };
/** Same form as settings.yml › donem.etiket / etiket_en: "2026 Yaz" / "Summer 2026". */
export function termLabel(id: string, lang: Lang): string {
  const c = parseCampaign(id);
  if (!c) return id;
  return lang === "en" ? `${TERMS[c.term].en} ${c.year}` : `${c.year} ${TERMS[c.term].tr}`;
}

export interface ResultsFile { campaign: string; file: string; bytes: number; updatedMs: number }

/** The card shows the current campaign's file, else the newest; the rest are earlier terms, newest first. */
export function pickResults(files: ResultsFile[], currentCampaign: string): { current: ResultsFile | null; earlier: ResultsFile[] } {
  const sorted = [...files].sort((a, b) => campaignOrder(b.campaign) - campaignOrder(a.campaign));
  const current = sorted.find((f) => f.campaign === currentCampaign) ?? sorted[0] ?? null;
  return { current, earlier: sorted.filter((f) => f !== current) };
}

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

export function readResults(dir = RESULTS_DIR): ResultsFile[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((file) => {
    const m = RESULTS_FILE.exec(file);
    if (!m) return [];
    const st = statSync(join(dir, file));
    let updatedMs = commitTimeMs(dir, file);
    if (updatedMs === null) {
      updatedMs = st.mtimeMs;
      console.warn(`[results] ${file}: no git history (shallow or uncommitted); "last updated" uses the file time`);
    }
    return [{ campaign: m[1], file, bytes: st.size, updatedMs }];
  });
}
