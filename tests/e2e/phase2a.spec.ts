// UPDATE-06 Phase 2a: migrated pages, ⌘K search, SSS accordion, Formlar table.
import { expect, test } from "@playwright/test";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { SITE, events, open, umamiStub } from "./helpers";

test("arama: sayfa yüklenirken hiçbir arama dosyası yüklenmez; Ctrl+K ve düğme açar; sonuç SSS cevabını açar (REVIEW-02)", async ({ page }) => {
  const requested: string[] = [];
  page.on("request", (r) => requested.push(new URL(r.url()).pathname));
  await open(page, "kurallar/");
  await page.waitForLoadState("networkidle");
  expect(requested.filter((u) => /search-ui|\/search\/(tr|en)\.json|pagefind/.test(u)), "nothing search-related on load").toEqual([]);

  await page.keyboard.press("Control+k");
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog.locator(".srch__chip")).toHaveCount(6);   // empty state: suggested searches
  await page.keyboard.type("resmî tatil");
  await expect(dialog.getByRole("combobox")).toHaveValue("resmî tatil"); // nothing typed during loading is lost
  const item = dialog.getByRole("option", { name: /Cumartesi ve resmî tatil/ });
  await expect(item).toBeVisible({ timeout: 10_000 });
  expect(requested.some((u) => u.endsWith("/search/tr.json"))).toBe(true);
  await expect(dialog.getByRole("group").first()).toBeVisible();   // grouped by page
  await item.click();
  await expect(page).toHaveURL(/\/sss\/#cumartesi-tatil$/);
  await expect(page.locator("#cumartesi-tatil").locator("xpath=ancestor::details")).toHaveAttribute("open", "");

  // The header button opens it too; the EN page searches the EN index; ↓ selects; Esc closes, focus returns.
  await open(page, "en/formlar/");
  await page.locator("[data-search-open]").first().click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.type("Saturday");
  await expect(page.getByRole("option").first()).toBeVisible({ timeout: 10_000 });
  await expect(page.getByRole("option").first()).toContainText(/Saturday/i);
  expect(requested.some((u) => u.endsWith("/search/en.json"))).toBe(true);
  await page.keyboard.press("ArrowDown");
  await expect(page.getByRole("combobox")).toHaveAttribute("aria-activedescendant", "srch-o0");
  await expect(page.getByRole("option").first()).toHaveAttribute("aria-selected", "true");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(page.locator("[data-search-open]").first()).toBeFocused();

  // No results: help with a link to SSS and the address. A suggestion fills the field; results from the first character.
  await page.keyboard.press("Control+k");
  await page.keyboard.type("zzqxw");
  await expect(page.locator(".srch__none")).toBeVisible();
  await expect(page.locator(".srch__none a[href$='/sss/']")).toHaveCount(1);
  await expect(page.locator(".srch__none a[href^='mailto:']")).toHaveCount(1);
  await page.getByRole("combobox").fill("");
  await page.locator(".srch__chip").first().click();
  await expect(page.getByRole("option").first()).toBeVisible();
  await page.getByRole("combobox").fill("e");
  await expect(page.getByRole("option").first()).toBeVisible();
});

test("SSS: derin bağlantı cevabı açar; 'yardımcı oldu mu?' yalnızca soru anchor'ı + evet/hayır gönderir", async ({ page }) => {
  await umamiStub(page);
  await open(page, "sss/#ust-sinir");
  const det = page.locator("#ust-sinir").locator("xpath=ancestor::details");
  await expect(det).toHaveAttribute("open", "");
  await det.locator(".qa__vote[data-v='yes']").click();
  await expect(det.locator(".qa__thanks")).toHaveText("Geri bildiriminiz için teşekkür ederiz.");
  await expect(det.locator(".qa__vote").first()).toBeDisabled();
  const ev = (await events(page)).filter(([n]) => n === "faq_helpful");
  expect(ev).toEqual([["faq_helpful", { q: "ust-sinir", v: "yes" }]]);
  // Keyboard: a closed question opens with Enter.
  const q = page.locator("#izin").locator("xpath=ancestor::summary");
  await q.focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("#izin").locator("xpath=ancestor::details")).toHaveAttribute("open", "");
});

test("Formlar: tek tablo, canlı çapalar grup satırlarında, her belge için biçim/boyut ve indirme bağlantısı", async ({ page }) => {
  await open(page, "formlar/");
  for (const id of ["rehber-kurallar", "stajdan-once", "staj-srasnda", "stajdan-sonra"]) await expect(page.locator(`tr#${id}`)).toHaveCount(1);
  const rows = page.locator(".tbl--docs tbody tr:not(.tbl__group)");
  await expect(rows).toHaveCount(8);
  for (const r of await rows.all()) {
    await expect(r.locator("td.mono")).toHaveText(/^(PDF|Word \(DOCX\)) · [\d.,]+ (KB|MB)$/);
    const href = await r.locator("a.tbl__dl").getAttribute("href");
    expect(href).toMatch(/^\/staj\/belgeler\/[\w.-]+\.(pdf|docx)$/);
    expect(existsSync(join(SITE, href!.replace(/^\/staj\//, ""))), href!).toBe(true);
  }
});

test("İletişim: kişiler settings.yml'den, koordinatör rolü, Site Hakkında sonda", async ({ page }) => {
  await open(page, "iletisim/");
  await expect(page.locator(".contact--primary .people li")).toHaveCount(3);
  await expect(page.locator(".contact").nth(1)).toContainText("Staj koordinatörü");
  await expect(page.locator(".contact").nth(1)).toContainText("Prof. Dr. Refik Güllü");
  await expect(page.locator(".doc__main > :last-child")).toHaveAttribute("id", "site-hakkinda"); // last in the page body (REVIEW-01 wraps the body in .doc__main)
  // RESULTS-01: Sonuçlar shows the results file (or says none is out yet); no external folder link. The file itself
  // is tested in results.spec.ts, so this holds whether or not public/internships has a PDF.
  await open(page, "sonuclar/");
  await expect(page.locator("[data-results]")).toHaveAttribute("data-results", /^(file|empty)$/);
  await expect(page.locator('main a[href*="//drive."]')).toHaveCount(0);
});

test("arama: ilk açılışta palet yüklenirken yazılanlar kaybolmaz; düğmeye hover önceden yükler", async ({ page }) => {
  const requested: string[] = [];
  page.on("request", (r) => requested.push(new URL(r.url()).pathname));
  await open(page, "sss/");
  await page.waitForLoadState("networkidle");
  await page.keyboard.press("Control+k");
  await page.keyboard.type("cumartesi", { delay: 0 });   // typed immediately after the shortcut
  await expect(page.getByRole("combobox")).toHaveValue("cumartesi");
  await expect(page.getByRole("option").first()).toBeVisible({ timeout: 10_000 });
  await page.keyboard.press("Escape");

  await open(page, "formlar/");
  await page.waitForLoadState("networkidle");
  requested.length = 0;
  await page.locator("[data-search-open]").first().hover();   // hover preloads the palette and the index
  await expect.poll(() => requested.some((u) => u.endsWith("/search/tr.json"))).toBe(true);
  expect(requested.some((u) => /\/_astro\/search-ui\./.test(u))).toBe(true);
});
