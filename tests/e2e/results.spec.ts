// RESULTS-01: the All Internships results PDF on Sonuçlar. Own builds (STAJ_RESULTS_DIR, test builds only) from a
// temporary git repository with an invented PDF and a fixed commit time, so the default dist/ may or may not hold
// the real file.  file — All_Internships.pdf · empty — no file
import { execFileSync } from "node:child_process";
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { open } from "./helpers";

const MARKER = "FAKE-RESULTS-CONTENT-7f3a";   // inside the PDFs; must never reach the search index
const env = { ...process.env, GIT_AUTHOR_NAME: "t", GIT_AUTHOR_EMAIL: "t@example.invalid", GIT_COMMITTER_NAME: "t", GIT_COMMITTER_EMAIL: "t@example.invalid" };
function repo(name: string, files: [name: string, iso: string][]) {
  const dir = mkdtempSync(join(tmpdir(), `staj-results-${name}-`));
  const g = (args: string[], extra = {}) => execFileSync("git", ["-C", dir, "-c", "commit.gpgsign=false", ...args], { env: { ...env, ...extra }, stdio: "ignore" });
  g(["init", "-q"]);
  for (const [c, iso] of files) {
    writeFileSync(join(dir, c), `%PDF-1.4\n% ${MARKER}\n%%EOF\n`);
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
const UPDATED = "2026-10-12T16:30:00+03:00";   // → ?v=1791811800
let file: string, empty: string;
test.describe.configure({ mode: "serial" });
test.beforeAll(async () => {
  test.setTimeout(240_000);
  file = build("file", repo("file", [["All_Internships.pdf", UPDATED]]));
  const none = mkdtempSync(join(tmpdir(), "staj-results-none-"));
  empty = build("empty", none);
});

test("kart: tüm stajlar PDF'i, TSİ son güncelleme, ?v= sürümü, masaüstünde gömülü görüntüleyici ve düğme yok (TR)", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await open(page, "sonuclar/", { site: file });
  const card = page.locator("[data-results='file']");
  await expect(card.locator(".results__term")).toContainText("Tüm Stajlar");
  await expect(card.locator(".results__updated")).toHaveText("Son güncelleme: 12 Ekim 2026, saat 16.30 (TSİ)");
  await expect(card.locator(".results__updated time")).toHaveAttribute("datetime", "2026-10-12T13:30:00.000Z");
  const href = "/staj/internships/All_Internships.pdf?v=1791811800";
  const openBtn = page.locator("[data-results-open]");
  await expect(openBtn).toHaveAttribute("href", href);
  await expect(openBtn).toHaveAttribute("target", "_blank");
  await expect(openBtn).toContainText("Sonuç dosyasını aç");
  await expect(openBtn).toBeHidden();   // desktop: the embedded PDF replaces the button (phones keep it, below)
  await expect(page.locator(".results a[download], .results a", { hasText: /İndir|Download/ })).toHaveCount(0);
  const frame = page.locator(".results__viewer iframe");
  await expect(frame).toHaveAttribute("title", "Sonuç listesi, tüm stajlar (PDF)");
  await expect(frame).toHaveAttribute("src", href);
  // The file is served as a PDF at the versioned URL.
  const res = await page.evaluate(async (u) => { const r = await fetch(u); return [r.status, r.headers.get("content-type")]; }, href);
  expect(res).toEqual([200, "application/pdf"]);
  // No external results link (the old Drive one) anywhere on the page.
  await expect(page.locator('a[href*="//drive."]')).toHaveCount(0);
});

test("kart: EN metinler ve tarih biçimi", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await open(page, "en/sonuclar/", { site: file });
  await expect(page.locator(".results__term")).toContainText("All Internships");
  await expect(page.locator(".results__updated")).toHaveText("Last updated: 12 October 2026, 16:30 (GMT+3)");
  await expect(page.locator("[data-results-open]")).toContainText("Open the results file");
  await expect(page.locator(".results__viewer iframe")).toHaveAttribute("title", "Results list, all internships (PDF)");
});

test("yerleşim: dosya varken tek sütun ve tam genişlik görüntüleyici; yokken iki başlık yan yana (1440 px)", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const heads = () => page.locator(".doc__main > .ds > h2").evaluateAll((hs) => hs.map((h) => Math.round(h.getBoundingClientRect().top)));
  await open(page, "sonuclar/", { site: file });
  const [a, b] = await heads();
  expect(b).toBeGreaterThan(a);
  const w = await page.evaluate(() => [document.querySelector(".results__viewer")!.getBoundingClientRect().width, document.querySelector(".doc__main")!.getBoundingClientRect().width]);
  expect(Math.round(w[0])).toBe(Math.round(w[1]));
  await open(page, "sonuclar/", { site: empty });
  const [c, d] = await heads();
  expect(c).toBe(d);
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

test("dosya yoksa tek satır, boş görüntüleyici yok (TR/EN)", async ({ page }) => {
  for (const [rel, text] of [["sonuclar/", "Sonuçlar henüz yayımlanmadı."], ["en/sonuclar/", "Results have not been published yet."]] as const) {
    await open(page, rel, { site: empty });
    await expect(page.locator("[data-results='empty'] .results__empty")).toHaveText(text);
    await expect(page.locator(".results__viewer, [data-results-open]")).toHaveCount(0);
  }
});

test("arama dizini kartın metnini içerir, PDF'in içeriğini içermez", () => {
  const tr = readFileSync(join(file, "search", "tr.json"), "utf8"), en = readFileSync(join(file, "search", "en.json"), "utf8");
  expect(tr).toContain("Sonuç dosyasını aç");
  expect(tr).toContain("Tüm Stajlar");
  expect(en).toContain("Open the results file");
  for (const s of [tr, en]) expect(s).not.toContain(MARKER);
  expect(readFileSync(join(empty, "search", "tr.json"), "utf8")).toContain("Sonuçlar henüz yayımlanmadı.");
});
