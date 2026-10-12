// REVIEW-06: layout review of every page (Notes 1–3) and the second audit's content items (Note 4, N-01 … N-07).
// Note 1 (a 672 px centred column) is reversed by REVIEW-07: see review07.spec.ts and the edge checks in layout.spec.ts.
// One test per item, on the built site.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "@playwright/test";
import { SITE, open } from "./helpers";

const text = (rel: string) => readFileSync(join(SITE, rel, "index.html"), "utf8")
  .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, " ").replace(/<[^>]+>/g, " ")
  .replace(/&#39;|&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/\s+/g, " ");

test("Note 2: no empty right column in the header band; Gazete band aligned with the column; Kurallar's lead is the Handbook sentence", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  for (const rel of ["formlar/", "sonuclar/", "iletisim/"]) {
    await open(page, rel);
    const cols = await page.locator(".ph__in").evaluate((el) => getComputedStyle(el).gridTemplateColumns.split(" ").length);
    expect(cols, rel).toBe(1);
  }
  for (const rel of ["kurallar/", "rapor/", "sss/", "surec/"]) {
    await open(page, rel);
    const d = await page.evaluate(() => ({ h1: document.querySelector("h1")!.getBoundingClientRect().left, col: document.querySelector(".with-rail > :not(.rail, script, style)")!.getBoundingClientRect().left }));
    expect(Math.abs(d.h1 - d.col), `${rel} title over the column`).toBeLessThanOrEqual(2);
  }
  await open(page, "kurallar/");
  await expect(page.locator(".ph__lead")).toContainText("Internship Handbook esas alınarak özetlenmiştir");
  expect(text("kurallar/")).not.toContain("Zorunlu staja ilişkin kurallar");
  expect(text("kurallar/").split("esas alınarak özetlenmiştir").length - 1, "the Handbook sentence once").toBe(1);
  await page.setViewportSize({ width: 375, height: 844 });
  await open(page, "kurallar/");
  await expect(page.locator(".ph__lead")).toBeVisible();
});

test("Note 3: Home — phase lists flow on their own; the button is on the first screen at 1440 × 900, details after it", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await open(page, "");
  const gaps = await page.evaluate(() => [...document.querySelectorAll(".phase__items")].map((ul) => {
    const li = [...ul.children].map((c) => c.getBoundingClientRect());
    return li.slice(1).map((b, i) => Math.round(b.top - li[i].bottom));
  }).flat());
  expect(new Set(gaps).size, `gaps between bullets: ${gaps}`).toBe(1);
  const cta = await page.locator(".hero__cta").boundingBox();
  expect(cta!.y + cta!.height, "Belgeleri gönder inside 900 px").toBeLessThanOrEqual(900);
  const order = await page.evaluate(() => { const b = document.querySelector(".hero__board")!; return [...b.children].map((c) => c.className.split(" ")[0]); });
  expect(order.indexOf("board__notes")).toBeGreaterThan(order.findIndex((c) => c.startsWith("btn")));
});

test("Note 3: Süreç rail sentence, Kurallar without the 1.1 pull quote and with one glossary place, Sonuçlar heads aligned, İletişim without the callout, Teslim note framed", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await open(page, "surec/");
  await expect(page.locator(".rail__facts")).toContainText("Her staj en az 15 iş günü; toplam en az 40 iş günü, bunun en az 15'i üretim stajı.");
  await open(page, "en/surec/");
  await expect(page.locator(".rail__facts")).toContainText("Each internship lasts at least 15 workdays; at least 40 workdays in total, at least 15 of them Production Internship.");
  expect(text("kurallar/")).not.toContain("40 iş günü staj, mezuniyet şartıdır.");
  await open(page, "kurallar/");
  await expect(page.locator(".rule__note").first()).toBeHidden();          // desktop: the rail's Terimler box
  await expect(page.locator(".rail .aj__terms")).toBeVisible();
  await page.setViewportSize({ width: 1000, height: 900 });
  await open(page, "kurallar/");
  await expect(page.locator(".rule__note").first()).toBeVisible();          // rail collapsed: inline
  await page.setViewportSize({ width: 1440, height: 900 });
  await open(page, "sonuclar/");
  const tops = await page.locator(".doc__main > .ds > h2").evaluateAll((hs) => hs.map((h) => Math.round(h.getBoundingClientRect().top)));
  expect(tops.length).toBe(2);
  expect(tops[0]).toBe(tops[1]);
  await expect(page.locator(".doc__main > .ds > h2").first()).toHaveText(/Sonuç Listesi/);
  await open(page, "iletisim/");
  await expect(page.locator(".callout")).toHaveCount(0);
  expect(text("iletisim/")).toContain("Bu adrese gelen iletileri tüm asistanlar gördüğünden çoğu soruya en hızlı yanıt buradan verilir.");
  await open(page, "teslim/");
  await expect(page.locator("#suf-multiple")).toHaveClass(/suf-callout/);
});

test("Note 3: phones — one-line strip, the full-width button only on Home (menu elsewhere), no double rule, targets ≥ 44 px", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 844 });
  for (const rel of ["", "surec/", "kurallar/", "sss/", "formlar/", "teslim/"]) {
    await open(page, rel);
    const strip = await page.locator(".strip__in").boundingBox();
    expect(strip!.height, `/${rel} strip height`).toBeLessThanOrEqual(48);
    const cta = page.locator(".hdr__cta");
    if (rel === "") await expect(cta).toBeVisible();
    else if (rel !== "teslim/") await expect(cta).toBeHidden();
    if (rel && rel !== "teslim/") {
      const bb = await page.locator(".ph__in").evaluate((el) => getComputedStyle(el).borderBottomStyle);
      expect(bb, `/${rel} rule under the title`).toBe("none");
      const h1 = await page.locator("h1").boundingBox();
      const band = (await page.locator(".duyuru").boundingBox())?.height ?? 0;   // below a settings.yml › duyuru band (D-185)
      expect(h1!.y - band, `/${rel} title starts higher`).toBeLessThan(200);
    }
  }
  await open(page, "kurallar/");
  await page.locator(".tool--menu").click();
  const sheetCta = page.locator(".sheet__cta");
  await expect(sheetCta).toBeVisible();
  expect((await sheetCta.boundingBox())!.height).toBeGreaterThanOrEqual(44);
});

test("Note 4: N-01 … N-07", async ({ page }) => {
  // N-01 Home EK-1 item carries the previous-workday rule; N-04 payment documents in lower case.
  expect(text("")).toContain("En geç gün iş günü değilse formu bir önceki iş gününe kadar gönderiniz.");   // LANGUAGE-01 wording
  expect(text("en/")).toContain("If that latest day is not a workday, send the form by the previous workday.");
  expect(text("")).toContain("Cumartesi Yazısı ile ödeme dekontu veya bordro ve EK-1");
  // N-05 SSS title in workdays; N-06 time of submission; N-07 reworded sentence in five places.
  expect(text("sss/")).toContain("40 iş gününden fazla staj yapabilir miyim?");
  expect(text("en/sss/")).toContain("Can I do more than 40 workdays?");
  for (const rel of ["sss/", "teslim/"]) expect(readFileSync(join(SITE, rel, "index.html"), "utf8")).toContain("Teslim anı, gönderimin sunucuya ulaştığı andır");
  expect(text("en/sss/")).toContain("The time of submission is when the submission reaches the server");
  const n07 = "eksik veya hatalı bir belgeyi tamamlamak üzere aynı stajın formunu yeniden göndermeyiniz";
  for (const rel of ["surec/", "kurallar/", "sss/"]) expect(text(rel), rel).toContain(n07);
  expect(text("sss/").split(n07).length - 1, "SSS #gec-teslim and #sicil-formu").toBe(2);
  for (const rel of ["", "surec/", "kurallar/", "sss/", "teslim/"]) expect(text(rel), rel).not.toContain("tamamlamak için formu aynı staj için");
  // N-02 receipt sentence (no new button).
  await open(page, "teslim/?preview=done");
  // FINAL-CHECK F-03 reworded the N-02 sentence (save the receipt first; reopen the Belge Teslimi page).
  await expect(page.locator(".suf-next")).toContainText("Başka bir stajınız için teslim yapacaksanız önce bu makbuzu kaydediniz; ardından Belge Teslimi sayfasını yeniden açarak formu o staj için ayrıca gönderiniz.");
  await expect(page.locator(".suf-next")).toContainText(n07);
  await open(page, "en/teslim/?preview=done");
  await expect(page.locator(".suf-next")).toContainText("If you have another internship to submit, first save this receipt; then reopen the Document Submission page and submit the form separately for that internship.");
});
