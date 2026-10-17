// Teslim kurtarma (D-91, D-100): the flow's fields and files are kept on this device for 24 hours and deleted
// on success, on "Vazgeç" and on expiry. (Moved here from tools.spec.ts when Araçlar was removed, REVIEW-01 Note 2.)
import { expect, test } from "@playwright/test";
import { SAMPLE, flow, open } from "./helpers";

test("Teslim kurtarma: bilgiler ve dosyalar bu cihazda kalır, yeniden yüklemede geri gelir; başarıda ve Vazgeç'te silinir", async ({ page }) => {
  await open(page, "teslim/");
  await flow.ready(page);
  await flow.toReview(page);
  await page.waitForTimeout(600); // autosave is debounced
  // Reload: the flow is offered back.
  await open(page, "teslim/");
  await flow.ready(page);
  const banner = page.locator("[data-recovery]");
  await expect(banner).toBeVisible();
  await banner.locator("[data-recovery-restore]").click();
  await expect(page.locator("#suf-name")).toHaveValue(SAMPLE.nameInput);
  await expect(page.locator("#suf-sid")).toHaveValue(SAMPLE.sid);
  await flow.next(page);
  await expect(page.locator('[data-slot="rapor"]')).toContainText("rapor.pdf");
  await flow.next(page);
  await page.waitForSelector('[data-step="kontrol"]');
  await flow.submit(page);
  await page.waitForSelector('[data-step="makbuz"]');
  // Submitted: nothing is offered any more.
  await open(page, "teslim/");
  await flow.ready(page);
  await page.waitForTimeout(300);
  await expect(page.locator("[data-recovery]")).toHaveCount(0);

  // Discard deletes it.
  await flow.start(page);
  await flow.identity(page);
  await page.waitForTimeout(600);
  await open(page, "teslim/");
  await flow.ready(page);
  await page.locator("[data-recovery] [data-recovery-discard]").click();
  await expect(page.locator("[data-recovery]")).toHaveCount(0);
  await page.waitForTimeout(200); // the delete is committed asynchronously
  await open(page, "teslim/");
  await flow.ready(page);
  await page.waitForTimeout(300);
  await expect(page.locator("[data-recovery]")).toHaveCount(0);
});

test("Teslim kurtarma: taslak 24 saat saklanır, sonra silinir (D-100)", async ({ page }) => {
  const T0 = Date.parse("2026-10-09T13:00:00Z");
  await open(page, "teslim/", { at: T0 });
  await flow.ready(page);
  await flow.start(page);
  await flow.identity(page);
  await page.waitForTimeout(600);
  await open(page, "teslim/", { at: T0 + 23 * 3_600_000 });
  await flow.ready(page);
  await expect(page.locator("[data-recovery]")).toBeVisible();
  await open(page, "teslim/", { at: T0 + 25 * 3_600_000 });
  await flow.ready(page);
  await page.waitForTimeout(300);
  await expect(page.locator("[data-recovery]")).toHaveCount(0);
  await open(page, "teslim/", { at: T0 + 23 * 3_600_000 }); // it was deleted, not just hidden
  await flow.ready(page);
  await page.waitForTimeout(300);
  await expect(page.locator("[data-recovery]")).toHaveCount(0);
});
