// REVIEW-03 Note 3 (D-136): every state of design/reviews/teslim-states.html is reachable by its URL, and previews
// stay closed on a production build away from localhost.
import { readdirSync, readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { DAY, DEADLINE, GRACE_DAYS, HOUR, SITE, mount, open } from "./helpers";
import { STATES } from "../states/states";

// The main build's own clock stands in for the review builds: open, 6 h into the late window, after it closed.
const AT = { main: DEADLINE - 2 * DAY - 18 * HOUR, late: DEADLINE + 6 * HOUR, closed: DEADLINE + (GRACE_DAYS + 1) * DAY };

for (const s of STATES) test(`durum ${s.id}: ${s.rel || "/"} (${s.build})`, async ({ page }) => {
  await open(page, s.rel, { at: AT[s.build] });
  await expect(page.locator(s.ready).first()).toBeVisible();
  if (s.id === "late-done" || s.id === "print-late") await expect(page.locator(".suf-done__when")).toContainText("1 gün geç");
  if (s.id === "belgeler-dosyalar") await expect(page.locator("[data-slot] img")).toHaveCount(4);
});

test("kapalı dönemde ?preview= adımları kapalı ekranı gösterir, makbuz açık kalır", async ({ page }) => {
  await open(page, "teslim/?preview=kontrol", { at: AT.closed });
  await expect(page.locator("#suf-closed")).toBeVisible();
  await expect(page.locator("#suf-submit")).toHaveCount(0);
  await open(page, "teslim/?preview=done", { at: AT.closed });
  await expect(page.locator("#suf-done")).toBeVisible();
});

test("üretim derlemesi: LAN adresinden ?preview= çalışmaz, yerel adreste çalışır", async ({ page }) => {
  const lan = "http://192.168.1.4:9999";
  await mount(page, { origin: lan });
  await page.clock.install({ time: new Date(AT.main) });
  await page.goto(`${lan}/staj/teslim/?preview=done`);
  await expect(page.locator(".suf-prep")).toBeVisible();
  await expect(page.locator("#suf-done")).toHaveCount(0);
  // The LAN allowance is compiled out of a real-portal build entirely.
  const js = readdirSync(`${SITE}/_astro`).filter((f) => f.startsWith("Submission")).map((f) => readFileSync(`${SITE}/_astro/${f}`, "utf8")).join("");
  expect(js).not.toContain("192");
});
