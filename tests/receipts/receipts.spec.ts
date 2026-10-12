// REVIEW-04 Note 2 (D-139): the printed receipt as real PDFs, the same way the print test makes them (browser print,
// A4), from a production-like build with the shared sample data (src/lib/submission/sample.json).
//   npm run receipts   →  design/reviews/makbuz/makbuz-{zamaninda,gec}-{tr,en}.pdf
import { mkdirSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { DAY, DEADLINE, HOUR, open } from "../e2e/helpers";

const OUT = "design/reviews/makbuz";
const SITE = process.env.SITE_DIR || "dist-receipts";
mkdirSync(OUT, { recursive: true });

for (const lang of ["tr", "en"] as const) for (const late of [false, true]) {
  const file = `${OUT}/makbuz-${late ? "gec" : "zamaninda"}-${lang}.pdf`;
  test(file, async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    // On time: 2 d 18 h before the deadline. Late: 6 h after it (1 late day).
    await open(page, `${lang === "en" ? "en/" : ""}teslim/?preview=done${late ? "&late=1" : ""}`, { site: SITE, at: late ? DEADLINE + 6 * HOUR : DEADLINE - 2 * DAY - 18 * HOUR });
    await expect(page.locator("#suf-done")).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    await page.emulateMedia({ media: "print", colorScheme: "light" });
    const pdf = await page.pdf({ path: file, format: "A4", printBackground: true, preferCSSPageSize: true });
    expect(pdf.toString("latin1").match(/\/Type\s*\/Page(?!s)/g)?.length).toBe(1);
  });
}
