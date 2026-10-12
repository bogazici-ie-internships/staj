// axe-core (WCAG 2.2 A/AA rules) on every built page, both languages, both
// themes, plus the Teslim screens and the open mobile menu. Zero violations.
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { SAMPLE, flow, open } from "./helpers";

const PAGES = ["", "kurallar/", "teslim/", "surec/", "rapor/", "formlar/", "sss/", "sonuclar/", "iletisim/", "boyle-bir-sayfa-yok/"];
const TARGETS = PAGES.flatMap((p) => (p.startsWith("boyle") ? [p] : [p, "en/" + p]));

async function axe(page: Page) {
  // Measure the settled page: let finite entrance animations (h1 rise, index fade) finish
  // so contrast is not sampled mid-fade. Endless/scroll-driven ones (contour drift, rule draw) are skipped.
  await page.evaluate(() => Promise.all(document.getAnimations()
    .filter((a) => a.timeline === document.timeline && Number.isFinite(a.effect?.getComputedTiming().endTime ?? Infinity))
    .map((a) => a.finished.catch(() => undefined))));
  const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
  return r.violations.map((v) => `${v.id} (${v.impact}): ${v.nodes.slice(0, 3).map((n) => n.target.join(" ")).join(" | ")}`);
}

for (const scheme of ["light", "dark"] as const) {
  for (const rel of TARGETS) {
    test(`axe ${scheme}: /${rel}`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme });
      await open(page, rel);
      await page.waitForTimeout(200);
      expect(await axe(page)).toEqual([]);
    });
  }
  for (const preview of ["kimlik", "belgeler", "kontrol", "fail", "done"]) {
    test(`axe ${scheme}: teslim ?preview=${preview}`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme });
      await open(page, `teslim/?preview=${preview}`);
      await page.waitForSelector(`[data-step]`);
      await page.waitForTimeout(200);
      expect(await axe(page)).toEqual([]);
    });
  }
  // REVIEW-01 Note 1: the sticky rail where it overflows (1280×720), the Teslim side panel, and the rail's
  // phone disclosure opened.
  for (const rel of ["surec/", "en/kurallar/", "rapor/", "sss/", "teslim/"]) test(`axe ${scheme}: /${rel} 1280×720 (sağ sütun)`, async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.emulateMedia({ colorScheme: scheme });
    await open(page, rel);
    await page.mouse.wheel(0, 1600);
    await page.waitForTimeout(300);
    expect(await axe(page)).toEqual([]);
  });
  test(`axe ${scheme}: /surec/ telefonda İçindekiler açık`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.emulateMedia({ colorScheme: scheme });
    await open(page, "surec/");
    await page.locator(".rail__toggle").click();
    await expect(page.locator(".rail__toc")).toBeVisible();
    expect(await axe(page)).toEqual([]);
  });
  test(`axe ${scheme}: teslim hata özeti`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: scheme });
    await open(page, "teslim/"); await flow.ready(page);
    await flow.start(page); await flow.next(page);
    await expect(page.locator(".suf-summary")).toBeVisible();
    expect(await axe(page)).toEqual([]);
  });
}

test("telefon menüsü: açılır, odak içeride, Esc kapatır, odak geri döner", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await open(page, "kurallar/");
  const trigger = page.locator("[data-sw-drawer-trigger]");
  await trigger.click();
  const sheet = page.locator("dialog.sheet");
  await expect(sheet).toBeVisible();
  expect(await axe(page)).toEqual([]);
  await expect(sheet.locator('a[aria-current="page"]')).toHaveText(/Kurallar/);
  await page.keyboard.press("Escape");
  await expect(sheet).toBeHidden();
  await expect(trigger).toBeFocused();
});

test("klavye: Teslim akışı yalnız klavyeyle tamamlanabilir", async ({ page }) => {
  const net = await open(page, "teslim/"); await flow.ready(page);
  await page.locator("#suf-start").focus(); await page.keyboard.press("Enter");
  await expect(page.locator("#suf-h-kimlik")).toBeFocused();
  await page.keyboard.press("Tab"); // → summary? no: first field
  await page.locator("#suf-name").focus(); await page.keyboard.type(SAMPLE.nameInput);
  await page.keyboard.press("Tab"); await page.keyboard.type(SAMPLE.sid);
  await page.keyboard.press("Tab"); await page.keyboard.type(SAMPLE.email);
  await page.keyboard.press("Enter");                        // submits the Kimlik form
  await expect(page.locator("#suf-h-belgeler")).toBeFocused();
  expect(net.posts).toHaveLength(0);
});

test("reduced motion: hareket süreleri sıfırlanır", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await open(page, "teslim/"); await flow.ready(page); await flow.start(page);
  const d = await page.locator(".suf-step").evaluate((el) => getComputedStyle(el).animationDuration);
  expect(parseFloat(d)).toBeLessThan(0.02);
});

test("split-flap: hareket açıkken bir kez oynar ve <900 ms'de oturur; azaltılmış harekette hiç oynamaz", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await open(page, "");
  await page.waitForSelector(".flap__fx");
  const t0 = Date.now();
  await page.waitForFunction(() => !document.querySelector(".flap__fx"));
  expect(Date.now() - t0).toBeLessThan(1000);
  // The real values stay in the accessibility tree the whole time.
  await expect(page.locator(".hero__board .board__table tbody tr").first()).toContainText(/\d{2}\.\d{2} \d{2}:\d{2}/);

  const page2 = await page.context().newPage();
  await page2.emulateMedia({ reducedMotion: "reduce" });
  await open(page2, "");
  await page2.waitForFunction(() => !document.querySelector("astro-island[ssr]:not(.board-below astro-island)"));
  await page2.waitForTimeout(300);
  await expect(page2.locator(".flap__fx")).toHaveCount(0);
});

// Phase 2a: content that is closed at load is audited open (SSS answers with the helpfulness
// buttons; the search palette with results), in both themes.
for (const scheme of ["light", "dark"] as const) {
  for (const rel of ["sss/", "en/sss/"]) {
    test(`axe ${scheme}: /${rel} with every answer open`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme, reducedMotion: "reduce" });
      await open(page, rel);
      await page.evaluate(() => document.querySelectorAll("details").forEach((d) => { d.open = true; }));
      expect(await axe(page)).toEqual([]);
    });
  }
  test(`axe ${scheme}: search palette with results`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: scheme, reducedMotion: "reduce" });
    await open(page, "kurallar/");
    await page.keyboard.press("Control+k");
    await expect(page.getByRole("dialog")).toBeVisible();
    expect(await axe(page)).toEqual([]);   // empty state with suggestions
    await page.keyboard.type("staj");
    await expect(page.getByRole("option").first()).toBeVisible({ timeout: 10_000 });
    await page.keyboard.press("ArrowDown");
    expect(await axe(page)).toEqual([]);
    await page.getByRole("combobox").fill("zzqxw");
    await expect(page.locator(".srch__none")).toBeVisible();
    expect(await axe(page)).toEqual([]);
  });
}
