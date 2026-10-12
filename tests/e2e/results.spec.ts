// RESULTS-01: the results PDF on Sonuçlar. Own builds (STAJ_RESULTS_DIR, test builds only) from a temporary git
// repository of invented PDFs with fixed commit times, so the default dist/ may or may not hold a real file.
//   file     — 2026-summer (current campaign) + 2026-spring + 2025-fall
//   fallback — no file for the current campaign: the newest one is shown
//   empty    — no file at all
import { execFileSync } from "node:child_process";
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { open } from "./helpers";

const MARKER = "FAKE-RESULTS-CONTENT-7f3a";   // inside the PDFs; must never reach the search index
const env = { ...process.env, GIT_AUTHOR_NAME: "t", GIT_AUTHOR_EMAIL: "t@example.invalid", GIT_COMMITTER_NAME: "t", GIT_COMMITTER_EMAIL: "t@example.invalid" };
function repo(name: string, files: [campaign: string, iso: string][]) {
  const dir = mkdtempSync(join(tmpdir(), `staj-results-${name}-`));
  const g = (args: string[], extra = {}) => execFileSync("git", ["-C", dir, "-c", "commit.gpgsign=false", ...args], { env: { ...env, ...extra }, stdio: "ignore" });
  g(["init", "-q"]);
  for (const [c, iso] of files) {
    writeFileSync(join(dir, `New_Internships_${c}.pdf`), `%PDF-1.4\n% ${MARKER} ${c}\n%%EOF\n`);
    g(["add", "-A"]); g(["commit", "-q", "-m", c], { GIT_AUTHOR_DATE: iso, GIT_COMMITTER_DATE: iso });
  }
  return dir;
}
function build(name: string, results: string) {
  const out = join(mkdtempSync(join(tmpdir(), `staj-results-${name}-out-`)), "dist");
  execFileSync("npx", ["astro", "build"], { env: { ...process.env, STAJ_RESULTS_DIR: results, STAJ_OUT: out }, stdio: "ignore" });
  mkdirSync(join(out, "internships"), { recursive: true });
  for (const f of readdirSync(results).filter((x) => x.endsWith(".pdf"))) copyFileSync(join(results, f), join(out, "internships", f));
  return out;
}
const SUMMER = "2026-10-12T16:30:00+03:00";   // → ?v=1791811800
let file: string, fallback: string, empty: string;
test.describe.configure({ mode: "serial" });
test.beforeAll(async () => {
  test.setTimeout(240_000);
  file = build("file", repo("file", [["2025-fall", "2026-02-10T10:00:00+03:00"], ["2026-spring", "2026-07-01T09:05:00+03:00"], ["2026-summer", SUMMER]]));
  fallback = build("fallback", repo("fallback", [["2025-fall", "2026-02-10T10:00:00+03:00"], ["2026-spring", "2026-07-01T09:05:00+03:00"]]));
  const none = mkdtempSync(join(tmpdir(), "staj-results-none-"));
  empty = build("empty", none);
});

test("kart: güncel dönemin PDF'i, TSİ son güncelleme, ?v= sürümü, yalnız 'aç' düğmesi, önceki dönemler (TR)", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await open(page, "sonuclar/", { site: file });
  const card = page.locator("[data-results='file']");
  await expect(card.locator(".results__term")).toContainText("2026 Yaz");
  await expect(card.locator(".results__updated")).toHaveText("Son güncelleme: 12 Ekim 2026, saat 16.30 (TSİ)");
  await expect(card.locator(".results__updated time")).toHaveAttribute("datetime", "2026-10-12T13:30:00.000Z");
  const href = "/staj/internships/New_Internships_2026-summer.pdf?v=1791811800";
  const openBtn = page.locator("[data-results-open]");
  await expect(openBtn).toHaveAttribute("href", href);
  await expect(openBtn).toHaveAttribute("target", "_blank");
  await expect(openBtn).toContainText("Sonuç dosyasını aç");
  await expect(page.locator(".results a[download], .results a", { hasText: /İndir|Download/ })).toHaveCount(0);
  const frame = page.locator(".results__viewer iframe");
  await expect(frame).toHaveAttribute("title", "2026 Yaz sonuç listesi (PDF)");
  await expect(frame).toHaveAttribute("src", href);
  await expect(page.locator(".results__earlier li")).toHaveText([/2026 Bahar.*1 Temmuz 2026, saat 09\.05 \(TSİ\)/, /2025 Güz.*10 Şubat 2026, saat 10\.00 \(TSİ\)/]);
  // The file is served as a PDF at the versioned URL.
  const res = await page.evaluate(async (u) => { const r = await fetch(u); return [r.status, r.headers.get("content-type")]; }, href);
  expect(res).toEqual([200, "application/pdf"]);
  // No external results link (the old Drive one) anywhere on the page.
  await expect(page.locator('a[href*="//drive."]')).toHaveCount(0);
});

test("kart: EN metinler ve tarih biçimi", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await open(page, "en/sonuclar/", { site: file });
  await expect(page.locator(".results__term")).toContainText("Summer 2026");
  await expect(page.locator(".results__updated")).toHaveText("Last updated: 12 October 2026, 16:30 (GMT+3)");
  await expect(page.locator("[data-results-open]")).toContainText("Open the results file");
  await expect(page.locator(".results__viewer iframe")).toHaveAttribute("title", "Summer 2026 results list (PDF)");
  await expect(page.locator(".results__earlier-title")).toHaveText("Earlier Terms");
  await expect(page.locator(".results__earlier li .files__name")).toHaveText([/^Spring 2026/, /^Fall 2025/]);
});

test("telefonda görüntüleyici yok ve PDF sayfayla birlikte yüklenmez", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  const pdfs: string[] = [];
  page.on("request", (r) => { if (/\.pdf(\?|$)/.test(r.url())) pdfs.push(r.url()); });
  await open(page, "sonuclar/", { site: file });
  await page.waitForLoadState("networkidle");
  await expect(page.locator("[data-results-open]")).toBeVisible();
  await expect(page.locator(".results__viewer iframe")).toHaveCount(0);
  await expect(page.locator(".results__viewer")).toBeHidden();
  expect(pdfs).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0);
});

// Same WCAG tags as a11y.spec.ts.
test("axe: kartlı Sonuçlar (açık ve koyu tema)", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  for (const scheme of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme: scheme, reducedMotion: "reduce" });
    await open(page, "sonuclar/", { site: file });
    // The PDF inside the frame is the browser's viewer, not our page: the frame's own title is checked above.
    const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).exclude(".results__viewer").analyze();
    expect(r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(", ")}`), scheme).toEqual([]);
  }
});

test("güncel dönemin dosyası yoksa en yeni dönem gösterilir", async ({ page }) => {
  await open(page, "sonuclar/", { site: fallback });
  await expect(page.locator(".results__term")).toContainText("2026 Bahar");
  await expect(page.locator("[data-results-open]")).toHaveAttribute("href", /New_Internships_2026-spring\.pdf\?v=\d+$/);
  await expect(page.locator(".results__earlier li")).toHaveCount(1);
});

test("dosya yoksa tek satır, boş görüntüleyici yok (TR/EN)", async ({ page }) => {
  for (const [rel, text] of [["sonuclar/", "Sonuçlar henüz yayımlanmadı."], ["en/sonuclar/", "Results have not been published yet."]] as const) {
    await open(page, rel, { site: empty });
    await expect(page.locator("[data-results='empty'] .results__empty")).toHaveText(text);
    await expect(page.locator(".results__viewer, [data-results-open], .results__earlier")).toHaveCount(0);
  }
});

test("arama dizini kartın metnini içerir, PDF'in içeriğini içermez", () => {
  const tr = readFileSync(join(file, "search", "tr.json"), "utf8"), en = readFileSync(join(file, "search", "en.json"), "utf8");
  expect(tr).toContain("Sonuç dosyasını aç");
  expect(tr).toContain("2026 Yaz");
  expect(en).toContain("Open the results file");
  for (const s of [tr, en]) expect(s).not.toContain(MARKER);
  expect(readFileSync(join(empty, "search", "tr.json"), "utf8")).toContain("Sonuçlar henüz yayımlanmadı.");
});
