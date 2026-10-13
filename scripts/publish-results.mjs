// Publishes the results list (Data Store's "All Internships" report) on the Sonuçlar page (RESULTS-01):
//   npm run results:publish                  generate with Data Store, check, commit (no push)
//   npm run results:publish -- --no-commit   generate and check only
// 1. runs Data Store's generator in ../Data Store (or DATA_STORE_DIR) with its own .venv, DB settings and its
//    default report_config.yaml:  reports/generate_report.py --out public/internships/All_Internships.pdf
// 2. checks the result is a real, non-empty PDF and prints its size and page count;
// 3. commits only that file on an up-to-date main. Pushing is left to you: it redeploys the site, and the page
//    shows the commit time as "Son güncelleme".
// Manual alternative: copy the PDF into public/internships/ under the same name and commit it.
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const commit = !args.includes("--no-commit");
const fail = (msg) => { console.error(`results:publish: ${msg}`); process.exit(1); };

if (args.some((a) => !a.startsWith("--")) || args.some((a) => a.startsWith("--") && a !== "--no-commit")) fail("usage: npm run results:publish [-- --no-commit]");
const git = (...a) => execFileSync("git", ["-C", ROOT, ...a], { encoding: "utf8" }).trim();

// A publish commit belongs on main, on top of what is live; anything else could push unrelated work with it.
if (commit) {
  const branch = git("rev-parse", "--abbrev-ref", "HEAD");
  if (branch !== "main") fail(`this checkout is on "${branch}"; switch to main first (git switch main && git pull --ff-only).`);
  try { git("fetch", "--quiet", "origin", "main"); } catch { fail("could not fetch origin/main; check your connection."); }
  if (git("rev-parse", "HEAD") !== git("rev-parse", "origin/main")) fail("main is not the same as origin/main; run git pull --ff-only (and push any own commits) first.");
}

const ds = resolve(process.env.DATA_STORE_DIR || join(ROOT, "..", "Data Store"));
const gen = join(ds, "reports", "generate_report.py");
if (!existsSync(gen)) fail(`Data Store generator not found: ${gen} (set DATA_STORE_DIR)`);
const venvPy = join(ds, ".venv", "bin", "python3");
const python = process.env.DATA_STORE_PYTHON || (existsSync(venvPy) ? venvPy : "python3");

const file = "All_Internships.pdf";
const out = join(ROOT, "public", "internships", file);
mkdirSync(dirname(out), { recursive: true });
const before = existsSync(out) ? statSync(out).mtimeMs : 0;

console.log(`Generating ${file} with Data Store …`);
// The generator's own output (counts, paths) is not echoed; on failure only its error text is, without DB URLs.
const run = spawnSync(python, ["reports/generate_report.py", "--out", out], { cwd: ds, encoding: "utf8" });
if (run.status !== 0) {
  const err = `${run.stderr || ""}${run.error ? String(run.error) : ""}`.replace(/postgres(?:ql)?:\/\/[^\s'"]+/gi, "postgresql://…").trim();
  fail(`Data Store failed (exit ${run.status}):\n${err.split("\n").slice(-12).join("\n")}`);
}
if (!existsSync(out) || statSync(out).mtimeMs === before) fail(`Data Store finished but did not write ${relative(ROOT, out)}.`);

const bytes = readFileSync(out);
if (bytes.length === 0 || bytes.subarray(0, 5).toString("latin1") !== "%PDF-") fail(`${file} is not a PDF.`);
let pages;
try {
  const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
  pages = (await getDocument({ data: new Uint8Array(bytes), disableFontFace: true, isEvalSupported: false, verbosity: 0 }).promise).numPages;
} catch (e) { fail(`${file} could not be read as a PDF: ${e.message}`); }
if (!pages) fail(`${file} has no pages.`);
console.log(`OK  ${relative(ROOT, out)} · ${Math.max(1, Math.round(bytes.length / 1024))} KB · ${pages} page${pages === 1 ? "" : "s"}`);

if (!commit) { console.log("Not committed (--no-commit)."); process.exit(0); }
const rel = relative(ROOT, out);
git("add", "--", rel);
if (spawnSync("git", ["-C", ROOT, "diff", "--cached", "--quiet", "--", rel]).status === 0) { console.log("The file is unchanged since the last publish; nothing to commit."); process.exit(0); }
const now = new Date(Date.now() + 3 * 3600_000).toISOString().slice(0, 16).replace("T", " ");
git("commit", "--only", "-m", `Results: all internships (${now} TSİ)`, "--", rel);
console.log(`Committed ${git("rev-parse", "--short", "HEAD")}. Push to publish it (the site redeploys in a few minutes):\n  git push origin main`);
