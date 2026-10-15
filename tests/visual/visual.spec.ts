// Visual snapshots: 360 / 768 / 1440 × light / dark × TR / EN × reduced-motion
// on/off for Home, Kurallar and Teslim, plus the Teslim screens and the Phase 2a pages. The clock is
// frozen (2026-10-09 16:00 TSİ, three days before the deadline) so countdowns
// are stable. Baselines: tests/visual/__screenshots__ (platform-specific).
//   npm run test:visual            compare
//   npm run test:visual -- -u      re-record after an intended change
import { expect, test } from "@playwright/test";
import { open } from "../e2e/helpers";

const AT = Date.parse("2026-10-09T16:00:00+03:00");
const PAGES: [string, string][] = [["home", ""], ["kurallar", "kurallar/"], ["teslim", "teslim/"]];
const WIDTHS = [360, 768, 1440];

for (const [name, rel] of PAGES) for (const lang of ["tr", "en"] as const) for (const scheme of ["light", "dark"] as const)
  for (const motion of ["reduce", "no-preference"] as const) for (const w of WIDTHS) {
    test(`${name} ${lang} ${scheme} ${w} motion-${motion}`, async ({ page }) => {
      await page.setViewportSize({ width: w, height: 900 });
      await page.emulateMedia({ colorScheme: scheme, reducedMotion: motion });
      await open(page, (lang === "en" ? "en/" : "") + rel, { at: AT });
      await page.evaluate(() => document.fonts.ready);
      // Islands hydrate on idle; wait for them and for the one-time split-flap to settle.
      await page.waitForFunction(() => !document.querySelector("astro-island[ssr]:not(.board-below astro-island)") && !document.querySelector(".flap__fx"), null, { timeout: 5000 });
      await page.waitForTimeout(300);
      await expect(page).toHaveScreenshot(`${name}-${lang}-${scheme}-${w}-${motion}.png`, { fullPage: true, animations: "disabled", maxDiffPixelRatio: 0.01 });
    });
  }

// Phase 2a pages (UPDATE-06): still frames only (their only motion is the h1 entrance, already
// covered on the pages above), 360 / 768 / 1440 × light / dark × TR / EN.
const DOCS: [string, string][] = [["surec", "surec/"], ["rapor", "rapor/"], ["formlar", "formlar/"], ["sss", "sss/"], ["sonuclar", "sonuclar/"], ["iletisim", "iletisim/"]];
for (const [name, rel] of DOCS) for (const lang of ["tr", "en"] as const) for (const scheme of ["light", "dark"] as const) for (const w of WIDTHS) {
  test(`${name} ${lang} ${scheme} ${w} motion-reduce`, async ({ page }) => {
    await page.setViewportSize({ width: w, height: 900 });
    await page.emulateMedia({ colorScheme: scheme, reducedMotion: "reduce" });
    await open(page, (lang === "en" ? "en/" : "") + rel, { at: AT });
    await page.evaluate(() => document.fonts.ready);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(200);
    await expect(page).toHaveScreenshot(`${name}-${lang}-${scheme}-${w}-reduce.png`, { fullPage: true, animations: "disabled", maxDiffPixelRatio: 0.01 });
  });
}

for (const screen of ["kimlik", "belgeler", "kontrol", "sending", "fail", "done"]) for (const scheme of ["light", "dark"] as const) for (const w of [360, 1440]) {
  test(`teslim screen ${screen} ${scheme} ${w}`, async ({ page }) => {
    await page.setViewportSize({ width: w, height: 900 });
    await page.emulateMedia({ colorScheme: scheme, reducedMotion: "reduce" });
    await open(page, `teslim/?preview=${screen}`, { at: AT });
    await page.waitForSelector("[data-step]");
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(300);
    await expect(page).toHaveScreenshot(`teslim-screen-${screen}-${scheme}-${w}.png`, { fullPage: true, animations: "disabled", maxDiffPixelRatio: 0.01 });
  });
}

// REVIEW-03 Note 2 (D-134): the receipt head, on time and 1 day late, TR and EN (the TR on-time frame is above).
for (const [lang, late] of [["en", 0], ["tr", 1], ["en", 1]] as const) for (const scheme of ["light", "dark"] as const) for (const w of [360, 1440]) {
  test(`teslim receipt ${lang} ${late ? "late" : "on-time"} ${scheme} ${w}`, async ({ page }) => {
    await page.setViewportSize({ width: w, height: 900 });
    await page.emulateMedia({ colorScheme: scheme, reducedMotion: "reduce" });
    await open(page, `${lang === "en" ? "en/" : ""}teslim/?preview=done${late ? "&late=1" : ""}`, { at: AT });
    await page.waitForSelector("#suf-done");
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(300);
    await expect(page).toHaveScreenshot(`teslim-receipt-${lang}-${late ? "late" : "ontime"}-${scheme}-${w}.png`, { fullPage: true, animations: "disabled", maxDiffPixelRatio: 0.01 });
  });
}
