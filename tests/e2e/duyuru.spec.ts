// Duyuru bandı (D-95, D-102): a build with a sample settings.yml › duyuru (STAJ_SETTINGS, test builds only).
// Closable; the closed notice is remembered in localStorage by its id (texts + end time) and stays hidden;
// a new notice shows again; `kapatilamaz: true` has no close button; nothing shifts the layout.
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { open } from "./helpers";

// The sample bands replace whatever band settings.yml ships (TAs add one on GitHub).
const base = readFileSync("settings.yml", "utf8").replace(/^duyuru:\n(?:[ \t]+.*\n?)*/m, "");
function build(name: string, duyuru: string) {
  const dir = mkdtempSync(join(tmpdir(), `staj-${name}-`));
  const settings = join(dir, "settings.yml");
  writeFileSync(settings, base + "\nduyuru:\n" + duyuru);
  const out = join(dir, "dist");
  execFileSync("npx", ["astro", "build"], { env: { ...process.env, STAJ_SETTINGS: settings, STAJ_OUT: out }, stdio: "ignore" });
  return out;
}
const AT = Date.parse("2026-10-09T13:00:00Z");
let a: string, b: string, urgent: string;
test.describe.configure({ mode: "serial" });
test.beforeAll(async () => {
  test.setTimeout(240_000);
  a = build("a", '  mesaj: "Sonuç listesi güncellendi."\n  mesaj_en: "The results list has been updated."\n  bitis: "2026-10-20 23:59"\n');
  b = build("b", '  mesaj: "Geç teslim süresi uzatıldı."\n  mesaj_en: "The late window has been extended."\n  bitis: "2026-10-20 23:59"\n');
  urgent = build("u", '  mesaj: "Portal bakımda."\n  mesaj_en: "The portal is under maintenance."\n  bitis: "2026-10-20 23:59"\n  kapatilamaz: true\n');
});
const band = (p: Page) => p.locator(".duyuru");

test("duyuru: kapatılır, hatırlanır; yeni duyuru yeniden görünür", async ({ page }) => {
  await open(page, "", { site: a, at: AT });
  await expect(band(page)).toBeVisible();
  await expect(band(page)).toContainText("Sonuç listesi güncellendi.");
  await band(page).getByRole("button", { name: "Duyuruyu kapat" }).click();
  await expect(band(page)).toBeHidden();
  await expect(page.locator("#main")).toBeFocused();
  for (const rel of ["", "kurallar/", "en/"]) { await open(page, rel, { site: a, at: AT }); await expect(band(page)).toBeHidden(); }
  await open(page, "", { site: b, at: AT });
  await expect(band(page)).toBeVisible();
  await expect(band(page)).toContainText("Geç teslim süresi uzatıldı.");
});

test("duyuru: süresi dolunca görünmez; kapatılamaz duyuruda düğme yok", async ({ page }) => {
  await open(page, "", { site: a, at: Date.parse("2026-10-20T21:00:00Z") });
  await expect(band(page)).toBeHidden();
  await open(page, "en/", { site: urgent, at: AT });
  await expect(band(page)).toContainText("The portal is under maintenance.");
  await expect(band(page).getByRole("button")).toHaveCount(0);
  await page.evaluate(() => localStorage.setItem("staj-duyuru-kapatildi", document.querySelector<HTMLElement>(".duyuru")!.dataset.duyuruId!));
  await open(page, "en/", { site: urgent, at: AT });
  await expect(band(page)).toBeVisible();
});

test("duyuru: kapatılmış duyuru ilk boyamadan önce gizlenir (kayma yok)", async ({ page }) => {
  await open(page, "", { site: a, at: AT });
  await band(page).getByRole("button", { name: "Duyuruyu kapat" }).click();
  await open(page, "", { site: a, at: AT });
  const cls = await page.evaluate(() => new Promise<number>((r) => {
    let v = 0; new PerformanceObserver((l) => { for (const e of l.getEntries() as any[]) if (!e.hadRecentInput) v += e.value; }).observe({ type: "layout-shift", buffered: true });
    setTimeout(() => r(v), 500);
  }));
  expect(cls).toBeLessThan(0.01);
});

for (const scheme of ["light", "dark"] as const) test(`axe ${scheme}: duyuru bandı (kapatılabilir ve kapatılamaz)`, async ({ page }) => {
  await page.emulateMedia({ colorScheme: scheme });
  for (const [site, rel] of [[a, ""], [urgent, "en/kurallar/"]] as const) {
    await open(page, rel, { site, at: AT });
    await expect(band(page)).toBeVisible();
    const r = await new AxeBuilder({ page }).include(".duyuru").withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
    expect(r.violations.map((v) => v.id)).toEqual([]);
  }
});
